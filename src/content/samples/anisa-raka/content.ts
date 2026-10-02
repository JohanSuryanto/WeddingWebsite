// Contoh pasangan bawaan (demo di /anisa-raka dan data awal dashboard admin).
// Pasangan sungguhan dibuat lewat dashboard admin, bukan di file ini.
import type { WeddingContent } from '../../types'

import coverBg from './images/cover-bg.webp'
import bridePhoto from './images/bride.webp'
import groomPhoto from './images/groom.webp'
import story1 from './images/story-1.webp'
import story2 from './images/story-2.webp'
import story3 from './images/story-3.webp'
import story4 from './images/story-4.webp'
import gallery1 from './images/gallery-1.webp'
import gallery2 from './images/gallery-2.webp'
import gallery3 from './images/gallery-3.webp'
import gallery4 from './images/gallery-4.webp'
import gallery5 from './images/gallery-5.webp'
import gallery6 from './images/gallery-6.webp'
import gallery7 from './images/gallery-7.webp'
import gallery8 from './images/gallery-8.webp'
import backsound from './backsound.wav'

const portrait = { width: 1200, height: 1600 }
const landscape = { width: 1600, height: 1200 }
const square = { width: 1200, height: 1200 }

export const anisaRaka: WeddingContent = {
  cover: {
    heading: 'The Wedding of',
    defaultGuestLabel: 'Bapak/Ibu/Saudara/i',
    background: { src: coverBg, width: 1200, height: 1600 },
  },

  couple: {
    order: 'bride-first',
    hashtag: '#AnisaRakaMenujuHalal',
    bride: {
      fullName: 'Anisa Putri Lestari, S.Ds.',
      nickname: 'Anisa',
      photo: { src: bridePhoto, width: 600, height: 600 },
      childOrder: 'Putri pertama dari',
      father: 'Hendra Wijaya',
      mother: 'Sari Lestari',
      instagram: 'anisaputri',
    },
    groom: {
      fullName: 'Raka Aditya Pratama, S.T.',
      nickname: 'Raka',
      photo: { src: groomPhoto, width: 600, height: 600 },
      childOrder: 'Putra kedua dari',
      father: 'Budi Santoso',
      mother: 'Rina Marlina',
      instagram: 'rakaaditya',
    },
  },

  events: [
    {
      id: 'akad',
      name: 'Akad Nikah',
      start: '2027-02-14T08:00:00+07:00',
      end: '2027-02-14T10:00:00+07:00',
      venueName: 'Masjid Agung Al-Azhar',
      address: 'Jl. Sisingamangaraja No.1, Kebayoran Baru, Jakarta Selatan',
      mapUrl: 'https://maps.google.com/?q=Masjid+Agung+Al-Azhar+Jakarta',
      isMain: true,
    },
    {
      id: 'resepsi',
      name: 'Resepsi',
      start: '2027-02-14T11:00:00+07:00',
      end: '2027-02-14T14:00:00+07:00',
      venueName: 'Gedung Serbaguna Graha Mulia',
      address: 'Jl. Melawai Raya No.10, Kebayoran Baru, Jakarta Selatan',
      mapUrl: 'https://maps.google.com/?q=Melawai+Raya+10+Jakarta',
      isMain: false,
    },
  ],

  story: [
    {
      title: 'Pertama Bertemu',
      date: 'Agustus 2019',
      description:
        'Kami pertama kali bertemu di sebuah acara kampus. Obrolan singkat tentang buku favorit menjadi awal dari segalanya.',
      photo: { src: story1, width: 800, height: 600 },
    },
    {
      title: 'Menjalin Kasih',
      date: 'Maret 2021',
      description:
        'Setelah bersahabat cukup lama, kami memutuskan untuk melangkah bersama dan saling menguatkan.',
      photo: { src: story2, width: 800, height: 600 },
    },
    {
      title: 'Lamaran',
      date: 'Juni 2026',
      description:
        'Dengan restu kedua keluarga, Raka melamar Anisa dalam acara sederhana yang penuh haru.',
      photo: { src: story3, width: 800, height: 600 },
    },
    {
      title: 'Menuju Halal',
      date: 'Februari 2027',
      description: 'Kini kami siap mengikat janji suci dan memulai babak baru kehidupan bersama.',
      photo: { src: story4, width: 800, height: 600 },
    },
  ],

  gallery: [
    { src: { src: gallery1, ...portrait }, alt: 'Anisa dan Raka tersenyum di taman' },
    { src: { src: gallery2, ...landscape }, alt: 'Anisa dan Raka berjalan di tepi pantai' },
    { src: { src: gallery3, ...square }, alt: 'Tangan Anisa dan Raka dengan cincin' },
    { src: { src: gallery4, ...portrait }, alt: 'Anisa memegang buket bunga' },
    { src: { src: gallery5, ...landscape }, alt: 'Raka dan Anisa di bawah pepohonan' },
    { src: { src: gallery6, ...square }, alt: 'Potret Anisa dan Raka saling menatap' },
    { src: { src: gallery7, ...portrait }, alt: 'Raka mengenakan jas di studio' },
    { src: { src: gallery8, ...landscape }, alt: 'Anisa dan Raka tertawa bersama' },
  ],

  gifts: {
    intro:
      'Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Namun jika Anda ingin memberikan tanda kasih, Anda dapat mengirimkannya melalui:',
    accounts: [
      { provider: 'BCA', accountNumber: '1234 5678 90', accountHolder: 'Anisa Putri Lestari' },
      { provider: 'DANA', accountNumber: '0812-3456-7890', accountHolder: 'Raka Aditya Pratama' },
    ],
    address: {
      recipient: 'Anisa Putri Lestari',
      address: 'Jl. Kenanga No. 12, RT 03/RW 05, Kebayoran Lama, Jakarta Selatan 12240',
      phone: '0812-3456-7890',
    },
  },

  sampleWishes: [
    {
      id: 'sample-1',
      name: 'Dewi Kartika',
      message:
        'Selamat menempuh hidup baru! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah.',
      attendance: 'hadir',
      createdAt: new Date('2026-09-20T09:00:00+07:00'),
    },
    {
      id: 'sample-2',
      name: 'Fajar Nugroho',
      message:
        "Barakallahu lakuma wa baraka alaikuma wa jama'a bainakuma fii khair. Bahagia selalu!",
      attendance: 'hadir',
      createdAt: new Date('2026-09-18T19:30:00+07:00'),
    },
    {
      id: 'sample-3',
      name: 'Maya Sari',
      message: 'Mohon maaf belum bisa hadir. Semoga lancar sampai hari H dan langgeng selamanya.',
      attendance: 'tidak_hadir',
      createdAt: new Date('2026-09-15T12:10:00+07:00'),
    },
  ],

  music: { src: backsound, title: 'Musik latar undangan' },

  shareMessage: `Kepada Yth.
{nama}

Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami:

*{mempelai}*
{tanggal}

Info lengkap acara dapat dilihat melalui link undangan berikut:
{link}

Merupakan suatu kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.

Terima kasih.`,

  closing: {
    message:
      'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu. Atas kehadiran dan doanya, kami ucapkan terima kasih.',
    quote: {
      text: 'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu merasa tenteram kepadanya, dan dijadikan-Nya di antaramu rasa kasih dan sayang.',
      source: 'QS. Ar-Rum: 21',
    },
  },
}
