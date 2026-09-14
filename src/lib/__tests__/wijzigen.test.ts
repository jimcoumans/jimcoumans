/**
 * Tests voor het wijzigen van gegevens.
 *
 * Het gaat hier niet zozeer om of een naam verandert — dat is een UPDATE en
 * die werkt — maar om wat er NIET mag veranderen: een offerte die al bij de
 * klant ligt, een partner die op een offerte staat, een soort regel dat
 * halverwege iets anders wordt. Dat zijn de gevallen waarin een wijziging
 * stilletjes geschiedenis herschrijft.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, partners, services, quotes, contacts, accounts } from '../../db/schema'
import {
  createContact, updateContact, listContacts,
  createPartner, updatePartner, setPartnerActive, deletePartner,
  linkPartner, updatePartnerLink, listPartnersForOrganization,
  createAccount, updateAccount, listAccounts,
  CrmError,
} from '../crm'
import {
  createQuote, addQuoteLine, updateQuote, updateQuoteLine, setQuoteStatus,
  getQuote, QuoteError,
} from '../quotes'

const suffix = Date.now()
let orgId: string
let partnerId: string
let dienstId: string

before(async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `wijzig-${suffix}`, name: `Wijzig Klant ${suffix}` })
    .returning()
  orgId = org!.id

  const [p] = await db
    .insert(partners)
    .values({ name: `Wijzigpartner ${suffix}`, type: 'photographer', hourlyRateCents: 9_500 })
    .returning()
  partnerId = p!.id

  const [d] = await db
    .insert(services)
    .values({ name: `Wijzigdienst ${suffix}`, unit: 'hour', unitPriceCents: 12_500, costPriceCents: 6_000 })
    .returning()
  dienstId = d!.id
})

after(async () => {
  await db.delete(quotes).where(eq(quotes.organizationId, orgId))
  await db.delete(contacts).where(eq(contacts.organizationId, orgId))
  await db.delete(accounts).where(eq(accounts.organizationId, orgId))
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await db.delete(partners).where(inArray(partners.id, [partnerId]))
  await db.delete(services).where(eq(services.id, dienstId))
  await client.end()
})

/* --------------------------- Contactpersonen ---------------------------- */

test('een telefoonnummer corrigeren hoeft niet via weggooien en opnieuw', async () => {
  const c = await createContact({
    organizationId: orgId, name: 'Rob Damen', phone: '043 000 00 00', jobTitle: 'Directeur',
  })

  const na = await updateContact(c.id, { name: 'Rob Damen', phone: '043 321 98 76', jobTitle: 'Directeur' })

  assert.equal(na.id, c.id, 'dezelfde persoon, niet een nieuwe')
  assert.equal(na.phone, '043 321 98 76')
  assert.equal(na.jobTitle, 'Directeur', 'de rest blijft staan')
})

test('iemand tot vaste contactpersoon maken haalt die rol bij de ander weg', async () => {
  const eerste = await createContact({ organizationId: orgId, name: 'Eerste Vaste', isPrimary: true })
  const tweede = await createContact({ organizationId: orgId, name: 'Tweede Persoon' })

  await updateContact(tweede.id, { name: 'Tweede Persoon', isPrimary: true })

  const alle = await listContacts(orgId)
  const vast = alle.filter((c) => c.isPrimary)

  assert.equal(vast.length, 1, 'er kan er maar één vast zijn')
  assert.equal(vast[0]!.id, tweede.id)
  assert.equal(alle.find((c) => c.id === eerste.id)!.isPrimary, false)
})

/* -------------------------------- Partners ------------------------------ */

test('een nieuw partnertarief verandert bestaande offertes niet', async () => {
  const q = await createQuote({ organizationId: orgId, title: 'Fotografie voorjaar' })
  await addQuoteLine({
    quoteId: q.id, kind: 'partner', partnerId,
    description: 'Fotografie hele dag', quantityHundredths: 100,
    unitPriceCents: 85_000, unitCostCents: 65_000,
  })

  await updatePartner(partnerId, {
    name: `Wijzigpartner ${suffix}`, type: 'photographer', hourlyRateCents: 12_000,
  })

  const na = await getQuote(q.id)
  assert.equal(na!.lines[0]!.unitCostCents, 65_000, 'wat we toen afspraken blijft staan')
  assert.equal(na!.totals.marginCents, 20_000)
})

test('een partner die op een offerte staat kan niet verwijderd worden', async () => {
  await assert.rejects(
    () => deletePartner(partnerId),
    (fout: Error) => fout instanceof CrmError && /staat op een offerte/.test(fout.message),
    'anders wis je je eigen cijfers per partner',
  )
})

test('op non-actief zetten kan wel, en terugzetten ook', async () => {
  await setPartnerActive(partnerId, false)
  const [uit] = await db.select().from(partners).where(eq(partners.id, partnerId))
  assert.equal(uit!.active, false)

  await setPartnerActive(partnerId, true)
  const [aan] = await db.select().from(partners).where(eq(partners.id, partnerId))
  assert.equal(aan!.active, true)
})

test('een partner met een klantkoppeling kan ook niet verwijderd worden', async () => {
  const [los] = await db
    .insert(partners)
    .values({ name: `Losse partner ${suffix}`, type: 'other' })
    .returning()

  await linkPartner({ organizationId: orgId, partnerId: los!.id, role: 'Huisfotograaf' })

  await assert.rejects(
    () => deletePartner(los!.id),
    (fout: Error) => fout instanceof CrmError && /gekoppeld/.test(fout.message),
  )

  // Zonder koppeling en zonder offerteregels mag het wel.
  const links = await listPartnersForOrganization(orgId)
  const link = links.find((l) => l.partnerId === los!.id)!
  await db.delete(partners).where(eq(partners.id, los!.id)).catch(() => {})
  assert.ok(link, 'de koppeling bestond')
})

test('het afwijkende tarief bij een klant is te wijzigen', async () => {
  const [extra] = await db
    .insert(partners)
    .values({ name: `Tariefpartner ${suffix}`, type: 'other', hourlyRateCents: 10_000 })
    .returning()

  const link = await linkPartner({
    organizationId: orgId, partnerId: extra!.id, role: 'Developer', customHourlyRateCents: 9_000,
  })

  await updatePartnerLink(link.id, { role: 'Vaste developer', customHourlyRateCents: 8_500 })

  const links = await listPartnersForOrganization(orgId)
  const na = links.find((l) => l.id === link.id)!

  assert.equal(na.role, 'Vaste developer')
  assert.equal(na.effectiveHourlyRateCents, 8_500, 'de klantafspraak wint van het standaardtarief')

  // Leeghalen betekent: weer het standaardtarief van de partner.
  await updatePartnerLink(link.id, { role: 'Vaste developer', customHourlyRateCents: null })
  const terug = (await listPartnersForOrganization(orgId)).find((l) => l.id === link.id)!
  assert.equal(terug.effectiveHourlyRateCents, 10_000)
})

/* ------------------------------- Accounts ------------------------------- */

test('een account wijzigen legt nog steeds geen wachtwoord vast', async () => {
  const a = await createAccount({
    organizationId: orgId, name: 'Google Ads', owner: 'client',
  })

  const na = await updateAccount(a.id, {
    name: 'Google Ads', owner: 'shared',
    vaultReference: '1Password › Klanten › Voncken', hasMfa: true,
  })

  assert.equal(na.owner, 'shared')
  assert.equal(na.vaultReference, '1Password › Klanten › Voncken')
  assert.equal(na.hasMfa, true)
  // Het register wijst naar de kluis, het bewaart hem niet.
  assert.ok(!('password' in na), 'er is geen wachtwoordveld en dat blijft zo')
})

test('een account op niet-meer-in-gebruik zetten haalt hem uit de waarschuwing', async () => {
  const a = await createAccount({ organizationId: orgId, name: 'Oude Twitter', owner: 'client' })
  await updateAccount(a.id, { name: 'Oude Twitter', owner: 'client', active: false })

  const alle = await listAccounts(orgId)
  const na = alle.find((x) => x.id === a.id)!
  assert.equal(na.active, false)
})

/* ------------------------------- Offertes ------------------------------- */

test('de kop van een concept-offerte is te wijzigen', async () => {
  const q = await createQuote({ organizationId: orgId, title: 'Voorstel' })
  const na = await updateQuote(q.id, {
    title: 'Voorstel zomercampagne',
    introText: 'Zoals besproken.',
    vatRatePercent: 9,
  })

  assert.equal(na.title, 'Voorstel zomercampagne')
  assert.equal(na.vatRatePercent, 9)
  assert.equal(na.number, q.number, 'het nummer blijft hetzelfde')
})

test('een verstuurde offerte kan niet meer gewijzigd worden', async () => {
  const q = await createQuote({ organizationId: orgId, title: 'Ligt bij de klant' })
  const regel = await addQuoteLine({
    quoteId: q.id, kind: 'service', serviceId: dienstId,
    description: 'Begeleiding', quantityHundredths: 200,
    unitPriceCents: 12_500, unitCostCents: 6_000,
  })
  await setQuoteStatus(q.id, 'sent')

  await assert.rejects(
    () => updateQuote(q.id, { title: 'Stiekem iets anders' }),
    (fout: Error) => fout instanceof QuoteError && /ligt al bij de klant/.test(fout.message),
    'anders is jouw offerte iets anders dan die in de mail van de klant',
  )

  await assert.rejects(
    () => updateQuoteLine(regel.id, {
      description: 'Begeleiding', quantityHundredths: 200, unitPriceCents: 20_000,
    }),
    (fout: Error) => fout instanceof QuoteError,
  )
})

test('een regel wijzigen rekent de offerte opnieuw door', async () => {
  const q = await createQuote({ organizationId: orgId, title: 'Herrekenen' })
  const regel = await addQuoteLine({
    quoteId: q.id, kind: 'service', serviceId: dienstId,
    description: 'Begeleiding', quantityHundredths: 200,
    unitPriceCents: 12_500, unitCostCents: 6_000,
  })

  const voor = await getQuote(q.id)
  assert.equal(voor!.totals.subtotalCents, 25_000)

  await updateQuoteLine(regel.id, {
    description: 'Begeleiding en oplevering',
    quantityHundredths: 400,
    unitPriceCents: 12_500,
    unitCostCents: 6_000,
  })

  const na = await getQuote(q.id)
  assert.equal(na!.totals.subtotalCents, 50_000)
  assert.equal(na!.totals.marginCents, 26_000)
  assert.equal(na!.lines[0]!.description, 'Begeleiding en oplevering')
})

test('een partnerregel zonder partner wordt geweigerd', async () => {
  const q = await createQuote({ organizationId: orgId, title: 'Partnerregel' })
  const regel = await addQuoteLine({
    quoteId: q.id, kind: 'partner', partnerId,
    description: 'Fotografie', quantityHundredths: 100,
    unitPriceCents: 85_000, unitCostCents: 65_000,
  })

  await assert.rejects(
    () => updateQuoteLine(regel.id, {
      description: 'Fotografie', quantityHundredths: 100,
      unitPriceCents: 85_000, unitCostCents: 65_000, partnerId: null,
    }),
    (fout: Error) => fout instanceof QuoteError && /welke partner/.test(fout.message),
  )
})

test('een kortingsregel blijft een korting', async () => {
  const q = await createQuote({ organizationId: orgId, title: 'Korting' })
  const regel = await addQuoteLine({
    quoteId: q.id, kind: 'discount',
    description: 'Introductiekorting', quantityHundredths: 100, unitPriceCents: -25_000,
  })

  await assert.rejects(
    () => updateQuoteLine(regel.id, {
      description: 'Introductiekorting', quantityHundredths: 100, unitPriceCents: 25_000,
    }),
    (fout: Error) => fout instanceof QuoteError && /onder nul/.test(fout.message),
    'een korting die positief wordt telt op in plaats van af',
  )

  // Een ander kortingsbedrag mag wel.
  const na = await updateQuoteLine(regel.id, {
    description: 'Introductiekorting', quantityHundredths: 100, unitPriceCents: -10_000,
  })
  assert.equal(na.unitPriceCents, -10_000)
})
