CREATE TYPE "public"."main_goal" AS ENUM('aanvragen', 'reserveringen', 'omzet', 'naamsbekendheid');--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "main_goal" "main_goal";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "live_on" date;