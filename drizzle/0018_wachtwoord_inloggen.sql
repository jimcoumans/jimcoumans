-- pgcrypto levert crypt() en gen_salt(): bcrypt in de database.
--
-- Waarom in de database en niet in de app: het scheelt een extra pakket, en
-- het betekent dat een wachtwoord met één regel SQL te zetten is. Dat is
-- precies wat je nodig hebt als niemand kan inloggen omdat de mail het niet
-- doet — en dat is de reden dat dit er komt.
CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
CREATE INDEX "login_attempts_email_idx" ON "login_attempts" USING btree ("email","attempted_at");--> statement-breakpoint
-- Mislukte inlogpogingen zijn niet leesbaar via de publieke anon-key.
ALTER TABLE "login_attempts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Controleren dat crypt() ook echt bereikbaar is.
--
-- Op sommige installaties (Supabase onder andere) staat pgcrypto in een apart
-- schema. Staat dat niet in het zoekpad, dan bestaat de extensie wel maar
-- werkt crypt() niet — en dan zou niemand meer kunnen inloggen terwijl de
-- migratie geslaagd lijkt. Liever hier hard stuklopen: de bouw stopt dan en
-- de vorige versie blijft draaien.
DO $pgcrypto_check$
BEGIN
  PERFORM crypt('proef', gen_salt('bf', 4));
EXCEPTION
  WHEN undefined_function THEN
    RAISE EXCEPTION 'pgcrypto is geinstalleerd maar crypt() is niet bereikbaar. Zet het schema van de extensie in het zoekpad, bijvoorbeeld: ALTER DATABASE postgres SET search_path TO public, extensions;';
END
$pgcrypto_check$;
