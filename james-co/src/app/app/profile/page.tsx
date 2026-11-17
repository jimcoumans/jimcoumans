import { requireUser } from '@/lib/auth/session'
import { getMyPreferences, BUDGET_BANDS } from '@/lib/domain/members'
import { CATEGORIES, CATEGORY_LABEL } from '@/lib/domain/requests'
import { ActionForm } from '@/components/ActionForm'
import { PageTitle, Section, Badge } from '@/components/ui'
import { consentAction, preferencesAction, profileAction, sensitiveAction } from '@/app/actions/member'
import { formatDate } from '@/lib/time'

const CONSENTS: [string, string][] = [
  ['service_whatsapp', 'Servicecontact via WhatsApp over mijn lopende verzoeken'],
  ['marketing_email', 'Af en toe nieuws en uitnodigingen per e-mail'],
  ['marketing_whatsapp', 'Af en toe nieuws en uitnodigingen via WhatsApp'],
]

export default async function Profile() {
  const { actor } = await requireUser()
  const { prefs, sensitive, consents, profile } = await getMyPreferences(actor)
  const p = (prefs ?? {}) as Record<string, unknown>
  const consent = (purpose: string) => consents.find((c) => c.purpose === purpose)
  const sensitiveOk = consent('sensitive_preferences')?.granted === true
  const favs = (p.favoriteCategories as string[] | undefined) ?? []
  return (
    <>
      <PageTitle eyebrow="Profiel" title="Uw voorkeuren">Alleen wat ons helpt u beter te bedienen. U bepaalt wat we bewaren.</PageTitle>
      <Section title="Gegevens">
        <ActionForm action={profileAction}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <div className="mb-4"><label className="label" htmlFor="fullName">Naam</label><input className="field" id="fullName" name="fullName" defaultValue={profile.fullName ?? ''} required /></div>
            <div className="mb-4"><label className="label" htmlFor="displayName">Aanspreeknaam</label><input className="field" id="displayName" name="displayName" defaultValue={profile.displayName ?? ''} /></div>
            <div className="mb-4"><label className="label" htmlFor="phone">Telefoon</label><input className="field" id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ''} /></div>
            <div className="mb-4"><label className="label" htmlFor="preferredContact">Voorkeurscontact</label>
              <select className="field" id="preferredContact" name="preferredContact" defaultValue={profile.preferredContact ?? 'email'}><option value="email">E-mail</option><option value="phone">Telefoon</option><option value="whatsapp">WhatsApp</option><option value="portal">Portaal</option></select></div>
          </div>
          <p className="hint">E-mailadres: {profile.email}. Wijzigen? Laat het ons weten.</p>
        </ActionForm>
      </Section>
      <Section title="Voorkeuren">
        <ActionForm action={preferencesAction}>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <div className="mb-4"><label className="label" htmlFor="homeRegion">Woonregio</label><input className="field" id="homeRegion" name="homeRegion" defaultValue={(p.homeRegion as string) ?? ''} /></div>
            <div className="mb-4"><label className="label" htmlFor="travelRadiusKm">Maximale reisafstand (km)</label><input className="field" id="travelRadiusKm" name="travelRadiusKm" type="number" min={0} max={2000} defaultValue={(p.travelRadiusKm as number | null) ?? ''} /></div>
            <div className="mb-4"><label className="label" htmlFor="budgetBand">Gebruikelijk budget per gelegenheid</label>
              <select className="field" id="budgetBand" name="budgetBand" defaultValue={(p.budgetBand as string) ?? ''}><option value="">Geen voorkeur</option>{Object.entries(BUDGET_BANDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="mb-4"><label className="label" htmlFor="preferredTimes">Voorkeurstijden</label><input className="field" id="preferredTimes" name="preferredTimes" defaultValue={(p.preferredTimes as string) ?? ''} placeholder="bijv. diner rond 19:30" /></div>
            <div className="mb-4"><label className="label" htmlFor="language">Taal</label><select className="field" id="language" name="language" defaultValue={(p.language as string) ?? ''}><option value="">Nederlands</option><option value="nl">Nederlands</option><option value="en">English</option></select></div>
            <div className="mb-4"><label className="label" htmlFor="communicationPreference">Communicatie</label><select className="field" id="communicationPreference" name="communicationPreference" defaultValue={(p.communicationPreference as string) ?? ''}><option value="">Geen voorkeur</option><option value="portal">Portaal</option><option value="email">E-mail</option><option value="phone">Telefoon</option><option value="whatsapp">WhatsApp</option></select></div>
          </div>
          <fieldset className="mb-4"><legend className="label">Favoriete categorieën</legend>
            <div className="flex flex-wrap gap-3">{CATEGORIES.map((c) => <label key={c} className="flex items-center gap-2 rounded-full border border-line px-3 py-2 text-[14px]"><input type="checkbox" name="favoriteCategories" value={c} defaultChecked={favs.includes(c)} className="h-4 w-4 accent-forest" />{CATEGORY_LABEL[c]}</label>)}</div>
          </fieldset>
          <label className="label" htmlFor="notes">Overige voorkeuren</label>
          <textarea className="field min-h-[90px]" id="notes" name="notes" maxLength={2000} defaultValue={(p.notes as string) ?? ''} />
        </ActionForm>
      </Section>
      <Section title="Dieet en allergieën">
        <p className="mb-3 text-sm text-muted">Optioneel. We bewaren dit alleen met uw uitdrukkelijke toestemming, met beperkte toegang, en delen het alleen met een leverancier als dat voor een verzoek nodig is.</p>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Badge tone={sensitiveOk ? 'ok' : 'neutral'}>{sensitiveOk ? 'Toestemming gegeven' : 'Geen toestemming'}</Badge>
          <ActionForm action={consentAction} submitLabel={sensitiveOk ? 'Toestemming intrekken en gegevens wissen' : 'Toestemming geven'} submitClassName="btn-quiet text-sm" confirm={sensitiveOk ? 'Toestemming intrekken? De opgeslagen dieet- en allergiegegevens worden verwijderd.' : undefined}>
            <input type="hidden" name="purpose" value="sensitive_preferences" /><input type="hidden" name="granted" value={sensitiveOk ? 'false' : 'true'} />
          </ActionForm>
        </div>
        {sensitiveOk && (
          <ActionForm action={sensitiveAction}>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <div className="mb-4"><label className="label" htmlFor="dietary">Dieetwensen</label><input className="field" id="dietary" name="dietary" maxLength={500} defaultValue={sensitive?.dietary ?? ''} /></div>
              <div className="mb-4"><label className="label" htmlFor="allergies">Allergieën</label><input className="field" id="allergies" name="allergies" maxLength={500} defaultValue={sensitive?.allergies ?? ''} /></div>
            </div>
          </ActionForm>
        )}
      </Section>
      <Section title="Berichten en toestemming">
        <p className="mb-4 text-sm text-muted">Servicecontact en nieuws staan los van elkaar. Niets staat standaard aan.</p>
        <ul className="space-y-3">
          {CONSENTS.map(([purpose, label]) => {
            const c = consent(purpose)
            return (
              <li key={purpose} className="flex flex-col gap-2 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-[15px]">{label}</p><p className="text-[13px] text-muted">{c ? `${c.granted ? 'Aan' : 'Uit'} sinds ${formatDate(c.recordedAt)}` : 'Uit'}</p></div>
                <ActionForm action={consentAction} submitLabel={c?.granted ? 'Uitzetten' : 'Aanzetten'} submitClassName="btn-secondary text-sm">
                  <input type="hidden" name="purpose" value={purpose} /><input type="hidden" name="granted" value={c?.granted ? 'false' : 'true'} />
                </ActionForm>
              </li>
            )
          })}
        </ul>
      </Section>
    </>
  )
}
