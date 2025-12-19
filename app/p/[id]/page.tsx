export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Project {id}</h1>
      <p className="text-muted-foreground">Project details will go here</p>
    </div>
  );
}
