import { z } from "zod";

/** Flattens a ZodError into { fieldName: firstErrorMessage } for form UIs. */
export function zodFieldErrors(error: z.ZodError<Record<string, unknown>>): Record<string, string> {
  const { fieldErrors } = z.flattenError(error);
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) out[key] = messages[0];
  }
  return out;
}
