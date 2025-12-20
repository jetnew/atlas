import { NextRequest, NextResponse } from 'next/server';
import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';
import { reportSchema } from '@/lib/schemas/report';

async function generateReport(
  prompt: string,
  summaries: string[],
  questions: Array<{ question: string; options: string[] }>,
  answers: Record<string, string>
) {
  const summariesText = summaries.filter(summary => summary.length > 0).join('\n\n');

  const qaContext = questions.length > 0
    ? `\n\nClarifications:\n${questions.map((q, i) =>
        `Q: ${q.question}\nA: ${answers[i] || 'Not answered'}`
      ).join('\n\n')}`
    : '';

  const systemPrompt = `You are a research assistant, tasked to generate a comprehensive report on the user's project. You are given the user's prompt, the summaries of the sources attached by the user for the project, and the clarifications (questions and answers) to the user's prompt. Your goal is to generate a comprehensive, detailed, in-depth report on the user's project, highlighting key insights and details. Structure the report into an organized structure, formatting the report with the project tile, headings, sub-headings and sub-sub-headings.

User prompt: ${prompt}

Project sources (summaries):
${summariesText}

Clarification questions and answers:
${qaContext}`;

  return streamObject({
    model: openai('gpt-5.2'),
    prompt: systemPrompt,
    schema: reportSchema,
  });
}

async function saveReportToDatabase(
  projectId: string,
  report: unknown,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { error } = await supabase
    .from('projects')
    .update({ report })
    .eq('id', projectId);

  if (error) {
    console.error("Error saving report to Supabase:", error);
    throw error;
  }

  console.log("Report saved to Supabase successfully");
}

export async function POST(request: NextRequest) {
  try {
    console.log("Received report generation request");

    const projectId = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('prompt, questions, answers')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error("Error fetching project:", projectError);
      return NextResponse.json(
        { error: "Failed to fetch project" },
        { status: 404 }
      );
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
    const questions = project.questions || [];
    const answers = project.answers || {};

    // Stream report generation
    console.log("Starting report generation");
    const result = await generateReport(project.prompt, summaries, questions, answers);

    // Fire-and-forget: save to database after stream is consumed
    (async () => {
      try {
        const finalObject = await result.object;
        await saveReportToDatabase(projectId, finalObject, supabase);
      } catch (error) {
        console.error('Failed to save report to database:', error);
      }
    })();

    return result.toTextStreamResponse();

  } catch (error) {
    console.error('Error in /api/report:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}