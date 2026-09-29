import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createNotebook, signOut } from "./actions";
import type { Notebook } from "@/lib/types";

// A server component: the list is fetched on the server with the user's own
// session, so row level security does the filtering and no notebook that is
// not theirs ever reaches the browser.
export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notebooks")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });

  const notebooks = (data ?? []) as Notebook[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Sourcebook</h1>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">Abmelden</Button>
        </form>
      </header>

      <form action={createNotebook} className="mb-6">
        <Button type="submit">
          <Plus /> Neues Notebook
        </Button>
      </form>

      {notebooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Noch nichts da. Lege dein erstes Notebook an.
        </p>
      ) : (
        <ul className="space-y-2">
          {notebooks.map((n) => (
            <li key={n.id}>
              <Link
                href={`/notebook/${n.id}`}
                data-testid="notebook-link"
                className="flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent"
              >
                <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm font-medium">{n.title}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString("de-DE")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
