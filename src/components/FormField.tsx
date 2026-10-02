import type { ReactNode } from 'react'

interface Props {
  id: string
  label: string
  error?: string
  hint?: ReactNode
  children: ReactNode
}

/** Label + control + inline error. Controls should set aria-describedby={`${id}-error`}. */
export function FormField({ id, label, error, hint, children }: Props) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-bold text-text">
          {label}
        </label>
        {hint}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
