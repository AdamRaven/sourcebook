import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatSchema, firstError } from "@/lib/schemas";
import { MAX_QUESTIONS_PER_HOUR } from "@/lib/limits";
import type { Citation, RetrievedChunk } from "@/lib/types";

export const maxDuration = 60;

const MATCH_COUNT = 8;

const SYSTEM = `Du bist der Rechercheassistent von Sourcebook.

Beantworte die Frage ausschliesslich aus den beigefuegten Quellen.
Wenn die Quellen die Frage nicht beantworten, sage das klar und rate nicht.
Erfinde niemals Zahlen, Namen oder Zitate.
Antworte in der Sprache, in der gefragt wurde, und fasse dich kurz.`;

/**
 * Answers a question using only the sources of one notebook.
 *
 * The interesting part is how citations work. Instead of asking the model to
 * write "[1]" and then parsing that back out of prose, every retrieved chunk
 * is handed to Claude as its own document with citations enabled. Claude then
 * returns citations as structured data: which document, and which character
 * range inside it. That range is what the UI highlights, so a citation cannot
 * point at the wrong place.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = chatSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  }
  const { notebookId, question } = parsed.data;

  // There is a paid API behind this. Row level security means this count only
  // ever sees this user's own messages, so it is a per-user budget.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", since);

  if ((count ?? 0) >= MAX_QUESTIONS_PER_HOUR) {
    return NextResponse.json(
      {
        error: `Du hast das Stundenlimit von ${MAX_QUESTIONS_PER_HOUR} Fragen erreicht. Bitte versuche es später noch einmal.`,
      },
      { status: 429 },
    );
  }

  // 1. Put the question into the same vector space as the chunks.
  const { data: embedded, error: embedError } = await supabase.functions.invoke(
    "embed",
    { body: { texts: [question] } },
  );
  if (embedError || !embedded?.embeddings?.[0]) {
    console.error("embed failed", embedError);
    return NextResponse.json(
      { error: "Die Frage konnte nicht verarbeitet werden." },
      { status: 502 },
    );
  }

  // 2. Nearest neighbours inside this notebook. RLS keeps it to this user.
  const { data: rows, error } = await supabase.rpc("match_chunks", {
    query_embedding: embedded.embeddings[0],
    target_notebook: notebookId,
    match_count: MATCH_COUNT,
  });
  if (error) {
    console.error("match_chunks failed", error);
    return NextResponse.json({ error: "Die Suche ist fehlgeschlagen." }, { status: 400 });
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { error: "Dieses Notebook hat noch keine Quellen." },
      { status: 400 },
    );
  }

  const chunks: RetrievedChunk[] = rows.map((r: Record<string, unknown>) => ({
    id: r.id as number,
    sourceId: r.source_id as string,
    sourceTitle: r.source_title as string,
    idx: r.idx as number,
    content: r.content as string,
    similarity: r.similarity as number,
  }));

  await supabase.from("messages").insert({
    notebook_id: notebookId,
    role: "user",
    content: question,
  });

  // 3. Each chunk becomes its own citable document. The order here is exactly
  //    what Claude's document_index refers to, and the client gets it too.
  const documents = chunks.map((c) => ({
    type: "document" as const,
    source: { type: "text" as const, media_type: "text/plain" as const, data: c.content },
    title: c.sourceTitle,
    citations: { enabled: true },
  }));

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const claude = anthropic.messages.stream({
    model: "claude-opus-5",
    max_tokens: 8192,
    // Grounded question answering does not need deep reasoning, and a chat
    // should feel immediate. Low effort keeps thinking on but brief.
    output_config: { effort: "low" },
    system: SYSTEM,
    messages: [
      { role: "user", content: [...documents, { type: "text", text: question }] },
    ],
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      // The client needs the chunk list to resolve a citation to its source.
      send({ type: "sources", chunks });

      let answer = "";
      // Where each citation appeared in the answer. Recording it here means a
      // reloaded conversation can put the markers back in the same places.
      const marks: { at: number; citation: Citation }[] = [];

      try {
        for await (const event of claude) {
          if (event.type !== "content_block_delta") continue;
          if (event.delta.type === "text_delta") {
            answer += event.delta.text;
            send({ type: "text", text: event.delta.text });
          } else if (event.delta.type === "citations_delta") {
            marks.push({ at: answer.length, citation: event.delta.citation as Citation });
            send({ type: "citation", citation: event.delta.citation });
          }
        }
        send({ type: "done" });
      } catch (err) {
        console.error("claude stream failed", err);
        send({
          type: "error",
          message: "Die Antwort wurde unterbrochen. Bitte versuche es erneut.",
        });
      }

      // Persist whatever was produced, so a reload does not lose the thread.
      if (answer.trim()) {
        await supabase.from("messages").insert({
          notebook_id: notebookId,
          role: "assistant",
          content: answer,
          citations: { marks, chunks },
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
