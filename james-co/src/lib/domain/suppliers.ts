/** Leveranciersbestand (intern). Geen "preferred partner"-badge zonder vastgelegde verificatie. */
import { z } from 'zod'
import { withActor } from '../db-core'
import type { Actor } from '../actor'
import { fail } from '../errors'
import { audit } from './audit'
import { CATEGORIES } from './requests'

export type Supplier = {
  id: string; name: string; category: string; region: string | null; contactName: string | null; email: string | null; phone: string | null
  website: string | null; reachability: string | null; serviceLevel: string | null; bookingMethod: string | null; emergencyContact: string | null
  verificationStatus: 'unverified' | 'verified' | 'inactive'; lastVerifiedAt: Date | null; isDemo: boolean; createdAt: Date
}

const supplierSchema = z.object({
  name: z.string().trim().min(2).max(160),
  category: z.enum(CATEGORIES),
  region: z.string().trim().max(120).optional().default(''),
  contactName: z.string().trim().max(120).optional().default(''),
  email: z.string().trim().max(200).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  website: z.string().trim().max(300).optional().default(''),
  reachability: z.string().trim().max(300).optional().default(''),
  serviceLevel: z.string().trim().max(300).optional().default(''),
  bookingMethod: z.string().trim().max(300).optional().default(''),
  emergencyContact: z.string().trim().max(300).optional().default(''),
})

export async function listSuppliers(actor: Actor, filter: { category?: string; q?: string } = {}) {
  if (!actor.staffVerified) fail('forbidden')
  return withActor(actor, (tx) => tx<(Supplier & { activeTerms: number })[]>`
    select s.*, (select count(*)::int from supplier_terms t where t.supplier_id = s.id and (t.valid_until is null or t.valid_until >= current_date)) as active_terms
    from suppliers s
    where true ${filter.category ? tx`and s.category = ${filter.category}` : tx``}
      ${filter.q ? tx`and (s.name ilike ${'%' + filter.q + '%'} or s.region ilike ${'%' + filter.q + '%'})` : tx``}
    order by s.verification_status = 'inactive', s.name`)
}

export async function getSupplier(actor: Actor, id: string) {
  if (!actor.staffVerified) fail('forbidden')
  return withActor(actor, async (tx) => {
    const [supplier] = await tx<Supplier[]>`select * from suppliers where id = ${id}`
    if (!supplier) fail('not_found')
    const terms = await tx<{ id: string; validFrom: string; validUntil: string | null; agreement: string; commissionBasis: string | null; commissionBp: number | null; createdAt: Date }[]>`
      select id, valid_from, valid_until, agreement, commission_basis, commission_bp, created_at from supplier_terms where supplier_id = ${id} order by valid_from desc`
    const contacts = await tx<{ id: string; channel: string; summary: string; createdAt: Date; staffName: string | null; requestId: string | null }[]>`
      select c.id, c.channel, c.summary, c.created_at, p.full_name as staff_name, c.request_id from supplier_contact_log c
      left join profiles p on p.id = c.staff_id where c.supplier_id = ${id} order by c.created_at desc limit 100`
    return { supplier, terms, contacts }
  })
}

export async function saveSupplier(actor: Actor, id: string | null, input: unknown): Promise<{ id: string }> {
  if (!actor.staffVerified) fail('forbidden')
  const parsed = supplierSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input', parsed.error.issues[0]?.message)
  const d = parsed.data
  return withActor(actor, async (tx) => {
    if (id) {
      const [r] = await tx<{ id: string }[]>`
        update suppliers set name = ${d.name}, category = ${d.category}, region = ${d.region || null}, contact_name = ${d.contactName || null},
          email = ${d.email || null}, phone = ${d.phone || null}, website = ${d.website || null}, reachability = ${d.reachability || null},
          service_level = ${d.serviceLevel || null}, booking_method = ${d.bookingMethod || null}, emergency_contact = ${d.emergencyContact || null},
          updated_at = now() where id = ${id} returning id`
      if (!r) fail('not_found')
      await audit(tx, actor, 'supplier.update', 'supplier', id)
      return r
    }
    const [r] = await tx<{ id: string }[]>`
      insert into suppliers (name, category, region, contact_name, email, phone, website, reachability, service_level, booking_method, emergency_contact)
      values (${d.name}, ${d.category}, ${d.region || null}, ${d.contactName || null}, ${d.email || null}, ${d.phone || null}, ${d.website || null},
              ${d.reachability || null}, ${d.serviceLevel || null}, ${d.bookingMethod || null}, ${d.emergencyContact || null})
      returning id`
    await audit(tx, actor, 'supplier.create', 'supplier', r!.id)
    return r!
  })
}

export async function setSupplierVerification(actor: Actor, id: string, status: 'unverified' | 'verified' | 'inactive', note: string): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  if (status === 'verified' && !note.trim()) fail('invalid_input', 'Leg vast hoe en met wie de leverancier is geverifieerd.')
  await withActor(actor, async (tx) => {
    await tx`update suppliers set verification_status = ${status}, last_verified_at = ${status === 'verified' ? new Date() : null}, updated_at = now() where id = ${id}`
    if (note.trim()) await tx`insert into internal_notes (supplier_id, author_id, body) values (${id}, ${actor.userId}, ${`Verificatie (${status}): ${note.trim()}`})`
    await audit(tx, actor, 'supplier.verification', 'supplier', id, null, { status })
  })
}

const termsSchema = z.object({
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).default(''),
  agreement: z.string().trim().min(3).max(3000),
  commissionBasis: z.string().trim().max(300).optional().default(''),
  commissionPercent: z.string().trim().max(10).optional().default(''),
})

export async function addSupplierTerms(actor: Actor, supplierId: string, input: unknown): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  const parsed = termsSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input', parsed.error.issues[0]?.message)
  const d = parsed.data
  let bp: number | null = null
  if (d.commissionPercent) {
    const n = Number(d.commissionPercent.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0 || n > 100) fail('invalid_input', 'Commissie als percentage tussen 0 en 100.')
    bp = Math.round(n * 100)
  }
  await withActor(actor, async (tx) => {
    await tx`insert into supplier_terms (supplier_id, valid_from, valid_until, agreement, commission_basis, commission_bp, created_by)
             values (${supplierId}, ${d.validFrom}, ${d.validUntil || null}, ${d.agreement}, ${d.commissionBasis || null}, ${bp}, ${actor.userId})`
    await audit(tx, actor, 'supplier.terms', 'supplier', supplierId, null, { commissionBp: bp })
  })
}

export async function logSupplierContact(actor: Actor, supplierId: string, input: { channel: string; summary: string; requestId?: string }): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  const ch = z.enum(['phone', 'email', 'whatsapp', 'in_person', 'website', 'other']).safeParse(input.channel)
  if (!ch.success || !input.summary.trim()) fail('invalid_input')
  await withActor(actor, (tx) => tx`
    insert into supplier_contact_log (supplier_id, request_id, staff_id, channel, summary)
    values (${supplierId}, ${input.requestId || null}, ${actor.userId}, ${ch.data}, ${input.summary.trim()})`)
}

const checkSchema = z.object({
  supplierId: z.string().uuid(),
  source: z.enum(['phone', 'email', 'website', 'supplier_system', 'in_person']),
  checkedAt: z.coerce.date(),
  validUntil: z.union([z.coerce.date(), z.literal('')]).optional().default(''),
  result: z.enum(['available', 'unavailable', 'tentative', 'unknown']),
  details: z.string().trim().max(2000).optional().default(''),
})

/** Beschikbaarheid heeft altijd een bron en controletijd. */
export async function recordAvailabilityCheck(actor: Actor, requestId: string, input: unknown): Promise<{ id: string }> {
  if (!actor.staffVerified) fail('forbidden')
  const parsed = checkSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input', parsed.error.issues[0]?.message)
  const d = parsed.data
  if (d.checkedAt.getTime() > Date.now() + 5 * 60_000) fail('invalid_input', 'Controletijd kan niet in de toekomst liggen.')
  return withActor(actor, async (tx) => {
    const [c] = await tx<{ id: string }[]>`
      insert into availability_checks (request_id, supplier_id, source, checked_at, valid_until, result, details, checked_by)
      values (${requestId}, ${d.supplierId}, ${d.source}, ${d.checkedAt}, ${d.validUntil === '' ? null : d.validUntil}, ${d.result}, ${d.details || null}, ${actor.userId})
      returning id`
    await tx`insert into supplier_contact_log (supplier_id, request_id, staff_id, channel, summary)
             values (${d.supplierId}, ${requestId}, ${actor.userId}, ${d.source === 'supplier_system' ? 'website' : d.source === 'in_person' ? 'in_person' : d.source === 'website' ? 'website' : d.source}, ${`Beschikbaarheid: ${d.result}${d.details ? ` — ${d.details}` : ''}`})`
    await audit(tx, actor, 'availability.check', 'request', requestId, null, { supplierId: d.supplierId, result: d.result })
    return c!
  })
}
