"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();
      const { data, error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (error) {
        setError(error.message);
        return;
      }

      // Sign-up only returns a session when e-mail confirmation is switched
      // off. With it on, the account exists but cannot be used yet — say so
      // rather than redirecting into a wall.
      if (!data.session) {
        setNotice(
          "Konto angelegt. Bestätige zuerst die E-Mail, die Supabase dir geschickt hat.",
        );
        setMode("signin");
        return;
      }

      // The proxy reads the session from cookies, so a refresh is enough.
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      // Runs on every path, so the button can never stay stuck on "Moment…".
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sourcebook</CardTitle>
          <CardDescription>
            Stelle Fragen an deine eigenen Dokumente. Jede Antwort wird belegt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input
              type="email"
              required
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              required
              minLength={6}
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}
            {notice && (
              <p className="text-sm text-muted-foreground">{notice}</p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Moment…" : mode === "signin" ? "Anmelden" : "Konto anlegen"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "Noch kein Konto? Registrieren"
                : "Schon registriert? Anmelden"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
