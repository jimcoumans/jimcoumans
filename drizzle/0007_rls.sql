-- Row Level Security aanzetten op alle tabellen.
--
-- Waarom: Supabase zet standaard een REST-API voor je tabellen open die
-- bereikbaar is met de `anon`-key. Die key is in hun model publiek; hij is
-- bedoeld om in browsercode te staan. Zonder RLS kan iedereen die hem heeft
-- het hele klantenbestand uitlezen: namen, telefoonnummers, omzetcijfers.
--
-- De wallet gebruikt die API niet. Hij praat rechtstreeks Postgres als de
-- eigenaar van de tabellen, en een eigenaar gaat langs RLS heen. Deze regels
-- veranderen dus niets aan wat de app kan, en sluiten wel een deur die
-- anderszins openstaat.
--
-- Er komen met opzet GEEN policies bij. Zonder policy mag een rol die niet
-- de eigenaar is helemaal niets, en dat is precies de bedoeling: wie via de
-- REST-API binnenkomt hoort niets te kunnen. Zou hier later een policy bij
-- moeten, dan is dat een bewuste keuze en geen bijvangst.
--
-- Op een gewone Postgres (Docker, Neon, een eigen server) is dit onschadelijk:
-- daar is er geen anon-rol en gaat de app om dezelfde reden langs RLS heen.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
