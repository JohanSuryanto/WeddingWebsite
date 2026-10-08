import { elegantClassic } from './elegant-classic'
import { javaneseHeritage } from './javanese-heritage'
import { romanticFloral } from './romantic-floral'
import { rusticGarden } from './rustic-garden'
import type { Theme, ThemeId } from './types'

/** Theme registry. To add a theme: create src/themes/<id>/ and register it here. */
export const themes: Record<ThemeId, Theme> = {
  'romantic-floral': romanticFloral,
  'elegant-classic': elegantClassic,
  'rustic-garden': rusticGarden,
  'javanese-heritage': javaneseHeritage,
}

/** Preview short codes, e.g. `1` → romantic-floral (`?t=1`). */
export const themeCodes: Record<string, ThemeId> = Object.fromEntries(
  Object.values(themes).map((t) => [t.code, t.id]),
)

/** Used when nothing else picks a theme (e.g. the not-found page). */
export const DEFAULT_THEME: ThemeId = 'romantic-floral'

/**
 * The `?t=<code>` preview parameter wins when it matches a theme's short code;
 * otherwise the couple's default theme (`fallback`) is used.
 */
export function resolveThemeId(search: string, fallback: ThemeId = DEFAULT_THEME): ThemeId {
  const code = new URLSearchParams(search).get('t')?.trim().toLowerCase()
  return code && Object.prototype.hasOwnProperty.call(themeCodes, code)
    ? themeCodes[code]
    : fallback
}

export { ThemeProvider, useTheme } from './ThemeProvider'
