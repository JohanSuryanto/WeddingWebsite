import { useMusic } from './MusicProvider'

export function MusicToggle() {
  const { available, isPlaying, toggle } = useMusic()
  if (!available) return null
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isPlaying ? 'Jeda musik' : 'Putar musik'}
      aria-pressed={isPlaying}
      className="fixed right-4 bottom-24 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-contrast shadow-card md:right-6 md:bottom-6"
    >
      {isPlaying ? (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 animate-[spin_4s_linear_infinite] motion-reduce:animate-none"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
          <path d="M12 3a9 9 0 0 1 9 9" strokeOpacity="0.5" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
          <path d="M3 3l18 18" />
        </svg>
      )}
    </button>
  )
}
