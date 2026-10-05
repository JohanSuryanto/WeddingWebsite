import type { WeddingContent } from '../../content/types'
import type { ThemeId } from '../../themes/types'

/** Editor → frame (contracts/preview-messaging.md). */
export interface PreviewUpdate {
  type: 'preview:update'
  content: WeddingContent
  themeId: ThemeId
  guestName: string | null
  openInvitation?: boolean
  /** Bumped on every Sampul/Isi press: the frame restarts the invitation in that view. */
  view?: number
}

/** Frame → editor, when the guest presses "Buka Undangan" inside the frame. */
export interface PreviewOpened {
  type: 'preview:opened'
}

/** Frame → editor, once on load. */
export interface PreviewReady {
  type: 'preview:ready'
}

export function isPreviewUpdate(data: unknown): data is PreviewUpdate {
  return (
    !!data && typeof data === 'object' && (data as { type?: unknown }).type === 'preview:update'
  )
}

export function isPreviewReady(data: unknown): data is PreviewReady {
  return !!data && typeof data === 'object' && (data as { type?: unknown }).type === 'preview:ready'
}

export function isPreviewOpened(data: unknown): data is PreviewOpened {
  return (
    !!data && typeof data === 'object' && (data as { type?: unknown }).type === 'preview:opened'
  )
}
