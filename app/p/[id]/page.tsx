"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import { useProject } from "@/components/ProjectContext";

export default function ProjectPage() {
  const params = useParams();
  const id = params.id as string;
  const { currentProject, getProjectData, isLoading, error } = useProject();

  useEffect(() => {
    if (id) {
      getProjectData(id).catch((err) => {
        console.error('Error fetching project data:', err);
      });
    }
  }, [id, getProjectData]);

  const report = currentProject?.report || "";

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {isLoading && <div>Loading...</div>}
          {error && <div className="text-destructive">Error: {error}</div>}
          {!isLoading && !error && (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap">{report}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
