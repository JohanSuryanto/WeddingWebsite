import { useEffect, useMemo, useRef, useState } from 'react'
import { MusicProvider, useMusic } from '../components/MusicProvider'
import { MusicToggle } from '../components/MusicToggle'
import { Navigation, type NavItem } from '../components/Navigation'
import { NAV_ICONS } from '../components/navIcons'
import { ToastProvider } from '../components/Toast'
import { orderedCouple } from '../content/selectors'
import type { WeddingContent } from '../content/types'
import { useTheme } from '../themes'
import { Closing } from './sections/Closing'
import { Couple } from './sections/Couple'
import { Cover } from './sections/Cover'
import { Events } from './sections/Events'
import { Gallery } from './sections/Gallery'
import { Gift } from './sections/Gift'
import { Hero } from './sections/Hero'
import { Rsvp } from './sections/Rsvp'
import { Story } from './sections/Story'
import { Wishes } from './sections/Wishes'
import { useWedding } from './WeddingProvider'

const COVER_EXIT_MS = 700

/** Navigation entries; sections without content are left out. */
function navItemsFor(wedding: WeddingContent): NavItem[] {
  return (
    [
      ['beranda', 'Beranda', true],
      ['mempelai', 'Mempelai', true],
      ['acara', 'Acara', true],
      ['cerita', 'Cerita', !!wedding.story?.length],
      ['galeri', 'Galeri', !!wedding.gallery?.length],
      ['hadiah', 'Hadiah', !!wedding.gifts],
      ['rsvp', 'RSVP', true],
      ['ucapan', 'Ucapan', true],
    ] as const
  )
    .filter(([, , shown]) => shown)
    .map(([id, label]) => ({ id, label, icon: NAV_ICONS[id] }))
}

function prefersReducedMotion() {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function InvitationBody({ skipCover }: { skipCover: boolean }) {
  const wedding = useWedding()
  const { play } = useMusic()
  const { AmbientEffect } = useTheme().ornaments
  const [coverState, setCoverState] = useState<'shown' | 'leaving' | 'gone'>(
    skipCover ? 'gone' : 'shown',
  )
  const mainRef = useRef<HTMLElement>(null)
  const opened = coverState !== 'shown'
  const navItems = useMemo(() => navItemsFor(wedding), [wedding])

  // Lock page scroll while the cover is shown.
  useEffect(() => {
    document.body.style.overflow = coverState === 'gone' ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [coverState])

  // After the cover is gone: focus main and go to the requested anchor.
  useEffect(() => {
    if (coverState !== 'gone' || skipCover) return
    mainRef.current?.focus({ preventScroll: true })
    const hash = window.location.hash.slice(1)
    if (navItems.some((i) => i.id === hash)) document.getElementById(hash)?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [coverState, navItems, skipCover])

  function handleOpen() {
    // Must run synchronously inside the click for autoplay to be allowed.
    play()
    if (prefersReducedMotion()) {
      setCoverState('gone')
      return
    }
    setCoverState('leaving')
    window.setTimeout(() => setCoverState('gone'), COVER_EXIT_MS)
  }

  return (
    <>
      {coverState !== 'gone' && <Cover onOpen={handleOpen} leaving={coverState === 'leaving'} />}
      {opened && (
        <>
          {AmbientEffect && <AmbientEffect />}
          <Navigation items={navItems} />
          <main ref={mainRef} tabIndex={-1} className="pb-16 outline-none md:pt-14 md:pb-0">
            <Hero />
            <Couple />
            <Events />
            <Story />
            <Gallery />
            <Gift />
            <Rsvp />
            <Wishes />
            <Closing />
          </main>
          <MusicToggle />
        </>
      )}
    </>
  )
}

/**
 * A couple's full invitation. Expects <ThemeProvider>, <WeddingProvider> and
 * <ServicesProvider> around it.
 */
export function Invitation({ skipCover = false }: { skipCover?: boolean }) {
  const wedding = useWedding()

  useEffect(() => {
    const [first, second] = orderedCouple(wedding)
    document.title = `The Wedding of ${first.nickname} & ${second.nickname}`
  }, [wedding])

  return (
    <MusicProvider track={wedding.music}>
      <ToastProvider>
        {/* Remount when switching cover/contents so the cover state resets. */}
        <InvitationBody key={skipCover ? 'contents' : 'cover'} skipCover={skipCover} />
      </ToastProvider>
    </MusicProvider>
  )
}
