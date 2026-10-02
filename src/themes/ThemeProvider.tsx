import { createContext, useContext, useEffect, useId, type ReactNode } from 'react'
import { DEFAULT_THEME, themes } from './index'
import type { Theme, ThemeId } from './types'

const ThemeContext = createContext<{ theme: Theme; depth: number } | null>(null)

/** Mounted providers; the deepest one owns <html data-theme>. */
const active = new Map<string, { depth: number; theme: Theme }>()
let initial: { theme: string | undefined; color: string | null } | null = null

function applyDeepest() {
  const html = document.documentElement
  const meta = document.querySelector('meta[name="theme-color"]')
  let deepest: { depth: number; theme: Theme } | null = null
  for (const entry of active.values()) if (!deepest || entry.depth >= deepest.depth) deepest = entry
  if (deepest) {
    html.dataset.theme = deepest.theme.id
    meta?.setAttribute('content', deepest.theme.metaColor)
  } else if (initial) {
    if (initial.theme) html.dataset.theme = initial.theme
    else delete html.dataset.theme
    if (initial.color) meta?.setAttribute('content', initial.color)
    initial = null
  }
}

/**
 * Applies a theme to the page (<html data-theme>, mobile browser color) and
 * makes it available to ornaments via useTheme(). When providers are nested
 * (admin chrome → a couple's page), the innermost one wins.
 */
export function ThemeProvider({ themeId, children }: { themeId: ThemeId; children: ReactNode }) {
  const theme = themes[themeId] ?? themes[DEFAULT_THEME]
  const parent = useContext(ThemeContext)
  const depth = (parent?.depth ?? 0) + 1
  const key = useId()

  useEffect(() => {
    if (active.size === 0 && !initial) {
      initial = {
        theme: document.documentElement.dataset.theme,
        color: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null,
      }
    }
    active.set(key, { depth, theme })
    applyDeepest()
    return () => {
      active.delete(key)
      applyDeepest()
    }
  }, [key, depth, theme])

  return <ThemeContext.Provider value={{ theme, depth }}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): Theme {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme() must be used inside <ThemeProvider>')
  return ctx.theme
}
