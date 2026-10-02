import type { Couple } from '../../data/types'
import { anisaRaka } from './anisa-raka/content'

/** Built-in demo couples served by the public site in the frontend-only phase. */
export const SAMPLE_COUPLES: Couple[] = [
  {
    id: 'sample-anisa-raka',
    slug: 'anisa-raka',
    status: 'active',
    defaultTheme: 'romantic-floral',
    content: anisaRaka,
    version: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
]
