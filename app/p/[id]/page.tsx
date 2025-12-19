import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ProjectReport from "@/components/ProjectReport";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // Fetch sources
  const { data: sources } = await supabase
    .from("sources")
    .select("*")
    .eq("project_id", id);

  return (
    <div className="min-h-screen">
      <Header />
      <ProjectReport project={project} sources={sources || []} />
    </div>
  );
}
