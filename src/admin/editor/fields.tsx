import type { ReactNode } from 'react'
import { useFormContext, useFormState, type FieldPath } from 'react-hook-form'
import type { CoupleFormValues } from './formModel'

type Path = FieldPath<CoupleFormValues>

function errorAt(errors: unknown, path: string): string | undefined {
  let node: unknown = errors
  for (const key of path.split('.')) {
    if (!node || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[key]
  }
  const n = node as { message?: unknown; root?: { message?: unknown } } | undefined
  const message = n?.message ?? n?.root?.message
  return typeof message === 'string' ? message : undefined
}

/** Error message for a form path (also array-level "root" errors). */
// eslint-disable-next-line react-refresh/only-export-components
export function useFieldError(path: string): string | undefined {
  const { errors } = useFormState<CoupleFormValues>()
  return errorAt(errors, path)
}

function idOf(path: string) {
  return `f-${path.replace(/\./g, '-')}`
}

export function FieldShell({
  path,
  label,
  hint,
  required,
  children,
}: {
  path: string
  label: string
  hint?: ReactNode
  required?: boolean
  children: (props: { id: string; invalid: boolean; describedBy?: string }) => ReactNode
}) {
  const error = useFieldError(path)
  const id = idOf(path)
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-bold text-text">
          {label}
          {required && <span className="text-[#a33a50]"> *</span>}
        </label>
        {hint}
      </div>
      {children({ id, invalid: !!error, describedBy: error ? `${id}-error` : undefined })}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextField({
  path,
  label,
  required,
  placeholder,
  maxLength,
  type = 'text',
  className = '',
}: {
  path: Path
  label: string
  required?: boolean
  placeholder?: string
  maxLength?: number
  type?: string
  className?: string
}) {
  const { register } = useFormContext<CoupleFormValues>()
  return (
    <FieldShell path={path} label={label} required={required}>
      {({ id, invalid, describedBy }) => (
        <input
          id={id}
          type={type}
          className={`field ${className}`}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          {...register(path)}
        />
      )}
    </FieldShell>
  )
}

export function TextArea({
  path,
  label,
  required,
  rows = 4,
  maxLength,
  hint,
}: {
  path: Path
  label: string
  required?: boolean
  rows?: number
  maxLength?: number
  hint?: ReactNode
}) {
  const { register } = useFormContext<CoupleFormValues>()
  return (
    <FieldShell path={path} label={label} required={required} hint={hint}>
      {({ id, invalid, describedBy }) => (
        <textarea
          id={id}
          rows={rows}
          className="field resize-y"
          maxLength={maxLength}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          {...register(path)}
        />
      )}
    </FieldShell>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-4 p-4 sm:p-5">
      <h2 className="text-xl text-text">{title}</h2>
      {children}
    </section>
  )
}

/** ↑ ↓ Hapus controls for an item in a list. */
export function ItemControls({
  index,
  count,
  onMove,
  onRemove,
  label,
  canRemove = true,
}: {
  index: number
  count: number
  onMove: (from: number, to: number) => void
  onRemove: () => void
  label: string
  canRemove?: boolean
}) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        className="btn-outline min-h-11 px-3 py-0 text-sm"
        aria-label={`Pindahkan ${label} ke atas`}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        ↑
      </button>
      <button
        type="button"
        className="btn-outline min-h-11 px-3 py-0 text-sm"
        aria-label={`Pindahkan ${label} ke bawah`}
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
      >
        ↓
      </button>
      <button
        type="button"
        className="btn-outline min-h-11 px-3 py-0 text-sm text-[#a33a50]"
        aria-label={`Hapus ${label}`}
        disabled={!canRemove}
        onClick={onRemove}
      >
        Hapus
      </button>
    </div>
  )
}
