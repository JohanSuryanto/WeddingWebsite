// Guest list routes, mounted for the couple (/api/couple/:slug/guests, behind the
// passcode) and the admin (/api/admin/couples/:id/guests). Both edit the same list.
import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { parseGuestList } from '../../src/lib/inviteLink'
import { GUEST_LIST_NAME_MAX, GUESTS_MAX, listGuests, saveGuests, setGuestSent, toWireGuest } from '../db/repos/guests'
import { readJson } from '../http/validate'
import type { AppEnv } from '../types'

const saveBody = z.object({
  names: z.array(z.string().max(GUEST_LIST_NAME_MAX, 'Nama terlalu panjang')).max(GUESTS_MAX, `Maksimal ${GUESTS_MAX} tamu`),
})
const sentBody = z.object({ sent: z.boolean() })

export function guestRoutes(coupleIdOf: (c: Context<AppEnv>) => Promise<string>) {
  return new Hono<AppEnv>()
    .get('/', async (c) => {
      const rows = await listGuests(c.var.db, await coupleIdOf(c))
      return c.json({ guests: rows.map(toWireGuest) })
    })
    .put('/', async (c) => {
      const { names } = await readJson(c, saveBody)
      // Same cleanup as the page: one line per name, spaces collapsed, blanks dropped.
      const rows = await saveGuests(c.var.db, await coupleIdOf(c), parseGuestList(names.join('\n')))
      return c.json({ guests: rows.map(toWireGuest) })
    })
    .patch('/:guestId', async (c) => {
      const { sent } = await readJson(c, sentBody)
      const row = await setGuestSent(c.var.db, await coupleIdOf(c), c.req.param('guestId'), sent)
      return c.json({ guest: toWireGuest(row) })
    })
}
