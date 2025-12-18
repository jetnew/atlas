"use client";

import { useState, useRef } from "react";
import { Profile } from "@/components/Profile";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Badge } from "@/components/ui/badge";
import { ArrowUpIcon, Plus as IconPlus, X as XIcon, FileText } from "lucide-react";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB in bytes
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg";

function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const [projectPrompt, setProjectPrompt] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndAddFiles = (files: File[]) => {
    // Reset error
    setFileError("");

    // Check file count
    if (selectedFiles.length + files.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} files allowed`);
      return false;
    }

    // Validate file size
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setFileError(`File(s) exceed 50 MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return false;
    }

    // Validate file types by extension
    const invalidFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return !ACCEPTED_FILE_TYPES.includes(extension);
    });

    if (invalidFiles.length > 0) {
      setFileError(`Invalid file type(s): ${invalidFiles.map(f => f.name).join(', ')}`);
      return false;
    }

    // Add valid files
    setSelectedFiles(prev => [...prev, ...files]);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    validateAndAddFiles(files);

    // Reset input value to allow re-selecting the same file
    if (e.target) {
      e.target.value = '';
    }
  };

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    validateAndAddFiles(files);
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setFileError("");
  };

  const handleStartProject = () => {
    console.log("Starting project with idea:", projectPrompt);

    if (selectedFiles.length > 0) {
      console.log("Attached files:", selectedFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString(),
      })));
    }

    // Reset state
    setProjectPrompt("");
    setSelectedFiles([]);
    setFileError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pt-12 pb-7 px-6">
        <DialogHeader className="mb-1">
          <DialogTitle className="text-2xl font-semibold text-center">What are you working on?</DialogTitle>
        </DialogHeader>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Upload files"
        />
        <InputGroup
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="relative"
        >
          {isDragging && (
            <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 rounded-lg">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Drop to add to project</div>
            </div>
          )}
          <InputGroupTextarea
            value={projectPrompt}
            onChange={(e) => setProjectPrompt(e.target.value)}
            placeholder="Describe your project..."
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
              {selectedFiles.length > 0 && (
                <div className="flex gap-1 items-center overflow-x-auto scrollbar-hide">
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
              disabled={!projectPrompt.trim()}
              onClick={handleStartProject}
              type="button"
            >
              <ArrowUpIcon />
              <span className="sr-only">Send</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </DialogContent>
    </Dialog>
  );
}

export default function App() {
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  return (
    <div className="min-h-screen">
      <div className="fixed top-4 left-4 font-bold text-xl flex items-center gap-2">
        <Avatar>
          <AvatarImage src="/logo.webp" alt="Atlas" />
        </Avatar>
        Atlas
      </div>
      <div className="fixed top-4 right-4">
        <Profile />
      </div>

      <NewProjectDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
