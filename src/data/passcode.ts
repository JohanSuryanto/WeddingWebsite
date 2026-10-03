/** The send-invitation passcode: exactly 4 digits (FR-010a). */
export const PASSCODE_PATTERN = /^\d{4}$/

export function isValidPasscode(value: string): boolean {
  return PASSCODE_PATTERN.test(value)
}

/** Uniformly random 4-digit code, e.g. "0482" (browser and Node 22). */
export function randomPasscode(): string {
  const buf = new Uint32Array(1)
  // Rejection sampling keeps every code equally likely.
  const limit = Math.floor(0x1_0000_0000 / 10_000) * 10_000
  do crypto.getRandomValues(buf)
  while (buf[0] >= limit)
  return String(buf[0] % 10_000).padStart(4, '0')
}
