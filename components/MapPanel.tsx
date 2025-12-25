"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useCompletion } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbEllipsis,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChatContext } from "@/components/ChatContext";
import { PanelLeftIcon, PanelRightIcon } from "lucide-react";
import { useProject } from "@/components/ProjectContext";
import { useReport } from "@/components/ReportContext";
import { parseReportToMap } from "@/lib/formatReport";
import Map from "@/components/Map";

interface MapPanelProps {
  projectId: string;
}

// Helper to get the text content from a message
function getMessageText(message: { parts: Array<{ type: string; text?: string }> }): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

// Helper to truncate text to first 10 characters
function truncateText(text: string, maxLength: number = 10): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.substring(0, maxLength) + "...";
}

export default function MapPanel({ projectId }: MapPanelProps) {
  const { isLoading, error, getProjectData, currentProject } = useProject();
  const { setIsGenerating, setRegenerate } = useReport();
  const { assistantMessages, selectedAssistantIndex, setSelectedAssistantIndex } = useChatContext();
  const reportGeneratedRef = useRef(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(0);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // Listen to sidebar state changes via data attributes
  useEffect(() => {
    const checkSidebarStates = () => {
      const leftSidebar = document.querySelector('[data-slot="sidebar"][data-side="left"]');
      const rightSidebar = document.querySelector('[data-slot="sidebar"][data-side="right"]');

      if (leftSidebar) {
        const isExpanded = leftSidebar.getAttribute('data-state') === 'expanded';
        setLeftSidebarOpen(isExpanded);
        if (isExpanded) {
          const sidebarWidth = getComputedStyle(leftSidebar).getPropertyValue('--sidebar-width');
          setLeftSidebarWidth(sidebarWidth ? parseFloat(sidebarWidth) * 16 : 0);
        } else {
          setLeftSidebarWidth(0);
        }
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
        attributeObserver.observe(leftSidebar, { attributes: true, attributeFilter: ['data-state', 'style'] });
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

  // Determine which report text to display (for Home/default map)
  const defaultReportText = useMemo(() => {
    // Priority: streaming > database
    if (reportText) {
      return reportText;
    }
    if (currentProject?.report) {
      return currentProject.report;
    }
    return '';
  }, [reportText, currentProject?.report]);

  // Convert default report text to structured map data
  const defaultMap = useMemo(() => {
    if (defaultReportText) {
      return parseReportToMap(defaultReportText);
    }
    return null;
  }, [defaultReportText]);

  // Get map for selected assistant message
  const selectedAssistantMap = useMemo(() => {
    if (selectedAssistantIndex === null || assistantMessages.length === 0) {
      return null;
    }
    const selectedMessage = assistantMessages[selectedAssistantIndex];
    if (!selectedMessage) return null;

    const messageText = getMessageText(selectedMessage);
    if (messageText) {
      return parseReportToMap(messageText);
    }
    return null;
  }, [selectedAssistantIndex, assistantMessages]);

  // Display map: selected assistant message map OR default report map
  const displayMap = useMemo(() => {
    if (selectedAssistantIndex !== null && selectedAssistantMap) {
      return selectedAssistantMap;
    }
    return defaultMap;
  }, [selectedAssistantIndex, selectedAssistantMap, defaultMap]);

  const handleRegenerate = useCallback(() => {
    reportGeneratedRef.current = false;
    generateReport('');
  }, [generateReport]);

  // Register regenerate function with context
  useEffect(() => {
    setRegenerate(handleRegenerate);
    return () => setRegenerate(null);
  }, [handleRegenerate, setRegenerate]);

  // Sync isGenerating state with context
  useEffect(() => {
    setIsGenerating(isGeneratingReport);
  }, [isGeneratingReport, setIsGenerating]);

  if (isLoading || error) {
    return null;
  }

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
      {/* Only show breadcrumbs when there are 1+ assistant messages */}
      {assistantMessages.length >= 1 && (
        <Breadcrumb
          className="absolute top-4 z-10 transition-[left] duration-200 ease-linear"
          style={{ left: leftSidebarOpen ? `calc(${leftSidebarWidth}px - 1rem)` : '3.25rem' }}
        >
          <BreadcrumbList>
            {/* Home - clickable to go back to default map */}
            <BreadcrumbItem>
              {selectedAssistantIndex === null ? (
                <BreadcrumbPage>Home</BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedAssistantIndex(null);
                  }}
                >
                  Home
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>

            {/* Dynamic breadcrumbs based on assistant messages */}
            {selectedAssistantIndex !== null && (() => {
              // Messages before the selected one (shown in dropdown)
              const messagesBefore = assistantMessages.slice(0, selectedAssistantIndex);
              // Messages after the selected one (shown in dropdown when navigated back)
              const messagesAfter = assistantMessages.slice(selectedAssistantIndex + 1);
              // The currently selected message
              const currentMessage = assistantMessages[selectedAssistantIndex];

              if (!currentMessage) return null;

              return (
                <>
                  {/* Separator after Home */}
                  <BreadcrumbSeparator />

                  {/* Ellipsis dropdown for messages BEFORE the selected one */}
                  {messagesBefore.length > 0 && (
                    <>
                      <BreadcrumbItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex items-center gap-1">
                            <BreadcrumbEllipsis className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {messagesBefore.map((msg, idx) => (
                              <DropdownMenuItem
                                key={msg.id}
                                onClick={() => setSelectedAssistantIndex(idx)}
                              >
                                {truncateText(getMessageText(msg))}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                    </>
                  )}

                  {/* Current (selected) message */}
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {truncateText(getMessageText(currentMessage))}
                    </BreadcrumbPage>
                  </BreadcrumbItem>

                  {/* Ellipsis dropdown for messages AFTER the selected one */}
                  {messagesAfter.length > 0 && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex items-center gap-1">
                            <BreadcrumbEllipsis className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {messagesAfter.map((msg, idx) => (
                              <DropdownMenuItem
                                key={msg.id}
                                onClick={() => setSelectedAssistantIndex(selectedAssistantIndex + 1 + idx)}
                              >
                                {truncateText(getMessageText(msg))}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </BreadcrumbItem>
                    </>
                  )}
                </>
              );
            })()}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      {!leftSidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 z-5 size-9"
          onClick={toggleLeftSidebar}
        >
          <PanelLeftIcon className="h-4 w-4" />
        </Button>
      )}
      {!rightSidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-5 size-9"
          onClick={toggleRightSidebar}
        >
          <PanelRightIcon className="h-4 w-4" />
        </Button>
      )}
      <div className="flex-1 overflow-auto flex justify-center">
        <Map report={displayMap} />
      </div>
    </div>
  );
}
