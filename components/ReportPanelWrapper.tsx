"use client";

import { useSidebar } from "@/components/ui/sidebar";
import ReportPanel from "@/components/ReportPanel";

interface ReportPanelWrapperProps {
  projectId: string;
}

export default function ReportPanelWrapper({ projectId }: ReportPanelWrapperProps) {
  const { open, setOpen } = useSidebar();

  const handleExpandSourcePanel = () => {
    setOpen(true);
  };

  return (
    <ReportPanel
      projectId={projectId}
      onExpandSourcePanel={handleExpandSourcePanel}
      isSourcePanelCollapsed={!open}
    />
  );
}
