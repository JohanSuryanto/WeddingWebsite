import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import type { Wish } from '../../content/types'
import { orderedCouple } from '../../content/selectors'
import { advance, emptySlideshow, mergeNewest, withLatest } from '../../lib/slideshow'
import { createHttpWishService } from '../../services/http'
import { resolveThemeId, ThemeProvider, useTheme } from '../../themes'
import { useCouple } from '../useCouple'
import { LoadError, LoadingPage } from './LoadState'
import { NotFound } from './NotFound'
import { Unavailable } from './Unavailable'

const SHOW_MS = 8000
const REFRESH_MS = 15_000
const MAX_PAGES = 10 // 200 wishes

/**
 * /:slug/ucapan — guests' wishes, one at a time, full screen for a TV or projector
 * at the venue. Shows the same public wishes as the invitation (never hidden
 * ones), so it needs no passcode; new wishes appear next.
 */
export function WishesSlideshow() {
  const { slug = '' } = useParams()
  const { search } = useLocation()
  const state = useCouple(slug)

  if (state.status === 'loading') return <LoadingPage />
  if (state.status === 'not-found') return <NotFound />
  if (state.status === 'draft') return <Unavailable />
  if (state.status === 'error') return <LoadError onRetry={state.retry} />
  const [first, second] = orderedCouple(state.couple.content)
  return (
    <ThemeProvider themeId={resolveThemeId(search, state.couple.defaultTheme)}>
      <Slideshow slug={slug} names={[first.nickname, second.nickname]} />
    </ThemeProvider>
  )
}

function Slideshow({ slug, names }: { slug: string; names: [string, string] }) {
  const { CoverBackdrop, SectionDivider } = useTheme().ornaments
  const service = useMemo(() => createHttpWishService(slug), [slug])
  const [wishes, setWishes] = useState(new Map<string, Wish>())
  const [show, setShow] = useState(emptySlideshow)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    document.title = `Ucapan · ${names[0]} & ${names[1]}`
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.appendChild(robots)
    return () => robots.remove()
  }, [names])

  // Everything once, then the newest page every REFRESH_MS. A failed refresh just waits for the next.
  useEffect(() => {
    let active = true
    /** `complete`: these are all the wishes there are (no further page). */
    async function load(all: boolean) {
      const items: Wish[] = []
      let cursor: string | undefined
      for (let page = 0; page < (all ? MAX_PAGES : 1); page++) {
        const res = await service.list(cursor)
        items.push(...res.items)
        if (!res.nextCursor) return { items, complete: true }
        cursor = res.nextCursor
      }
      return { items, complete: false }
    }
    async function refresh(firstLoad: boolean) {
      try {
        const { items: latest, complete } = await load(firstLoad)
        if (!active) return
        setWishes((prev) => {
          const next = firstLoad ? new Map<string, Wish>() : new Map(prev)
          for (const w of latest) next.set(w.id, w)
          return next
        })
        setShow((s) => {
          const newest = latest.map((w) => w.id)
          const ids = firstLoad || complete ? newest : mergeNewest(newest, s.ids)
          const updated = withLatest(s, ids, firstLoad)
          return updated.current ? updated : advance(updated)
        })
      } catch {
        // Offline for a moment at the venue: keep showing what we have.
      }
    }
    void refresh(true)
    const id = window.setInterval(() => void refresh(false), REFRESH_MS)
    return () => {
      active = false
      window.clearInterval(id)
    }
  }, [service])

  useEffect(() => {
    const id = window.setInterval(() => setShow((s) => advance(s)), SHOW_MS)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const wish = show.current ? wishes.get(show.current) : undefined

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-6 py-10 text-center">
      <CoverBackdrop />
      {!fullscreen && document.fullscreenEnabled && (
        <button
          type="button"
          className="btn-outline absolute top-4 right-4 z-[2] text-sm opacity-70 hover:opacity-100"
          onClick={() => void document.documentElement.requestFullscreen().catch(() => {})}
        >
          Layar penuh
        </button>
      )}
      <div className="relative z-[1] w-full max-w-5xl">
        <p className="font-heading text-lg tracking-[0.3em] text-muted uppercase sm:text-xl">Ucapan &amp; Doa</p>
        <h1 className="mt-2 font-script text-5xl text-text sm:text-7xl">
          {names[0]} <span className="text-accent">&amp;</span> {names[1]}
        </h1>
        <SectionDivider />
        <div aria-live="polite" className="mt-6 flex min-h-[40vh] items-center justify-center">
          {wish ? (
            <figure
              key={wish.id}
              data-testid="slideshow-wish"
              className="motion-safe:[animation:var(--theme-anim-reveal)_1s_ease-out_both]"
            >
              <blockquote
                className={`font-body leading-snug break-words whitespace-pre-line text-text ${messageSize(wish.message)}`}
              >
                &ldquo;{wish.message}&rdquo;
              </blockquote>
              <figcaption className="mt-6 text-xl font-bold text-muted sm:text-2xl">— {wish.name}</figcaption>
            </figure>
          ) : (
            <p className="font-heading text-2xl text-muted sm:text-3xl" data-testid="slideshow-empty">
              Ucapan dari para tamu akan tampil di sini.
            </p>
          )}
        </div>
      </div>
      <p className="relative z-[1] mt-6 text-sm text-muted" data-testid="slideshow-count">
        {show.ids.length} ucapan
      </p>
    </main>
  )
}

/** Smaller type for longer wishes (up to 500 characters), so each fits on one screen. */
function messageSize(message: string): string {
  if (message.length > 300) return 'text-lg sm:text-2xl lg:text-3xl'
  if (message.length > 150) return 'text-xl sm:text-3xl lg:text-4xl'
  return 'text-2xl sm:text-4xl lg:text-5xl'
}
