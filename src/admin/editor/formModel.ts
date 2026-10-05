import { z } from 'zod'
import type { WeddingContent } from '../../content/types'
import { PASSCODE_PATTERN } from '../../data/passcode'
import { slugSchema, themeIdSchema, weddingContentSchema } from '../../data/schema'
import type { ThemeId } from '../../themes/types'

export interface CoupleFormValues {
  content: WeddingContent
  slug: string
  defaultTheme: ThemeId
  /** Send-invitation passcode (FR-010a). */
  passcode: string
}

export const coupleFormSchema = z.object({
  content: weddingContentSchema,
  slug: slugSchema,
  defaultTheme: themeIdSchema,
  passcode: z.string().regex(PASSCODE_PATTERN, 'Kode akses harus 4 angka'),
})

export const TABS = [
  { id: 'mempelai', label: 'Mempelai' },
  { id: 'acara', label: 'Acara' },
  { id: 'foto', label: 'Foto' },
  { id: 'cerita', label: 'Cerita' },
  { id: 'hadiah', label: 'Hadiah' },
  { id: 'musik', label: 'Musik' },
  { id: 'penutup', label: 'Penutup' },
  { id: 'pesan', label: 'Pesan' },
  { id: 'pengaturan', label: 'Pengaturan' },
  { id: 'respons', label: 'Respons' },
] as const

export type TabId = (typeof TABS)[number]['id']

export function isTabId(value: string | undefined): value is TabId {
  return TABS.some((t) => t.id === value)
}

/** Which editor tab shows the field at a form path (e.g. "content.events.0.end"). */
export function tabOfPath(path: string): TabId {
  const p = path.replace(/^content\./, '')
  if (p === 'slug' || p === 'defaultTheme' || p === 'passcode') return 'pengaturan'
  if (
    p.startsWith('cover.background') ||
    /^couple\.(bride|groom)\.photo/.test(p) ||
    p.startsWith('gallery')
  )
    return 'foto'
  if (p.startsWith('couple') || p.startsWith('cover')) return 'mempelai'
  if (p.startsWith('events') || p === 'rsvpDeadline') return 'acara'
  if (p.startsWith('story')) return 'cerita'
  if (p.startsWith('gifts')) return 'hadiah'
  if (p.startsWith('music')) return 'musik'
  if (p.startsWith('closing')) return 'penutup'
  if (p.startsWith('shareMessage')) return 'pesan'
  return 'mempelai'
}

/** Dotted paths of every error in a react-hook-form errors object. */
export function errorPaths(errors: unknown, prefix = ''): string[] {
  if (!errors || typeof errors !== 'object') return []
  const e = errors as Record<string, unknown>
  if (typeof e.message === 'string' && 'type' in e) return [prefix]
  return Object.entries(e).flatMap(([key, value]) =>
    key === 'ref' || key === 'root'
      ? key === 'root'
        ? [prefix]
        : []
      : errorPaths(value, prefix ? `${prefix}.${key}` : key),
  )
}
