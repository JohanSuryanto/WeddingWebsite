import { Controller, useFormContext } from 'react-hook-form'
import { coupleSendUrl, coupleUrl } from '../../../config/site'
import { orderedCouple } from '../../../content/selectors'
import { CopyField } from '../../components/CopyField'
import { ThemePicker } from '../../components/ThemePicker'
import { useEditor } from '../editorContext'
import type { CoupleFormValues } from '../formModel'
import { Section, TextField } from '../fields'

export default function PengaturanTab() {
  const { control, watch } = useFormContext<CoupleFormValues>()
  const { couple, setStatus } = useEditor()
  const slug = watch('slug')
  const content = watch('content')
  const [a, b] = orderedCouple(content)
  const slugChanged = slug !== couple.slug

  return (
    <div className="space-y-4">
      <Section title="Status">
        <div className="flex flex-wrap items-center gap-3">
          <span
            data-testid="editor-status"
            className={`rounded-full px-3 py-1 text-sm font-bold ${
              couple.status === 'active'
                ? 'bg-highlight text-highlight-text'
                : 'bg-surface-alt text-muted'
            }`}
          >
            {couple.status === 'active' ? 'Aktif' : 'Draf'}
          </span>
          <button
            type="button"
            className="btn-outline px-4 py-1 text-sm"
            onClick={() => setStatus(couple.status === 'active' ? 'draft' : 'active')}
          >
            {couple.status === 'active' ? 'Jadikan Draf' : 'Terbitkan'}
          </button>
          <p className="text-sm text-muted">
            {couple.status === 'active'
              ? 'Undangan bisa dibuka tamu.'
              : 'Tamu melihat "Undangan belum tersedia".'}
          </p>
        </div>
      </Section>

      <Section title="Alamat undangan">
        <TextField path="slug" label="Nama alamat" required maxLength={40} className="font-mono" />
        {slugChanged && couple.status === 'active' && (
          <p
            role="alert"
            className="rounded-lg bg-highlight px-3 py-2 text-sm font-bold text-highlight-text"
          >
            Link yang sudah dibagikan akan berhenti berfungsi.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <CopyField label="Undangan" value={coupleUrl(couple.slug)} />
          <CopyField label="Kirim undangan" value={coupleSendUrl(couple.slug)} />
        </div>
        {slugChanged && <p className="text-sm text-muted">Alamat baru berlaku setelah disimpan.</p>}
      </Section>

      <Section title="Tema bawaan">
        <Controller
          control={control}
          name="defaultTheme"
          render={({ field }) => (
            <ThemePicker
              value={field.value}
              onChange={field.onChange}
              sample={`${a.nickname || '…'} & ${b.nickname || '…'}`}
              label="Tema bawaan"
            />
          )}
        />
      </Section>
    </div>
  )
}
