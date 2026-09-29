"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Citation, RetrievedChunk } from "@/lib/types";

type Turn = {
  role: "user" | "assistant";
  text: string;
  /** Where in `text` each citation appeared, so markers land inline. */
  marks: { at: number; citation: Citation }[];
  chunks: RetrievedChunk[];
};

export default function ChatPanel({
  notebookId,
  hasSources,
  onOpenCitation,
}: {
  notebookId: string;
  hasSources: boolean;
  onOpenCitation: (citation: Citation, chunks: RetrievedChunk[]) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;

    setInput("");
    setError(null);
    setBusy(true);
    setTurns((prev) => [
      ...prev,
      { role: "user", text: question, marks: [], chunks: [] },
      { role: "assistant", text: "", marks: [], chunks: [] },
    ]);

    const update = (fn: (t: Turn) => Turn) =>
      setTurns((prev) => prev.map((t, i) => (i === prev.length - 1 ? fn(t) : t)));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId, question }),
      });

      if (res.status === 401) {
        throw new Error("Deine Sitzung ist abgelaufen. Bitte lade die Seite neu und melde dich erneut an.");
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Anfrage fehlgeschlagen (${res.status})`);
      }
      if (!res.body) throw new Error("Keine Antwort vom Server.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Events are separated by a blank line; a partial one stays buffered.
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const raw of events) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;

          let event: { type: string; [k: string]: unknown };
          try {
            event = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }

          if (event.type === "sources") {
            update((t) => ({ ...t, chunks: event.chunks as RetrievedChunk[] }));
          } else if (event.type === "text") {
            update((t) => ({ ...t, text: t.text + (event.text as string) }));
            bottom.current?.scrollIntoView({ behavior: "smooth" });
          } else if (event.type === "citation") {
            update((t) => ({
              ...t,
              marks: [...t.marks, { at: t.text.length, citation: event.citation as Citation }],
            }));
          } else if (event.type === "error") {
            throw new Error(event.message as string);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <ScrollArea className="flex-1">
        <div className="px-6 py-6">
          {turns.length === 0 && (
            <p className="mx-auto mt-24 max-w-md text-center text-sm text-muted-foreground">
              {hasSources
                ? "Stelle eine Frage zu deinen Quellen. Jede Antwort wird ausschliesslich aus ihnen gebildet und mit Fundstellen belegt."
                : "Lade links eine Quelle hoch, dann kannst du Fragen stellen."}
            </p>
          )}

          <div className="mx-auto max-w-2xl space-y-6">
            {turns.map((turn, i) =>
              turn.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
                    {turn.text}
                  </p>
                </div>
              ) : (
                <div key={i} className="text-sm leading-relaxed">
                  <Answer turn={turn} onOpenCitation={onOpenCitation} />
                  {busy && i === turns.length - 1 && !turn.text && (
                    <span className="text-muted-foreground">Sucht in den Quellen…</span>
                  )}
                </div>
              ),
            )}
            <div ref={bottom} />
          </div>

          {error && (
            <p className="mx-auto mt-4 max-w-2xl text-sm text-destructive">{error}</p>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={send} className="border-t p-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!hasSources || busy}
            placeholder={hasSources ? "Frage an deine Quellen…" : "Erst eine Quelle hochladen"}
            className="rounded-full"
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 rounded-full"
            disabled={!hasSources || busy || !input.trim()}
            aria-label="Senden"
          >
            <Send />
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Renders the answer with a clickable marker at every citation point. */
function Answer({
  turn,
  onOpenCitation,
}: {
  turn: Turn;
  onOpenCitation: (citation: Citation, chunks: RetrievedChunk[]) => void;
}) {
  if (turn.marks.length === 0) {
    return <p className="whitespace-pre-wrap">{turn.text}</p>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  turn.marks.forEach((mark, n) => {
    const at = Math.min(mark.at, turn.text.length);
    if (at > cursor) {
      parts.push(<span key={`t${n}`}>{turn.text.slice(cursor, at)}</span>);
      cursor = at;
    }
    parts.push(
      <button
        key={`c${n}`}
        type="button"
        title={mark.citation.cited_text}
        onClick={() => onOpenCitation(mark.citation, turn.chunks)}
        className="mx-0.5 inline-flex size-4 -translate-y-px items-center justify-center rounded bg-muted align-middle text-[10px] font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        {n + 1}
      </button>,
    );
  });

  if (cursor < turn.text.length) {
    parts.push(<span key="tail">{turn.text.slice(cursor)}</span>);
  }

  return <p className="whitespace-pre-wrap">{parts}</p>;
}
