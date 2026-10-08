import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../components/Toast'
import { backupFileName, parseBackup, type ParsedBackup } from '../../data/backup'
import { downloadBlob } from '../../lib/download'
import { formatSize } from '../media/compressImage'
import { runExport } from './export'
import {
  coupleNamesOf,
  defaultChoice,
  preflight,
  runRestore,
  type Preflight,
  type RestoreChoice,
  type RestoreOutcome,
  type RestoreProgress,
} from './restore'

const LAST_BACKUP_KEY = 'admin.lastBackupAt'

function readLastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY)
  } catch {
    return null
  }
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
}

const CHOICE_LABEL: Record<Exclude<RestoreChoice, 'new'>, string> = {
  skip: 'Lewati',
  replace: 'Ganti',
  both: 'Simpan keduanya',
}

/** Download a full backup, or restore one (002 v1 or v2) into the server (US6, US7). */
export default function BackupPage() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [lastBackup, setLastBackup] = useState(readLastBackup)
  const [exporting, setExporting] = useState<{ done: number; total: number } | null>(null)
  const [parsed, setParsed] = useState<ParsedBackup | null>(null)
  const [pf, setPf] = useState<Preflight | null>(null)
  const [choices, setChoices] = useState<Record<string, RestoreChoice>>({})
  const [progress, setProgress] = useState<RestoreProgress | null>(null)
  const [outcomes, setOutcomes] = useState<RestoreOutcome[] | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const restoring = progress !== null

  useEffect(() => {
    document.title = 'Cadangan · Admin Undangan'
  }, [])

  async function download() {
    setProblem(null)
    setExporting({ done: 0, total: 0 })
    try {
      const blob = await runExport((done, total) => setExporting({ done, total }))
      downloadBlob(blob, backupFileName())
      const now = new Date().toISOString()
      try {
        localStorage.setItem(LAST_BACKUP_KEY, now)
      } catch {
        // Blocked storage: the reminder just won't show.
      }
      setLastBackup(now)
      toast(`Cadangan diunduh (${formatSize(blob.size)})`)
    } catch (err) {
      setProblem((err as Error).message)
    } finally {
      setExporting(null)
    }
  }

  async function pick(file: File | undefined) {
    if (!file) return
    setProblem(null)
    setParsed(null)
    setOutcomes(null)
    try {
      const p = await parseBackup(file)
      const check = await preflight(p)
      setParsed(p)
      setPf(check)
      setChoices(Object.fromEntries(p.couples.map((c) => [c.id, defaultChoice(c, check)])))
    } catch (err) {
      setProblem((err as Error).message)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function restore() {
    if (!parsed || !pf) return
    setProgress({ names: '', done: 0, total: 0 })
    try {
      const result = await runRestore(parsed, choices, pf, setProgress)
      setOutcomes(result)
      const restored = result.filter((r) => r.result === 'Dipulihkan').length
      toast(`${restored} pasangan dipulihkan`)
      setParsed(null)
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl text-text">Cadangan</h1>

      <section className="card space-y-3 p-5 sm:p-6">
        <h2 className="text-xl text-text">Unduh Cadangan</h2>
        <p className="text-sm text-muted">
          Semua pasangan, foto, musik, kode akses, konfirmasi kehadiran dan ucapan disimpan ke satu file. Simpan
          file ini di tempat aman (misalnya Google Drive), untuk berjaga-jaga jika layanan gratis berubah.
        </p>
        <p className="text-sm text-text" data-testid="last-backup">
          {lastBackup ? `Cadangan terakhir: ${formatDateTime(lastBackup)}` : 'Belum pernah mengunduh cadangan.'}
        </p>
        <button type="button" className="btn-primary" onClick={download} disabled={!!exporting || restoring}>
          {exporting ? 'Menyiapkan…' : 'Unduh Cadangan'}
        </button>
        {exporting && exporting.total > 0 && (
          <p className="text-sm text-text" role="status" aria-live="polite">
            Mengunduh foto {exporting.done} dari {exporting.total}
          </p>
        )}
      </section>

      <section className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-xl text-text">Pulihkan dari File</h2>
        <p className="text-sm text-muted">
          Bisa dari file cadangan dashboard lama (yang menyimpan data di browser) maupun yang baru.
        </p>
        <input
          ref={fileRef}
          id="restore-file"
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        <label htmlFor="restore-file" className="btn-outline cursor-pointer">
          Pilih File Cadangan
        </label>
        {problem && (
          <p role="alert" className="field-error">
            {problem}
          </p>
        )}

        {parsed && pf && (
          <div className="space-y-4 rounded-xl bg-surface-alt p-4" data-testid="restore-summary">
            <p className="text-text">
              <strong>{parsed.couples.length} pasangan</strong>, {parsed.media.length} file (
              {formatSize(parsed.totalBytes)}), dibuat {formatDateTime(parsed.createdAt)}.
            </p>
            <ul className="divide-y divide-accent/20">
              {parsed.couples.map((c) => {
                const choice = choices[c.id]
                const pending = pf.pendingIds.includes(c.id)
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-2 py-2" data-testid="restore-row">
                    <span className="min-w-0 flex-1">
                      <span className="font-bold text-text">{coupleNamesOf(c)}</span>{' '}
                      <span className="font-mono text-xs text-muted">/{c.slug}</span>
                      {choice !== 'new' && (
                        <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-[#a33a50]">
                          {pending ? 'Pemulihan belum selesai' : 'Sudah ada'}
                        </span>
                      )}
                    </span>
                    {choice !== 'new' && (
                      <select
                        aria-label={`Pilihan untuk ${coupleNamesOf(c)}`}
                        className="field w-auto py-1 text-sm"
                        value={choice}
                        onChange={(e) => setChoices((x) => ({ ...x, [c.id]: e.target.value as RestoreChoice }))}
                      >
                        {(Object.keys(CHOICE_LABEL) as (keyof typeof CHOICE_LABEL)[]).map((k) => (
                          <option key={k} value={k}>
                            {pending && k === 'replace' ? 'Lanjutkan' : CHOICE_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                )
              })}
            </ul>
            <button type="button" className="btn-primary" disabled={restoring} onClick={() => void restore()}>
              {restoring ? 'Memulihkan…' : 'Pulihkan'}
            </button>
            {progress && progress.names && (
              <p className="text-sm text-text" role="status" aria-live="polite">
                Memulihkan {progress.names}: foto {progress.done} dari {progress.total}
              </p>
            )}
          </div>
        )}

        {outcomes && (
          <ul className="space-y-1" data-testid="restore-results">
            {outcomes.map((o) => (
              <li key={o.coupleId} className="text-sm">
                <strong>{o.names}</strong>:{' '}
                <span className={o.result === 'Gagal' ? 'font-bold text-[#a33a50]' : 'text-text'}>{o.result}</span>
                {o.message && <span className="text-muted"> — {o.message}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
