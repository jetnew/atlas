"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useCompletion } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, PanelLeftIcon, PanelRightIcon } from "lucide-react";
import { useProject } from "@/components/ProjectContext";
import { parseReportToMap } from "@/lib/formatReport";
import Map from "@/components/Map";

interface MapPanelProps {
  projectId: string;
}

export default function MapPanel({ projectId }: MapPanelProps) {
  const { isLoading, error, getProjectData, currentProject } = useProject();
  const reportGeneratedRef = useRef(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // Listen to sidebar state changes via data attributes
  useEffect(() => {
    const checkSidebarStates = () => {
      const leftSidebar = document.querySelector('[data-slot="sidebar"][data-side="left"]');
      const rightSidebar = document.querySelector('[data-slot="sidebar"][data-side="right"]');

      if (leftSidebar) {
        setLeftSidebarOpen(leftSidebar.getAttribute('data-state') === 'expanded');
      }
      if (rightSidebar) {
        setRightSidebarOpen(rightSidebar.getAttribute('data-state') === 'expanded');
      }
    };

    // Create observer to watch for attribute changes on sidebars
    const attributeObserver = new MutationObserver(checkSidebarStates);

    // Function to set up observers on sidebar elements
    const setupObservers = () => {
      const leftSidebar = document.querySelector('[data-slot="sidebar"][data-side="left"]');
      const rightSidebar = document.querySelector('[data-slot="sidebar"][data-side="right"]');

      if (leftSidebar) {
        attributeObserver.observe(leftSidebar, { attributes: true, attributeFilter: ['data-state'] });
      }
      if (rightSidebar) {
        attributeObserver.observe(rightSidebar, { attributes: true, attributeFilter: ['data-state'] });
      }

      // Check initial states
      checkSidebarStates();

      return leftSidebar && rightSidebar;
    };

    // Try to set up observers immediately
    if (!setupObservers()) {
      // If sidebars aren't found, observe DOM for when they're added
      const domObserver = new MutationObserver(() => {
        if (setupObservers()) {
          domObserver.disconnect();
        }
      });
      domObserver.observe(document.body, { childList: true, subtree: true });

      return () => {
        attributeObserver.disconnect();
        domObserver.disconnect();
      };
    }

    return () => attributeObserver.disconnect();
  }, []);

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

  // Calculate sidebar widths (matching sidebar.tsx constants)
  const sidebarWidth = "16rem"; // --sidebar-width
  const sidebarPadding = "0.5rem"; // p-2 = 0.5rem on each side

  const toggleLeftSidebar = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'b',
      metaKey: true,
      bubbles: true
    });
    window.dispatchEvent(event);
  };

  const toggleRightSidebar = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'l',
      metaKey: true,
      bubbles: true
    });
    window.dispatchEvent(event);
  };

  return (
    <div
      className={`absolute inset-0 flex flex-col overflow-hidden transition-[left,right] duration-200 ease-linear`}
    >
      {!leftSidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 z-10 size-9"
          onClick={toggleLeftSidebar}
        >
          <PanelLeftIcon className="h-4 w-4" />
        </Button>
      )}
      {!rightSidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 size-9"
          onClick={toggleRightSidebar}
        >
          <PanelRightIcon className="h-4 w-4" />
        </Button>
      )}
      {!isGenerating && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-2 z-10 transition-[right] duration-200 ease-linear"
          style={{ right: rightSidebarOpen ? `calc(${sidebarWidth} + ${sidebarPadding})` : '0.5rem' }}
          onClick={handleRegenerate}
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
      )}
      <div className="flex-1 overflow-auto flex justify-center">
        <Map report={displayMap} />
      </div>
    </div>
  );
}
