import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { coupleRepository } from '../../data/index.admin'
import { ConflictError, NetworkError, SessionExpiredError, SlugTakenError, type Couple } from '../../data/types'
import { waitForRelogin } from '../auth/relogin'
import { coupleFormSchema, type CoupleFormValues } from './formModel'

export function toFormValues(c: Couple): CoupleFormValues {
  return {
    content: structuredClone(c.content),
    slug: c.slug,
    defaultTheme: c.defaultTheme,
    passcode: c.passcode,
  }
}

export type SaveResult =
  | { ok: true; couple: Couple }
  | { ok: false; reason: 'conflict' | 'slug' | 'network' | 'error'; message: string }

/** react-hook-form for one couple, validated by the shared schema. */
export function useCoupleForm(initial: Couple) {
  const [couple, setCouple] = useState(initial)
  const form = useForm<CoupleFormValues>({
    defaultValues: toFormValues(initial),
    resolver: zodResolver(coupleFormSchema) as unknown as Resolver<CoupleFormValues>,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  /** Saves validated values; on success the form becomes clean at the new version. */
  const save = useCallback(
    async (values: CoupleFormValues, opts?: { overwrite?: boolean }): Promise<SaveResult> => {
      const attempt = async () => {
        const base = opts?.overwrite ? await coupleRepository.get(couple.id) : couple
        return coupleRepository.update(
          couple.id,
          {
            content: values.content,
            slug: values.slug,
            defaultTheme: values.defaultTheme,
            passcode: values.passcode,
          },
          base.version,
        )
      }
      try {
        let saved: Couple
        try {
          saved = await attempt()
        } catch (err) {
          // Session ended while editing: keep the values, log in again, retry once (US2-4).
          if (!(err instanceof SessionExpiredError)) throw err
          await waitForRelogin()
          saved = await attempt()
        }
        setCouple(saved)
        form.reset(toFormValues(saved))
        return { ok: true, couple: saved }
      } catch (err) {
        if (err instanceof ConflictError)
          return { ok: false, reason: 'conflict', message: err.message }
        if (err instanceof SlugTakenError) {
          form.setError('slug', { type: 'server', message: err.message })
          return { ok: false, reason: 'slug', message: err.message }
        }
        if (err instanceof NetworkError) {
          return { ok: false, reason: 'network', message: 'Gagal menyimpan. Periksa koneksi lalu coba lagi.' }
        }
        return { ok: false, reason: 'error', message: (err as Error).message }
      }
    },
    [couple, form],
  )

  /** Discards edits and loads the latest saved version. */
  const reloadLatest = useCallback(async () => {
    const latest = await coupleRepository.get(couple.id)
    setCouple(latest)
    form.reset(toFormValues(latest))
    return latest
  }, [couple.id, form])

  return { form, couple, setCouple, save, reloadLatest }
}
