import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PhoneFrame } from '../components/PhoneFrame'
import { ToastProvider, useToast } from '../components/Toast'
import { mainEvent, orderedCouple } from '../content/selectors'
import type { WeddingContent } from '../content/types'
import { copyText } from '../lib/clipboard'
import { tryFormatDateId } from '../lib/dateFormat'
import { rsvpClosed } from '../lib/rsvpDeadline'
import {
  buildInviteUrl,
  fillMessage,
  isTooLong,
  parseGuestList,
  whatsappUrl,
} from '../lib/inviteLink'
import { GUEST_NAME_MAX, guestCodeOf } from '../lib/guestName'
import { resolveThemeId, ThemeProvider, themes } from '../themes'
import type { ThemeId } from '../themes/types'
import { matchGuests, type Guest, type GuestListApi } from './guestList'

const FALLBACK_MESSAGE = 'Kepada Yth.\n{nama}\n\nKami mengundang Anda ke pernikahan kami:\n{link}'

/** The reminder for guests who haven't answered yet (editable on the page). */
function defaultReminder(hasDeadline: boolean) {
  return [
    'Halo {nama},',
    '',
    'Mengingatkan undangan pernikahan {mempelai} pada {tanggal}.',
    hasDeadline
      ? 'Mohon konfirmasi kehadiran Anda sebelum {batas} melalui link berikut:'
      : 'Mohon konfirmasi kehadiran Anda melalui link berikut:',
    '{link}',
    '',
    'Terima kasih.',
  ].join('\n')
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" />
    </svg>
  )
}

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
  /** Saves the names and marks who was sent a link. Must be stable (useMemo). */
  guestList?: GuestListApi
}

function SendInvitation({
  content,
  coupleUrl,
  defaultThemeId,
  previewUrl,
  notice,
  actions,
  extra,
  guestList,
}: SendInvitationProps) {
  const toast = useToast()
  const [first, second] = orderedCouple(content)
  const COUPLE = `${first.nickname} & ${second.nickname}`
  const DATE = tryFormatDateId(mainEvent(content)?.start)
  const DEFAULT_TEMPLATE = content.shareMessage ?? FALLBACK_MESSAGE
  const slug = new URL(coupleUrl).pathname.split('/').filter(Boolean).pop() ?? ''
  const templateKey = `sendInvitation.template.${slug}`
  const reminderKey = `sendInvitation.reminder.${slug}`
  const DEADLINE = content.rsvpDeadline ? tryFormatDateId(`${content.rsvpDeadline}T12:00:00+07:00`) : ''
  const rsvpOpen = !rsvpClosed(content.rsvpDeadline)
  const DEFAULT_REMINDER = defaultReminder(!!content.rsvpDeadline)

  const [themeId, setThemeId] = useState<ThemeId>(() =>
    resolveThemeId(window.location.search, defaultThemeId),
  )
  const [namesText, setNamesText] = useState('')
  const [template, setTemplate] = useState(() => load(templateKey) ?? DEFAULT_TEMPLATE)
  const [reminder, setReminder] = useState(() => load(reminderKey) ?? DEFAULT_REMINDER)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [guests, setGuests] = useState<Guest[]>([])
  const [listState, setListState] = useState<'loading' | 'ready' | 'saving' | 'error' | 'load-error'>(
    guestList ? 'loading' : 'ready',
  )
  const [show, setShow] = useState<'all' | 'unsent' | 'noReply'>('all')
  const saveSeq = useRef(0)

  const theme = themes[themeId]
  const names = useMemo(() => parseGuestList(namesText), [namesText])
  // With no names yet, offer one general link ("Bapak/Ibu/Saudara/i").
  const rows = names.length ? names : ['']
  const previewName = rows[Math.min(previewIndex, rows.length - 1)] || null
  const matched = useMemo(() => matchGuests(names, guests), [names, guests])
  const sentCount = matched.filter((g) => g?.sentAt).length
  const repliedCount = matched.filter((g) => g?.reply).length
  // Never save over a list that didn't load: that would wipe it.
  const dirty =
    !!guestList &&
    listState !== 'loading' &&
    listState !== 'load-error' &&
    names.join('\n') !== guests.map((g) => g.name).join('\n')

  useEffect(() => {
    if (!guestList) return
    let active = true
    guestList.load().then(
      (list) => {
        if (!active) return
        setGuests(list)
        setNamesText(list.map((g) => g.name).join('\n'))
        setListState('ready')
      },
      () => active && setListState('load-error'),
    )
    return () => {
      active = false
    }
  }, [guestList])

  const saveNow = useCallback(async (): Promise<Guest[]> => {
    if (!guestList) return []
    const seq = ++saveSeq.current
    setListState('saving')
    try {
      const list = await guestList.save(names)
      // An older save finishing late must not undo a newer one.
      if (seq === saveSeq.current) {
        setGuests(list)
        setListState('ready')
      }
      return list
    } catch (err) {
      if (seq === saveSeq.current) setListState('error')
      throw err
    }
  }, [guestList, names])

  // Save a moment after typing stops.
  useEffect(() => {
    if (!dirty) return
    const id = window.setTimeout(() => void saveNow().catch(() => {}), 700)
    return () => window.clearTimeout(id)
  }, [dirty, saveNow])

  /**
   * A row can be shared once its guest is saved, so the link carries their code
   * (`?g=`) and the reply is matched. New names wait the moment the autosave takes:
   * copying has to happen right in the click (Safari), so it can't wait for a save.
   */
  const canShare = (i: number) =>
    !guestList || listState === 'load-error' || !names[i] || !!matched[i]

  /** Marks row `i` as sent (or not). */
  async function markSent(i: number, sent = true) {
    const guest = guestList ? matched[i] : undefined
    if (!guestList || !guest || !!guest.sentAt === sent) return
    try {
      const updated = await guestList.setSent(guest.id, sent)
      setGuests((list) => list.map((g) => (g.id === updated.id ? updated : g)))
    } catch {
      toast('Gagal menyimpan status kirim')
    }
  }

  useEffect(() => {
    document.title = `Buat Link Undangan · ${COUPLE}`
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.appendChild(robots)
    return () => robots.remove()
  }, [COUPLE])

  const linkFor = (name: string, guest?: Guest) =>
    buildInviteUrl(coupleUrl, name, theme.code, guest && guestCodeOf(guest.id))
  const messageFor = (name: string, guest?: Guest, text = template) =>
    fillMessage(text, {
      nama: name || content.cover.defaultGuestLabel,
      link: linkFor(name, guest),
      mempelai: COUPLE,
      tanggal: DATE,
      batas: DEADLINE,
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
                disabled={listState === 'loading'}
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
              {guestList && (
                <p className="mt-1 text-sm font-bold text-muted" role="status" data-testid="guest-list-status">
                  {listState === 'loading' && 'Memuat daftar tamu…'}
                  {listState === 'saving' && 'Menyimpan…'}
                  {listState === 'ready' && (dirty ? 'Belum tersimpan…' : 'Daftar tamu tersimpan otomatis.')}
                  {listState === 'error' && (
                    <>
                      Gagal menyimpan daftar tamu.{' '}
                      <button type="button" className="underline" onClick={() => void saveNow().catch(() => {})}>
                        Coba lagi
                      </button>
                    </>
                  )}
                  {listState === 'load-error' && (
                    <>
                      Gagal memuat daftar tamu; perubahan tidak disimpan.{' '}
                      <button type="button" className="underline" onClick={() => window.location.reload()}>
                        Muat ulang
                      </button>
                    </>
                  )}
                </p>
              )}
            </Step>

            <Step n={3} title="Salin & Kirim">
              {guestList && names.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <p className="font-bold text-text" data-testid="sent-count">
                    {sentCount} dari {names.length} tamu sudah dikirim
                  </p>
                  <p className="font-bold text-text" data-testid="reply-count">
                    {repliedCount} sudah menjawab
                  </p>
                  <label className="flex items-center gap-2 text-muted">
                    Tampilkan
                    <select
                      className="field min-h-11 w-auto py-1 text-sm"
                      value={show}
                      onChange={(e) => setShow(e.target.value as typeof show)}
                    >
                      <option value="all">Semua tamu</option>
                      <option value="unsent">Belum dikirim</option>
                      <option value="noReply">Belum menjawab</option>
                    </select>
                  </label>
                </div>
              )}
              {names.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-outline text-sm"
                    disabled={!names.every((_, i) => canShare(i))}
                    onClick={() =>
                      copy(
                        names.map((n, i) => `${n}: ${linkFor(n, matched[i])}`).join('\n'),
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
                  const guest = guestList ? matched[i] : undefined
                  const sentAt = guest?.sentAt
                  if (show === 'unsent' && sentAt) return null
                  if (show === 'noReply' && guest?.reply) return null
                  const ready = canShare(i)
                  const link = linkFor(name, guest)
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
                        {sentAt && (
                          <span className="flex items-center gap-1 text-xs font-bold text-muted">
                            <span
                              className="rounded-full bg-highlight px-2 py-0.5 text-highlight-text"
                              data-testid="sent-badge"
                            >
                              ✓ Terkirim
                            </span>
                            <button
                              type="button"
                              className="underline-offset-2 hover:underline"
                              aria-label={`Tandai belum dikirim: ${name}`}
                              onClick={() => void markSent(i, false)}
                            >
                              Batalkan
                            </button>
                          </span>
                        )}
                        {guest?.reply && (
                          <span
                            className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-contrast"
                            data-testid="reply-badge"
                          >
                            {guest.reply.attendance === 'hadir'
                              ? `Hadir · ${guest.reply.guestCount} orang`
                              : 'Tidak hadir'}
                          </span>
                        )}
                        {guest?.wished && (
                          <span className="text-xs font-bold text-muted" data-testid="wish-badge">
                            Mengirim ucapan
                          </span>
                        )}
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
                          disabled={!ready}
                          title={ready ? undefined : 'Menyimpan nama tamu…'}
                          onClick={() => {
                            void copy(link, 'Link tersalin!')
                            void markSent(i)
                          }}
                        >
                          Salin Link
                        </button>
                        <button
                          type="button"
                          className="btn-outline text-sm"
                          disabled={!ready}
                          title={ready ? undefined : 'Menyimpan nama tamu…'}
                          onClick={() => {
                            void copy(messageFor(name, guest), 'Pesan tersalin!')
                            void markSent(i)
                          }}
                        >
                          Salin Pesan
                        </button>
                        <a
                          href={ready ? whatsappUrl(messageFor(name, guest)) : undefined}
                          aria-disabled={!ready || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`btn-outline text-sm ${ready ? '' : 'pointer-events-none opacity-50'}`}
                          onClick={() => void markSent(i)}
                        >
                          <WhatsAppIcon />
                          WhatsApp
                        </a>
                      </div>
                      {guest?.sentAt && !guest.reply && rsvpOpen && (
                        <div
                          className="mt-3 flex flex-wrap items-center gap-2 border-t border-black/10 pt-3"
                          data-testid="reminder"
                        >
                          <span className="text-sm font-bold text-muted">Belum menjawab:</span>
                          <button
                            type="button"
                            className="btn-outline text-sm"
                            onClick={() => void copy(messageFor(name, guest, reminder), 'Pengingat tersalin!')}
                          >
                            Salin Pengingat
                          </button>
                          <a
                            href={whatsappUrl(messageFor(name, guest, reminder))}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-outline text-sm"
                            aria-label={`Kirim pengingat lewat WhatsApp: ${name}`}
                          >
                            <WhatsAppIcon />
                            Pengingat
                          </a>
                        </div>
                      )}
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
                    <code>{'{mempelai}'}</code>, <code>{'{tanggal}'}</code>,{' '}
                    <code>{'{batas}'}</code> (batas konfirmasi). Perubahan hanya tersimpan di browser
                    ini.
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
                <div>
                  <label htmlFor="reminder-template" className="mb-1 block font-bold text-text">
                    Pesan pengingat
                  </label>
                  <textarea
                    id="reminder-template"
                    className="field min-h-48 resize-y font-body text-sm"
                    value={reminder}
                    onChange={(e) => {
                      setReminder(e.target.value)
                      save(reminderKey, e.target.value)
                    }}
                  />
                  <p className="mt-1 text-sm text-muted">
                    Untuk tamu yang sudah dikirimi link tetapi belum menjawab. Kode yang sama dengan
                    pesan di atas.
                  </p>
                  <button
                    type="button"
                    className="btn-outline mt-2 text-sm"
                    onClick={() => {
                      setReminder(DEFAULT_REMINDER)
                      save(reminderKey, null)
                    }}
                  >
                    Kembalikan pengingat awal
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
