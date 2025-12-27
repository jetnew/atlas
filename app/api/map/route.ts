import { NextRequest, NextResponse } from 'next/server';
import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';
import { mapSchema, Map as MapType } from '@/lib/schemas/map';
import { z } from 'zod';
import {
  filterRedundantNodes,
  replaceNodeInMap,
  replaceSiblingNodesInMap,
} from '@/lib/mapUtils';

// Request body schema
const requestSchema = z.object({
  projectId: z.string(),
  prompt: z.string(),
  selectedNodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    text: z.string().optional(),
  })),
  currentMap: mapSchema,
});

async function saveMapToDatabase(
  projectId: string,
  map: MapType,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { error } = await supabase
    .from('projects')
    .update({ map })
    .eq('id', projectId);

  if (error) {
    console.error("Error saving map to Supabase:", error);
    throw error;
  }

  console.log("Map saved to Supabase successfully");
}

function generateMap({
  prompt,
  selectedNodes,
  currentMap,
  summaries,
  questions,
  answers,
}: {
  prompt: string;
  selectedNodes: { id: string; label: string; text?: string }[];
  currentMap: MapType;
  summaries: string[];
  questions: { question: string; options: string[] }[];
  answers: Record<string, string>;
}) {
  // Filter out redundant child nodes (if parent is selected, children are ignored)
  const nodeIds = selectedNodes.map(n => n.id);
  const filteredIds = filterRedundantNodes(nodeIds);
  const filteredNodes = selectedNodes.filter(n => filteredIds.includes(n.id));

  const isSingleNode = filteredNodes.length === 1;

  console.log(`Processing ${filteredNodes.length} node(s) for replacement`);
  const nodeCount = filteredNodes.length;

  const summariesText = summaries.filter(summary => summary.length > 0).join('\n\n');

  const qaContext = questions.length > 0
    ? `\n\nClarifications:\n${questions.map((q, i) =>
        `Q: ${q.question}\nA: ${answers[i] || 'Not answered'}`
      ).join('\n\n')}`
    : '';

  const projectContext = summariesText || qaContext
    ? `\n\nProject Context:${summariesText ? `\n\nProject Sources (summaries):\n${summariesText}` : ''}${qaContext}`
    : '';

  const systemPrompt = `You are project map assistant, tasked to update the project map based on the user's selection and prompt. You are given the the project context, which includes the user's original project prompt, summaries of the sources attached by the user for the project, and the clarifications (questions and answers) to the user's prompt. You are provided the original project map, and the user's selection of nodes to be updated. Your goal is to update the project map based on the user's prompt, with respect to only the nodes selected by the user.

All nodes that the user selects will be removed from the original project map. You should generate new nodes that will replace the selected nodes. In particular, you must only update the nodes selected by the user. If both a parent node and its child node is selected, you should only generate a single node that will replace the parent node, which may have new children that can replace the selected child node.
  
Project Context:
${projectContext}

Original Project Map:
${JSON.stringify(currentMap, null, 2)}

User-selected Nodes:
${selectedNodes.map(node => `- "${node.label}"${node.text ? `: ${node.text}` : ''}`).join('\n')}

Nodes to Generate (after filtering redundant children):
${filteredNodes.map(node => `- "${node.label}"${node.text ? `: ${node.text}` : ''}`).join('\n')}

Note: When a parent node and its child nodes are both selected, only the parent node needs to be generated since generating the parent will include new children that replace the selected child nodes.

User Prompt: ${prompt}

Generate exactly ${nodeCount} new node(s) with the following structure that will directly replace the ${nodeCount} node(s) listed above in "Nodes to Generate":
- title: The heading/label for the node
- text: Optional descriptive text for the node
- sections: Optional array of child nodes (recursive structure)
`;

  console.log("System prompt:", systemPrompt);

  const result = streamObject({
    model: openai('gpt-5.2'),
    prompt: systemPrompt,
    schema: z.object({ nodes: z.array(mapSchema) }),
  });

  return { result, filteredIds, isSingleNode };
}

export async function POST(request: NextRequest) {
  try {
    console.log("Received map replacement request");

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      console.error("Invalid request body:", parsed.error);
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error },
        { status: 400 }
      );
    }

    const { projectId, prompt, selectedNodes, currentMap } = parsed.data;

    if (selectedNodes.length === 0) {
      return NextResponse.json(
        { error: "At least one node must be selected" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch project data for context
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('questions, answers')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error("Error fetching project:", projectError);
      // Continue without project context if fetch fails
    }

    // Fetch sources with summaries
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('summary')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (sourcesError) {
      console.error("Error fetching sources:", sourcesError);
      // Continue with empty summaries if sources fetch fails
    }

    // Extract summaries from sources (filter out nulls)
    const summaries: string[] = (sources || [])
      .map(source => source.summary)
      .filter((summary): summary is string => summary !== null && summary !== undefined);

    // Parse questions and answers
    const questions: Array<{ question: string; options: string[] }> = project?.questions || [];
    const answers: Record<string, string> = project?.answers || {};

    const { result, filteredIds, isSingleNode } = generateMap({
      prompt,
      selectedNodes,
      currentMap,
      summaries,
      questions,
      answers,
    });

    // Save to database after stream completes
    (async () => {
      try {
        const { nodes } = await result.object;

        if (nodes && nodes.length > 0) {
          let updatedMap: MapType;

          if (isSingleNode) {
            updatedMap = replaceNodeInMap(
              currentMap,
              filteredIds[0],
              nodes[0]
            );
          } else {
            updatedMap = replaceSiblingNodesInMap(
              currentMap,
              filteredIds,
              nodes
            );
          }

          await saveMapToDatabase(projectId, updatedMap, supabase);
        }
      } catch (error) {
        console.error('Failed to save map to database:', error);
      }
    })();

    return result.toTextStreamResponse();

  } catch (error) {
    console.error('Error in /api/map:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
