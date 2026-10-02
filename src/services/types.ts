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
  constructor(fieldErrors: FieldErrors) {
    super('validation')
    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
  }
}

export interface RsvpService {
  /** Rejects with ValidationError when input is invalid. */
  submit(input: RsvpInput): Promise<RsvpResponse>
}

export interface WishService {
  /** Newest first. */
  list(): Promise<Wish[]>
  /** Rejects with ValidationError when input is invalid. */
  submit(input: WishInput): Promise<Wish>
}
