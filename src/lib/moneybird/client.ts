import { z } from 'zod'
import { parseAmountToCents } from '../money'

const id = z.string().regex(/^\d+$/)
const contactSchema = z.object({
  id,
  company_name: z.string().nullish(),
  customer_id: z.string().nullish(),
  firstname: z.string().nullish(),
  lastname: z.string().nullish(),
  archived: z.boolean().optional(),
})

const recurringSchema = z.object({
  id,
  contact_id: id,
  reference: z.string().nullable(),
  invoice_date: z.string(),
  active: z.boolean().nullable(),
  auto_send: z.boolean().nullish(),
  start_date: z.string().optional(),
  frequency_type: z.string().optional(),
  frequency: z.number().optional(),
  total_price_excl_tax: z.string().optional(),
  currency: z.string().optional(),
  subscription: z.unknown().optional(),
})
const factuurSchema = z.object({
  id,
  contact_id: id,
  invoice_id: z.string().nullable(),
  recurring_sales_invoice_id: id.nullish(),
  reference: z.string().nullish(),
  state: z.string(),
  sent_at: z.string().nullish(),
  paid_at: z.string().nullish(),
  invoice_date: z.string().nullable(),
  total_price_excl_tax: z.string(),
  total_price_incl_tax: z.string(),
  currency: z.string(),
  details: z.array(z.object({ description: z.string().nullable() })).optional(),
})

export type MoneybirdFactuur = z.infer<typeof factuurSchema>
export type MoneybirdReeks = z.infer<typeof recurringSchema>

export function moneybirdContactId(waarde: string | null | undefined) {
  return id.parse(waarde)
}

export function moneybirdBedrag(waarde: string) {
  const bedrag = parseAmountToCents(waarde)
  if (bedrag === null) throw new Error('Moneybird gaf een ongeldig factuurbedrag terug.')
  return bedrag
}

export function moneybirdClient(signal = AbortSignal.timeout(9000)) {
  const administratie = process.env.MONEYBIRD_ADMINISTRATION_ID
  const token = process.env.MONEYBIRD_API_TOKEN
  if (!token || !administratie || !id.safeParse(administratie).success) {
    throw new Error('De Moneybird-administratie en API-token moeten zijn ingesteld.')
  }

  async function verzoek<T>(
    schema: z.ZodType<T>,
    pad: string,
    methode = 'GET',
    body?: object,
  ): Promise<T> {
    const res = await fetch(`https://moneybird.com/api/v2/${administratie}/${pad}`, {
      method: methode,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal,
      redirect: 'error',
    })
    if (!res.ok) throw new MoneybirdApiFout(res.status)
    return schema.parse(await res.json())
  }

  async function paginas<T>(schema: z.ZodType<T>, bron: string, filter: string) {
    const alle: T[] = []
    for (let pagina = 1; pagina <= 100; pagina++) {
      const query = new URLSearchParams({ filter, page: String(pagina), per_page: '100' })
      const rijen = await verzoek(z.array(schema), `${bron}.json?${query}`)
      alle.push(...rijen)
      if (rijen.length < 100) return alle
    }
    throw new Error('Moneybird gaf meer pagina’s dan deze aanvraag kan verwerken.')
  }

  return {
    contact: (contactId: string) => verzoek(contactSchema, `contacts/${moneybirdContactId(contactId)}.json`),
    zoekContacten: (zoekterm: string) => {
      const query = new URLSearchParams({ query: zoekterm, include_archived: 'false', per_page: '100' })
      return verzoek(z.array(contactSchema), `contacts.json?${query}`)
    },
    facturen: (contactId: string, reeksId?: string) => {
      const filters = ['state:all', `contact_id:${moneybirdContactId(contactId)}`]
      if (reeksId) filters.push(`recurring_sales_invoice_id:${id.parse(reeksId)}`)
      return paginas(factuurSchema, 'sales_invoices', filters.join(','))
    },
    reeksen: (contactId: string, actief: boolean) =>
      paginas(recurringSchema, 'recurring_sales_invoices', `state:${actief ? 'active' : 'inactive'},contact_id:${moneybirdContactId(contactId)}`),
    reeks: (reeksId: string) =>
      verzoek(recurringSchema, `recurring_sales_invoices/${id.parse(reeksId)}.json`),
    maakReeks: (reeks: object) =>
      verzoek(recurringSchema, 'recurring_sales_invoices.json', 'POST', { recurring_sales_invoice: reeks }),
    stopReeks: (reeksId: string) =>
      verzoek(recurringSchema, `recurring_sales_invoices/${id.parse(reeksId)}/deactivate.json`, 'PATCH'),
  }
}

export class MoneybirdApiFout extends Error {
  constructor(readonly status: number) {
    super(`Moneybird gaf HTTP ${status} terug.`)
  }
}

export function verstuurd(factuur: MoneybirdFactuur) {
  return Boolean(factuur.sent_at || factuur.paid_at) &&
    factuur.state !== 'draft' && factuur.state !== 'scheduled'
}

export function factuurStatus(factuur: MoneybirdFactuur) {
  if (factuur.state === 'paid' || factuur.paid_at) return 'Betaald'
  if (factuur.state === 'late' || factuur.state === 'reminded') return 'Te laat'
  if (factuur.state === 'uncollectible') return 'Oninbaar'
  if (factuur.state === 'pending_payment') return 'Betaling onderweg'
  return 'Verstuurd'
}
