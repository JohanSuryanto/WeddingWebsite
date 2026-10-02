import { Controller, useFormContext } from 'react-hook-form'
import { AudioField } from '../../media/AudioField'
import type { CoupleFormValues } from '../formModel'
import { Section } from '../fields'

export default function MusikTab() {
  const { control } = useFormContext<CoupleFormValues>()
  return (
    <Section title="Musik latar">
      <p className="-mt-2 text-sm text-muted">
        Musik diputar setelah tamu menekan &ldquo;Buka Undangan&rdquo;. Format MP3, maksimal 10 MB.
      </p>
      <Controller
        control={control}
        name="content.music"
        render={({ field }) => (
          <AudioField value={field.value} onChange={(v) => field.onChange(v)} />
        )}
      />
    </Section>
  )
}
