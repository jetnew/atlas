"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { Streamdown } from "streamdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, NotebookText } from "lucide-react";
import { useProject } from "@/components/ProjectContext";
import { reportSchema, Report as ReportType } from "@/lib/schemas/report";
import { formatReport } from "@/lib/formatReport";
import MapView from "@/components/Map";

interface ReportProps {
  projectId: string;
}

export default function Report({ projectId }: ReportProps) {
  const { isLoading, error, getProjectData, currentProject } = useProject();
  const reportGeneratedRef = useRef(false);
  const [isMapView, setIsMapView] = useState(true);

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
    <Card className="h-full flex flex-col overflow-hidden relative p-0">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10"
        onClick={() => setIsMapView(!isMapView)}
      >
        {isMapView ? <NotebookText className="h-4 w-4" /> : <Map className="h-4 w-4" />}
      </Button>
      <CardContent className="flex-1 overflow-auto flex justify-center p-0">
        {isMapView ? (
          <MapView report={displayReport} />
        ) : (
          <div className="w-full max-w-3xl p-6">
            <Streamdown isAnimating={isGenerating}>
              {formatReport(displayReport)}
            </Streamdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
