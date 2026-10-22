/**
 * De uitingen-check.
 *
 * Wat hier vastligt: de check krijgt de juiste regels, afspraken, doelgroep
 * en logo's mee; afspraken voor een ander merk gaan alleen ter informatie
 * mee; het oordeel volgt uit de bevindingen en niet uit wat de AI ervan
 * vindt; een check wordt maar één keer uitgevoerd; een nieuwe versie houdt
 * de bestanden en krijgt de vorige bevindingen mee; en niet-groen gaat
 * alleen met een reden naar de klant, en alleen de nieuwste versie.
 *
 * Het model is hier nep: de test kost niets en hangt niet af van internet.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db, client } from '../../db'
import { brandFiles, brandVoices, organizationAudiences, organizations, uitingChecks, users } from '../../db/schema'
import {
  afspraakGeldt,
  bepaalOordeel,
  CheckError,
  geefVrij,
  isAfbeeldingUrl,
  leesUitkomst,
  leesUrl,
  maakAfspraak,
  maakCheck,
  maakMerk,
  getKlantInstellingen,
  voerCheckUit,
  wijzigMerk,
  type Model,
  type Uitkomst,
  type Vraag,
} from '../uitingen-check'
import { bewaar } from '../bestandsopslag'

/** Een echte png van 1 bij 1 pixel: de check kijkt naar de eerste bytes, niet naar de naam. */
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex')

const suffix = Date.now()
let map: string
let orgId: string
let andereOrgId: string
let userId: string
let createId: string
let zakelijkId: string
let particulierId: string

const leeg = { samenvatting: '', bevindingen: [], getoetst: [], nietGecontroleerd: [], verbeterdeTekst: '', landingspagina: { opgehaald: true, wat: '' } }

function nepModel(antwoord: object, vragen: Vraag[] = []): Model {
  return async (vraag) => {
    vragen.push(vraag)
    return { data: { ...leeg, ...antwoord }, invoerTokens: 1000, uitvoerTokens: 200 }
  }
}

const tekstVan = (v: Vraag) => v.inhoud.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n')

function invoer(extra: Partial<Parameters<typeof maakCheck>[0]> = {}): Parameters<typeof maakCheck>[0] {
  return {
    organizationId: orgId,
    titel: 'Nieuwsbrief november',
    soort: 'nieuwsbrief',
    kanaal: 'MailerLite',
    merkId: null,
    kanaalMerkId: null,
    doelgroepId: null,
    campaignId: null,
    doel: 'Tickets verkopen voor de proeverij',
    tekst: 'Kom naar onze proeverij op zaterdag 14 november!',
    uitingUrl: null,
    lpUrl: null,
    toelichting: null,
    bestanden: [],
    vorigeCheckId: null,
    userId,
    ...extra,
  }
}

before(async () => {
  map = await mkdtemp(path.join(tmpdir(), 'checks-'))
  process.env.BESTANDSOPSLAG_MAP = map
  process.env.BESTANDSOPSLAG = 'lokaal'

  const [org] = await db.insert(organizations).values({ slug: `check-${suffix}`, name: `Wijnhuis ${suffix}` }).returning()
  orgId = org!.id
  const [andere] = await db.insert(organizations).values({ slug: `check-ander-${suffix}`, name: `Ander ${suffix}` }).returning()
  andereOrgId = andere!.id
  const [user] = await db.insert(users).values({ email: `check-${suffix}@test.nl`, name: `Stan ${suffix}`, role: 'staff' }).returning()
  userId = user!.id

  await maakMerk(orgId, { naam: 'Create', omschrijving: 'Het evenementenmerk.' })
  const instellingen = await getKlantInstellingen(orgId)
  createId = instellingen.merken[0]!.id

  await bewaar(`test/${suffix}/logo-create.png`, PNG, 'image/png')
  await bewaar(`test/${suffix}/logo-hoofd.png`, PNG, 'image/png')
  const [logoCreate] = await db
    .insert(brandFiles)
    .values({ organizationId: orgId, kind: 'logo', title: 'Create primair', storageKey: `test/${suffix}/logo-create.png`, contentType: 'image/png', bytes: PNG.length, logoVariant: 'primair' })
    .returning()
  await db
    .insert(brandFiles)
    .values({ organizationId: orgId, kind: 'logo', title: 'Wijnhuis primair', storageKey: `test/${suffix}/logo-hoofd.png`, contentType: 'image/png', bytes: PNG.length })
  await wijzigMerk(createId, orgId, { naam: 'Create', omschrijving: 'Het evenementenmerk.', logoIds: [logoCreate!.id] })

  const [zakelijk] = await db
    .insert(organizationAudiences)
    .values({ organizationId: orgId, name: 'Zakelijk', address: 'u', styleNotes: 'Zakelijk-warm, relatiegeschenken, geen uitroeptekens.' })
    .returning()
  zakelijkId = zakelijk!.id
  const [particulier] = await db
    .insert(organizationAudiences)
    .values({ organizationId: orgId, name: 'Particulier', address: 'je', styleNotes: 'Gezellig en uitnodigend.' })
    .returning()
  particulierId = particulier!.id

  await db.insert(brandVoices).values({ organizationId: orgId, address: 'je', character: 'Nuchter en gastvrij' })
  await maakAfspraak(orgId, { tekst: 'Op elke uiting van Create staat het Create-logo.', categorie: 'merk', merkId: createId, doelgroepId: null, kanaal: null, soort: null }, userId)
  await maakAfspraak(orgId, { tekst: 'Nooit "goedkoop" schrijven.', categorie: 'toon', merkId: null, doelgroepId: null, kanaal: null, soort: null }, userId)
})

after(async () => {
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await db.delete(organizations).where(eq(organizations.id, andereOrgId))
  await db.delete(users).where(eq(users.id, userId))
  delete process.env.BESTANDSOPSLAG_MAP
  await rm(map, { recursive: true, force: true })
  await client.end()
})

/* ------------------------------ Zonder database --------------------------- */

test('oordeel: blokkerend is rood, belangrijk oranje, niets groen', () => {
  const b = (ernst: 'blokkerend' | 'belangrijk' | 'suggestie') => ({ categorie: 'taal' as const, ernst, waar: '', citaat: '', probleem: 'x', voorstel: '', regel: '' })
  assert.equal(bepaalOordeel({ bevindingen: [b('suggestie'), b('blokkerend')], nietGecontroleerd: [], landingspagina: null }), 'rood')
  assert.equal(bepaalOordeel({ bevindingen: [b('belangrijk')], nietGecontroleerd: [], landingspagina: null }), 'oranje')
  assert.equal(bepaalOordeel({ bevindingen: [b('suggestie')], nietGecontroleerd: [], landingspagina: null }), 'groen')
})

test('oordeel: wat niet gecontroleerd kon worden, is geen groen licht', () => {
  assert.equal(bepaalOordeel({ bevindingen: [], nietGecontroleerd: ['Geen referentielogo'], landingspagina: null }), 'oranje')
  assert.equal(bepaalOordeel({ bevindingen: [], nietGecontroleerd: [], landingspagina: { opgehaald: false, wat: '' } }), 'oranje')
  assert.equal(bepaalOordeel({ bevindingen: [], nietGecontroleerd: [], landingspagina: { opgehaald: true, wat: '' } }), 'groen')
})

test('de uitkomst van de AI: onbekende categorie wordt overig, onbekende ernst belangrijk', () => {
  const u = leesUitkomst(
    {
      ...leeg,
      bevindingen: [
        { categorie: 'Spelling', ernst: 'kritiek', waar: 'kop', citaat: 'zaterdag 14 november', probleem: 'Klopt niet', voorstel: '', regel: 'a1' },
        { categorie: 'taal', ernst: 'suggestie', waar: '', citaat: '', probleem: '  ', voorstel: '', regel: '' },
      ],
      getoetst: [{ regel: 'r1', uitkomst: 'OK', toelichting: '' }, { regel: 'A1', uitkomst: 'misschien', toelichting: '' }],
    },
    [],
    false,
  )
  assert.equal(u.bevindingen.length, 1, 'een bevinding zonder probleem valt weg')
  assert.equal(u.bevindingen[0]!.categorie, 'overig')
  assert.equal(u.bevindingen[0]!.ernst, 'belangrijk')
  assert.equal(u.bevindingen[0]!.regel, 'A1')
  assert.deepEqual(u.getoetst.map((t) => t.uitkomst), ['ok', 'onbekend'])
  assert.equal(u.landingspagina, null, 'zonder landingspagina geen oordeel over de landingspagina')
})

test('een afspraak geldt alleen waar hij voor is', () => {
  const uiting = { merkId: 'create', kanaalMerkId: 'vanoys', doelgroepId: 'zakelijk', kanaal: 'Instagram feed', soort: 'post' }
  assert.equal(afspraakGeldt({ merkId: null, doelgroepId: null, kanaal: null, soort: null }, uiting), true)
  assert.equal(afspraakGeldt({ merkId: 'create', doelgroepId: null, kanaal: null, soort: null }, uiting), true)
  assert.equal(afspraakGeldt({ merkId: 'vanoys', doelgroepId: null, kanaal: null, soort: null }, uiting), true, 'ook het merk van het kanaal telt')
  assert.equal(afspraakGeldt({ merkId: 'ander', doelgroepId: null, kanaal: null, soort: null }, uiting), false)
  assert.equal(afspraakGeldt({ merkId: null, doelgroepId: 'particulier', kanaal: null, soort: null }, uiting), false)
  assert.equal(afspraakGeldt({ merkId: null, doelgroepId: null, kanaal: 'instagram', soort: null }, uiting), true)
  assert.equal(afspraakGeldt({ merkId: null, doelgroepId: null, kanaal: 'LinkedIn', soort: null }, uiting), false)
  assert.equal(afspraakGeldt({ merkId: null, doelgroepId: null, kanaal: null, soort: 'nieuwsbrief' }, uiting), false)
})

test('links: zonder https ervoor wordt het https, rare links niet', () => {
  assert.equal(leesUrl('wijnhuis.nl/proeverij'), 'https://wijnhuis.nl/proeverij')
  assert.equal(leesUrl(''), null)
  assert.throws(() => leesUrl('https://gebruiker:geheim@wijnhuis.nl'), CheckError)
  assert.throws(() => leesUrl('ftp://wijnhuis.nl'), CheckError)
  assert.equal(isAfbeeldingUrl('https://cdn.nl/post.JPG?v=2'), true)
  assert.equal(isAfbeeldingUrl('https://wijnhuis.nl/nieuwsbrief'), false)
})

/* ------------------------------ Met database ------------------------------ */

test('de check krijgt merk, afspraken, doelgroep en logo’s mee', async () => {
  const rij = await maakCheck(
    invoer({ merkId: createId, doelgroepId: zakelijkId, lpUrl: 'https://wijnhuis.nl/proeverij', bestanden: [{ naam: 'slide 1.png', data: PNG }] }),
  )
  const vragen: Vraag[] = []
  const uit = await voerCheckUit(rij.id, nepModel({}, vragen))
  assert.equal(uit?.status, 'klaar')
  const v = vragen[0]!
  const tekst = tekstVan(v)

  const geldend = tekst.slice(tekst.indexOf('## Afspraken met deze klant die van toepassing zijn'))
  assert.match(geldend, /Create-logo/)
  assert.match(tekst, /Doelgroep: Zakelijk[\s\S]*Aanspreekvorm voor deze groep: u[\s\S]*geen uitroeptekens/)
  assert.match(tekst, /Andere doelgroepen[\s\S]*Particulier \(je\)/, 'de andere doelgroep gaat mee, om verwarring te herkennen')
  assert.match(tekst, /Merk van de inhoud: Create/)
  assert.match(tekst, /Foutloos Nederlands/, 'de algemene regels uit de migratie gaan mee')
  assert.equal(v.magOphalen, true, 'met een landingspagina mag de AI ophalen')

  const beelden = v.inhoud.filter((b) => b.type === 'image')
  assert.equal(beelden.length, 3, 'twee referentielogo’s en de uiting zelf')
  const logoIndex = v.inhoud.findIndex((b) => b.type === 'text' && b.text.startsWith('Create primair'))
  const hoofdIndex = v.inhoud.findIndex((b) => b.type === 'text' && b.text.startsWith('Wijnhuis primair'))
  assert.ok(logoIndex > 0 && logoIndex < hoofdIndex, 'het logo van het merk op deze uiting komt eerst')
})

test('een afspraak voor een ander merk gaat alleen ter informatie mee', async () => {
  const rij = await maakCheck(invoer({ titel: 'Post hoofdmerk', soort: 'post' }))
  const vragen: Vraag[] = []
  await voerCheckUit(rij.id, nepModel({}, vragen))
  const tekst = tekstVan(vragen[0]!)
  const geldend = tekst.slice(tekst.indexOf('## Afspraken met deze klant die van toepassing zijn'), tekst.indexOf('## Andere afspraken'))
  assert.doesNotMatch(geldend, /Create-logo/)
  assert.match(geldend, /goedkoop/)
  assert.match(tekst.slice(tekst.indexOf('## Andere afspraken')), /Create-logo/)
  assert.equal(vragen[0]!.magOphalen, false, 'zonder link niets op te halen')
})

test('het oordeel komt uit de bevindingen, en de regels gaan als momentopname mee', async () => {
  const rij = await maakCheck(invoer({ titel: 'Ad met fout', soort: 'advertentie' }))
  const uit = await voerCheckUit(
    rij.id,
    nepModel({
      samenvatting: 'Kan zo naar de klant.',
      bevindingen: [{ categorie: 'feiten', ernst: 'blokkerend', waar: 'kop', citaat: 'zaterdag 14 november', probleem: '14 november is een vrijdag.', voorstel: 'vrijdag 14 november', regel: 'R3' }],
    }),
  )
  assert.equal(uit?.oordeel, 'rood', 'een blokkerende bevinding is rood, wat de samenvatting ook zegt')
  const u = uit!.uitkomst as Uitkomst
  assert.ok(u.regels.some((r) => r.code === 'A1'))
  assert.equal(uit!.invoerTokens, 1000)
})

test('een check wordt maar één keer uitgevoerd', async () => {
  const rij = await maakCheck(invoer({ titel: 'Eén keer' }))
  let keren = 0
  const model: Model = async () => {
    keren++
    return { data: leeg, invoerTokens: 0, uitvoerTokens: 0 }
  }
  await voerCheckUit(rij.id, model)
  assert.equal(await voerCheckUit(rij.id, model), null)
  assert.equal(keren, 1)
})

test('een antwoord in de verkeerde vorm is een mislukte check, geen groene', async () => {
  const rij = await maakCheck(invoer({ titel: 'Rommel' }))
  const uit = await voerCheckUit(rij.id, async () => ({ data: { iets: 'anders' }, invoerTokens: 0, uitvoerTokens: 0 }))
  assert.equal(uit?.status, 'fout')
  assert.equal(uit?.oordeel, null)
})

test('een nieuwe versie houdt de bestanden en krijgt de vorige bevindingen mee', async () => {
  const eerste = await maakCheck(invoer({ titel: 'Flyer', soort: 'flyer', tekst: null, bestanden: [{ naam: 'flyer.png', data: PNG }] }))
  await voerCheckUit(
    eerste.id,
    nepModel({ bevindingen: [{ categorie: 'taal', ernst: 'blokkerend', waar: 'kop', citaat: 'proeverei', probleem: 'Spelfout', voorstel: 'proeverij', regel: '' }] }),
  )
  const tweede = await maakCheck(invoer({ titel: '', soort: 'flyer', tekst: null, vorigeCheckId: eerste.id }))
  assert.equal(tweede.versie, 2)
  assert.equal(tweede.titel, 'Flyer', 'zonder nieuwe naam de naam van de vorige')
  assert.deepEqual(tweede.bestanden, eerste.bestanden)

  const vragen: Vraag[] = []
  await voerCheckUit(tweede.id, nepModel({}, vragen))
  assert.match(tekstVan(vragen[0]!), /Bij versie 1 vond je dit[\s\S]*Spelfout/)

  await assert.rejects(() => geefVrij(eerste.id, userId, 'De klant wil deze versie.'), /nieuwere versie/)
})

test('niet-groen gaat alleen met een reden naar de klant', async () => {
  const rij = await maakCheck(invoer({ titel: 'Poort' }))
  await voerCheckUit(rij.id, nepModel({ bevindingen: [{ categorie: 'toon', ernst: 'belangrijk', waar: '', citaat: '', probleem: 'Te formeel', voorstel: '', regel: '' }] }))
  await assert.rejects(() => geefVrij(rij.id, userId, null), /niet groen/)
  await geefVrij(rij.id, userId, 'De klant schreef deze tekst zelf.')
  const [na] = await db.select().from(uitingChecks).where(eq(uitingChecks.id, rij.id))
  assert.ok(na!.vrijgegevenOp)
  assert.equal(na!.vrijgaveReden, 'De klant schreef deze tekst zelf.')
  await assert.rejects(() => geefVrij(rij.id, userId, 'nog een keer'), /al vrijgegeven/)
})

test('vrijgeven kan pas als de check klaar is', async () => {
  const rij = await maakCheck(invoer({ titel: 'Nog niet' }))
  await assert.rejects(() => geefVrij(rij.id, userId, null), /pas als de check klaar is/)
})

test('een merk of doelgroep van een andere klant komt er niet in', async () => {
  const [vreemd] = await db.insert(organizationAudiences).values({ organizationId: andereOrgId, name: 'Vreemd' }).returning()
  await assert.rejects(() => maakCheck(invoer({ doelgroepId: vreemd!.id })), CheckError)
  await assert.rejects(() => maakCheck(invoer({ organizationId: andereOrgId, merkId: createId })), CheckError)
  void particulierId
})

test('zonder uiting geen check, en een onleesbaar bestand ook niet', async () => {
  await assert.rejects(() => maakCheck(invoer({ tekst: null })), /Voeg de uiting toe/)
  await assert.rejects(() => maakCheck(invoer({ bestanden: [{ naam: 'brief.docx', data: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]) }] })), /kunnen we niet lezen/)
})
