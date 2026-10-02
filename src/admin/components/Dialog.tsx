import { useEffect, useRef, type ReactNode } from 'react'

/** Accessible modal: focus moves in, Esc closes, Tab stays inside. */
export function Dialog({
  title,
  onClose,
  children,
  actions,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  actions: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const node = ref.current
    const focusables = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea, select, a[href]',
        ) ?? [],
      )
    focusables()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return
      const items = focusables()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="card w-full max-w-md p-6"
      >
        <h2 id="dialog-title" className="text-2xl text-text">
          {title}
        </h2>
        <div className="mt-3 text-text">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">{actions}</div>
      </div>
    </div>
  )
}
