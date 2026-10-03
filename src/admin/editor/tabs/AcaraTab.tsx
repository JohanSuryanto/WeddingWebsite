import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { fromIsoWithOffset, TIMEZONES, toIsoWithOffset } from '../../../data/dates'
import { newId } from '../../../data/ids'
import type { CoupleFormValues } from '../formModel'
import { FieldShell, ItemControls, Section, TextField, useFieldError } from '../fields'

/** Start/end pickers sharing one WIB/WITA/WIT choice. */
function EventTimes({ index }: { index: number }) {
  const { control, setValue, getValues } = useFormContext<CoupleFormValues>()
  const startPath = `content.events.${index}.start` as const
  const endPath = `content.events.${index}.end` as const

  function changeOffset(offset: string) {
    const start = fromIsoWithOffset(getValues(startPath))
    const end = fromIsoWithOffset(getValues(endPath))
    if (start.local)
      setValue(startPath, toIsoWithOffset(start.local, offset), { shouldDirty: true })
    if (end.local) setValue(endPath, toIsoWithOffset(end.local, offset), { shouldDirty: true })
  }

  return (
    <Controller
      control={control}
      name={startPath}
      render={({ field: start }) => {
        const s = fromIsoWithOffset(start.value)
        return (
          <div className="grid gap-4 sm:grid-cols-3">
            <FieldShell path={startPath} label="Mulai" required>
              {({ id, invalid, describedBy }) => (
                <input
                  id={id}
                  type="datetime-local"
                  className="field"
                  value={s.local}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  onChange={(e) => start.onChange(toIsoWithOffset(e.target.value, s.offset))}
                  onBlur={start.onBlur}
                />
              )}
            </FieldShell>
            <Controller
              control={control}
              name={endPath}
              render={({ field: end }) => (
                <FieldShell path={endPath} label="Selesai (opsional)">
                  {({ id, invalid, describedBy }) => (
                    <input
                      id={id}
                      type="datetime-local"
                      className="field"
                      value={fromIsoWithOffset(end.value).local}
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                      onChange={(e) =>
                        end.onChange(
                          e.target.value ? toIsoWithOffset(e.target.value, s.offset) : null,
                        )
                      }
                      onBlur={end.onBlur}
                    />
                  )}
                </FieldShell>
              )}
            />
            <div>
              <label htmlFor={`event-tz-${index}`} className="mb-1 block font-bold text-text">
                Zona waktu
              </label>
              <select
                id={`event-tz-${index}`}
                className="field"
                value={s.offset}
                onChange={(e) => changeOffset(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.offset} value={tz.offset}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )
      }}
    />
  )
}

export default function AcaraTab() {
  const { control, watch, setValue } = useFormContext<CoupleFormValues>()
  const { fields, append, remove, move } = useFieldArray({ control, name: 'content.events' })
  const events = watch('content.events')
  const listError = useFieldError('content.events')

  function setMain(index: number) {
    events.forEach((_, i) =>
      setValue(`content.events.${i}.isMain`, i === index, {
        shouldDirty: true,
        shouldValidate: false,
      }),
    )
  }

  return (
    <div className="space-y-4">
      {listError && (
        <p role="alert" className="field-error card mt-0 px-4 py-3 font-bold">
          {listError}
        </p>
      )}
      {fields.map((field, i) => (
        <Section key={field.id} title={events[i]?.name || `Acara ${i + 1}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 font-bold text-text">
              <input
                type="radio"
                name="main-event"
                checked={!!events[i]?.isMain}
                onChange={() => setMain(i)}
                className="h-5 w-5 accent-[var(--theme-primary)]"
              />
              Acara utama (untuk hitung mundur)
            </label>
            <ItemControls
              index={i}
              count={fields.length}
              onMove={move}
              onRemove={() => remove(i)}
              label={`acara ${i + 1}`}
              canRemove={fields.length > 1}
            />
          </div>
          <TextField path={`content.events.${i}.name`} label="Nama acara" required />
          <EventTimes index={i} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField path={`content.events.${i}.venueName`} label="Nama tempat" required />
            <TextField
              path={`content.events.${i}.mapUrl`}
              label="Link Google Maps"
              placeholder="https://maps.google.com/…"
              type="url"
            />
          </div>
          <TextField path={`content.events.${i}.address`} label="Alamat" required />
        </Section>
      ))}
      <button
        type="button"
        className="btn-outline"
        onClick={() =>
          append({
            id: newId().slice(0, 8),
            name: fields.length === 1 ? 'Resepsi' : 'Acara',
            start: '',
            end: null,
            venueName: '',
            address: '',
            mapUrl: '',
            isMain: false,
          })
        }
      >
        + Tambah Acara
      </button>
    </div>
  )
}
