"use client";

import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Report from "@/components/Report";
import LeftPanel from "@/components/LeftPanel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function ProjectPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 overflow-hidden">
        <div className="h-full pb-2 px-2">
          <ResizablePanelGroup direction="horizontal" className="h-full gap-1">
            <ResizablePanel defaultSize={30} minSize={30}>
              <LeftPanel />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={70} minSize={50}>
              <Report projectId={id} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}
