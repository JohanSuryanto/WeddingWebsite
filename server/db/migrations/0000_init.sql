CREATE TABLE "admin_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "couples" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"default_theme" text NOT NULL,
	"content" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"passcode" char(4) NOT NULL,
	"passcode_version" integer DEFAULT 1 NOT NULL,
	"restore_pending" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "couples_slug_unique" UNIQUE("slug"),
	CONSTRAINT "couples_status_check" CHECK ("couples"."status" in ('draft', 'active')),
	CONSTRAINT "couples_default_theme_check" CHECK ("couples"."default_theme" in ('romantic-floral', 'elegant-classic', 'rustic-garden')),
	CONSTRAINT "couples_passcode_check" CHECK ("couples"."passcode" ~ '^[0-9]{4}$')
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"couple_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"provider_key" text NOT NULL,
	"url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_provider_key_unique" UNIQUE("provider_key"),
	CONSTRAINT "media_kind_check" CHECK ("media"."kind" in ('image', 'audio')),
	CONSTRAINT "media_status_check" CHECK ("media"."status" in ('pending', 'ready'))
);
--> statement-breakpoint
CREATE TABLE "media_deletions" (
	"provider_key" text PRIMARY KEY NOT NULL,
	"resource_type" text NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_deletions_type_check" CHECK ("media_deletions"."resource_type" in ('image', 'video', 'prefix'))
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"bucket" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"couple_id" uuid NOT NULL,
	"visitor_hash" text NOT NULL,
	"name" text NOT NULL,
	"attendance" text NOT NULL,
	"guest_count" smallint NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rsvps_couple_visitor_unique" UNIQUE("couple_id","visitor_hash"),
	CONSTRAINT "rsvps_attendance_check" CHECK ("rsvps"."attendance" in ('hadir', 'tidak_hadir'))
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"couple_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "throttles" (
	"key" text PRIMARY KEY NOT NULL,
	"failures" smallint DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wishes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"couple_id" uuid NOT NULL,
	"visitor_hash" text,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"attendance" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_couple_idx" ON "media" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "security_events_couple_idx" ON "security_events" USING btree ("couple_id","created_at");--> statement-breakpoint
CREATE INDEX "wishes_couple_created_idx" ON "wishes" USING btree ("couple_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);