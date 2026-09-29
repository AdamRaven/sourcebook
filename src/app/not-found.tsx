import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold">Nicht gefunden</h1>
        <p className="text-muted-foreground">
          Diese Seite gibt es nicht — oder das Notebook gehört jemand anderem.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Zur Übersicht
        </Link>
      </div>
    </main>
  );
}
