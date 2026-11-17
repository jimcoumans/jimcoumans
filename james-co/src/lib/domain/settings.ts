/**
 * Zakelijke instellingen. Alles wat nog geen vastgesteld bedrijfsfeit is
 * (prijs, service-uren, WhatsApp-nummer, bedrijfsgegevens) staat standaard
 * UIT of als concept, en verschijnt pas na expliciete activering.
 */
import { z } from 'zod'
import { withActor, withSystem } from '../db-core'
import type { Actor } from '../actor'
import { audit } from './audit'
import { fail } from '../errors'

export const settingsSchemas = {
  company: z.object({
    tradeName: z.string().min(1).max(80).default('James & Co.'),
    legalName: z.string().max(120).default(''),
    kvk: z.string().max(20).default(''),
    vat: z.string().max(30).default(''),
    address: z.string().max(200).default(''),
    email: z.string().max(120).default(''),
    phone: z.string().max(40).default(''),
    /** Pas na invullen én aanzetten worden gegevens publiek getoond. */
    published: z.boolean().default(false),
  }),
  serviceHours: z.object({
    enabled: z.boolean().default(false),
    description: z.string().max(400).default(''),
    responseTime: z.string().max(200).default(''),
  }),
  whatsapp: z.object({
    enabled: z.boolean().default(false),
    number: z.string().regex(/^(\+\d{8,15})?$/, 'Gebruik internationaal formaat, bijv. +31612345678').default(''),
  }),
  membershipPlan: z.object({
    priceMinor: z.number().int().min(0).default(49500),
    currency: z.string().regex(/^[A-Z]{3}$/).default('EUR'),
    taxRateBp: z.number().int().min(0).max(10000).default(2100),
    includesTax: z.boolean().default(true),
    billingPeriod: z.enum(['month', 'quarter', 'year', 'once']).default('month'),
    scopeText: z.string().max(4000).default(
      'Persoonlijk aanspreekpunt, voorkeurenprofiel, standaard conciergecoördinatie van gewone verzoeken (één gelegenheid, beperkte selectie, normale afstemming) en toegang tot uitnodigingen van The James Society. Niet inbegrepen: kosten van leveranciers (maaltijden, overnachtingen, vervoer, tickets, cadeaus, deelname aan ervaringen). Complexe opdrachten krijgen vooraf een aparte coördinatieofferte.',
    ),
    termsVersion: z.string().max(40).default('concept-2026-11'),
    termsText: z.string().max(20000).default(
      'CONCEPTVOORWAARDEN — nog niet juridisch beoordeeld. Het lidmaatschap betreft de afgesproken dienstverlening. Leverancierskosten worden apart en per geaccepteerd voorstel afgerekend. Een aanvraag is geen boeking; bevestiging volgt pas na bevestiging door de leverancier. Geen 24/7-bereikbaarheid. Opzegging en looptijd: nog vast te stellen.',
    ),
    offerValidDays: z.number().int().min(1).max(90).default(14),
  }),
  capacity: z.object({
    maxActiveMembers: z.number().int().min(1).max(10000).default(25),
  }),
  invitations: z.object({
    maxOpenPerMember: z.number().int().min(0).max(50).default(3),
    validDays: z.number().int().min(1).max(90).default(30),
  }),
} as const

export type SettingKey = keyof typeof settingsSchemas
export type Settings = { [K in SettingKey]: z.infer<(typeof settingsSchemas)[K]> }

function parseAll(rows: { key: string; value: unknown }[]): Settings {
  const map = new Map(rows.map((r) => [r.key, r.value]))
  const out = {} as Record<string, unknown>
  for (const key of Object.keys(settingsSchemas) as SettingKey[]) {
    const parsed = settingsSchemas[key].safeParse(map.get(key) ?? {})
    out[key] = parsed.success ? parsed.data : settingsSchemas[key].parse({})
  }
  return out as Settings
}

/** Server-side gelezen; ook voor publieke pagina's (alleen velden die de pagina expliciet gebruikt). */
export async function getSettings(): Promise<Settings> {
  const rows = await withSystem((tx) => tx<{ key: string; value: unknown }[]>`select key, value from app_settings`)
  return parseAll(rows)
}

export async function updateSetting<K extends SettingKey>(actor: Actor, key: K, value: unknown): Promise<Settings[K]> {
  if (actor.staffRole !== 'admin') fail('forbidden')
  const parsed = settingsSchemas[key].safeParse(value)
  if (!parsed.success) fail('invalid_input', parsed.error.issues[0]?.message)
  if (key === 'whatsapp') {
    const w = parsed.data as Settings['whatsapp']
    if (w.enabled && !w.number) fail('invalid_input', 'Een WhatsApp-knop kan pas aan met een ingesteld nummer.')
  }
  if (key === 'serviceHours') {
    const s = parsed.data as Settings['serviceHours']
    if (s.enabled && !s.description.trim()) fail('invalid_input', 'Vul de service-uren in voordat u ze publiceert.')
  }
  await withActor(actor, async (tx) => {
    const [before] = await tx<{ value: Record<string, unknown> }[]>`select value from app_settings where key = ${key}`
    await tx`insert into app_settings (key, value, updated_by) values (${key}, ${tx.json(parsed.data as never)}, ${actor.userId})
             on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`
    await audit(tx, actor, 'settings.update', 'app_settings', null, before ? { key, ...before.value } : { key }, { key, ...(parsed.data as Record<string, unknown>) })
  })
  return parsed.data as Settings[K]
}

/** Publieke bedrijfsgegevens alleen als ze ingevuld en gepubliceerd zijn. */
export function publicCompany(s: Settings): Settings['company'] | null {
  const c = s.company
  if (!c.published || !c.legalName || !c.email) return null
  return c
}

export function whatsappLink(s: Settings): string | null {
  if (!s.whatsapp.enabled || !s.whatsapp.number) return null
  return `https://wa.me/${s.whatsapp.number.replace(/[^\d]/g, '')}`
}
