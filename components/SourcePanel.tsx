"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProject } from "@/components/ProjectContext";
import { FileText, Ellipsis } from "lucide-react";
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

interface SourceTabProps {
  source: {
    id: string;
    name: string;
    summary?: string | null;
  };
}

function SourceTab({ source }: SourceTabProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // TODO: Implement delete source functionality
      console.log("Delete source:", source.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete source:", error);
    }
  };

  return (
    <>
      <div className="w-full flex items-center gap-2 group p-2 rounded-md hover:bg-accent transition-colors">
        <FileText className="h-4 w-4" />
        <span className="text-sm flex-1 text-left font-medium">{source.name}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Source?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the source &quot;{source.name}&quot;.
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

export default function SourcePanel() {
  const { currentProject, isLoading } = useProject();

  return (
    <Card className="h-full flex flex-col overflow-hidden p-0">
      <CardContent className="flex-1 overflow-auto p-2">
        {isLoading ? (
          <div className="text-muted-foreground">Loading sources...</div>
        ) : currentProject?.sources && currentProject.sources.length > 0 ? (
          <div className="space-y-2">
            {currentProject.sources.map((source) => (
              <SourceTab key={source.id} source={source} />
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground">No sources available</div>
        )}
      </CardContent>
    </Card>
  );
}
