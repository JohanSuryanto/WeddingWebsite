/* eslint-disable @typescript-eslint/no-explicit-any -- JSON responses in tests are checked by assertions */
// Real Hono app + in-memory Postgres (PGlite) + local media per test file.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, expect } from 'vitest'
import { createApp } from '../../server/app'
import { hashPassword } from '../../server/auth/password'
import { createMemoryDb, type Db } from '../../server/db/client'
import type { Env } from '../../server/env'
import { LocalProvider } from '../../server/media/local'

export const ADMIN_EMAIL = 'admin@test.local'
export const ADMIN_PASSWORD = 'rahasia123'
export const PUBLIC_ORIGIN = 'http://localhost:4817'
export const ADMIN_ORIGIN = 'http://admin.localhost:4817'

let passwordHash: Promise<string> | undefined

export interface TestApp {
  app: ReturnType<typeof createApp>
  db: Db
  media: LocalProvider
  env: Env
  /** Another app on the same database with a different surface. */
  withSurface(surface: Env['API_SURFACE']): ReturnType<typeof createApp>
}

export async function makeTestApp(overrides: Partial<Env> = {}): Promise<TestApp> {
  const dir = await mkdtemp(join(tmpdir(), 'wedding-media-'))
  const { db, close } = await createMemoryDb()
  passwordHash ??= hashPassword(ADMIN_PASSWORD)
  const env: Env = {
    DATABASE_URL: 'pglite:memory',
    MEDIA_DRIVER: 'local',
    MEDIA_ROOT: 'wedding/test',
    LOCAL_MEDIA_DIR: dir,
    ADMIN_EMAIL,
    ADMIN_PASSWORD_HASH: await passwordHash,
    SESSION_SECRET: 'test-secret-test-secret-test-secret-123',
    CRON_SECRET: 'cron-test',
    PUBLIC_ORIGIN,
    ADMIN_ORIGIN,
    API_SURFACE: 'both',
    ...overrides,
  }
  const media = new LocalProvider(dir, env.SESSION_SECRET)
  afterAll(async () => {
    await close()
    await rm(dir, { recursive: true, force: true })
  })
  return {
    app: createApp(env, { db, media }),
    db,
    media,
    env,
    withSurface: (surface) => createApp({ ...env, API_SURFACE: surface }, { db, media }),
  }
}

export interface Res<T = any> {
  status: number
  json: T
  headers: Headers
  text: string
}

/** A tiny cookie-keeping client, like one browser. */
export class Client {
  cookies = new Map<string, string>()
  constructor(
    private app: { request: (input: string, init?: RequestInit) => Response | Promise<Response> },
    public origin = ADMIN_ORIGIN,
  ) {}

  get cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  async req<T = any>(
    method: string,
    path: string,
    opts: { body?: unknown; origin?: string | null; headers?: Record<string, string> } = {},
  ): Promise<Res<T>> {
    const headers: Record<string, string> = { ...opts.headers }
    if (this.cookies.size) headers.cookie = this.cookieHeader
    const origin = opts.origin === undefined ? this.origin : opts.origin
    if (origin) headers.origin = origin
    let body: BodyInit | undefined
    if (opts.body instanceof FormData) body = opts.body
    else if (opts.body !== undefined) {
      headers['content-type'] = 'application/json'
      body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)
    }
    const url = path.startsWith('http') ? path : `${this.origin}${path}`
    const res = await this.app.request(url, { method, headers, body })
    for (const line of res.headers.getSetCookie()) {
      const [pair, ...attrs] = line.split(';')
      const [name, ...rest] = pair.split('=')
      const value = rest.join('=')
      const maxAge = attrs.find((a) => a.trim().toLowerCase().startsWith('max-age='))
      if (!value || maxAge?.trim().toLowerCase() === 'max-age=0') this.cookies.delete(name.trim())
      else this.cookies.set(name.trim(), value)
    }
    const text = await res.text()
    let json: unknown
    try {
      json = text ? JSON.parse(text) : undefined
    } catch {
      json = undefined
    }
    return { status: res.status, json: json as T, headers: res.headers, text }
  }

  get = <T = any>(path: string, opts?: Parameters<Client['req']>[2]) => this.req<T>('GET', path, opts)
  post = <T = any>(path: string, body?: unknown, opts?: Parameters<Client['req']>[2]) =>
    this.req<T>('POST', path, { ...opts, body })
  patch = <T = any>(path: string, body?: unknown, opts?: Parameters<Client['req']>[2]) =>
    this.req<T>('PATCH', path, { ...opts, body })
  put = <T = any>(path: string, body?: unknown, opts?: Parameters<Client['req']>[2]) =>
    this.req<T>('PUT', path, { ...opts, body })
  del = <T = any>(path: string, opts?: Parameters<Client['req']>[2]) => this.req<T>('DELETE', path, opts)
}

/** A client that is logged in as the admin. */
export async function adminClient(t: TestApp): Promise<Client> {
  const c = new Client(t.app, ADMIN_ORIGIN)
  const res = await c.post('/api/admin/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${res.text}`)
  return c
}

/** Uploads a tiny file through the real 3-step flow and returns the media id. */
export async function uploadMedia(c: Client, coupleId: string, kind: 'image' | 'audio' = 'image') {
  const bytes = new Uint8Array([1, 2, 3, 4, 5])
  const mime = kind === 'image' ? 'image/webp' : 'audio/mpeg'
  const ticket = await c.post(`/api/admin/couples/${coupleId}/media`, { kind, mime, size: bytes.length, width: 10, height: 10 })
  expect(ticket.status, ticket.text).toBe(201)
  const { media, upload } = ticket.json
  const form = new FormData()
  for (const [k, v] of Object.entries(upload.fields as Record<string, string>)) form.set(k, v)
  form.set(upload.fileField, new Blob([bytes], { type: mime }), 'f')
  const up = await c.req('POST', upload.url, { body: form })
  expect(up.status, up.text).toBe(200)
  const done = await c.post(`/api/admin/media/${media.id}/complete`, up.json)
  expect(done.status, done.text).toBe(200)
  expect(done.json.media.status).toBe('ready')
  return media.id as string
}

