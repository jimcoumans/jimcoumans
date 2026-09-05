/**
 * Tests voor de inloglogica. De cookie-functies zitten hier niet in: die
 * werken alleen binnen een Next.js-request. Getest wordt wat de beveiliging
 * bepaalt: wie een link krijgt, en of die link precies een keer werkt.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, sql } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, users, loginTokens } from '../../db/schema'
import {
  createLoginToken,
  consumeLoginToken,
  normalizeEmail,
  safeCompare,
  pruneLoginTokens,
} from '../auth'

const suffix = Date.now()
const klantEmail = `klant-${suffix}@voorbeeld.nl`
const geblokkeerdEmail = `geblokkeerd-${suffix}@voorbeeld.nl`
let orgId: string
let userId: string
let teller = 0

/**
 * Elke test die inloglinks aanvraagt krijgt een eigen gebruiker. Anders
 * lopen tests tegen de limiet van vijf aanvragen per uur aan die op een
 * e-mailadres geldt, en falen ze om de verkeerde reden.
 */
async function nieuweGebruiker(): Promise<string> {
  const email = `gebruiker-${suffix}-${teller++}@voorbeeld.nl`
  await db.insert(users).values({ email, role: 'client', organizationId: orgId })
  return email
}

before(async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `auth-test-${suffix}`, name: 'Auth Testklant' })
    .returning()
  orgId = org!.id

  const [user] = await db
    .insert(users)
    .values({ email: klantEmail, name: 'Test Klant', role: 'client', organizationId: orgId })
    .returning()
  userId = user!.id

  await db.insert(users).values({
    email: geblokkeerdEmail,
    role: 'client',
    organizationId: orgId,
    disabledAt: new Date(),
  })
})

after(async () => {
  await db.delete(loginTokens).where(sql`${loginTokens.email} LIKE ${'%' + suffix + '%'}`)
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await client.end()
})

test('normalizeEmail maakt hoofdletters en spaties onschadelijk', () => {
  assert.equal(normalizeEmail('  Jim@JamesRobinson.NL '), 'jim@jamesrobinson.nl')
})

test('een bekende gebruiker krijgt een inloglink', async () => {
  const result = await createLoginToken(klantEmail)
  assert.equal(result.status, 'sent')
  assert.ok(result.status === 'sent' && result.token.length > 20)
})

test('hoofdletters in het e-mailadres werken ook', async () => {
  const result = await createLoginToken(klantEmail.toUpperCase())
  assert.equal(result.status, 'sent')
})

test('het onbewerkte token staat nooit in de database', async () => {
  const result = await createLoginToken(await nieuweGebruiker())
  assert.ok(result.status === 'sent')

  const [found] = await db
    .select()
    .from(loginTokens)
    .where(eq(loginTokens.tokenHash, result.token))

  assert.equal(found, undefined, 'het token zelf mag niet als hash-waarde opzoekbaar zijn')
})

test('een onbekend e-mailadres krijgt geen link', async () => {
  const result = await createLoginToken(`bestaatniet-${suffix}@voorbeeld.nl`)
  assert.equal(result.status, 'unknown_email')
})

test('een geblokkeerde gebruiker krijgt geen link', async () => {
  const result = await createLoginToken(geblokkeerdEmail)
  assert.equal(result.status, 'unknown_email')
})

test('te veel aanvragen achter elkaar worden geweigerd', async () => {
  const email = await nieuweGebruiker()

  const statussen: string[] = []
  for (let i = 0; i < 7; i++) {
    statussen.push((await createLoginToken(email)).status)
  }

  assert.equal(statussen.filter((s) => s === 'sent').length, 5)
  assert.ok(statussen.includes('rate_limited'), 'na vijf keer moet het dichtgaan')
})

test('een geldige link logt de juiste gebruiker in', async () => {
  const created = await createLoginToken(klantEmail)
  assert.ok(created.status === 'sent')

  const result = await consumeLoginToken(created.token)
  assert.equal(result.status, 'ok')
  assert.ok(
    result.status === 'ok' && result.userId === userId,
    'de link hoort bij precies een gebruiker',
  )
})

test('dezelfde link werkt maar een keer', async () => {
  const created = await createLoginToken(await nieuweGebruiker())
  assert.ok(created.status === 'sent')

  assert.equal((await consumeLoginToken(created.token)).status, 'ok')
  assert.equal((await consumeLoginToken(created.token)).status, 'used')
})

test('een verlopen link werkt niet', async () => {
  const email = await nieuweGebruiker()
  const created = await createLoginToken(email)
  assert.ok(created.status === 'sent')

  await db
    .update(loginTokens)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(loginTokens.email, email))

  assert.equal((await consumeLoginToken(created.token)).status, 'expired')
})

test('twee links tegelijk aanvragen: beide werken, elk een keer', async () => {
  // Een klant die twee keer op 'stuur mij een link' klikt moet met de
  // eerste mail nog steeds kunnen inloggen.
  const email = await nieuweGebruiker()
  const eerste = await createLoginToken(email)
  const tweede = await createLoginToken(email)
  assert.ok(eerste.status === 'sent' && tweede.status === 'sent')

  assert.equal((await consumeLoginToken(eerste.token)).status, 'ok')
  assert.equal((await consumeLoginToken(tweede.token)).status, 'ok')
  assert.equal((await consumeLoginToken(eerste.token)).status, 'used')
})

test('een verzonnen token werkt niet', async () => {
  assert.equal((await consumeLoginToken('zomaar-wat-verzonnen')).status, 'invalid')
  assert.equal((await consumeLoginToken('')).status, 'invalid')
})

test('een link wordt ongeldig als de gebruiker wordt geblokkeerd', async () => {
  const email = await nieuweGebruiker()
  const [u] = await db.select().from(users).where(eq(users.email, email))

  const created = await createLoginToken(email)
  assert.ok(created.status === 'sent')

  // Toegang intrekken nadat de link al is verstuurd.
  await db.update(users).set({ disabledAt: new Date() }).where(eq(users.id, u!.id))

  assert.equal((await consumeLoginToken(created.token)).status, 'invalid')
})

test('safeCompare vergelijkt correct en zonder lengte-uitzondering', () => {
  assert.equal(safeCompare('geheim', 'geheim'), true)
  assert.equal(safeCompare('geheim', 'geheim2'), false)
  assert.equal(safeCompare('geheim', 'anders'), false)
  assert.equal(safeCompare('', ''), true)
})

test('pruneLoginTokens ruimt alleen oude links op', async () => {
  const versEmail = await nieuweGebruiker()
  const vers = await createLoginToken(versEmail)
  assert.ok(vers.status === 'sent')

  // Een link die twee dagen geleden al verlopen was.
  await db.insert(loginTokens).values({
    tokenHash: 'oude-hash-' + suffix,
    email: versEmail,
    expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  })

  const verwijderd = await pruneLoginTokens()
  assert.ok(verwijderd >= 1, 'de oude link hoort opgeruimd te worden')

  // De verse link moet nog werken.
  assert.equal((await consumeLoginToken(vers.token)).status, 'ok')
})
