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
import { Input } from "@/components/ui/input";
import { ArrowUpIcon, Plus as IconPlus, X as XIcon, FileText, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useProject } from "@/components/ProjectContext";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB in bytes
const ACCEPTED_FILE_TYPES = ".pdf,.docx,.txt,.md,.png,.jpg,.jpeg";

interface Question {
  question: string;
  options: string[];
}

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const [projectPrompt, setProjectPrompt] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [currentView, setCurrentView] = useState<"prompt" | "details">("prompt");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [summaries, setSummaries] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectCreationError, setProjectCreationError] = useState<string | null>(null);
  const router = useRouter();
  const { createProject } = useProject();

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
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

  const handleCreateProject = async () => {
    setProjectCreationError(null);
    setIsCreatingProject(true);

    try {
      // Compile final answers with custom inputs
      const finalAnswers = Object.entries(answers).reduce((acc, [index, answer]) => {
        acc[index] = answer === "custom" ? customInputs[index] || "" : answer;
        return acc;
      }, {} as Record<string, string>);

      // Create project using context
      const projectId = await createProject(
        projectPrompt,
        selectedFiles,
        questions,
        finalAnswers,
        summaries
      );

      if (!projectId) {
        throw new Error("Failed to create project. Please try again.");
      }

      // Navigate to project page
      resetDialogState();
      onOpenChange(false);
      router.push(`/p/${projectId}`);

    } catch (error) {
      console.error("Error creating project:", error);
      setProjectCreationError(
        error instanceof Error
          ? error.message
          : "Failed to create project. Please try again."
      );
    } finally {
      setIsCreatingProject(false);
    }
  };

  const resetDialogState = () => {
    setProjectPrompt("");
    setSelectedFiles([]);
    setFileError("");
    setCurrentView("prompt");
    setCurrentQuestionIndex(0);
    setAnswers({});
    setCustomInputs({});
    setQuestions([]);
    setSummaries([]);
    setApiError(null);
    setIsLoadingQuestions(false);
    setIsCreatingProject(false);
    setProjectCreationError(null);
  };

  const handleSendClick = async () => {
    // Reset any previous errors
    setApiError(null);
    setIsLoadingQuestions(true);

    try {
      // Prepare FormData
      const formData = new FormData();
      formData.append("prompt", projectPrompt);

      // Append all files
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      // Make API call
      const response = await fetch("/api/details", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.status}`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error("Invalid response format from server");
      }

      // Update questions state with API response
      setQuestions(data.questions);

      // Store summaries from API response (array of strings in same order as files)
      if (data.summaries && Array.isArray(data.summaries)) {
        setSummaries(data.summaries);
      }

      // Transition to details view
      setCurrentView("details");
    } catch (error) {
      console.error("Error fetching project details:", error);
      setApiError(
        error instanceof Error
          ? error.message
          : "Failed to load project details. Please try again."
      );
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      // Compile final answers with custom inputs
      const finalAnswers = Object.entries(answers).reduce((acc, [index, answer]) => {
        acc[index] = answer === "custom" ? customInputs[index] || "" : answer;
        return acc;
      }, {} as Record<string, string>);

      // Final submit
      console.log("Starting project with:", {
        prompt: projectPrompt,
        files: selectedFiles.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
        })),
        answers: finalAnswers,
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
      <DialogContent
        className={currentView === "prompt" ? "pt-12 pb-7 px-6" : ""}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 rounded-lg">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">Drop to add to project</div>
              </div>
            )}
            <InputGroup className="relative">
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
              {apiError && (
                <div className="px-3 pb-2 text-xs text-destructive">
                  {apiError}
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
                  disabled={!projectPrompt.trim() || isLoadingQuestions}
                  onClick={handleSendClick}
                  type="button"
                >
                  {isLoadingQuestions ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ArrowUpIcon />
                  )}
                  <span className="sr-only">
                    {isLoadingQuestions ? "Loading..." : "Send"}
                  </span>
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
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="option-custom" />
                  {/* <Label htmlFor="option-custom">Other:</Label> */}
                  <Input
                    value={customInputs[currentQuestionIndex] || ""}
                    onChange={(e) => {
                      setCustomInputs(prev => ({
                        ...prev,
                        [currentQuestionIndex]: e.target.value
                      }));
                      handleAnswerChange("custom");
                    }}
                    onFocus={() => handleAnswerChange("custom")}
                    placeholder="Something else..."
                    className="flex-1 h-7 -my-2 border-none shadow-none focus-visible:border-none focus-visible:ring-0 px-0"
                  />
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              {projectCreationError && (
                <div className="text-xs text-destructive mb-2 w-full text-left">
                  {projectCreationError}
                </div>
              )}
              <Button
                onClick={isLastQuestion ? handleCreateProject : handleNextQuestion}
                disabled={
                  !currentAnswer ||
                  (currentAnswer === "custom" && !customInputs[currentQuestionIndex]?.trim()) ||
                  isCreatingProject
                }
                size="icon-sm"
                className="rounded-full"
              >
                {isCreatingProject ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ArrowRight />
                )}
                <span className="sr-only">
                  {isCreatingProject
                    ? "Creating project..."
                    : isLastQuestion
                      ? "Start Project"
                      : "Next Question"}
                </span>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
