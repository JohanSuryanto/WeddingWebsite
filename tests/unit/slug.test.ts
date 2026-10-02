import { slugify, toSlug, uniqueSlug, validateSlug } from '../../src/data/slug'

describe('slugify', () => {
  it('joins two nicknames', () => {
    expect(slugify('Budi', 'Sari')).toBe('budi-sari')
  })

  it('removes accents, symbols and extra spaces', () => {
    expect(slugify('  Ánísa ', 'Raka!!')).toBe('anisa-raka')
    expect(toSlug('Johan & Partner')).toBe('johan-partner')
    expect(toSlug('--Ayu   Dewi--')).toBe('ayu-dewi')
  })

  it('cuts to 40 characters without a trailing hyphen', () => {
    const s = slugify('a'.repeat(30), 'b'.repeat(30))
    expect(s.length).toBeLessThanOrEqual(40)
    expect(s.endsWith('-')).toBe(false)
  })

  it('ignores empty names', () => {
    expect(slugify('Budi', '')).toBe('budi')
  })
})

describe('validateSlug', () => {
  it('accepts clean slugs of 3–40 characters', () => {
    expect(validateSlug('abc')).toBeNull()
    expect(validateSlug('a'.repeat(40))).toBeNull()
    expect(validateSlug('budi-sari-2027')).toBeNull()
  })

  it('rejects bad format, length and reserved names', () => {
    expect(validateSlug('Budi Sari')).toBe('Hanya huruf kecil, angka dan tanda hubung')
    expect(validateSlug('budi--sari')).toBe('Hanya huruf kecil, angka dan tanda hubung')
    expect(validateSlug('-budi')).toBe('Hanya huruf kecil, angka dan tanda hubung')
    expect(validateSlug('ab')).toBe('Minimal 3 dan maksimal 40 karakter')
    expect(validateSlug('a'.repeat(41))).toBe('Minimal 3 dan maksimal 40 karakter')
    for (const r of ['send-invitation', 'login', 'dashboard', 'admin', 'api', 'tema']) {
      expect(validateSlug(r)).toBe('Nama alamat ini dipakai oleh sistem')
    }
  })
})

describe('uniqueSlug', () => {
  it('appends -salinan, then -salinan-2, …', async () => {
    const taken = new Set(['budi-sari-salinan', 'budi-sari-salinan-2'])
    expect(await uniqueSlug('budi-sari', (s) => taken.has(s))).toBe('budi-sari-salinan-3')
    expect(await uniqueSlug('xyz', () => false)).toBe('xyz-salinan')
  })

  it('stays within 40 characters', async () => {
    const s = await uniqueSlug('a'.repeat(40), () => false)
    expect(s.length).toBeLessThanOrEqual(40)
    expect(validateSlug(s)).toBeNull()
  })
})
