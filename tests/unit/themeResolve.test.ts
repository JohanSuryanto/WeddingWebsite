import { resolveThemeId, themeCodes, themes } from '../../src/themes'

describe('resolveThemeId', () => {
  it('uses the configured theme without a preview parameter', () => {
    expect(resolveThemeId('', 'romantic-floral')).toBe('romantic-floral')
  })

  it('maps ?t= numbers to themes', () => {
    expect(resolveThemeId('?t=1', 'elegant-classic')).toBe('romantic-floral')
    expect(resolveThemeId('?t=2', 'romantic-floral')).toBe('elegant-classic')
    expect(resolveThemeId('?inv=Budi+Santoso&t=3', 'romantic-floral')).toBe('rustic-garden')
    expect(resolveThemeId('?t=%202%20', 'romantic-floral')).toBe('elegant-classic')
  })

  it('ignores unknown or unsafe values', () => {
    expect(resolveThemeId('?t=9', 'romantic-floral')).toBe('romantic-floral')
    expect(resolveThemeId('?t=__proto__', 'romantic-floral')).toBe('romantic-floral')
    expect(resolveThemeId('?t=', 'romantic-floral')).toBe('romantic-floral')
    expect(resolveThemeId('?t=elegant-classic', 'romantic-floral')).toBe('romantic-floral')
    expect(resolveThemeId('?t=rf', 'elegant-classic')).toBe('elegant-classic')
  })
})

describe('theme short codes', () => {
  it('are unique and cover every theme', () => {
    expect(Object.keys(themeCodes)).toHaveLength(Object.keys(themes).length)
  })
})
