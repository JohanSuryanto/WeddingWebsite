import { anisaRaka } from '../content/samples/anisa-raka/content'
import type { Person, WeddingContent } from '../content/types'

const noImage = { src: '', width: 1, height: 1 }

function person(nickname: string, childOrder: string): Person {
  return { fullName: '', nickname, photo: { ...noImage }, childOrder, father: '', mother: '' }
}

/** Starting content for a new couple: nicknames set, everything else to fill in. */
export function emptyContent(brideNick: string, groomNick: string): WeddingContent {
  return {
    cover: {
      heading: 'The Wedding of',
      defaultGuestLabel: 'Bapak/Ibu/Saudara/i',
      background: { ...noImage },
    },
    couple: {
      bride: person(brideNick.trim(), 'Putri dari'),
      groom: person(groomNick.trim(), 'Putra dari'),
      order: 'bride-first',
    },
    events: [
      {
        id: 'akad',
        name: 'Akad Nikah',
        start: '',
        end: null,
        venueName: '',
        address: '',
        isMain: true,
      },
    ],
    story: [],
    gallery: [],
    sampleWishes: [],
    closing: { message: anisaRaka.closing.message, quote: anisaRaka.closing.quote },
    shareMessage: anisaRaka.shareMessage,
  }
}
