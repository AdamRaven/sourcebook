import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Workspace from "@/components/workspace";
import type { Source } from "@/lib/types";

export default async function NotebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [notebook, sources] = await Promise.all([
    supabase.from("notebooks").select("id, title").eq("id", id).single(),
    supabase.from("sources").select("*").eq("notebook_id", id).order("created_at"),
  ]);

  // RLS turns "someone else's notebook" into "no rows", which is the same
  // answer as "does not exist" — exactly what we want to tell the client.
  if (notebook.error || !notebook.data) notFound();

  return (
    <Workspace
      notebookId={id}
      title={notebook.data.title}
      sources={(sources.data ?? []) as Source[]}
    />
  );
}
