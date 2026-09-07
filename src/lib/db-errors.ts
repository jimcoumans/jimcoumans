/**
 * Drizzle wrapt fouten uit de driver, waardoor de Postgres-foutcode en de
 * naam van de geschonden constraint niet in error.message staan maar in
 * error.cause. Zonder deze module krijgt een gebruiker een kale 500 in
 * plaats van te horen wat er mis is.
 */

export type PostgresErrorInfo = {
  code: string | null
  constraint: string | null
  detail: string | null
}

/** Leest de Postgres-foutdetails uit een (mogelijk gewrapte) fout. */
export function readPostgresError(error: unknown): PostgresErrorInfo | null {
  let current: unknown = error

  // Maximaal een paar niveaus door de cause-keten lopen.
  for (let depth = 0; depth < 5 && current !== null && current !== undefined; depth++) {
    if (typeof current === 'object') {
      const candidate = current as Record<string, unknown>
      if (typeof candidate.code === 'string') {
        return {
          code: candidate.code,
          constraint:
            typeof candidate.constraint_name === 'string'
              ? candidate.constraint_name
              : typeof candidate.constraint === 'string'
                ? candidate.constraint
                : null,
          detail: typeof candidate.detail === 'string' ? candidate.detail : null,
        }
      }
      current = candidate.cause
      continue
    }
    break
  }

  return null
}

/** True als de fout een schending is van de opgegeven constraint. */
export function isConstraintViolation(error: unknown, constraint: string): boolean {
  return readPostgresError(error)?.constraint === constraint
}

/** Postgres-foutcodes die we in de app apart willen behandelen. */
export const PG_UNIQUE_VIOLATION = '23505'
export const PG_CHECK_VIOLATION = '23514'
export const PG_FOREIGN_KEY_VIOLATION = '23503'

/**
 * Zet een databasefout om naar een melding die een mens begrijpt.
 * Geeft null als het geen bekende constraint is, zodat de aanroeper de
 * fout gewoon kan doorgooien in plaats van hem te verbloemen.
 */
export function describeLedgerDbError(error: unknown): string | null {
  const info = readPostgresError(error)
  if (!info) return null

  switch (info.constraint) {
    case 'ledger_source_ref_idx':
      return 'Deze taak is al eerder afgeboekt op deze wallet.'
    case 'sign_matches_kind':
      return 'Het bedrag past niet bij het soort boeking (bijschrijving moet positief zijn, afschrijving negatief).'
    case 'amount_not_zero':
      return 'Een boeking van € 0,00 kan niet worden opgeslagen.'
    case 'only_corrections_reverse':
      return 'Alleen een correctie mag naar een eerdere boeking verwijzen.'
    case 'client_needs_org':
      return 'Een klantgebruiker moet aan een organisatie gekoppeld zijn.'
    case 'quantity_positive':
      return 'Het aantal moet groter dan nul zijn.'
    case 'service_needs_quantity_and_price':
      return 'Bij een geboekte dienst horen altijd een aantal en een tarief, zodat het bedrag na te rekenen is.'
    case 'service_price_positive':
      return 'Een dienst moet een tarief boven nul hebben.'
    case 'service_cost_not_negative':
      return 'De kostprijs kan niet negatief zijn.'
    case 'services_code_idx':
      return 'Deze dienstcode is al in gebruik.'
    case 'invoices_subscription_period_idx':
      return 'Deze maand is voor dit abonnement al gefactureerd.'
    case 'subscription_needs_period':
      return 'Een abonnementsfactuur heeft altijd een periode nodig, en een losse factuur juist niet.'
    case 'period_format':
      return 'De periode moet de vorm JJJJ-MM hebben, bijvoorbeeld 2026-03.'
    case 'subscription_amount_positive':
      return 'Het maandbedrag van een abonnement moet boven nul zijn.'
    case 'subscription_billing_day_valid':
      return 'De facturatiedag moet tussen 1 en 28 liggen, zodat de dag in elke maand bestaat.'
    case 'subscription_vat_valid':
      return 'Het btw-percentage moet tussen 0 en 100 liggen.'
    case 'subscription_ends_after_start':
      return 'De einddatum kan niet voor de startdatum liggen.'
    case 'subscriptions_clickup_idx':
      return 'Dit ClickUp-abonnement is al aan een ander abonnement gekoppeld.'
    case 'invoices_org_number_idx':
      return 'Dit factuurnummer bestaat al voor deze klant.'
    case 'organizations_slug_idx':
      return 'Er bestaat al een klant met deze naam.'
    case 'users_email_idx':
      return 'Dit e-mailadres is al in gebruik.'
    default:
      break
  }

  if (info.code === PG_FOREIGN_KEY_VIOLATION) {
    return 'Deze actie kan niet worden uitgevoerd omdat er nog gekoppelde gegevens zijn. Financiële historie wordt nooit verwijderd.'
  }

  return null
}
