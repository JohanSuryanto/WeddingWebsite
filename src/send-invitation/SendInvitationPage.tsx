import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PhoneFrame } from '../components/PhoneFrame'
import { ToastProvider, useToast } from '../components/Toast'
import { mainEvent, orderedCouple } from '../content/selectors'
import type { WeddingContent } from '../content/types'
import { copyText } from '../lib/clipboard'
import { tryFormatDateId } from '../lib/dateFormat'
import {
  buildInviteUrl,
  fillMessage,
  isTooLong,
  parseGuestList,
  whatsappUrl,
} from '../lib/inviteLink'
import { GUEST_NAME_MAX } from '../lib/guestName'
import { resolveThemeId, ThemeProvider, themes } from '../themes'
import type { ThemeId } from '../themes/types'

const FALLBACK_MESSAGE = 'Kepada Yth.\n{nama}\n\nKami mengundang Anda ke pernikahan kami:\n{link}'

function load(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function save(key: string, value: string | null) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Private mode or blocked storage: keep working without remembering.
  }
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className="card p-5 sm:p-6">
      <h2 id={`step-${n}`} className="mb-4 flex items-center gap-3 text-2xl text-text">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-body text-base font-bold text-primary-contrast">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

export interface SendInvitationProps {
  /** The couple's invitation content. */
  content: WeddingContent
  /** Public invitation address, e.g. https://wedding.johansuryanto.dev/anisa-raka */
  coupleUrl: string
  /** Theme selected when the page opens (unless ?t= says otherwise). */
  defaultThemeId: ThemeId
  /** Address loaded by the phone preview for a guest name and theme number. */
  previewUrl: (guestName: string, themeCode: string) => string
  /** Shown under the heading, e.g. "Undangan belum aktif". */
  notice?: ReactNode
  /** Top-right actions, e.g. "Keluar" on the couple's own page. */
  actions?: ReactNode
  /** Below the link generator, e.g. the guest responses (US5). */
  extra?: ReactNode
}

function SendInvitation({
  content,
  coupleUrl,
  defaultThemeId,
  previewUrl,
  notice,
  actions,
  extra,
}: SendInvitationProps) {
  const toast = useToast()
  const [first, second] = orderedCouple(content)
  const COUPLE = `${first.nickname} & ${second.nickname}`
  const DATE = tryFormatDateId(mainEvent(content)?.start)
  const DEFAULT_TEMPLATE = content.shareMessage ?? FALLBACK_MESSAGE
  const slug = new URL(coupleUrl).pathname.split('/').filter(Boolean).pop() ?? ''
  const templateKey = `sendInvitation.template.${slug}`

  const [themeId, setThemeId] = useState<ThemeId>(() =>
    resolveThemeId(window.location.search, defaultThemeId),
  )
  const [namesText, setNamesText] = useState('')
  const [template, setTemplate] = useState(() => load(templateKey) ?? DEFAULT_TEMPLATE)
  const [previewIndex, setPreviewIndex] = useState(0)

  const theme = themes[themeId]
  const names = useMemo(() => parseGuestList(namesText), [namesText])
  // With no names yet, offer one general link ("Bapak/Ibu/Saudara/i").
  const rows = names.length ? names : ['']
  const previewName = rows[Math.min(previewIndex, rows.length - 1)] || null

  useEffect(() => {
    document.title = `Buat Link Undangan · ${COUPLE}`
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.appendChild(robots)
    return () => robots.remove()
  }, [COUPLE])

  const linkFor = (name: string) => buildInviteUrl(coupleUrl, name, theme.code)
  const messageFor = (name: string) =>
    fillMessage(template, {
      nama: name || content.cover.defaultGuestLabel,
      link: linkFor(name),
      mempelai: COUPLE,
      tanggal: DATE,
    })

  async function copy(text: string, done: string) {
    toast((await copyText(text)) ? done : 'Gagal menyalin')
  }

  return (
    <ThemeProvider themeId={themeId}>
      <div className="min-h-dvh bg-bg px-4 py-8 sm:px-6 md:py-12">
        <header className="mx-auto mb-8 max-w-6xl text-center">
          {actions && <div className="mb-2 flex justify-end">{actions}</div>}
          <p className="font-script text-4xl text-text sm:text-5xl">{COUPLE}</p>
          <h1 className="mt-2 text-3xl text-text sm:text-4xl">Buat Link Undangan</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted">
            Pilih tema, tulis nama tamu, lalu salin link atau kirim langsung lewat WhatsApp.
          </p>
          {notice && <div className="mx-auto mt-4 max-w-xl">{notice}</div>}
        </header>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="min-w-0 space-y-6">
            <Step n={1} title="Pilih Tema">
              <div role="radiogroup" aria-label="Tema" className="grid gap-3 sm:grid-cols-3">
                {Object.values(themes).map((t) => {
                  const selected = t.id === themeId
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setThemeId(t.id)}
                      data-theme={t.id}
                      className={`overflow-hidden rounded-xl border-2 text-left transition-shadow ${
                        selected
                          ? 'border-accent shadow-card'
                          : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span className="flex h-20 items-center justify-center bg-bg">
                        <span className="font-script text-3xl text-text">{COUPLE}</span>
                      </span>
                      <span className="flex items-center gap-2 bg-surface px-3 py-2">
                        <span className="h-4 w-4 rounded-full bg-primary" />
                        <span className="h-4 w-4 rounded-full bg-accent" />
                        <span className="h-4 w-4 rounded-full border border-black/10 bg-surface-alt" />
                        <span className="ml-auto font-heading text-base font-semibold text-text">
                          {t.code}. {t.name}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </Step>

            <Step n={2} title="Nama Tamu">
              <label htmlFor="guest-names" className="mb-1 block font-bold text-text">
                Satu nama per baris
              </label>
              <textarea
                id="guest-names"
                className="field min-h-36 resize-y"
                value={namesText}
                onChange={(e) => {
                  setNamesText(e.target.value)
                  setPreviewIndex(0)
                }}
                placeholder={'Budi Santoso\nJohan & Partner\nKeluarga Bapak Andi'}
              />
              <p className="mt-1 text-sm text-muted">
                {names.length} tamu · Tanpa nama, tamu akan disapa &ldquo;
                {content.cover.defaultGuestLabel}&rdquo;. Maksimal {GUEST_NAME_MAX} karakter per
                nama.
              </p>
            </Step>

            <Step n={3} title="Salin & Kirim">
              {names.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-outline text-sm"
                    onClick={() =>
                      copy(
                        names.map((n) => `${n}: ${linkFor(n)}`).join('\n'),
                        'Semua link tersalin!',
                      )
                    }
                  >
                    Salin Semua Link
                  </button>
                </div>
              )}
              <ul className="space-y-3" data-testid="invite-rows">
                {rows.map((name, i) => {
                  const link = linkFor(name)
                  const previewing = i === Math.min(previewIndex, rows.length - 1)
                  return (
                    <li
                      key={`${i}-${name}`}
                      className={`rounded-xl border p-3 sm:p-4 ${
                        previewing ? 'border-accent bg-highlight/40' : 'border-black/10'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 flex-1 font-bold break-words text-text">
                          {name || content.cover.defaultGuestLabel}
                          {!name && <span className="font-normal text-muted"> (link umum)</span>}
                        </p>
                        {isTooLong(name) && (
                          <span className="text-xs font-bold text-[#a33a50]">
                            Lebih dari {GUEST_NAME_MAX} karakter, akan dipotong
                          </span>
                        )}
                        <button
                          type="button"
                          className="text-sm font-bold text-muted underline-offset-2 hover:underline"
                          onClick={() => setPreviewIndex(i)}
                          aria-pressed={previewing}
                        >
                          {previewing ? 'Sedang ditampilkan' : 'Lihat tampilan'}
                        </button>
                      </div>
                      <p
                        className="mt-1 font-mono text-xs break-all text-muted"
                        data-testid="invite-link"
                      >
                        {link || '—'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary px-4 py-2 text-sm"
                          onClick={() => copy(link, 'Link tersalin!')}
                        >
                          Salin Link
                        </button>
                        <button
                          type="button"
                          className="btn-outline text-sm"
                          onClick={() => copy(messageFor(name), 'Pesan tersalin!')}
                        >
                          Salin Pesan
                        </button>
                        <a
                          href={whatsappUrl(messageFor(name))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline text-sm"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" />
                          </svg>
                          WhatsApp
                        </a>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Step>

            <details className="card p-5 sm:p-6">
              <summary className="cursor-pointer font-heading text-xl text-text">
                Pengaturan pesan WhatsApp
              </summary>
              <div className="mt-4 space-y-5">
                <div>
                  <label htmlFor="share-template" className="mb-1 block font-bold text-text">
                    Pesan WhatsApp
                  </label>
                  <textarea
                    id="share-template"
                    className="field min-h-64 resize-y font-body text-sm"
                    value={template}
                    onChange={(e) => {
                      setTemplate(e.target.value)
                      save(templateKey, e.target.value)
                    }}
                  />
                  <p className="mt-1 text-sm text-muted">
                    Kode yang diganti otomatis: <code>{'{nama}'}</code>, <code>{'{link}'}</code>,{' '}
                    <code>{'{mempelai}'}</code>, <code>{'{tanggal}'}</code>. Perubahan hanya
                    tersimpan di browser ini.
                  </p>
                  <button
                    type="button"
                    className="btn-outline mt-2 text-sm"
                    onClick={() => {
                      setTemplate(DEFAULT_TEMPLATE)
                      save(templateKey, null)
                    }}
                  >
                    Kembalikan pesan awal
                  </button>
                </div>
              </div>
            </details>
          </div>

          <aside aria-label="Tampilan undangan" className="lg:sticky lg:top-6">
            <p className="mb-2 text-center text-sm font-bold text-muted">
              Tampilan untuk: {previewName ?? content.cover.defaultGuestLabel}
            </p>
            <PhoneFrame
              src={previewUrl(previewName ?? '', theme.code)}
              title="Tampilan undangan untuk tamu"
              testId="cover-preview"
            />
          </aside>
        </div>
        {extra && <div className="mx-auto mt-6 max-w-6xl">{extra}</div>}
      </div>
    </ThemeProvider>
  )
}

export function SendInvitationPage(props: SendInvitationProps) {
  return (
    <ToastProvider>
      <SendInvitation {...props} />
    </ToastProvider>
  )
}
