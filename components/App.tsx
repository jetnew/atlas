"use client";

import { useState } from "react";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import Header from "@/components/Header";

export default function App() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  return (
    <div className="min-h-screen">
      <Header />
      <NewProjectDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
