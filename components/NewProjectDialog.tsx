"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowUpIcon, Plus as IconPlus, X as XIcon, FileText, ArrowRight } from "lucide-react";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB in bytes
const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg";

interface Question {
  question: string;
  options: string[];
}

const MOCK_QUESTIONS: Question[] = [
  {
    question: "What do you mean by X?",
    options: ["A", "B", "C"],
  },
  {
    question: "What do you mean by Y?",
    options: ["D", "E", "F"],
  },
  {
    question: "What do you mean by Z?",
    options: ["G", "H", "I"],
  },
];

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const [projectPrompt, setProjectPrompt] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [currentView, setCurrentView] = useState<"prompt" | "details">("prompt");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === MOCK_QUESTIONS.length - 1;
  const currentAnswer = answers[currentQuestionIndex] || currentQuestion?.options[0] || "";

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

  const resetDialogState = () => {
    setProjectPrompt("");
    setSelectedFiles([]);
    setFileError("");
    setCurrentView("prompt");
    setCurrentQuestionIndex(0);
    setAnswers({});
  };

  const handleSendClick = () => {
    // Transition to project details view
    setCurrentView("details");
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      // Final submit
      console.log("Starting project with:", {
        prompt: projectPrompt,
        files: selectedFiles.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
        })),
        answers,
      });

      resetDialogState();
      onOpenChange(false);
    } else {
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: value,
    }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) resetDialogState();
        onOpenChange(open);
      }}
    >
      <DialogContent className={currentView === "prompt" ? "pt-12 pb-7 px-6" : ""}>
        {currentView === "prompt" && (
          <>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (projectPrompt.trim()) {
                      handleSendClick();
                    }
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
                  disabled={!projectPrompt.trim()}
                  onClick={handleSendClick}
                  type="button"
                >
                  <ArrowUpIcon />
                  <span className="sr-only">Send</span>
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </>
        )}
        {currentView === "details" && currentQuestion && (
          <>
            <DialogHeader>
              <DialogTitle>
                Project Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">
                {currentQuestion.question}
              </p>
              <RadioGroup
                value={currentAnswer}
                onValueChange={handleAnswerChange}
                className="space-y-0.5"
              >
                {currentQuestion.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`option-${option.toLowerCase()}`} />
                    <Label htmlFor={`option-${option.toLowerCase()}`} className="cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button
                onClick={handleNextQuestion}
                disabled={!currentAnswer}
                size="icon-sm"
                className="rounded-full"
              >
                <ArrowRight />
                <span className="sr-only">{isLastQuestion ? "Start Project" : "Next Question"}</span>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
