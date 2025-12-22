"use client";

import { useParams } from "next/navigation";
import Header from "@/components/Header";
import ReportPanel from "@/components/ReportPanel";
import SourcePanel from "@/components/SourcePanel";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function ProjectPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="[--header-height:calc(--spacing(12))]" >
      <SidebarProvider className="flex flex-col">
        <Header />
        <div className="flex flex-1">
          <SourcePanel />
          <SidebarInset>
            <ReportPanel projectId={id} />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
