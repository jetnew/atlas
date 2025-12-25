"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PanelRightIcon, ArrowUpIcon, Plus as IconPlus, FileText, X as XIcon, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  SidebarContent,
  SidebarFooter,
  useSidebarToggle,
} from "@/components/ui/sidebar";
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";

function ToggleButton({ onToggle }: { onToggle?: () => void }) {
  const { toggle } = useSidebarToggle();
  return (
    <Button variant="ghost" size="icon" className="size-9" onClick={() => {
      toggle();
      onToggle?.();
    }}>
      <PanelRightIcon className="h-4 w-4" />
    </Button>
  );
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB in bytes
const ACCEPTED_FILE_TYPES = ".pdf,.docx,.txt,.md,.png,.jpg,.jpeg";

interface ChatViewProps {
  onBack: () => void;
  isDragging: boolean;
}

export default function ChatView({ onBack, isDragging }: ChatViewProps) {
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSend = () => {
    if (message.trim() || selectedFiles.length > 0) {
      console.log("Sending message:", message, "Files:", selectedFiles.map(f => f.name));
      setMessage("");
      setSelectedFiles([]);
    }
  };

  return (
    <>
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 rounded-lg">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">Drop to attach files</div>
        </div>
      )}
      <SidebarContent className="relative">
        <div className="flex-1 overflow-auto p-2">
          <div className="flex justify-between">
            <div className="flex">
              <ToggleButton onToggle={onBack} />
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Chat content will go here */}
        </div>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Upload files"
        />
        <InputGroup className="bg-white">
          <InputGroupTextarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask anything..."
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
              disabled={!message.trim() && selectedFiles.length === 0}
              onClick={handleSend}
              type="button"
            >
              <ArrowUpIcon />
              <span className="sr-only">Send</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </SidebarFooter>
    </>
  );
}
