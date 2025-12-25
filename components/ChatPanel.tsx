"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelRightIcon, Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  useSidebarToggle,
} from "@/components/ui/sidebar";
import ChatView from "@/components/ChatView";

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

export default function ChatPanel() {
  const [view, setView] = useState<ViewState>("default");
  const [isDragging, setIsDragging] = useState(false);

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
        if (!open) setView("default");
      }}
      onDragOver={view === "chat" ? handleDragOver : undefined}
      onDragLeave={view === "chat" ? handleDragLeave : undefined}
      onDrop={view === "chat" ? handleDrop : undefined}
    >
      {view === "chat" ? (
        <ChatView onBack={() => setView("default")} isDragging={isDragging} />
      ) : (
        <SidebarContent className="relative">
          <div className="flex-1 overflow-auto p-2">
            <div className="flex justify-between">
              <div className="flex">
                <ToggleButton onToggle={() => setView("default")} />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => setView("chat")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SidebarContent>
      )}
    </Sidebar>
  );
}
