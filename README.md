# Sourcebook

[![CI](https://github.com/AdamRaven/sourcebook/actions/workflows/ci.yml/badge.svg)](https://github.com/AdamRaven/sourcebook/actions/workflows/ci.yml)

**Live:** https://sourcebook-delta.vercel.app

Ein Klon von [NotebookLM](https://notebooklm.google.com): Du lädst eigene Dokumente
hoch und stellst Fragen dazu. Die Antworten werden **ausschliesslich** aus diesen
Dokumenten gebildet und mit Fundstellen belegt, die man anklicken kann.

## Was es kann

- Notebooks anlegen, jedes mit eigenen Quellen
- PDFs und Textdateien hochladen, oder Text direkt einfügen
- Fragen stellen, Antwort erscheint streamend
- Jede Behauptung ist belegt — ein Klick auf die Fundstelle öffnet die
  Originalstelle mit exakt markiertem Zitat
- Mehrbenutzerfähig, jeder sieht nur seine eigenen Notebooks

## Stack

**Next.js 16** (App Router) · TypeScript · Tailwind · shadcn/ui · **Supabase**
(Postgres, pgvector, Auth) · **Claude** · Deployment auf Vercel

## Architektur

```
Next.js (App Router)                            →  Vercel
  ├── proxy.ts              Session auffrischen, Zugriff schützen
  ├── Server Components     Notebooks und Quellen serverseitig laden
  ├── Server Actions        anlegen, umbenennen, löschen
  └── Route Handlers
        ├── /api/ingest     zerlegen → einbetten → speichern
        └── /api/chat       Vektorsuche → Claude → streamen

Supabase
  ├── Auth                  Sitzung in Cookies, damit der Server sie liest
  ├── Postgres + pgvector   Notebooks, Quellen, Abschnitte, Vektoren
  ├── Row Level Security    trennt die Nutzer — in der Datenbank, nicht im Client
  └── Edge Function embed   das Einbettungsmodell, sonst nichts
```

### Vier Entscheidungen, die den Unterschied machen

**Zitate kommen als Daten, nicht als Text.** Der naheliegende Weg wäre, das
Modell `[1]`, `[2]` schreiben zu lassen und das hinterher aus der Antwort
herauszuparsen. Das ist fehleranfällig: Modelle vergeben Nummern doppelt,
lassen sie weg oder erfinden welche. Stattdessen bekommt Claude jeden gefundenen
Abschnitt als eigenes Dokument mit aktivierten Zitaten. Die Fundstellen kommen
dann als strukturierte Daten zurück — welches Dokument, welcher Zeichenbereich
darin. Genau dieser Bereich wird markiert. Eine Fundstelle kann damit
prinzipiell nicht auf die falsche Stelle zeigen.

**Die Anwendungslogik liegt in Next.js, nicht bei Supabase.** Einzige Ausnahme
ist das Einbetten: `Supabase.ai.Session` existiert nur in Supabase' eigener Edge
Runtime, weil dort das Modell liegt. Diese Funktion nimmt deshalb ein Array
entgegen — ein Dokument mit fünfzig Abschnitten ist ein Netzwerkaufruf, nicht
fünfzig. Alles andere sind Route Handler.

**Die Zugriffstrennung liegt in der Datenbank.** Row Level Security prüft bei
jeder Abfrage, ob das Notebook dem angemeldeten Nutzer gehört — auch bei den
Abfragen, die der Next.js-Server stellt, denn der benutzt die Sitzung des
Nutzers und keinen privilegierten Schlüssel. Ein Fehler im Frontend kann
deshalb keine fremden Daten preisgeben.

**Der Anthropic-Schlüssel erreicht den Browser nie.** Er steht ohne
`NEXT_PUBLIC_`-Präfix in der Umgebung und wird nur im Route Handler gelesen.
Der Supabase-anon-key darf dagegen öffentlich sein: was die Daten schützt, ist
Row Level Security, nicht die Geheimhaltung dieses Werts.

## Tests

```bash
npm test          # startet den Dev-Server und laesst Cypress durchlaufen
npm run lint      # ESLint
npm run typecheck # tsc ohne Ausgabe
```

19 End-to-End-Tests in vier Gruppen:

| Datei | Prueft |
|---|---|
| `01-zugang` | Umleitung ohne Anmeldung, Bedienbarkeit der Maske, deutsche Fehlermeldungen, `401` statt HTML auf API-Routen |
| `02-validierung` | Dass kaputte, leere und uebergrosse Anfragen abgewiesen werden |
| `03-notebook` | Notebook anlegen, Quelle aufnehmen und entfernen, Titel merken, gesperrter Chat ohne Quellen |
| `04-antworten-mit-belegen` | Echte Modellantworten: richtige Antwort, klickbarer Beleg auf die Originalstelle, **keine Erfindung** wenn die Quelle nichts hergibt, Verlauf nach Neuladen |

Der letzte Satz ruft das echte Modell auf und kostet ein paar Cent pro Durchlauf.
Er ist der einzige, der beweist, dass der Kern wirklich trägt.

`.github/workflows/ci.yml` laesst Lint, Typen und Build bei jedem Push laufen.
Cypress laeuft dort nur, wenn die Zugangsdaten als Repository-Secrets
hinterlegt sind — sonst wird der Schritt uebersprungen statt rot zu werden.

## Grenzen

Hinter der App steht eine kostenpflichtige API, also ist jede Eingabe begrenzt
(`src/lib/limits.ts`):

- 20 MB pro Datei, schon im Browser geprueft, bevor ein Riesen-PDF den Tab einfriert
- 500.000 Zeichen pro Quelle
- 2.000 Zeichen pro Frage
- 60 Fragen pro Stunde und Nutzer

Alle Anfragen an die API werden mit zod geprueft, bevor sie die Datenbank
erreichen.

## Lokal starten

```bash
npm install
cp .env.example .env.local     # Werte eintragen
npm run dev
```

## Supabase einrichten

```bash
./scripts/setup-supabase.sh
```

Verbindet das Projekt, spielt Schema und Zugriffsregeln ein und rollt die
Edge Function aus.

## Hinweis zur Anmeldung

Die E-Mail-Bestätigung bei der Registrierung ist **absichtlich abgeschaltet**,
damit die Demo ohne Umweg benutzbar ist. Der kostenlose Supabase-Tarif verschickt
nur wenige Mails pro Stunde und oft nur an Projektmitglieder — mit aktivierter
Bestätigung käme ein Tester nie über den Anmeldeschirm hinaus.

Produktiv gehörte das wieder an, zusammen mit einem echten Mailversender.

## Bewusst weggelassen

Für den Umfang dieser Aufgabe zählt, dass der Kern sauber funktioniert.
Naheliegend als nächstes:

- **Audio Overview** — die Podcast-Funktion, für die NotebookLM bekannt ist
- **URL als Quelle** — serverseitig abrufen und lesbar machen
- **Hybride Suche** — aktuell rein semantisch, keine Stichwortsuche daneben

## Modell und Kosten

Standard ist `claude-opus-5`. Für den Betrieb reicht `claude-sonnet-5` und kostet
weniger als die Hälfte — eine Zeile in `src/app/api/chat/route.ts`.
