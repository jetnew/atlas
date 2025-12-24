"use client";

import { useParams } from "next/navigation";
import Header from "@/components/Header";
import ReportPanel from "@/components/ReportPanel";
import SourcePanel from "@/components/SourcePanel";
import ChatPanel from "@/components/ChatPanel";
import {
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function ProjectPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="h-screen [--header-height:calc(--spacing(12))]" >
      <SidebarProvider className="flex flex-col h-full">
        <Header />
        <div className="flex-1 overflow-hidden relative">
          <SourcePanel />
          <ChatPanel />
          <ReportPanel projectId={id} />
        </div>
      </SidebarProvider>
    </div>
  );
}
