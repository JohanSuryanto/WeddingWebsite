/**
 * Landing page texts and contact (wedding.johansuryanto.dev). Edit here only.
 */
export const service = {
  brandName: 'Undangan Digital',
  tagline: 'Undangan pernikahan online yang cantik, personal, dan mudah dibagikan lewat WhatsApp.',
  /** GANTI dengan nomor asli: format internasional tanpa "+" (contoh 6281234567890). */
  whatsappNumber: '6281234567890',
  whatsappMessage: 'Halo, saya ingin memesan undangan digital.',
  /** Couple used for the theme examples: /<sampleSlug>?t=1|2|3 */
  sampleSlug: 'anisa-raka',
  features: [
    { title: '3 pilihan tema', text: 'Romantic Floral, Elegant Classic, dan Rustic Garden.' },
    { title: 'Nama tamu di setiap link', text: 'Setiap tamu disapa dengan namanya sendiri.' },
    {
      title: 'Hitung mundur & simpan tanggal',
      text: 'Langsung ke Google Calendar atau kalender HP.',
    },
    { title: 'Galeri foto', text: 'Foto prewedding tampil indah, bisa dilihat layar penuh.' },
    { title: 'Amplop digital', text: 'Nomor rekening dan e-wallet dengan tombol salin.' },
    { title: 'Konfirmasi kehadiran & ucapan', text: 'Tamu bisa RSVP dan mengirim doa.' },
  ],
  steps: [
    { title: 'Hubungi kami', text: 'Chat lewat WhatsApp untuk mulai memesan.' },
    { title: 'Kirim data & foto', text: 'Nama, jadwal acara, lokasi, cerita, dan foto.' },
    { title: 'Pilih tema & bagikan', text: 'Terima link Anda, pilih tema, dan kirim ke tamu.' },
  ],
} as const

export function whatsappContactUrl(): string {
  return `https://wa.me/${service.whatsappNumber}?text=${encodeURIComponent(service.whatsappMessage)}`
}
