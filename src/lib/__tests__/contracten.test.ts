/**
 * Tests voor de contractgenerator.
 *
 * Wat hier vastligt is niet de opmaak maar de inhoud: welke artikelen er wel
 * en niet in komen, en of de bedragen en datums kloppen. Een fout in een
 * sjabloon herhaalt zich bij elke aanname, en een contract lees je pas echt
 * na als er ruzie is.
 *
 * De zwaarste test is de laatste: het contract van Voncken opnieuw opstellen
 * en vergelijken met het origineel.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { wisKandidaten } from '../werving'
import {
  jobProfiles,
  users,
  candidates,
  generatedContracts,
  employmentContracts,
  salaryRecords,
} from '../../db/schema'
import {
  vulIn,
  urenTekst,
  voornaamUit,
  stelContractOp,
  getSjabloon,
  getWerkgever,
  listFunctieprofielen,
  bewaarContract,
  maakDefinitief,
  markeerAangezegd,
  komendeAanzeggingen,
  ketenVoor,
  namenZin,
  ondertekenaarsVan,
  listMogelijkeOndertekenaars,
  ContractError,
  contractWerkgever,
  pasVoorwaardenToe,
  korteNaam,
  invoerUit,
  waaromNietWijzigen,
  wijzigContract,
  type ContractInvoer,
  type ContractWerkgever,
} from '../contracten'
import { getBedrijf, type Bedrijf } from '../bedrijf'
import type { ContractTemplate, ContractTemplateArticle, EmployerSettings, JobProfile } from '../../db/schema'

const merk = `ct${Date.now()}`
const gemaakteUsers: string[] = []
const gemaakteKandidaten: string[] = []
const gemaakteProfielen: string[] = []

let sjabloon: { template: ContractTemplate; artikelen: ContractTemplateArticle[] }
let werkgever: EmployerSettings
let context: ContractWerkgever
let bedrijf: Bedrijf
let managerProfiel: JobProfile

const dag = (j: number, m: number, d: number) => new Date(j, m - 1, d, 12, 0, 0)

/** De invoer van het echte contract van Voncken. */
function voncken(overschrijf: Partial<ContractInvoer> = {}): ContractInvoer {
  return {
    candidateId: gemaakteKandidaten[0],
    naam: 'Dhr. Daniël Matthijs Voncken',
    aanhef: 'heer',
    adres: 'Sint Hubertusstraat 9',
    postcode: '6181 EZ',
    woonplaats: 'Elsloo',
    geboortedatum: dag(1996, 5, 1),
    jobProfileId: managerProfiel.id,
    functie: 'Marketing Manager',
    soort: 'bepaalde_tijd',
    ingangsdatum: dag(2026, 10, 13),
    looptijdMaanden: 7,
    proeftijdMaanden: 1,
    urenPerWeekKwartier: 2400,
    schaalNaam: 'Medior',
    trede: 12,
    brutoMaandCents: 209_559,
    opToeslagCents: 20_956,
    vakantietoeslagBp: 800,
    vakantieUrenFulltime: 200,
    vakantieUren: 120,
    ...overschrijf,
  }
}

before(async () => {
  const gevonden = await getSjabloon('bepaalde_tijd')
  assert.ok(gevonden, 'de migratie hoort een sjabloon voor bepaalde tijd neer te zetten')
  sjabloon = gevonden

  const w = await getWerkgever()
  assert.ok(w, 'de migratie hoort de werkgevergegevens neer te zetten')
  werkgever = w
  const b = await getBedrijf()
  assert.ok(b?.hoofdvestiging, 'de migratie hoort een hoofdvestiging neer te zetten')
  bedrijf = b
  context = contractWerkgever(b, null, 'https://portaal.test/personeelshandboek/abc')

  const profielen = await listFunctieprofielen()
  const manager = profielen.find((p) => p.title === 'Marketing Manager')
  assert.ok(manager, 'de migratie hoort een profiel voor Marketing Manager neer te zetten')
  managerProfiel = manager

  const [k] = await db.insert(candidates).values({ name: `${merk} Kandidaat` }).returning()
  gemaakteKandidaten.push(k!.id)
})

after(async () => {
  await wisKandidaten(gemaakteKandidaten)
  if (gemaakteUsers.length > 0) {
    await db.delete(users).where(inArray(users.id, gemaakteUsers))
  }
  if (gemaakteProfielen.length > 0) {
    await db.delete(jobProfiles).where(inArray(jobProfiles.id, gemaakteProfielen))
  }
  await client.end()
})

/* --- Invullen ------------------------------------------------------------- */

test('een ontbrekende plaatshouder valt op in plaats van weg', () => {
  /* In een juridisch document is een lege plek erger dan een lelijke: een
     lege plek lees je over, [ONBEKEND: salaris] niet. */
  const r = vulIn('Het salaris is {{salaris}} bij {{uren}} uur.', { salaris: '€ 2.000' })
  assert.match(r.tekst, /\[ONBEKEND: uren\]/)
  assert.deepEqual(r.ontbrekend, ['uren'])
})

test('een lege waarde is iets anders dan een ontbrekende', () => {
  const r = vulIn('Adres: {{adres}}.', { adres: '' })
  assert.equal(r.tekst, 'Adres: .')
  assert.deepEqual(r.ontbrekend, [])
})

test('uren worden netjes geschreven', () => {
  assert.equal(urenTekst(3200), '32')
  assert.equal(urenTekst(2400), '24')
  assert.equal(urenTekst(2450), '24,5')
})

test('de aanhef telt niet mee als voornaam', () => {
  /* Mensen typen de naam vaak met een aanhef ervoor. Zonder die eruit te
     halen begint de brief met "Beste Dhr.", en dat is precies het soort
     slordigheid waar dit onderdeel voor bestaat. */
  assert.equal(voornaamUit('Dhr. Daniël Matthijs Voncken'), 'Daniël')
  assert.equal(voornaamUit('Mevr. Sanne de Wit'), 'Sanne')
  assert.equal(voornaamUit('De heer J. Coumans'), 'J.')
  assert.equal(voornaamUit('Drs. Maarten Brouwer'), 'Maarten')
  // Zonder aanhef gewoon het eerste woord.
  assert.equal(voornaamUit('Sanne de Wit'), 'Sanne')
  assert.equal(voornaamUit('Sanne'), 'Sanne')
})

/* --- Welke artikelen erin komen ------------------------------------------- */

test('de artikelen worden genummerd bij het uitschrijven, niet in de tekst', () => {
  /* Valt een artikel weg omdat de voorwaarde niet geldt, dan schuift de rest
     op. Stond de nummering in de tekst, dan klopte hij niet meer. */
  const concept = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  const nummers = concept.artikelen.map((a) => a.nummer)
  assert.deepEqual(nummers, Array.from({ length: nummers.length }, (_, i) => i + 1))
})

test('zonder proeftijd valt het proeftijdartikel weg', () => {
  const met = stelContractOp(voncken({ proeftijdMaanden: 1 }), sjabloon, context, managerProfiel)
  const zonder = stelContractOp(
    voncken({ proeftijdMaanden: 0 }),
    sjabloon,
    context,
    managerProfiel,
  )

  assert.ok(met.artikelen.some((a) => a.titel === 'Proeftijd'))
  assert.ok(!zonder.artikelen.some((a) => a.titel === 'Proeftijd'))
  assert.equal(zonder.artikelen.length, met.artikelen.length - 1)
})

test('bij zes maanden verdwijnt de proeftijd uit het contract, ook als je hem invult', () => {
  /* Dit is de belangrijkste regel van de hele generator. Een proeftijd bij
     een contract van zes maanden of korter is nietig; hem laten staan
     betekent dat je denkt er een te hebben terwijl je er geen hebt. */
  const concept = stelContractOp(
    voncken({ looptijdMaanden: 6, proeftijdMaanden: 1 }),
    sjabloon,
    context,
    managerProfiel,
  )

  assert.equal(concept.proeftijdMaanden, 0)
  assert.ok(!concept.artikelen.some((a) => a.titel === 'Proeftijd'))
  assert.ok(concept.opmerkingen.some((o) => /niet toegestaan/.test(o)))
})

test('zonder relatiebeding bij de functie komt dat artikel er niet in', () => {
  /* De motivering onder het relatiebeding is geschreven voor een marketing
     manager met een eigen portefeuille. Bij een functie zonder die
     motivering is het beding nietig, dus het hoort er niet te staan. */
  const zonderBeding: JobProfile = {
    ...managerProfiel,
    hasRelationClause: false,
    relationClauseMotivation: null,
  }
  const concept = stelContractOp(voncken(), sjabloon, context, zonderBeding)

  assert.ok(!concept.artikelen.some((a) => a.titel === 'Relatiebeding'))
  // Het verbod op nevenwerkzaamheden blijft wel staan: dat is iets anders.
  assert.ok(concept.artikelen.some((a) => a.titel === 'Nevenwerkzaamheden'))
  assert.ok(concept.opmerkingen.some((o) => /geen relatiebeding/.test(o)))
})

test('per contract: relatiebeding uit te zetten, aanzetten alleen met motivering, eigen extra afspraken', () => {
  // Uitzetten mag altijd, ook als het functieprofiel het wel heeft.
  const uit = stelContractOp(voncken({ relatiebeding: false }), sjabloon, context, managerProfiel)
  assert.ok(!uit.artikelen.some((a) => a.titel === 'Relatiebeding'))

  // Aanzetten zonder motivering is een beding dat niet geldt: weigeren in plaats van het erin zetten.
  assert.throws(() => stelContractOp(voncken({ relatiebeding: true }), sjabloon, context, null), /moet gemotiveerd zijn/)

  // Eigen extra afspraken gaan voor die van het profiel.
  const metAfspraak = stelContractOp(voncken({ extraAfspraken: 'Twee dagen per week thuiswerken.' }), sjabloon, context, managerProfiel)
  const tekst = metAfspraak.artikelen.map((a) => a.leden.join(' ')).join(' ')
  if (sjabloon.artikelen.some((a) => a.voorwaarde === 'extra_afspraken')) {
    assert.ok(tekst.includes('Twee dagen per week thuiswerken.'))
  }
})

test('de motivering van het relatiebeding komt uit het functieprofiel', () => {
  const eigen: JobProfile = {
    ...managerProfiel,
    hasRelationClause: true,
    relationClauseMotivation: 'Deze functie beheert de klantendatabase.',
    relationClauseMonths: 6,
  }
  const concept = stelContractOp(voncken(), sjabloon, context, eigen)
  const artikel = concept.artikelen.find((a) => a.titel === 'Relatiebeding')

  assert.ok(artikel)
  assert.ok(artikel.leden.join(' ').includes('Deze functie beheert de klantendatabase.'))
  assert.ok(artikel.leden.join(' ').includes('6 maanden'))
})

test('extra afspraken bij een functie komen er als eigen artikel in', () => {
  const metExtra: JobProfile = {
    ...managerProfiel,
    extraClauses: 'De werknemer krijgt een leaseauto uit de middenklasse.',
  }
  const concept = stelContractOp(voncken(), sjabloon, context, metExtra)
  const artikel = concept.artikelen.find((a) => a.titel === 'Aanvullende afspraken bij deze functie')

  assert.ok(artikel)
  assert.ok(artikel.leden.join(' ').includes('leaseauto'))

  // En zonder extra afspraken staat dat artikel er niet.
  const zonder = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  assert.ok(!zonder.artikelen.some((a) => a.titel === 'Aanvullende afspraken bij deze functie'))
})

test('zonder OP-toeslag valt het pensioenartikel weg', () => {
  const zonder = stelContractOp(
    voncken({ opToeslagCents: 0 }),
    sjabloon,
    context,
    managerProfiel,
  )
  assert.ok(!zonder.artikelen.some((a) => a.titel === 'Pensioen'))
})

test('het vrijetijdsbudget is een keuze en geen vaste tekst', () => {
  const met = stelContractOp(voncken({ vrijetijdsbudget: true }), sjabloon, context, managerProfiel)
  const zonder = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  assert.ok(met.artikelen.some((a) => a.titel === 'Overige afspraken'))
  assert.ok(!zonder.artikelen.some((a) => a.titel === 'Overige afspraken'))
})

/* --- Het contract van Voncken, nagerekend -------------------------------- */

test('het contract van Voncken komt er weer uit zoals het erin ging', () => {
  const concept = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  const tekst = concept.body

  // De einddatum uit het origineel.
  assert.ok(tekst.includes('12 mei 2027'), 'einddatum van rechtswege')
  assert.ok(tekst.includes('13 oktober 2026'), 'ingangsdatum')
  assert.ok(tekst.includes('zeven maanden'), 'looptijd in woorden')
  assert.ok(tekst.includes('één maand'), 'proeftijd in woorden')
  assert.ok(tekst.includes('Marketing Manager'), 'functie')
  assert.ok(tekst.includes('24 uur per week'), 'arbeidsduur')
  assert.ok(tekst.includes('schaal Medior, trede 12'), 'schaal en trede')
  assert.ok(tekst.includes('120 uur vakantie'), 'vakantie-uren naar rato')
  assert.ok(tekst.includes('25 dagen'), 'vakantiedagen fulltime')
  assert.ok(tekst.includes('8% vakantietoeslag'), 'vakantietoeslag')

  // Het nieuwe kantoor, niet het oude.
  assert.ok(tekst.includes('Aalbekerweg 4'), 'de werkplek')
  assert.ok(!tekst.includes('Klimmenerweg'), 'de statutaire vestiging hoort niet in artikel 4')
})

test('er staat geen "haar" of "zij" meer in een contract voor een man', () => {
  /* In het bestaande contract stond "onder haar verantwoordelijkheid" en
     "Zij is" bij Dhr. Voncken - een restje uit een eerder contract. In het
     sjabloon staat nu "de werknemer" en "diens", dus dat kan niet meer. */
  const concept = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  const beding = concept.artikelen.find((a) => a.titel === 'Relatiebeding')!.leden.join(' ')

  assert.ok(!/\bhaar\b/.test(beding), 'geen "haar" in de motivering')
  assert.ok(!/\bZij\b/.test(beding), 'geen "Zij" in de motivering')
  assert.ok(beding.includes('de werknemer'))
})

test('er blijft geen enkele plaatshouder open staan', () => {
  const concept = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  assert.deepEqual(concept.ontbrekend, [], 'elke plaatshouder hoort een waarde te hebben')
  assert.ok(!concept.body.includes('ONBEKEND'))
  assert.ok(!concept.intro.includes('ONBEKEND'))
  assert.ok(!/\{\{/.test(concept.body), 'er hoort geen {{ meer in de tekst te staan')
})

test('de begeleidende tekst vat de hoofdpunten samen', () => {
  const concept = stelContractOp(voncken(), sjabloon, context, managerProfiel)

  assert.ok(concept.intro.includes('Daniël'), 'aangesproken met de voornaam')
  assert.ok(concept.intro.includes('Marketing Manager'))
  assert.ok(concept.intro.includes('13 oktober 2026'))
  assert.ok(concept.intro.includes('12 mei 2027'))
  assert.ok(concept.intro.includes('24 uur'))
  assert.ok(/proeftijd van één maand/.test(concept.intro))
  assert.ok(/relatiebeding/.test(concept.intro))
  assert.ok(/OP-toeslag/.test(concept.intro))
})

test('de samenvatting zegt het ook als er geen proeftijd is', () => {
  // Stilzwijgen over wat er niet in staat is net zo verwarrend.
  const concept = stelContractOp(
    voncken({ looptijdMaanden: 6, proeftijdMaanden: 1 }),
    sjabloon,
    context,
    managerProfiel,
  )
  assert.ok(concept.intro.includes('geen proeftijd'))
})

/* --- De aanzegtermijn ----------------------------------------------------- */

test('bij zeven maanden komt er een aanzegdatum met een waarschuwing', () => {
  const concept = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  assert.ok(concept.aanzeggenVoor)
  assert.ok(concept.opmerkingen.some((o) => /maandsalaris verschuldigd/.test(o)))
})

test('bij vijf maanden hoeft er niet aangezegd te worden', () => {
  const concept = stelContractOp(
    voncken({ looptijdMaanden: 5, proeftijdMaanden: 0 }),
    sjabloon,
    context,
    managerProfiel,
  )
  assert.equal(concept.aanzeggenVoor, null)
})

/* --- Weigeren wat niet kan ------------------------------------------------ */

test('bepaalde tijd zonder looptijd wordt geweigerd', () => {
  assert.throws(
    () =>
      stelContractOp(
        voncken({ looptijdMaanden: null }),
        sjabloon,
        context,
        managerProfiel,
      ),
    (f: unknown) => f instanceof ContractError,
  )
})

test('een contract zonder kandidaat en zonder collega wordt geweigerd', async () => {
  const concept = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  await assert.rejects(
    () =>
      bewaarContract(
        voncken({ candidateId: null, userId: null }),
        concept,
        sjabloon,
        'proforma',
        null,
      ),
    (f: unknown) => f instanceof ContractError,
  )
})

test('de database weigert een proeftijd bij een kort contract', async () => {
  // Ook rechtstreeks, buiten de generator om.
  await assert.rejects(() =>
    db.insert(generatedContracts).values({
      candidateId: gemaakteKandidaten[0]!,
      employeeName: 'Kort Testman',
      jobTitle: 'Tester',
      contractType: 'bepaalde_tijd',
      startedOn: dag(2026, 1, 1),
      endsOn: dag(2026, 6, 30),
      durationMonths: 6,
      probationMonths: 1,
      hoursWeekQuarters: 3200,
      grossMonthlyCents: 300_000,
      body: 'x',
    }),
  )
})

test('de database weigert een functieprofiel met een beding zonder motivering', async () => {
  await assert.rejects(() =>
    db.insert(jobProfiles).values({
      title: `${merk} Zonder Motivering`,
      hasRelationClause: true,
      relationClauseMotivation: null,
    }),
  )
})

/* --- Opslaan en definitief maken ------------------------------------------ */

test('een proforma wordt bewaard met zijn eigen tekst', async () => {
  const concept = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  const bewaard = await bewaarContract(voncken(), concept, sjabloon, 'proforma', null)

  assert.equal(bewaard.soort, 'proforma')
  assert.equal(bewaard.body, concept.body)
  assert.equal(bewaard.probationMonths, 1)
  assert.equal(bewaard.grossMonthlyCents, 209_559)
  assert.ok(bewaard.aanzeggenVoor)
})

test('de waarschuwingen worden bij het contract bewaard', async () => {
  /* Ze stonden alleen tijdens het opstellen in beeld en waren daarna weg,
     terwijl je ze juist een maand later nodig hebt: dat de proeftijd is
     teruggebracht, en wanneer er uiterlijk aangezegd moet zijn. */
  const invoer = voncken({ looptijdMaanden: 7, proeftijdMaanden: 2 })
  const concept = stelContractOp(invoer, sjabloon, context, managerProfiel)
  assert.ok(concept.opmerkingen.length >= 2)

  const bewaard = await bewaarContract(invoer, concept, sjabloon, 'proforma', null)
  assert.ok(bewaard.remarks)
  assert.ok(bewaard.remarks.includes('hoogstens 1 maand'), 'de proeftijd is teruggebracht')
  assert.ok(bewaard.remarks.includes('maandsalaris verschuldigd'), 'de aanzegwaarschuwing')
})

test('definitief maken schrijft het contract en het salaris in het dossier', async () => {
  /* Dit is waarom de generator hier staat en niet in Word: geen enkel veld
     wordt opnieuw ingetypt, en de contracthistorie klopt vanaf dag een. */
  const [collega] = await db
    .insert(users)
    .values({ email: `${merk}-def@jamesrobinson.nl`, name: 'Nieuwe Collega', role: 'staff' })
    .returning()
  gemaakteUsers.push(collega!.id)

  const concept = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  const bewaard = await bewaarContract(voncken(), concept, sjabloon, 'proforma', null)

  await maakDefinitief(bewaard.id, collega!.id)

  const contracten = await db
    .select()
    .from(employmentContracts)
    .where(eq(employmentContracts.userId, collega!.id))
  assert.equal(contracten.length, 1)
  assert.equal(contracten[0]!.type, 'bepaalde_tijd')
  assert.equal(contracten[0]!.hoursPerWeekQuarters, 2400)
  assert.equal(contracten[0]!.jobTitle, 'Marketing Manager')

  const salarissen = await db
    .select()
    .from(salaryRecords)
    .where(eq(salaryRecords.userId, collega!.id))
  assert.equal(salarissen.length, 1)
  assert.equal(salarissen[0]!.grossMonthlyCents, 209_559)
  assert.equal(salarissen[0]!.basedOnHoursQuarters, 2400)
})

test('een contract kan niet twee keer definitief gemaakt worden', async () => {
  const [collega] = await db
    .insert(users)
    .values({ email: `${merk}-twee@jamesrobinson.nl`, name: 'Twee Keer', role: 'staff' })
    .returning()
  gemaakteUsers.push(collega!.id)

  const concept = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  const bewaard = await bewaarContract(voncken(), concept, sjabloon, 'proforma', null)

  await maakDefinitief(bewaard.id, collega!.id)
  await assert.rejects(
    () => maakDefinitief(bewaard.id, collega!.id),
    (f: unknown) => f instanceof ContractError,
  )
})

/* --- Aanzeggingen bewaken ------------------------------------------------- */

test('een aanzegging die eraan komt verschijnt in de bewaking', async () => {
  const [collega] = await db
    .insert(users)
    .values({ email: `${merk}-aanzeg@jamesrobinson.nl`, name: 'Aanzeg Testman', role: 'staff' })
    .returning()
  gemaakteUsers.push(collega!.id)

  const concept = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  const bewaard = await bewaarContract(voncken(), concept, sjabloon, 'proforma', null)
  await maakDefinitief(bewaard.id, collega!.id)

  // Alsof de aanzegdatum over twee weken ligt.
  const overTweeWeken = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  await db
    .update(generatedContracts)
    .set({ aanzeggenVoor: overTweeWeken })
    .where(eq(generatedContracts.id, bewaard.id))

  const lijst = await komendeAanzeggingen()
  const onze = lijst.find((a) => a.contract.id === bewaard.id)
  assert.ok(onze, 'dit contract hoort in de bewaking te staan')
  assert.equal(onze.naam, 'Aanzeg Testman')
  assert.ok(onze.dagenTeGaan >= 13 && onze.dagenTeGaan <= 14)

  // Na aanzeggen verdwijnt hij eruit.
  await markeerAangezegd(bewaard.id)
  const na = await komendeAanzeggingen()
  assert.ok(!na.some((a) => a.contract.id === bewaard.id))
})

test('een proforma staat niet in de aanzegbewaking', async () => {
  // Een concept is nog geen afspraak.
  const concept = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  const bewaard = await bewaarContract(voncken(), concept, sjabloon, 'proforma', null)
  await db
    .update(generatedContracts)
    .set({ aanzeggenVoor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
    .where(eq(generatedContracts.id, bewaard.id))

  const lijst = await komendeAanzeggingen()
  assert.ok(!lijst.some((a) => a.contract.id === bewaard.id))
})

/* --- De keten ------------------------------------------------------------- */

test('de keten telt de bestaande contracten van deze collega', async () => {
  const [collega] = await db
    .insert(users)
    .values({ email: `${merk}-keten@jamesrobinson.nl`, name: 'Keten Testman', role: 'staff' })
    .returning()
  gemaakteUsers.push(collega!.id)

  await db.insert(employmentContracts).values([
    {
      userId: collega!.id,
      type: 'bepaalde_tijd',
      startedOn: dag(2024, 1, 1),
      endsOn: dag(2024, 7, 1),
    },
    {
      userId: collega!.id,
      type: 'bepaalde_tijd',
      startedOn: dag(2024, 7, 1),
      endsOn: dag(2025, 1, 1),
    },
  ])

  const stand = await ketenVoor(collega!.id, 7)
  assert.equal(stand.nummer, 3)
  assert.match(stand.uitleg!, /laatste tijdelijke contract/)
})

/* --- Wie er tekent -------------------------------------------------------- */

test('de namen van wie tekent lezen als een zin', () => {
  assert.equal(namenZin([]), '')
  assert.equal(namenZin(['Jim Coumans']), 'Jim Coumans')
  assert.equal(namenZin(['Jim Coumans', 'Jim Kikken']), 'Jim Coumans en Jim Kikken')
  assert.equal(namenZin(['Jim Coumans', 'Jim Kikken', 'Stan Doyen']), 'Jim Coumans, Jim Kikken en Stan Doyen')
})

test('de gekozen ondertekenaars komen in het contract, anders die van de werkgever', () => {
  const gekozen = stelContractOp(voncken({ ondertekenaars: ['Jim Kikken'] }), sjabloon, context, managerProfiel)
  const standaard = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  // De begeleidende tekst sluit af met wie er tekent.
  assert.ok(gekozen.intro.trimEnd().endsWith('Jim Kikken'), 'alleen wie gekozen is')
  assert.ok(!gekozen.intro.includes('Jim Coumans en Jim Kikken'))
  assert.ok(standaard.intro.trimEnd().endsWith(werkgever.signatories), 'zonder keuze: de werkgevergegevens')
  assert.deepEqual(ondertekenaarsVan({ employerSigners: 'Jim Coumans\nJim Kikken' }, null), ['Jim Coumans', 'Jim Kikken'])
  assert.deepEqual(ondertekenaarsVan({ employerSigners: null }, { signatories: 'Jim Coumans en Jim Kikken' }), ['Jim Coumans', 'Jim Kikken'])
  assert.deepEqual(ondertekenaarsVan({ employerSigners: null }, { signatories: 'A, B en C' }), ['A', 'B', 'C'])
})

test('in de werkgevergegevens staan voluit de namen, geen "dhr. J."', () => {
  assert.doesNotMatch(werkgever.signatories, /dhr\./i)
})

test('de tekst volgt de pro forma: bankrekening, UWV en de AVG-datum', () => {
  const tekst = stelContractOp(voncken(), sjabloon, context, managerProfiel).body
  assert.ok(!tekst.includes('postrekening'), 'een postrekening bestaat niet meer')
  assert.ok(tekst.includes('website van het UWV'), 'verwijzing naar UWV en Rijksoverheid bij verlof')
  assert.ok(tekst.includes('per 25 mei 2018'), 'de AVG met ingangsdatum')
})

test('een eigenaar staat bovenaan de mogelijke ondertekenaars en is aangevinkt', async () => {
  const [eigenaar] = await db
    .insert(users)
    .values({ email: `${merk}-eigenaar@jamesrobinson.nl`, name: `${merk} Stan Doyen`, role: 'staff', isOwner: true })
    .returning()
  const [collega] = await db
    .insert(users)
    .values({ email: `${merk}-collega@jamesrobinson.nl`, name: `${merk} Collega`, role: 'staff' })
    .returning()
  gemaakteUsers.push(eigenaar!.id, collega!.id)
  const lijst = await listMogelijkeOndertekenaars()
  const e = lijst.find((x) => x.id === eigenaar!.id)
  const c = lijst.find((x) => x.id === collega!.id)
  assert.equal(e?.eigenaar, true)
  assert.equal(c?.eigenaar, false)
  const laatsteEigenaar = lijst.map((x) => x.eigenaar).lastIndexOf(true)
  const eersteGeenEigenaar = lijst.map((x) => x.eigenaar).indexOf(false)
  assert.ok(eersteGeenEigenaar === -1 || laatsteEigenaar < eersteGeenEigenaar, 'eigenaren eerst')
  // Wie bij de werkgever als ondertekenaar staat, staat er altijd bij, ook zonder account.
  for (const naam of ondertekenaarsVan({ employerSigners: null }, werkgever)) {
    assert.ok(lijst.some((x) => x.naam === naam && x.eigenaar), `${naam} staat aangevinkt`)
  }
})

/* --- Maatwerk per contract ------------------------------------------------ */

test('voorwaardelijke stukken blijven alleen staan als de voorwaarde geldt', () => {
  const bron = 'Altijd.{{#als a}} Alleen bij a.{{/als}}{{#alsniet a}} Alleen zonder a.{{/alsniet}}'
  assert.equal(pasVoorwaardenToe(bron, { a: true }).tekst, 'Altijd. Alleen bij a.')
  assert.equal(pasVoorwaardenToe(bron, { a: false }).tekst, 'Altijd. Alleen zonder a.')
  // Een onbekende voorwaarde valt op in plaats van stil weg te vallen.
  assert.deepEqual(pasVoorwaardenToe('{{#als b}}x{{/als}}', {}).onbekend, ['b'])
})

test('er staat nergens meer een bedrijfsreglement in, wel het personeelshandboek', () => {
  const tekst = stelContractOp(voncken(), sjabloon, context, managerProfiel).body
  assert.doesNotMatch(tekst, /bedrijfsreglement/i)
  assert.match(tekst, /Personeelshandboek van de werkgever is van toepassing/)
  assert.doesNotMatch(tekst, /\{\{|\}\}/, 'geen losse accolades van een voorwaarde')
})

test('het salaris noemt schaal en trede op de peildatum, buiten de schaal niet', () => {
  const met = stelContractOp(voncken(), sjabloon, context, managerProfiel).body
  assert.match(met, /gebaseerd op schaal Medior, trede 12 van het salarishuis van de werkgever, zoals dat gold op 13 oktober 2026/)
  const zonder = stelContractOp(voncken({ schaalNaam: null, trede: null }), sjabloon, context, managerProfiel).body
  assert.doesNotMatch(zonder, /salarishuis/)
})

test('bereikbaar op werkdagen komt als extra lid bij de arbeidstijd, alleen als het aan staat', () => {
  const arbeidstijd = (c: ReturnType<typeof stelContractOp>) => c.artikelen.find((a) => a.titel === 'Arbeidstijd')!
  const zonder = arbeidstijd(stelContractOp(voncken(), sjabloon, context, managerProfiel))
  const met = arbeidstijd(stelContractOp(voncken({ bereikbaarOpWerkdagen: true }), sjabloon, context, managerProfiel))
  assert.equal(met.leden.length, zonder.leden.length + 1)
  const lid = met.leden.at(-1)!
  assert.match(lid, /24 uur per week/)
  assert.match(lid, /maandag tot en met vrijdag/)
  assert.match(lid, /telt mee als arbeidstijd/, 'bereikbaarheid mag geen onbetaalde extra uren worden')
})

test('kantoortijden van de standplaats komen in het lid over bereikbaarheid', () => {
  const hoofd = { ...bedrijf.hoofdvestiging!, officeHours: '09.00 tot 17.30 uur' }
  const metTijden = contractWerkgever({ ...bedrijf, hoofdvestiging: hoofd, vestigingen: [hoofd] }, null, null)
  const lid = stelContractOp(voncken({ bereikbaarOpWerkdagen: true }), sjabloon, metTijden, managerProfiel).artikelen.find((a) => a.titel === 'Arbeidstijd')!.leden.at(-1)!
  assert.match(lid, /kantoortijden \(09\.00 tot 17\.30 uur\)/)
})

test('nevenwerkzaamheden: standaard met toestemming, of vrij behalve voor klanten', () => {
  const artikel = (c: ReturnType<typeof stelContractOp>) => c.artikelen.find((a) => a.titel === 'Nevenwerkzaamheden')!.leden.join(' ')
  const standaard = artikel(stelContractOp(voncken(), sjabloon, context, managerProfiel))
  assert.match(standaard, /behoudens voorafgaande schriftelijke toestemming/)
  assert.doesNotMatch(standaard, /Het staat de werknemer vrij/)
  const vrij = artikel(stelContractOp(voncken({ nevenwerk: 'vrij_behalve_klanten' }), sjabloon, context, managerProfiel))
  assert.match(vrij, /Het staat de werknemer vrij/)
  assert.match(vrij, /zustermaatschappijen/)
  assert.doesNotMatch(vrij, /behoudens voorafgaande schriftelijke toestemming/)
})

test('de link naar het personeelshandboek staat in de begeleidende tekst; zonder handboek een waarschuwing', () => {
  const met = stelContractOp(voncken(), sjabloon, context, managerProfiel)
  assert.match(met.intro, /https:\/\/portaal\.test\/personeelshandboek\/abc/)
  assert.ok(!met.opmerkingen.some((o) => /personeelshandboek/.test(o)))
  const zonder = stelContractOp(voncken(), sjabloon, contractWerkgever(bedrijf, null, null), managerProfiel)
  assert.ok(zonder.opmerkingen.some((o) => /nog geen personeelshandboek/.test(o)))
})

test('de standplaats komt uit de gekozen vestiging, de kop blijft de hoofdvestiging', () => {
  const tweede = { ...bedrijf.hoofdvestiging!, id: '00000000-0000-0000-0000-000000000042', name: 'Maastricht', addressLine: 'Markt 1', postalCode: '6211 CK', city: 'Maastricht', isMain: false }
  const ctx = contractWerkgever({ ...bedrijf, vestigingen: [...bedrijf.vestigingen, tweede] }, tweede.id, null)
  const tekst = stelContractOp(voncken(), sjabloon, ctx, managerProfiel).body
  assert.match(tekst, /Markt 1, 6211 CK Maastricht/)
  assert.equal(ctx.hoofdvestiging?.isMain, true)
})

test('de korte naam is roepnaam met achternaam', () => {
  assert.equal(korteNaam('Daan', null, 'Voncken'), 'Daan Voncken')
  assert.equal(korteNaam('Anne', 'van der', 'Berg'), 'Anne van der Berg')
})

test('een opgesteld contract is te wijzigen tot het getekend is', async () => {
  const invoer = voncken({ roepnaam: 'Daan', korteNaam: 'Daan Voncken', tekenplaats: 'Hulsberg', tekendatum: dag(2026, 10, 9), standplaatsId: bedrijf.hoofdvestiging!.id })
  const concept = stelContractOp(invoer, sjabloon, context, managerProfiel)
  const c = await bewaarContract(invoer, concept, sjabloon, 'definitief', null, { kop: null, handboekId: null })
  assert.equal(c.employeeShortName, 'Daan Voncken')
  assert.equal(c.signPlace, 'Hulsberg')

  // De invoer komt terug zoals hij erin ging, ook de datums.
  const terug = invoerUit(c)
  assert.equal(terug.tekendatum?.getDate(), 9)
  assert.equal(terug.ingangsdatum.getDate(), 13)
  assert.equal(terug.roepnaam, 'Daan')

  const nieuw = { ...terug, bereikbaarOpWerkdagen: true, nevenwerk: 'vrij_behalve_klanten' as const }
  const gewijzigd = await wijzigContract(c.id, nieuw, stelContractOp(nieuw, sjabloon, context, managerProfiel), sjabloon, 'definitief', { kop: null, handboekId: null })
  assert.equal(gewijzigd.id, c.id, 'zelfde nummer')
  assert.match(gewijzigd.body, /Het staat de werknemer vrij/)

  await db.update(generatedContracts).set({ signedOn: dag(2026, 10, 9) }).where(eq(generatedContracts.id, c.id))
  const getekend = (await db.select().from(generatedContracts).where(eq(generatedContracts.id, c.id)))[0]!
  assert.ok(waaromNietWijzigen(getekend))
  await assert.rejects(wijzigContract(c.id, nieuw, stelContractOp(nieuw, sjabloon, context, managerProfiel), sjabloon, 'definitief', { kop: null, handboekId: null }), ContractError)
})
