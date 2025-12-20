"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadFileToStorage, generateStoragePath, deleteFileFromStorage } from "@/lib/supabase/storage";
import { Project, Question } from "@/lib/types";

interface ProjectContextType {
    currentProject: Project | null;
    projects: Project[];
    isLoading: boolean;
    error: string | null;
    report: string | null;
    createProject: (
        prompt: string,
        files: File[],
        questions: Question[],
        answers: Record<string, string>,
        summaries: Record<string, string | null>
    ) => Promise<string | null>;
    getProjectData: (id: string) => Promise<void>;
    listProjects: () => Promise<void>;
    updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    setCurrentProject: (project: Project | null) => void;
    clearCurrentProject: () => void;
    uploadFilesToProject: (projectId: string, files: File[]) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const listProjects = useCallback(async () => {
        setError(null);
        setIsLoading(true);

        try {
            const supabase = createClient();

            // Get authenticated user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                throw new Error("You must be logged in to list projects");
            }

            // Fetch all projects for the user
            const { data: projectsData, error: projectsError } = await supabase
                .from("projects")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (projectsError) {
                throw new Error(`Failed to fetch projects: ${projectsError.message}`);
            }

            // Fetch sources for all projects
            const projectIds = (projectsData || []).map(p => p.id);
            const { data: allSources } = await supabase
                .from("sources")
                .select("*")
                .in("project_id", projectIds)
                .order("created_at", { ascending: true });

            // Map sources to projects
            const projectsWithSources: Project[] = (projectsData || []).map(project => ({
                ...project,
                sources: (allSources || []).filter(s => s.project_id === project.id),
            }));

            setProjects(projectsWithSources);
        } catch (err) {
            console.error("Error listing projects:", err);
            const errorMessage =
                err instanceof Error ? err.message : "Failed to list projects.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createProject = useCallback(
        async (
            prompt: string,
            files: File[],
            questions: Question[],
            answers: Record<string, string>,
            summaries: Record<string, string | null>
        ): Promise<string | null> => {
            setError(null);
            setIsLoading(true);

            try {
                const supabase = createClient();

                // Step 1: Get authenticated user
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) {
                    throw new Error("You must be logged in to create a project");
                }

                const userId = user.id;

                // Step 2: Create project record with prompt, questions, and answers
                const { data: projectData, error: projectError } = await supabase
                    .from("projects")
                    .insert({
                        user_id: userId,
                        prompt: prompt,
                        questions: questions,
                        answers: answers,
                    })
                    .select()
                    .single();

                if (projectError || !projectData) {
                    console.error("Project creation error:", projectError);
                    throw new Error("Failed to create project. Please try again.");
                }

                const projectId = projectData.id;

                // Step 3: Upload files in parallel (if any)
                if (files.length > 0) {
                    const uploadPromises = files.map(async (file) => {
                        const storagePath = generateStoragePath(userId, projectId, file.name);

                        // Upload to storage
                        const uploadResult = await uploadFileToStorage(file, storagePath);
                        if (!uploadResult.success) {
                            console.error(`Failed to upload ${file.name}:`, uploadResult.error);
                            return null; // Continue with other files
                        }

                        // Get summary for this file (if available)
                        const summary = summaries[file.name] || null;

                        // Create source record with summary
                        const { error: sourceError } = await supabase.from("sources").insert({
                            user_id: userId,
                            name: file.name,
                            project_id: projectId,
                            storage_path: storagePath,
                            summary: summary,
                        });

                        if (sourceError) {
                            console.error(`Failed to create source for ${file.name}:`, sourceError);
                            return null; // Continue with other files
                        }

                        return storagePath;
                    });

                    await Promise.all(uploadPromises);
                }

                // Step 4: Refresh projects list
                await listProjects();

                return projectId;
            } catch (err) {
                console.error("Error creating project:", err);
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to create project. Please try again.";
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [listProjects]
    );

    const getProjectData = useCallback(async (id: string) => {
        setError(null);
        setIsLoading(true);

        try {
            const supabase = createClient();

            // Fetch project data
            const { data: project, error: projectError } = await supabase
                .from("projects")
                .select("*")
                .eq("id", id)
                .single();

            if (projectError) {
                throw new Error(`Failed to fetch project: ${projectError.message}`);
            }

            if (!project) {
                throw new Error("Project not found");
            }

            // Fetch sources (files) for this project
            const { data: sources, error: sourcesError } = await supabase
                .from("sources")
                .select("*")
                .eq("project_id", id)
                .order("created_at", { ascending: true });

            if (sourcesError) {
                console.error("Error fetching sources:", sourcesError);
                // Don't throw - files are optional
            }

            const projectWithSources: Project = {
                ...project,
                sources: sources || [],
            };

            setCurrentProject(projectWithSources);
        } catch (err) {
            console.error("Error fetching project data:", err);
            const errorMessage =
                err instanceof Error ? err.message : "Failed to fetch project data.";
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
        setError(null);
        setIsLoading(true);

        try {
            const supabase = createClient();

            const { data: updatedProject, error: updateError } = await supabase
                .from("projects")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (updateError || !updatedProject) {
                throw new Error(`Failed to update project: ${updateError?.message || "Unknown error"}`);
            }

            // Update current project if it's the one being updated
            if (currentProject && currentProject.id === id) {
                const { data: sources } = await supabase
                    .from("sources")
                    .select("*")
                    .eq("project_id", id)
                    .order("created_at", { ascending: true });

                setCurrentProject({
                    ...updatedProject,
                    sources: sources || [],
                });
            }

            // Update projects list
            setProjects((prev) =>
                prev.map((p) => (p.id === id ? { ...p, ...updatedProject } : p))
            );
        } catch (err) {
            console.error("Error updating project:", err);
            const errorMessage =
                err instanceof Error ? err.message : "Failed to update project.";
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [currentProject]);

    const handleSetCurrentProject = useCallback((project: Project | null) => {
        setCurrentProject(project);
    }, []);

    const handleClearCurrentProject = useCallback(() => {
        setCurrentProject(null);
    }, []);

    const deleteProject = useCallback(async (id: string) => {
        setError(null);
        setIsLoading(true);

        try {
            const supabase = createClient();

            // Step 1: Get all sources for this project
            const { data: sources, error: sourcesError } = await supabase
                .from("sources")
                .select("storage_path")
                .eq("project_id", id);

            if (sourcesError) {
                console.error("Error fetching sources for deletion:", sourcesError);
                throw new Error(`Failed to fetch sources: ${sourcesError.message}`);
            }

            // Step 2: Delete all files from storage
            if (sources && sources.length > 0) {
                const deletePromises = sources.map(async (source) => {
                    if (source.storage_path) {
                        const result = await deleteFileFromStorage(source.storage_path);
                        if (!result.success) {
                            console.error(`Failed to delete file ${source.storage_path}:`, result.error);
                            // Continue with other deletions even if one fails
                        }
                    }
                });

                await Promise.all(deletePromises);
            }

            // Step 3: Delete all source records (cascade will handle this, but being explicit)
            const { error: deleteSourcesError } = await supabase
                .from("sources")
                .delete()
                .eq("project_id", id);

            if (deleteSourcesError) {
                console.error("Error deleting sources:", deleteSourcesError);
                throw new Error(`Failed to delete sources: ${deleteSourcesError.message}`);
            }

            // Step 4: Delete the project record
            const { error: deleteProjectError } = await supabase
                .from("projects")
                .delete()
                .eq("id", id);

            if (deleteProjectError) {
                throw new Error(`Failed to delete project: ${deleteProjectError.message}`);
            }

            // Step 5: Update local state
            setProjects((prev) => prev.filter((p) => p.id !== id));

            // Clear current project if it's the one being deleted
            if (currentProject && currentProject.id === id) {
                setCurrentProject(null);
            }
        } catch (err) {
            console.error("Error deleting project:", err);
            const errorMessage =
                err instanceof Error ? err.message : "Failed to delete project.";
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [currentProject]);

    const uploadFilesToProject = useCallback(async (projectId: string, files: File[]) => {
        setError(null);
        setIsLoading(true);

        try {
            const supabase = createClient();

            // Get authenticated user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                throw new Error("You must be logged in to upload files");
            }

            const userId = user.id;

            // Upload files in parallel
            const uploadPromises = files.map(async (file) => {
                const storagePath = generateStoragePath(userId, projectId, file.name);

                // Upload to storage
                const uploadResult = await uploadFileToStorage(file, storagePath);
                if (!uploadResult.success) {
                    console.error(`Failed to upload ${file.name}:`, uploadResult.error);
                    return null;
                }

                // Create source record (no summary for drag-and-drop uploads)
                const { error: sourceError } = await supabase.from("sources").insert({
                    user_id: userId,
                    name: file.name,
                    project_id: projectId,
                    storage_path: storagePath,
                    summary: null,
                });

                if (sourceError) {
                    console.error(`Failed to create source for ${file.name}:`, sourceError);
                    return null;
                }

                return storagePath;
            });

            await Promise.all(uploadPromises);

            // Refresh current project data to show new sources
            await getProjectData(projectId);
        } catch (err) {
            console.error("Error uploading files:", err);
            const errorMessage =
                err instanceof Error ? err.message : "Failed to upload files.";
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getProjectData]);

    return (
        <ProjectContext.Provider
            value={{
                currentProject,
                projects,
                isLoading,
                error,
                report: currentProject?.report || null,
                createProject,
                getProjectData,
                listProjects,
                updateProject,
                deleteProject,
                setCurrentProject: handleSetCurrentProject,
                clearCurrentProject: handleClearCurrentProject,
                uploadFilesToProject,
            }}
        >
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error("useProject must be used within a ProjectProvider");
    }
    return context;
}

