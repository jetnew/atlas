import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-5.2'),
    system: 'You are Atlas, a research assistant tasked to help the user with his/her project.',
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
