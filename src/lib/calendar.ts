import type { Couple, WeddingEvent } from '../content/types'
import { downloadBlob } from './download'

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000

/** 20270214T010000Z */
export function toUtcStamp(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

function endIso(event: WeddingEvent): string {
  return event.end ?? new Date(new Date(event.start).getTime() + DEFAULT_DURATION_MS).toISOString()
}

export function eventTitle(event: WeddingEvent, couple: Couple): string {
  const [a, b] =
    couple.order === 'groom-first'
      ? [couple.groom.nickname, couple.bride.nickname]
      : [couple.bride.nickname, couple.groom.nickname]
  return `Pernikahan ${a} & ${b} – ${event.name}`
}

export function googleCalendarUrl(event: WeddingEvent, couple: Couple): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle(event, couple),
    dates: `${toUtcStamp(event.start)}/${toUtcStamp(endIso(event))}`,
    location: `${event.venueName}, ${event.address}`,
    details: 'Merupakan suatu kehormatan apabila Bapak/Ibu/Saudara/i berkenan hadir.',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

export function buildIcs(events: WeddingEvent[], couple: Couple, now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding Invitation//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}-${toUtcStamp(event.start)}@wedding-invitation`,
      `DTSTAMP:${toUtcStamp(now.toISOString())}`,
      `DTSTART:${toUtcStamp(event.start)}`,
      `DTEND:${toUtcStamp(endIso(event))}`,
      `SUMMARY:${escapeIcs(eventTitle(event, couple))}`,
      `LOCATION:${escapeIcs(`${event.venueName}, ${event.address}`)}`,
      ...(event.mapUrl ? [`URL:${event.mapUrl}`] : []),
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

export function downloadIcs(events: WeddingEvent[], couple: Couple): void {
  const blob = new Blob([buildIcs(events, couple)], { type: 'text/calendar;charset=utf-8' })
  downloadBlob(blob, 'undangan-pernikahan.ics')
}
