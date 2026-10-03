import type { Attendance, Wish } from '../content/types'

export type RsvpInput = { name: string; attendance: Attendance | ''; guestCount: number }
export type WishInput = { name: string; message: string; attendance?: Attendance }

export interface RsvpResponse {
  name: string
  attendance: Attendance
  guestCount: number
  submittedAt: Date
}

export type FieldErrors = Partial<Record<string, string>>

export class ValidationError extends Error {
  fieldErrors: FieldErrors
  /** API error code when it came from the server (e.g. 'not_publishable'). */
  code?: string
  constructor(fieldErrors: FieldErrors, message = 'validation', code?: string) {
    super(message)
    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
    this.code = code
  }
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

export interface RsvpService {
  /** This browser's earlier response, if any (US5-1). */
  mine(): Promise<RsvpResponse | null>
  /** Rejects with ValidationError when input is invalid. */
  submit(input: RsvpInput): Promise<RsvpResponse>
}

export interface WishService {
  /** Newest first, a page at a time (pass the previous nextCursor for more). */
  list(cursor?: string): Promise<Page<Wish>>
  /** Rejects with ValidationError when input is invalid. */
  submit(input: WishInput): Promise<Wish>
}
