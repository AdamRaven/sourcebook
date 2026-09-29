/**
 * Hard limits.
 *
 * There is a paid API behind this app, so "someone pastes a novel" and
 * "someone loops a script" both have to cost something bounded. These numbers
 * are generous for real use and small enough to keep a bad actor cheap.
 */
export const MAX_SOURCE_CHARS = 500_000;   // ~150 Seiten Text
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_QUESTION_CHARS = 2_000;
export const MAX_QUESTIONS_PER_HOUR = 60;

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
