import { NextRequest, NextResponse } from 'next/server';
import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';
import { mapSchema } from '@/lib/schemas/map';

async function generateMap(reportText: string) {
  const systemPrompt = `You are a mind map generator, tasked to convert a markdown report into a hierarchical structure for mind map visualization. Given the markdown report, extract the headings into a recursive tree structure where each node has a title, text, and sections (child nodes). The root node's title should be the main title (# heading), and its sections should contain the child nodes for each ## heading, which in turn have their own sections for ### headings, and so on recursively. You should discard the text content and only extract the headings. You must extract exactly literally in full faithfully to the original markdown report. Remove any heading markdown formatting, e.g. "#", "##", "###", "####", "1.", "1.1.", "1.1.1.", "1)", "2)", "3)", etc.

Report:
${reportText}`;

  return streamObject({
    model: openai('gpt-5-nano'),
    prompt: systemPrompt,
    schema: mapSchema,
  });
}

async function saveMapToDatabase(
  projectId: string,
  map: unknown,
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

export async function POST(request: NextRequest) {
  try {
    console.log("Received map generation request");

    const { projectId, reportText } = await request.json();

    if (!projectId || !reportText) {
      return NextResponse.json(
        { error: "projectId and reportText are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Generate map from report text
    console.log("Starting map generation");
    const result = await generateMap(reportText);

    // Fire-and-forget: save to database after stream is consumed
    (async () => {
      try {
        const finalObject = await result.object;
        await saveMapToDatabase(projectId, finalObject, supabase);
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
