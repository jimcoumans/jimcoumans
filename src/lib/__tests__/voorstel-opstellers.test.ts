/**
 * Tests voor wie een voorstel opstelt. De gegevens komen uit het profiel van
 * de medewerker: volledige naam, mobiel boven vast, en een foto-URL als er
 * een profielfoto is. Wie uit dienst is, staat niet meer in de lijst.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { naarOpsteller, isActief } from '../voorstellen'

const rij = {
  id: 'u1',
  email: 'collega@jamesrobinson.nl',
  name: null,
  firstName: 'Anna',
  infix: 'van',
  lastName: 'Dijk',
  jobTitle: ' Marketingmanager ',
  phone: '045 000 0000',
  mobile: '06 00 00 00 00',
  avatarImageId: 'img-1',
  endedOn: null,
}

test('opsteller: volledige naam, functie en mobiel boven vast', () => {
  const o = naarOpsteller(rij)
  assert.equal(o.naam, 'Anna van Dijk')
  assert.equal(o.functie, 'Marketingmanager')
  assert.equal(o.telefoon, '06 00 00 00 00')
  assert.equal(o.foto, '/afbeelding/img-1')
})

test('opsteller: zonder mobiel vast nummer, zonder naam het e-mailadres', () => {
  const o = naarOpsteller({ ...rij, firstName: null, infix: null, lastName: null, mobile: null, avatarImageId: null })
  assert.equal(o.naam, 'collega@jamesrobinson.nl')
  assert.equal(o.telefoon, '045 000 0000')
  assert.equal(o.foto, null)
})

test('opsteller: uit dienst valt eruit, een einddatum in de toekomst niet', () => {
  const nu = new Date('2026-11-17T12:00:00Z')
  assert.equal(isActief({ endedOn: null }, nu), true)
  assert.equal(isActief({ endedOn: new Date('2026-12-31') }, nu), true)
  assert.equal(isActief({ endedOn: new Date('2026-10-01') }, nu), false)
})
