import { NextRequest } from 'next/server';
import { streamText, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { extractText } from '@/lib/text-extraction';

async function generateSummary(text: string) {
  const { text: summary } = await generateText({
    model: openai("gpt-5-mini"),
    prompt: `You are a document reader, tasked to summarize a document comprehensively. You are given the document text source, and your goal is to summarize the document, highlighting key details and topics to represent the document faithfully.

Document source:
${text}`,
  });

  return summary;
}

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
    const prompt = formData.get('prompt') as string;
    const files = formData.getAll('files') as File[];
    const questions = JSON.parse(formData.get('questions') as string || '[]');
    const answers = JSON.parse(formData.get('answers') as string || '{}');

    // Update status to 'generating' in database
    console.log("Updating project status to generating");
    try {
      await fetch(`${request.nextUrl.origin}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_status: 'generating' }),
      });
    } catch (e) {
      console.warn('Failed to update project status to generating:', e);
      // Continue anyway - status update is not critical for report generation
    }

    // Extract text from files
    console.log("Extracting text from files");
    const extractedTexts = (await Promise.all(
      files.map(file => extractText(file))
    )).filter(text => text.length > 0);

    // Generate summaries
    console.log("Generating summaries");
    const summaries = await Promise.all(
      extractedTexts.map(text => generateSummary(text))
    );

    // Stream report generation
    console.log("Starting report generation");
    const result = await generateReport(prompt, summaries, questions, answers);

    // Return streaming response
    return result.toTextStreamResponse();

  } catch (error) {
    console.error('Error in /api/report:', error);

    // Update status to 'failed' in database
    // Note: We need to extract projectId from a fresh formData read since we're in the catch block
    try {
      const formData = await request.clone().formData();
      const projectId = formData.get('projectId') as string;

      if (projectId) {
        await fetch(`${request.nextUrl.origin}/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_status: 'failed',
            report_error: error instanceof Error ? error.message : 'Unknown error',
          }),
        });
      }
    } catch (e) {
      console.warn('Failed to update project status to failed:', e);
      // Continue anyway - error already logged above
    }

    return new Response('Internal Server Error', { status: 500 });
  }
}