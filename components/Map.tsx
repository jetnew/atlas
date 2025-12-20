"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Report as ReportType } from "@/lib/schemas/report";

interface MapProps {
  report: ReportType | null;
}

export default function Map({ report }: MapProps) {
  if (!report) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No report data available
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {/* Placeholder for map visualization */}
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Map visualization coming soon
      </div>
    </div>
  );
}
