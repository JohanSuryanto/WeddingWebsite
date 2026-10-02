import { anisaRaka } from '../../src/content/samples/anisa-raka/content'
import { weddingContentSchema } from '../../src/data/schema'

describe('sample couple content', () => {
  it('passes every content rule', () => {
    const result = weddingContentSchema.safeParse(anisaRaka)
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true)
  })

  it('has unique event ids', () => {
    const ids = anisaRaka.events.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
