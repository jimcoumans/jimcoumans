import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitTax, parseEuroInput, formatMoney } from '../src/lib/money'
import { zonedToUtc, todayIn } from '../src/lib/time'
import { summarizeBookings } from '../src/lib/domain/bookings'
import { computeBalance } from '../src/lib/domain/billing'
import { bucketOf, missingInfo } from '../src/lib/domain/requests'
import { invitationState } from '../src/lib/domain/invitations'
import { totpAt, verifyTotp, base32Decode, base32Encode } from '../src/lib/auth/totp'
import { canCreateRequests, canViewHistory } from '../src/lib/domain/memberships'
import { snapshotHash } from '../src/lib/crypto'

test('btw: €495 incl. 21% = €409,09 netto + €85,91 btw', () => {
  assert.deepEqual(splitTax(49500, 2100, true), { netMinor: 40909, taxMinor: 8591, grossMinor: 49500 })
  assert.deepEqual(splitTax(10000, 2100, false), { netMinor: 10000, taxMinor: 2100, grossMinor: 12100 })
  for (const amt of [1, 99, 12345, 999999]) {
    const s = splitTax(amt, 2100, true)
    assert.equal(s.netMinor + s.taxMinor, s.grossMinor)
  }
  assert.throws(() => splitTax(-1, 2100, true))
  assert.throws(() => splitTax(1.5, 2100, true))
})

test('rekensom uit het concept: 25 leden × €495 incl. btw', () => {
  const net = splitTax(49500, 2100, true).netMinor
  assert.equal(25 * 49500, 1237500)
  assert.equal(Math.round((25 * 49500 * 10000) / 12100), 1022727) // €10.227 per maand excl. btw
  assert.equal(net, 40909)
})

test('bedrag-invoer wordt naar centen omgezet zonder floats', () => {
  assert.equal(parseEuroInput('350'), 35000)
  assert.equal(parseEuroInput('350,5'), 35050)
  assert.equal(parseEuroInput('1.250,50'), 125050)
  assert.equal(parseEuroInput('€ 0,10'), 10)
  assert.equal(parseEuroInput('1,250.50'), 125050)
  assert.equal(parseEuroInput('abc'), null)
  assert.equal(parseEuroInput('-5'), null)
  assert.match(formatMoney(49500), /495,00/)
})

test('tijdzones: zomertijdgrens Europe/Amsterdam', () => {
  // Winter: UTC+1
  assert.equal(zonedToUtc('2026-01-15', '20:00').toISOString(), '2026-01-15T19:00:00.000Z')
  // Zomer: UTC+2
  assert.equal(zonedToUtc('2026-07-15', '20:00').toISOString(), '2026-07-15T18:00:00.000Z')
  // Dag van de overgang naar zomertijd (29 maart 2026): 20:00 is al zomertijd
  assert.equal(zonedToUtc('2026-03-29', '20:00').toISOString(), '2026-03-29T18:00:00.000Z')
  // 01:30 op die dag is nog wintertijd
  assert.equal(zonedToUtc('2026-03-29', '01:30').toISOString(), '2026-03-29T00:30:00.000Z')
  // Terug naar wintertijd (25 okt 2026): 20:00 is UTC+1
  assert.equal(zonedToUtc('2026-10-25', '20:00').toISOString(), '2026-10-25T19:00:00.000Z')
  // Andere zone: Dubai (UTC+4, geen zomertijd)
  assert.equal(zonedToUtc('2026-07-15', '20:00', 'Asia/Dubai').toISOString(), '2026-07-15T16:00:00.000Z')
  assert.equal(todayIn('Europe/Amsterdam', new Date('2026-11-16T23:30:00Z')), '2026-11-17')
})

test('boekingen: nooit "alles bevestigd" bij een openstaand vereist onderdeel', () => {
  assert.equal(summarizeBookings([]), 'none')
  assert.equal(summarizeBookings([{ status: 'confirmed', required: true }, { status: 'pending', required: true }]), 'partial')
  assert.equal(summarizeBookings([{ status: 'confirmed', required: true }, { status: 'confirmed', required: true }]), 'all_confirmed')
  assert.equal(summarizeBookings([{ status: 'confirmed', required: true }, { status: 'pending', required: false }]), 'all_confirmed')
  assert.equal(summarizeBookings([{ status: 'requested', required: true }]), 'pending')
  assert.equal(summarizeBookings([{ status: 'cancellation_requested', required: true }]), 'pending')
  assert.equal(summarizeBookings([{ status: 'cancelled', required: true }]), 'cancelled')
})

test('saldo van een factuur met betaling, restitutie en correctie', () => {
  assert.equal(computeBalance(49500, 'issued', []).state, 'open')
  assert.equal(computeBalance(49500, 'issued', [{ kind: 'payment', amountMinor: 20000 }]).state, 'partially_paid')
  const paid = computeBalance(49500, 'issued', [{ kind: 'payment', amountMinor: 49500 }])
  assert.equal(paid.state, 'paid')
  assert.equal(paid.outstandingMinor, 0)
  const corrected = computeBalance(49500, 'issued', [{ kind: 'payment', amountMinor: 59500 }, { kind: 'correction', amountMinor: 10000 }])
  assert.equal(corrected.state, 'paid')
  assert.equal(corrected.netReceivedMinor, 49500)
  assert.equal(computeBalance(49500, 'issued', [{ kind: 'payment', amountMinor: 49500 }, { kind: 'refund', amountMinor: 49500 }]).state, 'refunded')
})

test('werkbakken en ontbrekende informatie', () => {
  const base = { waitingOn: null, hasIssue: false, desiredDate: null, timezone: 'Europe/Amsterdam', cancellationRequestedAt: null }
  assert.equal(bucketOf({ ...base, status: 'new' }), 'new')
  assert.equal(bucketOf({ ...base, status: 'researching', waitingOn: 'supplier' }), 'waiting_supplier')
  assert.equal(bucketOf({ ...base, status: 'awaiting_approval' }), 'waiting_member')
  assert.equal(bucketOf({ ...base, status: 'confirmed', desiredDate: '2026-01-01' }, '2026-02-01'), 'aftercare')
  assert.equal(bucketOf({ ...base, status: 'confirmed', desiredDate: '2026-03-01' }, '2026-02-01'), 'upcoming')
  assert.equal(bucketOf({ ...base, status: 'arranging', hasIssue: true }), 'problem')
  assert.equal(bucketOf({ ...base, status: 'closed' }), null)
  assert.deepEqual(missingInfo({ desiredDate: null, partySize: null, budgetMinor: null, category: 'dining' }), ['datum', 'aantal personen', 'budget'])
})

test('uitnodigingsstatus', () => {
  const now = new Date('2026-11-17T12:00:00Z')
  assert.equal(invitationState({ expiresAt: new Date('2026-12-01'), revokedAt: null, claimedAt: null }, now), 'open')
  assert.equal(invitationState({ expiresAt: new Date('2026-11-01'), revokedAt: null, claimedAt: null }, now), 'expired')
  assert.equal(invitationState({ expiresAt: new Date('2026-12-01'), revokedAt: now, claimedAt: null }, now), 'revoked')
  assert.equal(invitationState({ expiresAt: new Date('2026-12-01'), revokedAt: null, claimedAt: now }, now), 'claimed')
})

test('TOTP volgens RFC 6238 testvector', () => {
  // RFC 6238 SHA1-sleutel "12345678901234567890", T=59 s -> 94287082 (8 cijfers) -> 287082
  const secret = base32Encode(Buffer.from('12345678901234567890'))
  assert.equal(base32Decode(secret).toString(), '12345678901234567890')
  assert.equal(totpAt(secret, 1), '287082')
  assert.equal(verifyTotp(secret, '287082', 59_000), 1)
  assert.equal(verifyTotp(secret, '000000', 59_000), null)
})

test('lidmaatschapsstatus: beëindigd lid ziet historie, maakt geen nieuwe verzoeken', () => {
  assert.equal(canCreateRequests({ status: 'active' }), true)
  for (const s of ['ending', 'ended', 'suspended', 'accepted_pending_payment', 'offered'] as const) assert.equal(canCreateRequests({ status: s }), false)
  assert.equal(canViewHistory({ status: 'ended' }), true)
  assert.equal(canViewHistory({ status: 'offered' }), false)
})

test('snapshot-hash is stabiel bij andere sleutelvolgorde', () => {
  assert.equal(snapshotHash({ a: 1, b: { c: 2, d: 3 } }), snapshotHash({ b: { d: 3, c: 2 }, a: 1 }))
  assert.notEqual(snapshotHash({ a: 1 }), snapshotHash({ a: 2 }))
})
