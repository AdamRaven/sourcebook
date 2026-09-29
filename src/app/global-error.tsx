"use client";

// The last line of defence: catches errors in the root layout itself, where
// the normal error boundary cannot run. It has to render its own html and body.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
          Die Anwendung konnte nicht geladen werden
        </h1>
        <p style={{ marginTop: "0.75rem", color: "#666" }}>
          Bitte lade die Seite neu. {error.digest ? `Kennung: ${error.digest}` : ""}
        </p>
        <button
          onClick={reset}
          style={{ marginTop: "1.5rem", padding: "0.5rem 1rem", cursor: "pointer" }}
        >
          Neu laden
        </button>
      </body>
    </html>
  );
}
