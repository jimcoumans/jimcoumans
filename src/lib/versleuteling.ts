import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/* -------------------------------------------------------------------------
   Versleutelen van gevoelige persoonsgegevens: een IBAN, een kopie paspoort,
   een loonheffingsformulier.

   AES-256-GCM met een sleutel die alleen in de omgeving staat (Netlify,
   GEGEVENS_SLEUTEL), niet in de database. Lekt er ooit een kopie van de
   database, dan staan deze gegevens er onleesbaar in.

   Elke waarde krijgt een eigen willekeurige iv; GCM controleert bij het
   ontsleutelen of er niet aan is gesjoemeld. Het formaat begint met een
   versie, zodat de sleutel later kan wisselen zonder oude gegevens te
   verliezen.
   ------------------------------------------------------------------------- */

export class SleutelError extends Error {}

/** De sleutel zoals hij in de omgeving staat, zonder spaties of aanhalingstekens die er bij het plakken omheen kwamen. */
function ruweSleutel(): string {
  return (process.env.GEGEVENS_SLEUTEL ?? '').trim().replace(/^["']|["']$/g, '').trim()
}

/**
 * Wat er mis is met de sleutel, in woorden voor het scherm; null als hij
 * klopt. Zegt nooit wat de sleutel is, wel hoe lang wat er staat: dat is
 * genoeg om een verkeerd geplakte waarde te herkennen.
 */
export function sleutelProbleem(): string | null {
  const ruw = ruweSleutel()
  if (!ruw) {
    return 'GEGEVENS_SLEUTEL staat niet in de omgeving waarin het portaal draait. Staat hij wel in Netlify, bouw de site dan opnieuw: Deploys, Trigger deploy, Deploy site. Netlify leest een nieuwe variabele pas bij de volgende build.'
  }
  if (/openssl|rand|\s/.test(ruw)) {
    return 'Bij GEGEVENS_SLEUTEL staat het commando of tekst met spaties, niet de sleutel zelf. Draai openssl rand -base64 32 in Terminal en plak alleen de regel die eruit komt (44 tekens, eindigt op =). Bouw daarna de site opnieuw.'
  }
  const k = Buffer.from(ruw, 'base64')
  if (k.length !== 32) {
    return `GEGEVENS_SLEUTEL staat in Netlify, maar is geen geldige sleutel: er staan ${ruw.length} tekens, nodig zijn er 44 die eindigen op =. Maak hem opnieuw met openssl rand -base64 32, plak alleen die regel, en bouw de site opnieuw.`
  }
  return null
}

function sleutel(): Buffer {
  const probleem = sleutelProbleem()
  if (probleem) throw new SleutelError(`Zonder geldige sleutel slaan we geen IBAN of documenten op. ${probleem}`)
  return Buffer.from(ruweSleutel(), 'base64')
}

/** Is er een geldige sleutel? Om in het scherm te zeggen wat er nog ontbreekt. */
export function heeftSleutel(): boolean {
  return sleutelProbleem() === null
}

export function versleutel(data: Buffer | string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', sleutel(), iv)
  const versleuteld = Buffer.concat([cipher.update(typeof data === 'string' ? Buffer.from(data, 'utf8') : data), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${versleuteld.toString('base64')}`
}

export function ontsleutel(waarde: string): Buffer {
  const [versie, iv, tag, data] = waarde.split(':')
  if (versie !== 'v1' || !iv || !tag || !data) throw new SleutelError('Onbekend formaat van versleutelde gegevens.')
  const decipher = createDecipheriv('aes-256-gcm', sleutel(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()])
}

export function ontsleutelTekst(waarde: string): string {
  return ontsleutel(waarde).toString('utf8')
}
