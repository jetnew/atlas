import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';

async function generateReport(
  prompt: string,
  summaries: string[],
  questions: Array<{ question: string; options: string[] }>,
  answers: Record<string, string>
) {
  const summariesText = summaries.length > 0
    ? `\n\nSource summaries:\n${summaries.join('\n\n')}`
    : '';

  const qaContext = questions.length > 0
    ? `\n\nClarifications:\n${questions.map((q, i) =>
        `Q: ${q.question}\nA: ${answers[i] || 'Not answered'}`
      ).join('\n\n')}`
    : '';

  const systemPrompt = `You are a research assistant generating comprehensive reports. Create a detailed report based on the user's prompt, source materials, and clarifications.

Structure:
1. Executive Summary
2. Key Findings
3. Detailed Analysis
4. Recommendations
5. Conclusion

User prompt: ${prompt}${summariesText}${qaContext}`;

  return streamText({
    model: openai('gpt-5.2'),
    prompt: systemPrompt,
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log("Received report generation request");
    const formData = await request.formData();
    const projectId = formData.get('projectId') as string;

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

    return result.toUIMessageStreamResponse();

  } catch (error) {
    console.error('Error in /api/report:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}