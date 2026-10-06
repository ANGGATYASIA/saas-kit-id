CREATE TABLE "reminder_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"reference" text NOT NULL,
	"sent_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_logs_user_kind_ref_ux" ON "reminder_logs" USING btree ("user_id","kind","reference");
