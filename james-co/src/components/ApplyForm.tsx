'use client'

import Link from 'next/link'
import { ActionForm } from './ActionForm'
import { applyAction } from '@/app/actions/public'

const T = {
  nl: {
    name: 'Naam', email: 'E-mailadres', region: 'Woonregio', regionHint: 'Bijvoorbeeld Maastricht of Heuvelland.', contact: 'Voorkeurscontact',
    phone: 'Telefoonnummer (optioneel)', help: 'Wat zou u het liefst uit handen geven?', helpHint: 'In uw eigen woorden. Een voorbeeld is genoeg.',
    source: 'Hoe heeft u James & Co. gevonden? (optioneel)', privacy: <>Ik heb de <Link href="/privacy" className="underline">privacyverklaring</Link> gelezen. Mijn gegevens worden alleen gebruikt om deze kennismaking te behandelen.</>,
    submit: 'Kennismaking aanvragen', pending: 'Versturen…', contacts: [['email', 'E-mail'], ['phone', 'Telefoon'], ['whatsapp', 'WhatsApp']] as [string, string][],
    note: 'Een aanvraag is geen lidmaatschap. U ontvangt eerst een e-mail om uw adres te bevestigen; daarna nemen wij persoonlijk contact op.',
  },
  en: {
    name: 'Name', email: 'Email address', region: 'Where do you live?', regionHint: 'City and country.', contact: 'Preferred contact',
    phone: 'Phone number (optional)', help: 'What would you like us to take care of?', helpHint: 'Tell us about your visit in your own words.',
    source: 'How did you hear about James & Co.? (optional)', privacy: <>I have read the <Link href="/privacy" className="underline">privacy statement</Link>. My details are only used to handle this request.</>,
    submit: 'Send request', pending: 'Sending…', contacts: [['email', 'Email'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp']] as [string, string][],
    note: 'A request is not a booking or a contract. You will first receive an email to confirm your address; we will then contact you personally.',
  },
}

export function ApplyForm({ language = 'nl', segment = 'nl_member', invitationToken = '' }: { language?: 'nl' | 'en'; segment?: 'nl_member' | 'international_visitor'; invitationToken?: string }) {
  const t = T[language]
  const visitor = segment === 'international_visitor'
  return (
    <ActionForm action={applyAction} idempotent draftKey={`apply-${segment}`} submitLabel={t.submit} pendingLabel={t.pending}>
      <input type="hidden" name="language" value={language} />
      <input type="hidden" name="segment" value={segment} />
      {invitationToken && <input type="hidden" name="invitationToken" value={invitationToken} />}
      <div className="grid gap-x-4 sm:grid-cols-2">
        <div className="mb-4"><label className="label" htmlFor="fullName">{t.name} *</label><input className="field" id="fullName" name="fullName" required autoComplete="name" maxLength={120} /></div>
        <div className="mb-4"><label className="label" htmlFor="email">{t.email} *</label><input className="field" id="email" name="email" type="email" required autoComplete="email" maxLength={200} /></div>
        <div className="mb-4"><label className="label" htmlFor="region">{t.region}</label><input className="field" id="region" name="region" maxLength={120} aria-describedby="region-hint" /><p id="region-hint" className="hint">{t.regionHint}</p></div>
        <div className="mb-4"><label className="label" htmlFor="preferredContact">{t.contact}</label>
          <select className="field" id="preferredContact" name="preferredContact">{t.contacts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="mb-4"><label className="label" htmlFor="phone">{t.phone}</label><input className="field" id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} /></div>
        {visitor && (
          <>
            <div className="mb-4"><label className="label" htmlFor="partySize">Number of guests</label><input className="field" id="partySize" name="partySize" type="number" min={1} max={50} /></div>
            <div className="mb-4"><label className="label" htmlFor="visitStart">Arrival (if known)</label><input className="field" id="visitStart" name="visitStart" type="date" /></div>
            <div className="mb-4"><label className="label" htmlFor="visitEnd">Departure (if known)</label><input className="field" id="visitEnd" name="visitEnd" type="date" /></div>
          </>
        )}
      </div>
      <div className="mb-4"><label className="label" htmlFor="helpRequest">{t.help} *</label>
        <textarea className="field min-h-[130px]" id="helpRequest" name="helpRequest" required minLength={5} maxLength={3000} aria-describedby="help-hint" />
        <p id="help-hint" className="hint">{t.helpHint}</p></div>
      <div className="mb-4"><label className="label" htmlFor="source">{t.source}</label><input className="field" id="source" name="source" maxLength={200} /></div>
      <label className="mb-2 flex items-start gap-3 text-[15px]"><input type="checkbox" name="privacyAck" required className="mt-0.5 h-5 w-5 accent-forest" /><span>{t.privacy}</span></label>
      <p className="hint">{t.note}</p>
    </ActionForm>
  )
}
