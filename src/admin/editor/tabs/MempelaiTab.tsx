import { useFormContext } from 'react-hook-form'
import type { CoupleFormValues } from '../formModel'
import { Section, TextField } from '../fields'

function PersonFields({ who, title }: { who: 'bride' | 'groom'; title: string }) {
  const p = `content.couple.${who}` as const
  return (
    <Section title={title}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField path={`${p}.nickname`} label="Nama panggilan" required maxLength={30} />
        <TextField path={`${p}.fullName`} label="Nama lengkap & gelar" required maxLength={80} />
        <TextField
          path={`${p}.childOrder`}
          label="Keterangan anak"
          placeholder={who === 'bride' ? 'Putri pertama dari' : 'Putra kedua dari'}
        />
        <TextField path={`${p}.instagram`} label="Instagram (tanpa @)" placeholder="opsional" />
        <TextField path={`${p}.father`} label="Nama ayah" required maxLength={80} />
        <TextField path={`${p}.mother`} label="Nama ibu" required maxLength={80} />
      </div>
    </Section>
  )
}

export default function MempelaiTab() {
  const { register } = useFormContext<CoupleFormValues>()
  return (
    <div className="space-y-4">
      <PersonFields who="bride" title="Mempelai Wanita" />
      <PersonFields who="groom" title="Mempelai Pria" />
      <Section title="Sampul">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="couple-order" className="mb-1 block font-bold text-text">
              Urutan nama
            </label>
            <select id="couple-order" className="field" {...register('content.couple.order')}>
              <option value="bride-first">Wanita lebih dulu</option>
              <option value="groom-first">Pria lebih dulu</option>
            </select>
          </div>
          <TextField path="content.couple.hashtag" label="Hashtag" placeholder="#NamaMenujuHalal" />
          <TextField path="content.cover.heading" label="Judul sampul" required />
          <TextField
            path="content.cover.defaultGuestLabel"
            label="Sapaan tamu tanpa nama"
            required
          />
        </div>
      </Section>
    </div>
  )
}
