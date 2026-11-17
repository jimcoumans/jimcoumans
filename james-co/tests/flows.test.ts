/**
 * Integratietests tegen een echte Postgres (testdatabase), met gewone
 * gebruikerscontext (rol jc_app + RLS), niet met een alles-mogende sleutel.
 */
import { test, before, after, describe } from 'node:test'
import assert from 'node:assert/strict'
import { resetDb, makeStaff, makeActiveMember, makeProfile, done, uuid, asOwner } from './helpers'
import { withActor, withSystem, dbErrorCode } from '../src/lib/db-core'
import { ANONYMOUS, memberActor, type Actor } from '../src/lib/actor'
import { DomainError } from '../src/lib/errors'
import { createRequest, getMyRequest, listMyRequests, setRequestStatus, assignOwner, addInternalNote, getRequestForStaff, addMemberMessage } from '../src/lib/domain/requests'
import { createDraftProposal, upsertOption, issueProposal, approveProposal } from '../src/lib/domain/proposals'
import { addBooking, confirmBooking, requestCancellation, confirmCancellation } from '../src/lib/domain/bookings'
import { createMemberInvitation, inspectInvitation, revealInviter, revokeInvitation, listOwnInvitations } from '../src/lib/domain/invitations'
import { submitApplication, finalizeApplicationVerification } from '../src/lib/domain/applications'
import { consumeToken, requestLoginLink, createSession, loadSession, revokeSession, actorFromSession } from '../src/lib/auth/core'
import { issueMembershipOffer, acceptMembershipOffer, activateMembership, getMyOpenOffer, changeMembershipStatus } from '../src/lib/domain/memberships'
import { createBillingRecord, registerPayment, listBilling } from '../src/lib/domain/billing'
import { saveEvent, setEventStatus, inviteMembers, registerInterest, offerPlace, acceptPlaceOffer, confirmPlace, getEventForStaff, listMyEvents } from '../src/lib/domain/society'
import { saveSupplier, recordAvailabilityCheck } from '../src/lib/domain/suppliers'
import { reservations, payments, whatsappApi, ai } from '../src/lib/integrations'
import { readFileSync, rmSync } from 'node:fs'

let admin: Actor, concierge: Actor, memberA: Actor, memberB: Actor

async function rejects(p: Promise<unknown>, code: string) {
  await assert.rejects(p, (e: unknown) => {
    if (e instanceof DomainError) return e.code === code || (assert.fail(`verwacht ${code}, kreeg ${e.code}`), false)
    const c = dbErrorCode(e)
    return c?.startsWith(code) || (assert.fail(`verwacht ${code}, kreeg ${String(c)} ${(e as Error).message}`), false)
  })
}

function lastMailToken(to: string): string {
  const lines = readFileSync('.dev-mailbox/mail.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { to: string; text: string })
  const mail = lines.reverse().find((m) => m.to === to)
  const match = mail?.text.match(/token=([A-Za-z0-9_-]+)/)
  if (!match) throw new Error('geen mail gevonden')
  return match[1]!
}

/** Volledige keten tot een uitgegeven voorstel; geeft ids terug. */
async function requestWithIssuedProposal(member: Actor, staff: Actor, opts: { expires?: Date; options?: number } = {}) {
  const { id } = await createRequest(member, { brief: 'Vrijdag een bijzonder diner voor twee, rond €350 samen.', category: 'dining', idempotencyKey: uuid(), partySize: 2, budget: '350', budgetBasis: 'total', desiredDate: '2026-12-04' })
  await assignOwner(staff, id, staff.userId!, '')
  await setRequestStatus(staff, id, { status: 'researching' })
  const supplier = await saveSupplier(staff, null, { name: 'Voorbeeldrestaurant (fictief)', category: 'dining', region: 'Maastricht' })
  const check = await recordAvailabilityCheck(staff, id, { supplierId: supplier.id, source: 'phone', checkedAt: new Date(), result: 'available', details: 'Tafel 20:00 vrijgehouden tot morgen' })
  const draft = await createDraftProposal(staff, id, 'Twee passende opties.')
  for (let i = 1; i <= (opts.options ?? 2); i++) {
    await upsertOption(staff, draft.id, {
      position: i, label: `Optie ${i}`, supplierId: supplier.id, priceKind: i === 1 ? 'fixed' : 'estimate', total: '320', max: i === 1 ? '' : '360',
      paymentRoute: 'pay_supplier_directly', cancellationTerms: 'Kosteloos annuleren tot 24 uur vooraf.', availabilityStatus: 'checked_available', availabilityCheckId: check.id,
    })
  }
  const { snapshotHash } = await issueProposal(staff, draft.id, opts.expires ?? new Date(Date.now() + 2 * 86400_000))
  const view = await getMyRequest(member, id)
  const proposal = view.proposals[0]!
  return { requestId: id, proposalId: draft.id, snapshotHash, optionIds: proposal.options.map((o) => o.id), supplierId: supplier.id }
}

before(async () => {
  rmSync('.dev-mailbox', { recursive: true, force: true })
  await resetDb()
  admin = await makeStaff('admin@example.com', 'admin')
  concierge = await makeStaff('concierge@example.com', 'concierge')
  memberA = await makeActiveMember('lid.a@example.com', 'Anna Voorbeeld')
  memberB = await makeActiveMember('lid.b@example.com', 'Bas Voorbeeld')
})
after(done)

describe('volledige keten verzoek → voorstel → akkoord → bevestiging', () => {
  test('lid maakt verzoek, staff ziet dezelfde opgeslagen inhoud', async () => {
    const key = uuid()
    const r1 = await createRequest(memberA, { brief: 'Weekend weg in de Ardennen', idempotencyKey: key })
    const r2 = await createRequest(memberA, { brief: 'Weekend weg in de Ardennen', idempotencyKey: key })
    assert.equal(r1.id, r2.id, 'dubbel versturen geeft hetzelfde verzoek')
    assert.equal(r2.created, false)
    const staffView = await getRequestForStaff(concierge, r1.id)
    assert.equal(staffView.request.brief, 'Weekend weg in de Ardennen')
    assert.equal(staffView.request.budgetMinor, null, 'ontbrekend budget wordt niet verzonnen')
    const tasks = staffView.tasks.filter((t) => t.type === 'info_needed')
    assert.equal(tasks.length, 1, 'ontbrekende informatie leidt tot een taak')
  })

  test('happy path met meerdere boekingsonderdelen en bewijsplicht', async () => {
    const { requestId, proposalId, snapshotHash, optionIds } = await requestWithIssuedProposal(memberA, concierge)
    assert.equal((await getMyRequest(memberA, requestId)).request.status, 'awaiting_approval')

    const res = await approveProposal(memberA, { proposalId, optionId: optionIds[0]!, snapshotHash, termsAccepted: true })
    assert.equal(res.status, 'approved')
    const again = await approveProposal(memberA, { proposalId, optionId: optionIds[0]!, snapshotHash, termsAccepted: true })
    assert.equal(again.status, 'already_approved', 'herhaalde klik maakt geen tweede akkoord')
    assert.equal(again.approvalId, res.approvalId)
    await rejects(approveProposal(memberA, { proposalId, optionId: optionIds[1]!, snapshotHash, termsAccepted: true }), 'already_approved')
    const [{ n }] = await withSystem((tx) => tx<{ n: number }[]>`select count(*)::int as n from approvals where proposal_id = ${proposalId}`) as [{ n: number }]
    assert.equal(n, 1)

    const diner = await addBooking(concierge, requestId, { title: 'Diner', supplierName: 'Voorbeeldrestaurant (fictief)', date: '2026-12-04', time: '20:00' })
    const taxi = await addBooking(concierge, requestId, { title: 'Vervoer', supplierName: 'Voorbeeldvervoer (fictief)' })

    await rejects(confirmBooking(concierge, diner.id, { confirmationSource: 'phone', checkedAt: new Date() }), 'evidence_required')
    // Ook direct in de database: geen bevestiging zonder bewijs.
    await rejects(withActor(concierge, (tx) => tx`update bookings set status = 'confirmed', confirmed_at = now() where id = ${diner.id}`), 'check_violation')

    await confirmBooking(concierge, diner.id, { supplierReference: 'RES-4821', confirmationSource: 'phone', checkedAt: new Date(), memberDetails: 'Tafel op naam Voorbeeld, 20:00' })
    let view = await getMyRequest(memberA, requestId)
    assert.equal(view.request.status, 'arranging', 'één van twee onderdelen bevestigd: niet volledig geregeld')

    await confirmBooking(concierge, taxi.id, { confirmationNote: 'Rit bevestigd per mail door de vervoerder, ophalen 19:30', confirmationSource: 'email', checkedAt: new Date() })
    view = await getMyRequest(memberA, requestId)
    assert.equal(view.request.status, 'confirmed')
    const startsAt = view.bookings.find((b) => b.title === 'Diner')!.startsAt!
    assert.equal(startsAt.toISOString(), '2026-12-04T19:00:00.000Z', 'afspraaktijd in UTC opgeslagen')

    await requestCancellation(memberA, taxi.id)
    view = await getMyRequest(memberA, requestId)
    const t = view.bookings.find((b) => b.id === taxi.id)!
    assert.equal(t.status, 'cancellation_requested', 'annulering aanvragen is lopend, niet afgerond')
    assert.ok(view.request.cancellationRequestedAt)
    await rejects(confirmCancellation(concierge, taxi.id, ''), 'evidence_required')
    await confirmCancellation(concierge, taxi.id, 'Vervoerder bevestigt annulering per mail, geen kosten')
    view = await getMyRequest(memberA, requestId)
    assert.equal(view.bookings.find((b) => b.id === taxi.id)!.status, 'cancelled')
    assert.equal(view.request.cancellationRequestedAt, null)
  })

  test('vervallen of vervangen voorstel kan niet worden goedgekeurd; uitgegeven versie is onveranderlijk', async () => {
    const a = await requestWithIssuedProposal(memberA, concierge)
    await rejects(approveProposal(memberA, { proposalId: a.proposalId, optionId: a.optionIds[0]!, snapshotHash: 'x'.repeat(64), termsAccepted: true }), 'proposal_changed')
    await rejects(approveProposal(memberA, { proposalId: a.proposalId, optionId: a.optionIds[0]!, snapshotHash: a.snapshotHash, termsAccepted: false }), 'invalid_input')

    // Onveranderlijkheid in de database
    await rejects(withActor(concierge, (tx) => tx`update proposal_options set total_minor = 1 where proposal_id = ${a.proposalId}`), 'proposal_immutable')
    await rejects(withActor(concierge, (tx) => tx`update proposals set intro = 'anders' where id = ${a.proposalId}`), 'proposal_immutable')

    // Nieuwe versie vervangt de oude
    const v2 = await createDraftProposal(concierge, a.requestId)
    assert.equal(v2.version, 2)
    await upsertOption(concierge, v2.id, { position: 1, label: 'Nieuwe optie', supplierName: 'X (fictief)', priceKind: 'fixed', total: '400', paymentRoute: 'pay_supplier_directly', cancellationTerms: 'Tot 48 uur kosteloos.', availabilityStatus: 'tentative' })
    const issued2 = await issueProposal(concierge, v2.id, new Date(Date.now() + 86400_000))
    await rejects(approveProposal(memberA, { proposalId: a.proposalId, optionId: a.optionIds[0]!, snapshotHash: a.snapshotHash, termsAccepted: true }), 'proposal_not_current')

    // Verlopen: vervaldatum in het verleden zetten via de systeemrol is door de trigger geblokkeerd, dus testen we met een kort geldige versie.
    const v3req = await requestWithIssuedProposal(memberA, concierge, { expires: new Date(Date.now() + 6 * 60_000) })
    await asOwner(async (sql) => {
      await sql`alter table proposals disable trigger proposals_guard`
      await sql`update proposals set expires_at = now() - interval '1 minute', issued_at = now() - interval '2 minutes' where id = ${v3req.proposalId}`
      await sql`alter table proposals enable trigger proposals_guard`
    })
    await rejects(approveProposal(memberA, { proposalId: v3req.proposalId, optionId: v3req.optionIds[0]!, snapshotHash: v3req.snapshotHash, termsAccepted: true }), 'proposal_expired')
    assert.ok(issued2.snapshotHash)
  })

  test('gelijktijdige akkoordklikken leveren één akkoord op', async () => {
    const a = await requestWithIssuedProposal(memberA, concierge)
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => approveProposal(memberA, { proposalId: a.proposalId, optionId: a.optionIds[0]!, snapshotHash: a.snapshotHash, termsAccepted: true })))
    const ok = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{ status: string; approvalId: string }>[]
    assert.equal(ok.length, 5)
    assert.equal(new Set(ok.map((r) => r.value.approvalId)).size, 1)
    assert.equal(ok.filter((r) => r.value.status === 'approved').length, 1)
  })

  test('bevestigen zonder akkoord kan niet', async () => {
    const { id } = await createRequest(memberB, { brief: 'Cadeau voor een jubileum', idempotencyKey: uuid() })
    await rejects(addBooking(concierge, id, { title: 'Cadeau', supplierName: 'Winkel (fictief)' }), 'approval_required')
  })

  test('ongeldige statuswissel wordt door de database geweigerd', async () => {
    const { id } = await createRequest(memberB, { brief: 'Chauffeur naar Schiphol', idempotencyKey: uuid() })
    await rejects(withActor(concierge, (tx) => tx`update requests set status = 'confirmed', owner_id = ${concierge.userId} where id = ${id}`), 'invalid_request_transition')
    await rejects(setRequestStatus(concierge, id, { status: 'confirmed' }), 'invalid_input')
  })
})

describe('autorisatie en privacy (RLS met gewone sessies)', () => {
  test('lid A kan data van lid B niet lezen of aanpassen', async () => {
    const { id: bReq } = await createRequest(memberB, { brief: 'Privé verzoek van B', idempotencyKey: uuid() })
    await rejects(getMyRequest(memberA, bReq), 'not_found')
    const direct = await withActor(memberA, (tx) => tx`select * from requests where id = ${bReq}`)
    assert.equal(direct.length, 0, 'directe query onder RLS ziet niets')
    const all = await withActor(memberA, (tx) => tx<{ memberId: string }[]>`select member_id from requests`)
    assert.ok(all.every((r) => r.memberId === memberA.userId))
    const upd = await withActor(memberA, (tx) => tx`update requests set brief = 'gehackt' where id = ${bReq} returning id`)
    assert.equal(upd.length, 0)
    await rejects(addMemberMessage(memberA, bReq, 'hallo', uuid()), 'not_found')
    // Bericht in andermans dossier via directe insert: RLS weigert
    await rejects(withActor(memberA, (tx) => tx`insert into request_messages (request_id, author_id, sender_type, body, client_key) values (${bReq}, ${memberA.userId}, 'member', 'x', 'k')`), 'permission_denied')
    // Verzoek aanmaken op naam van B
    await rejects(withActor(memberA, (tx) => tx`insert into requests (member_id, brief, idempotency_key, created_by) values (${memberB.userId}, 'x', 'k', ${memberA.userId})`), 'permission_denied')
    const mine = await listMyRequests(memberA)
    assert.ok(!mine.some((r) => r.id === bReq))
  })

  test('lid ziet geen interne notities, commissies, staffrollen of deelnemerslijsten', async () => {
    const { id } = await createRequest(memberA, { brief: 'Hotel in Maastricht', idempotencyKey: uuid() })
    await addInternalNote(concierge, { requestId: id }, 'Intern: lid is prijsgevoelig')
    for (const table of ['internal_notes', 'supplier_terms', 'suppliers', 'tasks', 'time_entries', 'availability_checks', 'audit_events', 'society_participations', 'app_settings', 'notification_outbox']) {
      const rows = await withActor(memberA, (tx) => tx.unsafe(`select * from ${table}`))
      if (table === 'society_participations' || table === 'audit_events') {
        // eigen deelname mag; audit is alleen staff
        assert.ok(rows.every((r: Record<string, unknown>) => table !== 'society_participations' || r.memberId === memberA.userId), table)
        if (table === 'audit_events') assert.equal(rows.length, 0, table)
      } else {
        assert.equal(rows.length, 0, `${table} is onzichtbaar voor een lid`)
      }
    }
    const roles = await withActor(memberA, (tx) => tx`select * from staff_roles`)
    assert.equal(roles.length, 0)
    for (const t of ['sessions', 'login_tokens', 'staff_mfa']) {
      await rejects(withActor(memberA, (tx) => tx.unsafe(`select * from ${t}`)), 'permission_denied')
    }
  })

  test('niet-ingelogde bezoeker kan geen klantdata opvragen', async () => {
    for (const table of ['profiles', 'requests', 'memberships', 'applications', 'billing_records', 'bookings', 'invitations', 'request_messages', 'society_events']) {
      const rows = await withActor(ANONYMOUS, (tx) => tx.unsafe(`select * from ${table}`))
      assert.equal(rows.length, 0, table)
    }
  })

  test('een client kan eigen rol of lidmaatschapsstatus niet promoveren', async () => {
    await rejects(withActor(memberA, (tx) => tx`insert into staff_roles (user_id, role) values (${memberA.userId}, 'admin')`), 'permission_denied')
    const upd = await withActor(memberA, (tx) => tx`update memberships set status = 'active', is_complimentary = true where user_id = ${memberA.userId} returning id`)
    assert.equal(upd.length, 0)
    await rejects(withActor(memberA, (tx) => tx`update profiles set email = 'x@example.com' where id = ${memberA.userId}`), 'permission_denied')
    // Zelfs een concierge die zichzelf admin wil maken: geweigerd
    await rejects(withActor(concierge, (tx) => tx`update staff_roles set role = 'admin' where user_id = ${concierge.userId}`).then((r) => { if (r.length === 0) throw Object.assign(new Error('rls'), { code: '42501' }) }), 'permission_denied')
    // Staffrol zonder geverifieerde sessie (bijv. zonder MFA) geeft geen staffrechten
    const unverified: Actor = { userId: concierge.userId, staffVerified: false, staffRole: null }
    const rows = await withActor(unverified, (tx) => tx`select * from internal_notes`)
    assert.equal(rows.length, 0)
  })

  test('uitloggen en sessieverval maken de sessie ongeldig', async () => {
    const s = await createSession(concierge.userId!)
    const loaded = await loadSession(s.token)
    assert.ok(loaded)
    assert.equal(loaded.staffRole, 'concierge')
    assert.equal(actorFromSession(loaded).staffVerified, false, 'zonder MFA geen staffrechten')
    await revokeSession(loaded.sessionId)
    assert.equal(await loadSession(s.token), null)
    const s2 = await createSession(memberA.userId!)
    await withSystem((tx) => tx`update sessions set expires_at = now() - interval '1 second' where token_hash = encode(sha256(convert_to(${s2.token}, 'UTF8')), 'hex')`)
    assert.equal(await loadSession(s2.token), null)
  })

  test('beëindigd lid ziet eigen historie maar opent geen nieuw verzoek', async () => {
    const m = await makeActiveMember('lid.c@example.com', 'Carla Voorbeeld')
    const { id } = await createRequest(m, { brief: 'Diner op zaterdag', idempotencyKey: uuid() })
    const [ms] = await withSystem((tx) => tx<{ id: string }[]>`select id from memberships where user_id = ${m.userId}`)
    await changeMembershipStatus(admin, ms!.id, 'end_now', { reason: 'Test' })
    const view = await getMyRequest(m, id)
    assert.equal(view.request.id, id)
    await rejects(createRequest(m, { brief: 'Nog eentje', idempotencyKey: uuid() }), 'membership_not_active')
    // Ook direct in de database geweigerd
    await rejects(withActor(m, (tx) => tx`insert into requests (member_id, brief, idempotency_key, created_by) values (${m.userId}, 'x', 'k2', ${m.userId})`), 'permission_denied')
  })
})

describe('aanmelding, uitnodiging en lidmaatschap', () => {
  test('aanmelding maakt niemand automatisch staff of actief lid; volledige activatieroute', async () => {
    const key = uuid()
    const input = { fullName: 'Daan Kandidaat', email: 'daan@example.com', helpRequest: 'Regelmatig zakelijke diners', privacyAck: true, idempotencyKey: key, preferredContact: 'email' }
    const r = await submitApplication(input, 'ip-1')
    assert.equal(r.ok, true)
    const r2 = await submitApplication(input, 'ip-1')
    assert.ok(r.ok && r2.ok && r.applicationId === r2.applicationId, 'refresh/dubbel versturen verliest of verdubbelt niets')
    const token = lastMailToken('daan@example.com')
    const consumed = await consumeToken(token)
    assert.ok(consumed.ok)
    assert.equal((await consumeToken(token)).ok, false, 'link werkt één keer')
    if (!consumed.ok) return
    await finalizeApplicationVerification(consumed.applicationId!, consumed.userId)
    const cand = memberActor(consumed.userId)
    const [role] = await withSystem((tx) => tx`select * from staff_roles where user_id = ${consumed.userId}`)
    assert.equal(role, undefined)
    await rejects(createRequest(cand, { brief: 'Mag ik al?', idempotencyKey: uuid() }), 'membership_not_active')

    const offer = await issueMembershipOffer(concierge, r.ok ? r.applicationId : '')
    const open = await getMyOpenOffer(cand)
    assert.ok(open)
    assert.equal(open.priceMinor, 49500)
    await rejects(acceptMembershipOffer(cand, open.id, 'verkeerd'), 'proposal_changed')
    await acceptMembershipOffer(cand, open.id, open.snapshotHash)
    await rejects(activateMembership(concierge, offer.membershipId), 'forbidden')
    await rejects(activateMembership(admin, offer.membershipId), 'payment_required')
    const bill = await createBillingRecord(admin, { memberId: consumed.userId, kind: 'membership', membershipId: offer.membershipId, description: 'Lidmaatschap december', amountMinor: 49500, amountIncludesTax: true, taxRateBp: 2100 })
    assert.equal(bill.netMinor + bill.taxMinor, bill.grossMinor)
    await rejects(registerPayment(concierge, { billingId: bill.id, kind: 'payment', amountMinor: 49500, method: 'bank_transfer', reference: 'NL-REF-1', occurredAt: new Date() }), 'forbidden')
    const pay = await registerPayment(admin, { billingId: bill.id, kind: 'payment', amountMinor: 50000, method: 'bank_transfer', reference: 'NL-REF-1', occurredAt: new Date() })
    assert.equal(pay.balance.state, 'overpaid')
    await registerPayment(admin, { billingId: bill.id, kind: 'correction', amountMinor: 500, method: 'bank_transfer', reference: 'Correctie typefout', correctsPaymentId: pay.id, occurredAt: new Date() })
    await rejects(registerPayment(admin, { billingId: bill.id, kind: 'refund', amountMinor: 60000, method: 'bank_transfer', reference: 'te veel', occurredAt: new Date() }), 'invalid_input')
    const bills = await listBilling(cand)
    assert.equal(bills.length, 1)
    assert.equal(bills[0]!.balance.state, 'paid')
    assert.ok(bills[0]!.payments.every((p) => p.isManual), 'handmatig geregistreerd is herkenbaar')
    // Betalingen zijn append-only
    await rejects(withSystem((tx) => tx`update payment_records set amount_minor = 1 where id = ${pay.id}`), 'append_only_table')
    await activateMembership(admin, offer.membershipId)
    const req = await createRequest(cand, { brief: 'Eerste opdracht', idempotencyKey: uuid() })
    assert.ok(req.created)
  })

  test('uitnodiging: eenmalige claim, verwijzer onthullen met toestemming, intrekken en verval', async () => {
    const inv = await createMemberInvitation(memberA, { displayName: 'Anna', revealConsent: true })
    const token = inv.url.split('/invite/')[1]!
    const [stored] = await withSystem((tx) => tx<{ tokenHash: string }[]>`select token_hash from invitations where id = ${inv.id}`)
    assert.notEqual(stored!.tokenHash, token, 'alleen de hash wordt opgeslagen')
    assert.ok(token.length >= 40, 'minimaal 128 bits entropie (hier 256)')
    const view = await inspectInvitation(token)
    assert.deepEqual(view, { valid: true, kind: 'member', canReveal: true })
    assert.deepEqual(await inspectInvitation(token), view, 'openen verbruikt de link niet')
    const rev = await revealInviter(token, 'ip-2')
    assert.deepEqual(rev, { ok: true, name: 'Anna', team: false })

    // Twee kandidaten met dezelfde link, gelijktijdig geverifieerd: maximaal één eigenaar.
    const ids: string[] = []
    for (const email of ['k1@example.com', 'k2@example.com']) {
      const r = await submitApplication({ fullName: 'Kandidaat', email, helpRequest: 'Graag kennismaken', privacyAck: true, idempotencyKey: uuid(), invitationToken: token }, 'ip-3')
      assert.ok(r.ok)
      const c = await consumeToken(lastMailToken(email))
      assert.ok(c.ok)
      if (c.ok) ids.push(`${c.applicationId}|${c.userId}`)
    }
    const results = await Promise.all(ids.map((x) => { const [a, u] = x.split('|'); return finalizeApplicationVerification(a!, u!) }))
    assert.equal(results.filter((r) => r.claimed === true).length, 1)
    assert.equal(results.filter((r) => r.claimed === false).length, 1)
    const [inv2] = await withSystem((tx) => tx<{ claimedApplicationId: string | null }[]>`select claimed_application_id from invitations where id = ${inv.id}`)
    assert.ok(inv2!.claimedApplicationId)
    assert.deepEqual(await inspectInvitation(token), { valid: false }, 'geclaimde link is niet meer geldig')

    // Verwijzer ziet alleen de status
    const own = await listOwnInvitations(memberA)
    assert.equal(own.find((i) => i.id === inv.id)!.state, 'claimed')
    assert.ok(!('claimedApplicationId' in own[0]!))

    // Intrekken
    const inv3 = await createMemberInvitation(memberA, { revealConsent: false })
    const t3 = inv3.url.split('/invite/')[1]!
    assert.deepEqual(await inspectInvitation(t3), { valid: true, kind: 'member', canReveal: false })
    assert.deepEqual(await revealInviter(t3, 'ip-4'), { ok: true, name: null, team: false }, 'zonder toestemming geen naam')
    await rejects(revokeInvitation(memberB, inv3.id), 'not_found')
    await revokeInvitation(memberA, inv3.id)
    assert.deepEqual(await inspectInvitation(t3), { valid: false })

    // Verlopen
    const inv4 = await createMemberInvitation(memberA, { revealConsent: false })
    await withSystem((tx) => tx`update invitations set expires_at = now() - interval '1 second' where id = ${inv4.id}`)
    assert.deepEqual(await inspectInvitation(inv4.url.split('/invite/')[1]!), { valid: false })
    assert.deepEqual(await inspectInvitation('onzin'), { valid: false })
  })

  test('uitnodigingslimiet per lid geldt ook bij gelijktijdige aanvragen', async () => {
    const m = await makeActiveMember('limiet@example.com', 'Limiet Lid')
    const res = await Promise.allSettled(Array.from({ length: 6 }, () => createMemberInvitation(m, { revealConsent: false })))
    assert.equal(res.filter((r) => r.status === 'fulfilled').length, 3)
  })

  test('inloggen: generieke respons en eenmalige link', async () => {
    const r1 = await requestLoginLink('bestaat.niet@example.com', 'ip-9')
    const r2 = await requestLoginLink('lid.a@example.com', 'ip-9')
    assert.deepEqual(r1, r2, 'zelfde respons voor bekend en onbekend adres')
    const c = await consumeToken(lastMailToken('lid.a@example.com'))
    assert.ok(c.ok)
  })
})

describe('Society', () => {
  test('laatste plek kan niet dubbel worden toegewezen; capaciteit niet onder bevestigd aantal', async () => {
    const ev = await saveEvent(concierge, null, { title: 'Private dinner (voorbeeld)', summary: 'Intiem diner', date: '2026-12-12', time: '19:00', capacity: 2 })
    await setEventStatus(concierge, ev.id, 'open')
    const m3 = await makeActiveMember('society3@example.com', 'Sanne Voorbeeld')
    const outsider = await makeActiveMember('society4@example.com', 'Niet Uitgenodigd')
    await inviteMembers(concierge, ev.id, [memberA.userId!, memberB.userId!, m3.userId!])
    assert.equal((await listMyEvents(outsider)).length, 0, 'niet uitgenodigd = onzichtbaar')
    await rejects(registerInterest(outsider, ev.id, 1, ''), 'not_found')
    for (const m of [memberA, memberB, m3]) await registerInterest(m, ev.id, 1, '')
    const staffView = await getEventForStaff(concierge, ev.id)
    assert.equal(staffView.participants.length, 3)
    for (const p of staffView.participants) await offerPlace(concierge, p.id, { offerText: 'Deelname €95 p.p., te voldoen bij bevestiging', price: '95', paymentRequired: false })
    for (const m of [memberA, memberB, m3]) await acceptPlaceOffer(m, ev.id)
    // Interesse is geen verkochte stoel
    const mine = await listMyEvents(memberA)
    assert.equal(mine[0]!.participation!.status, 'offered')

    await confirmPlace(concierge, staffView.participants[0]!.id)
    const results = await Promise.allSettled([confirmPlace(concierge, staffView.participants[1]!.id), confirmPlace(admin, staffView.participants[2]!.id)])
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1, 'precies één krijgt de laatste plek')
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
    assert.equal((rejected.reason as DomainError).code, 'society_capacity_exceeded')
    await rejects(saveEvent(concierge, ev.id, { title: 'Private dinner (voorbeeld)', summary: 'Intiem diner', date: '2026-12-12', time: '19:00', capacity: 1 }), 'society_capacity_below_confirmed')
    // Lid ziet geen deelnemerslijst
    const visible = await withActor(memberA, (tx) => tx<{ memberId: string }[]>`select member_id from society_participations where event_id = ${ev.id}`)
    assert.equal(visible.length, 1)
  })
})

describe('integraties', () => {
  test('ongeconfigureerde integraties simuleren geen succes', async () => {
    for (const fn of [reservations.checkAvailability, reservations.createBooking, reservations.cancelBooking, payments.createCheckout, whatsappApi.sendMessage, ai.draftReply]) {
      assert.deepEqual(await fn(), { status: 'not_configured' })
    }
  })

  test('profiel zonder lidmaatschap kan niets', async () => {
    const id = await makeProfile('los@example.com', 'Los Profiel')
    await rejects(createRequest(memberActor(id), { brief: 'test', idempotencyKey: uuid() }), 'membership_not_active')
    await rejects(createMemberInvitation(memberActor(id), { revealConsent: false }), 'membership_not_active')
  })
})
