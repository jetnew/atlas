"use client";

import { Profile } from "@/components/Profile";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full flex items-center justify-between p-2">
      <Link href="/" className="font-bold text-xl flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
        <Avatar>
          <AvatarImage src="/logo.webp" alt="Atlas" />
        </Avatar>
        Atlas
      </Link>
      <Profile />
    </header>
  );
}
