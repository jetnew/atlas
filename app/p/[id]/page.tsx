"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import { useProject } from "@/components/ProjectContext";
import { useCompletion } from "@ai-sdk/react";
import { Streamdown } from "streamdown";

export default function ProjectPage() {
  const params = useParams();
  const id = params.id as string;
  const { isLoading, error, getProjectData, currentProject } = useProject();

  const { completion: report, complete: generateReport, isLoading: isGenerating } = useCompletion({
    api: '/api/report',
  })

  useEffect(() => {
    if (id) {
      getProjectData(id);
    }
  }, [id, getProjectData]);

  useEffect(() => {
    if (currentProject && !currentProject.report) {
      generateReport("", {
        body: {
          projectId: id,
        }
      });
    }
  }, [currentProject, id, generateReport]);

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {isLoading && <div>Loading...</div>}
          {error && <div className="text-destructive">Error: {error}</div>}
          {!isLoading && !error && (
            <Streamdown isAnimating={isGenerating}>
              {currentProject?.report || report}
            </Streamdown>
          )}
        </div>
      </div>
    </div>
  );
}
