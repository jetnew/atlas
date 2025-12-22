"use client";

import { Profile } from "@/components/Profile";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex w-full items-center">
      <div className="flex h-(--header-height) w-full items-center gap-4 px-4">
        <Link href="/" className="font-bold text-xl cursor-pointer">
          <Avatar>
            <AvatarImage src="/logo.webp" alt="Atlas" />
          </Avatar>
        </Link>
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Atlas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Profile />
      </div>
    </header>
  );
}
