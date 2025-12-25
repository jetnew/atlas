"use client";

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { UIMessage } from "@ai-sdk/react";

interface ChatContextType {
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  // Index within assistantMessages array, null means "Home" (default map)
  selectedAssistantIndex: number | null;
  setSelectedAssistantIndex: (index: number | null) => void;
  assistantMessages: UIMessage[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessagesInternal] = useState<UIMessage[]>([]);
  // Index within assistantMessages array, null = Home
  const [selectedAssistantIndex, setSelectedAssistantIndex] = useState<number | null>(null);

  // Extract only assistant messages
  const assistantMessages = useMemo(
    () => messages.filter(msg => msg.role === "assistant"),
    [messages]
  );

  const setMessages = useCallback((newMessages: UIMessage[]) => {
    setMessagesInternal(newMessages);
    // Auto-select the latest assistant message when new messages arrive
    const newAssistantMessages = newMessages.filter(msg => msg.role === "assistant");
    if (newAssistantMessages.length > 0) {
      setSelectedAssistantIndex(newAssistantMessages.length - 1);
    }
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        selectedAssistantIndex,
        setSelectedAssistantIndex,
        assistantMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
