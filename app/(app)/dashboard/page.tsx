import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";

export const dynamic = "force-dynamic";

/** A project is "Complete" once all discovery categories are captured (100%). */
function statusBadge(completeness: number, status: string) {
  if (completeness >= 100 || status === "exported") {
    return { label: status === "exported" ? "Exported" : "Complete", cls: "border-accent/50 text-accent" };
  }
  return { label: "Draft", cls: "border-line text-ink-3" };
}

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
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="card block transition-colors hover:border-ink-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{p.client_name}</div>
                    <div className="text-sm text-ink-3">{p.industry || "—"}</div>
                  </div>
                  <span className="mono text-xs text-ink-3">{p.completeness}%</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs">
                  {(() => {
                    const b = statusBadge(p.completeness, p.status);
                    return <span className={`rounded-full border px-2 py-0.5 font-medium ${b.cls}`}>{b.label}</span>;
                  })()}
                  <span className="text-ink-4">{new Date(p.updated_at).toLocaleDateString()}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
