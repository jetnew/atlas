"use client";

import { useEffect, useRef, useMemo } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { Streamdown } from "streamdown";
import { Card, CardContent } from "@/components/ui/card";
import { useProject } from "@/components/ProjectContext";
import { reportSchema, Report as ReportType } from "@/lib/schemas/report";
import { formatReport } from "@/lib/formatReport";

interface ReportProps {
  projectId: string;
}

export default function Report({ projectId }: ReportProps) {
  const { isLoading, error, getProjectData, currentProject } = useProject();
  const reportGeneratedRef = useRef(false);

  const { object: streamedReport, submit: generateReport, isLoading: isGenerating } = useObject({
    api: '/api/report',
    schema: reportSchema,
  });

  // Load project data on mount
  useEffect(() => {
    if (projectId) {
      getProjectData(projectId);
    }
  }, [projectId, getProjectData]);

  // Generate report if none exists
  useEffect(() => {
    if (currentProject && !currentProject.report && !reportGeneratedRef.current) {
      reportGeneratedRef.current = true;
      generateReport(projectId);
    }
  }, [currentProject, projectId, generateReport]);

  // Determine which report to display: streaming or from database
  const displayReport = useMemo(() => {
    // If currently streaming, show streamed report
    if (streamedReport) {
      return streamedReport as ReportType;
    }
    // Otherwise show report from database
    if (currentProject?.report) {
      return currentProject.report;
    }
    return null;
  }, [streamedReport, currentProject?.report]);

  if (isLoading || error) {
    return null;
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="flex-1 overflow-auto p-6 flex justify-center">
        <div className="w-full max-w-3xl">
          <Streamdown isAnimating={isGenerating}>
            {formatReport(displayReport)}
          </Streamdown>
        </div>
      </CardContent>
    </Card>
  );
}
