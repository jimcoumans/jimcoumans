/**
 * Tests voor logo's en profielfoto's.
 *
 * Twee dingen moeten hier vastliggen. SVG wordt geweigerd: een SVG kan script
 * bevatten, en een plaatje dat een collega uploadt en dat daarna in de
 * browser van een ander draait is precies hoe je een intern systeem
 * openbreekt.
 *
 * En: een vervangen foto moet écht weg. Anders groeit de database met elke
 * poging, en dat merk je pas als hij vol zit.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, contacts, users, images } from '../../db/schema'
import {
  bewaarAfbeelding,
  wisAfbeelding,
  leesAfbeelding,
  initialen,
  AfbeeldingError,
  MAX_BYTES,
} from '../afbeeldingen'

const suffix = Date.now()
let orgId: string
let contactId: string
let userId: string

/** Een geldig PNG'je van één pixel. */
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

function bestand(naam: string, type: string, bytes: Buffer): File {
  return new File([new Uint8Array(bytes)], naam, { type })
}

before(async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `img-${suffix}`, name: `Beeld BV ${suffix}` })
    .returning()
  orgId = org!.id

  const [contact] = await db
    .insert(contacts)
    .values({ organizationId: orgId, name: `Marieke Voncken ${suffix}` })
    .returning()
  contactId = contact!.id

  const [user] = await db
    .insert(users)
    .values({ email: `img-${suffix}@test.nl`, name: `Beeld ${suffix}`, role: 'staff' })
    .returning()
  userId = user!.id
})

after(async () => {
  await db.delete(contacts).where(eq(contacts.organizationId, orgId))
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await db.delete(users).where(inArray(users.id, [userId]))
  await client.end()
})

/* --- Wat er niet in mag ------------------------------------------------- */

test('een SVG wordt geweigerd', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
  await assert.rejects(
    () => bewaarAfbeelding(bestand('logo.svg', 'image/svg+xml', svg), { soort: 'klant', id: orgId }, null),
    (f: Error) => f instanceof AfbeeldingError && /SVG/.test(f.message),
  )
})

test('een bestand boven een megabyte wordt geweigerd', async () => {
  const groot = Buffer.alloc(MAX_BYTES + 1, 1)
  await assert.rejects(
    () => bewaarAfbeelding(bestand('groot.png', 'image/png', groot), { soort: 'klant', id: orgId }, null),
    (f: Error) => f instanceof AfbeeldingError && /1 MB/.test(f.message),
  )
})

test('een leeg bestand wordt geweigerd', async () => {
  await assert.rejects(
    () =>
      bewaarAfbeelding(
        bestand('leeg.png', 'image/png', Buffer.alloc(0)),
        { soort: 'klant', id: orgId },
        null,
      ),
    (f: Error) => f instanceof AfbeeldingError,
  )
})

/* --- Opslaan en teruglezen ---------------------------------------------- */

test('een logo wordt opgeslagen en komt er hetzelfde uit', async () => {
  const id = await bewaarAfbeelding(
    bestand('logo.png', 'image/png', PNG_BYTES),
    { soort: 'klant', id: orgId },
    null,
  )

  const terug = await leesAfbeelding(id)
  assert.ok(terug)
  assert.equal(terug!.contentType, 'image/png')
  assert.ok(terug!.body.equals(PNG_BYTES), 'byte voor byte hetzelfde')

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  assert.equal(org!.logoImageId, id, 'en hangt aan de klant')
})

test('een vervangen logo laat geen bytes achter', async () => {
  const [voor] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  const oudeId = voor!.logoImageId!

  const nieuweId = await bewaarAfbeelding(
    bestand('nieuw.png', 'image/png', PNG_BYTES),
    { soort: 'klant', id: orgId },
    null,
  )

  assert.notEqual(nieuweId, oudeId)
  assert.equal(await leesAfbeelding(oudeId), null, 'de oude afbeelding is opgeruimd')
  assert.ok(await leesAfbeelding(nieuweId))
})

test('weghalen ruimt de bytes ook op', async () => {
  const [voor] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  const id = voor!.logoImageId!

  await wisAfbeelding({ soort: 'klant', id: orgId })

  const [na] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  assert.equal(na!.logoImageId, null)
  assert.equal(await leesAfbeelding(id), null)
})

test('een contactpersoon en een collega kunnen ook een foto hebben', async () => {
  await bewaarAfbeelding(
    bestand('pasfoto.jpg', 'image/jpeg', PNG_BYTES),
    { soort: 'contact', id: contactId },
    null,
  )
  await bewaarAfbeelding(
    bestand('pasfoto.webp', 'image/webp', PNG_BYTES),
    { soort: 'medewerker', id: userId },
    null,
  )

  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId))
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  assert.ok(contact!.avatarImageId)
  assert.ok(user!.avatarImageId)

  // Opruimen, anders blijven de rijen in images staan na deze test.
  await wisAfbeelding({ soort: 'contact', id: contactId })
  await wisAfbeelding({ soort: 'medewerker', id: userId })
})

test('een onbekend doel geeft een leesbare fout', async () => {
  await assert.rejects(
    () =>
      bewaarAfbeelding(
        bestand('logo.png', 'image/png', PNG_BYTES),
        { soort: 'klant', id: '00000000-0000-0000-0000-000000000000' },
        null,
      ),
    (f: Error) => f instanceof AfbeeldingError && /niet gevonden/i.test(f.message),
  )
})

/* --- Initialen ----------------------------------------------------------- */

test('initialen slaan tussenvoegsels over', () => {
  // "VD" zegt niets; "JB" wel.
  assert.equal(initialen('Jim van den Berg'), 'JB')
  assert.equal(initialen('Marieke Voncken'), 'MV')
  assert.equal(initialen('Robin'), 'RO')
  assert.equal(initialen('Hotel Voncken'), 'HV')
  assert.equal(initialen('   '), '?')
})
