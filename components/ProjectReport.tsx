"use client";

import { useState, useEffect } from "react";
import { Project, Source } from "@/lib/types";
import { getFileUrl } from "@/lib/supabase/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, AlertCircle, CheckCircle } from "lucide-react";

type ReportStatus =
  | "idle"
  | "fetching-files"
  | "generating-questions"
  | "generating-report"
  | "saving"
  | "completed"
  | "error";

interface Question {
  question: string;
  options: string[];
}

interface ProjectReportProps {
  project: Project;
  sources: Source[];
}

export default function ProjectReport({ project, sources }: ProjectReportProps) {
  const [status, setStatus] = useState<ReportStatus>("idle");
  const [reportContent, setReportContent] = useState(project.report_content || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we need to generate
    if (project.report_status === "completed") {
      setStatus("completed");
      setReportContent(project.report_content || "");
      return;
    }

    if (project.report_status === "failed") {
      setStatus("error");
      setError(project.report_error || "Report generation failed");
      return;
    }

    if (project.report_status === "generating") {
      setStatus("error");
      setError("Report is still being generated. Please refresh the page in a few moments.");
      return;
    }

    // Auto-trigger generation
    generateReport();
  }, []);

  async function fetchFileFromStorage(source: Source): Promise<File | null> {
    try {
      const signedUrl = await getFileUrl(source.storage_path);
      if (!signedUrl) {
        console.warn(`Failed to get signed URL for ${source.name}`);
        return null;
      }

      const response = await fetch(signedUrl);
      if (!response.ok) {
        console.warn(`Failed to fetch file ${source.name}`);
        return null;
      }

      const blob = await response.blob();
      return new File([blob], source.name, {
        type: blob.type || "application/octet-stream",
      });
    } catch (err) {
      console.error(`Error fetching file ${source.name}:`, err);
      return null;
    }
  }

  async function fetchFilesFromStorage(sources: Source[]): Promise<File[]> {
    const filePromises = sources.map((source) => fetchFileFromStorage(source));
    const files = await Promise.all(filePromises);
    return files.filter((file): file is File => file !== null);
  }

  async function fetchQuestions(prompt: string, files: File[]): Promise<Question[]> {
    const formData = new FormData();
    formData.append("prompt", prompt);
    files.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/details", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to generate questions: ${response.status}`);
    }

    const data = await response.json();

    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error("Invalid response format from server");
    }

    return data.questions;
  }

  async function streamReport(
    projectId: string,
    prompt: string,
    files: File[],
    questions: Question[]
  ): Promise<string> {
    // Generate default answers (first option from each question)
    const answers = questions.reduce((acc, q, i) => {
      acc[i.toString()] = q.options[0] || "";
      return acc;
    }, {} as Record<string, string>);

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("prompt", prompt);
    files.forEach((file) => formData.append("files", file));
    formData.append("questions", JSON.stringify(questions));
    formData.append("answers", JSON.stringify(answers));

    const response = await fetch("/api/report", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Report generation failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      setReportContent(fullText);
    }

    return fullText;
  }

  async function saveReport(projectId: string, content: string) {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_content: content,
        report_status: "completed",
        report_generated_at: new Date().toISOString(),
      }),
    });
  }

  async function saveError(projectId: string, errorMessage: string) {
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_status: "failed",
          report_error: errorMessage,
        }),
      });
    } catch (err) {
      console.error("Failed to save error to database:", err);
    }
  }

  async function generateReport() {
    try {
      // 1. Fetch files from storage
      setStatus("fetching-files");
      const files = await fetchFilesFromStorage(sources);

      if (sources.length > 0 && files.length === 0) {
        throw new Error("All files could not be loaded from storage");
      }

      // 2. Generate questions
      setStatus("generating-questions");
      const questions = await fetchQuestions(project.prompt, files);

      // 3. Stream report generation
      setStatus("generating-report");
      const content = await streamReport(project.id, project.prompt, files, questions);

      // 4. Save report
      setStatus("saving");
      await saveReport(project.id, content);

      setStatus("completed");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setStatus("error");
      setError(errorMessage);

      // Save error to database
      await saveError(project.id, errorMessage);
    }
  }

  async function handleRetry() {
    setError(null);
    setReportContent("");
    await generateReport();
  }

  function renderStatusMessage() {
    switch (status) {
      case "fetching-files":
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Preparing your files...</span>
          </div>
        );
      case "generating-questions":
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analyzing your project...</span>
          </div>
        );
      case "generating-report":
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating report...</span>
          </div>
        );
      case "saving":
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </div>
        );
      case "completed":
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Report completed</span>
            {project.report_generated_at && (
              <span className="text-xs text-muted-foreground ml-2">
                {new Date(project.report_generated_at).toLocaleString()}
              </span>
            )}
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Error: {error}</span>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {(reportContent || status === "generating-report") && (
        <Card>
          <CardHeader>
            <CardTitle>Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {reportContent}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
