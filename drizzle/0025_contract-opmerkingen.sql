-- Waarschuwingen bij een contract bewaren.
--
-- De generator rekent uit dat de proeftijd is teruggebracht, dat er
-- uiterlijk op een bepaalde datum moet worden aangezegd, of dat er geen
-- relatiebeding in komt. Die waarschuwingen stonden alleen tijdens het
-- opstellen in beeld en waren daarna weg - terwijl je ze juist een maand
-- later nodig hebt.

ALTER TABLE "generated_contracts" ADD COLUMN "remarks" text;