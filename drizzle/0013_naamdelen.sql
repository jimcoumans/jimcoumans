CREATE TYPE "public"."aanhef" AS ENUM('heer', 'mevrouw', 'neutraal');--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "infix" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "aanhef" "aanhef";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "infix" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "aanhef" "aanhef";--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- Bestaande namen uit elkaar trekken.
--
-- Dit is een gok die één keer over de bestaande gegevens heen gaat: het
-- eerste woord is de voornaam, een bekend tussenvoegsel gaat apart, de rest
-- is de achternaam. Bij een dubbele voornaam ("Jan Peter de Wit") klopt dat
-- niet, en dat corrigeer je daarna in het scherm. Daarna wordt er niet meer
-- geraden: de velden worden los ingevuld.
--
-- De volgorde in de lijst is van lang naar kort, zodat "van der Berg" als
-- "van der" wordt herkend en niet als "van".
-- ---------------------------------------------------------------------------

UPDATE "contacts" SET
  first_name = split_part(regexp_replace(btrim(name), '\s+', ' ', 'g'), ' ', 1),
  infix = (regexp_match(regexp_replace(btrim(name), '\s+', ' ', 'g'), '^\S+ (van der|van den|van de|van het|van ''t|in der|in den|in de|in het|in ''t|op der|op den|op de|aan der|aan den|aan de|uit de|uit den|van|de|den|der|des|het|''t|ten|ter|te|uit|op|aan|bij|onder|over|voor) (.+)$', 'i'))[1],
  last_name = COALESCE(
    (regexp_match(regexp_replace(btrim(name), '\s+', ' ', 'g'), '^\S+ (van der|van den|van de|van het|van ''t|in der|in den|in de|in het|in ''t|op der|op den|op de|aan der|aan den|aan de|uit de|uit den|van|de|den|der|des|het|''t|ten|ter|te|uit|op|aan|bij|onder|over|voor) (.+)$', 'i'))[2],
    NULLIF(substring(regexp_replace(btrim(name), '\s+', ' ', 'g') from position(' ' in regexp_replace(btrim(name), '\s+', ' ', 'g')) + 1), '')
  )
WHERE position(' ' in regexp_replace(btrim(name), '\s+', ' ', 'g')) > 0;--> statement-breakpoint

-- Eén woord is een voornaam, geen achternaam.
UPDATE "contacts" SET first_name = btrim(name)
WHERE position(' ' in regexp_replace(btrim(name), '\s+', ' ', 'g')) = 0 AND btrim(name) <> '';--> statement-breakpoint

UPDATE "users" SET
  first_name = split_part(regexp_replace(btrim(name), '\s+', ' ', 'g'), ' ', 1),
  infix = (regexp_match(regexp_replace(btrim(name), '\s+', ' ', 'g'), '^\S+ (van der|van den|van de|van het|van ''t|in der|in den|in de|in het|in ''t|op der|op den|op de|aan der|aan den|aan de|uit de|uit den|van|de|den|der|des|het|''t|ten|ter|te|uit|op|aan|bij|onder|over|voor) (.+)$', 'i'))[1],
  last_name = COALESCE(
    (regexp_match(regexp_replace(btrim(name), '\s+', ' ', 'g'), '^\S+ (van der|van den|van de|van het|van ''t|in der|in den|in de|in het|in ''t|op der|op den|op de|aan der|aan den|aan de|uit de|uit den|van|de|den|der|des|het|''t|ten|ter|te|uit|op|aan|bij|onder|over|voor) (.+)$', 'i'))[2],
    NULLIF(substring(regexp_replace(btrim(name), '\s+', ' ', 'g') from position(' ' in regexp_replace(btrim(name), '\s+', ' ', 'g')) + 1), '')
  )
WHERE name IS NOT NULL AND position(' ' in regexp_replace(btrim(name), '\s+', ' ', 'g')) > 0;--> statement-breakpoint

UPDATE "users" SET first_name = btrim(name)
WHERE name IS NOT NULL AND position(' ' in regexp_replace(btrim(name), '\s+', ' ', 'g')) = 0 AND btrim(name) <> '';
