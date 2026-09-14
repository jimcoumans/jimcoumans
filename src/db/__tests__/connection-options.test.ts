/**
 * Deze test bewaakt een instelling die je pas mist als het misgaat: op een
 * pooler in transactiemodus moeten prepared statements uit. Staat dat fout,
 * dan werkt de app in eerste instantie gewoon en breekt hij later op een
 * fout die niemand aan de verbinding koppelt.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { connectionOptionsFor, usesTransactionPooler } from '../connection-options'

const DIRECT = 'postgresql://postgres:geheim@db.abcdefgh.supabase.co:5432/postgres'
const POOLER = 'postgresql://postgres.abcdefgh:geheim@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
const NEON = 'postgresql://user:geheim@ep-cool-name-123.eu-central-1.aws.neon.tech/jrwallet?sslmode=require'
const LOKAAL = 'postgresql://jr:jr@localhost:5433/jrwallet'

test('de pooler van Supabase wordt herkend aan poort en host', () => {
  assert.equal(usesTransactionPooler(POOLER), true)
  assert.equal(connectionOptionsFor(POOLER).prepare, false, 'anders: prepared statement already exists')
})

test('een directe verbinding houdt prepared statements gewoon aan', () => {
  assert.equal(usesTransactionPooler(DIRECT), false)
  assert.equal(connectionOptionsFor(DIRECT).prepare, true)
  assert.equal(connectionOptionsFor(NEON).prepare, true)
  assert.equal(connectionOptionsFor(LOKAAL).prepare, true)
})

test('een pgbouncer-vlag in de string telt ook als pooler', () => {
  assert.equal(usesTransactionPooler(NEON + '&pgbouncer=true'), true)
})

test('DATABASE_PREPARE=false zet ze uit voor een pooler die we niet kennen', () => {
  assert.equal(connectionOptionsFor(LOKAAL, { DATABASE_PREPARE: 'false' }).prepare, false)
})

test('DATABASE_PREPARE kan ze niet aanzetten op een pooler', () => {
  // Een pooler die het niet kan, kan het ook niet als jij dat graag wilt.
  assert.equal(connectionOptionsFor(POOLER, { DATABASE_PREPARE: 'true' }).prepare, false)
})

test('een onleesbare connection string laat de app niet omvallen', () => {
  assert.equal(usesTransactionPooler('dit is geen url'), false)
})
