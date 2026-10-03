import { afterEach, describe, expect, it, vi } from 'vitest'
import { anisaRaka } from '../../src/content/samples/anisa-raka/content'
import { collectMediaRefs, mediaRef, resolveMedia } from '../../src/data/resolveMedia'
import type { MediaStore } from '../../src/data/types'

function contentWith(...ids: string[]) {
  const c = structuredClone(anisaRaka)
  c.cover.background = { src: mediaRef(ids[0]), width: 1, height: 1 }
  if (ids[1]) c.couple.bride.photo = { src: mediaRef(ids[1]), width: 1, height: 1 }
  return c
}

function store(over: Partial<MediaStore>): MediaStore {
  return {
    put: vi.fn(),
    getBlob: vi.fn(async () => null),
    remove: vi.fn(),
    removeUnreferenced: vi.fn(),
    usage: vi.fn(),
    ...over,
  } as unknown as MediaStore
}

afterEach(() => vi.restoreAllMocks())

describe('resolveMedia', () => {
  it('uses delivery URLs from urlOf without downloading or revoking them', async () => {
    const getBlob = vi.fn()
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const s = store({ urlOf: (id) => `https://cdn.example/${id}`, getBlob })
    const { content, dispose } = await resolveMedia(contentWith('a'), s)
    expect(content.cover.background.src).toBe('https://cdn.example/a')
    expect(getBlob).not.toHaveBeenCalled()
    dispose()
    expect(revoke).not.toHaveBeenCalled()
  })

  it('falls back to blob: URLs and resolves missing media to an empty src', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x')
    const s = store({
      urlOf: () => undefined,
      getBlob: async (id) => (id === 'a' ? new Blob(['x']) : null),
    })
    const { content } = await resolveMedia(contentWith('a', 'b'), s)
    expect(content.cover.background.src).toBe('blob:x')
    expect(content.couple.bride.photo.src).toBe('')
    expect(collectMediaRefs(content).size).toBe(0)
  })
})
