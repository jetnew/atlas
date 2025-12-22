"use client";

import { Profile } from "@/components/Profile";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useProject } from "@/components/ProjectContext";

export default function Header() {
  const { currentProject } = useProject();
  const projectTitle = currentProject?.map?.report?.title || "Atlas";

  return (
    <header className="sticky top-0 z-50 flex w-full items-center">
      <div className="flex h-(--header-height) w-full items-center gap-3 px-4">
        <Link href="/" className="font-bold text-xl cursor-pointer">
          <Avatar>
            <AvatarImage src="/logo.webp" alt="Atlas" />
          </Avatar>
        </Link>
        <h1 className="text-sm font-semibold">{projectTitle}</h1>
        <Profile />
      </div>
    </header>
  );
}
