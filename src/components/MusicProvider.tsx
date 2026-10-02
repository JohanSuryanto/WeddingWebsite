import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { MusicTrack } from '../content/types'

interface MusicContextValue {
  available: boolean
  isPlaying: boolean
  /** Must be called synchronously inside a user gesture (autoplay rules). */
  play: () => void
  toggle: () => void
}

const MusicContext = createContext<MusicContextValue>({
  available: false,
  isPlaying: false,
  play: () => {},
  toggle: () => {},
})

export function MusicProvider({ track, children }: { track?: MusicTrack; children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  /** True when music was paused because the page was hidden (not by the guest). */
  const pausedByHiding = useRef(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  const play = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    try {
      const result = audio.play()
      // Blocked or missing file: stay paused silently.
      result?.catch(() => setIsPlaying(false))
    } catch {
      setIsPlaying(false)
    }
  }, [])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    pausedByHiding.current = false
    if (audio.paused) play()
    else audio.pause()
  }, [play])

  // Pause while the guest is in another tab/app; resume only if we paused it.
  useEffect(() => {
    const onVisibilityChange = () => {
      const audio = audioRef.current
      if (!audio) return
      if (document.hidden) {
        if (!audio.paused) {
          pausedByHiding.current = true
          audio.pause()
        }
      } else if (pausedByHiding.current) {
        pausedByHiding.current = false
        play()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [play])

  const available = !!track && !failed
  return (
    <MusicContext.Provider value={{ available, isPlaying, play, toggle }}>
      {track && (
        <audio
          ref={audioRef}
          src={track.src}
          loop
          preload="none"
          aria-label={track.title}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => {
            setFailed(true)
            setIsPlaying(false)
          }}
        />
      )}
      {children}
    </MusicContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMusic() {
  return useContext(MusicContext)
}
