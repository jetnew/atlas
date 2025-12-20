"use client";

import { useState } from "react";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import Header from "@/components/Header";
import { ProjectProvider } from "@/components/ProjectContext";

export default function App() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  return (
    <ProjectProvider>
      <div className="min-h-screen">
        <Header />
        <NewProjectDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      </div>
    </ProjectProvider>
  );
}
