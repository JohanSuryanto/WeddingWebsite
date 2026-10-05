import qrcode from 'qrcode-generator'
import { useMemo } from 'react'

/** QR code for an invitation link, with an SVG download for printed cards. */
export function QrCode({ url, fileName }: { url: string; fileName: string }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(url)
    qr.make()
    return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true })
  }, [url])

  function download() {
    const href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const a = document.createElement('a')
    a.href = href
    a.download = `${fileName}.svg`
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(href), 1000)
  }

  return (
    <div className="flex flex-wrap items-center gap-4" data-testid="qr-code">
      <div
        className="h-36 w-36 shrink-0 rounded-lg bg-white p-2"
        role="img"
        aria-label={`Kode QR untuk ${url}`}
        // Generated locally from our own URL; contains no user HTML.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="space-y-2 text-sm text-muted">
        <p>Untuk kartu undangan cetak: tamu memindai kode ini untuk membuka undangan.</p>
        <button type="button" className="btn-outline px-4 py-1 text-sm" onClick={download}>
          Unduh QR
        </button>
      </div>
    </div>
  )
}
