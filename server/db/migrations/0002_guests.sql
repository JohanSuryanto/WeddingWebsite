CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"couple_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guests_couple_position_idx" ON "guests" USING btree ("couple_id","position");