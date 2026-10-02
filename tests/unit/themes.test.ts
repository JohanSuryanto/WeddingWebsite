import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEFAULT_THEME, themes } from '../../src/themes'
import { REQUIRED_TOKENS } from '../../src/themes/types'

describe('theme conformance', () => {
  it('registers the default theme', () => {
    expect(themes[DEFAULT_THEME]).toBeDefined()
  })

  for (const [id, theme] of Object.entries(themes)) {
    describe(id, () => {
      it('id matches its registry key', () => {
        expect(theme.id).toBe(id)
      })

      it('provides required ornament slots', () => {
        expect(theme.ornaments.CoverBackdrop).toBeTypeOf('function')
        expect(theme.ornaments.SectionDivider).toBeTypeOf('function')
      })

      it('defines every required token in tokens.css', () => {
        const css = readFileSync(resolve(__dirname, `../../src/themes/${id}/tokens.css`), 'utf8')
        expect(css).toContain(`[data-theme='${id}']`)
        for (const token of REQUIRED_TOKENS) {
          expect(css, `missing ${token}`).toMatch(new RegExp(`${token}\\s*:`))
        }
      })
    })
  }
})
