"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function LeftPanel() {
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="flex-1 overflow-auto p-6">
        {/* Content will be added here */}
      </CardContent>
    </Card>
  );
}
