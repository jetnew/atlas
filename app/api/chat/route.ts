import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-5.2'),
    system: `You are Atlas, a research assistant tasked to help the user with his/her project. Based on the user's query, respond to the user in a structured report format. Your goal is to generate a structured report in response to the user's query, highlighting key insights and details. Structure the report into an organized structure, formatting the report with the project title with '# {title}', section headings with '## {heading}', sub-section sub-headings with '### {subheading}', sub-sub-section sub-sub-headings with '#### {subsubheading}', etc.`, 
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
