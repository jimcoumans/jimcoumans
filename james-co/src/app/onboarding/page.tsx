import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { getMyMembership, getMyOpenOffer } from '@/lib/domain/memberships'
import { withActor } from '@/lib/db'
import { Wordmark } from '@/components/Brand'
import { ActionForm } from '@/components/ActionForm'
import { Notice, DL } from '@/components/ui'
import { acceptOfferAction, declineOfferAction, profileAction } from '@/app/actions/member'
import { logoutAction } from '@/app/actions/auth'
import { APPLICATION_LABEL } from '@/lib/labels'
import { formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/time'

export const metadata: Metadata = { title: 'Uw aanmelding', robots: { index: false } }
export const dynamic = 'force-dynamic'

const PERIOD: Record<string, string> = { month: 'per maand', quarter: 'per kwartaal', year: 'per jaar', once: 'eenmalig' }

export default async function Onboarding() {
  const { session, actor } = await requireUser()
  if (session.staffRole) redirect('/ops')
  const membership = await getMyMembership(actor)
  if (membership && ['active', 'ending', 'suspended', 'ended'].includes(membership.status)) redirect('/app')
  const offer = await getMyOpenOffer(actor)
  const [application] = await withActor(actor, (tx) => tx<{ status: string; createdAt: Date }[]>`select status, created_at from applications where user_id = ${actor.userId} order by created_at desc limit 1`)
  const [profile] = await withActor(actor, (tx) => tx<{ fullName: string | null; displayName: string | null; phone: string | null; preferredContact: string | null }[]>`select full_name, display_name, phone, preferred_contact from profiles where id = ${actor.userId}`)

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Wordmark />
        <form action={logoutAction}><button className="btn-quiet text-sm">Uitloggen</button></form>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h1 className="mt-6 text-[40px] leading-tight">Welkom{profile?.displayName ? `, ${profile.displayName}` : ''}.</h1>
        {application && <p className="mt-2 text-[15px] text-muted">Uw aanmelding van {formatDate(application.createdAt)} — status: <strong className="text-ink">{APPLICATION_LABEL[application.status] ?? application.status}</strong></p>}

        {!offer && membership?.status !== 'accepted_pending_payment' && (
          <div className="mt-8"><Notice tone="forest" title="Wat gebeurt er nu?">We lezen uw aanvraag persoonlijk en nemen contact met u op voor een kennismaking. Daarna ontvangt u, als het past, hier een voorstel voor het lidmaatschap met prijs en voorwaarden.</Notice></div>
        )}

        {membership?.status === 'accepted_pending_payment' && (
          <div className="mt-8"><Notice tone="forest" title="Aanbod geaccepteerd">Dank u. U ontvangt de factuur voor het lidmaatschap. Zodra de betaling bij ons is ontvangen, activeren we uw lidmaatschap en kunt u uw eerste verzoek doen.</Notice></div>
        )}

        {offer && (
          <section className="card mt-8">
            <p className="eyebrow mb-2">Voorstel lidmaatschap · versie {offer.version}</p>
            <h2 className="text-[30px]">{formatMoney(offer.priceMinor, offer.currency)} {PERIOD[offer.billingPeriod]}</h2>
            <p className="text-sm text-muted">{offer.priceIncludesTax ? `Inclusief ${offer.taxRateBp / 100}% btw` : `Exclusief ${offer.taxRateBp / 100}% btw`} · geldig tot {formatDate(offer.expiresAt)}</p>
            <div className="mt-5"><DL items={[['Inhoud', <span key="s" className="whitespace-pre-line">{offer.scopeText}</span>], ['Voorwaarden', <span key="t" className="whitespace-pre-line">{offer.termsText}</span>], ['Versie voorwaarden', offer.termsVersion]]} /></div>
            <ActionForm action={acceptOfferAction} submitLabel="Aanbod accepteren" pendingLabel="Vastleggen…">
              <input type="hidden" name="offerId" value={offer.id} />
              <input type="hidden" name="snapshotHash" value={offer.snapshotHash} />
              <label className="mt-5 flex items-start gap-3 text-[15px]"><input type="checkbox" name="terms" required className="mt-0.5 h-5 w-5 accent-forest" /><span>Ik accepteer dit aanbod, de prijs en de voorwaarden zoals hierboven weergegeven.</span></label>
            </ActionForm>
            <div className="mt-3">
              <ActionForm action={declineOfferAction} submitLabel="Liever niet" submitClassName="btn-quiet" confirm="Weet u zeker dat u dit aanbod afwijst?">
                <input type="hidden" name="offerId" value={offer.id} />
              </ActionForm>
            </div>
          </section>
        )}

        <section className="card mt-8">
          <h2 className="mb-4 text-[24px]">Uw gegevens</h2>
          <ActionForm action={profileAction}>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <div className="mb-4"><label className="label" htmlFor="fullName">Naam</label><input className="field" id="fullName" name="fullName" defaultValue={profile?.fullName ?? ''} required /></div>
              <div className="mb-4"><label className="label" htmlFor="displayName">Aanspreeknaam</label><input className="field" id="displayName" name="displayName" defaultValue={profile?.displayName ?? ''} /></div>
              <div className="mb-4"><label className="label" htmlFor="phone">Telefoon</label><input className="field" id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ''} /></div>
              <div className="mb-4"><label className="label" htmlFor="preferredContact">Voorkeurscontact</label>
                <select className="field" id="preferredContact" name="preferredContact" defaultValue={profile?.preferredContact ?? 'email'}>
                  <option value="email">E-mail</option><option value="phone">Telefoon</option><option value="whatsapp">WhatsApp</option><option value="portal">Portaal</option>
                </select></div>
            </div>
          </ActionForm>
        </section>
        <p className="mt-6 text-sm text-muted">Vragen? <Link href="/contact" className="underline">Contact</Link></p>
      </main>
    </div>
  )
}
