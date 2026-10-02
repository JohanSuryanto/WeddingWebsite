import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../components/Toast'
import {
  backupFileName,
  createBackup,
  findConflicts,
  parseBackup,
  restoreBackup,
  type ParsedBackup,
} from '../../data/backup'
import { coupleRepository, mediaStore, ready } from '../../data/index.admin'
import { formatSize } from '../media/compressImage'
import { Dialog } from '../components/Dialog'

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

export default function BackupPage() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [lastBackup, setLastBackup] = useState(readLastBackup)
  const [busy, setBusy] = useState(false)
  const [parsed, setParsed] = useState<ParsedBackup | null>(null)
  const [conflicts, setConflicts] = useState<string[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const [mode, setMode] = useState<'add' | 'replace'>('add')
  const [confirmReplace, setConfirmReplace] = useState(false)

  useEffect(() => {
    document.title = 'Cadangan · Admin Undangan'
  }, [])

  async function download() {
    setBusy(true)
    try {
      await ready
      const blob = await createBackup(coupleRepository, mediaStore)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = backupFileName()
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      const now = new Date().toISOString()
      try {
        localStorage.setItem(LAST_BACKUP_KEY, now)
      } catch {
        // ignore
      }
      setLastBackup(now)
      toast(`Cadangan diunduh (${formatSize(blob.size)})`)
    } finally {
      setBusy(false)
    }
  }

  async function pick(file: File | undefined) {
    if (!file) return
    setProblem(null)
    setParsed(null)
    setBusy(true)
    try {
      await ready
      const p = await parseBackup(file)
      setParsed(p)
      setConflicts((await findConflicts(p, coupleRepository)).map((c) => c.slug))
    } catch (err) {
      setProblem((err as Error).message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function restore() {
    if (!parsed) return
    setBusy(true)
    try {
      const result = await restoreBackup(parsed, mode, coupleRepository)
      toast(
        result.skipped.length
          ? `${result.restored} pasangan dipulihkan, ${result.skipped.length} dilewati`
          : `${result.restored} pasangan dipulihkan`,
      )
      setParsed(null)
      setConfirmReplace(false)
    } catch (err) {
      setProblem(`Gagal memulihkan: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl text-text">Cadangan</h1>

      <section className="card space-y-3 p-5 sm:p-6">
        <h2 className="text-xl text-text">Unduh Cadangan</h2>
        <p className="text-sm text-muted">
          Semua pasangan dan fotonya disimpan ke satu file. Simpan file ini di tempat aman (misalnya
          Google Drive). Data di dashboard hanya ada di browser ini.
        </p>
        <p className="text-sm text-text" data-testid="last-backup">
          {lastBackup
            ? `Cadangan terakhir: ${formatDateTime(lastBackup)}`
            : 'Belum pernah mengunduh cadangan.'}
        </p>
        <button type="button" className="btn-primary" onClick={download} disabled={busy}>
          {busy && !parsed ? 'Memproses…' : 'Unduh Cadangan'}
        </button>
      </section>

      <section className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-xl text-text">Pulihkan dari File</h2>
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

        {parsed && (
          <div className="space-y-4 rounded-xl bg-surface-alt p-4" data-testid="restore-summary">
            <p className="text-text">
              <strong>{parsed.couples.length} pasangan</strong>, {parsed.media.length} file (
              {formatSize(parsed.totalBytes)}), dibuat {formatDateTime(parsed.createdAt)}.
            </p>
            {conflicts.length > 0 && (
              <p className="text-sm text-text">
                Sudah ada: <span className="font-mono">{conflicts.join(', ')}</span>
              </p>
            )}
            <fieldset className="space-y-2">
              <legend className="font-bold text-text">Cara memulihkan</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="restore-mode"
                  checked={mode === 'add'}
                  onChange={() => setMode('add')}
                />
                Tambahkan (lewati yang sudah ada)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="restore-mode"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                />
                Ganti semua
              </label>
            </fieldset>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => (mode === 'replace' ? setConfirmReplace(true) : void restore())}
            >
              {busy ? 'Memulihkan…' : 'Pulihkan'}
            </button>
          </div>
        )}
      </section>

      {confirmReplace && (
        <Dialog
          title="Ganti semua data?"
          onClose={() => setConfirmReplace(false)}
          actions={
            <>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setConfirmReplace(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() => void restore()}
              >
                Ganti semua
              </button>
            </>
          }
        >
          <p>Semua data saat ini akan diganti dengan isi file cadangan.</p>
        </Dialog>
      )}
    </div>
  )
}
