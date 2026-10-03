/** Postgres error code, looking through Drizzle's wrapper (both drivers set `code`). */
export function pgCode(err: unknown): string | undefined {
  let e = err as { code?: unknown; cause?: unknown } | undefined
  for (let i = 0; e && i < 3; i++) {
    if (typeof e.code === 'string') return e.code
    e = e.cause as typeof e
  }
  return undefined
}

export const isUniqueViolation = (err: unknown) => pgCode(err) === '23505'
