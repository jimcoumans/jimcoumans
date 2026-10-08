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

function sleutel(): Buffer {
  const ruw = process.env.GEGEVENS_SLEUTEL
  if (!ruw) {
    throw new SleutelError(
      'De sleutel voor persoonsgegevens (GEGEVENS_SLEUTEL) ontbreekt. Zonder die sleutel slaan we geen IBAN of documenten op.',
    )
  }
  const k = Buffer.from(ruw, 'base64')
  if (k.length !== 32) throw new SleutelError('GEGEVENS_SLEUTEL moet 32 bytes zijn, als base64 (maak hem met: openssl rand -base64 32).')
  return k
}

/** Is er een sleutel ingesteld? Om in het scherm te zeggen wat er nog ontbreekt. */
export function heeftSleutel(): boolean {
  try {
    sleutel()
    return true
  } catch {
    return false
  }
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
