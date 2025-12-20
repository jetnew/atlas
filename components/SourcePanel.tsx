"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useProject } from "@/components/ProjectContext";

export default function SourcePanel() {
  const { currentProject, isLoading } = useProject();

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-muted-foreground">Loading sources...</div>
        ) : currentProject?.sources && currentProject.sources.length > 0 ? (
          <div className="space-y-2">
            {currentProject.sources.map((source) => (
              <div
                key={source.id}
                className="p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="text-sm font-medium">{source.name}</div>
                {source.summary && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {source.summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground">No sources available</div>
        )}
      </CardContent>
    </Card>
  );
}
