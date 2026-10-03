// /api/admin/*media* and /api/admin/usage (contracts/api.md § Media, contracts/media-upload.md).
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { checkMediaLimits, maxBytesFor } from '../../src/data/mediaLimits'
import { getCoupleRow } from '../db/repos/couples'
import {
  createPending,
  deleteMediaRows,
  getMedia,
  markReady,
  pruneUnreferenced,
  toInfo,
} from '../db/repos/media'
import type { Db } from '../db/client'
import { limitExceeded, notFound, validation } from '../http/errors'
import { readJson } from '../http/validate'
import { keyFor, UploadVerificationError } from '../media/provider'
import type { AppEnv } from '../types'

const ticketBody = z.object({
  kind: z.enum(['image', 'audio']),
  mime: z.string().max(100),
  size: z.number().int().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  /** Restore only: reuse an existing pending row or keep the backup's id. */
  id: z.uuid().optional(),
})

const pruneBody = z.object({ referenced: z.array(z.string()).max(500) })

const mediaNotFound = () => notFound('Media tidak ditemukan')

/** Database size for the usage meter (FR-014). Neon Free: 1 GB. */
async function databaseBytes(db: Db): Promise<number> {
  try {
    const result = (await db.execute(sql`select pg_database_size(current_database())::bigint as size`)) as unknown as
      | { rows?: { size: string | number }[] }
      | { size: string | number }[]
    const rows = Array.isArray(result) ? result : (result.rows ?? [])
    return Number(rows[0]?.size ?? 0)
  } catch {
    return 0
  }
}

export function adminMediaRoutes() {
  return new Hono<AppEnv>()
    .post('/couples/:id/media', async (c) => {
      const body = await readJson(c, ticketBody)
      const couple = await getCoupleRow(c.var.db, c.req.param('id'))
      const problem = checkMediaLimits(body.kind, body.mime, body.size)
      if (problem) throw limitExceeded(problem)
      const keyOf = (mediaId: string) => keyFor(c.var.env.MEDIA_ROOT, couple.id, mediaId)

      let row = body.id ? await getMedia(c.var.db, body.id) : undefined
      if (row && (row.coupleId !== couple.id || row.status !== 'pending')) {
        throw validation('Media ini sudah ada')
      }
      row ??= await createPending(
        c.var.db,
        { coupleId: couple.id, kind: body.kind, mime: body.mime, size: body.size, width: body.width, height: body.height },
        keyOf,
        body.id,
      )
      const upload = c.var.media.createUploadTicket(row.providerKey, row.kind, maxBytesFor(row.kind))
      return c.json({ media: toInfo(row), upload }, 201)
    })

    .post('/media/:id/complete', async (c) => {
      const row = await getMedia(c.var.db, c.req.param('id'))
      if (!row) throw mediaNotFound()
      if (row.status === 'ready') return c.json({ media: toInfo(row) })
      let result: unknown
      try {
        result = await c.req.json()
      } catch {
        throw validation('Hasil unggahan tidak valid')
      }
      let verified
      try {
        verified = await c.var.media.verifyUpload(row.providerKey, result)
      } catch (err) {
        if (err instanceof UploadVerificationError) throw validation(err.message)
        throw err
      }
      // The provider can't enforce our limit, so check the stored size again.
      if (verified.bytes > maxBytesFor(row.kind)) {
        await deleteMediaRows(c.var.db, c.var.media, [row])
        throw limitExceeded('Ukuran maksimal 10 MB')
      }
      return c.json({ media: toInfo(await markReady(c.var.db, row.id, verified)) })
    })

    .delete('/media/:id', async (c) => {
      const row = await getMedia(c.var.db, c.req.param('id'))
      if (!row) throw mediaNotFound()
      await deleteMediaRows(c.var.db, c.var.media, [row])
      return c.body(null, 204)
    })

    .post('/couples/:id/media/prune', async (c) => {
      const { referenced } = await readJson(c, pruneBody)
      const couple = await getCoupleRow(c.var.db, c.req.param('id'))
      const removed = await pruneUnreferenced(c.var.db, c.var.media, couple.id, new Set(referenced))
      return c.json({ removed })
    })

    .get('/usage', async (c) => {
      const media = await c.var.media.usage()
      const dbBytes = await databaseBytes(c.var.db)
      const dbLimit = 1024 ** 3
      return c.json({
        media: { ...media, warn: media.limit > 0 && media.used / media.limit >= 0.8 },
        database: { usedBytes: dbBytes, limitBytes: dbLimit, warn: dbBytes / dbLimit >= 0.8 },
      })
    })
}

