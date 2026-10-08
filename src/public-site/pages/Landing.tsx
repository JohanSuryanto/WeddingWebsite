import { useEffect } from 'react'
import { service, whatsappContactUrl } from '../../config/service'
import { themes, ThemeProvider } from '../../themes'

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" />
    </svg>
  )
}

/** wedding.johansuryanto.dev/ — the service's landing page (US7). */
export function Landing() {
  const { CoverBackdrop, SectionDivider, NameFlourish } = themes['romantic-floral'].ornaments
  const contact = whatsappContactUrl()

  useEffect(() => {
    document.title = `${service.brandName} · Undangan Pernikahan Online`
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = service.tagline
  }, [])

  return (
    <ThemeProvider themeId="romantic-floral">
      <header className="relative flex min-h-[85dvh] items-center justify-center overflow-hidden bg-bg px-4 py-20 text-center">
        <CoverBackdrop />
        <div className="relative z-[1] max-w-2xl">
          <p className="font-heading text-lg tracking-[0.3em] text-muted uppercase">
            Undangan Pernikahan
          </p>
          <h1 className="mt-3 font-script text-6xl leading-tight font-normal text-text sm:text-7xl">
            {service.brandName}
          </h1>
          {NameFlourish && <NameFlourish />}
          <p className="mx-auto mt-5 max-w-xl text-lg text-text">{service.tagline}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={contact} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <WhatsAppIcon />
              Pesan Sekarang
            </a>
            <a href="#tema" className="btn-outline">
              Lihat Contoh
            </a>
          </div>
        </div>
      </header>

      <main>
        <section aria-labelledby="fitur-title" className="bg-surface-alt px-4 py-16 md:py-24">
          <div className="mx-auto max-w-5xl">
            <h2 id="fitur-title" className="text-center text-3xl text-text sm:text-4xl">
              Semua yang tamu butuhkan
            </h2>
            <SectionDivider />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {service.features.map((f) => (
                <li key={f.title} className="card p-5">
                  <h3 className="text-xl text-text">{f.title}</h3>
                  <p className="mt-1 text-muted">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="tema" aria-labelledby="tema-title" className="bg-bg px-4 py-16 md:py-24">
          <div className="mx-auto max-w-5xl">
            <h2 id="tema-title" className="text-center text-3xl text-text sm:text-4xl">
              Pilih Tema
            </h2>
            <SectionDivider />
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="theme-examples">
              {Object.values(themes).map((t) => {
                const { CoverBackdrop: Backdrop } = t.ornaments
                return (
                  <li key={t.id} data-theme={t.id} className="card overflow-hidden">
                    <div className="relative flex h-56 items-center justify-center overflow-hidden bg-bg">
                      <Backdrop />
                      <p className="relative z-[1] font-script text-4xl text-text">
                        Anisa &amp; Raka
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-surface px-4 py-3">
                      <div>
                        <p className="font-heading text-lg font-semibold text-text">{t.name}</p>
                        <p className="text-xs text-muted">Tema {t.code}</p>
                      </div>
                      <a
                        href={`/${service.sampleSlug}?t=${t.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline px-4 py-1 text-sm"
                        aria-label={`Lihat contoh tema ${t.name}`}
                      >
                        Lihat Contoh
                      </a>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <section aria-labelledby="cara-title" className="bg-surface-alt px-4 py-16 md:py-24">
          <div className="mx-auto max-w-4xl">
            <h2 id="cara-title" className="text-center text-3xl text-text sm:text-4xl">
              Cara Pesan
            </h2>
            <SectionDivider />
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {service.steps.map((s, i) => (
                <li key={s.title} className="card p-5 text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-contrast">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 text-xl text-text">{s.title}</h3>
                  <p className="mt-1 text-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="relative overflow-hidden bg-bg px-4 py-16 text-center">
        <CoverBackdrop />
        <div className="relative z-[1]">
          <p className="font-script text-4xl text-text">{service.brandName}</p>
          <p className="mt-2 text-muted">Siap membantu hari bahagia Anda.</p>
          <a href={contact} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6">
            <WhatsAppIcon />
            Hubungi via WhatsApp
          </a>
        </div>
      </footer>
    </ThemeProvider>
  )
}
