"use client";

import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
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
function truncateText(text: string, maxLength: number = 20): string {
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
      const leftSidebarContainer = document.querySelector('[data-slot="sidebar"][data-side="left"] [data-slot="sidebar-container"]');
      const rightSidebar = document.querySelector('[data-slot="sidebar"][data-side="right"]');

      if (leftSidebar) {
        const isExpanded = leftSidebar.getAttribute('data-state') === 'expanded';
        setLeftSidebarOpen(isExpanded);
        if (isExpanded && leftSidebarContainer) {
          // Read --sidebar-width from the container element where inline styles are applied
          const sidebarWidth = getComputedStyle(leftSidebarContainer).getPropertyValue('--sidebar-width');
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
      const leftSidebarContainer = document.querySelector('[data-slot="sidebar"][data-side="left"] [data-slot="sidebar-container"]');
      const rightSidebar = document.querySelector('[data-slot="sidebar"][data-side="right"]');

      if (leftSidebar) {
        attributeObserver.observe(leftSidebar, { attributes: true, attributeFilter: ['data-state'] });
      }
      // Observe the container for style changes (where --sidebar-width is set)
      if (leftSidebarContainer) {
        attributeObserver.observe(leftSidebarContainer, { attributes: true, attributeFilter: ['style'] });
      }
      if (rightSidebar) {
        attributeObserver.observe(rightSidebar, { attributes: true, attributeFilter: ['data-state'] });
      }

      // Check initial states
      checkSidebarStates();

      return leftSidebar && leftSidebarContainer && rightSidebar;
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
          className="absolute top-4 z-5 transition-[left] duration-200 ease-linear"
          style={{ left: leftSidebarOpen ? `calc(${leftSidebarWidth}px + 1rem)` : '3.25rem' }}
        >
          <BreadcrumbList>
            {/* Home - always shown first */}
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

            {/* Dynamic breadcrumbs: always show Home, current selected, and latest */}
            {(() => {
              const lastIndex = assistantMessages.length - 1;
              const lastMessage = assistantMessages[lastIndex];

              // Helper to render a breadcrumb item (link or page)
              const renderBreadcrumbItem = (msg: typeof lastMessage, idx: number, isCurrent: boolean) => (
                <BreadcrumbItem key={msg.id}>
                  {isCurrent ? (
                    <BreadcrumbPage>{truncateText(getMessageText(msg))}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedAssistantIndex(idx);
                      }}
                    >
                      {truncateText(getMessageText(msg))}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              );

              // Case: Home is selected (null)
              if (selectedAssistantIndex === null) {
                // Show all messages as links (no ellipsis needed since we show all)
                // But if more than 2 messages, show: first > ... > last
                if (assistantMessages.length <= 2) {
                  return assistantMessages.map((msg, idx) => (
                    <React.Fragment key={msg.id}>
                      <BreadcrumbSeparator />
                      {renderBreadcrumbItem(msg, idx, false)}
                    </React.Fragment>
                  ));
                } else {
                  // More than 2: show first > ... > last
                  const firstMessage = assistantMessages[0];
                  const middleMessages = assistantMessages.slice(1, lastIndex);
                  return (
                    <>
                      <BreadcrumbSeparator />
                      {renderBreadcrumbItem(firstMessage, 0, false)}
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex items-center gap-1">
                            <BreadcrumbEllipsis className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {middleMessages.map((msg, idx) => (
                              <DropdownMenuItem
                                key={msg.id}
                                onClick={() => setSelectedAssistantIndex(idx + 1)}
                              >
                                {truncateText(getMessageText(msg))}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      {renderBreadcrumbItem(lastMessage, lastIndex, false)}
                    </>
                  );
                }
              }

              // Case: An assistant message is selected
              const currentMessage = assistantMessages[selectedAssistantIndex];
              if (!currentMessage) return null;

              const isCurrentLast = selectedAssistantIndex === lastIndex;

              // Determine which messages go in the ellipsis
              // We always show: current selected + last (if different)
              // Everything else goes in ellipsis (if any)

              if (assistantMessages.length === 1) {
                // Only one message - just show it
                return (
                  <>
                    <BreadcrumbSeparator />
                    {renderBreadcrumbItem(currentMessage, selectedAssistantIndex, true)}
                  </>
                );
              }

              if (assistantMessages.length === 2) {
                // Two messages - show both, no ellipsis
                return (
                  <>
                    <BreadcrumbSeparator />
                    {renderBreadcrumbItem(assistantMessages[0], 0, selectedAssistantIndex === 0)}
                    <BreadcrumbSeparator />
                    {renderBreadcrumbItem(assistantMessages[1], 1, selectedAssistantIndex === 1)}
                  </>
                );
              }

              // 3+ messages: show current, last, and ellipsis for the rest
              // Collect messages that should go in the ellipsis (all except current and last)
              const ellipsisMessages: { msg: typeof currentMessage; idx: number }[] = [];
              assistantMessages.forEach((msg, idx) => {
                if (idx !== selectedAssistantIndex && idx !== lastIndex) {
                  ellipsisMessages.push({ msg, idx });
                }
              });

              if (isCurrentLast) {
                // Current is the last one: show ellipsis > current
                return (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-1">
                          <BreadcrumbEllipsis className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {ellipsisMessages.map(({ msg, idx }) => (
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
                    {renderBreadcrumbItem(currentMessage, selectedAssistantIndex, true)}
                  </>
                );
              }

              // Current is not the last: show current > ellipsis (if any) > last
              return (
                <>
                  <BreadcrumbSeparator />
                  {renderBreadcrumbItem(currentMessage, selectedAssistantIndex, true)}
                  {ellipsisMessages.length > 0 && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex items-center gap-1">
                            <BreadcrumbEllipsis className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {ellipsisMessages.map(({ msg, idx }) => (
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
                    </>
                  )}
                  <BreadcrumbSeparator />
                  {renderBreadcrumbItem(lastMessage, lastIndex, false)}
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
