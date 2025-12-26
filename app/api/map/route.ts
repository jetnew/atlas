import { NextRequest, NextResponse } from 'next/server';
import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';
import { mapSchema, mapReplacementResponseSchema, Map as MapType } from '@/lib/schemas/map';
import { z } from 'zod';
import {
  filterRedundantNodes,
  getNodeByPath,
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

function buildReplacementPrompt(
  prompt: string,
  selectedNodes: { id: string; label: string; text?: string }[],
  currentMap: MapType,
  isSingleNode: boolean
): string {
  // Build context about selected nodes
  const selectedContext = selectedNodes
    .map(node => {
      const fullNode = getNodeByPath(currentMap, node.id);
      const childCount = fullNode?.sections?.length || 0;
      return `- "${node.label}"${node.text ? `: ${node.text}` : ''}${childCount > 0 ? ` (has ${childCount} children)` : ''}`;
    })
    .join('\n');

  const nodeCount = selectedNodes.length;
  const nodeWord = nodeCount === 1 ? 'node' : 'nodes';

  return `You are a mind map editor. The user has selected ${nodeCount} ${nodeWord} from their mind map and wants to replace ${nodeCount === 1 ? 'it' : 'them'} based on their prompt.

Selected ${nodeWord}:
${selectedContext}

User's request: ${prompt}

Generate ${isSingleNode ? 'a replacement node' : `${nodeCount} replacement nodes`} with the following structure:
- title: The heading/label for the node
- text: Optional descriptive text for the node
- sections: Optional array of child nodes (recursive structure)

${isSingleNode
    ? 'Return exactly 1 node in the nodes array that will replace the selected node.'
    : `Return exactly ${nodeCount} nodes in the nodes array that will replace the ${nodeCount} selected sibling nodes.`}

The replacement should:
1. Follow the user's instructions in the prompt
2. Maintain appropriate depth and detail
3. Be coherent with the overall map structure`;
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

    // Filter out redundant child nodes (if parent is selected, children are ignored)
    const nodeIds = selectedNodes.map(n => n.id);
    const filteredIds = filterRedundantNodes(nodeIds);
    const filteredNodes = selectedNodes.filter(n => filteredIds.includes(n.id));

    const isSingleNode = filteredNodes.length === 1;

    console.log(`Processing ${filteredNodes.length} node(s) for replacement`);

    const systemPrompt = buildReplacementPrompt(
      prompt,
      filteredNodes,
      currentMap,
      isSingleNode
    );

    // Stream the replacement generation
    const result = await streamObject({
      model: openai('gpt-5-mini'),
      prompt: systemPrompt,
      schema: mapReplacementResponseSchema,
    });

    // Save to database after stream completes
    (async () => {
      try {
        const finalObject = await result.object;

        if (finalObject && finalObject.nodes && finalObject.nodes.length > 0) {
          let updatedMap: MapType;

          if (isSingleNode) {
            updatedMap = replaceNodeInMap(
              currentMap,
              filteredIds[0],
              finalObject.nodes[0]
            );
          } else {
            updatedMap = replaceSiblingNodesInMap(
              currentMap,
              filteredIds,
              finalObject.nodes
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
