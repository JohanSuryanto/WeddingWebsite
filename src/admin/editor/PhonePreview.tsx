import { useEffect, useRef, useState } from 'react'
import { useWatch } from 'react-hook-form'
import { PhoneFrame } from '../../components/PhoneFrame'
import { mediaStore } from '../../data/index.admin'
import { collectMediaRefs, isMediaRef, mapSources, mediaId } from '../../data/resolveMedia'
import { themes } from '../../themes'
import type { ThemeId } from '../../themes/types'
import { useMediaSession } from '../media/MediaSession'
import { isPreviewReady, type PreviewUpdate } from '../preview/messages'
import type { CoupleFormValues } from './formModel'

const DEBOUNCE_MS = 250

/** Live phone preview of the unsaved form (contracts/preview-messaging.md). */
export function PhonePreview({ initialTheme }: { initialTheme: ThemeId }) {
  const content = useWatch<CoupleFormValues, 'content'>({ name: 'content' })
  const { urls } = useMediaSession()
  const [themeId, setThemeId] = useState<ThemeId>(initialTheme)
  const [guestName, setGuestName] = useState('')
  const [openInvitation, setOpenInvitation] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const savedUrls = useRef(new Map<string, string>())
  const latest = useRef<PreviewUpdate | null>(null)

  // Revoke cached URLs for saved media when the preview goes away.
  useEffect(() => {
    const cache = savedUrls.current
    return () => cache.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  // Re-send the latest draft whenever the frame (re)loads.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || !isPreviewReady(e.data)) return
      if (latest.current)
        frameRef.current?.contentWindow?.postMessage(latest.current, window.location.origin)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      for (const id of collectMediaRefs(content)) {
        if (urls.has(id) || savedUrls.current.has(id)) continue
        const blob = await mediaStore.getBlob(id)
        if (blob) savedUrls.current.set(id, URL.createObjectURL(blob))
      }
      if (cancelled) return
      const resolved = mapSources(content, (src) =>
        isMediaRef(src)
          ? (urls.get(mediaId(src)) ?? savedUrls.current.get(mediaId(src)) ?? '')
          : null,
      )
      const msg: PreviewUpdate = {
        type: 'preview:update',
        content: resolved,
        themeId,
        guestName: guestName.trim() || null,
        openInvitation,
      }
      latest.current = msg
      frameRef.current?.contentWindow?.postMessage(msg, window.location.origin)
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [content, urls, themeId, guestName, openInvitation])

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Tema pratinjau" className="flex flex-wrap justify-center gap-1">
        {Object.values(themes).map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={t.id === themeId}
            title={t.name}
            className={`rounded-full px-3 py-1 text-sm font-bold ${
              t.id === themeId
                ? 'bg-highlight text-highlight-text'
                : 'text-muted hover:bg-surface-alt'
            }`}
            onClick={() => setThemeId(t.id)}
          >
            Tema {t.code}
          </button>
        ))}
      </div>
      <PhoneFrame
        src="/preview-frame"
        reloadKey="live"
        title="Pratinjau langsung"
        testId="live-preview"
        iframeRef={frameRef}
        scale={0.78}
      />
      <div className="mx-auto flex max-w-[310px] flex-col gap-2">
        <label htmlFor="preview-guest" className="sr-only">
          Nama tamu untuk pratinjau
        </label>
        <input
          id="preview-guest"
          className="field min-h-11 py-1 text-sm"
          placeholder="Nama tamu (pratinjau)"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
        />
        <div role="group" aria-label="Bagian pratinjau" className="flex gap-1">
          {[
            { open: false, label: 'Sampul' },
            { open: true, label: 'Isi' },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={openInvitation === o.open}
              className={`flex-1 rounded-full px-3 py-1 text-sm font-bold ${
                openInvitation === o.open
                  ? 'bg-highlight text-highlight-text'
                  : 'text-muted hover:bg-surface-alt'
              }`}
              onClick={() => setOpenInvitation(o.open)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
