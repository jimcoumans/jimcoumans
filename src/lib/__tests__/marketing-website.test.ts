/**
 * Tests voor Marketing → Website. Wat vast moet liggen:
 * - rechten: klanten nooit, medewerkers redactie, beheerders review en beheer;
 * - uniciteit: één algemene pagina per onderwerp, één per onderwerp × branche,
 *   één hub per branche; archiveren maakt de plek vrij;
 * - overerving: overnemen toont de bron, eigen tekst gaat voor, verborgen is
 *   iets anders dan leeg; een bronwijziging markeert goedgekeurde varianten;
 * - workflow: goedkeuren en publiceren zijn los, een variant wacht op zijn bron;
 * - bewijs: AND op onderwerp en branche, afgeleid via de klant, ontdubbeld;
 * - exports: geen klantbewijs zonder toestemming; de matrix-CSV.
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { readPostgresError } from '../db-errors'
import { marketingClients, marketingContentItems, marketingIndustries, marketingSubjects, users } from '../../db/schema'
import { bewaarBranche, bewaarKlant, bewaarOnderwerp, magMarketing, maakSlug, verwijderOnderwerp, MarketingFout } from '../marketing/registers'
import {
  archiveer,
  bevestigPublicatie,
  bewaarVelden,
  bewijsVoor,
  celStatus,
  dienIn,
  exportJson,
  exportMarkdown,
  haalContent,
  keurGoed,
  maakContent,
  matrixCsv,
  voortgang,
  zetKoppelingen,
  zetPlanning,
} from '../marketing/content'

const t = Date.now()
const subjects: string[] = [], industries: string[] = [], clients: string[] = [], items: string[] = [], gebruikers: string[] = []
after(async () => {
  if (items.length) await db.delete(marketingContentItems).where(inArray(marketingContentItems.id, items))
  if (clients.length) await db.delete(marketingClients).where(inArray(marketingClients.id, clients))
  if (subjects.length) await db.delete(marketingSubjects).where(inArray(marketingSubjects.id, subjects))
  if (industries.length) await db.delete(marketingIndustries).where(inArray(marketingIndustries.id, industries))
  if (gebruikers.length) await db.delete(users).where(inArray(users.id, gebruikers))
  await client.end()
})

let staff: { id: string; role: string }, admin: { id: string; role: string }
const schendt = (naam: string) => (e: unknown) => readPostgresError(e)?.constraint === naam
const klant = { id: '00000000-0000-0000-0000-000000000000', role: 'client' }

async function maak(inv: Parameters<typeof maakContent>[0], u = staff) {
  const it = await maakContent({ ...inv, demo: true }, u)
  items.push(it.id)
  return it
}
async function vulVerplicht(id: string, extra: Record<string, string> = {}) {
  const d = await haalContent(id)
  const invoer: Record<string, { mode: 'override'; value: string }> = {}
  for (const v of d!.velden) if (v.veld.verplicht) invoer[v.veld.sleutel] = { mode: 'override', value: extra[v.veld.sleutel] ?? `${v.veld.label} ${id.slice(0, 6)}` }
  await bewaarVelden(id, invoer, staff)
}

test('voorbereiding', async () => {
  const [s] = await db.insert(users).values({ email: `mkt-staff-${t}@jr.test`, role: 'staff' }).returning()
  const [a] = await db.insert(users).values({ email: `mkt-admin-${t}@jr.test`, role: 'admin' }).returning()
  gebruikers.push(s!.id, a!.id)
  staff = { id: s!.id, role: 'staff' }
  admin = { id: a!.id, role: 'admin' }
})

test('rechten: klanten nooit, medewerkers redactie, beheerders alles', async () => {
  assert.equal(magMarketing('client', 'lezen'), false)
  assert.equal(magMarketing(undefined, 'lezen'), false)
  assert.equal(magMarketing('staff', 'bewerken'), true)
  assert.equal(magMarketing('staff', 'beoordelen'), false)
  assert.equal(magMarketing('admin', 'beheren'), true)
  await assert.rejects(maakContent({ kind: 'faq', title: 'Geen toegang' }, klant), MarketingFout)
  assert.equal(maakSlug('Google Ads & SEO'), 'google-ads-en-seo')
})

let googleAds = '', growth = '', advocatuur = '', notariaat = ''
test('uniciteit: één algemene pagina, één variant per combinatie, één hub; archiveren maakt vrij', async () => {
  googleAds = (await bewaarOnderwerp({ type: 'service', name: `Google Ads ${t}`, demo: true })).id
  growth = (await bewaarOnderwerp({ type: 'package', name: `Growth ${t}`, demo: true })).id
  advocatuur = (await bewaarBranche({ name: `Advocatuur ${t}`, demo: true })).id
  notariaat = (await bewaarBranche({ name: `Notariaat ${t}`, demo: true })).id
  subjects.push(googleAds, growth)
  industries.push(advocatuur, notariaat)

  const alg = await maak({ kind: 'page', subjectId: googleAds, title: 'Google Ads' })
  await assert.rejects(maak({ kind: 'page', subjectId: googleAds, title: 'Dubbel' }), schendt('marketing_content_general_page_idx'))
  await maak({ kind: 'page', subjectId: googleAds, industryId: advocatuur, title: 'Google Ads × Advocatuur' })
  await assert.rejects(maak({ kind: 'page', subjectId: googleAds, industryId: advocatuur, title: 'Dubbel' }), schendt('marketing_content_variant_page_idx'))
  const hub = await maak({ kind: 'page', industryId: advocatuur, title: 'Advocatuur' })
  await assert.rejects(maak({ kind: 'page', industryId: advocatuur, title: 'Dubbele hub' }), schendt('marketing_content_hub_page_idx'))
  await archiveer(hub.id, admin)
  await maak({ kind: 'page', industryId: advocatuur, title: 'Advocatuur, opnieuw' })
  await assert.rejects(verwijderOnderwerp(googleAds), MarketingFout)
  assert.ok(alg.id)
})

test('overerving, unieke velden, bron eerst goedkeuren, herbeoordeling na bronwijziging', async () => {
  const alleItems = await db.select().from(marketingContentItems).where(inArray(marketingContentItems.id, items))
  const alg = alleItems.find((i) => i.subjectId === googleAds && !i.industryId)!
  const variant = alleItems.find((i) => i.subjectId === googleAds && i.industryId === advocatuur)!

  await vulVerplicht(alg.id, { definitie: 'Google Ads is adverteren in de zoekresultaten.' })
  let v = await haalContent(variant.id)
  const def = v!.velden.find((x) => x.veld.sleutel === 'definitie')!
  assert.equal(def.modus, 'inherit')
  assert.equal(def.herkomst, 'bron')
  assert.equal(def.effectief, 'Google Ads is adverteren in de zoekresultaten.')

  // Headline gelijk aan de bron telt niet als uniek; verborgen is iets anders dan leeg.
  const bronHeadline = (await haalContent(alg.id))!.velden.find((x) => x.veld.sleutel === 'hero_headline')!.effectief
  await bewaarVelden(variant.id, { hero_headline: { mode: 'override', value: bronHeadline }, uitdagingen: { mode: 'hidden' } }, staff)
  v = await haalContent(variant.id)
  assert.equal(v!.velden.find((x) => x.veld.sleutel === 'hero_headline')!.gelijkAanBron, true)
  assert.equal(v!.velden.find((x) => x.veld.sleutel === 'uitdagingen')!.herkomst, 'verborgen')

  // Variant goedkeuren gaat niet: bron niet goedgekeurd en unieke velden ontbreken.
  await dienIn(variant.id, staff)
  await assert.rejects(keurGoed(variant.id, admin), /algemene pagina|eigen tekst|in te vullen/)
  await assert.rejects(keurGoed(alg.id, staff), MarketingFout) // medewerker mag niet goedkeuren

  // Bron goedkeuren, variant eigen tekst geven en goedkeuren.
  await dienIn(alg.id, staff)
  await keurGoed(alg.id, admin)
  await vulVerplicht(variant.id, { hero_headline: 'Google Ads voor advocatenkantoren', introductie: 'Eigen intro voor advocatuur.', seo_title: 'Google Ads advocatuur', seo_description: 'Eigen beschrijving.' })
  await bewaarVelden(variant.id, { definitie: { mode: 'inherit' }, cta: { mode: 'inherit' } }, staff)
  await dienIn(variant.id, staff)
  await keurGoed(variant.id, admin)
  v = await haalContent(variant.id)
  assert.equal(v!.item.workflowStatus, 'approved')
  assert.equal(v!.item.publicationStatus, 'unpublished') // goedgekeurd is nog niet gepubliceerd

  // Publicatie vastleggen, daarna bronwijziging: variant moet herbeoordeeld worden, tekst blijft gepubliceerd.
  await assert.rejects(bevestigPublicatie(variant.id, { targetUrl: '/x' }, staff), MarketingFout)
  await bevestigPublicatie(variant.id, { targetUrl: '/branches/advocatuur/diensten/google-ads/' }, admin)
  await bewaarVelden(alg.id, { definitie: { mode: 'override', value: 'Nieuwe definitie.' } }, staff)
  v = await haalContent(variant.id)
  assert.equal(v!.item.needsReview, true)
  assert.equal(v!.item.publicationStatus, 'published')
  assert.equal(celStatus(v!.item, null), 'herbeoordeling')
  // De bron zelf is weer concept geworden, met behoud van de goedgekeurde revisie.
  const bron = await haalContent(alg.id)
  assert.equal(bron!.item.workflowStatus, 'draft')
  assert.ok(bron!.item.approvedRevisionId)
})

test('bewijs: AND op onderwerp en branche, afgeleid via de klant, ontdubbeld; export zonder toestemming weggelaten', async () => {
  const kantoorX = await bewaarKlant({ name: `Kantoor X ${t}`, permission: 'granted', industryIds: [advocatuur], demo: true })
  const kantoorY = await bewaarKlant({ name: `Kantoor Y ${t}`, permission: 'unknown', industryIds: [advocatuur], demo: true })
  clients.push(kantoorX, kantoorY)
  const caseX = await maak({ kind: 'case', title: 'Case kantoor X' })
  await zetKoppelingen(caseX.id, { subjectIds: [googleAds, growth], industryIds: [advocatuur], clientIds: [kantoorX] }, staff)
  const caseY = await maak({ kind: 'case', title: 'Case kantoor Y' })
  await zetKoppelingen(caseY.id, { subjectIds: [googleAds], industryIds: [], clientIds: [kantoorY] }, staff)
  const caseNotariaat = await maak({ kind: 'case', title: 'Case notariaat' })
  await zetKoppelingen(caseNotariaat.id, { subjectIds: [googleAds], industryIds: [notariaat], clientIds: [] }, staff)

  const adv = await bewijsVoor({ subjectId: googleAds, industryId: advocatuur })
  const ids = adv.map((b) => b.item.id)
  assert.deepEqual(new Set(ids), new Set([caseX.id, caseY.id]))
  assert.equal(ids.length, new Set(ids).size) // ontdubbeld
  assert.equal(adv.find((b) => b.item.id === caseX.id)!.brancheHerkomst, 'direct')
  assert.equal(adv.find((b) => b.item.id === caseY.id)!.brancheHerkomst, 'afgeleid')
  assert.ok(!ids.includes(caseNotariaat.id)) // niet in een andere sector
  assert.deepEqual((await bewijsVoor({ subjectId: growth, industryId: advocatuur })).map((b) => b.item.id), [caseX.id])

  const alleItems = await db.select().from(marketingContentItems).where(inArray(marketingContentItems.id, items))
  const variant = alleItems.find((i) => i.subjectId === googleAds && i.industryId === advocatuur)!
  const j = await exportJson(variant.id)
  assert.deepEqual(j!.bewijs.map((b) => b.id), [caseX.id])
  assert.equal(j!.bewijsZonderToestemming, 1)
  assert.match((await exportMarkdown(variant.id))!, /# Google Ads × Advocatuur/)
})

test('planning en voortgang: noemer zonder niet-relevante combinaties, CSV zonder records voor lege cellen', async () => {
  await zetPlanning(googleAds, notariaat, 'not_relevant', staff)
  await zetPlanning(growth, advocatuur, 'planned', staff)
  const voor = await db.select().from(marketingContentItems).where(inArray(marketingContentItems.id, items))
  const v = await voortgang()
  assert.ok(v.varianten.noemer >= 2) // google ads × advocatuur (content) + growth × advocatuur (gepland)
  assert.ok(v.nietRelevant >= 1)
  const csv = await matrixCsv('service')
  assert.match(csv, new RegExp(`Google Ads ${t}`))
  assert.match(csv, /Niet relevant/)
  const na = await db.select().from(marketingContentItems).where(inArray(marketingContentItems.id, items))
  assert.equal(na.length, voor.length) // de matrix maakt geen records aan
})
