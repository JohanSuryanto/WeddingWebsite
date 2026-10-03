import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, onUnauthorized } from '../../src/data/http/client'
import {
  ConflictError,
  LockedOutError,
  NetworkError,
  NotFoundError,
  RateLimitedError,
  SessionExpiredError,
  SlugTakenError,
  UnavailableError,
} from '../../src/data/types'
import { ValidationError } from '../../src/services/types'

function respond(status: number, body?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      body === undefined
        ? new Response(null, { status })
        : new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
    ),
  )
}

const err = (code: string, extra: Record<string, unknown> = {}) => ({
  error: { code, message: `pesan ${code}`, ...extra },
})

afterEach(() => vi.unstubAllGlobals())

describe('apiFetch', () => {
  it('returns JSON on success and undefined on 204', async () => {
    respond(200, { ok: 1 })
    await expect(apiFetch('/x')).resolves.toEqual({ ok: 1 })
    respond(204)
    await expect(apiFetch('/x')).resolves.toBeUndefined()
  })

  it('sends JSON bodies same-origin under /api', async () => {
    respond(200, {})
    await apiFetch('/admin/couples', { method: 'POST', body: { a: 1 } })
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/api/admin/couples')
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', body: '{"a":1}' })
  })

  it.each([
    [400, 'invalid_body', ValidationError],
    [413, 'too_large', ValidationError],
    [422, 'not_publishable', ValidationError],
    [401, 'unauthenticated', SessionExpiredError],
    [403, 'unavailable', UnavailableError],
    [404, 'not_found', NotFoundError],
    [409, 'conflict', ConflictError],
    [409, 'slug_taken', SlugTakenError],
    [423, 'locked', LockedOutError],
    [429, 'rate_limited', RateLimitedError],
    [500, 'internal', NetworkError],
  ])('maps %i %s', async (status, code, cls) => {
    respond(status, err(code, { retryAt: '2030-01-01T00:00:00.000Z', fields: { name: 'x' } }))
    const e = await apiFetch('/public/x').catch((x) => x)
    expect(e).toBeInstanceOf(cls)
  })

  it('keeps the server message, code and fields on validation errors', async () => {
    respond(422, err('not_publishable', { fields: { slug: 'Wajib' } }))
    const e = (await apiFetch('/admin/x').catch((x) => x)) as ValidationError
    expect(e.message).toBe('pesan not_publishable')
    expect(e.code).toBe('not_publishable')
    expect(e.fieldErrors).toEqual({ slug: 'Wajib' })
  })

  it('carries retryAt on lockouts', async () => {
    respond(423, err('locked', { retryAt: '2030-01-01T00:00:00.000Z' }))
    const e = (await apiFetch('/admin/login').catch((x) => x)) as LockedOutError
    expect(e.retryAt.toISOString()).toBe('2030-01-01T00:00:00.000Z')
  })

  it('maps network failures to NetworkError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(apiFetch('/x')).rejects.toBeInstanceOf(NetworkError)
  })

  it('notifies onUnauthorized for admin 401s except login', async () => {
    const spy = vi.fn()
    const off = onUnauthorized(spy)
    respond(401, err('unauthenticated'))
    await apiFetch('/admin/couples').catch(() => {})
    respond(401, err('unauthenticated'))
    await apiFetch('/admin/login', { method: 'POST' }).catch(() => {})
    respond(401, err('unauthenticated'))
    await apiFetch('/couple/x/responses').catch(() => {})
    expect(spy).toHaveBeenCalledTimes(1)
    off()
  })
})
