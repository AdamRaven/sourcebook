"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import SourcePanel from "@/components/source-panel";
import ChatPanel, { type Turn } from "@/components/chat-panel";
import CitationViewer from "@/components/citation-viewer";
import { renameNotebook } from "@/app/actions";
import type { Citation, RetrievedChunk, Source } from "@/lib/types";

export default function Workspace({
  notebookId,
  title: initialTitle,
  sources,
  history,
}: {
  notebookId: string;
  title: string;
  sources: Source[];
  history: Turn[];
}) {
  const [title, setTitle] = useState(initialTitle);
  const [open, setOpen] = useState<{ citation: Citation; chunk: RetrievedChunk } | null>(null);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <Link
          href="/"
          aria-label="Zurück zur Übersicht"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => renameNotebook(notebookId, title)}
          className="h-8 border-none px-1 text-sm font-medium shadow-none focus-visible:ring-0"
        />
      </header>

      <div className="flex min-h-0 flex-1">
        <SourcePanel notebookId={notebookId} sources={sources} />
        <ChatPanel
          notebookId={notebookId}
          hasSources={sources.length > 0}
          history={history}
          onOpenCitation={(citation, chunks) => {
            const chunk = chunks[citation.document_index];
            if (chunk) setOpen({ citation, chunk });
          }}
        />
        {open && (
          <CitationViewer
            citation={open.citation}
            chunk={open.chunk}
            onClose={() => setOpen(null)}
          />
        )}
      </div>
    </div>
  );
}
