"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set when the account exists but still needs an e-mail confirmation. */
  const [awaitingConfirm, setAwaitingConfirm] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (error) {
        setError(friendlyAuthError(error.message));
        return;
      }

      // Sign-up only returns a session when confirmation is switched off.
      // With it on, the account exists but cannot be used yet — so show a
      // screen that says exactly that, instead of a redirect into nowhere.
      if (!data.session) {
        setAwaitingConfirm(email);
        return;
      }

      // The proxy reads the session from cookies, so a refresh is enough.
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      // Runs on every path, so the button can never stay stuck.
      setBusy(false);
    }
  }

  if (awaitingConfirm) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <MailCheck className="mb-2 size-10 text-primary" aria-hidden />
            <CardTitle className="text-xl">Noch ein Schritt</CardTitle>
            <CardDescription className="text-base">
              Dein Konto ist angelegt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-base leading-relaxed">
              Wir haben eine E-Mail an <strong className="break-all">{awaitingConfirm}</strong>{" "}
              geschickt. Öffne sie und klicke auf den Link darin. Danach kannst du
              dich hier anmelden.
            </p>
            <p className="text-sm text-muted-foreground">
              Keine E-Mail erhalten? Sie kann ein paar Minuten brauchen. Schau
              auch im Spam-Ordner nach.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setAwaitingConfirm(null);
                setMode("signin");
                setPassword("");
              }}
            >
              Zurück zur Anmeldung
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sourcebook</CardTitle>
          <CardDescription className="text-base">
            Lade deine eigenen Dokumente hoch und stelle Fragen dazu. Jede
            Antwort zeigt dir, an welcher Stelle sie steht.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Two visible choices beat a link that people overlook. */}
          <div
            role="tablist"
            aria-label="Anmelden oder neues Konto"
            className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
          >
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Ich habe ein Konto" : "Neu hier"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-base">E-Mail-Adresse</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-base">Passwort</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                aria-describedby="password-hint"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 text-base"
              />
              <p id="password-hint" className="text-sm text-muted-foreground">
                {mode === "signup"
                  ? "Mindestens 6 Zeichen. Denk dir etwas aus, das du dir merken kannst."
                  : "Das Passwort, mit dem du dich registriert hast."}
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-base">{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="h-11 w-full text-base" disabled={busy}>
              {busy
                ? "Einen Moment…"
                : mode === "signin"
                  ? "Anmelden"
                  : "Konto anlegen"}
            </Button>
          </form>

          {mode === "signup" && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                Wir brauchen nur E-Mail und Passwort. Sollte eine Bestätigung per
                E-Mail nötig sein, sagen wir dir das im nächsten Schritt.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
