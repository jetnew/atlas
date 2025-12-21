"use client";

import { Streamdown } from "streamdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, RefreshCcw } from "lucide-react";

interface ReportProps {
  reportText: string;
  isGenerating: boolean;
  onToggleView: () => void;
  onRegenerate: () => void;
}

export default function Report({ reportText, isGenerating, onToggleView, onRegenerate }: ReportProps) {
  return (
    <div className="w-full max-w-3xl h-full relative">
      <Card className="w-full h-full overflow-auto">
        <CardContent className="px-12">
          <Streamdown isAnimating={isGenerating}>
            {reportText}
          </Streamdown>
        </CardContent>
      </Card>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10"
        onClick={onToggleView}
      >
        <MapIcon className="h-4 w-4" />
      </Button>
      {!isGenerating && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-4 right-4 z-10"
          onClick={onRegenerate}
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
