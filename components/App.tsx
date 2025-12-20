"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import Header from "@/components/Header";
import { ProjectProvider, useProject } from "@/components/ProjectContext";
import { Project } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

interface ProjectCardProps {
  project: Project;
}

function ProjectCard({ project }: ProjectCardProps) {
  const formattedDate = new Date(project.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <Link href={`/p/${project.id}`}>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow w-64 h-48 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-2 leading-relaxed pb-1">{project.prompt}</CardTitle>
        </CardHeader>
        <CardContent className="grow">
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-xs text-muted-foreground">
            {formattedDate}
          </p>
          {project.sources && project.sources.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {project.sources.length} {project.sources.length === 1 ? 'source' : 'sources'}
            </p>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}

function AppContent() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { projects, listProjects } = useProject();

  useEffect(() => {
    listProjects();
  }, [listProjects]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
            />
          ))}
        </div>
      </main>
      <NewProjectDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}
