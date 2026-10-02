import { lazy, Suspense, useCallback, useEffect, useState, type ComponentType } from 'react'
import { FormProvider, useFormState, type FieldErrors } from 'react-hook-form'
import { Link, Navigate, NavLink, useBlocker, useParams } from 'react-router'
import { MessagePage } from '../../components/MessagePage'
import { useToast } from '../../components/Toast'
import { orderedCouple } from '../../content/selectors'
import { coupleRepository, ready } from '../../data/index.admin'
import type { Couple, CoupleStatus } from '../../data/types'
import { Dialog } from '../components/Dialog'
import { useLoad } from '../hooks/useLoad'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { MediaSessionProvider, useMediaSession } from '../media/MediaSession'
import { EditorContext } from './editorContext'
import {
  errorPaths,
  isTabId,
  TABS,
  tabOfPath,
  type CoupleFormValues,
  type TabId,
} from './formModel'
import { PhonePreview } from './PhonePreview'
import { toFormValues, useCoupleForm } from './useCoupleForm'

const TAB_COMPONENTS: Record<TabId, ComponentType> = {
  mempelai: lazy(() => import('./tabs/MempelaiTab')),
  acara: lazy(() => import('./tabs/AcaraTab')),
  foto: lazy(() => import('./tabs/FotoTab')),
  cerita: lazy(() => import('./tabs/CeritaTab')),
  hadiah: lazy(() => import('./tabs/HadiahTab')),
  musik: lazy(() => import('./tabs/MusikTab')),
  penutup: lazy(() => import('./tabs/PenutupTab')),
  pesan: lazy(() => import('./tabs/PesanTab')),
  pengaturan: lazy(() => import('./tabs/PengaturanTab')),
}

function TabBar({ coupleId, active }: { coupleId: string; active: TabId }) {
  const { errors, submitCount } = useFormState<CoupleFormValues>()
  const withErrors = new Set(submitCount > 0 ? errorPaths(errors).map(tabOfPath) : [])
  return (
    <nav aria-label="Bagian data" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 border-b border-accent/30">
        {TABS.map((t) => (
          <li key={t.id}>
            <NavLink
              to={`/couples/${coupleId}/${t.id}`}
              aria-current={t.id === active ? 'page' : undefined}
              className={`relative inline-flex min-h-11 items-center rounded-t-lg px-4 font-bold ${
                t.id === active
                  ? 'bg-surface text-text shadow-card'
                  : 'text-muted hover:bg-surface-alt'
              }`}
            >
              {t.label}
              {withErrors.has(t.id) && (
                <span
                  className="ml-1.5 h-2 w-2 rounded-full bg-[#a33a50]"
                  aria-label="ada kesalahan"
                />
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Editor({ initial, tab }: { initial: Couple; tab: TabId }) {
  const toast = useToast()
  const { markSaved } = useMediaSession()
  const { form, couple, setCouple, save, reloadLatest } = useCoupleForm(initial)
  const { isDirty, isSubmitting } = form.formState
  const [conflict, setConflict] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const wide = useMediaQuery('(min-width: 1024px)')
  const [a, b] = orderedCouple(couple.content)
  const TabComponent = TAB_COMPONENTS[tab]

  useEffect(() => {
    document.title = `${a.nickname} & ${b.nickname} · Admin Undangan`
  }, [a.nickname, b.nickname])

  // Warn before leaving the couple (FR-013); tab switches keep the form.
  const blocker = useBlocker(({ nextLocation }) => {
    if (!isDirty) return false
    const [, section, id, next] = nextLocation.pathname.split('/')
    return !(section === 'couples' && id === couple.id && isTabId(next))
  })
  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const onValid = useCallback(
    async (values: CoupleFormValues, overwrite = false) => {
      const result = await save(values, { overwrite })
      if (result.ok) {
        markSaved(result.couple.content)
        toast('Tersimpan')
        setConflict(false)
      } else if (result.reason === 'conflict') {
        setConflict(true)
      } else {
        toast(result.reason === 'slug' ? result.message : `Gagal menyimpan: ${result.message}`)
      }
    },
    [save, markSaved, toast],
  )

  const onInvalid = useCallback(
    (errors: FieldErrors<CoupleFormValues>) => {
      toast('Periksa kembali data yang ditandai')
      const first = errorPaths(errors)[0]
      if (first && tabOfPath(first) !== tab) {
        document.getElementById(`tab-jump-${tabOfPath(first)}`)?.click()
      } else {
        window.setTimeout(() => {
          document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
        }, 50)
      }
    },
    [toast, tab],
  )

  const setStatus = useCallback(
    async (status: CoupleStatus) => {
      const next = await coupleRepository.setStatus(couple.id, status)
      setCouple(next)
      toast(status === 'active' ? 'Undangan diterbitkan' : 'Undangan dijadikan draf')
    },
    [couple.id, setCouple, toast],
  )

  return (
    <EditorContext.Provider value={{ couple, setStatus }}>
      <FormProvider {...form}>
        {/* Hidden links used to jump to the tab with the first error. */}
        {TABS.map((t) => (
          <Link
            key={t.id}
            id={`tab-jump-${t.id}`}
            to={`/couples/${couple.id}/${t.id}`}
            className="hidden"
            tabIndex={-1}
            aria-hidden
          />
        ))}
        <form
          noValidate
          onSubmit={form.handleSubmit((v) => onValid(v), onInvalid)}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="text-sm font-bold text-muted hover:underline">
              ← Daftar
            </Link>
            <h1 className="min-w-0 truncate font-script text-4xl text-text">
              {a.nickname} &amp; {b.nickname}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                couple.status === 'active'
                  ? 'bg-highlight text-highlight-text'
                  : 'bg-surface-alt text-muted'
              }`}
            >
              {couple.status === 'active' ? 'Aktif' : 'Draf'}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Link to={`/couples/${couple.id}/preview`} className="btn-outline px-4 py-1 text-sm">
                Pratinjau
              </Link>
              <button type="submit" className="btn-primary" disabled={!isDirty || isSubmitting}>
                {isSubmitting ? 'Menyimpan…' : isDirty ? 'Simpan' : 'Tersimpan'}
              </button>
            </div>
          </div>

          <TabBar coupleId={couple.id} active={tab} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="min-w-0">
              <Suspense fallback={<p className="text-muted">Memuat…</p>}>
                <TabComponent />
              </Suspense>
            </div>
            {wide && (
              <aside aria-label="Pratinjau langsung" className="sticky top-20">
                <PhonePreview initialTheme={couple.defaultTheme} />
              </aside>
            )}
          </div>
        </form>

        {/* Phones: the preview opens in a full-screen sheet. */}
        {!wide && (
          <button
            type="button"
            className="btn-primary fixed right-4 bottom-4 z-40"
            onClick={() => setPreviewOpen(true)}
          >
            Lihat Tampilan
          </button>
        )}
        {!wide && previewOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pratinjau langsung"
            className="fixed inset-0 z-[60] overflow-y-auto bg-bg px-4 py-4"
          >
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                className="btn-outline px-4 py-1 text-sm"
                onClick={() => setPreviewOpen(false)}
              >
                Tutup
              </button>
            </div>
            <PhonePreview initialTheme={couple.defaultTheme} />
          </div>
        )}

        {blocker.state === 'blocked' && (
          <Dialog
            title="Perubahan belum disimpan"
            onClose={() => blocker.reset()}
            actions={
              <>
                <button type="button" className="btn-outline" onClick={() => blocker.reset()}>
                  Tetap di sini
                </button>
                <button type="button" className="btn-primary" onClick={() => blocker.proceed()}>
                  Tinggalkan halaman
                </button>
              </>
            }
          >
            <p>Perubahan belum disimpan. Tinggalkan halaman?</p>
          </Dialog>
        )}

        {conflict && (
          <Dialog
            title="Data sudah berubah"
            onClose={() => setConflict(false)}
            actions={
              <>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={async () => {
                    await reloadLatest()
                    setConflict(false)
                    toast('Data terbaru dimuat')
                  }}
                >
                  Muat ulang
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onValid(form.getValues(), true)}
                >
                  Timpa
                </button>
              </>
            }
          >
            <p>Data pasangan ini sudah diubah di tab lain.</p>
          </Dialog>
        )}
      </FormProvider>
    </EditorContext.Provider>
  )
}

export default function EditorPage() {
  const { id = '', tab } = useParams()
  const { state } = useLoad(async () => {
    await ready
    return coupleRepository.get(id)
  }, id)

  if (!isTabId(tab)) return <Navigate to={`/couples/${id}/mempelai`} replace />
  if (state.status === 'loading') return <p className="text-muted">Memuat…</p>
  if (state.status === 'error') {
    return (
      <MessagePage
        title="Pasangan tidak ditemukan"
        message="Data pasangan ini tidak ada."
        themeId="elegant-classic"
      />
    )
  }
  return (
    <MediaSessionProvider coupleId={state.data.id} savedContent={toFormValues(state.data).content}>
      <Editor initial={state.data} tab={tab} />
    </MediaSessionProvider>
  )
}
