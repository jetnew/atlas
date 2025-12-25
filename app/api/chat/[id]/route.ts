import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;

  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch the chat
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('id, messages')
    .eq('id', chatId)
    .eq('user_id', user.id)
    .single();

  if (chatError) {
    console.error('Error fetching chat:', chatError);
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  return NextResponse.json({ messages: chat.messages });
}
