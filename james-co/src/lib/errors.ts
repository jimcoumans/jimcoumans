/** Domeinfout met een stabiele code; de UI vertaalt de code naar een generieke melding. */
export class DomainError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code)
    this.name = 'DomainError'
  }
}

export function fail(code: string, message?: string): never {
  throw new DomainError(code, message)
}

export const MESSAGES: Record<string, string> = {
  not_found: 'Dit onderdeel is niet gevonden of niet voor u beschikbaar.',
  forbidden: 'U heeft geen toegang tot deze handeling.',
  invalid_input: 'Controleer de ingevulde gegevens.',
  rate_limited: 'Te veel pogingen. Probeer het over enige tijd opnieuw.',
  membership_not_active: 'Uw lidmaatschap is niet actief. Nieuwe verzoeken zijn daarom niet mogelijk.',
  proposal_expired: 'Dit voorstel is verlopen. We maken graag een nieuwe versie voor u.',
  proposal_not_current: 'Dit voorstel is niet meer de geldende versie.',
  proposal_changed: 'Het voorstel is gewijzigd sinds u het opende. Bekijk de actuele versie.',
  already_approved: 'Dit voorstel is al geaccepteerd.',
  evidence_required: 'Bevestiging vereist leveranciernaam, bron, controletijd en een referentie of bevestigingsnotitie.',
  approval_required: 'Er is nog geen geldig akkoord van het lid.',
  society_capacity_exceeded: 'Er is geen plek meer beschikbaar voor dit aantal personen.',
  society_capacity_below_confirmed: 'De capaciteit kan niet lager dan het aantal bevestigde plaatsen.',
  invalid_request_transition: 'Deze statuswijziging is niet toegestaan.',
  invitation_invalid: 'Deze uitnodiging is niet (meer) geldig.',
  invitation_limit: 'U heeft het maximum aantal openstaande uitnodigingen bereikt.',
  not_configured: 'Deze koppeling is nog niet ingericht.',
  offer_expired: 'Dit aanbod is verlopen.',
  payment_required: 'Er is nog geen ontvangen betaling geregistreerd.',
  owner_required: 'Wijs eerst een verantwoordelijke medewerker toe.',
}

export function messageFor(err: unknown): string {
  if (err instanceof DomainError) return MESSAGES[err.code] ?? 'Er ging iets mis. Probeer het opnieuw.'
  return 'Er ging iets mis. Uw invoer is niet verloren; probeer het opnieuw.'
}
