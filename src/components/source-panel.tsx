"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, Type, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { deleteSource } from "@/app/actions";
import { extractPdfText } from "@/lib/pdf";
import { MAX_FILE_BYTES, formatBytes } from "@/lib/limits";
import type { Source } from "@/lib/types";

export default function SourcePanel({
  notebookId,
  sources,
}: {
  notebookId: string;
  sources: Source[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function ingest(title: string, kind: Source["kind"], content: string) {
    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notebookId, title, kind, content }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Hochladen fehlgeschlagen");
    return body as { chunks: number };
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      // Checked before reading: parsing a huge PDF freezes the tab long before
      // the server would ever get a chance to reject it.
      if (file.size > MAX_FILE_BYTES) {
        toast.error(file.name, {
          description: `Die Datei ist ${formatBytes(file.size)} gross. Erlaubt sind ${formatBytes(MAX_FILE_BYTES)}.`,
        });
        continue;
      }
      setBusy(`${file.name} wird gelesen…`);
      try {
        const content =
          file.type === "application/pdf"
            ? await extractPdfText(file)
            : await file.text();
        setBusy(`${file.name} wird verarbeitet…`);
        const { chunks } = await ingest(
          file.name,
          file.type === "application/pdf" ? "pdf" : "text",
          content,
        );
        toast.success(`${file.name} hinzugefügt`, {
          description: `${chunks} Abschnitte durchsuchbar`,
        });
      } catch (err) {
        toast.error(file.name, {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    }
    setBusy(null);
    if (fileInput.current) fileInput.current.value = "";
    router.refresh();
  }

  async function addPasted() {
    if (!pasteText.trim()) return;
    setBusy("Text wird verarbeitet…");
    try {
      const { chunks } = await ingest(
        pasteTitle.trim() || "Eingefügter Text",
        "text",
        pasteText,
      );
      toast.success("Text hinzugefügt", { description: `${chunks} Abschnitte` });
      setPasteTitle("");
      setPasteText("");
      setPasting(false);
      router.refresh();
    } catch (err) {
      toast.error("Fehlgeschlagen", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
    setBusy(null);
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r">
      <header className="border-b p-4">
        <h2 className="text-sm font-semibold">Quellen</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {sources.length === 0 ? "Noch keine" : `${sources.length} im Notebook`}
        </p>
      </header>

      <div className="space-y-2 border-b p-4">
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          variant="outline"
          className="w-full border-dashed"
          disabled={!!busy}
          onClick={() => fileInput.current?.click()}
        >
          <Upload /> PDF oder Textdatei
        </Button>

        {pasting ? (
          <div className="space-y-2">
            <Input
              placeholder="Titel"
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
            />
            <Textarea
              placeholder="Text hier einfügen…"
              rows={5}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={!!busy} onClick={addPasted}>
                Hinzufügen
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPasting(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setPasting(true)}
          >
            <Type /> Text einfügen
          </Button>
        )}

        {busy && <p className="text-xs text-muted-foreground">{busy}</p>}
      </div>

      <ScrollArea className="flex-1">
        <ul className="p-2">
          {sources.map((s) => (
            <li
              key={s.id}
              data-testid="source-item"
              className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-xs" title={s.title}>
                {s.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 opacity-0 group-hover:opacity-100"
                aria-label="Quelle entfernen"
                onClick={() =>
                  startTransition(async () => {
                    await deleteSource(s.id, notebookId);
                    router.refresh();
                  })
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </aside>
  );
}
