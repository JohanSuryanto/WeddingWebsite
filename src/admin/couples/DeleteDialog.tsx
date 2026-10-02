import { useState } from 'react'
import { Dialog } from '../components/Dialog'

/** Delete confirmation: the admin must type the couple's address name. */
export function DeleteDialog({
  names,
  slug,
  onCancel,
  onConfirm,
}: {
  names: string
  slug: string
  onCancel: () => void
  onConfirm: () => Promise<void>
}) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Dialog
      title={`Hapus ${names}?`}
      onClose={onCancel}
      actions={
        <>
          <button type="button" className="btn-outline" onClick={onCancel}>
            Batal
          </button>
          <button
            type="button"
            className="btn-primary bg-[#a33a50] text-white"
            disabled={typed.trim() !== slug || busy}
            onClick={async () => {
              setBusy(true)
              await onConfirm()
            }}
          >
            {busy ? 'Menghapus…' : 'Hapus permanen'}
          </button>
        </>
      }
    >
      <p>Semua data dan foto akan dihapus permanen.</p>
      <label htmlFor="delete-confirm" className="mt-4 block text-sm font-bold">
        Ketik <code className="rounded bg-surface-alt px-1">{slug}</code> untuk konfirmasi
      </label>
      <input
        id="delete-confirm"
        className="field mt-1 font-mono text-sm"
        value={typed}
        autoComplete="off"
        onChange={(e) => setTyped(e.target.value)}
      />
    </Dialog>
  )
}
