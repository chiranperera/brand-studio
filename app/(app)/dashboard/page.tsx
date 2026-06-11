import { createClient } from "@/lib/supabase/server";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import { ProjectCard } from "@/components/projects/ProjectCard";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, client_name, industry, status, completeness, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-ink-3">Run a discovery session, then export a Design Pack.</p>
        </div>
        <NewProjectDialog />
      </div>

      {!projects?.length ? (
        <div className="card text-center text-ink-3">
          No projects yet. Create your first one to start a discovery session.
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-ink-4">Tip: right-click a project for options (open, export, delete).</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <ProjectCard p={p} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
