import { useCallback, useEffect, useState } from 'react'
import { ResponseTotals, RsvpList } from '../../../components/ResponsesView'
import { useToast } from '../../../components/Toast'
import { formatRelativeId } from '../../../lib/dateFormat'
import { Dialog } from '../../components/Dialog'
import { useLoad } from '../../hooks/useLoad'
import { responsesAdmin, type AdminResponses, type AdminWish } from '../../responses/http'
import { useEditor } from '../editorContext'
import { Section } from '../fields'

type Confirm = { kind: 'rsvp' | 'wish'; id: string; name: string } | null

/** Guest RSVPs and wishes for this couple (FR-019): totals, CSV, hide and delete. */
export default function ResponsTab() {
  const { couple } = useEditor()
  const toast = useToast()
  const { state, reload } = useLoad(() => responsesAdmin.list(couple.id), couple.id)
  const [extraWishes, setExtraWishes] = useState<AdminWish[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, Partial<AdminWish> | 'deleted'>>({})
  const [confirm, setConfirm] = useState<Confirm>(null)
  const closeConfirm = useCallback(() => setConfirm(null), [])

  const data: AdminResponses | null = state.status === 'ready' ? state.data : null
  useEffect(() => {
    // A fresh first page resets paging and local edits.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExtraWishes([])
    setOverrides({})
    setCursor(data?.wishes.nextCursor ?? null)
  }, [data])

  if (state.status === 'loading') return <p className="text-muted">Memuat…</p>
  if (state.status === 'error' || !data) {
    return (
      <div className="card px-4 py-6 text-center" role="alert">
        <p className="field-error">Gagal memuat respons.</p>
        <button type="button" className="btn-outline mt-3" onClick={reload}>
          Coba lagi
        </button>
      </div>
    )
  }

  const wishes = [...data.wishes.items, ...extraWishes]
    .filter((w) => overrides[w.id] !== 'deleted')
    .map((w) => ({ ...w, ...(overrides[w.id] as Partial<AdminWish> | undefined) }))

  async function loadMore() {
    if (!cursor) return
    const page = await responsesAdmin.list(couple.id, cursor)
    setExtraWishes((prev) => [...prev, ...page.wishes.items])
    setCursor(page.wishes.nextCursor)
  }

  async function toggleHidden(w: AdminWish) {
    try {
      const updated = await responsesAdmin.setWishHidden(w.id, !w.hidden)
      setOverrides((o) => ({ ...o, [w.id]: { hidden: updated.hidden } }))
      toast(updated.hidden ? 'Ucapan disembunyikan' : 'Ucapan ditampilkan')
    } catch {
      toast('Gagal mengubah ucapan')
    }
  }

  async function onConfirmDelete() {
    if (!confirm) return
    try {
      if (confirm.kind === 'wish') {
        await responsesAdmin.deleteWish(confirm.id)
        setOverrides((o) => ({ ...o, [confirm.id]: 'deleted' }))
      } else {
        await responsesAdmin.deleteRsvp(confirm.id)
        reload()
      }
      toast('Dihapus')
    } catch {
      toast('Gagal menghapus')
    }
    setConfirm(null)
  }

  const empty = !data.rsvps.length && !wishes.length

  return (
    <div className="space-y-4">
      <Section title="Konfirmasi kehadiran">
        <ResponseTotals totals={data.totals} views={data.views} />
        <div className="flex flex-wrap gap-2">
          <a href={responsesAdmin.csvUrl(couple.id)} download className="btn-outline px-4 py-1 text-sm">
            Unduh CSV
          </a>
          <button type="button" className="btn-outline px-4 py-1 text-sm" onClick={reload}>
            Muat ulang
          </button>
        </div>
        <RsvpList
          rsvps={data.rsvps}
          action={(r) => (
            <button
              type="button"
              className="btn-outline px-3 py-0.5 text-xs text-[#a33a50]"
              aria-label={`Hapus konfirmasi ${r.name}`}
              onClick={() => setConfirm({ kind: 'rsvp', id: r.id, name: r.name })}
            >
              Hapus
            </button>
          )}
        />
      </Section>

      <Section title="Ucapan & doa">
        {empty && <p className="text-sm text-muted">Belum ada respons.</p>}
        {!wishes.length && !empty && <p className="text-sm text-muted">Belum ada ucapan.</p>}
        <ul className="space-y-3" data-testid="admin-wish-list">
          {wishes.map((w) => (
            <li key={w.id} className={`rounded-xl bg-surface-alt/60 p-4 ${w.hidden ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold break-words text-text">{w.name}</p>
                {w.hidden && (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-muted">
                    Disembunyikan
                  </span>
                )}
                <span className="ml-auto text-xs text-muted">{formatRelativeId(new Date(w.createdAt))}</span>
              </div>
              <p className="mt-1 break-words whitespace-pre-line text-text">{w.message}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn-outline px-3 py-0.5 text-xs" onClick={() => toggleHidden(w)}>
                  {w.hidden ? 'Tampilkan' : 'Sembunyikan'}
                </button>
                <button
                  type="button"
                  className="btn-outline px-3 py-0.5 text-xs text-[#a33a50]"
                  onClick={() => setConfirm({ kind: 'wish', id: w.id, name: w.name })}
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
        {cursor && (
          <button type="button" className="btn-outline text-sm" onClick={loadMore}>
            Muat lebih banyak
          </button>
        )}
      </Section>

      {confirm && (
        <Dialog
          title={confirm.kind === 'wish' ? 'Hapus ucapan?' : 'Hapus konfirmasi?'}
          onClose={closeConfirm}
          actions={
            <>
              <button type="button" className="btn-outline" onClick={closeConfirm}>
                Batal
              </button>
              <button type="button" className="btn-primary" onClick={onConfirmDelete}>
                Hapus
              </button>
            </>
          }
        >
          <p>
            {confirm.kind === 'wish' ? 'Ucapan' : 'Konfirmasi kehadiran'} dari <strong>{confirm.name}</strong> akan dihapus
            permanen.
          </p>
        </Dialog>
      )}
    </div>
  )
}
