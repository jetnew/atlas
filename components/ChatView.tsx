"use client";

import { useState, useRef, useEffect } from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { PanelRightIcon, ArrowUpIcon, Plus as IconPlus, FileText, X as XIcon, ArrowLeft } from "lucide-react";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Badge } from "@/components/ui/badge";
import {
  SidebarContent,
  SidebarFooter,
  useSidebarToggle,
} from "@/components/ui/sidebar";
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { useChatContext } from "@/components/ChatContext";

function ToggleButton({ onToggle }: { onToggle?: () => void }) {
  const { toggle } = useSidebarToggle();
  return (
    <Button variant="ghost" size="icon" className="size-9" onClick={() => {
      toggle();
      onToggle?.();
    }}>
      <PanelRightIcon className="h-4 w-4" />
    </Button>
  );
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB in bytes
const ACCEPTED_FILE_TYPES = ".pdf,.docx,.txt,.md,.png,.jpg,.jpeg";

interface ChatViewProps {
  onBack: () => void;
  isDragging: boolean;
  chatId: string;
  projectId: string;
  isNewChat?: boolean;
}

export default function ChatView({ onBack, isDragging, chatId, projectId, isNewChat = true }: ChatViewProps) {
  const [userInput, setUserInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>("");
  const [isLoadingChat, setIsLoadingChat] = useState(!isNewChat);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setMessages: setContextMessages } = useChatContext();

  const { messages, sendMessage, status, setMessages } = useAIChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { chatId, projectId },
    }),
  });

  // Load existing chat messages when opening an existing chat
  useEffect(() => {
    if (!isNewChat && chatId) {
      const loadChat = async () => {
        setIsLoadingChat(true);
        try {
          const response = await fetch(`/api/chat/${chatId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.messages && data.messages.length > 0) {
              setMessages(data.messages);
            }
          }
        } catch (error) {
          console.error("Failed to load chat:", error);
        } finally {
          setIsLoadingChat(false);
        }
      };
      loadChat();
    } else {
      setIsLoadingChat(false);
    }
  }, [chatId, isNewChat, setMessages]);

  // Sync messages to context whenever they change
  useEffect(() => {
    setContextMessages(messages);
  }, [messages, setContextMessages]);

  const validateAndAddFiles = (files: File[]) => {
    setFileError("");

    if (selectedFiles.length + files.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} files allowed`);
      return false;
    }

    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setFileError(`File(s) exceed 50 MB limit: ${oversizedFiles.map(f => f.name).join(", ")}`);
      return false;
    }

    const invalidFiles = files.filter(file => {
      const extension = "." + file.name.split(".").pop()?.toLowerCase();
      return !ACCEPTED_FILE_TYPES.includes(extension);
    });

    if (invalidFiles.length > 0) {
      setFileError(`Invalid file type(s): ${invalidFiles.map(f => f.name).join(", ")}`);
      return false;
    }

    setSelectedFiles(prev => [...prev, ...files]);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    validateAndAddFiles(files);
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setFileError("");
  };

  const handleSend = () => {
    if (userInput.trim() || selectedFiles.length > 0) {
      sendMessage({ text: userInput });
      setUserInput("");
      setSelectedFiles([]);
    }
  };

  return (
    <>
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 rounded-lg">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">Drop to attach files</div>
        </div>
      )}
      <SidebarContent className="relative flex flex-col">
        <div className="flex justify-between px-2 pt-2">
          <div className="flex">
            <ToggleButton onToggle={onBack} />
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-2">
          <div className="flex flex-col gap-4 px-3">
            {messages.map((message) => {
              const textContent = message.parts
                .filter((part): part is { type: "text"; text: string } => part.type === "text")
                .map((part) => part.text)
                .join("");

              return (
                <Message key={message.id} from={message.role as "user" | "assistant"}>
                  <MessageContent>
                    {message.role === "assistant" ? (
                      <MessageResponse>{textContent}</MessageResponse>
                    ) : (
                      textContent
                    )}
                  </MessageContent>
                </Message>
              );
            })}
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter className="pt-0">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Upload files"
        />
        <InputGroup className="bg-white">
          <InputGroupTextarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ask anything..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          {fileError && (
            <div className="px-3 pb-2 text-xs text-destructive">
              {fileError}
            </div>
          )}
          <InputGroupAddon align="block-end" className="justify-between w-full">
            <div className="flex gap-2 items-center flex-1 overflow-hidden">
              <InputGroupButton
                variant="outline"
                className="rounded-full shrink-0"
                size="icon-xs"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <IconPlus />
                <span className="sr-only">Upload files</span>
              </InputGroupButton>
              {selectedFiles.length > 0 && (
                <div className="flex gap-1 items-center overflow-x-auto scrollbar-hide">
                  {selectedFiles.map((file, index) => (
                    <Badge
                      key={`${file.name}-${index}`}
                      variant="secondary"
                      className="pl-2 pr-2 group/badge cursor-pointer shrink-0"
                    >
                      <FileText className="group-hover/badge:hidden" />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="hidden group-hover/badge:block cursor-pointer"
                        aria-label={`Remove ${file.name}`}
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                      <span className="truncate max-w-[120px]">{file.name}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <InputGroupButton
              variant="default"
              className="rounded-full shrink-0"
              size="icon-xs"
              disabled={status !== "ready" || (!userInput.trim() && selectedFiles.length === 0)}
              onClick={handleSend}
              type="button"
            >
              <ArrowUpIcon />
              <span className="sr-only">Send</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </SidebarFooter>
    </>
  );
}
