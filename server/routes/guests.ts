// Guest list routes, mounted for the couple (/api/couple/:slug/guests, behind the
// passcode) and the admin (/api/admin/couples/:id/guests). Both edit the same list.
import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { parseGuestList } from '../../src/lib/inviteLink'
import { GUEST_LIST_NAME_MAX, GUESTS_MAX, listGuests, saveGuests, setGuestSent, withReplies } from '../db/repos/guests'
import { readJson } from '../http/validate'
import type { AppEnv } from '../types'

const saveBody = z.object({
  names: z.array(z.string().max(GUEST_LIST_NAME_MAX, 'Nama terlalu panjang')).max(GUESTS_MAX, `Maksimal ${GUESTS_MAX} tamu`),
})
const sentBody = z.object({ sent: z.boolean() })

export function guestRoutes(coupleIdOf: (c: Context<AppEnv>) => Promise<string>) {
  return new Hono<AppEnv>()
    .get('/', async (c) => {
      const coupleId = await coupleIdOf(c)
      return c.json({ guests: await withReplies(c.var.db, coupleId, await listGuests(c.var.db, coupleId)) })
    })
    .put('/', async (c) => {
      const { names } = await readJson(c, saveBody)
      // Same cleanup as the page: one line per name, spaces collapsed, blanks dropped.
      const coupleId = await coupleIdOf(c)
      const rows = await saveGuests(c.var.db, coupleId, parseGuestList(names.join('\n')))
      return c.json({ guests: await withReplies(c.var.db, coupleId, rows) })
    })
    .patch('/:guestId', async (c) => {
      const { sent } = await readJson(c, sentBody)
      const coupleId = await coupleIdOf(c)
      const row = await setGuestSent(c.var.db, coupleId, c.req.param('guestId'), sent)
      return c.json({ guest: (await withReplies(c.var.db, coupleId, [row]))[0] })
    })
}
