// Postgres schema (specs/003-backend-data-persistence/data-model.md).
// Generate migrations with `npm run db:generate` after changing this file.
import { sql } from 'drizzle-orm'
import {
  bigserial,
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import type { WeddingContent } from '../../src/content/types'

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })

export const couples = pgTable(
  'couples',
  {
    id: uuid('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    status: text('status', { enum: ['draft', 'active'] }).notNull().default('draft'),
    defaultTheme: text('default_theme', {
      enum: ['romantic-floral', 'elegant-classic', 'rustic-garden'],
    }).notNull(),
    content: jsonb('content').$type<WeddingContent>().notNull(),
    version: integer('version').notNull().default(1),
    passcode: char('passcode', { length: 4 }).notNull(),
    passcodeVersion: integer('passcode_version').notNull().default(1),
    restorePending: boolean('restore_pending').notNull().default(false),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    check('couples_status_check', sql`${t.status} in ('draft', 'active')`),
    check(
      'couples_default_theme_check',
      sql`${t.defaultTheme} in ('romantic-floral', 'elegant-classic', 'rustic-garden')`,
    ),
    check('couples_passcode_check', sql`${t.passcode} ~ '^[0-9]{4}$'`),
  ],
)

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey(),
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['image', 'audio'] }).notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    width: integer('width'),
    height: integer('height'),
    providerKey: text('provider_key').notNull().unique(),
    url: text('url'),
    status: text('status', { enum: ['pending', 'ready'] }).notNull().default('pending'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    check('media_kind_check', sql`${t.kind} in ('image', 'audio')`),
    check('media_status_check', sql`${t.status} in ('pending', 'ready')`),
    index('media_couple_idx').on(t.coupleId),
  ],
)

export const rsvps = pgTable(
  'rsvps',
  {
    id: uuid('id').primaryKey(),
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    visitorHash: text('visitor_hash').notNull(),
    name: text('name').notNull(),
    attendance: text('attendance', { enum: ['hadir', 'tidak_hadir'] }).notNull(),
    guestCount: smallint('guest_count').notNull(),
    submittedAt: ts('submitted_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('rsvps_couple_visitor_unique').on(t.coupleId, t.visitorHash),
    check('rsvps_attendance_check', sql`${t.attendance} in ('hadir', 'tidak_hadir')`),
  ],
)

export const wishes = pgTable(
  'wishes',
  {
    id: uuid('id').primaryKey(),
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    visitorHash: text('visitor_hash'),
    name: text('name').notNull(),
    message: text('message').notNull(),
    attendance: text('attendance', { enum: ['hadir', 'tidak_hadir'] }),
    hidden: boolean('hidden').notNull().default(false),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('wishes_couple_created_idx').on(t.coupleId, t.createdAt.desc(), t.id.desc())],
)

export const adminSessions = pgTable('admin_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  createdAt: ts('created_at').notNull().defaultNow(),
  expiresAt: ts('expires_at').notNull(),
  userAgent: text('user_agent'),
})

export const throttles = pgTable('throttles', {
  key: text('key').primaryKey(),
  failures: smallint('failures').notNull().default(0),
  lockedUntil: ts('locked_until'),
})

export const securityEvents = pgTable(
  'security_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    kind: text('kind', { enum: ['passcode_lockout', 'login_lockout'] }).notNull(),
    coupleId: uuid('couple_id').references(() => couples.id, { onDelete: 'cascade' }),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('security_events_couple_idx').on(t.coupleId, t.createdAt)],
)

export const rateLimits = pgTable('rate_limits', {
  bucket: text('bucket').primaryKey(),
  windowStart: ts('window_start').notNull(),
  count: integer('count').notNull(),
})

export const mediaDeletions = pgTable(
  'media_deletions',
  {
    providerKey: text('provider_key').primaryKey(),
    resourceType: text('resource_type', { enum: ['image', 'video', 'prefix'] }).notNull(),
    attempts: smallint('attempts').notNull().default(0),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [check('media_deletions_type_check', sql`${t.resourceType} in ('image', 'video', 'prefix')`)],
)

export type CoupleRow = typeof couples.$inferSelect
export type MediaRow = typeof media.$inferSelect
export type RsvpRow = typeof rsvps.$inferSelect
export type WishRow = typeof wishes.$inferSelect
