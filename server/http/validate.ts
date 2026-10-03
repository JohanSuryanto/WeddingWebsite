import type { Context } from 'hono'
import type { z } from 'zod'
import { invalidBody, type FieldErrors } from './errors'

/** zod issues → { 'a.b': 'message' } (first message per field). */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    out[key] ??= issue.message
  }
  return out
}

/** Parses the JSON body with `schema`; 400 invalid_body with field messages on failure. */
export async function readJson<S extends z.ZodType>(c: Context, schema: S): Promise<z.infer<S>> {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    throw invalidBody(undefined, 'Body harus berupa JSON')
  }
  const result = schema.safeParse(raw)
  if (!result.success) throw invalidBody(fieldErrors(result.error))
  return result.data
}
