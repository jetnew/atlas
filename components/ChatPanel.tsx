"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelRightIcon, Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  useSidebarToggle,
} from "@/components/ui/sidebar";

function ToggleButton() {
  const { toggle } = useSidebarToggle();
  return (
    <Button variant="ghost" size="icon" className="size-9" onClick={toggle}>
      <PanelRightIcon className="h-4 w-4" />
    </Button>
  );
}

export default function ChatPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svg-var(--header-height))]! pt-0 pl-0"
      style={{ "--sidebar-width": isExpanded ? "32rem" : "16rem" } as React.CSSProperties}
      side="right"
      variant="floating"
      keyboardShortcut="l"
    >
      <SidebarContent className="relative">
        <div className="flex-1 overflow-auto p-2">
          <div className="flex justify-between">
            <ToggleButton />
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {/* Chat content will go here */}
        </div>
      </SidebarContent>
    </Sidebar >
  );
}
