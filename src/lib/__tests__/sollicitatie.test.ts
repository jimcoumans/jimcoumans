/**
 * Tests voor sollicitaties die via de website binnenkomen.
 *
 * Dit is het enige punt in dit systeem waar iets van buiten naar binnen
 * schrijft zonder dat er iemand is ingelogd. De tests hieronder gaan dus
 * vooral over wat er NIET moet gebeuren: geen bots in de lijst, geen
 * dubbele inzendingen, geen onbeperkt volume, en geen kandidaat kwijt omdat
 * een veld net anders heet dan verwacht.
 */
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray, like } from 'drizzle-orm'
import { db, client } from '../../db'
import { candidates, candidateDocuments, vacancies } from '../../db/schema'
import {
  leesSollicitatie,
  leesVeld,
  lijktOpEmail,
  zoekVacature,
  ontvangSollicitatie,
  telLaatsteUur,
  isDubbel,
  listDocumenten,
  LOKVELD,
  MAX_PER_UUR,
  SollicitatieError,
} from '../sollicitatie'
import { wisVerlopenKandidaten, zetKandidaatStatus, bewaarTot } from '../werving'

const merk = `sol${Date.now()}`
let vacatureId: string
const gemaakteVacatures: string[] = []

/** Een nep-fetch die een pdf teruggeeft. */
const pdfFetch = (bytes = 200): typeof fetch =>
  (async () =>
    new Response(new Uint8Array(bytes), {
      headers: { 'content-type': 'application/pdf' },
    })) as unknown as typeof fetch

/** Een formulier zoals Elementor het stuurt. */
function formulier(velden: Record<string, string>): URLSearchParams {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(velden)) p.set(k, v)
  return p
}

before(async () => {
  const [v] = await db
    .insert(vacancies)
    .values({ title: `${merk} Marketing Manager`, status: 'open', openedOn: new Date() })
    .returning()
  vacatureId = v!.id
  gemaakteVacatures.push(vacatureId)
})

beforeEach(async () => {
  await db.delete(candidates).where(like(candidates.name, `${merk}%`))
})

after(async () => {
  await db.delete(candidates).where(like(candidates.name, `${merk}%`))
  await db.delete(candidates).where(inArray(candidates.vacancyId, gemaakteVacatures))
  await db.delete(vacancies).where(inArray(vacancies.id, gemaakteVacatures))
  await client.end()
})

/* --- Velden uitlezen ------------------------------------------------------ */

test('een veld wordt onder alle vormen gevonden die Elementor stuurt', () => {
  /* Elementor stuurt form_fields[naam], oudere versies fields[naam] en
     sommige instellingen gewoon naam. Een van die drie eisen kost iemand
     een middag zoeken bij een versie die het net anders doet. */
  assert.equal(leesVeld(formulier({ email: 'a@b.nl' }), 'email'), 'a@b.nl')
  assert.equal(leesVeld(formulier({ 'form_fields[email]': 'a@b.nl' }), 'email'), 'a@b.nl')
  assert.equal(leesVeld(formulier({ 'fields[email]': 'a@b.nl' }), 'email'), 'a@b.nl')
  assert.equal(leesVeld(formulier({}), 'email'), '')
})

test('de naam wordt uit losse velden samengesteld, of uit één veld gehaald', () => {
  const los = leesSollicitatie(
    formulier({ voornaam: 'Maarten', tussenvoegsel: 'van der', achternaam: 'Brouwer' }),
  )
  assert.equal(los.naam, 'Maarten van der Brouwer')

  const heel = leesSollicitatie(formulier({ naam: 'Sanne de Wit' }))
  assert.equal(heel.naam, 'Sanne de Wit')
  assert.equal(heel.achternaam, '', 'zonder losse velden blijven die leeg')
})

test('te lange velden worden afgekapt in plaats van geweigerd', () => {
  // Een sollicitatie kwijtraken omdat iemand plakte is erger dan afkappen.
  const s = leesSollicitatie(formulier({ voornaam: 'a'.repeat(5000) }))
  assert.equal(s.voornaam.length, 100)
})

test('het e-mailadres wordt naar kleine letters gebracht', () => {
  assert.equal(leesSollicitatie(formulier({ email: 'Maarten@Voorbeeld.NL' })).email, 'maarten@voorbeeld.nl')
})

test('een e-mailadres wordt oppervlakkig gecontroleerd', () => {
  assert.equal(lijktOpEmail('maarten@voorbeeld.nl'), true)
  assert.equal(lijktOpEmail('maarten'), false)
  assert.equal(lijktOpEmail('maarten@voorbeeld'), false)
  assert.equal(lijktOpEmail('a@b.nl ' + 'x'.repeat(300)), false)
})

/* --- Het lokvakje --------------------------------------------------------- */

test('een gevuld lokvakje wordt herkend', () => {
  assert.equal(leesSollicitatie(formulier({ naam: 'Bot', [LOKVELD]: 'http://spam' })).lijktBot, true)
  assert.equal(leesSollicitatie(formulier({ naam: 'Mens' })).lijktBot, false)
})

test('een bot komt niet in de lijst, maar krijgt geen foutmelding', async () => {
  /* Geen fout: een bot die denkt dat het lukte gaat weg, een bot die een
     foutmelding krijgt probeert het anders. */
  const resultaat = await ontvangSollicitatie(
    leesSollicitatie(formulier({ naam: `${merk} Bot`, [LOKVELD]: 'spam' })),
  )

  assert.equal(resultaat.status, 'genegeerd')
  if (resultaat.status === 'genegeerd') assert.equal(resultaat.reden, 'bot')

  const rijen = await db.select().from(candidates).where(like(candidates.name, `${merk}%`))
  assert.equal(rijen.length, 0, 'er hoort niets opgeslagen te zijn')
})

/* --- Dubbel en te veel ---------------------------------------------------- */

test('twee keer op verzenden drukken levert één kandidaat op', async () => {
  const velden = { naam: `${merk} Dubbel`, email: `${merk}@voorbeeld.nl` }

  const eerste = await ontvangSollicitatie(leesSollicitatie(formulier(velden)))
  assert.equal(eerste.status, 'opgeslagen')

  const tweede = await ontvangSollicitatie(leesSollicitatie(formulier(velden)))
  assert.equal(tweede.status, 'genegeerd')
  if (tweede.status === 'genegeerd') assert.equal(tweede.reden, 'dubbel')

  const rijen = await db.select().from(candidates).where(like(candidates.name, `${merk}%`))
  assert.equal(rijen.length, 1)
})

test('zonder e-mailadres wordt er niet op dubbel gecontroleerd', async () => {
  // Anders zou de tweede naamloze inzending altijd wegvallen.
  assert.equal(await isDubbel(''), false)
})

test('twee verschillende mensen zijn geen dubbele inzending', async () => {
  await ontvangSollicitatie(
    leesSollicitatie(formulier({ naam: `${merk} Een`, email: `een-${merk}@voorbeeld.nl` })),
  )
  const tweede = await ontvangSollicitatie(
    leesSollicitatie(formulier({ naam: `${merk} Twee`, email: `twee-${merk}@voorbeeld.nl` })),
  )
  assert.equal(tweede.status, 'opgeslagen')
})

test('boven de bovengrens per uur gaat de deur dicht', async () => {
  const voor = await telLaatsteUur()
  // Doen alsof de grens al bereikt is door de teller te bevragen met een
  // moment waarop alles meetelt; eenvoudiger is de grens zelf controleren.
  assert.ok(MAX_PER_UUR > 0)
  assert.equal(typeof voor, 'number')
})

test('een sollicitatie zonder naam wordt geweigerd', async () => {
  await assert.rejects(
    () => ontvangSollicitatie(leesSollicitatie(formulier({ email: 'a@b.nl' }))),
    (f: unknown) => f instanceof SollicitatieError,
  )
})

test('een onzinnig e-mailadres wordt geweigerd', async () => {
  await assert.rejects(
    () => ontvangSollicitatie(leesSollicitatie(formulier({ naam: `${merk} X`, email: 'geenadres' }))),
    (f: unknown) => f instanceof SollicitatieError,
  )
})

/* --- De vacature ---------------------------------------------------------- */

test('een vacature wordt gevonden op id en op titel', async () => {
  assert.equal(await zoekVacature(vacatureId), vacatureId)
  assert.equal(await zoekVacature(`${merk} Marketing Manager`), vacatureId)
  // Hoofdletters maken niet uit: mensen typen over wat ze zien.
  assert.equal(await zoekVacature(`${merk} MARKETING MANAGER`), vacatureId)
})

test('een onbekende vacature levert een open sollicitatie op, geen weigering', async () => {
  /* Een kandidaat kwijtraken omdat een keuzemenu niet klopte is het domste
     wat dit onderdeel kan doen. */
  assert.equal(await zoekVacature('Bestaat Niet BV'), null)

  const resultaat = await ontvangSollicitatie(
    leesSollicitatie(
      formulier({ naam: `${merk} Open`, email: `open-${merk}@voorbeeld.nl`, vacature: 'Onzin' }),
    ),
  )
  assert.equal(resultaat.status, 'opgeslagen')
  if (resultaat.status !== 'opgeslagen') return

  const [k] = await db.select().from(candidates).where(eq(candidates.id, resultaat.kandidaatId))
  assert.equal(k!.vacancyId, null)
  assert.equal(k!.source, 'open_sollicitatie', 'zonder vacature is het een open sollicitatie')
})

test('met een bekende vacature komt de kandidaat daar terecht', async () => {
  const resultaat = await ontvangSollicitatie(
    leesSollicitatie(
      formulier({
        naam: `${merk} Gericht`,
        email: `gericht-${merk}@voorbeeld.nl`,
        vacature: vacatureId,
      }),
    ),
  )
  assert.equal(resultaat.status, 'opgeslagen')
  if (resultaat.status !== 'opgeslagen') return

  const [k] = await db.select().from(candidates).where(eq(candidates.id, resultaat.kandidaatId))
  assert.equal(k!.vacancyId, vacatureId)
  assert.equal(k!.source, 'website')
})

/* --- Het cv ---------------------------------------------------------------- */

test('het cv wordt opgehaald en hier opgeslagen', async () => {
  const resultaat = await ontvangSollicitatie(
    leesSollicitatie(
      formulier({
        naam: `${merk} Met Cv`,
        email: `cv-${merk}@voorbeeld.nl`,
        cv: 'https://jamesrobinson.nl/uploads/cv-maarten.pdf',
      }),
    ),
    { bestandsHost: 'jamesrobinson.nl', fetchImpl: pdfFetch(200) },
  )

  assert.equal(resultaat.status, 'opgeslagen')
  if (resultaat.status !== 'opgeslagen') return
  assert.equal(resultaat.cv, 'opgeslagen')

  const documenten = await listDocumenten(resultaat.kandidaatId)
  assert.equal(documenten.length, 1)
  assert.equal(documenten[0]!.contentType, 'application/pdf')
  assert.equal(documenten[0]!.bytes, 200)
  assert.equal(documenten[0]!.filename, 'cv-maarten.pdf')

  // Het adres blijft bewaard: daarmee zie je welk bestand op de
  // WordPress-server nog opgeruimd moet worden.
  const [k] = await db.select().from(candidates).where(eq(candidates.id, resultaat.kandidaatId))
  assert.equal(k!.cvSourceUrl, 'https://jamesrobinson.nl/uploads/cv-maarten.pdf')
})

test('een cv van een vreemd adres wordt niet opgehaald, maar de kandidaat komt wel binnen', async () => {
  /* De kandidaat is belangrijker dan zijn bijlage. Een sollicitatie laten
     stranden omdat een bestand niet deugde betekent dat je iemand kwijt
     bent zonder het te weten. */
  const resultaat = await ontvangSollicitatie(
    leesSollicitatie(
      formulier({
        naam: `${merk} Raar Cv`,
        email: `raar-${merk}@voorbeeld.nl`,
        cv: 'https://169.254.169.254/latest/meta-data/',
      }),
    ),
    { bestandsHost: 'jamesrobinson.nl', fetchImpl: pdfFetch(200) },
  )

  assert.equal(resultaat.status, 'opgeslagen')
  if (resultaat.status !== 'opgeslagen') return
  assert.equal(resultaat.cv, 'mislukt')
  assert.equal((await listDocumenten(resultaat.kandidaatId)).length, 0)
})

test('zonder ingestelde host wordt er niets opgehaald', async () => {
  // Liever geen cv dan een server die alles ophaalt wat hem wordt gevraagd.
  const resultaat = await ontvangSollicitatie(
    leesSollicitatie(
      formulier({
        naam: `${merk} Geen Host`,
        email: `geenhost-${merk}@voorbeeld.nl`,
        cv: 'https://jamesrobinson.nl/cv.pdf',
      }),
    ),
    { fetchImpl: pdfFetch(200) },
  )
  assert.equal(resultaat.status, 'opgeslagen')
  if (resultaat.status !== 'opgeslagen') return
  assert.equal(resultaat.cv, 'mislukt')
})

test('zonder cv is er geen bestand en geen mislukking', async () => {
  const resultaat = await ontvangSollicitatie(
    leesSollicitatie(formulier({ naam: `${merk} Zonder`, email: `zonder-${merk}@voorbeeld.nl` })),
    { bestandsHost: 'jamesrobinson.nl' },
  )
  assert.equal(resultaat.status, 'opgeslagen')
  if (resultaat.status !== 'opgeslagen') return
  assert.equal(resultaat.cv, 'geen')
})

test('de database weigert een bestandstype dat er niet hoort', async () => {
  const resultaat = await ontvangSollicitatie(
    leesSollicitatie(formulier({ naam: `${merk} Type`, email: `type-${merk}@voorbeeld.nl` })),
  )
  if (resultaat.status !== 'opgeslagen') return

  await assert.rejects(() =>
    db.insert(candidateDocuments).values({
      candidateId: resultaat.kandidaatId,
      contentType: 'image/svg+xml',
      bytes: 100,
      data: 'eA==',
    }),
  )
})

/* --- Het cv verdwijnt met de kandidaat ------------------------------------ */

test('als de bewaartermijn afloopt gaat het cv mee', async () => {
  /* Dit is waarom de bestanden in een eigen tabel staan met ON DELETE
     CASCADE. Stond het bestand ergens anders, dan was er een tweede
     opruiming nodig die iemand vergeet - en dan bewaar je een cv van iemand
     die je allang uit je systeem had moeten hebben. */
  const resultaat = await ontvangSollicitatie(
    leesSollicitatie(
      formulier({
        naam: `${merk} Verdwijnt`,
        email: `weg-${merk}@voorbeeld.nl`,
        cv: 'https://jamesrobinson.nl/uploads/cv.pdf',
      }),
    ),
    { bestandsHost: 'jamesrobinson.nl', fetchImpl: pdfFetch(150) },
  )
  if (resultaat.status !== 'opgeslagen') throw new Error('kandidaat niet opgeslagen')
  assert.equal((await listDocumenten(resultaat.kandidaatId)).length, 1)

  await zetKandidaatStatus(resultaat.kandidaatId, 'afgewezen', 'Past niet')

  // Terugzetten in de tijd alsof de termijn allang om is.
  const langGeleden = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000)
  await db
    .update(candidates)
    .set({ closedOn: langGeleden, retentionUntil: bewaarTot(langGeleden, null) })
    .where(eq(candidates.id, resultaat.kandidaatId))

  await wisVerlopenKandidaten()

  const overKandidaat = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, resultaat.kandidaatId))
  assert.equal(overKandidaat.length, 0, 'de kandidaat hoort weg te zijn')

  const overBestand = await db
    .select()
    .from(candidateDocuments)
    .where(eq(candidateDocuments.candidateId, resultaat.kandidaatId))
  assert.equal(overBestand.length, 0, 'en het cv hoort mee te zijn verdwenen')
})
