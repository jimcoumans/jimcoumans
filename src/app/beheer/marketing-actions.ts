'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import type { ActionResult } from './actions'
import {
  MarketingFout,
  ENGINE_GROEPEN,
  ONDERWERP_TYPES,
  bewaarBranche,
  bewaarComponent,
  bewaarKlant,
  bewaarOnderwerp,
  laadVoorlopigKader,
  magMarketing,
  verwijderBranche,
  verwijderOnderwerp,
  zetActivatie,
  zetOnderwerpStatus,
  type Activatie,
  type EngineGroep,
  type OnderwerpType,
} from '@/lib/marketing/registers'
import {
  archiveer,
  bevestigPublicatie,
  bewaarGegevens,
  bewaarVelden,
  dienIn,
  keurGoed,
  maakContent,
  maakVariant,
  ontkoppelAsset,
  plaatsOpmerking,
  stuurTerug,
  trekTerug,
  voegAssetToe,
  zetKoppelingen,
  zetPlanning,
  type Modus,
} from '@/lib/marketing/content'

/* -------------------------------------------------------------------------
   Acties van Marketing → Website. Elke actie controleert zelf de rechten:
   een server action is een publiek endpoint, een verborgen knop is geen
   beveiliging. Klanten komen er via requireStaff al niet in.
   ------------------------------------------------------------------------- */

const tekst = (f: FormData, n: string) => String(f.get(n) ?? '').trim()
const lijst = (f: FormData, n: string) => f.getAll(n).map(String).filter(Boolean)
const BASIS = '/beheer/marketing/website'

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    revalidatePath(BASIS, 'layout')
    return { ok: true }
  } catch (error) {
    if (error instanceof MarketingFout) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    if (error instanceof Error && (error.message === 'NEXT_REDIRECT' || (error as { digest?: string }).digest?.startsWith('NEXT_'))) throw error
    console.error('[marketing] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

async function beheerder() {
  const u = await requireStaff()
  if (!magMarketing(u.role, 'beheren')) throw new MarketingFout('Alleen een beheerder beheert de registers.')
  return u
}

/* ------------------------------- Registers ------------------------------- */

export async function bewaarOnderwerpActie(f: FormData): Promise<ActionResult> {
  return veilig(async () => {
    await beheerder()
    const type = tekst(f, 'type') as OnderwerpType
    if (!ONDERWERP_TYPES.includes(type)) throw new MarketingFout('Kies een soort onderwerp.')
    if (!tekst(f, 'name')) throw new MarketingFout('Vul een naam in.')
    await bewaarOnderwerp({ id: tekst(f, 'id') || undefined, type, name: tekst(f, 'name'), slug: tekst(f, 'slug'), description: tekst(f, 'description'), sortOrder: Number(tekst(f, 'sortOrder')) || 0 })
  })
}

export async function wisselOnderwerpActie(f: FormData): Promise<ActionResult> {
  return veilig(async () => {
    await beheerder()
    await zetOnderwerpStatus(tekst(f, 'id'), tekst(f, 'actief') === '1')
  })
}

export async function verwijderOnderwerpActie(f: FormData): Promise<ActionResult> {
  return veilig(async () => {
    await beheerder()
    await verwijderOnderwerp(tekst(f, 'id'))
  })
}

export async function bewaarBrancheActie(f: FormData): Promise<ActionResult> {
  return veilig(async () => {
    await beheerder()
    if (!tekst(f, 'name')) throw new MarketingFout('Vul een naam in.')
    await bewaarBranche({ id: tekst(f, 'id') || undefined, name: tekst(f, 'name'), slug: tekst(f, 'slug'), description: tekst(f, 'description'), priority: Number(tekst(f, 'priority')) || 0, active: tekst(f, 'active') !== '0' })
  })
}

export async function verwijderBrancheActie(f: FormData): Promise<ActionResult> {
  return veilig(async () => {
    await beheerder()
    await verwijderBranche(tekst(f, 'id'))
  })
}

export async function bewaarComponentActie(f: FormData): Promise<ActionResult> {
  return veilig(async () => {
    await beheerder()
    const group = tekst(f, 'group') as EngineGroep
    if (!ENGINE_GROEPEN.includes(group)) throw new MarketingFout('Kies een groep.')
    if (!tekst(f, 'name')) throw new MarketingFout('Vul een naam in.')
    await bewaarComponent({ id: tekst(f, 'id') || undefined, group, name: tekst(f, 'name'), description: tekst(f, 'description'), sortOrder: Number(tekst(f, 'sortOrder')) || 0, active: tekst(f, 'active') !== '0' })
  })
}

export async function laadKaderActie(): Promise<ActionResult> {
  return veilig(async () => {
    await beheerder()
    await laadVoorlopigKader()
  })
}

export async function zetActivatieActie(f: FormData): Promise<ActionResult> {
  return veilig(async () => {
    await beheerder()
    const a = tekst(f, 'activation') as Activatie
    if (!['always', 'optional', 'off', 'undecided'].includes(a)) throw new MarketingFout('Kies een activatie.')
    await zetActivatie(tekst(f, 'packageId'), tekst(f, 'componentId'), a, tekst(f, 'notes'))
  })
}

export async function bewaarKlantActie(f: FormData): Promise<ActionResult> {
  return veilig(async () => {
    await beheerder()
    if (!tekst(f, 'name')) throw new MarketingFout('Vul een naam in.')
    const p = tekst(f, 'permission')
    await bewaarKlant({ id: tekst(f, 'id') || undefined, name: tekst(f, 'name'), publicDescription: tekst(f, 'publicDescription'), permission: p === 'granted' || p === 'denied' ? p : 'unknown', industryIds: lijst(f, 'industryIds') })
  })
}

/* -------------------------------- Content -------------------------------- */

export async function nieuweContentActie(f: FormData): Promise<ActionResult> {
  const u = await requireStaff()
  let id = ''
  const r = await veilig(async () => {
    const kind = tekst(f, 'kind')
    if (!['page', 'case', 'review', 'faq', 'insight'].includes(kind)) throw new MarketingFout('Kies een soort content.')
    if (kind === 'page' && !tekst(f, 'subjectId') && !tekst(f, 'industryId')) throw new MarketingFout('Kies een onderwerp, een branche of allebei.')
    if (kind !== 'page' && !tekst(f, 'title')) throw new MarketingFout('Geef een titel.')
    const it =
      kind === 'page' && !tekst(f, 'title')
        ? await maakVariant(tekst(f, 'subjectId'), tekst(f, 'industryId') || null, u)
        : await maakContent({ kind: kind as 'page', subjectId: tekst(f, 'subjectId') || null, industryId: tekst(f, 'industryId') || null, title: tekst(f, 'title') }, u)
    id = it.id
  })
  if (!r.ok) return r
  redirect(`${BASIS}/content/${id}`)
}

/** Een cel in de matrix: plannen, uitsluiten, uitstellen, wissen, of bewust een concept beginnen. */
export async function celActie(f: FormData): Promise<ActionResult> {
  const u = await requireStaff()
  const keuze = tekst(f, 'keuze'), subjectId = tekst(f, 'subjectId'), industryId = tekst(f, 'industryId')
  if (keuze === 'concept') {
    let id = ''
    const r = await veilig(async () => {
      id = (await maakVariant(subjectId, industryId, u)).id
    })
    if (!r.ok) return r
    redirect(`${BASIS}/content/${id}`)
  }
  return veilig(async () => {
    const a = keuze === 'planned' || keuze === 'not_relevant' || keuze === 'deferred' ? keuze : null
    await zetPlanning(subjectId, industryId, a, u, tekst(f, 'notes'))
  })
}

export async function bewaarVeldenActie(f: FormData): Promise<ActionResult> {
  const u = await requireStaff()
  const invoer: Record<string, { mode?: Modus; value?: string }> = {}
  for (const [k, v] of f.entries()) {
    const m = /^(waarde|modus)__(.+)$/.exec(k)
    if (!m) continue
    invoer[m[2]!] = invoer[m[2]!] ?? {}
    if (m[1] === 'waarde') invoer[m[2]!]!.value = String(v)
    else invoer[m[2]!]!.mode = String(v) as Modus
  }
  return veilig(async () => {
    await bewaarVelden(tekst(f, 'id'), invoer, u)
  })
}

export async function bewaarGegevensActie(f: FormData): Promise<ActionResult> {
  const u = await requireStaff()
  return veilig(async () => {
    if (!tekst(f, 'title')) throw new MarketingFout('Geef een titel.')
    await bewaarGegevens(tekst(f, 'id'), { title: tekst(f, 'title'), slug: tekst(f, 'slug'), ownerId: tekst(f, 'ownerId') || null, targetUrl: tekst(f, 'targetUrl') }, u)
  })
}

export async function bewaarKoppelingenActie(f: FormData): Promise<ActionResult> {
  const u = await requireStaff()
  return veilig(async () => {
    await zetKoppelingen(tekst(f, 'id'), { subjectIds: lijst(f, 'subjectIds'), industryIds: lijst(f, 'industryIds'), clientIds: lijst(f, 'clientIds') }, u)
  })
}

export async function workflowActie(f: FormData): Promise<ActionResult> {
  const u = await requireStaff()
  const id = tekst(f, 'id'), stap = tekst(f, 'stap'), note = tekst(f, 'note')
  return veilig(async () => {
    if (stap === 'indienen') await dienIn(id, u, note)
    else if (stap === 'goedkeuren') await keurGoed(id, u, note)
    else if (stap === 'terugsturen') await stuurTerug(id, u, note)
    else if (stap === 'archiveren') await archiveer(id, u, note)
    else if (stap === 'terugtrekken') await trekTerug(id, u)
    else throw new MarketingFout('Onbekende stap.')
  })
}

export async function publicatieActie(f: FormData): Promise<ActionResult> {
  const u = await requireStaff()
  return veilig(async () => {
    const d = tekst(f, 'datum')
    await bevestigPublicatie(tekst(f, 'id'), { targetUrl: tekst(f, 'targetUrl'), externalId: tekst(f, 'externalId'), datum: d ? new Date(`${d}T12:00:00`) : undefined }, u)
  })
}

export async function opmerkingActie(f: FormData): Promise<ActionResult> {
  const u = await requireStaff()
  return veilig(async () => {
    if (!tekst(f, 'body')) throw new MarketingFout('Schrijf eerst een opmerking.')
    await plaatsOpmerking(tekst(f, 'id'), tekst(f, 'body'), u, tekst(f, 'fieldKey'))
  })
}

export async function assetActie(f: FormData): Promise<ActionResult> {
  const u = await requireStaff()
  return veilig(async () => {
    if (tekst(f, 'ontkoppel')) return ontkoppelAsset(tekst(f, 'id'), tekst(f, 'ontkoppel'), u)
    if (!tekst(f, 'storageReference')) throw new MarketingFout('Vul in waar het beeld staat.')
    const r = tekst(f, 'rightsStatus')
    await voegAssetToe(tekst(f, 'id'), { storageReference: tekst(f, 'storageReference'), altText: tekst(f, 'altText'), rightsStatus: r === 'granted' || r === 'denied' ? r : 'unknown', role: tekst(f, 'role') }, u)
  })
}
