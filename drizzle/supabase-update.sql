-- ============================================================================
--  James Robinson Wallet — database bijwerken
--
--  De wijzigingen vanaf 0018_wachtwoord_inloggen. Plak dit in de SQL-editor van Supabase en
--  druk op Run.
--
--  Je mag dit bestand zo vaak draaien als je wilt. Elke migratie kijkt eerst
--  of hij al gedraaid is en slaat zichzelf dan over. Je hoeft dus niet te
--  weten waar je database precies staat.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Boekhouding: welke migraties zijn er gedraaid
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

-- ---------------------------------------------------------------------------
-- 0018_wachtwoord_inloggen
-- ---------------------------------------------------------------------------

DO $jr_0018_wachtwoord_inloggen$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'd542be11e85bfce9d961a70d07fae2d85981058f315adfa6697f0925cdf5db36') THEN
    RAISE NOTICE 'Overgeslagen: 0018_wachtwoord_inloggen stond er al.';
  ELSE
    -- pgcrypto levert crypt() en gen_salt(): bcrypt in de database.
    --
    -- Waarom in de database en niet in de app: het scheelt een extra pakket, en
    -- het betekent dat een wachtwoord met één regel SQL te zetten is. Dat is
    -- precies wat je nodig hebt als niemand kan inloggen omdat de mail het niet
    -- doet — en dat is de reden dat dit er komt.
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE "login_attempts" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"email" text NOT NULL,
    	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"ip" text
    );


    ALTER TABLE "users" ADD COLUMN "password_hash" text;

    CREATE INDEX "login_attempts_email_idx" ON "login_attempts" USING btree ("email","attempted_at");

    -- Mislukte inlogpogingen zijn niet leesbaar via de publieke anon-key.
    ALTER TABLE "login_attempts" ENABLE ROW LEVEL SECURITY;


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

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('d542be11e85bfce9d961a70d07fae2d85981058f315adfa6697f0925cdf5db36', 1789506364012);
    RAISE NOTICE 'Toegepast: 0018_wachtwoord_inloggen.';
  END IF;
END $jr_0018_wachtwoord_inloggen$;

