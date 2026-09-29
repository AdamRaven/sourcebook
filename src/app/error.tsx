"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Catches anything a page or its data fetching throws, so a failure shows a
// sentence and a way out instead of a blank screen.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold">Da ist etwas schiefgelaufen</h1>
        <p className="text-muted-foreground">
          Der Fehler wurde festgehalten. Probiere es noch einmal — wenn es
          wieder passiert, lade die Seite neu.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">
            Kennung: {error.digest}
          </p>
        )}
        <Button onClick={reset}>Nochmal versuchen</Button>
      </div>
    </main>
  );
}
