"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { experimental_useObject as useObject, useCompletion } from "@ai-sdk/react";
import { Streamdown } from "streamdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, NotebookText, RefreshCcw } from "lucide-react";
import { useProject } from "@/components/ProjectContext";
import { mapSchema, Map as MapType } from "@/lib/schemas/report";
import MapView from "@/components/Map";

interface ReportProps {
  projectId: string;
}

export default function Report({ projectId }: ReportProps) {
  const { isLoading, error, getProjectData, currentProject } = useProject();
  const reportGeneratedRef = useRef(false);
  const mapGeneratedRef = useRef(false);
  const [isMapView, setIsMapView] = useState(true);

  // Hook 1: Generate markdown text report
  const {
    completion: reportText,
    complete: generateReport,
    isLoading: isGeneratingReport
  } = useCompletion({
    api: '/api/report',
    body: { projectId },
  });

  // Hook 2: Generate structured map from report text
  const {
    object: streamedMap,
    submit: generateMap,
    isLoading: isGeneratingMap
  } = useObject({
    api: '/api/map',
    schema: mapSchema,
  });

  // Load project data on mount
  useEffect(() => {
    if (projectId) {
      getProjectData(projectId);
    }
  }, [projectId, getProjectData]);

  // Step 1: Generate report if none exists
  useEffect(() => {
    if (currentProject && !currentProject.report && !reportGeneratedRef.current) {
      reportGeneratedRef.current = true;
      generateReport('');
    }
  }, [currentProject, generateReport]);

  // Step 2: Trigger map generation when report completes
  useEffect(() => {
    // Check if report just completed streaming
    if (!isGeneratingReport && reportText && !mapGeneratedRef.current) {
      mapGeneratedRef.current = true;
      // Generate map with the completed report text
      generateMap({ projectId, reportText });
    }
  }, [isGeneratingReport, reportText, generateMap, projectId]);

  // Also generate map if we have report from database but no map
  useEffect(() => {
    if (currentProject?.report && !currentProject?.map && !isGeneratingMap && !streamedMap) {
      generateMap({ projectId, reportText: currentProject.report });
    }
  }, [currentProject, isGeneratingMap, streamedMap, generateMap, projectId]);

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

  // Determine which map to display
  const displayMap = useMemo(() => {
    // Priority: streaming > database
    if (streamedMap) {
      return streamedMap as MapType;
    }
    if (currentProject?.map) {
      return currentProject.map;
    }
    return null;
  }, [streamedMap, currentProject]);

  const handleRegenerate = () => {
    reportGeneratedRef.current = false;
    mapGeneratedRef.current = false;
    generateReport('');
  };

  if (isLoading || error) {
    return null;
  }

  const isGenerating = isGeneratingReport || isGeneratingMap;

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
      {!isGenerating && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-4 right-4 z-10"
          onClick={handleRegenerate}
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      )}
      <CardContent className="flex-1 overflow-auto flex justify-center p-0">
        {isMapView ? (
          <MapView report={displayMap} />
        ) : (
          <div className="w-full max-w-3xl p-6">
            <Streamdown isAnimating={isGeneratingReport}>
              {displayReportText}
            </Streamdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
