/**
 * Tests voor inloggen met een wachtwoord.
 *
 * Een wachtwoordveld op een openbare URL is een uitnodiging om te raden. Met
 * een inloglink was dat geen probleem — daar valt niets te raden — dus alles
 * wat dit veilig houdt is hier nieuw en moet bewezen worden:
 *
 * - het wachtwoord staat nergens leesbaar in de database
 * - een verkeerd wachtwoord en een onbekend adres geven hetzelfde antwoord
 * - na tien misslagen gaat de deur op slot
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { users, loginAttempts } from '../../db/schema'
import {
  zetWachtwoord,
  wisWachtwoord,
  controleerInlog,
  controleerWachtwoord,
  heeftWachtwoord,
  pruneLoginAttempts,
  WachtwoordError,
  MAX_POGINGEN,
} from '../wachtwoord'

const suffix = Date.now()
const mail = `wt-${suffix}@test.nl`
const geblokkeerdMail = `wt-blok-${suffix}@test.nl`
const GOED = 'een zin van vier woorden'
let userId: string
let geblokkeerdId: string

before(async () => {
  const gemaakt = await db
    .insert(users)
    .values([
      { email: mail, name: `Wachtwoord ${suffix}`, role: 'staff' },
      { email: geblokkeerdMail, name: `Geblokkeerd ${suffix}`, role: 'staff', disabledAt: new Date() },
    ])
    .returning()
  userId = gemaakt[0]!.id
  geblokkeerdId = gemaakt[1]!.id
})

after(async () => {
  await db.delete(loginAttempts).where(inArray(loginAttempts.email, [mail, geblokkeerdMail]))
  await db.delete(users).where(inArray(users.id, [userId, geblokkeerdId]))
  await client.end()
})

/** De misslagen wissen, zodat elke test bij nul begint. */
async function schoon() {
  await db.delete(loginAttempts).where(inArray(loginAttempts.email, [mail, geblokkeerdMail]))
}

/* --- Eisen aan een wachtwoord -------------------------------------------- */

test('een kort wachtwoord wordt geweigerd, een zin niet', () => {
  assert.ok(controleerWachtwoord('Welkom2024!'), 'elf tekens is te kort')
  assert.equal(controleerWachtwoord(GOED), null)
  // Geen hoofdletter-cijfer-tekenregels: die leveren juist korte, slechte
  // wachtwoorden op. Lengte is wat telt.
  assert.equal(controleerWachtwoord('appelperenbananen'), null)
})

test('een te kort wachtwoord wordt ook niet opgeslagen', async () => {
  await assert.rejects(
    () => zetWachtwoord(userId, 'kort'),
    (f: Error) => f instanceof WachtwoordError,
  )
})

/* --- Opslaan ------------------------------------------------------------- */

test('het wachtwoord staat niet leesbaar in de database', async () => {
  await zetWachtwoord(userId, GOED)

  const [rij] = await db.select().from(users).where(eq(users.id, userId))
  assert.ok(rij!.passwordHash)
  assert.ok(!rij!.passwordHash!.includes(GOED), 'het wachtwoord komt er niet in voor')
  assert.match(rij!.passwordHash!, /^\$2[aby]\$12\$/, 'bcrypt met kostenfactor 12')
})

test('twee keer hetzelfde wachtwoord levert een andere hash op', async () => {
  // De salt zorgt daarvoor. Zonder salt kun je aan gelijke hashes zien wie
  // hetzelfde wachtwoord gebruikt.
  const [voor] = await db.select().from(users).where(eq(users.id, userId))
  await zetWachtwoord(userId, GOED)
  const [na] = await db.select().from(users).where(eq(users.id, userId))

  assert.notEqual(voor!.passwordHash, na!.passwordHash)
})

/* --- Inloggen ------------------------------------------------------------ */

test('met het goede wachtwoord kom je binnen', async () => {
  await schoon()
  const uitkomst = await controleerInlog(mail, GOED)
  assert.equal(uitkomst.status, 'ok')
  assert.equal(uitkomst.status === 'ok' && uitkomst.userId, userId)
})

test('hoofdletters in het e-mailadres maken niet uit', async () => {
  await schoon()
  const uitkomst = await controleerInlog(mail.toUpperCase(), GOED)
  assert.equal(uitkomst.status, 'ok')
})

test('een verkeerd wachtwoord en een onbekend adres geven hetzelfde antwoord', async () => {
  // Anders kun je via dit formulier uitvissen wie er een account heeft, en
  // dat is precies wat een aanvaller eerst wil weten.
  await schoon()
  const verkeerd = await controleerInlog(mail, 'dit is het niet hoor')
  const onbekend = await controleerInlog(`bestaatniet-${suffix}@test.nl`, GOED)

  assert.equal(verkeerd.status, 'fout')
  assert.deepEqual(verkeerd, onbekend)
})

test('een geblokkeerd account komt er niet in, ook niet met het goede wachtwoord', async () => {
  await zetWachtwoord(geblokkeerdId, GOED)
  await schoon()

  const uitkomst = await controleerInlog(geblokkeerdMail, GOED)
  assert.equal(uitkomst.status, 'fout')
})

test('zonder ingesteld wachtwoord kun je niet met een leeg wachtwoord binnen', async () => {
  await wisWachtwoord(userId)
  await schoon()

  assert.equal(await heeftWachtwoord(userId), false)
  assert.equal((await controleerInlog(mail, '')).status, 'fout')
  assert.equal((await controleerInlog(mail, GOED)).status, 'fout')

  await zetWachtwoord(userId, GOED)
})

/* --- De rem op raden ----------------------------------------------------- */

test('na tien misslagen gaat de deur op slot', async () => {
  await schoon()

  for (let i = 0; i < MAX_POGINGEN; i++) {
    const uit = await controleerInlog(mail, `fout-${i}`)
    assert.equal(uit.status, 'fout', `poging ${i + 1} hoort gewoon fout te zijn`)
  }

  const elfde = await controleerInlog(mail, `nog een keer fout`)
  assert.equal(elfde.status, 'op_slot')
})

test('op slot betekent ook op slot met het goede wachtwoord', async () => {
  // Anders is de rem geen rem: dan kun je blijven raden tot je hem hebt.
  const uitkomst = await controleerInlog(mail, GOED)
  assert.equal(uitkomst.status, 'op_slot')
})

test('een geslaagde inlog wist de misslagen', async () => {
  await schoon()

  await controleerInlog(mail, 'een keer mis')
  await controleerInlog(mail, 'twee keer mis')
  const goed = await controleerInlog(mail, GOED)
  assert.equal(goed.status, 'ok')

  const resterend = await db.select().from(loginAttempts).where(eq(loginAttempts.email, mail))
  assert.equal(resterend.length, 0, 'wie zich vergiste loopt later niet tegen het slot aan')
})

test('oude misslagen worden opgeruimd', async () => {
  await schoon()
  await db.insert(loginAttempts).values({
    email: mail,
    attemptedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
  })

  await pruneLoginAttempts()

  const over = await db.select().from(loginAttempts).where(eq(loginAttempts.email, mail))
  assert.equal(over.length, 0)
})
