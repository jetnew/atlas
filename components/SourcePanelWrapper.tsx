"use client";

import { useSidebar } from "@/components/ui/sidebar";
import SourcePanel from "@/components/SourcePanel";

export default function SourcePanelWrapper() {
  const { setOpen } = useSidebar();

  const handleCollapse = () => {
    setOpen(false);
  };

  return <SourcePanel onCollapse={handleCollapse} />;
}
