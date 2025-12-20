"use client";

import { useEffect, useRef } from "react";
import { useCompletion } from "@ai-sdk/react";
import { Streamdown } from "streamdown";
import { Card, CardContent } from "@/components/ui/card";
import { useProject } from "@/components/ProjectContext";

interface ReportProps {
  projectId: string;
}

export default function Report({ projectId }: ReportProps) {
  const { isLoading, error, getProjectData, currentProject } = useProject();
  const reportGeneratedRef = useRef(false);

  const { completion: report, complete: generateReport, isLoading: isGenerating } = useCompletion({
    api: '/api/report',
  });

  useEffect(() => {
    if (projectId) {
      getProjectData(projectId);
    }
  }, [projectId, getProjectData]);

  useEffect(() => {
    if (currentProject && !currentProject.report && !reportGeneratedRef.current) {
      reportGeneratedRef.current = true;
      generateReport("", {
        body: {
          projectId,
        }
      });
    }
  }, [currentProject, projectId, generateReport]);

  if (isLoading || error) {
    return null;
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="flex-1 overflow-auto p-6 flex justify-center">
        <div className="w-full max-w-3xl">
          <Streamdown isAnimating={isGenerating}>
            {currentProject?.report || report}
          </Streamdown>
        </div>
      </CardContent>
    </Card>
  );
}
