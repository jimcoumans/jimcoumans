/**
 * Tests voor de openbare API naar jamesrobinson.nl. Wat vast moet liggen:
 * - zonder of met een verkeerde sleutel komt er niets uit;
 * - van een vacature gaat alleen het openbare deel mee (geen reden, geen salaris);
 * - de website krijgt de GOEDGEKEURDE tekst, niet het concept dat er nu staat;
 * - een case van een klant zonder toestemming gaat niet mee.
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { marketingClients, marketingContentItems, marketingSubjects, users, vacancies } from '../../db/schema'
import { bewaarKlant, bewaarOnderwerp } from '../marketing/registers'
import { bewaarVelden, dienIn, haalContent, keurGoed, maakContent, zetKoppelingen } from '../marketing/content'
import { naarPubliek, openVacatures } from '../publiek/vacatures'
import { goedgekeurdeContent } from '../publiek/content'
import { websiteOf401 } from '../publiek/toegang'

const t = Date.now()
const items: string[] = [], subjects: string[] = [], klanten: string[] = [], gebruikers: string[] = [], vacs: string[] = []
after(async () => {
  if (items.length) await db.delete(marketingContentItems).where(inArray(marketingContentItems.id, items))
  if (klanten.length) await db.delete(marketingClients).where(inArray(marketingClients.id, klanten))
  if (subjects.length) await db.delete(marketingSubjects).where(inArray(marketingSubjects.id, subjects))
  if (vacs.length) await db.delete(vacancies).where(inArray(vacancies.id, vacs))
  if (gebruikers.length) await db.delete(users).where(inArray(users.id, gebruikers))
  await client.end()
})

test('de API is dicht zonder de juiste sleutel', () => {
  const oud = process.env.PUBLIEK_API_TOKEN
  delete process.env.PUBLIEK_API_TOKEN
  assert.equal(websiteOf401(new Request('http://x'))?.status, 503, 'niet ingesteld = dicht')
  process.env.PUBLIEK_API_TOKEN = 'goed-geheim-1234'
  assert.equal(websiteOf401(new Request('http://x'))?.status, 401)
  assert.equal(websiteOf401(new Request('http://x', { headers: { authorization: 'Bearer fout' } }))?.status, 401)
  assert.equal(websiteOf401(new Request('http://x', { headers: { authorization: 'Bearer goed-geheim-1234' } })), null)
  if (oud === undefined) delete process.env.PUBLIEK_API_TOKEN
  else process.env.PUBLIEK_API_TOKEN = oud
})

test('een vacature gaat zonder reden en salaris naar buiten, en alleen als hij open staat', async () => {
  const [open] = await db.insert(vacancies).values({ title: `Marketeer ${t}`, status: 'open', reason: 'Intern: vervanging van X', salaryScaleName: 'B', salaryStepMin: 1, salaryStepMax: 4, hoursPerWeekQuarters: 128, description: 'Openbare tekst' }).returning()
  const [concept] = await db.insert(vacancies).values({ title: `Concept ${t}`, status: 'concept' }).returning()
  vacs.push(open!.id, concept!.id)
  const p = naarPubliek(open!)
  assert.equal(p.urenPerWeek, 32)
  assert.deepEqual(Object.keys(p).sort(), ['geopendOp', 'id', 'omschrijving', 'plaatsen', 'soort', 'titel', 'urenPerWeek'])
  assert.ok(!JSON.stringify(p).includes('Intern'))
  const lijst = await openVacatures()
  assert.ok(lijst.some((v) => v.id === open!.id))
  assert.ok(!lijst.some((v) => v.id === concept!.id))
})

test('de website krijgt de goedgekeurde tekst, en geen case zonder toestemming', async () => {
  const [s] = await db.insert(users).values({ email: `pub-staff-${t}@jr.test`, role: 'staff' }).returning()
  const [a] = await db.insert(users).values({ email: `pub-admin-${t}@jr.test`, role: 'admin' }).returning()
  gebruikers.push(s!.id, a!.id)
  const staff = { id: s!.id, role: 'staff' as const }, admin = { id: a!.id, role: 'admin' as const }
  const seo = await bewaarOnderwerp({ type: 'service', name: `SEO ${t}` })
  subjects.push(seo.id)

  const faq = await maakContent({ kind: 'faq', title: `Wat is SEO ${t}` }, staff)
  items.push(faq.id)
  await bewaarVelden(faq.id, { vraag: { mode: 'override', value: 'Wat is SEO?' }, antwoord: { mode: 'override', value: 'Goedgekeurd antwoord' } }, staff)
  await zetKoppelingen(faq.id, { subjectIds: [seo.id], industryIds: [], clientIds: [] }, staff)
  await dienIn(faq.id, staff)
  await keurGoed(faq.id, admin)
  // Daarna bewerkt: dat concept mag niet live.
  await bewaarVelden(faq.id, { antwoord: { mode: 'override', value: 'Nog niet goedgekeurd' } }, staff)
  assert.equal((await haalContent(faq.id))!.item.workflowStatus, 'draft')

  const zonder = await bewaarKlant({ name: `Kantoor zonder toestemming ${t}`, permission: 'unknown' })
  klanten.push(zonder)
  const kaas = await maakContent({ kind: 'case', title: `Case zonder toestemming ${t}` }, staff)
  items.push(kaas.id)
  await bewaarVelden(kaas.id, { uitdaging: { mode: 'override', value: 'a' }, aanpak: { mode: 'override', value: 'b' }, resultaat: { mode: 'override', value: 'c' } }, staff)
  await zetKoppelingen(kaas.id, { subjectIds: [seo.id], industryIds: [], clientIds: [zonder] }, staff)
  await dienIn(kaas.id, staff)
  await keurGoed(kaas.id, admin)

  const alles = await goedgekeurdeContent()
  const f = alles.find((c) => c.id === faq.id)
  assert.ok(f, 'de FAQ staat erin')
  assert.equal(f!.velden.antwoord, 'Goedgekeurd antwoord')
  assert.deepEqual(f!.onderwerpen, [seo.slug])
  assert.ok(!alles.some((c) => c.id === kaas.id), 'geen case zonder toestemming')
})
