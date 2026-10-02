import { useEffect, useRef, useState } from 'react'
import type { Couple, WeddingEvent } from '../content/types'
import { downloadIcs, googleCalendarUrl } from '../lib/calendar'

interface Props {
  events: WeddingEvent[]
  mainEvent: WeddingEvent
  couple: Couple
}

export function SaveTheDate({ events, mainEvent, couple }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative mt-6 flex justify-center">
      <button
        type="button"
        className="btn-primary"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        Simpan Tanggal
      </button>
      {open && (
        <div className="card absolute top-full z-20 mt-2 flex w-64 flex-col overflow-hidden p-1 text-left">
          <a
            href={googleCalendarUrl(mainEvent, couple)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center rounded-xl px-4 py-2 hover:bg-surface-alt"
            onClick={() => setOpen(false)}
          >
            Google Calendar
          </a>
          <button
            type="button"
            className="flex min-h-11 items-center rounded-xl px-4 py-2 text-left hover:bg-surface-alt"
            onClick={() => {
              downloadIcs(events, couple)
              setOpen(false)
            }}
          >
            Kalender Apple / Outlook (.ics)
          </button>
        </div>
      )}
    </div>
  )
}
