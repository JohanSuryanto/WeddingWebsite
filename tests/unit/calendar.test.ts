import { buildIcs, googleCalendarUrl, toUtcStamp } from '../../src/lib/calendar'
import type { Couple, WeddingEvent } from '../../src/content/types'

const person = { fullName: '', photo: { src: '', width: 1, height: 1 }, father: '', mother: '' }
const couple: Couple = {
  order: 'bride-first',
  bride: { ...person, nickname: 'Anisa' },
  groom: { ...person, nickname: 'Raka' },
}
const event: WeddingEvent = {
  id: 'akad',
  name: 'Akad Nikah',
  start: '2027-02-14T08:00:00+07:00',
  end: '2027-02-14T10:00:00+07:00',
  venueName: 'Masjid Agung',
  address: 'Jl. Sisingamangaraja No.1, Jakarta; Selatan',
  isMain: true,
}

describe('calendar', () => {
  it('converts to a UTC stamp', () => {
    expect(toUtcStamp(event.start)).toBe('20270214T010000Z')
  })

  it('builds a Google Calendar URL with UTC dates', () => {
    const url = new URL(googleCalendarUrl(event, couple))
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('dates')).toBe('20270214T010000Z/20270214T030000Z')
    expect(url.searchParams.get('text')).toBe('Pernikahan Anisa & Raka – Akad Nikah')
  })

  it('builds an .ics file with CRLF, UTC dates and escaped text', () => {
    const ics = buildIcs([event, { ...event, id: 'resepsi', end: null }], couple)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).not.toMatch(/[^\r]\n/)
    expect(ics).toContain('DTSTART:20270214T010000Z')
    expect(ics).toContain('DTEND:20270214T030000Z')
    expect(ics).toContain(
      'LOCATION:Masjid Agung\\, Jl. Sisingamangaraja No.1\\, Jakarta\\; Selatan',
    )
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
  })
})
