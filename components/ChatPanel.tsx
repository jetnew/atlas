"use client";

import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { PanelRightIcon, Plus, Ellipsis } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  useSidebarToggle,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProject } from "@/components/ProjectContext";
import ChatView from "@/components/ChatView";

interface ChatTabProps {
  chat: {
    id: string;
    title: string;
  };
  onClick?: () => void;
}

function ChatTab({ chat, onClick }: ChatTabProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { deleteChat } = useProject();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteChat(chat.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  return (
    <>
      <div
        className="w-full flex items-center gap-2 group/chat px-2 py-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
        onClick={onClick}
      >
        <span className="text-sm flex-1 text-left font-medium line-clamp-1">{chat.title}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover/chat:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Ellipsis className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                setIsDeleteDialogOpen(true);
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

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

type ViewState = "default" | "chat";

interface ChatPanelProps {
  projectId: string;
}

export default function ChatPanel({ projectId }: ChatPanelProps) {
  const { chats, fetchChats } = useProject();
  const [view, setView] = useState<ViewState>("default");
  const [isDragging, setIsDragging] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isNewChat, setIsNewChat] = useState(false);

  useEffect(() => {
    fetchChats(projectId);
  }, [projectId, fetchChats]);

  const handleNewChat = useCallback(() => {
    setChatId(uuidv4());
    setIsNewChat(true);
    setView("chat");
  }, []);

  const handleSelectChat = useCallback((id: string) => {
    setChatId(id);
    setIsNewChat(false);
    setView("chat");
  }, []);

  const handleBack = useCallback(() => {
    setView("default");
    setChatId(null);
    setIsNewChat(false);
    // Refresh chats list when going back
    fetchChats(projectId);
  }, [fetchChats, projectId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svg-var(--header-height))]! pt-0 pl-0"
      style={{ "--sidebar-width": view === "chat" ? "36rem" : "14rem" } as React.CSSProperties}
      side="right"
      variant="floating"
      keyboardShortcut="l"
      onOpenChange={(open) => {
        if (!open) {
          setView("default");
          setChatId(null);
          setIsNewChat(false);
        }
      }}
      onDragOver={view === "chat" ? handleDragOver : undefined}
      onDragLeave={view === "chat" ? handleDragLeave : undefined}
      onDrop={view === "chat" ? handleDrop : undefined}
    >
      {view === "chat" && chatId ? (
        <ChatView onBack={handleBack} isDragging={isDragging} chatId={chatId} projectId={projectId} isNewChat={isNewChat} />
      ) : (
        <SidebarContent className="relative flex flex-col">
          <div className="flex justify-between pt-2 px-2">
            <div className="flex">
              <ToggleButton onToggle={() => setView("default")} />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={handleNewChat}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto px-2">
            {chats.length > 0 && (
              <div className="space-y-0.5">
                {chats.map((chat) => (
                  <ChatTab
                    key={chat.id}
                    chat={chat}
                    onClick={() => handleSelectChat(chat.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </SidebarContent>
      )}
    </Sidebar>
  );
}
