import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { KoppelingFout } from './google'

/* -------------------------------------------------------------------------
   Tokens van Google en LinkedIn staan versleuteld in de database, met
   TOKEN_SLEUTEL uit Netlify. Zonder die sleutel zijn ze onbruikbaar.
   ------------------------------------------------------------------------- */

function sleutel(geheim = process.env.TOKEN_SLEUTEL): Buffer {
  if (!geheim || geheim.trim().length < 32) throw new KoppelingFout('TOKEN_SLEUTEL ontbreekt of is te kort (minstens 32 tekens) in Netlify.')
  return createHash('sha256').update(geheim.trim()).digest()
}

/** AES-256-GCM: versie, iv, tag en inhoud, punt-gescheiden in base64url. */
export function versleutel(tekst: string, geheim?: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', sleutel(geheim), iv)
  const inhoud = Buffer.concat([c.update(tekst, 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), inhoud.toString('base64url')].join('.')
}

export function ontsleutel(versleuteld: string, geheim?: string): string {
  const [versie, iv, tag, inhoud] = versleuteld.split('.')
  if (versie !== 'v1' || !iv || !tag || !inhoud) throw new KoppelingFout('Opgeslagen sleutel is onleesbaar. Verbind het account opnieuw.')
  const d = createDecipheriv('aes-256-gcm', sleutel(geheim), Buffer.from(iv, 'base64url'))
  d.setAuthTag(Buffer.from(tag, 'base64url'))
  try {
    return Buffer.concat([d.update(Buffer.from(inhoud, 'base64url')), d.final()]).toString('utf8')
  } catch {
    throw new KoppelingFout('De opgeslagen sleutel past niet bij TOKEN_SLEUTEL. Is die gewijzigd? Verbind het account dan opnieuw.')
  }
}

