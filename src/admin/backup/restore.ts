// Browser-driven restore (contracts/backup-format.md § Restore): per couple, create
// it with its original ids, upload its files through the normal ticket flow, add
// its responses, then finish. Safe to run again after a failure (US6-3).
import { bundleFor, planKeepBoth, type BackupCouple, type CoupleBundle, type ParsedBackup } from '../../data/backup'
import { apiFetch } from '../../data/http/client'
import { mediaStore } from '../../data/index.admin'
import { randomPasscode } from '../../data/passcode'
import { orderedCouple } from '../../content/selectors'

/** Lewati / Ganti / Simpan keduanya, or "new" when there's no conflict. */
export type RestoreChoice = 'new' | 'skip' | 'replace' | 'both'

export interface Preflight {
  existingIds: string[]
  existingSlugs: string[]
  pendingIds: string[]
}

export interface RestoreOutcome {
  coupleId: string
  names: string
  result: 'Dipulihkan' | 'Dilewati' | 'Gagal'
  message?: string
}

export type RestoreProgress = { names: string; done: number; total: number }

export const coupleNamesOf = (c: BackupCouple) => {
  const [a, b] = orderedCouple(c.content)
  return `${a?.nickname || '?'} & ${b?.nickname || '?'}`
}

export function preflight(parsed: ParsedBackup): Promise<Preflight> {
  return apiFetch('/admin/import/preflight', {
    method: 'POST',
    body: { couples: parsed.couples.map((c) => ({ id: c.id, slug: c.slug })) },
  })
}

/** The default per couple: new, or "Lanjutkan" a half-finished restore, else "Lewati". */
export function defaultChoice(c: BackupCouple, pf: Preflight): RestoreChoice {
  if (pf.pendingIds.includes(c.id)) return 'replace'
  if (pf.existingIds.includes(c.id) || pf.existingSlugs.includes(c.slug)) return 'skip'
  return 'new'
}

async function restoreOne(bundle: CoupleBundle, mode: 'create' | 'replace', onProgress: (done: number, total: number) => void) {
  const { couple } = bundle
  const { pendingMediaIds } = await apiFetch<{ pendingMediaIds: string[] }>(`/admin/import/couples/${couple.id}`, {
    method: 'PUT',
    body: {
      couple: {
        slug: couple.slug,
        status: couple.status,
        defaultTheme: couple.defaultTheme,
        content: couple.content,
        // 002 backups have no passcode: give one (spec edge case).
        passcode: couple.passcode ?? randomPasscode(),
        createdAt: couple.createdAt,
      },
      media: bundle.media.map(({ id, kind, mime, size, width, height }) => ({ id, kind, mime, size, width, height })),
      mode,
    },
  })
  const pending = bundle.media.filter((m) => pendingMediaIds.includes(m.id))
  onProgress(0, pending.length)
  for (const [i, m] of pending.entries()) {
    await mediaStore.put(couple.id, m.blob, { kind: m.kind, width: m.width, height: m.height, id: m.id })
    onProgress(i + 1, pending.length)
  }
  if (bundle.rsvps.length || bundle.wishes.length || bundle.guests.length) {
    await apiFetch(`/admin/import/couples/${couple.id}/responses`, {
      method: 'POST',
      body: {
        rsvps: bundle.rsvps.map(({ coupleId: _c, ...r }) => (void _c, r)),
        wishes: bundle.wishes.map(({ coupleId: _c, ...w }) => (void _c, w)),
        guests: bundle.guests.map(({ coupleId: _c, ...g }) => (void _c, g)),
      },
    })
  }
  await apiFetch(`/admin/import/couples/${couple.id}/finish`, { method: 'POST', body: { status: couple.status } })
}

/** Restores every couple not skipped; a failure is reported and the rest continue. */
export async function runRestore(
  parsed: ParsedBackup,
  choices: Record<string, RestoreChoice>,
  pf: Preflight,
  onProgress: (p: RestoreProgress) => void,
): Promise<RestoreOutcome[]> {
  const taken = new Set(pf.existingSlugs)
  const outcomes: RestoreOutcome[] = []
  for (const couple of parsed.couples) {
    const names = coupleNamesOf(couple)
    const choice = choices[couple.id] ?? defaultChoice(couple, pf)
    if (choice === 'skip') {
      outcomes.push({ coupleId: couple.id, names, result: 'Dilewati' })
      continue
    }
    try {
      let bundle = bundleFor(parsed, couple.id)
      if (choice === 'both') {
        bundle = planKeepBoth(bundle, taken)
        taken.add(bundle.couple.slug)
      }
      await restoreOne(bundle, choice === 'replace' ? 'replace' : 'create', (done, total) =>
        onProgress({ names, done, total }),
      )
      outcomes.push({ coupleId: bundle.couple.id, names, result: 'Dipulihkan' })
    } catch (err) {
      outcomes.push({ coupleId: couple.id, names, result: 'Gagal', message: (err as Error).message })
    }
  }
  return outcomes
}
