import { expect, it } from 'vitest'
import { rsvpClosed } from '../../src/lib/rsvpDeadline'

it('stays open through the deadline day in WIB, then closes', () => {
  expect(rsvpClosed(undefined)).toBe(false)
  expect(rsvpClosed('')).toBe(false)
  expect(rsvpClosed('bukan-tanggal')).toBe(false)
  // 1 May 2027 23:59 WIB = 16:59 UTC: still open; one minute later: closed.
  expect(rsvpClosed('2027-05-01', new Date('2027-05-01T16:59:00Z'))).toBe(false)
  expect(rsvpClosed('2027-05-01', new Date('2027-05-01T17:00:00Z'))).toBe(true)
})
