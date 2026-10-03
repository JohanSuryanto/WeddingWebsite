import { useEffect } from 'react'
import { MessagePage } from '../../components/MessagePage'
import { DEFAULT_THEME, ThemeProvider, themes } from '../../themes'

/** Shown while an invitation loads; a quiet free server can take a few seconds to wake (SC-003). */
export function LoadingPage() {
  const { CoverBackdrop } = themes[DEFAULT_THEME].ornaments
  return (
    <ThemeProvider themeId={DEFAULT_THEME}>
      <main
        className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4"
        role="status"
        aria-live="polite"
      >
        <CoverBackdrop />
        <p className="relative z-[1] animate-pulse font-script text-3xl text-text">Memuat undangan…</p>
      </main>
    </ThemeProvider>
  )
}

/** Network or server trouble: never a blank page (FR-024). */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  useEffect(() => {
    document.title = 'Undangan sedang tidak dapat dimuat'
  }, [])
  return (
    <MessagePage
      title="Undangan sedang tidak dapat dimuat, coba lagi"
      message="Periksa koneksi internet Anda, lalu coba lagi."
      action={
        <button type="button" className="btn-primary" onClick={onRetry}>
          Coba lagi
        </button>
      }
    />
  )
}
