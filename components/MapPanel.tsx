"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useCompletion, experimental_useObject as useObject } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PanelLeftIcon, PanelRightIcon, Plus as IconPlus, FileText, X as XIcon, ArrowUpIcon, BoxIcon } from "lucide-react";
import { useProject } from "@/components/ProjectContext";
import { useMap } from "@/components/MapContext";
import { mapReplacementResponseSchema, Map as MapType } from "@/lib/schemas/map";
import {
  parseReportToMap,
  filterRedundantNodes,
  replaceNodeInMap,
  replaceSiblingNodesInMap,
} from "@/lib/mapUtils";
import Map, { SelectedNode } from "@/components/Map";
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { MAX_FILES, MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "@/lib/constants";

interface MapPanelProps {
  projectId: string;
}

export default function MapPanel({ projectId }: MapPanelProps) {
  const { isLoading, error, getProjectData, currentProject, setCurrentProject } = useProject();
  const { setIsGenerating, setRegenerate } = useMap();
  const reportGeneratedRef = useRef(false);
  const generateReportRef = useRef<(prompt: string) => void>(() => { });
  const currentProjectRef = useRef(currentProject);
  const replacementNodeIdsRef = useRef<string[]>([]);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [userInput, setUserInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<SelectedNode[]>([]);
  const [fileError, setFileError] = useState<string>("");
  const [isReplacingNodes, setIsReplacingNodes] = useState(false);
  const [replacementNodeIds, setReplacementNodeIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Hook: Generate report and save map to database
  const {
    completion: reportText,
    complete: generateReport,
    isLoading: isGeneratingReport
  } = useCompletion({
    api: '/api/report',
    body: { projectId },
    onFinish: (_prompt, completion) => {
      // Update project state with the final parsed map from streaming
      // No need to refetch from database - we already have the data
      const finalMap = parseReportToMap(completion);
      const project = currentProjectRef.current;
      if (project && finalMap) {
        setCurrentProject({
          ...project,
          map: finalMap,
        });
      }
    },
  });

  // Hook: Replace selected nodes with AI-generated content
  const {
    object: replacementObject,
    submit: submitReplacement,
    isLoading: isReplacingLoading,
  } = useObject({
    api: '/api/map',
    schema: mapReplacementResponseSchema,
    onFinish: (event) => {
      // Update local project state with the final merged map
      // No need to refresh from database - the API saves in the background
      // Use refs to get current values, avoiding stale closure issues
      const project = currentProjectRef.current;
      const nodeIds = replacementNodeIdsRef.current;

      if (event.object?.nodes && event.object.nodes.length > 0 && project) {
        const baseMap = project.map as MapType;
        let updatedMap: MapType;

        if (nodeIds.length === 1) {
          updatedMap = replaceNodeInMap(
            baseMap,
            nodeIds[0],
            event.object.nodes[0] as MapType
          );
        } else {
          updatedMap = replaceSiblingNodesInMap(
            baseMap,
            nodeIds,
            event.object.nodes as MapType[]
          );
        }

        // Update project state with the final merged map
        // Clear replacement state AFTER updating project to avoid race condition
        // where useMemo reads stale currentProject.map
        setCurrentProject({
          ...project,
          map: updatedMap,
        });

        // Use callback to ensure these run after the project update
        // React batches these, but the order matters for the useMemo
        setTimeout(() => {
          setIsReplacingNodes(false);
          setReplacementNodeIds([]);
          setSelectedNodes([]);
        }, 0);
      } else {
        // No valid replacement, just clear state
        setIsReplacingNodes(false);
        setReplacementNodeIds([]);
        setSelectedNodes([]);
      }
    },
    onError: (error) => {
      console.error('Replacement error:', error);
      setIsReplacingNodes(false);
      setReplacementNodeIds([]);
    },
  });

  // Keep refs in sync with latest values
  useEffect(() => {
    generateReportRef.current = generateReport;
  }, [generateReport]);

  useEffect(() => {
    currentProjectRef.current = currentProject;
  }, [currentProject]);

  useEffect(() => {
    replacementNodeIdsRef.current = replacementNodeIds;
  }, [replacementNodeIds]);

  // Load project data on mount
  useEffect(() => {
    if (projectId) {
      getProjectData(projectId);
    }
  }, [projectId, getProjectData]);

  // Generate report if no map exists
  useEffect(() => {
    if (currentProject && !currentProject.map && !reportGeneratedRef.current) {
      reportGeneratedRef.current = true;
      generateReport('');
    }
  }, [currentProject, generateReport]);

  // Parse streaming report text into map, fallback to database map
  const map = useMemo(() => {
    // During node replacement, always use currentProject.map as the base
    // This ensures stability while waiting for replacementObject to stream in
    if (isReplacingNodes && currentProject?.map) {
      const baseMap = currentProject.map as MapType;

      // If we have partial/complete replacement results, merge them
      if (replacementObject?.nodes && replacementNodeIds.length > 0) {
        if (replacementNodeIds.length === 1) {
          // Single node replacement
          if (replacementObject.nodes[0]) {
            return replaceNodeInMap(
              baseMap,
              replacementNodeIds[0],
              replacementObject.nodes[0] as MapType
            );
          }
        } else if (replacementNodeIds.length > 1) {
          // Multiple sibling replacement
          if (replacementObject.nodes.length > 0) {
            return replaceSiblingNodesInMap(
              baseMap,
              replacementNodeIds,
              replacementObject.nodes as MapType[]
            );
          }
        }
      }

      // No replacement data yet, use base map as-is to maintain stability
      return baseMap;
    }

    // Not replacing: priority is streaming report text > database
    if (reportText) {
      return parseReportToMap(reportText);
    }
    return currentProject?.map || null;
  }, [reportText, currentProject?.map, isReplacingNodes, replacementObject, replacementNodeIds]);

  const handleRegenerate = useCallback(() => {
    reportGeneratedRef.current = false;
    generateReportRef.current('');
  }, []);

  const validateAndAddFiles = (files: File[]) => {
    setFileError("");

    if (selectedFiles.length + files.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} files allowed`);
      return false;
    }

    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setFileError(`File(s) exceed 50 MB limit: ${oversizedFiles.map(f => f.name).join(", ")}`);
      return false;
    }

    const invalidFiles = files.filter(file => {
      const extension = "." + file.name.split(".").pop()?.toLowerCase();
      return !ACCEPTED_FILE_TYPES.includes(extension);
    });

    if (invalidFiles.length > 0) {
      setFileError(`Invalid file type(s): ${invalidFiles.map(f => f.name).join(", ")}`);
      return false;
    }

    setSelectedFiles(prev => [...prev, ...files]);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    validateAndAddFiles(files);
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setFileError("");
  };

  const handleSelectionChange = useCallback((nodes: SelectedNode[]) => {
    setSelectedNodes(nodes);
  }, []);

  const handleRemoveNode = (nodeId: string) => {
    setSelectedNodes(prev => prev.filter(node => node.id !== nodeId));
  };

  const handleSend = useCallback(() => {
    if (!userInput.trim() && selectedNodes.length === 0) {
      return;
    }

    if (selectedNodes.length > 0 && userInput.trim() && map) {
      // Node replacement mode
      const nodeIds = selectedNodes.map(n => n.id);
      const filteredIds = filterRedundantNodes(nodeIds);

      setIsReplacingNodes(true);
      setReplacementNodeIds(filteredIds);

      submitReplacement({
        projectId,
        prompt: userInput,
        selectedNodes: selectedNodes,
        currentMap: map,
      });

      setUserInput("");
      // Don't clear selectedNodes yet - we need them for the streaming update
    } else if (userInput.trim() || selectedFiles.length > 0) {
      // Other functionality (file upload, etc.)
      console.log("Send:", { userInput, selectedFiles, selectedNodes });
      setUserInput("");
      setSelectedFiles([]);
      setSelectedNodes([]);
    }
  }, [userInput, selectedNodes, selectedFiles, map, projectId, submitReplacement]);

  // Register regenerate function with context
  useEffect(() => {
    setRegenerate(handleRegenerate);
    return () => setRegenerate(null);
  }, [handleRegenerate, setRegenerate]);

  // Sync isGenerating state with context
  useEffect(() => {
    setIsGenerating(isGeneratingReport || isReplacingLoading);
  }, [isGeneratingReport, isReplacingLoading, setIsGenerating]);

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
        <Map report={map} onSelectionChange={handleSelectionChange} />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Upload files"
        />
        <InputGroup className="bg-white shadow-lg">
          <InputGroupTextarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Organize map..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          {fileError && (
            <div className="px-3 pb-2 text-xs text-destructive">
              {fileError}
            </div>
          )}
          <InputGroupAddon align="block-end" className="justify-between w-full">
            <div className="flex gap-2 items-center flex-1 overflow-hidden">
              <InputGroupButton
                variant="outline"
                className="rounded-full shrink-0"
                size="icon-xs"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <IconPlus />
                <span className="sr-only">Upload files</span>
              </InputGroupButton>
              {(selectedFiles.length > 0 || selectedNodes.length > 0) && (
                <div className="flex gap-1 items-center overflow-x-auto scrollbar-hide">
                  {selectedNodes.map((node) => (
                    <Badge
                      key={node.id}
                      variant="secondary"
                      className="pl-2 pr-2 group/badge cursor-pointer shrink-0"
                    >
                      <BoxIcon className="group-hover/badge:hidden" />
                      <button
                        type="button"
                        onClick={() => handleRemoveNode(node.id)}
                        className="hidden group-hover/badge:block cursor-pointer"
                        aria-label={`Remove ${node.label}`}
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                      <span className="truncate max-w-[120px]">{node.label}</span>
                    </Badge>
                  ))}
                  {selectedFiles.map((file, index) => (
                    <Badge
                      key={`${file.name}-${index}`}
                      variant="secondary"
                      className="pl-2 pr-2 group/badge cursor-pointer shrink-0"
                    >
                      <FileText className="group-hover/badge:hidden" />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="hidden group-hover/badge:block cursor-pointer"
                        aria-label={`Remove ${file.name}`}
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                      <span className="truncate max-w-[120px]">{file.name}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <InputGroupButton
              variant="default"
              className="rounded-full shrink-0"
              size="icon-xs"
              disabled={!userInput.trim() && selectedFiles.length === 0 && selectedNodes.length === 0}
              onClick={handleSend}
              type="button"
            >
              <ArrowUpIcon />
              <span className="sr-only">Send</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
