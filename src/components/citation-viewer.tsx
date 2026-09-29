"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Citation, RetrievedChunk } from "@/lib/types";

/**
 * Shows the passage a citation points at, with the exact cited range marked.
 * The offsets come from Claude as character indices into the chunk we sent,
 * so the highlight is exact — not a text search that might match twice.
 */
export default function CitationViewer({
  citation,
  chunk,
  onClose,
}: {
  citation: Citation;
  chunk: RetrievedChunk;
  onClose: () => void;
}) {
  const start = citation.start_char_index ?? 0;
  const end = citation.end_char_index ?? chunk.content.length;

  return (
    <aside data-testid="citation-viewer" className="flex h-full w-96 shrink-0 flex-col border-l">
      <header className="flex items-start justify-between gap-2 border-b p-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Fundstelle
          </p>
          <p className="truncate text-sm font-medium">{chunk.sourceTitle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Abschnitt {chunk.idx + 1} · Ähnlichkeit {(chunk.similarity * 100).toFixed(0)}%
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Schliessen">
          <X />
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <p className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-muted-foreground">
          {chunk.content.slice(0, start)}
          <mark data-testid="cited-text" className="rounded bg-yellow-200 px-0.5 font-medium text-neutral-900 dark:bg-yellow-500/30 dark:text-neutral-50">
            {chunk.content.slice(start, end)}
          </mark>
          {chunk.content.slice(end)}
        </p>
      </ScrollArea>
    </aside>
  );
}
