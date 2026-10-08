import qrcode from 'qrcode-generator'
import { useMemo } from 'react'
import { downloadBlob } from '../lib/download'

/** QR code for an invitation link, with an SVG download for printed cards. */
export function QrCode({ url, fileName }: { url: string; fileName: string }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(url)
    qr.make()
    return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true })
  }, [url])

  function download() {
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${fileName}.svg`)
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
