import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/chunk";

export const maxDuration = 60;

/**
 * Stores one source: split into chunks, embed them all in a single call, save.
 *
 * Runs on the Next.js server rather than in the browser so the chunking rules
 * and the database writes stay in one place. Row level security still applies,
 * because the Supabase client here carries the user's own session.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { notebookId, title, kind, content } = await request.json();
  if (!notebookId || !title || !content?.trim()) {
    return NextResponse.json(
      { error: "notebookId, title und content sind Pflicht." },
      { status: 400 },
    );
  }

  const pieces = chunkText(content);
  if (pieces.length === 0) {
    return NextResponse.json(
      { error: "Aus dieser Quelle liess sich kein Text lesen." },
      { status: 400 },
    );
  }

  // One round trip for the whole document.
  const { data: embedded, error: embedError } = await supabase.functions.invoke(
    "embed",
    { body: { texts: pieces } },
  );
  if (embedError || !embedded?.embeddings) {
    console.error("embed failed", embedError);
    return NextResponse.json(
      { error: "Die Quelle konnte nicht eingebettet werden." },
      { status: 502 },
    );
  }

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .insert({ notebook_id: notebookId, title, kind: kind ?? "text", content })
    .select("id")
    .single();
  if (sourceError) {
    console.error("insert source failed", sourceError);
    return NextResponse.json({ error: sourceError.message }, { status: 400 });
  }

  const { error: chunkError } = await supabase.from("chunks").insert(
    pieces.map((text, idx) => ({
      source_id: source.id,
      notebook_id: notebookId,
      idx,
      content: text,
      embedding: embedded.embeddings[idx],
    })),
  );
  if (chunkError) {
    console.error("insert chunks failed", chunkError);
    return NextResponse.json({ error: chunkError.message }, { status: 400 });
  }

  return NextResponse.json({ sourceId: source.id, chunks: pieces.length });
}
