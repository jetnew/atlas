"use client";

import { useState } from "react";
import { Profile } from "@/components/Profile";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { NewProjectDialog } from "@/components/NewProjectDialog";

export default function App() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  return (
    <div className="min-h-screen">
      <div className="fixed top-4 left-4 font-bold text-xl flex items-center gap-2">
        <Avatar>
          <AvatarImage src="/logo.webp" alt="Atlas" />
        </Avatar>
        Atlas
      </div>
      <div className="fixed top-4 right-4">
        <Profile />
      </div>

      <NewProjectDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
