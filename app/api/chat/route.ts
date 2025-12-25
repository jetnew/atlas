import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60;

async function saveChatToDatabase(
  chatId: string,
  projectId: string,
  messages: UIMessage[],
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if chat exists
  const { data: existingChat } = await supabase
    .from('chats')
    .select('id')
    .eq('id', chatId)
    .single();

  if (existingChat) {
    // Update existing chat
    const { error } = await supabase
      .from('chats')
      .update({ messages })
      .eq('id', chatId);

    if (error) {
      console.error('Error updating chat:', error);
      throw error;
    }
  } else {
    // Create new chat with title from first user message
    const firstUserMessage = messages.find(m => m.role === 'user');
    const title = firstUserMessage
      ? firstUserMessage.parts
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map(p => p.text)
          .join('')
          .substring(0, 100)
      : 'New Chat';

    const { error } = await supabase
      .from('chats')
      .insert({
        id: chatId,
        user_id: user.id,
        project_id: projectId,
        title,
        messages,
      });

    if (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  console.log('Chat saved to Supabase successfully');
}

export async function POST(req: Request) {
  const { messages, chatId, projectId }: { messages: UIMessage[]; chatId: string; projectId: string } = await req.json();

  const supabase = await createClient();

  // Save user message immediately
  saveChatToDatabase(chatId, projectId, messages, supabase).catch(error => {
    console.error('Failed to save user message:', error);
  });

  const result = streamText({
    model: openai('gpt-5.2'),
    system: `You are Atlas, a research assistant tasked to help the user with his/her project.`,
    messages: convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      // Save complete messages including assistant response after streaming finishes
      const assistantMessage: UIMessage = {
        id: uuidv4(),
        role: 'assistant',
        parts: [{ type: 'text', text }],
      };

      const allMessages: UIMessage[] = [...messages, assistantMessage];

      try {
        await saveChatToDatabase(chatId, projectId, allMessages, supabase);
      } catch (error) {
        console.error('Failed to save assistant message:', error);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
