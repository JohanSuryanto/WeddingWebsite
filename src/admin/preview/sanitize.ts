import type { WeddingContent } from '../../content/types'

const VALID = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?[+-]\d{2}:\d{2}$/

function placeholderStart(): string {
  const d = new Date(Date.now() + 30 * 86400_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T08:00:00+07:00`
}

/**
 * Makes an unfinished draft safe to render in the live preview: events without
 * a valid date are dropped (a placeholder keeps the page complete), invalid end
 * times are cleared, and exactly one main event is ensured.
 */
export function sanitizeForPreview(content: WeddingContent): WeddingContent {
  let events = (content.events ?? [])
    .filter((e) => VALID.test(e.start))
    .map((e) => ({ ...e, end: e.end && VALID.test(e.end) && e.end > e.start ? e.end : null }))
  if (events.length === 0) {
    events = [
      {
        id: 'placeholder',
        name: content.events?.[0]?.name || 'Acara',
        start: placeholderStart(),
        end: null,
        venueName: content.events?.[0]?.venueName || 'Tempat acara',
        address: content.events?.[0]?.address || 'Tanggal belum diisi',
        isMain: true,
      },
    ]
  }
  const mainCount = events.filter((e) => e.isMain).length
  if (mainCount !== 1) events = events.map((e, i) => ({ ...e, isMain: i === 0 }))
  return { ...content, events }
}
