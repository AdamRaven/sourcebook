import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Workspace from "@/components/workspace";
import type { Citation, RetrievedChunk, Source } from "@/lib/types";
import type { Turn } from "@/components/chat-panel";

type StoredMessage = {
  role: string;
  content: string;
  citations: { marks?: { at: number; citation: Citation }[]; chunks?: RetrievedChunk[] } | null;
};

/** Rebuilds the conversation the client renders from what was stored. */
function toTurns(rows: StoredMessage[]): Turn[] {
  return rows.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    text: m.content,
    marks: m.citations?.marks ?? [],
    chunks: m.citations?.chunks ?? [],
  }));
}

export default async function NotebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [notebook, sources, messages] = await Promise.all([
    supabase.from("notebooks").select("id, title").eq("id", id).single(),
    supabase.from("sources").select("*").eq("notebook_id", id).order("created_at"),
    supabase
      .from("messages")
      .select("role, content, citations")
      .eq("notebook_id", id)
      .order("created_at"),
  ]);

  // RLS turns "someone else's notebook" into "no rows", which is the same
  // answer as "does not exist" — exactly what we want to tell the client.
  if (notebook.error || !notebook.data) notFound();

  return (
    <Workspace
      notebookId={id}
      title={notebook.data.title}
      sources={(sources.data ?? []) as Source[]}
      history={toTurns(messages.data ?? [])}
    />
  );
}
