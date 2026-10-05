// The admin "Respons" tab's data (FR-019).
import { apiFetch } from '../../data/http/client'
import type { Page, RsvpRecord, RsvpTotals } from '../../data/types'
import type { Attendance } from '../../content/types'

export interface AdminWish {
  id: string
  name: string
  message: string
  attendance?: Attendance
  createdAt: string
  hidden: boolean
}

export interface AdminResponses {
  totals: RsvpTotals
  rsvps: RsvpRecord[]
  wishes: Page<AdminWish>
  views: number
}

export const responsesAdmin = {
  list(coupleId: string, wishesCursor?: string): Promise<AdminResponses> {
    const q = wishesCursor ? `?wishesCursor=${encodeURIComponent(wishesCursor)}` : ''
    return apiFetch(`/admin/couples/${coupleId}/responses${q}`)
  },
  csvUrl: (coupleId: string) => `/api/admin/couples/${coupleId}/rsvps.csv`,
  async deleteRsvp(id: string) {
    await apiFetch(`/admin/rsvps/${id}`, { method: 'DELETE' })
  },
  async setWishHidden(id: string, hidden: boolean): Promise<AdminWish> {
    return (await apiFetch<{ wish: AdminWish }>(`/admin/wishes/${id}`, { method: 'PATCH', body: { hidden } })).wish
  },
  async deleteWish(id: string) {
    await apiFetch(`/admin/wishes/${id}`, { method: 'DELETE' })
  },
}
