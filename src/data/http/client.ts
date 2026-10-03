// Same-origin JSON client for /api (contracts/data-layer.md). Maps the server's
// error envelope to the error classes screens already understand.
import { ValidationError, type FieldErrors } from '../../services/types'
import {
  ConflictError,
  LockedOutError,
  NetworkError,
  NotFoundError,
  RateLimitedError,
  SessionExpiredError,
  SlugTakenError,
  UnavailableError,
} from '../types'

export const API_TIMEOUT_MS = 12_000

export interface ApiErrorBody {
  code: string
  message: string
  fields?: FieldErrors
  retryAt?: string
  [extra: string]: unknown
}

type Listener = () => void
const unauthorizedListeners = new Set<Listener>()

/** Fires when any /admin/ call gets 401 (session expired), e.g. to open the re-login dialog. */
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

/** Turns an error response into the matching error class. */
export function toError(status: number, body: ApiErrorBody | undefined, path: string): Error {
  const code = body?.code ?? ''
  const message = body?.message ?? ''
  const retryAt = body?.retryAt ? new Date(body.retryAt) : new Date(Date.now() + 60_000)
  if (status === 401) {
    if (path.startsWith('/admin/') && !path.startsWith('/admin/login')) unauthorizedListeners.forEach((l) => l())
    return new SessionExpiredError(message || undefined)
  }
  if (status === 403 && code === 'unavailable') return new UnavailableError(message || undefined)
  if (status === 404) return new NotFoundError(message || undefined)
  if (status === 409 && code === 'slug_taken') return new SlugTakenError(message || undefined)
  if (status === 409) return new ConflictError(message || undefined)
  if (status === 423) return new LockedOutError(retryAt, message || undefined)
  if (status === 429) return new RateLimitedError(retryAt, message || undefined)
  if (status === 400 || status === 413 || status === 422 || status === 403) {
    return new ValidationError(body?.fields ?? {}, message || 'Data tidak valid', code || undefined)
  }
  return new NetworkError()
}

export interface ApiFetchInit {
  method?: string
  body?: unknown
  signal?: AbortSignal
}

/** fetch('/api' + path) with JSON in and out, a 12 s timeout and mapped errors. */
export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(API_TIMEOUT_MS)
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal,
    })
  } catch (err) {
    // A caller's own abort stays an AbortError; timeouts and network failures become NetworkError.
    if (init.signal?.aborted) throw err
    throw new NetworkError()
  }
  if (res.status === 204) return undefined as T
  let data: unknown
  try {
    data = await res.json()
  } catch {
    data = undefined
  }
  if (!res.ok) {
    if (res.status >= 500) throw new NetworkError()
    throw toError(res.status, (data as { error?: ApiErrorBody } | undefined)?.error, path)
  }
  return data as T
}
