export interface ImageRef {
  src: string
  width: number
  height: number
}

export interface Person {
  fullName: string
  nickname: string
  photo: ImageRef
  childOrder?: string
  father: string
  mother: string
  instagram?: string
}

export interface Couple {
  bride: Person
  groom: Person
  order: 'bride-first' | 'groom-first'
  hashtag?: string
}

export interface WeddingEvent {
  id: string
  name: string
  /** ISO 8601 with UTC offset, e.g. 2027-02-14T08:00:00+07:00 */
  start: string
  /** ISO 8601 with UTC offset, or null for "Selesai" */
  end: string | null
  venueName: string
  address: string
  mapUrl?: string
  isMain: boolean
}

export interface StoryMilestone {
  title: string
  date: string
  description: string
  photo?: ImageRef
}

export interface GalleryPhoto {
  src: ImageRef
  alt: string
  caption?: string
}

export interface GiftAccount {
  provider: string
  accountNumber: string
  accountHolder: string
  logo?: ImageRef
}

export interface GiftInfo {
  intro: string
  accounts: GiftAccount[]
  address?: { recipient: string; address: string; phone?: string }
}

export type Attendance = 'hadir' | 'tidak_hadir'

export interface Wish {
  id: string
  name: string
  message: string
  attendance?: Attendance
  createdAt: Date
}

export interface MusicTrack {
  src: string
  title?: string
}

export interface CoverContent {
  heading: string
  defaultGuestLabel: string
  background: ImageRef
}

export interface ClosingContent {
  message: string
  quote?: { text: string; source: string }
}

export interface WeddingContent {
  cover: CoverContent
  couple: Couple
  events: WeddingEvent[]
  story?: StoryMilestone[]
  gallery?: GalleryPhoto[]
  gifts?: GiftInfo
  sampleWishes?: Wish[]
  music?: MusicTrack
  closing: ClosingContent
  /**
   * WhatsApp message used by /send-invitation. Placeholders: {nama}, {link},
   * {mempelai}, {tanggal}.
   */
  shareMessage?: string
  /** Last day guests can RSVP ("YYYY-MM-DD", WIB); empty = no deadline. */
  rsvpDeadline?: string
}
