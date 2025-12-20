"use client";

import { Profile } from "@/components/Profile";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

export default function Header() {
  return (
    <header className="w-full flex items-center justify-between p-2">
      <div className="font-bold text-xl flex items-center gap-2">
        <Avatar>
          <AvatarImage src="/logo.webp" alt="Atlas" />
        </Avatar>
        Atlas
      </div>
      <Profile />
    </header>
  );
}
