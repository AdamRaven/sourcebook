// Roughly a paragraph and a half per chunk. Small enough that a citation points
// at something a person can actually read, large enough to keep the meaning.
const TARGET = 1000;
const OVERLAP = 150;

export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= TARGET) return [clean];

  // Prefer to break where the author broke: paragraph, then sentence.
  const paragraphs = clean.split(/\n\n+/);
  const out: string[] = [];
  let buf = "";

  const flush = () => {
    if (!buf.trim()) return;
    out.push(buf.trim());
    buf = buf.length > OVERLAP ? buf.slice(-OVERLAP) : "";
  };

  for (const p of paragraphs) {
    if (p.length > TARGET) {
      flush();
      const sentences = p.match(/[^.!?]+[.!?]+|\S+$/g) ?? [p];
      for (const s of sentences) {
        if (buf.length + s.length > TARGET) flush();
        buf += s;
      }
      continue;
    }
    if (buf.length + p.length > TARGET) flush();
    buf += (buf ? "\n\n" : "") + p;
  }
  flush();

  return out.filter(Boolean);
}
