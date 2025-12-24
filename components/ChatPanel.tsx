"use client";

import { Button } from "@/components/ui/button";
import { PanelRightIcon } from "lucide-react";
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
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svg-var(--header-height))]! pt-0 pl-0"
      side="right"
      variant="floating"
      keyboardShortcut="l"
    >
      <SidebarContent className="relative">
        <div className="flex-1 overflow-auto p-2">
          <ToggleButton />
          {/* Chat content will go here */}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
