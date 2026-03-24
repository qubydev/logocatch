ALTER TABLE "credits" RENAME COLUMN "balance" TO "free_credits";--> statement-breakpoint
ALTER TABLE "credits" ADD COLUMN "paid_credits" integer DEFAULT 0 NOT NULL;