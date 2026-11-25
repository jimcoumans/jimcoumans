import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { accountsVan, campagnesNaKeuze, campagnesVan, koppelingNaam } from '../koppeling'

const basis = { externalId: '512345678', displayName: 'Thiessen', accounts: null, googleConnectionId: null, linkedinConnectionId: 'v1' }

describe('accounts van een koppeling', () => {
  it('is het ene account uit externalId als er geen lijst is', () => {
    assert.deepEqual(accountsVan(basis), [{ id: '512345678', naam: 'Thiessen', verbinding: 'v1' }])
    assert.equal(koppelingNaam(basis), 'Thiessen')
    assert.equal(koppelingNaam({ ...basis, displayName: null }), '512345678')
  })
  it('is de lijst als die er is, met een naam die ze allemaal noemt', () => {
    const k = { ...basis, accounts: [{ id: '1', naam: 'A', verbinding: 'v1' }, { id: '2', naam: 'B', verbinding: 'v2' }] }
    assert.equal(accountsVan(k).length, 2)
    assert.equal(koppelingNaam(k), '2 accounts: A, B')
  })
})

describe('campagnes', () => {
  it('houdt na een andere keuze alleen campagnes van accounts die blijven', () => {
    const c = [
      { id: '10', naam: 'Meta' },
      { id: '11', naam: 'L1', account: '1' },
      { id: '12', naam: 'L2', account: '2' },
    ]
    assert.deepEqual(campagnesNaKeuze(c, ['1', '3']), [{ id: '11', naam: 'L1', account: '1' }])
    assert.equal(campagnesNaKeuze(c, ['9']), null)
    assert.equal(campagnesNaKeuze(null, ['1']), null)
  })
  it('geeft per account zijn campagnes; zonder account tellen ze bij het enige account', () => {
    const k = { campaigns: [{ id: '10', naam: 'Meta' }, { id: '11', naam: 'L1', account: '1' }] }
    assert.deepEqual(campagnesVan(k, 'act_1', true), ['10'])
    assert.deepEqual(campagnesVan(k, '1', false), ['11'])
    assert.deepEqual(campagnesVan(k, '2', false), [])
    assert.deepEqual(campagnesVan({ campaigns: null }, '1', true), [])
  })
})
