import type { FieldErrors, RsvpInput, WishInput } from '../services/types'

export const NAME_MIN = 2
export const NAME_MAX = 60
export const GUESTS_MIN = 1
export const GUESTS_MAX = 5
export const MESSAGE_MIN = 3
export const MESSAGE_MAX = 500

function validateName(name: string): string | undefined {
  const n = name.trim()
  if (!n) return 'Nama wajib diisi'
  if (n.length < NAME_MIN || n.length > NAME_MAX) return `Nama ${NAME_MIN}–${NAME_MAX} karakter`
}

/** Name: required, 2–60 chars trimmed. Attendance required. guestCount 1–5 if hadir. */
export function validateRsvp(input: RsvpInput): FieldErrors {
  const errors: FieldErrors = {}
  const name = validateName(input.name)
  if (name) errors.name = name
  if (input.attendance !== 'hadir' && input.attendance !== 'tidak_hadir') {
    errors.attendance = 'Silakan pilih konfirmasi kehadiran'
  } else if (
    input.attendance === 'hadir' &&
    (!Number.isInteger(input.guestCount) ||
      input.guestCount < GUESTS_MIN ||
      input.guestCount > GUESTS_MAX)
  ) {
    errors.guestCount = `Jumlah tamu ${GUESTS_MIN}–${GUESTS_MAX} orang`
  }
  return errors
}

/** Name: required, 2–60 chars. Message: required, 3–500 chars. */
export function validateWish(input: WishInput): FieldErrors {
  const errors: FieldErrors = {}
  const name = validateName(input.name)
  if (name) errors.name = name
  const message = input.message.trim()
  if (!message) errors.message = 'Ucapan wajib diisi'
  else if (message.length < MESSAGE_MIN) errors.message = `Ucapan minimal ${MESSAGE_MIN} karakter`
  else if (message.length > MESSAGE_MAX) errors.message = `Ucapan maksimal ${MESSAGE_MAX} karakter`
  return errors
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}
