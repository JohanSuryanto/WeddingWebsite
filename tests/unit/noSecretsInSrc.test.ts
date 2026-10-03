// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** Browser code ships to every visitor: it must never read server settings. */
const ALLOWED_VITE_KEYS = new Set(['VITE_PUBLIC_SITE_URL', 'DEV', 'PROD', 'MODE', 'BASE_URL', 'SSR'])

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('src/ (browser code)', () => {
  const sources = files('src').map((path) => ({ path, code: readFileSync(path, 'utf8') }))

  it('never reads process.env', () => {
    expect(sources.filter((s) => /\bprocess\.env\b/.test(s.code)).map((s) => s.path)).toEqual([])
  })

  it('only reads public import.meta.env keys', () => {
    const used = sources.flatMap((s) => [...s.code.matchAll(/import\.meta\.env\.([A-Z_]+)/g)].map((m) => m[1]))
    expect(used.filter((k) => !ALLOWED_VITE_KEYS.has(k))).toEqual([])
  })

  it('never imports server code', () => {
    expect(sources.filter((s) => /from ['"][./]*\/?(server|api)\//.test(s.code)).map((s) => s.path)).toEqual([])
  })
})
