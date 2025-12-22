"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useCompletion } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { NotebookText, RefreshCcw } from "lucide-react";
import { useProject } from "@/components/ProjectContext";
import { parseReportToMap } from "@/lib/formatReport";
import Map from "@/components/Map";
import Report from "@/components/Report";
import { SidebarTrigger } from "@/components/ui/sidebar"

interface ReportPanelProps {
  projectId: string;
}

export default function ReportPanel({ projectId }: ReportPanelProps) {
  const { isLoading, error, getProjectData, currentProject } = useProject();
  const reportGeneratedRef = useRef(false);
  const [isMapView, setIsMapView] = useState(true);

  // Hook: Generate markdown text report
  const {
    completion: reportText,
    complete: generateReport,
    isLoading: isGeneratingReport
  } = useCompletion({
    api: '/api/report',
    body: { projectId },
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
      generateReport('');
    }
  }, [currentProject, generateReport]);

  // Determine which report text to display
  const displayReportText = useMemo(() => {
    // Priority: streaming > database
    if (reportText) {
      return reportText;
    }
    if (currentProject?.report) {
      return currentProject.report;
    }
    return '';
  }, [reportText, currentProject?.report]);

  // Convert report text to structured map data
  const displayMap = useMemo(() => {
    if (displayReportText) {
      return parseReportToMap(displayReportText);
    }
    return null;
  }, [displayReportText]);

  const handleRegenerate = () => {
    reportGeneratedRef.current = false;
    generateReport('');
  };

  if (isLoading || error) {
    return null;
  }

  const isGenerating = isGeneratingReport;

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <SidebarTrigger className="absolute top-2 left-2 z-10 size-9" />
      {isMapView && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10"
            onClick={() => setIsMapView(!isMapView)}
          >
            <NotebookText className="h-4 w-4" />
          </Button>
          {!isGenerating && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-2 right-2 z-10"
              onClick={handleRegenerate}
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
      <div className="flex-1 overflow-auto flex justify-center">
        {isMapView ? (
          <Map report={displayMap} />
        ) : (
          <Report
            reportText={displayReportText}
            isGenerating={isGeneratingReport}
            onToggleView={() => setIsMapView(!isMapView)}
            onRegenerate={handleRegenerate}
          />
        )}
      </div>
    </div>
  );
}
