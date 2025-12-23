"use client";

import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar";

export default function ChatPanel() {
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svg-var(--header-height))]! pt-0 pl-0"
      side="right"
      variant="floating"
      keyboardShortcut="l"
    >
      <SidebarContent>
        <div className="flex-1 overflow-auto p-2">
          {/* Chat content will go here */}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
