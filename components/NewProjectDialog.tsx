"use client";

import { useState, useRef, useEffect } from "react";
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
import { ArrowUpIcon, Plus as IconPlus, X as XIcon, FileText, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useProjectFileUpload } from "@/hooks/use-project-file-upload";

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
  const [fileError, setFileError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [currentView, setCurrentView] = useState<"prompt" | "details">("prompt");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the custom hook for file uploads (always call the hook, even if projectId is null)
  // This follows React's Rules of Hooks - hooks must be called unconditionally
  const fileUpload = useProjectFileUpload({ projectId: projectId || '' });

  const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === MOCK_QUESTIONS.length - 1;
  const currentAnswer = answers[currentQuestionIndex] || currentQuestion?.options[0] || "";

  // Create project when dialog opens
  useEffect(() => {
    if (!open || projectId) return;

    const createProject = async () => {
      setIsCreatingProject(true);
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        setIsCreatingProject(false);
        return;
      }

      // Create project with empty prompt initially
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          prompt: '', // Will be updated when user submits
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create project:', error);
        setIsCreatingProject(false);
        return;
      }

      setProjectId(data.id);
      setIsCreatingProject(false);
    };

    createProject();
  }, [open, projectId]);

  const validateAndAddFiles = async (files: File[]) => {
    // Reset error
    setFileError("");

    // Check if project is ready
    if (!projectId) {
      setFileError("Project not ready. Please wait...");
      return false;
    }

    // Check file count (now checking against uploaded files from hook)
    if (fileUpload.uploadedFiles.length + files.length > MAX_FILES) {
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

    // Upload files immediately
    const uploadPromises = files.map(file => fileUpload.uploadFile(file));
    const results = await Promise.all(uploadPromises);

    // Check if any uploads failed
    const failedCount = results.filter(r => !r).length;
    if (failedCount > 0) {
      setFileError(`${failedCount} file(s) failed to upload`);
      return false;
    }

    return true;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await validateAndAddFiles(files);

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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await validateAndAddFiles(files);
  };

  const handleRemoveFile = async (fileId: string) => {
    const success = await fileUpload.deleteFile(fileId);
    if (!success) {
      setFileError("Failed to remove file");
    } else {
      setFileError("");
    }
  };

  const resetDialogState = () => {
    setProjectPrompt("");
    setFileError("");
    setCurrentView("prompt");
    setCurrentQuestionIndex(0);
    setAnswers({});
    setCustomInputs({});
  };

  const handleDialogClose = async (isOpen: boolean) => {
    if (!isOpen && projectId) {
      // User closed dialog without completing
      const supabase = createClient();

      // Delete all files
      if (fileUpload.uploadedFiles.length > 0) {
        await Promise.all(
          fileUpload.uploadedFiles.map(f => fileUpload.deleteFile(f.id))
        );
      }

      // Delete project (CASCADE will delete any remaining sources)
      await supabase.from('projects').delete().eq('id', projectId);

      // Reset state
      resetDialogState();
      setProjectId(null);
    }

    onOpenChange(isOpen);
  };

  const handleSendClick = () => {
    // Transition to project details view
    setCurrentView("details");
  };

  const handleNextQuestion = async () => {
    if (isLastQuestion) {
      const supabase = createClient();

      // Compile final answers with custom inputs
      const finalAnswers = Object.entries(answers).reduce((acc, [index, answer]) => {
        acc[index] = answer === "__custom__" ? customInputs[index] || "" : answer;
        return acc;
      }, {} as Record<string, string>);

      // Update project with final prompt
      if (projectId) {
        await supabase
          .from('projects')
          .update({
            prompt: projectPrompt,
          })
          .eq('id', projectId);
      }

      // Final submit
      console.log("Starting project with:", {
        projectId,
        prompt: projectPrompt,
        files: fileUpload.uploadedFiles,
        answers: finalAnswers,
      });

      resetDialogState();
      setProjectId(null); // Keep the project, don't delete
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
      onOpenChange={handleDialogClose}
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
              {isCreatingProject && (
                <div className="px-3 pb-2 text-xs text-muted-foreground">
                  Creating project...
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
                  {fileUpload.uploadedFiles.length > 0 && (
                    <div className="flex gap-1 items-center overflow-x-auto scrollbar-hide">
                      {fileUpload.uploadedFiles.map((fileInfo) => (
                        <Badge
                          key={fileInfo.id}
                          variant="secondary"
                          className={`pl-2 pr-2 group/badge cursor-pointer shrink-0 ${
                            fileInfo.status === 'uploading' ? 'opacity-50' : ''
                          } ${
                            fileInfo.status === 'error' ? 'border-destructive' : ''
                          }`}
                        >
                          <FileText className="group-hover/badge:hidden" />
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(fileInfo.id)}
                            className="hidden group-hover/badge:block cursor-pointer"
                            aria-label={`Remove ${fileInfo.name}`}
                            disabled={fileInfo.status === 'uploading'}
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                          <span className="truncate max-w-[120px]">
                            {fileInfo.name}
                            {fileInfo.status === 'uploading' && ' (uploading...)'}
                            {fileInfo.status === 'error' && ' (error)'}
                          </span>
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
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="__custom__" id="option-custom" />
                  {/* <Label htmlFor="option-custom">Other:</Label> */}
                  <Input
                    value={customInputs[currentQuestionIndex] || ""}
                    onChange={(e) => {
                      setCustomInputs(prev => ({
                        ...prev,
                        [currentQuestionIndex]: e.target.value
                      }));
                      handleAnswerChange("__custom__");
                    }}
                    onFocus={() => handleAnswerChange("__custom__")}
                    placeholder="Something else..."
                    className="flex-1 h-7 -my-2 border-none shadow-none focus-visible:border-none focus-visible:ring-0 px-0"
                  />
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button
                onClick={handleNextQuestion}
                disabled={!currentAnswer || (currentAnswer === "__custom__" && !customInputs[currentQuestionIndex]?.trim())}
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
