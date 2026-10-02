import { getCountdown } from '../../src/lib/countdown'

describe('getCountdown', () => {
  const target = '2027-02-14T08:00:00+07:00'

  it('splits the remaining time into days/hours/minutes/seconds', () => {
    const now = new Date('2027-02-12T06:58:55+07:00')
    expect(getCountdown(target, now)).toEqual({
      days: 2,
      hours: 1,
      minutes: 1,
      seconds: 5,
      isPast: false,
    })
  })

  it('returns zeros and isPast once the date has passed', () => {
    const now = new Date('2027-02-15T00:00:00+07:00')
    expect(getCountdown(target, now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
    })
  })

  it('treats the exact moment as past, never negative', () => {
    expect(getCountdown(target, new Date(target)).isPast).toBe(true)
  })
})
