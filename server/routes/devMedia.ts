// Local media for dev/tests only (mounted when MEDIA_DRIVER=local).
// POST /dev/media/upload/<key>  stands in for Cloudinary's upload endpoint.
// GET  /dev/media/<key>         serves the file, with byte ranges (WebKit audio).
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { Hono } from 'hono'
import { notFound, validation } from '../http/errors'
import { safeEqual } from '../http/cookies'
import { LocalProvider } from '../media/local'
import type { AppEnv } from '../types'

export function devMediaRoutes() {
  const r = new Hono<AppEnv>()

  r.post('/upload/*', async (c) => {
    const media = c.var.media
    if (!(media instanceof LocalProvider)) throw notFound()
    const key = c.req.path.replace(/^.*\/dev\/media\/upload\//, '')
    const body = await c.req.parseBody()
    const maxBytes = Number(body.maxBytes)
    const exp = Number(body.exp)
    const sig = String(body.sig ?? '')
    if (!safeEqual(sig, media.ticketSignature(key, maxBytes, exp))) throw validation('Tiket unggahan tidak valid')
    if (Date.now() > exp) throw validation('Tiket unggahan kedaluwarsa')
    const file = body.file
    if (!(file instanceof File)) throw validation('File tidak ditemukan')
    if (file.size > maxBytes) throw validation('Ukuran maksimal 10 MB')
    const stored = await media.store(key, new Uint8Array(await file.arrayBuffer()), file.type || 'application/octet-stream')
    return c.json(stored)
  })

  r.get('/*', async (c) => {
    const media = c.var.media
    if (!(media instanceof LocalProvider)) throw notFound()
    const key = c.req.path.replace(/^.*\/dev\/media\//, '')
    let path: string
    try {
      path = media.path(key)
    } catch {
      throw notFound()
    }
    const sidecar = await media.readSidecar(key)
    const info = await stat(path).catch(() => null)
    if (!sidecar || !info) throw notFound()
    const size = info.size
    const headers: Record<string, string> = {
      'Content-Type': sidecar.mime,
      'Accept-Ranges': 'bytes',
      // Each key is a fresh UUID, so the content behind a URL never changes.
      'Cache-Control': 'public, max-age=31536000, immutable',
    }
    const range = /^bytes=(\d*)-(\d*)$/.exec(c.req.header('range') ?? '')
    if (range) {
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
      if (start > end || start >= size) {
        return c.body(null, 416, { 'Content-Range': `bytes */${size}` })
      }
      const stream = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream
      return c.body(stream, 206, {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(end - start + 1),
      })
    }
    const stream = Readable.toWeb(createReadStream(path)) as ReadableStream
    return c.body(stream, 200, { ...headers, 'Content-Length': String(size) })
  })

  return r
}
