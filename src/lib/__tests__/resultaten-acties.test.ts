/**
 * Tests voor de aangevinkte acties bij de rapportage. Twee keer aanvinken is
 * één actie, uitvinken kan alleen binnen de eigen klant, en de database
 * weigert een onzinnige maand of eigenaar.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, reportActions } from '../../db/schema'
import { getActies, vinkAan, vinkUit, zetStatus } from '../resultaten/acties'
import { assertViolatesConstraint } from './helpers'

const suffix = Math.random().toString(36).slice(2, 8)
let orgId = ''
let andereId = ''

before(async () => {
  const [a] = await db.insert(organizations).values({ slug: `ra-${suffix}`, name: `Acties ${suffix}` }).returning()
  const [b] = await db.insert(organizations).values({ slug: `rb-${suffix}`, name: `Ander ${suffix}` }).returning()
  orgId = a!.id
  andereId = b!.id
})

after(async () => {
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await db.delete(organizations).where(eq(organizations.id, andereId))
  await client.end()
})

const actie = { maand: '2026-10', findingCode: 'conversie:alle', findingTitle: 'Bezoekers worden te weinig klant', actie: 'Het formulier korter maken', eigenaar: 'wij' as const, userId: null }

test('twee keer aanvinken is één actie', async () => {
  await vinkAan({ organizationId: orgId, ...actie })
  await vinkAan({ organizationId: orgId, ...actie })
  const rijen = await getActies(orgId, '2026-10')
  assert.equal(rijen.length, 1)
  assert.equal(rijen[0]!.status, 'gepland')
})

test('status zetten en uitvinken alleen binnen de eigen klant', async () => {
  const [a] = await getActies(orgId, '2026-10')
  await zetStatus(a!.id, andereId, 'klaar')
  await vinkUit(a!.id, andereId)
  assert.equal((await getActies(orgId, '2026-10'))[0]!.status, 'gepland')
  await zetStatus(a!.id, orgId, 'bezig')
  assert.equal((await getActies(orgId, '2026-10'))[0]!.status, 'bezig')
  await vinkUit(a!.id, orgId)
  assert.equal((await getActies(orgId, '2026-10')).length, 0)
})

test('de database weigert een onzinnige maand of eigenaar', async () => {
  await assertViolatesConstraint(
    () => db.insert(reportActions).values({ organizationId: orgId, month: '2026-13', findingCode: 'x', findingTitle: 'x', action: 'x', owner: 'wij' }),
    'report_actions_month_format',
  )
  await assertViolatesConstraint(
    () => db.insert(reportActions).values({ organizationId: orgId, month: '2026-10', findingCode: 'x', findingTitle: 'x', action: 'x', owner: 'iemand' }),
    'report_actions_owner_valid',
  )
})
