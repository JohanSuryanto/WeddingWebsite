import {
  formatDateId,
  formatDateShort,
  formatRelativeId,
  formatTimeRangeId,
  tzLabel,
} from '../../src/lib/dateFormat'

describe('dateFormat', () => {
  it('formats an Indonesian long date in the event offset', () => {
    expect(formatDateId('2027-02-14T08:00:00+07:00')).toBe('Minggu, 14 Februari 2027')
    // 23:30 WIT is still the 14th locally even though it's the 14th 14:30 UTC
    expect(formatDateId('2027-02-14T23:30:00+09:00')).toBe('Minggu, 14 Februari 2027')
  })

  it('formats a short date', () => {
    expect(formatDateShort('2027-02-14T08:00:00+07:00')).toBe('14 . 02 . 2027')
  })

  it('formats a time range with a timezone label', () => {
    expect(formatTimeRangeId('2027-02-14T08:00:00+07:00', '2027-02-14T10:00:00+07:00')).toBe(
      '08.00 – 10.00 WIB',
    )
  })

  it('shows "Selesai" when there is no end', () => {
    expect(formatTimeRangeId('2027-02-14T11:00:00+08:00', null)).toBe('11.00 WITA – Selesai')
  })

  it('maps offsets to Indonesian timezone labels', () => {
    expect(tzLabel('+07:00')).toBe('WIB')
    expect(tzLabel('+08:00')).toBe('WITA')
    expect(tzLabel('+09:00')).toBe('WIT')
  })

  it('formats relative times', () => {
    const now = new Date('2027-01-01T12:00:00Z')
    expect(formatRelativeId(new Date('2027-01-01T11:59:30Z'), now)).toBe('baru saja')
    expect(formatRelativeId(new Date('2027-01-01T11:55:00Z'), now)).toBe('5 menit lalu')
    expect(formatRelativeId(new Date('2027-01-01T09:00:00Z'), now)).toBe('3 jam lalu')
    expect(formatRelativeId(new Date('2026-12-30T12:00:00Z'), now)).toBe('2 hari lalu')
    expect(formatRelativeId(new Date('2027-03-05T12:00:00Z'), now)).toBe('5 Maret 2027')
  })
})
