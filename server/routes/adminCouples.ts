// /api/admin/couples* (contracts/api.md § Couples). Mounted behind requireAdmin.
import { Hono } from 'hono'
import { z } from 'zod'
import type { WeddingContent } from '../../src/content/types'
import { PASSCODE_PATTERN } from '../../src/data/passcode'
import { collectMediaRefs } from '../../src/data/resolveMedia'
import { themeIdSchema } from '../../src/data/schema'
import {
  createCouple,
  deleteCouple,
  duplicateCouple,
  findRowBySlug,
  getCoupleRow,
  listCouples,
  coupleNotFound,
  setCoupleStatus,
  toCouple,
  updateCouple,
} from '../db/repos/couples'
import { mediaMap, pruneUnreferenced } from '../db/repos/media'
import { readJson } from '../http/validate'
import type { AppEnv } from '../types'
import type { Db } from '../db/client'
import type { CoupleRow } from '../db/schema'

const passcode = z.string().regex(PASSCODE_PATTERN, 'Kode akses harus 4 angka')
const content = z.custom<WeddingContent>((v) => typeof v === 'object' && v !== null, 'Data undangan wajib diisi')

const createBody = z.object({
  slug: z.string(),
  defaultTheme: themeIdSchema,
  content,
  passcode: passcode.optional(),
})

const patchBody = z.object({
  expectedVersion: z.number().int().min(1),
  patch: z.object({
    slug: z.string().optional(),
    defaultTheme: themeIdSchema.optional(),
    content: content.optional(),
    passcode: passcode.optional(),
  }),
})

const statusBody = z.object({ status: z.enum(['draft', 'active']) })

async function withMedia(db: Db, row: CoupleRow) {
  return { couple: toCouple(row), media: await mediaMap(db, row.id) }
}

export function adminCouplesRoutes() {
  return new Hono<AppEnv>()
    .get('/couples', async (c) => c.json({ couples: await listCouples(c.var.db) }))

    .post('/couples', async (c) => {
      const body = await readJson(c, createBody)
      const row = await createCouple(c.var.db, body)
      return c.json({ couple: toCouple(row) }, 201)
    })

    .get('/couples/by-slug/:slug', async (c) => {
      const row = await findRowBySlug(c.var.db, c.req.param('slug'))
      if (!row) throw coupleNotFound()
      return c.json(await withMedia(c.var.db, row))
    })

    .get('/couples/:id', async (c) => c.json(await withMedia(c.var.db, await getCoupleRow(c.var.db, c.req.param('id')))))

    .patch('/couples/:id', async (c) => {
      const { expectedVersion, patch } = await readJson(c, patchBody)
      const id = c.req.param('id')
      const row = await updateCouple(c.var.db, id, patch, expectedVersion)
      // Files the saved content no longer uses are deleted (FR-013).
      if (patch.content) await pruneUnreferenced(c.var.db, c.var.media, id, collectMediaRefs(row.content))
      return c.json({ couple: toCouple(row) })
    })

    .post('/couples/:id/status', async (c) => {
      const { status } = await readJson(c, statusBody)
      return c.json({ couple: toCouple(await setCoupleStatus(c.var.db, c.req.param('id'), status)) })
    })

    .post('/couples/:id/duplicate', async (c) => {
      const row = await duplicateCouple(c.var.db, c.var.media, c.var.env.MEDIA_ROOT, c.req.param('id'))
      return c.json({ couple: toCouple(row) }, 201)
    })

    .delete('/couples/:id', async (c) => {
      await deleteCouple(c.var.db, c.var.media, c.var.env.MEDIA_ROOT, c.req.param('id'))
      return c.body(null, 204)
    })
}
