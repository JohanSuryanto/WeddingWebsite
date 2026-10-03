/** Random id for client-side list items (events, story milestones, …). */
export function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
}
