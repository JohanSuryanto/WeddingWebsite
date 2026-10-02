import { GUEST_NAME_MAX, parseGuestName } from '../../src/lib/guestName'
import {
  buildInviteUrl,
  fillMessage,
  isTooLong,
  parseGuestList,
  whatsappUrl,
} from '../../src/lib/inviteLink'
import { resolveThemeId } from '../../src/themes'

const BASE = 'https://anisa-raka.com/'

describe('buildInviteUrl', () => {
  it('adds the guest name and theme number', () => {
    expect(buildInviteUrl(BASE, 'Budi Santoso', '2')).toBe(
      'https://anisa-raka.com/?inv=Budi+Santoso&t=2',
    )
  })

  it('always includes the theme, even without a name', () => {
    expect(buildInviteUrl(BASE, '  ', '1')).toBe('https://anisa-raka.com/?t=1')
  })

  it('encodes & so it stays inside the name', () => {
    expect(buildInviteUrl(BASE, 'Johan & Partner', '3')).toBe(
      'https://anisa-raka.com/?inv=Johan+%26+Partner&t=3',
    )
  })

  it('replaces any query or hash already on the base URL', () => {
    expect(buildInviteUrl('https://x.id/undangan/?t=9#acara', 'Andi', '1')).toBe(
      'https://x.id/undangan/?inv=Andi&t=1',
    )
  })

  it.each([
    'Budi Santoso',
    'Johan & Partner',
    'Bpk. H. Ahmad, S.T. & Ibu',
    'Keluarga Besar 100% Bahagia',
    'Ana + Rudi',
    "Jum'at = Hari Baik",
    '<b>Tamu</b>',
    'Wayan Ṣukma 🌸',
  ])('round-trips "%s" through the invitation page parser', (name) => {
    const url = new URL(buildInviteUrl(BASE, name, '2'))
    expect(parseGuestName(url.search)).toBe(name)
    expect(resolveThemeId(url.search, 'romantic-floral')).toBe('elegant-classic')
  })
})

describe('parseGuestList', () => {
  it('reads one name per line, skipping blanks and extra spaces', () => {
    expect(parseGuestList('Budi Santoso\r\n\n   Johan  &  Partner  \n\t\n')).toEqual([
      'Budi Santoso',
      'Johan & Partner',
    ])
  })
})

describe('isTooLong', () => {
  it(`flags names over ${GUEST_NAME_MAX} characters`, () => {
    expect(isTooLong('a'.repeat(GUEST_NAME_MAX))).toBe(false)
    expect(isTooLong('a'.repeat(GUEST_NAME_MAX + 1))).toBe(true)
  })
})

describe('fillMessage', () => {
  it('fills every placeholder, including repeats', () => {
    const msg = fillMessage('{nama}|{link}|{mempelai}|{tanggal}|{nama}|{lainnya}', {
      nama: 'Budi',
      link: 'https://x.id/?inv=Budi&t=1',
      mempelai: 'Anisa & Raka',
      tanggal: 'Minggu, 14 Februari 2027',
    })
    expect(msg).toBe(
      'Budi|https://x.id/?inv=Budi&t=1|Anisa & Raka|Minggu, 14 Februari 2027|Budi|{lainnya}',
    )
  })

  it('does not treat $ in values as a replacement pattern', () => {
    expect(fillMessage('{nama}', { nama: "$& $1 $'", link: '', mempelai: '', tanggal: '' })).toBe(
      "$& $1 $'",
    )
  })
})

describe('whatsappUrl', () => {
  it('encodes the whole message, including the link and newlines', () => {
    const url = whatsappUrl('Halo Budi\nhttps://x.id/?inv=Budi&t=1')
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    expect(new URL(url).searchParams.get('text')).toBe('Halo Budi\nhttps://x.id/?inv=Budi&t=1')
  })
})
