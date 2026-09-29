import { z } from "zod";
import { MAX_QUESTION_CHARS, MAX_SOURCE_CHARS } from "./limits";

/**
 * Request bodies arrive from the network and are therefore untrusted, even
 * from our own client. Parsing them through a schema turns "whatever arrived"
 * into a typed value or a clear error, instead of letting a malformed body
 * reach the database layer.
 */
export const ingestSchema = z.object({
  notebookId: z.uuid("Ungültige Notebook-Kennung."),
  title: z.string().trim().min(1, "Die Quelle braucht einen Titel.").max(300),
  kind: z.enum(["pdf", "text", "url"]).default("text"),
  content: z
    .string()
    .trim()
    .min(1, "Die Quelle enthält keinen Text.")
    .max(MAX_SOURCE_CHARS, "Diese Quelle ist zu gross. Teile sie bitte auf."),
});

export const chatSchema = z.object({
  notebookId: z.uuid("Ungültige Notebook-Kennung."),
  question: z
    .string()
    .trim()
    .min(1, "Bitte stelle eine Frage.")
    .max(MAX_QUESTION_CHARS, "Diese Frage ist zu lang."),
});

/** Turns a zod failure into one sentence a person can act on. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Die Anfrage war fehlerhaft.";
}
