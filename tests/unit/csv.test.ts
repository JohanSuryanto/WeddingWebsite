// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { rsvpCsv } from '../../server/lib/csv'

const row = (over: Partial<Parameters<typeof rsvpCsv>[0][number]> = {}) => ({
  name: 'Pak Andi',
  attendance: 'hadir' as const,
  guestCount: 2,
  submittedAt: new Date('2026-10-02T03:04:00Z'),
  ...over,
})

describe('RSVP CSV', () => {
  it('starts with a BOM and an Indonesian header; times in WIB', () => {
    const csv = rsvpCsv([row()])
    expect(csv.startsWith('﻿')).toBe(true)
    const lines = csv.slice(1).split('\r\n')
    expect(lines[0]).toBe('Nama,Kehadiran,Jumlah Tamu,Waktu (WIB)')
    expect(lines[1]).toBe('Pak Andi,Hadir,2,02/10/2026 10:04')
  })

  it('shows not attending with 0 guests', () => {
    expect(rsvpCsv([row({ attendance: 'tidak_hadir', guestCount: 0 })])).toContain('Pak Andi,Tidak hadir,0,')
  })

  it('quotes commas, quotes and newlines', () => {
    const csv = rsvpCsv([row({ name: 'Andi, "Budi"\nCici' })])
    expect(csv).toContain('"Andi, ""Budi""\nCici",Hadir')
  })

  it('neutralises spreadsheet formulas', () => {
    for (const name of ['=SUM(1)', '+1', '-1', '@cmd']) {
      expect(rsvpCsv([row({ name })]).split('\r\n')[1].startsWith(`'${name}`)).toBe(true)
    }
  })
})
