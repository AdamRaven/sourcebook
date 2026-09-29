/**
 * Supabase answers in English and in developer language. Nobody outside this
 * codebase should ever read "Invalid login credentials", so every message we
 * expect is translated into a sentence that says what to do next.
 */
const MESSAGES: { match: RegExp; text: string }[] = [
  {
    match: /invalid login credentials/i,
    text: "E-Mail oder Passwort stimmt nicht. Bitte prüfe beides.",
  },
  {
    match: /email not confirmed/i,
    text: "Dieses Konto ist noch nicht bestätigt. Schau in dein E-Mail-Postfach — dort liegt ein Link von uns.",
  },
  {
    match: /user already registered|already been registered/i,
    text: "Für diese E-Mail gibt es schon ein Konto. Melde dich damit an.",
  },
  {
    match: /password should be at least (\d+)/i,
    text: "Das Passwort ist zu kurz. Es braucht mindestens 6 Zeichen.",
  },
  {
    match: /unable to validate email|invalid format/i,
    text: "Diese E-Mail-Adresse sieht nicht richtig aus. Beispiel: name@beispiel.de",
  },
  {
    match: /rate limit|too many requests/i,
    text: "Zu viele Versuche hintereinander. Warte bitte eine Minute und probiere es dann nochmal.",
  },
  {
    match: /network|fetch failed/i,
    text: "Keine Verbindung zum Server. Prüfe deine Internetverbindung.",
  },
];

export function friendlyAuthError(raw: string): string {
  const hit = MESSAGES.find((m) => m.match.test(raw));
  if (hit) return hit.text;
  // Nothing matched: show the original rather than swallowing it, but say
  // plainly that something unexpected happened.
  return `Da ist etwas schiefgegangen: ${raw}`;
}
