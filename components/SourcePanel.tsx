"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/components/ProjectContext";
import { FileText, Ellipsis, PanelLeftIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  useSidebarToggle,
} from "@/components/ui/sidebar"

interface SourceTabProps {
  source: {
    id: string;
    name: string;
    summary?: string | null;
    storage_path?: string | null;
  };
}

function SourceTab({ source }: SourceTabProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { deleteSource } = useProject();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (!source.storage_path) {
        console.error("No storage path for source:", source.id);
        return;
      }
      await deleteSource(source.id, source.storage_path);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete source:", error);
    }
  };

  return (
    <>
      <div className="w-full flex items-center gap-2 group/source px-2 py-1 rounded-md hover:bg-accent transition-colors">
        <FileText className="h-4 w-4" />
        <span className="text-sm flex-1 text-left font-medium line-clamp-1">{source.name}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover/source:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Ellipsis className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                setIsDeleteDialogOpen(true);
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Source?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the source &quot;{source.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ToggleButton() {
  const { toggle } = useSidebarToggle();
  return (
    <Button variant="ghost" size="icon" className="size-9" onClick={toggle}>
      <PanelLeftIcon className="h-4 w-4" />
    </Button>
  );
}

export default function SourcePanel() {
  const { currentProject, uploadFilesToProject, isLoading } = useProject();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setUploadError(null);

    if (!currentProject) {
      setUploadError("No project selected");
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    try {
      await uploadFilesToProject(currentProject.id, files);
    } catch (error) {
      console.error("Failed to upload files:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload files");
    }
  };

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svg-var(--header-height))]! pt-0 pr-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      variant="floating"
      keyboardShortcut="b"
    >
      <SidebarContent className="relative">
        {isDragging && (
          <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 rounded-lg">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">Drop to add to project</div>
          </div>
        )}
        <div className="flex-1 overflow-auto p-2">
          <div className="flex justify-end">
            <ToggleButton />
          </div>
          {uploadError && (
            <div className="text-xs text-destructive mb-2 p-2 bg-destructive/10 rounded">
              {uploadError}
            </div>
          )}
          {isLoading ? (
            <div className="text-muted-foreground">Loading sources...</div>
          ) : currentProject?.sources && currentProject.sources.length > 0 ? (
            <div className="space-y-0.5">
              {currentProject.sources.map((source) => (
                <SourceTab key={source.id} source={source} />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No sources available</div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
