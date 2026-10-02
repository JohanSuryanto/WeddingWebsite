import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { coupleRepository } from '../../data/index.admin'
import { ConflictError, SlugTakenError, type Couple } from '../../data/types'
import { coupleFormSchema, type CoupleFormValues } from './formModel'

export function toFormValues(c: Couple): CoupleFormValues {
  return { content: structuredClone(c.content), slug: c.slug, defaultTheme: c.defaultTheme }
}

export type SaveResult =
  | { ok: true; couple: Couple }
  | { ok: false; reason: 'conflict' | 'slug' | 'error'; message: string }

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
      try {
        const base = opts?.overwrite ? await coupleRepository.get(couple.id) : couple
        const saved = await coupleRepository.update(
          couple.id,
          { content: values.content, slug: values.slug, defaultTheme: values.defaultTheme },
          base.version,
        )
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
