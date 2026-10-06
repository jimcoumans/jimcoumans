/**
 * Feedback van de klant verwerken in een briefing.
 *
 * Wat hier vastligt: de briefing wordt in één keer vervangen door de nieuwe
 * versie, de tijdlijnregels die blijven houden hun koppeling met ClickUp,
 * een verwerking wordt maar één keer uitgevoerd, een mislukte verwerking
 * laat de briefing ongemoeid, en terugdraaien zet alles terug.
 *
 * Het model is hier nep: de test kost niets en hangt niet af van internet.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, users, campaigns, campaignKpis, campaignChannels, campaignTimeline, campaignVerwerkingen } from '../../db/schema'
import {
  maakVerwerking,
  voerVerwerkingUit,
  draaiVerwerkingTerug,
  listVerwerkingen,
  herkenFeedbackBestand,
  vindVersietaal,
  briefingAlsInvoer,
  systeemPrompt,
  VerwerkError,
  type Model,
  type Uitkomst,
} from '../campagne-verwerken'
import { getCampagne } from '../campagnes'

const suffix = Date.now()
let orgId: string
let userId: string
let campaignId: string
let blijftId: string
let valtWegId: string

before(async () => {
  const [org] = await db.insert(organizations).values({ slug: `bv-${suffix}`, name: `Verwerk BV ${suffix}` }).returning()
  orgId = org!.id
  const [user] = await db
    .insert(users)
    .values({ email: `bv-${suffix}@test.nl`, name: `Robin ${suffix}`, role: 'staff' })
    .returning()
  userId = user!.id
  const [c] = await db
    .insert(campaigns)
    .values({
      organizationId: orgId,
      title: 'Kerst',
      summary: 'Kerstavond, brunch en diner.',
      offerWhat: 'Kerstavond-menu en kerstdiner',
      startOn: new Date('2026-10-07T12:00:00'),
      endOn: new Date('2026-12-17T12:00:00'),
      status: 'voorstel',
      version: 1,
    })
    .returning()
  campaignId = c!.id
  await db.insert(campaignKpis).values([
    { campaignId, position: 0, label: 'Kerstavond', targetQuantity: 40, priceCents: 6500 },
    { campaignId, position: 1, label: 'Kerstdiner', targetQuantity: 60, priceCents: 8000 },
  ])
  await db.insert(campaignChannels).values({ campaignId, position: 0, kind: 'Meta Ads: targeting', status: 'maken' })
  const [blijft] = await db
    .insert(campaignTimeline)
    .values({ campaignId, description: 'Live', dueOn: new Date('2026-10-07T12:00:00'), assigneeLabel: 'Campagne', clickupTaskId: 'cu-123' })
    .returning()
  blijftId = blijft!.id
  const [valtWeg] = await db
    .insert(campaignTimeline)
    .values({ campaignId, description: 'Mailing kerstavond', dueOn: new Date('2026-11-01T12:00:00') })
    .returning()
  valtWegId = valtWeg!.id
})

after(async () => {
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await db.delete(users).where(eq(users.id, userId))
  await client.end()
})

/** De nieuwe briefing zoals de AI hem zou teruggeven: kerstavond eruit, brunch erin. */
function nieuweBriefing(): Uitkomst {
  return {
    samenvatting: 'Brunch op eerste kerstdag en een kerstdiner op beide kerstdagen.',
    doel: {
      doelInEenZin: '60 gasten voor de brunch en 60 voor het diner.',
      resultaatDefinitie: '',
      budgetVorm: 'berekend',
      vastBudget: '',
      budgetToelichting: '',
      kpiOpmerkingen: '',
    },
    aanbod: { wat: 'Kerstbrunch en kerstdiner', boodschap: 'Vier de kerst bij ons.', waaromNu: '', nietBeloofd: '' },
    doelgroep: { regio: '', uitsluitingen: '', toelichting: '' },
    planning: { start: '2026-10-07', einde: '2026-12-17', toelichting: '' },
    afspraken: { klantDoet: 'Flyer in de winkel met QR-code.', overig: '' },
    achtergrond: { eerder: '', risicos: '' },
    kpis: [
      { label: 'Kerstbrunch', datum: '2026-12-25', aantal: 60, prijs: '47,50' },
      { label: 'Kerstdiner', datum: '', aantal: 60, prijs: '82,50' },
      { label: 'Zonder aantal', datum: '', aantal: 0, prijs: '' },
    ],
    kanalen: [{ soort: 'Meta Ads: targeting', aantal: '2 flights', toelichting: '', status: 'maken' }],
    tijdlijn: [
      { id: '', datum: '2026-10-07', omschrijving: 'Live', wie: 'Campagne' },
      { id: '', datum: '2026-11-15', omschrijving: 'Mailing', wie: `Robin ${suffix}` },
    ],
    wijzigingen: ['Kerstavond geschrapt', 'Brunch toegevoegd'],
    openVragen: ['Zijn de 60 dinergasten per dag of in totaal?'],
  }
}

test('bestanden op de inhoud herkennen', () => {
  assert.equal(herkenFeedbackBestand(Buffer.from('%PDF-1.7 ...'))?.blok, 'document')
  assert.equal(herkenFeedbackBestand(Buffer.from('89504e470d0a1a0a0000', 'hex'))?.mime, 'image/png')
  assert.equal(herkenFeedbackBestand(Buffer.from('Beste Robin,\nkerstavond doen we niet.'))?.blok, 'tekst')
  // Een Word-bestand is een zip: dat lezen we niet.
  assert.equal(herkenFeedbackBestand(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x08, 0x00])), null)
})

test('verwijzingen naar een eerdere versie worden gevonden', () => {
  const schoon = nieuweBriefing()
  assert.deepEqual(vindVersietaal(schoon), [])
  const vies = nieuweBriefing()
  vies.aanbod.wat = 'Kerstbrunch (nieuw) en kerstdiner'
  vies.samenvatting = 'Zoals de klant aangaf, geen kerstavond.'
  assert.deepEqual(vindVersietaal(vies), ['samenvatting', 'aanbod.wat'])
})

test('de opdracht noemt de datum van vandaag en het team', () => {
  const p = systeemPrompt(new Date('2026-10-06T12:00:00'), ['Robin Jacobs'])
  assert.match(p, /Vandaag is 2026-10-06/)
  assert.match(p, /Robin Jacobs/)
  assert.match(p, /Eén eindproduct/)
})

test('zonder tekst en zonder bestand valt er niets te verwerken', async () => {
  await assert.rejects(maakVerwerking({ campaignId, invoer: '   ', bestand: null, userId }), VerwerkError)
})

test('een mislukte verwerking laat de briefing ongemoeid', async () => {
  const r = await maakVerwerking({ campaignId, invoer: 'Kerstavond doen we niet.', bestand: null, userId })
  const kapot: Model = async () => ({ samenvatting: 'half antwoord' })
  const uit = await voerVerwerkingUit(r.id, kapot)
  assert.equal(uit?.status, 'fout')
  assert.ok(uit?.fout)
  const v = await getCampagne(campaignId)
  assert.equal(v?.campagne.summary, 'Kerstavond, brunch en diner.')
  assert.equal(v?.kpis.length, 2)
})

test('feedback verwerken geeft één schone briefing en een interne notitie', async () => {
  const r = await maakVerwerking({ campaignId, invoer: 'Kerstavond doen we niet. Brunch € 47,50.', bestand: null, userId })

  let gevraagd = ''
  const model: Model = async ({ systeem, inhoud }) => {
    gevraagd = systeem + inhoud.map((b) => (b.type === 'text' ? b.text : '')).join('\n')
    const u = nieuweBriefing()
    u.tijdlijn[0]!.id = blijftId
    return u
  }
  const uit = await voerVerwerkingUit(r.id, model, new Date('2026-10-06T12:00:00'))

  // Het model kreeg de briefing en de feedback.
  assert.match(gevraagd, /Kerstavond-menu en kerstdiner/)
  assert.match(gevraagd, /Brunch € 47,50/)

  assert.equal(uit?.status, 'klaar')
  assert.deepEqual(uit?.wijzigingen, ['Kerstavond geschrapt', 'Brunch toegevoegd'])
  assert.equal(uit?.openVragen[0], 'Zijn de 60 dinergasten per dag of in totaal?')
  // De KPI zonder aantal is weggelaten en dat staat erbij.
  assert.ok(uit?.openVragen.some((v) => v.includes('Zonder aantal')))

  const v = await getCampagne(campaignId)
  assert.ok(v)
  assert.equal(v.campagne.summary, 'Brunch op eerste kerstdag en een kerstdiner op beide kerstdagen.')
  assert.equal(v.campagne.offerWhat, 'Kerstbrunch en kerstdiner')
  assert.equal(v.campagne.clientDoes, 'Flyer in de winkel met QR-code.')
  assert.equal(v.campagne.resultDefinition, null)
  assert.deepEqual(
    v.kpis.map((k) => [k.label, k.targetQuantity, k.priceCents]),
    [
      ['Kerstbrunch', 60, 4750],
      ['Kerstdiner', 60, 8250],
    ],
  )
  assert.equal(v.kanalen[0]?.quantity, '2 flights')

  // De regel die bleef, houdt zijn id en zijn ClickUp-taak; de geschrapte is weg.
  const live = v.tijdlijn.find((t) => t.description === 'Live')
  assert.equal(live?.id, blijftId)
  assert.equal(live?.clickupTaskId, 'cu-123')
  assert.ok(!v.tijdlijn.some((t) => t.id === valtWegId))
  // "wie" met een naam uit het team wordt die collega.
  assert.equal(v.tijdlijn.find((t) => t.description === 'Mailing')?.assigneeUserId, userId)

  // De status van de briefing blijft; het portaal ziet dat hij gewijzigd is sinds de verstuurde versie.
  assert.equal(v.campagne.status, 'voorstel')

  // Een tweede keer uitvoeren doet niets.
  assert.equal(await voerVerwerkingUit(r.id, model), null)

  // Dezelfde vorm erin als eruit: wat de AI terugkrijgt, kan hij weer herschrijven.
  const invoer = briefingAlsInvoer(v)
  assert.equal(invoer.kpis[0]?.prijs, '47,50')
  assert.equal(invoer.planning.start, '2026-10-07')
})

test('terugdraaien zet de briefing terug zoals hij was', async () => {
  const lijst = await listVerwerkingen(campaignId)
  const laatste = lijst.find((r) => r.status === 'klaar')
  assert.ok(laatste?.magTerug)
  // Een mislukte verwerking kun je niet terugdraaien.
  const mislukt = lijst.find((r) => r.status === 'fout')
  assert.ok(mislukt && !mislukt.magTerug)
  await assert.rejects(draaiVerwerkingTerug(mislukt.id), VerwerkError)

  await draaiVerwerkingTerug(laatste.id)
  const v = await getCampagne(campaignId)
  assert.ok(v)
  assert.equal(v.campagne.summary, 'Kerstavond, brunch en diner.')
  assert.equal(v.campagne.clientDoes, null)
  assert.deepEqual(
    v.kpis.map((k) => [k.label, k.priceCents]),
    [
      ['Kerstavond', 6500],
      ['Kerstdiner', 8000],
    ],
  )
  assert.equal(v.tijdlijn.length, 2)
  assert.equal(v.tijdlijn.find((t) => t.id === blijftId)?.clickupTaskId, 'cu-123')
  assert.ok(v.tijdlijn.some((t) => t.id === valtWegId))
  assert.equal(v.campagne.startOn?.getTime(), new Date('2026-10-07T12:00:00').getTime())

  const [r] = await db.select().from(campaignVerwerkingen).where(eq(campaignVerwerkingen.id, laatste.id))
  assert.equal(r?.status, 'teruggedraaid')
})
