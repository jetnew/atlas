"use client";

import { useParams } from "next/navigation";
import Header from "@/components/Header";
import MapPanel from "@/components/MapPanel";
import SourcePanel from "@/components/SourcePanel";
import ChatPanel from "@/components/ChatPanel";
import {
  SidebarProvider,
} from "@/components/ui/sidebar"
import { MapProvider } from "@/components/MapContext"

export default function ProjectPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="h-screen [--header-height:calc(--spacing(12))]" >
      <SidebarProvider className="flex flex-col h-full">
        <MapProvider>
          <Header />
          <div className="flex-1 overflow-hidden relative">
            <SourcePanel />
            <ChatPanel projectId={id} />
            <MapPanel projectId={id} />
          </div>
        </MapProvider>
      </SidebarProvider>
    </div>
  );
}
