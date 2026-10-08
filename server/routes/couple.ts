// /api/couple/:slug/* — the couple's own page, unlocked with their passcode (US4).
import { Hono } from 'hono'
import { lockCouple, requireCouple } from '../auth/coupleAccess'
import { readyUrls } from '../db/repos/media'
import { listRsvps, responsesFor } from '../db/repos/responses'
import { csvFileName, rsvpCsv } from '../../src/lib/csv'
import { toPublicCouple } from '../lib/publicContent'
import type { AppEnv } from '../types'
import { guestRoutes } from './guests'

type Body = (data: string, status: 200, headers: Record<string, string>) => Response

export function csvResponse(body: Body, slug: string, rows: Parameters<typeof rsvpCsv>[0]) {
  return body(rsvpCsv(rows), 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${csvFileName(slug)}"`,
  })
}

export function coupleRoutes() {
  return (
    new Hono<AppEnv>()
      .use('/:slug/*', requireCouple)

      // The link generator's data: works for drafts too (US4-8).
      .get('/:slug/send-invitation', async (c) => {
        const couple = c.var.couple!
        return c.json({
          couple: toPublicCouple(couple, await readyUrls(c.var.db, couple.id)),
          status: couple.status,
        })
      })

      // The couple's own responses, read only (FR-019); hidden wishes stay hidden.
      .get('/:slug/responses', async (c) =>
        c.json({
          ...(await responsesFor(c.var.db, c.var.couple!.id, {
            includeHidden: false,
            wishesCursor: c.req.query('wishesCursor'),
          })),
          views: c.var.couple!.views,
        }),
      )

      .get('/:slug/rsvps.csv', async (c) => {
        const couple = c.var.couple!
        return csvResponse(c.body.bind(c), couple.slug, await listRsvps(c.var.db, couple.id))
      })

      // The guest list, shared with the admin.
      .route('/:slug/guests', guestRoutes(async (c) => c.var.couple!.id))

      .post('/:slug/lock', (c) => {
        lockCouple(c, c.var.couple!)
        return c.body(null, 204)
      })
  )
}
