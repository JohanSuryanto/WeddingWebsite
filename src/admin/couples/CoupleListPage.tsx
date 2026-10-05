import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useToast } from '../../components/Toast'
import { passcodeMessage } from '../../config/service'
import { coupleSendUrl, coupleUrl } from '../../config/site'
import { copyText } from '../../lib/clipboard'
import { coupleRepository, ready } from '../../data/index.admin'
import type { CoupleStatus, CoupleSummary } from '../../data/types'
import { tryFormatDateId } from '../../lib/dateFormat'
import { themes } from '../../themes'
import { CopyField } from '../components/CopyField'
import { useLoad } from '../hooks/useLoad'
import { useMediaUrl } from '../hooks/useMediaUrl'
import { DeleteDialog } from './DeleteDialog'
import { statusErrorMessage } from './statusError'
import { StorageMeter } from './StorageMeter'

const LAST_BACKUP_KEY = 'admin.lastBackupAt'
const WEEK_MS = 7 * 24 * 3600_000

function normalize(s: string) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function lastBackupAt(): number | null {
  try {
    const v = localStorage.getItem(LAST_BACKUP_KEY)
    return v ? Date.parse(v) : null
  } catch {
    return null
  }
}

function StatusBadge({ status }: { status: CoupleStatus }) {
  return (
    <span
      data-testid="status-badge"
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
        status === 'active' ? 'bg-highlight text-highlight-text' : 'bg-surface-alt text-muted'
      }`}
    >
      {status === 'active' ? 'Aktif' : 'Draf'}
    </span>
  )
}

function CoupleCard({
  couple,
  highlighted,
  onChanged,
  onDuplicated,
}: {
  couple: CoupleSummary
  highlighted: boolean
  onChanged: () => void
  onDuplicated: (id: string) => void
}) {
  const toast = useToast()
  const cover = useMediaUrl(couple.coverSrc)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  return (
    <li
      data-testid="couple-card"
      data-slug={couple.slug}
      className={`card overflow-hidden ${highlighted ? 'ring-2 ring-accent' : ''}`}
    >
      <div className="flex gap-4 p-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-alt">
          {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-script text-3xl leading-tight text-text">
              {couple.names}
            </h2>
            <StatusBadge status={couple.status} />
            {couple.accessWarning && (
              <span
                className="rounded-full bg-[#a33a50] px-2.5 py-0.5 text-xs font-bold text-white"
                title="Kode akses halaman kirim undangan sering salah. Pertimbangkan menggantinya."
                data-testid="access-warning"
              >
                ⚠ Banyak percobaan kode
              </span>
            )}
            {couple.restorePending && (
              <span className="rounded-full bg-surface-alt px-2.5 py-0.5 text-xs font-bold text-[#a33a50]">
                Pemulihan belum selesai
              </span>
            )}
          </div>
          <p className="text-sm text-muted">
            {tryFormatDateId(couple.mainDate) || 'Tanggal belum diisi'} · Tema{' '}
            {themes[couple.defaultTheme].code}. {themes[couple.defaultTheme].name} · Dibuka{' '}
            <span data-testid="views">{couple.views}</span> kali
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-t border-accent/20 px-4 py-3 sm:grid-cols-2">
        <CopyField label="Undangan" value={coupleUrl(couple.slug)} testId="invitation-url" />
        <CopyField label="Kirim undangan" value={coupleSendUrl(couple.slug)} testId="send-url" />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-accent/20 px-4 py-3">
        <Link to={`/couples/${couple.id}/mempelai`} className="btn-primary px-4 py-1.5 text-sm">
          Ubah
        </Link>
        <Link to={`/couples/${couple.id}/preview`} className="btn-outline px-4 py-1 text-sm">
          Pratinjau
        </Link>
        <Link
          to={`/couples/${couple.id}/send-invitation`}
          className="btn-outline px-4 py-1 text-sm"
        >
          Kirim Undangan
        </Link>
        <button
          type="button"
          className="btn-outline px-4 py-1 text-sm"
          disabled={busy}
          onClick={() =>
            run(async () => {
              // The list has no passcodes; fetch this couple's.
              const full = await coupleRepository.get(couple.id)
              const text = passcodeMessage(couple.names, coupleSendUrl(couple.slug), full.passcode)
              toast((await copyText(text)) ? 'Pesan tersalin!' : 'Gagal menyalin')
            })
          }
        >
          Salin pesan
        </button>
        <button
          type="button"
          className="btn-outline px-4 py-1 text-sm"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const next = couple.status === 'active' ? 'draft' : 'active'
              try {
                await coupleRepository.setStatus(couple.id, next)
              } catch (err) {
                toast(statusErrorMessage(err))
                return
              }
              toast(next === 'active' ? 'Undangan diterbitkan' : 'Undangan dijadikan draf')
              onChanged()
            })
          }
        >
          {couple.status === 'active' ? 'Jadikan Draf' : 'Terbitkan'}
        </button>
        <button
          type="button"
          className="btn-outline px-4 py-1 text-sm"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const copy = await coupleRepository.duplicate(couple.id)
              toast('Salinan dibuat')
              onDuplicated(copy.id)
            })
          }
        >
          Duplikat
        </button>
        <button
          type="button"
          className="btn-outline ml-auto px-4 py-1 text-sm text-[#a33a50]"
          onClick={() => setDeleting(true)}
        >
          Hapus
        </button>
      </div>

      {deleting && (
        <DeleteDialog
          names={couple.names}
          slug={couple.slug}
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            await coupleRepository.remove(couple.id)
            toast('Pasangan dihapus')
            setDeleting(false)
            onChanged()
          }}
        />
      )}
    </li>
  )
}

export function CoupleListPage() {
  const { state, reload } = useLoad(async () => {
    await ready
    return coupleRepository.list()
  }, 'list')
  const { hash } = useLocation()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | CoupleStatus>('all')
  const [highlight, setHighlight] = useState<string | null>(hash.slice(1) || null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    document.title = 'Pasangan · Admin Undangan'
  }, [])

  const couples = useMemo(() => (state.status === 'ready' ? state.data : []), [state])
  const [now] = useState(() => Date.now())
  const shown = useMemo(() => {
    const q = normalize(query.trim())
    return couples.filter(
      (c) =>
        (filter === 'all' || c.status === filter) &&
        (!q || normalize(c.names).includes(q) || c.slug.includes(q)),
    )
  }, [couples, query, filter])

  const backupAt = lastBackupAt()
  const backupOld = couples.length > 0 && (!backupAt || now - backupAt > WEEK_MS)

  function changed() {
    reload()
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl text-text">Pasangan</h1>
        <Link to="/couples/new" className="btn-primary ml-auto">
          + Tambah Pasangan
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            <label htmlFor="couple-search" className="sr-only">
              Cari pasangan
            </label>
            <input
              id="couple-search"
              type="search"
              className="field min-w-0 flex-1"
              placeholder="Cari nama atau alamat…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label htmlFor="couple-filter" className="sr-only">
              Status
            </label>
            <select
              id="couple-filter"
              className="field w-auto"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">Semua</option>
              <option value="draft">Draf</option>
              <option value="active">Aktif</option>
            </select>
          </div>

          {state.status === 'loading' && <p className="text-muted">Memuat…</p>}
          {state.status === 'error' && (
            <div className="card px-4 py-6 text-center" role="alert">
              <p className="field-error">Gagal memuat data: {state.error.message}</p>
              <button type="button" className="btn-outline mt-3" onClick={reload}>
                Coba lagi
              </button>
            </div>
          )}
          {state.status === 'ready' && (
            <>
              <p className="text-sm text-muted" aria-live="polite">
                {shown.length} dari {couples.length} pasangan
              </p>
              {couples.length === 0 ? (
                <div className="card px-6 py-10 text-center">
                  <p className="text-text">Belum ada pasangan.</p>
                  <Link to="/couples/new" className="btn-primary mt-4">
                    + Tambah Pasangan
                  </Link>
                </div>
              ) : (
                <ul className="space-y-4">
                  {shown.map((c) => (
                    <CoupleCard
                      key={c.id}
                      couple={c}
                      highlighted={c.id === highlight}
                      onChanged={changed}
                      onDuplicated={(id) => {
                        setHighlight(id)
                        changed()
                      }}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <aside className="space-y-4">
          <StorageMeter refreshKey={refreshKey} />
          {backupOld && (
            <div className="card px-4 py-3 text-sm">
              <p className="font-bold text-text">Cadangan belum diperbarui</p>
              <p className="text-muted">
                {backupAt
                  ? `Cadangan terakhir ${new Date(backupAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`
                  : 'Belum pernah mengunduh cadangan.'}
              </p>
              <Link to="/backup" className="btn-outline mt-2 px-4 py-1 text-sm">
                Unduh cadangan
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
