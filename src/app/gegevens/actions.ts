'use server'

import { dienGegevensIn, GegevensError, type NieuwDocument, type DocumentSoort } from '@/lib/persoonsgegevens'
import { SleutelError } from '@/lib/versleuteling'

/* Gegevens aanleveren via de link. Een publiek endpoint: geen login, wel het
   token uit de link, en een lokveld dat een mens niet ziet. */

export type Aanlevering = { ok: true; ontbreekt: string[] } | { ok: false; error: string } | null

const tekst = (f: FormData, n: string) => String(f.get(n) ?? '').trim()

async function document(f: FormData, naam: string, kind: DocumentSoort): Promise<NieuwDocument | null> {
  const bestand = f.get(naam)
  if (!(bestand instanceof File) || bestand.size === 0) return null
  return { kind, contentType: bestand.type, filename: bestand.name || null, data: Buffer.from(await bestand.arrayBuffer()) }
}

export async function leverAan(_vorige: Aanlevering, f: FormData): Promise<Aanlevering> {
  if (tekst(f, 'bedrijfswebsite') !== '') return { ok: true, ontbreekt: [] }
  const geboorte = tekst(f, 'geboortedatum')
  const d = geboorte ? new Date(`${geboorte}T12:00:00`) : null
  try {
    const documenten = (
      await Promise.all([document(f, 'id_kopie', 'id_kopie'), document(f, 'id_kopie_achter', 'id_kopie'), document(f, 'loonheffing', 'loonheffing')])
    ).filter((x): x is NieuwDocument => x !== null)
    const ontbreekt = await dienGegevensIn(
      tekst(f, 'id'),
      tekst(f, 'token'),
      {
        officialFirstNames: tekst(f, 'voornamen'),
        infix: tekst(f, 'tussenvoegsel'),
        lastName: tekst(f, 'achternaam'),
        birthDate: d && !Number.isNaN(d.getTime()) ? d : null,
        birthPlace: tekst(f, 'geboorteplaats'),
        addressLine: tekst(f, 'adres'),
        postalCode: tekst(f, 'postcode'),
        city: tekst(f, 'woonplaats'),
        iban: tekst(f, 'iban'),
        accountHolder: tekst(f, 'tenaamstelling'),
      },
      documenten,
    )
    return { ok: true, ontbreekt }
  } catch (error) {
    if (error instanceof GegevensError) return { ok: false, error: error.message }
    if (error instanceof SleutelError) {
      console.error('[gegevens] sleutel:', error.message)
      return { ok: false, error: 'Opslaan lukt nu even niet aan onze kant. We zijn ingelicht; probeer het later nog eens.' }
    }
    console.error('[gegevens] aanleveren mislukt:', error)
    return { ok: false, error: 'Er ging iets mis bij het versturen. Probeer het nog eens, of mail work@jamesrobinson.nl.' }
  }
}
