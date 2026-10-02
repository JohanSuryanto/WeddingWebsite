import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { MessagePage } from '../../components/MessagePage'
import { coupleRepository, mediaStore, ready } from '../../data/index.admin'
import { resolveMedia } from '../../data/resolveMedia'
import { CoupleInvitation } from '../../invitation/CoupleInvitation'
import { resolveThemeId } from '../../themes'
import type { WeddingContent } from '../../content/types'
import type { ThemeId } from '../../themes/types'
import { isPreviewUpdate, type PreviewUpdate } from './messages'
import { PreviewErrorBoundary } from './PreviewErrorBoundary'
import { sanitizeForPreview } from './sanitize'

interface Shown {
  content: WeddingContent
  themeId: ThemeId
  guestName: string | null | undefined
  skipCover: boolean
}

/** Saved-couple mode: /preview-frame?couple=<id>[&inv=…][&t=…] */
function SavedCouple({ id, search }: { id: string; search: string }) {
  const [state, setState] = useState<{ id: string; shown: Shown | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    let dispose: (() => void) | undefined
    ;(async () => {
      await ready
      const couple = await coupleRepository.get(id).catch(() => null)
      if (!couple) return !cancelled && setState({ id, shown: null })
      const resolved = await resolveMedia(couple.content, mediaStore)
      if (cancelled) return resolved.dispose()
      dispose = resolved.dispose
      setState({
        id,
        shown: {
          content: sanitizeForPreview(resolved.content),
          themeId: resolveThemeId(search, couple.defaultTheme),
          guestName: undefined,
          skipCover: false,
        },
      })
    })()
    return () => {
      cancelled = true
      dispose?.()
    }
  }, [id, search])

  if (!state || state.id !== id) return null
  if (!state.shown) {
    return <MessagePage title="Undangan tidak ditemukan" message="Pasangan ini tidak ada." />
  }
  return <Render shown={state.shown} />
}

/** Live mode: renders whatever the editor posts (unsaved drafts). */
function LiveDraft() {
  const [shown, setShown] = useState<Shown | null>(null)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || !isPreviewUpdate(e.data)) return
      const msg: PreviewUpdate = e.data
      setShown({
        content: sanitizeForPreview(msg.content),
        themeId: msg.themeId,
        guestName: msg.guestName,
        skipCover: !!msg.openInvitation,
      })
    }
    window.addEventListener('message', onMessage)
    window.parent?.postMessage({ type: 'preview:ready' }, window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (!shown) return <p className="p-6 text-center text-sm text-muted">Memuat tampilan…</p>
  return <Render shown={shown} />
}

function Render({ shown }: { shown: Shown }) {
  return (
    <PreviewErrorBoundary
      resetKey={shown}
      fallback={
        <p className="p-6 text-center text-sm text-muted">Lengkapi data untuk melihat tampilan.</p>
      }
    >
      <CoupleInvitation
        content={shown.content}
        themeId={shown.themeId}
        guestName={shown.guestName}
        skipCover={shown.skipCover}
      />
    </PreviewErrorBoundary>
  )
}

export default function PreviewFrame() {
  const [params] = useSearchParams()
  const id = params.get('couple')
  if (id) {
    const t = params.get('t')
    return <SavedCouple id={id} search={t ? `?t=${encodeURIComponent(t)}` : ''} />
  }
  return <LiveDraft />
}
