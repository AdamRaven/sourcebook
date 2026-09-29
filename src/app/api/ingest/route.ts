import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/chunk";
import { firstError, ingestSchema } from "@/lib/schemas";

export const maxDuration = 60;

/**
 * Stores one source: split into chunks, embed them all in a single call, save.
 *
 * Runs on the Next.js server so the chunking rules and the database writes
 * stay in one place. Row level security still applies, because the Supabase
 * client here carries the user's own session rather than a service key.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = ingestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  }
  const { notebookId, title, kind, content } = parsed.data;

  const pieces = chunkText(content);
  if (pieces.length === 0) {
    return NextResponse.json(
      { error: "Aus dieser Quelle liess sich kein Text lesen." },
      { status: 400 },
    );
  }

  // One round trip for the whole document, not one per chunk.
  const { data: embedded, error: embedError } = await supabase.functions.invoke(
    "embed",
    { body: { texts: pieces } },
  );
  if (embedError || !embedded?.embeddings) {
    console.error("embed failed", embedError);
    return NextResponse.json(
      { error: "Die Quelle konnte nicht verarbeitet werden. Bitte versuche es erneut." },
      { status: 502 },
    );
  }

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .insert({ notebook_id: notebookId, title, kind, content })
    .select("id")
    .single();
  if (sourceError) {
    console.error("insert source failed", sourceError);
    return NextResponse.json(
      { error: "Die Quelle konnte nicht gespeichert werden." },
      { status: 400 },
    );
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
    // The source row without its chunks would be a source you cannot search.
    await supabase.from("sources").delete().eq("id", source.id);
    return NextResponse.json(
      { error: "Die Quelle konnte nicht durchsuchbar gemacht werden." },
      { status: 400 },
    );
  }

  return NextResponse.json({ sourceId: source.id, chunks: pieces.length });
}
