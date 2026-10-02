import { fromIsoWithOffset, TIMEZONES, toIsoWithOffset } from '../../src/data/dates'

describe('event date conversion', () => {
  it('builds ISO strings with the chosen Indonesian offset', () => {
    expect(toIsoWithOffset('2027-02-14T08:00', '+07:00')).toBe('2027-02-14T08:00:00+07:00')
    expect(toIsoWithOffset('2027-02-14T08:00', '+09:00')).toBe('2027-02-14T08:00:00+09:00')
    expect(toIsoWithOffset('', '+07:00')).toBe('')
  })

  it('rejects malformed local values', () => {
    expect(() => toIsoWithOffset('14/02/2027', '+07:00')).toThrow()
  })

  it('splits ISO strings back for editing', () => {
    expect(fromIsoWithOffset('2027-02-14T08:00:00+08:00')).toEqual({
      local: '2027-02-14T08:00',
      offset: '+08:00',
    })
    expect(fromIsoWithOffset('')).toEqual({ local: '', offset: '+07:00' })
    expect(fromIsoWithOffset(null)).toEqual({ local: '', offset: '+07:00' })
  })

  it('round-trips every timezone', () => {
    for (const tz of TIMEZONES) {
      const iso = toIsoWithOffset('2027-12-31T23:30', tz.offset)
      const back = fromIsoWithOffset(iso)
      expect(toIsoWithOffset(back.local, back.offset)).toBe(iso)
    }
  })
})
