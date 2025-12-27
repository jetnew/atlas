import { NextRequest, NextResponse } from 'next/server';
import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';
import { mapSchema, mapDiffSchema, Map as MapType, MapDiff } from '@/lib/schemas/map';
import { z } from 'zod';
import { applyDiffs } from '@/lib/mapUtils';

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

function generateMapDiffs({
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
  console.log(`Processing ${selectedNodes.length} node(s) for diff generation`);

  const summariesText = summaries.filter(summary => summary.length > 0).join('\n\n');

  const qaContext = questions.length > 0
    ? `\n\nClarifications:\n${questions.map((q, i) =>
        `Q: ${q.question}\nA: ${answers[i] || 'Not answered'}`
      ).join('\n\n')}`
    : '';

  const projectContext = summariesText || qaContext
    ? `\n\nProject Context:${summariesText ? `\n\nProject Sources (summaries):\n${summariesText}` : ''}${qaContext}`
    : '';

  const systemPrompt = `You are a project map assistant. Your task is to generate diff operations to update the project map based on the user's selection and prompt.

Project Context:
${projectContext}

Current Project Map:
${JSON.stringify(currentMap, null, 2)}

User-selected Nodes (with their IDs):
${selectedNodes.map(node => `- ID: "${node.id}" | Title: "${node.label}"${node.text ? ` | Text: ${node.text}` : ''}`).join('\n')}

User Prompt: ${prompt}

Generate an array of diff operations to modify the map. Each diff is one of:

1. ADD - Insert a new node at a position:
   { "add": "<target-id>", "node": { "title": "...", "text": "...", "sections": [...] } }
   - The "add" field is the target position ID (e.g., "root-1-3" means insert as the 4th child of root-1)
   - IDs use path-based format: "root" is the root, "root-0" is first child, "root-0-2" is third child of first child

2. DELETE - Remove a node (and all its children):
   { "delete": "<node-id>" }
   - The "delete" field is the ID of the node to remove

3. UPDATE - Replace a node entirely:
   { "update": "<node-id>", "node": { "title": "...", "text": "...", "sections": [...] } }
   - The "update" field is the ID of the node to replace
   - The "node" field contains the complete replacement

IMPORTANT:
- Diffs are applied in the order you generate them
- If you delete a node (e.g., "root-1"), subsequent nodes shift (root-2 becomes root-1)
- Account for index shifting when generating multiple diffs
- Only modify nodes related to the user's selection and prompt
- The node structure is: { title: string, text?: string, sections?: node[] }
`;

  console.log("System prompt:", systemPrompt);

  const result = streamObject({
    model: openai('gpt-5.2'),
    prompt: systemPrompt,
    schema: z.object({ diffs: z.array(mapDiffSchema) }),
  });

  return result;
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

    const result = generateMapDiffs({
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
        const { diffs } = await result.object;

        if (diffs && diffs.length > 0) {
          const updatedMap = applyDiffs(currentMap, diffs as MapDiff[]);
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
