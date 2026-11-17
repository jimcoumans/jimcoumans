/** Klant- en kandidatenoverzicht voor staff, voorkeuren en toestemming voor het lid zelf, teamrollen voor admin. */
import { z } from 'zod'
import { withActor, withSystem } from '../db-core'
import type { Actor } from '../actor'
import { fail } from '../errors'
import { audit } from './audit'
import { CATEGORIES } from './requests'
import { normalizeEmail } from '../auth/core'

export async function listMembers(actor: Actor) {
  if (!actor.staffVerified) fail('forbidden')
  return withActor(actor, (tx) => tx<{ userId: string; fullName: string | null; email: string; status: string; startsOn: string | null; endsOn: string | null; isComplimentary: boolean; openRequests: number; membershipId: string }[]>`
    select m.user_id, p.full_name, p.email, m.status, m.starts_on, m.ends_on, m.is_complimentary, m.id as membership_id,
      (select count(*)::int from requests r where r.member_id = m.user_id and r.status not in ('completed','closed','rejected','cancelled')) as open_requests
    from memberships m join profiles p on p.id = m.user_id
    order by (m.status = 'active') desc, p.full_name`)
}

export async function getMemberForStaff(actor: Actor, userId: string) {
  if (!actor.staffVerified) fail('forbidden')
  if (!z.string().uuid().safeParse(userId).success) fail('not_found')
  return withActor(actor, async (tx) => {
    const [profile] = await tx<{ id: string; email: string; fullName: string | null; displayName: string | null; phone: string | null; preferredContact: string | null; region: string | null; language: string; createdAt: Date }[]>`
      select id, email, full_name, display_name, phone, preferred_contact, region, language, created_at from profiles where id = ${userId}`
    if (!profile) fail('not_found')
    const memberships = await tx<{ id: string; status: string; startsOn: string | null; endsOn: string | null; acceptedTermsVersion: string | null; isComplimentary: boolean; acceptedAt: Date | null; activatedAt: Date | null; planSnapshot: Record<string, unknown> | null }[]>`
      select id, status, starts_on, ends_on, accepted_terms_version, is_complimentary, accepted_at, activated_at, plan_snapshot from memberships where user_id = ${userId} order by created_at desc`
    const requests = await tx<{ id: string; title: string | null; brief: string; status: string; createdAt: Date }[]>`
      select id, title, brief, status, created_at from requests where member_id = ${userId} order by created_at desc limit 50`
    const [prefs] = await tx<Record<string, unknown>[]>`select * from member_preferences where member_id = ${userId}`
    const notes = await tx<{ id: string; body: string; createdAt: Date; authorName: string | null }[]>`
      select n.id, n.body, n.created_at, p.full_name as author_name from internal_notes n left join profiles p on p.id = n.author_id where n.member_id = ${userId} order by n.created_at desc`
    const consents = await tx<{ purpose: string; granted: boolean; recordedAt: Date }[]>`
      select distinct on (purpose) purpose, granted, recorded_at from consent_records where user_id = ${userId} order by purpose, recorded_at desc`
    const [{ minutes } = { minutes: 0 }] = await tx<{ minutes: number }[]>`
      select coalesce(sum(t.minutes), 0)::int as minutes from time_entries t left join requests r on r.id = t.request_id
      where (t.member_id = ${userId} or r.member_id = ${userId}) and t.created_at > now() - interval '30 days'`
    return { profile, memberships, requests, prefs: prefs ?? null, notes, consents, minutes30d: minutes }
  })
}

// ------------------------------------------------------------------ voorkeuren (lid)

export const BUDGET_BANDS = { tot_150: 'tot €150', '150_300': '€150–€300', '300_600': '€300–€600', boven_600: 'boven €600' } as const

const prefsSchema = z.object({
  language: z.enum(['nl', 'en']).optional().or(z.literal('')).default(''),
  homeRegion: z.string().trim().max(120).optional().default(''),
  travelRadiusKm: z.union([z.coerce.number().int().min(0).max(2000), z.literal('')]).optional().default(''),
  budgetBand: z.enum(['tot_150', '150_300', '300_600', 'boven_600']).optional().or(z.literal('')).default(''),
  preferredTimes: z.string().trim().max(300).optional().default(''),
  favoriteCategories: z.array(z.enum(CATEGORIES)).max(8).default([]),
  communicationPreference: z.enum(['email', 'phone', 'whatsapp', 'portal']).optional().or(z.literal('')).default(''),
  notes: z.string().trim().max(2000).optional().default(''),
})

export async function getMyPreferences(actor: Actor) {
  if (!actor.userId) fail('forbidden')
  return withActor(actor, async (tx) => {
    const [prefs] = await tx<Record<string, unknown>[]>`select * from member_preferences where member_id = ${actor.userId}`
    const [sensitive] = await tx<{ dietary: string | null; allergies: string | null }[]>`select dietary, allergies from member_sensitive_preferences where member_id = ${actor.userId}`
    const consents = await tx<{ purpose: string; granted: boolean; recordedAt: Date }[]>`
      select distinct on (purpose) purpose, granted, recorded_at from consent_records where user_id = ${actor.userId} order by purpose, recorded_at desc`
    const [profile] = await tx<{ fullName: string | null; displayName: string | null; phone: string | null; preferredContact: string | null; region: string | null; language: string; email: string }[]>`
      select full_name, display_name, phone, preferred_contact, region, language, email from profiles where id = ${actor.userId}`
    return { prefs: prefs ?? null, sensitive: sensitive ?? null, consents, profile: profile! }
  })
}

export async function saveMyPreferences(actor: Actor, input: unknown): Promise<void> {
  if (!actor.userId) fail('forbidden')
  const parsed = prefsSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input')
  const d = parsed.data
  await withActor(actor, (tx) => tx`
    insert into member_preferences (member_id, language, home_region, travel_radius_km, budget_band, preferred_times, favorite_categories, communication_preference, notes, updated_at)
    values (${actor.userId}, ${d.language || null}, ${d.homeRegion || null}, ${d.travelRadiusKm === '' ? null : d.travelRadiusKm}, ${d.budgetBand || null},
            ${d.preferredTimes || null}, ${d.favoriteCategories}, ${d.communicationPreference || null}, ${d.notes || null}, now())
    on conflict (member_id) do update set language = excluded.language, home_region = excluded.home_region, travel_radius_km = excluded.travel_radius_km,
      budget_band = excluded.budget_band, preferred_times = excluded.preferred_times, favorite_categories = excluded.favorite_categories,
      communication_preference = excluded.communication_preference, notes = excluded.notes, updated_at = now()`)
}

export async function saveMyProfile(actor: Actor, input: { fullName: string; displayName: string; phone: string; preferredContact: string }): Promise<void> {
  if (!actor.userId) fail('forbidden')
  const p = z.object({
    fullName: z.string().trim().min(2).max(120), displayName: z.string().trim().max(60),
    phone: z.string().trim().max(40), preferredContact: z.enum(['email', 'phone', 'whatsapp', 'portal']),
  }).safeParse(input)
  if (!p.success) fail('invalid_input')
  await withActor(actor, (tx) => tx`
    update profiles set full_name = ${p.data.fullName}, display_name = ${p.data.displayName || null}, phone = ${p.data.phone || null},
      preferred_contact = ${p.data.preferredContact}, updated_at = now() where id = ${actor.userId}`)
}

export const CONSENT_VERSION = 'concept-2026-11'

/** Toestemming per doel en kanaal; nooit standaard aan. Intrekken = nieuw record met granted=false. */
export async function recordConsent(actor: Actor, purpose: 'service_whatsapp' | 'marketing_email' | 'marketing_whatsapp' | 'sensitive_preferences', granted: boolean): Promise<void> {
  if (!actor.userId) fail('forbidden')
  await withActor(actor, async (tx) => {
    await tx`insert into consent_records (user_id, purpose, channel, granted, version, source)
             values (${actor.userId}, ${purpose}, ${purpose.includes('whatsapp') ? 'whatsapp' : purpose.includes('email') ? 'email' : null}, ${granted}, ${CONSENT_VERSION}, 'portal_profile')`
    if (purpose === 'sensitive_preferences' && !granted) {
      await tx`delete from member_sensitive_preferences where member_id = ${actor.userId}`
    }
  })
}

export async function saveSensitivePreferences(actor: Actor, input: { dietary: string; allergies: string }): Promise<void> {
  if (!actor.userId) fail('forbidden')
  await withActor(actor, async (tx) => {
    const [c] = await tx<{ granted: boolean }[]>`
      select granted from consent_records where user_id = ${actor.userId} and purpose = 'sensitive_preferences' order by recorded_at desc limit 1`
    if (!c?.granted) fail('invalid_input', 'Geef eerst expliciet toestemming voor het bewaren van dieet- en allergiegegevens.')
    await tx`insert into member_sensitive_preferences (member_id, dietary, allergies, updated_at)
             values (${actor.userId}, ${input.dietary.trim().slice(0, 500) || null}, ${input.allergies.trim().slice(0, 500) || null}, now())
             on conflict (member_id) do update set dietary = excluded.dietary, allergies = excluded.allergies, updated_at = now()`
  })
}

// ------------------------------------------------------------------ team (admin)

export async function listStaff(actor: Actor) {
  if (!actor.staffVerified) fail('forbidden')
  return withActor(actor, (tx) => tx<{ userId: string; role: string; active: boolean; fullName: string | null; email: string }[]>`
    select s.user_id, s.role, s.active, p.full_name, p.email from staff_roles s join profiles p on p.id = s.user_id order by p.full_name`)
}

/** Admin voegt een medewerker toe of wijzigt een rol. Geen zelfpromotie (ook RLS: user_id <> jc_uid()). */
export async function upsertStaff(actor: Actor, input: { email: string; fullName: string; role: 'admin' | 'concierge'; active: boolean }): Promise<void> {
  if (actor.staffRole !== 'admin') fail('forbidden')
  const p = z.object({ email: z.string().email(), fullName: z.string().trim().min(2).max(120), role: z.enum(['admin', 'concierge']), active: z.boolean() }).safeParse(input)
  if (!p.success) fail('invalid_input')
  const email = normalizeEmail(p.data.email)
  // Profiel aanmaken mag via systeem (e-mail is geen door de client te wijzigen veld); de rolwijziging zelf loopt onder RLS.
  const userId = await withSystem(async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      insert into profiles (email, full_name, display_name) values (${email}, ${p.data.fullName}, ${p.data.fullName.split(' ')[0] ?? null})
      on conflict (email) do update set full_name = coalesce(profiles.full_name, excluded.full_name) returning id`
    return row!.id
  })
  if (userId === actor.userId) fail('forbidden')
  await withActor(actor, async (tx) => {
    const [before] = await tx<{ role: string; active: boolean }[]>`select role, active from staff_roles where user_id = ${userId}`
    await tx`insert into staff_roles (user_id, role, active, created_by) values (${userId}, ${p.data.role}, ${p.data.active}, ${actor.userId})
             on conflict (user_id) do update set role = excluded.role, active = excluded.active, updated_at = now()`
    await audit(tx, actor, 'staff.upsert', 'profile', userId, before ?? null, { role: p.data.role, active: p.data.active })
  })
  if (!p.data.active) await withSystem((tx) => tx`update sessions set revoked_at = now() where user_id = ${userId} and revoked_at is null`)
}
