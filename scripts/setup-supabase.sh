#!/usr/bin/env bash
# Einmalige Einrichtung: Projekt verbinden, Schema einspielen, Edge Function
# ausrollen und .env.local schreiben.
#
# Der Anthropic-Schluessel wird hier NICHT gesetzt: er gehoert in die Umgebung
# des Next.js-Servers, nicht zu Supabase. Lokal in .env.local, produktiv in die
# Environment Variables von Vercel.
set -euo pipefail
cd "$(dirname "$0")/.."

SB="npx --yes supabase@latest"

echo "== 1/4  Bei Supabase anmelden (oeffnet den Browser) =="
$SB login

echo
echo "== 2/4  Projekt verbinden =="
echo "Du kannst die ganze Projekt-URL einfuegen oder nur die Ref."
read -rp "Supabase-URL oder Project-Ref: " REF
REF=$(printf '%s' "$REF" \
  | sed -E 's#^[[:space:]]*(https?://)?##; s#\.supabase\.co.*$##; s#/.*$##; s#[[:space:]]*$##')

if ! printf '%s' "$REF" | grep -qE '^[a-z]{20}$'; then
  echo "Das sieht nicht nach einer Project-Ref aus: '$REF'"
  echo "Erwartet werden 20 Kleinbuchstaben, z. B. abcdefghijklmnopqrst"
  exit 1
fi
echo "Project-Ref: $REF"
$SB link --project-ref "$REF"

echo
echo "== 3/4  Schema und Zugriffsregeln einspielen =="
$SB db push

echo
echo "== 4/4  Edge Function ausrollen =="
$SB functions deploy embed

echo
echo "== .env.local schreiben =="
# Der anon-key ist nicht geheim: er geht ohnehin an jeden Browser. Was die
# Daten schuetzt, ist Row Level Security in der Datenbank, nicht dieser Wert.
ANON=$($SB projects api-keys --project-ref "$REF" -o json 2>/dev/null \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      try{
        const rows=JSON.parse(s);
        const k=rows.find(x=>(x.name||x.type)==="anon")||rows[0];
        process.stdout.write(k.api_key||k.apiKey||k.key||"");
      }catch(e){process.stdout.write("");}})' || true)

if [ -z "$ANON" ]; then
  echo "Der anon-key liess sich nicht automatisch auslesen."
  echo "Supabase -> Project Settings -> API Keys -> anon public"
  read -rp "anon-key hier einfuegen: " ANON
fi

# Einen bereits eingetragenen Anthropic-Schluessel nicht ueberschreiben.
KEYLINE=$(grep '^ANTHROPIC_API_KEY=' .env.local 2>/dev/null || echo 'ANTHROPIC_API_KEY=')

{
  printf 'NEXT_PUBLIC_SUPABASE_URL=https://%s.supabase.co\n' "$REF"
  printf 'NEXT_PUBLIC_SUPABASE_ANON_KEY=%s\n' "$ANON"
  printf '%s\n' "$KEYLINE"
} > .env.local

echo ".env.local geschrieben (steht in .gitignore)"
echo
if [ "$KEYLINE" = "ANTHROPIC_API_KEY=" ]; then
  echo "FEHLT NOCH: Trage deinen Anthropic-Schluessel in .env.local ein."
  echo "  ANTHROPIC_API_KEY=sk-ant-..."
  echo
fi
echo "Dann:  npm run dev"
