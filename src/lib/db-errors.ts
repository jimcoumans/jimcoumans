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
export function describeDbError(error: unknown): string | null {
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
    case 'contacts_one_primary_idx':
      return 'Deze klant heeft al een vaste contactpersoon. Maak eerst de ander niet-vast, of gebruik "Maak vaste contactpersoon".'
    case 'contacts_user_idx':
      return 'Dit inlogaccount is al aan een andere contactpersoon gekoppeld.'
    case 'org_partners_pair_idx':
      return 'Deze partner is al aan deze klant gekoppeld. Pas de bestaande koppeling aan in plaats van er een tweede te maken.'
    case 'partner_hourly_positive':
      return 'Het uurtarief van een partner moet boven nul zijn.'
    case 'partner_day_positive':
      return 'Het dagtarief van een partner moet boven nul zijn.'
    case 'partner_term_positive':
      return 'De betaaltermijn moet een positief aantal dagen zijn.'
    case 'org_partner_rate_positive':
      return 'Het afwijkende tarief moet boven nul zijn.'
    case 'quotes_number_idx':
      return 'Dit offertenummer bestaat al.'
    case 'quote_vat_valid':
      return 'Het btw-percentage moet tussen 0 en 100 liggen.'
    case 'quote_line_quantity_positive':
      return 'Het aantal op een offerteregel moet groter dan nul zijn.'
    case 'quote_line_price_sign':
      return 'Een gewone regel heeft een positief bedrag; alleen een kortingsregel is negatief.'
    case 'quote_line_cost_not_negative':
      return 'De kostprijs kan niet negatief zijn.'
    case 'partner_line_needs_partner':
      return 'Kies welke partner deze regel uitvoert, anders valt het werk buiten de partnerrapportage.'
    case 'invoices_moneybird_idx':
      return 'Deze factuur uit Moneybird is al aan een andere factuur gekoppeld.'
    case 'organizations_clickup_idx':
      return 'Dit ClickUp-bedrijf is al aan een andere klant gekoppeld.'
    case 'wallets_clickup_idx':
      return 'Dit ClickUp-abonnement is al aan een andere wallet gekoppeld.'
    case 'login_tokens_hash_idx':
      // Praktisch onbereikbaar: twee keer hetzelfde willekeurige token.
      return 'Deze inloglink kon niet worden aangemaakt. Probeer het opnieuw.'
    case 'invoices_org_number_idx':
      return 'Dit factuurnummer bestaat al voor deze klant.'
    case 'organizations_slug_idx':
      return 'Er bestaat al een klant met deze naam.'
    case 'users_email_idx':
      return 'Dit e-mailadres is al in gebruik.'

    /* --- CRM: accountmanagers, labels, verjaardagen, tijdlijn --- */
    case 'organization_owners_pair_idx':
      return 'Deze collega staat al als accountmanager op deze klant. Pas de bestaande regel aan in plaats van er een tweede te maken.'
    case 'organization_owners_primary_idx':
      return 'Er kan maar één eerste aanspreekpartner per klant zijn. Maak eerst de ander niet-primair.'
    case 'organization_tags_organization_id_tag_id_pk':
      return 'Dit label hangt al aan deze klant.'
    case 'tags_name_idx':
      return 'Dit label bestaat al. Gebruik het bestaande, anders krijg je twee halve groepen.'
    case 'organization_payment_term_positive':
      return 'De betaaltermijn moet een positief aantal dagen zijn.'
    case 'contact_hoort_bij_een':
      return 'Een contactpersoon hoort bij een klant of bij een partner, niet bij allebei en niet bij geen van beide.'
    case 'contacts_one_primary_partner_idx':
      return 'Er kan maar één vaste contactpersoon per partner zijn. Maak eerst de ander niet-primair.'
    case 'contact_birthday_complete':
      return 'Vul bij een verjaardag zowel de dag als de maand in. Een dag zonder maand zegt niets; het jaar mag je weglaten.'
    case 'contact_birth_day_valid':
      return 'De dag van de verjaardag moet tussen 1 en 31 liggen.'
    case 'contact_birth_month_valid':
      return 'De maand van de verjaardag moet tussen 1 en 12 liggen.'
    case 'contact_birth_year_valid':
      return 'Het geboortejaar lijkt niet te kloppen. Laat het leeg als je het niet weet.'
    case 'subscription_discount_not_negative':
      return 'Een korting kan niet negatief zijn. Laat het veld leeg als er geen korting is.'
    case 'subscription_discount_below_amount':
      return 'De korting is net zo hoog als het budget of hoger. Dan blijft er geen factuur over.'

    /* --- Personeelsdossier --- */
    case 'contract_ends_after_start':
      return 'De einddatum van het contract ligt voor de startdatum. Controleer allebei de datums.'
    case 'contract_permanent_has_no_end':
      return 'Een contract voor onbepaalde tijd heeft geen einddatum. Haal de einddatum weg, of kies bepaalde tijd.'
    case 'contract_hours_valid':
      return 'Het aantal contracturen moet boven nul liggen en onder de twintig uur per dag.'
    case 'salary_positive':
      return 'Een salaris moet boven nul liggen.'
    case 'salary_holiday_allowance_valid':
      return 'Het vakantiegeld moet tussen 0 en 100 procent liggen. Wettelijk is het minimaal 8.'
    case 'salary_hours_valid':
      return 'Het aantal uren waarbij dit salaris hoort moet boven nul liggen en onder de twintig uur per dag.'
    case 'salary_employer_cost_valid':
      return 'De werkgeverslasten moeten tussen 0 en 200 procent liggen. Gebruikelijk is ongeveer 28.'
    case 'fee_has_no_employer_cost':
      return 'Op een management fee zitten geen werkgeverslasten en geen vakantiegeld: dat is een factuur van een eigen BV. Zet beide op nul, of kies loondienst.'
    case 'organizations_customer_number_idx':
      return 'Dit klantnummer is al in gebruik bij een andere klant. Daar hangt de koppeling met ClickUp aan, dus twee dezelfde kan niet.'
    case 'organizations_moneybird_idx':
      return 'Deze Moneybird-klant is al aan een andere klant gekoppeld.'
    case 'organization_employee_count_valid':
      return 'Het aantal medewerkers kan niet negatief zijn.'
    case 'organization_revenue_not_negative':
      return 'Een jaaromzet kan niet negatief zijn. Laat het veld leeg als je het niet weet.'
    case 'location_name_not_empty':
      return 'Geef de vestiging een naam, bijvoorbeeld "Vestiging Maastricht".'
    case 'competitor_name_not_empty':
      return 'Geef de concurrent een naam.'
    case 'goal_title_not_empty':
      return 'Geef het doel een titel.'
    case 'child_name_not_empty':
      return 'Vul de naam van het kind in.'
    case 'child_birthday_complete':
      return 'Vul bij de verjaardag van een kind zowel de dag als de maand in. Het jaar mag je weglaten.'
    case 'child_birth_day_valid':
      return 'De dag van de verjaardag moet tussen 1 en 31 liggen.'
    case 'child_birth_month_valid':
      return 'De maand van de verjaardag moet tussen 1 en 12 liggen.'
    case 'image_size_reasonable':
      return 'Dit bestand is te groot. Een logo of profielfoto mag maximaal 1 MB zijn; verklein hem eerst.'
    case 'image_type_allowed':
      return 'Alleen PNG, JPEG en WebP. Geen SVG: daar kan script in zitten dat daarna in de browser van een collega draait.'
    case 'salary_records_user_date_idx':
      return 'Er staat al een salaris met deze ingangsdatum. Pas dat aan in plaats van er een tweede naast te zetten; anders is niet te zeggen welke geldt.'
    case 'dossier_subject_not_empty':
      return 'Geef de dossierregel een korte titel, anders staat er straks een lege regel in het dossier.'
    case 'asset_label_not_empty':
      return 'Geef het bedrijfsmiddel een naam, bijvoorbeeld "MacBook Pro 14, 2023".'
    case 'asset_returned_after_handout':
      return 'De datum van inleveren ligt voor de datum van uitgifte. Controleer allebei de datums.'

    /* --- Medewerkerprofiel --- */
    case 'user_birthday_complete':
      return 'Vul bij een verjaardag zowel de dag als de maand in. Een dag zonder maand zegt niets; het jaar mag je weglaten.'
    case 'user_birth_day_valid':
      return 'De dag van de verjaardag moet tussen 1 en 31 liggen.'
    case 'user_birth_month_valid':
      return 'De maand van de verjaardag moet tussen 1 en 12 liggen.'
    case 'user_contract_hours_valid':
      return 'Het aantal contracturen moet boven nul liggen en onder de twintig uur per dag. Laat het leeg als er geen vast aantal is.'
    case 'user_hourly_cost_not_negative':
      return 'Een uurkosten-bedrag kan niet negatief zijn. Laat het leeg als je het niet weet.'
    case 'user_employment_order':
      return 'De datum uit dienst ligt vóór de datum in dienst. Controleer allebei de datums.'
    case 'user_target_positive':
      return 'Een maanddoel moet boven nul liggen. Laat het leeg als er geen doel is.'
    case 'user_target_needs_manager':
      return 'Zet deze collega eerst aan als marketing manager; een maanddoel zonder klantportfolio zegt niets.'
    case 'activity_subject_not_empty':
      return 'Geef de notitie een korte titel, anders staat er straks een lege regel op de tijdlijn.'
    default:
      break
  }

  if (info.code === PG_FOREIGN_KEY_VIOLATION) {
    return 'Deze actie kan niet worden uitgevoerd omdat er nog gekoppelde gegevens zijn. Financiële historie wordt nooit verwijderd.'
  }

  return null
}
