/** "YYYY-MM-DD"; RSVP stays open through the end of that day, Western Indonesian Time (WIB). */
export const RSVP_DEADLINE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function rsvpClosed(deadline: string | undefined, now = new Date()): boolean {
  if (!deadline || !RSVP_DEADLINE_PATTERN.test(deadline)) return false
  return now.getTime() > Date.parse(`${deadline}T23:59:59.999+07:00`)
}
