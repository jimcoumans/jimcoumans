import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

/* -------------------------------------------------------------------------
   Bestandsopslag voor de merkkluis.

   Bestanden horen niet in de database: een fotoreeks van een klant is zo een
   paar honderd megabyte, en dan wordt elke back-up en elke query trager. De
   gegevens over een bestand staan in de database; de bytes hier.

   Op Netlify gaat het naar Netlify Blobs: zit bij het abonnement, hoeft niet
   ingesteld te worden en staat naast de site. Lokaal en in de tests naar een
   map (.opslag), zodat je zonder Netlify kunt ontwikkelen. De turbopackIgnore-
   opmerkingen houden die map buiten de build: anders neemt Next.js het hele
   project mee in elke serverfunctie.
   ------------------------------------------------------------------------- */

const STORE = 'merkkluis'

export type Bestand = { data: Buffer; contentType: string }

/**
 * Draaien we op Netlify? Dan nooit naar schijf: een serverfunctie heeft geen
 * schijf die blijft bestaan. Liever één signaal te veel dan een upload die
 * stilletjes in een map verdwijnt die er morgen niet meer is.
 */
function opNetlify(): boolean {
  if (process.env.BESTANDSOPSLAG === 'lokaal') return false
  return (
    process.env.NETLIFY === 'true' ||
    !!process.env.NETLIFY_BLOBS_CONTEXT ||
    !!globalThis.netlifyBlobsContext ||
    !!process.env.SITE_ID ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME
  )
}

function lokaleMap(): string {
  return process.env.BESTANDSOPSLAG_MAP ?? path.join(/*turbopackIgnore: true*/ process.cwd(), '.opslag')
}

/** Alleen letters, cijfers, streepjes, punten en schuine strepen: een sleutel mag nooit buiten de map wijzen. */
function veiligeSleutel(sleutel: string): string {
  if (!/^[a-z0-9][a-z0-9/._-]*$/i.test(sleutel) || sleutel.includes('..')) throw new Error(`Ongeldige opslagsleutel: ${sleutel}`)
  return sleutel
}

async function netlifyStore() {
  const { getStore } = await import('@netlify/blobs')
  return getStore({ name: STORE, consistency: 'strong' })
}

export async function bewaar(sleutel: string, data: Buffer, contentType: string): Promise<void> {
  veiligeSleutel(sleutel)
  if (opNetlify()) {
    const store = await netlifyStore()
    const kopie = new Uint8Array(data.byteLength)
    kopie.set(data)
    await store.set(sleutel, kopie.buffer, { metadata: { contentType } })
    return
  }
  const bestand = path.join(/*turbopackIgnore: true*/ lokaleMap(), sleutel)
  await mkdir(/*turbopackIgnore: true*/ path.dirname(bestand), { recursive: true })
  await writeFile(/*turbopackIgnore: true*/ bestand, data)
  await writeFile(/*turbopackIgnore: true*/ `${bestand}.type`, contentType)
}

export async function haal(sleutel: string): Promise<Bestand | null> {
  veiligeSleutel(sleutel)
  if (opNetlify()) {
    const store = await netlifyStore()
    const r = await store.getWithMetadata(sleutel, { type: 'arrayBuffer' })
    if (!r) return null
    return { data: Buffer.from(r.data), contentType: String(r.metadata.contentType ?? 'application/octet-stream') }
  }
  const bestand = path.join(/*turbopackIgnore: true*/ lokaleMap(), sleutel)
  try {
    const [data, contentType] = await Promise.all([readFile(/*turbopackIgnore: true*/ bestand), readFile(/*turbopackIgnore: true*/ `${bestand}.type`, 'utf8')])
    return { data, contentType }
  } catch {
    return null
  }
}

export async function wis(sleutel: string): Promise<void> {
  veiligeSleutel(sleutel)
  if (opNetlify()) {
    const store = await netlifyStore()
    await store.delete(sleutel)
    return
  }
  const bestand = path.join(/*turbopackIgnore: true*/ lokaleMap(), sleutel)
  await rm(/*turbopackIgnore: true*/ bestand, { force: true })
  await rm(/*turbopackIgnore: true*/ `${bestand}.type`, { force: true })
}
