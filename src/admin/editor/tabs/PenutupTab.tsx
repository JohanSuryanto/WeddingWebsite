import { useFormContext } from 'react-hook-form'
import type { CoupleFormValues } from '../formModel'
import { Section, TextArea, TextField } from '../fields'

export default function PenutupTab() {
  const { watch, setValue } = useFormContext<CoupleFormValues>()
  const quote = watch('content.closing.quote')
  return (
    <div className="space-y-4">
      <Section title="Pesan penutup">
        <TextArea path="content.closing.message" label="Pesan" required rows={4} maxLength={1000} />
      </Section>
      <Section title="Kutipan">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 font-bold text-text">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--theme-primary)]"
            checked={!!quote}
            onChange={(e) =>
              setValue(
                'content.closing.quote',
                e.target.checked ? { text: '', source: '' } : undefined,
                {
                  shouldDirty: true,
                },
              )
            }
          />
          Tampilkan kutipan (ayat, puisi, dll.)
        </label>
        {quote && (
          <>
            <TextArea path="content.closing.quote.text" label="Isi kutipan" rows={3} />
            <TextField
              path="content.closing.quote.source"
              label="Sumber"
              placeholder="QS. Ar-Rum: 21"
            />
          </>
        )}
      </Section>
    </div>
  )
}
