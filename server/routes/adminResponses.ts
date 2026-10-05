// /api/admin responses (FR-019): RSVPs with totals, wishes incl. hidden, CSV, hide/delete.
import { Hono } from 'hono'
import { z } from 'zod'
import { getCoupleRow } from '../db/repos/couples'
import { deleteRsvp, deleteWish, listRsvps, responsesFor, setWishHidden, toWireWish } from '../db/repos/responses'
import { readJson } from '../http/validate'
import type { AppEnv } from '../types'
import { csvResponse } from './couple'
import { guestRoutes } from './guests'

const hideBody = z.object({ hidden: z.boolean() })

export function adminResponsesRoutes() {
  return new Hono<AppEnv>()
    .get('/couples/:id/responses', async (c) => {
      const couple = await getCoupleRow(c.var.db, c.req.param('id'))
      return c.json({
        ...(await responsesFor(c.var.db, couple.id, { includeHidden: true, wishesCursor: c.req.query('wishesCursor') })),
        views: couple.views,
      })
    })

    .get('/couples/:id/rsvps.csv', async (c) => {
      const couple = await getCoupleRow(c.var.db, c.req.param('id'))
      return csvResponse(c.body.bind(c), couple.slug, await listRsvps(c.var.db, couple.id))
    })

    .delete('/rsvps/:id', async (c) => {
      await deleteRsvp(c.var.db, c.req.param('id'))
      return c.body(null, 204)
    })

    .patch('/wishes/:id', async (c) => {
      const { hidden } = await readJson(c, hideBody)
      return c.json({ wish: toWireWish(await setWishHidden(c.var.db, c.req.param('id'), hidden), true) })
    })

    // The couple's guest list (the same one their passcode page edits).
    .route(
      '/couples/:id/guests',
      guestRoutes(async (c) => (await getCoupleRow(c.var.db, c.req.param('id') ?? '')).id),
    )

    .delete('/wishes/:id', async (c) => {
      await deleteWish(c.var.db, c.req.param('id'))
      return c.body(null, 204)
    })
}
