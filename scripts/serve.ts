// Serves the two production builds like the real hosts do, plus the API:
//   admin.localhost:<port> → dist/admin (fallback admin.html), /api → admin API
//   localhost:<port>       → dist/public (fallback index.html), /api → public API
// Reads .env.local (or the environment Playwright passes) for the API.
// Usage: tsx scripts/serve.ts [port]
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { getRequestListener } from '@hono/node-server'
import { createApp } from '../server/app'
import { migrateDb } from '../server/db/client'
import { loadEnv, loadEnvFileIfPresent } from '../server/env'

const port = Number(process.argv[2] ?? process.env.PORT ?? 4817)
const root = resolve('dist')
loadEnvFileIfPresent()
const env = loadEnv()
await migrateDb(env.DATABASE_URL)
const adminApi = getRequestListener(createApp({ ...env, API_SURFACE: 'admin' }).fetch)
const publicApi = getRequestListener(createApp({ ...env, API_SURFACE: 'public' }).fetch)

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
}

// Text files are gzipped like real hosts do, so load-time tests see realistic sizes.
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt'])
const gzipCache = new Map<string, Buffer>()

createServer((req, res) => {
  const admin = (req.headers.host ?? '').toLowerCase().startsWith('admin.')
  if (req.url === '/api' || req.url?.startsWith('/api/')) {
    void (admin ? adminApi : publicApi)(req, res)
    return
  }
  const dir = join(root, admin ? 'admin' : 'public')
  const fallback = join(dir, admin ? 'admin.html' : 'index.html')
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0])
  let file = normalize(join(dir, urlPath))
  if (!file.startsWith(dir)) {
    res.writeHead(403).end()
    return
  }
  if (!existsSync(file) || statSync(file).isDirectory()) {
    // Missing assets are real 404s; page routes fall back to the app shell.
    if (extname(urlPath)) {
      res.writeHead(404).end('Not found')
      return
    }
    file = fallback
  }
  const headers = {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': file === fallback ? 'no-cache' : 'public, max-age=3600',
    'Accept-Ranges': 'bytes',
  }
  const size = statSync(file).size
  // Byte ranges, as real hosts do; Safari/WebKit needs them to play audio.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '')
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
    if (start > end || start >= size) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end()
      return
    }
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
    })
    createReadStream(file, { start, end }).pipe(res)
    return
  }
  if (COMPRESSIBLE.has(extname(file)) && String(req.headers['accept-encoding'] ?? '').includes('gzip')) {
    let body = gzipCache.get(file)
    if (!body) {
      body = gzipSync(readFileSync(file))
      gzipCache.set(file, body)
    }
    res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding', 'Content-Length': body.length })
    res.end(body)
    return
  }
  res.writeHead(200, { ...headers, 'Content-Length': size })
  createReadStream(file).pipe(res)
}).listen(port, () => {
  console.log(`public: http://localhost:${port}`)
  console.log(`admin:  http://admin.localhost:${port}`)
})
