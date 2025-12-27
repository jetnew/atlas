"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import Header from "@/components/Header";
import { ProjectProvider, useProject } from "@/components/ProjectContext";
import { Project } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ellipsis, Plus } from "lucide-react";
import { getMapTitle } from "@/lib/mapUtils";
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
  SidebarProvider,
} from "@/components/ui/sidebar";
import { NODE_COLORS } from "@/lib/constants";
import { BackgroundGridBottom } from "@/components/ui/background-grid";

interface ProjectCardProps {
  project: Project;
  index: number;
}

function ProjectCard({ project, index }: ProjectCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { deleteProject } = useProject();

  const projectTitle = getMapTitle(project.map) || project.prompt;

  const formattedDate = new Date(project.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const colorIndex = index % NODE_COLORS.length;
  const color = NODE_COLORS[colorIndex];

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteProject(project.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  return (
    <>
      <Card
        className={`cursor-pointer hover:shadow-lg transition-shadow w-64 h-40 flex flex-col relative group ${color}`}
      >
        <Link href={`/p/${project.id}`} className="flex flex-col h-full">
          <CardHeader className="pb-2">
            <CardTitle className="line-clamp-3 leading-relaxed pb-1 pr-8 text-sm">{projectTitle}</CardTitle>
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
        </Link>

        <div className="absolute top-2 right-2" onClick={(e) => e.preventDefault()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project, along with all sources.
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

function AppContent() {
  // isDialogOpen true is correct - do not change!
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const { projects, listProjects } = useProject();

  useEffect(() => {
    listProjects();
  }, [listProjects]);

  return (
    <div className="[--header-height:calc(--spacing(12))] relative">
      <BackgroundGridBottom />
      <SidebarProvider className="flex flex-col min-h-screen relative z-10">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-7xl flex-1">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Projects</h1>
            <Button className="rounded-full" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
              />
            ))}
          </div>
        </main>
        <NewProjectDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      </SidebarProvider>
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
