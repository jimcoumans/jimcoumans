/**
 * Voorstellen: versies met maximaal drie opties. Uitgegeven versies zijn
 * onveranderlijk (databasetrigger). Een lid accepteert exact één optie van
 * de exacte versie (snapshot-hash), vóór de vervaldatum. Herhaald klikken
 * maakt geen tweede akkoord (unique op proposal_id + idempotente afhandeling).
 */
import { z } from 'zod'
import { withActor, withSystem, dbErrorCode, type Tx } from '../db-core'
import type { Actor } from '../actor'
import { fail, DomainError } from '../errors'
import { snapshotHash } from '../crypto'
import { parseEuroInput } from '../money'
import { audit } from './audit'
import type { ProposalOptionRow } from './requests'

export async function createDraftProposal(actor: Actor, requestId: string, intro = ''): Promise<{ id: string; version: number }> {
  if (!actor.staffVerified) fail('forbidden')
  return withActor(actor, async (tx) => {
    const [r] = await tx<{ status: string }[]>`select status from requests where id = ${requestId} for update`
    if (!r) fail('not_found')
    if (['completed', 'closed', 'rejected', 'cancelled'].includes(r.status)) fail('invalid_input', 'Dit verzoek is afgesloten.')
    const [draft] = await tx<{ id: string; version: number }[]>`select id, version from proposals where request_id = ${requestId} and status = 'draft'`
    if (draft) return draft
    const [{ next } = { next: 1 }] = await tx<{ next: number }[]>`select coalesce(max(version), 0)::int + 1 as next from proposals where request_id = ${requestId}`
    const [p] = await tx<{ id: string; version: number }[]>`
      insert into proposals (request_id, version, intro, created_by) values (${requestId}, ${next}, ${intro || null}, ${actor.userId}) returning id, version`
    await audit(tx, actor, 'proposal.draft', 'proposal', p!.id, null, { requestId, version: next })
    return p!
  })
}

export const optionInputSchema = z.object({
  position: z.coerce.number().int().min(1).max(3),
  label: z.string().trim().min(2).max(160),
  description: z.string().trim().max(3000).optional().default(''),
  supplierId: z.string().uuid().optional().or(z.literal('')).default(''),
  supplierName: z.string().trim().max(160).optional().default(''),
  included: z.string().trim().max(2000).optional().default(''),
  excluded: z.string().trim().max(2000).optional().default(''),
  priceKind: z.enum(['fixed', 'estimate']),
  total: z.string().trim().min(1).max(30),
  max: z.string().trim().max(30).optional().default(''),
  taxNote: z.string().trim().max(300).optional().default(''),
  paymentRoute: z.enum(['pay_supplier_directly', 'invoice_via_james', 'prepaid_by_member']),
  cancellationTerms: z.string().trim().min(3, 'Annuleringsvoorwaarden zijn verplicht.').max(2000),
  availabilityStatus: z.enum(['checked_available', 'tentative', 'to_be_checked']),
  availabilityCheckId: z.string().uuid().optional().or(z.literal('')).default(''),
})

export async function upsertOption(actor: Actor, proposalId: string, input: unknown): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  const parsed = optionInputSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input', parsed.error.issues[0]?.message)
  const d = parsed.data
  const total = parseEuroInput(d.total)
  const max = d.max ? parseEuroInput(d.max) : null
  if (total == null) fail('invalid_input', 'Bedrag niet herkend.')
  if (d.priceKind === 'estimate' && (max == null || max < total)) fail('invalid_input', 'Bij een raming hoort een afgesproken maximum (≥ raming).')
  if (d.availabilityStatus === 'checked_available' && !d.availabilityCheckId) fail('invalid_input', 'Koppel een vastgelegde beschikbaarheidscheck.')
  await withActor(actor, async (tx) => {
    const [p] = await tx<{ status: string; requestId: string }[]>`select status, request_id from proposals where id = ${proposalId} for update`
    if (!p) fail('not_found')
    if (p.status !== 'draft') fail('invalid_input', 'Een uitgegeven voorstel is onveranderlijk. Maak een nieuwe versie.')
    let supplierName = d.supplierName || null
    if (d.supplierId) {
      const [s] = await tx<{ name: string }[]>`select name from suppliers where id = ${d.supplierId}`
      if (!s) fail('invalid_input')
      supplierName = s.name
    }
    if (d.availabilityCheckId) {
      const [c] = await tx<{ requestId: string; result: string; validUntil: Date | null }[]>`select request_id, result, valid_until from availability_checks where id = ${d.availabilityCheckId}`
      if (!c || c.requestId !== p.requestId) fail('invalid_input')
      if (d.availabilityStatus === 'checked_available' && c.result !== 'available') fail('invalid_input', 'De gekoppelde check toont geen beschikbaarheid.')
    }
    await tx`
      insert into proposal_options (proposal_id, position, label, description, supplier_id, supplier_name, included, excluded, price_kind,
        total_minor, max_minor, currency, tax_note, payment_route, cancellation_terms, availability_status, availability_check_id)
      values (${proposalId}, ${d.position}, ${d.label}, ${d.description || null}, ${d.supplierId || null}, ${supplierName}, ${d.included || null},
        ${d.excluded || null}, ${d.priceKind}, ${total}, ${d.priceKind === 'estimate' ? max : null}, 'EUR', ${d.taxNote || null}, ${d.paymentRoute},
        ${d.cancellationTerms}, ${d.availabilityStatus}, ${d.availabilityCheckId || null})
      on conflict (proposal_id, position) do update set label = excluded.label, description = excluded.description, supplier_id = excluded.supplier_id,
        supplier_name = excluded.supplier_name, included = excluded.included, excluded = excluded.excluded, price_kind = excluded.price_kind,
        total_minor = excluded.total_minor, max_minor = excluded.max_minor, tax_note = excluded.tax_note, payment_route = excluded.payment_route,
        cancellation_terms = excluded.cancellation_terms, availability_status = excluded.availability_status, availability_check_id = excluded.availability_check_id`
  })
}

export async function removeOption(actor: Actor, proposalId: string, position: number): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  await withSystem(async (tx) => {
    // Leden en de app-rol hebben geen DELETE; de trigger blokkeert het voor uitgegeven versies.
    await tx`delete from proposal_options where proposal_id = ${proposalId} and position = ${position}`
  })
}

export function buildSnapshot(p: { id: string; requestId: string; version: number; intro: string | null; expiresAt: Date }, options: ProposalOptionRow[]) {
  return {
    proposalId: p.id, requestId: p.requestId, version: p.version, intro: p.intro, expiresAt: p.expiresAt.toISOString(),
    options: options.map((o) => ({
      id: o.id, position: o.position, label: o.label, description: o.description, supplierName: o.supplierName,
      included: o.included, excluded: o.excluded, priceKind: o.priceKind, totalMinor: o.totalMinor, maxMinor: o.maxMinor,
      currency: o.currency, taxNote: o.taxNote, paymentRoute: o.paymentRoute, cancellationTerms: o.cancellationTerms,
      availabilityStatus: o.availabilityStatus,
    })),
  }
}

/** Uitgeven: versie vastzetten, eerdere uitgegeven versie vervangen, verzoek naar awaiting_approval. */
export async function issueProposal(actor: Actor, proposalId: string, expiresAt: Date, intro?: string): Promise<{ snapshotHash: string }> {
  if (!actor.staffVerified) fail('forbidden')
  if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now() + 5 * 60_000) {
    fail('invalid_input', 'Kies een vervaldatum in de toekomst.')
  }
  return withActor(actor, async (tx) => {
    const [p] = await tx<{ id: string; requestId: string; version: number; status: string; intro: string | null }[]>`
      select id, request_id, version, status, intro from proposals where id = ${proposalId} for update`
    if (!p) fail('not_found')
    if (p.status !== 'draft') fail('invalid_input', 'Dit voorstel is al uitgegeven.')
    const [r] = await tx<{ status: string; ownerId: string | null }[]>`select status, owner_id from requests where id = ${p.requestId} for update`
    if (!r) fail('not_found')
    if (r.status === 'confirmed') fail('invalid_input', 'Bij een wijziging na bevestiging: zet het verzoek eerst terug naar regelen.')
    if (['completed', 'closed', 'rejected', 'cancelled'].includes(r.status)) fail('invalid_input', 'Dit verzoek is afgesloten.')
    const options = await tx<ProposalOptionRow[]>`select * from proposal_options where proposal_id = ${proposalId} order by position`
    if (options.length < 1 || options.length > 3) fail('invalid_input', 'Een voorstel heeft één tot drie opties.')
    const finalIntro = intro !== undefined ? intro.trim() || null : p.intro
    const snap = buildSnapshot({ id: p.id, requestId: p.requestId, version: p.version, intro: finalIntro, expiresAt }, options)
    const hash = snapshotHash(snap)
    await tx`update proposals set status = 'superseded' where request_id = ${p.requestId} and status = 'issued'`
    await tx`update proposals set intro = ${finalIntro}, status = 'issued', issued_at = now(), expires_at = ${expiresAt}, issued_by = ${actor.userId},
             snapshot = ${tx.json(snap as never)}, snapshot_hash = ${hash} where id = ${proposalId}`
    // Statusmachine: new/needs_info -> researching -> awaiting_approval; arranging -> researching -> awaiting_approval.
    if (['new', 'needs_info', 'arranging'].includes(r.status)) {
      await tx`update requests set status = 'researching', owner_id = coalesce(owner_id, ${actor.userId}) where id = ${p.requestId}`
    }
    await tx`update requests set status = 'awaiting_approval', waiting_on = 'member', owner_id = coalesce(owner_id, ${actor.userId}),
             next_action = 'Wacht op keuze van het lid', next_action_due_at = ${expiresAt} where id = ${p.requestId}`
    await tx`insert into request_messages (request_id, author_id, sender_type, body, channel, client_key)
             values (${p.requestId}, ${actor.userId}, 'system', ${`Er staat een voorstel (versie ${p.version}) voor u klaar.`}, 'portal', ${'proposal-' + p.id})
             on conflict (request_id, client_key) do nothing`
    await audit(tx, actor, 'proposal.issue', 'proposal', p.id, null, { requestId: p.requestId, version: p.version, snapshotHash: hash })
    return { snapshotHash: hash }
  })
}

export async function withdrawProposal(actor: Actor, proposalId: string): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  await withActor(actor, async (tx) => {
    const [p] = await tx<{ status: string; requestId: string }[]>`select status, request_id from proposals where id = ${proposalId} for update`
    if (!p || p.status !== 'issued') fail('invalid_input')
    await tx`update proposals set status = 'withdrawn' where id = ${proposalId}`
    await tx`update requests set status = 'researching', waiting_on = null where id = ${p.requestId} and status = 'awaiting_approval'`
    await audit(tx, actor, 'proposal.withdraw', 'proposal', proposalId, null, { requestId: p.requestId })
  })
}

/** Markeert verlopen uitgegeven voorstellen als expired. Idempotent. */
export async function expireProposals(tx?: Tx): Promise<void> {
  const run = (t: Tx) => t`update proposals set status = 'expired' where status = 'issued' and expires_at <= now()`
  if (tx) await run(tx)
  else await withSystem(run)
}

export type ApproveResult = { status: 'approved' | 'already_approved'; approvalId: string }

/**
 * Akkoord door het lid. Eerst onder RLS: is het voorstel van dit lid? Dan in
 * één systeemtransactie met rijlock: geldig, niet verlopen, actuele versie,
 * exacte optie, hash gelijk. Verzoek gaat naar 'arranging'.
 */
export async function approveProposal(actor: Actor, input: { proposalId: string; optionId: string; snapshotHash: string; termsAccepted: boolean }): Promise<ApproveResult> {
  if (!actor.userId) fail('forbidden')
  if (!input.termsAccepted) fail('invalid_input', 'Accepteer de kosten en voorwaarden van de gekozen optie.')
  const visible = await withActor(actor, async (tx) => {
    const [row] = await tx<{ requestId: string }[]>`select request_id from proposals where id = ${input.proposalId}`
    return row ?? null
  })
  if (!visible) fail('not_found')
  try {
    return await withSystem(async (tx) => {
      const [p] = await tx<{ id: string; requestId: string; status: string; expiresAt: Date; snapshot: ReturnType<typeof buildSnapshot>; snapshotHash: string }[]>`
        select id, request_id, status, expires_at, snapshot, snapshot_hash from proposals where id = ${input.proposalId} for update`
      if (!p) fail('not_found')
      const [r] = await tx<{ memberId: string; status: string }[]>`select member_id, status from requests where id = ${p.requestId} for update`
      if (!r || r.memberId !== actor.userId) fail('forbidden')
      const [existing] = await tx<{ id: string; optionId: string }[]>`select id, option_id from approvals where proposal_id = ${p.id}`
      if (existing) {
        if (existing.optionId === input.optionId) return { status: 'already_approved' as const, approvalId: existing.id }
        fail('already_approved')
      }
      if (p.status === 'expired' || (p.status === 'issued' && new Date(p.expiresAt).getTime() <= Date.now())) {
        if (p.status === 'issued') await tx`update proposals set status = 'expired' where id = ${p.id}`
        fail('proposal_expired')
      }
      if (p.status !== 'issued') fail('proposal_not_current')
      if (p.snapshotHash !== input.snapshotHash) fail('proposal_changed')
      const chosen = p.snapshot.options.find((o) => o.id === input.optionId)
      if (!chosen) fail('invalid_input', 'Kies precies één optie uit dit voorstel.')
      if (r.status !== 'awaiting_approval') fail('proposal_not_current')
      const acceptedSnapshot = { proposal: p.snapshot, chosenOptionId: chosen.id }
      const [a] = await tx<{ id: string }[]>`
        insert into approvals (proposal_id, option_id, member_id, accepted_snapshot, snapshot_hash, accepted_total_minor, accepted_max_minor, currency, terms_accepted)
        values (${p.id}, ${chosen.id}, ${actor.userId}, ${tx.json(acceptedSnapshot as never)}, ${p.snapshotHash}, ${chosen.totalMinor},
                ${chosen.maxMinor}, ${chosen.currency}, true)
        returning id`
      await tx`update proposals set status = 'accepted' where id = ${p.id}`
      await tx`update requests set status = 'arranging', waiting_on = null, next_action = 'Boeking maken bij leverancier en bevestiging vastleggen',
               next_action_due_at = now() + interval '4 hours' where id = ${p.requestId}`
      await audit(tx, actor, 'proposal.approve', 'approval', a!.id, null, {
        requestId: p.requestId, proposalId: p.id, optionId: chosen.id, totalMinor: chosen.totalMinor, maxMinor: chosen.maxMinor, snapshotHash: p.snapshotHash,
      })
      return { status: 'approved' as const, approvalId: a!.id }
    })
  } catch (e) {
    if (e instanceof DomainError) throw e
    // Gelijktijdige dubbelklik: de unieke index op approvals.proposal_id vangt de tweede.
    if (dbErrorCode(e)?.startsWith('unique_violation')) {
      const [a] = await withSystem((tx) => tx<{ id: string; optionId: string }[]>`select id, option_id from approvals where proposal_id = ${input.proposalId}`)
      if (a && a.optionId === input.optionId) return { status: 'already_approved', approvalId: a.id }
      fail('already_approved')
    }
    throw e
  }
}
