import { themes } from '../../themes'
import type { ThemeId } from '../../themes/types'

/** Three theme cards (swatches drawn with each theme's own tokens). */
export function ThemePicker({
  value,
  onChange,
  sample,
  label = 'Tema',
}: {
  value: ThemeId
  onChange: (id: ThemeId) => void
  sample: string
  label?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-3 sm:grid-cols-3">
      {Object.values(themes).map((t) => {
        const selected = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(t.id)}
            data-theme={t.id}
            className={`overflow-hidden rounded-xl border-2 text-left transition-shadow ${
              selected
                ? 'border-accent shadow-card'
                : 'border-transparent opacity-80 hover:opacity-100'
            }`}
          >
            <span className="flex h-16 items-center justify-center bg-bg px-2">
              <span className="truncate font-script text-2xl text-text">{sample}</span>
            </span>
            <span className="flex items-center gap-2 bg-surface px-3 py-2">
              <span className="h-4 w-4 rounded-full bg-primary" />
              <span className="h-4 w-4 rounded-full bg-accent" />
              <span className="h-4 w-4 rounded-full border border-black/10 bg-surface-alt" />
              <span className="ml-auto font-heading text-sm font-semibold text-text">
                {t.code}. {t.name}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
