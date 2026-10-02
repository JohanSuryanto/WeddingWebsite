import type { ReactNode } from 'react'
import { DEFAULT_THEME, ThemeProvider, themes } from '../themes'
import type { ThemeId } from '../themes/types'

/** Full-screen themed message ("Undangan tidak ditemukan", …). */
export function MessagePage({
  title,
  message,
  action,
  themeId = DEFAULT_THEME,
}: {
  title: string
  message: string
  action?: ReactNode
  themeId?: ThemeId
}) {
  const { CoverBackdrop } = themes[themeId].ornaments
  return (
    <ThemeProvider themeId={themeId}>
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4 py-16 text-center">
        <CoverBackdrop />
        <div className="card relative z-[1] w-full max-w-md px-6 py-10">
          <h1 className="text-3xl text-text">{title}</h1>
          <p className="mt-3 text-muted">{message}</p>
          {action && <div className="mt-6">{action}</div>}
        </div>
      </main>
    </ThemeProvider>
  )
}
