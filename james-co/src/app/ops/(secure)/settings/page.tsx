import { requireAdmin } from '@/lib/auth/session'
import { getSettings } from '@/lib/domain/settings'
import { listStaff } from '@/lib/domain/members'
import { integrationStatuses } from '@/lib/integrations'
import { appEnv, appUrl, staffMfaRequired } from '@/lib/config'
import { ActionForm } from '@/components/ActionForm'
import { TeamInvite } from '@/components/TeamInvite'
import { PageTitle, Section, Badge } from '@/components/ui'
import { settingAction, staffUpsertAction } from '@/app/actions/staff'

function Key({ k }: { k: string }) { return <input type="hidden" name="key" value={k} /> }

export default async function Settings() {
  const { actor } = await requireAdmin()
  const [s, team] = await Promise.all([getSettings(), listStaff(actor)])
  const plan = s.membershipPlan
  return (
    <>
      <PageTitle title="Instellingen">Niets hier is een vastgesteld bedrijfsfeit totdat jullie het invullen en activeren. Publieke weergave volgt alleen na expliciet aanzetten.</PageTitle>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section title="Omgeving en koppelingen">
          <p className="mb-3 text-sm">Omgeving: <Badge tone={appEnv() === 'production' ? 'ok' : 'warn'}>{appEnv()}</Badge> · URL {appUrl()} · MFA staff {staffMfaRequired() ? 'verplicht' : 'uit (alleen lokaal)'}</p>
          <ul className="space-y-2 text-[14px]">{integrationStatuses().map((i) => (
            <li key={i.key} className="flex items-start justify-between gap-3 rounded-lg bg-canvas p-2"><span><strong>{i.label}</strong><br /><span className="text-[12px] text-muted">{i.note}</span></span><Badge tone={i.status === 'configured' ? 'ok' : i.status === 'manual' ? 'forest' : 'warn'}>{i.status === 'configured' ? 'Ingericht' : i.status === 'manual' ? 'Handmatig' : 'Niet ingericht'}</Badge></li>
          ))}</ul>
        </Section>
        <Section title="Bedrijfsgegevens">
          <ActionForm action={settingAction}>
            <Key k="company" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-sm">Handelsnaam<input className="field mt-1" name="tradeName" defaultValue={s.company.tradeName} /></label>
              <label className="text-sm">Juridische naam<input className="field mt-1" name="legalName" defaultValue={s.company.legalName} /></label>
              <label className="text-sm">KvK<input className="field mt-1" name="kvk" defaultValue={s.company.kvk} /></label>
              <label className="text-sm">Btw-nummer<input className="field mt-1" name="vat" defaultValue={s.company.vat} /></label>
              <label className="text-sm sm:col-span-2">Adres<input className="field mt-1" name="address" defaultValue={s.company.address} /></label>
              <label className="text-sm">E-mail<input className="field mt-1" name="email" defaultValue={s.company.email} /></label>
              <label className="text-sm">Telefoon<input className="field mt-1" name="phone" defaultValue={s.company.phone} /></label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="published" defaultChecked={s.company.published} className="h-4 w-4 accent-forest" /> Publiceren op contactpagina en footer (alleen met juridische naam en e-mail)</label>
            </div>
          </ActionForm>
        </Section>
        <Section title="Service-uren">
          <ActionForm action={settingAction}>
            <Key k="serviceHours" />
            <label className="text-sm">Omschrijving<input className="field mt-1" name="description" defaultValue={s.serviceHours.description} placeholder="bijv. Bereikbaar op werkdagen van 9.00 tot 18.00 uur." /></label>
            <label className="mt-2 block text-sm">Reactietijd<input className="field mt-1" name="responseTime" defaultValue={s.serviceHours.responseTime} placeholder="bijv. Binnen die uren reageren we doorgaans binnen 2 uur." /></label>
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={s.serviceHours.enabled} className="h-4 w-4 accent-forest" /> Activeren (alleen als de uren operationeel gedekt zijn)</label>
          </ActionForm>
        </Section>
        <Section title="WhatsApp">
          <ActionForm action={settingAction}>
            <Key k="whatsapp" />
            <label className="text-sm">Zakelijk nummer (internationaal)<input className="field mt-1" name="number" defaultValue={s.whatsapp.number} placeholder="+316…" /></label>
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={s.whatsapp.enabled} className="h-4 w-4 accent-forest" /> Knop tonen op de site</label>
            <p className="hint">Zonder API: gesprekken worden niet automatisch gesynchroniseerd. Leg verzoeken handmatig vast in het dossier.</p>
          </ActionForm>
        </Section>
        <Section title="Lidmaatschapsaanbod (standaard)">
          <ActionForm action={settingAction}>
            <Key k="membershipPlan" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="text-sm">Prijs €<input className="field mt-1" name="price" defaultValue={(plan.priceMinor / 100).toFixed(2).replace('.', ',')} /></label>
              <label className="text-sm">Btw %<input className="field mt-1" name="taxRate" defaultValue={String(plan.taxRateBp / 100)} /></label>
              <label className="text-sm">Periode<select className="field mt-1" name="billingPeriod" defaultValue={plan.billingPeriod}><option value="month">Maand</option><option value="quarter">Kwartaal</option><option value="year">Jaar</option><option value="once">Eenmalig</option></select></label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="includesTax" defaultChecked={plan.includesTax} className="h-4 w-4 accent-forest" /> Prijs is inclusief btw</label>
              <label className="text-sm">Aanbod geldig (dagen)<input className="field mt-1" type="number" name="offerValidDays" defaultValue={plan.offerValidDays} /></label>
              <label className="text-sm sm:col-span-3">Inhoud<textarea className="field mt-1 min-h-[100px]" name="scopeText" defaultValue={plan.scopeText} /></label>
              <label className="text-sm">Versie voorwaarden<input className="field mt-1" name="termsVersion" defaultValue={plan.termsVersion} /></label>
              <label className="text-sm sm:col-span-3">Voorwaarden<textarea className="field mt-1 min-h-[140px]" name="termsText" defaultValue={plan.termsText} /></label>
            </div>
            <p className="hint">Testvoorstel, geen vastgestelde prijs of belastingadvies. Laat de btw-behandeling bevestigen door een fiscalist.</p>
          </ActionForm>
        </Section>
        <Section title="Capaciteit en uitnodigingen">
          <ActionForm action={settingAction}><Key k="capacity" />
            <label className="text-sm">Maximum actieve leden (operationele capaciteit, niet publiek)<input className="field mt-1 max-w-[160px]" type="number" name="maxActiveMembers" defaultValue={s.capacity.maxActiveMembers} /></label>
          </ActionForm>
          <div className="mt-5 border-t border-line pt-4">
            <ActionForm action={settingAction}><Key k="invitations" />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">Open links per lid<input className="field mt-1" type="number" name="maxOpenPerMember" defaultValue={s.invitations.maxOpenPerMember} /></label>
                <label className="text-sm">Geldigheid (dagen)<input className="field mt-1" type="number" name="validDays" defaultValue={s.invitations.validDays} /></label>
              </div>
            </ActionForm>
          </div>
          <div className="mt-5 border-t border-line pt-4"><TeamInvite /></div>
        </Section>
        <Section title="Team">
          <ul className="mb-4 space-y-1 text-[14px]">{team.map((t) => <li key={t.userId}>{t.fullName} · {t.email} · <Badge tone={t.active ? 'ok' : 'neutral'}>{t.role}{t.active ? '' : ' (inactief)'}</Badge></li>)}</ul>
          <ActionForm action={staffUpsertAction} resetOnSuccess submitLabel="Opslaan" submitClassName="btn-secondary">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input className="field" name="fullName" required placeholder="Naam" aria-label="Naam" />
              <input className="field" name="email" type="email" required placeholder="E-mail" aria-label="E-mail" />
              <select className="field" name="role" aria-label="Rol"><option value="concierge">Concierge</option><option value="admin">Admin</option></select>
              <select className="field" name="active" aria-label="Actief"><option value="true">Actief</option><option value="false">Inactief (sessies worden beëindigd)</option></select>
            </div>
            <p className="hint">U kunt uw eigen rol niet wijzigen. Nieuwe medewerkers stellen bij eerste login tweestapsverificatie in.</p>
          </ActionForm>
        </Section>
      </div>
    </>
  )
}
