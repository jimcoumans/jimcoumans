import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getCheck, getKlantVoorCheck, listKlantenVoorCheck, SOORTEN } from '@/lib/uitingen-check'
import { AppShell } from '@/components/AppShell'
import { PaginaKop } from '@/components/PaginaKop'
import { NieuweCheck } from '@/components/checks/NieuweCheck'

export const maxDuration = 26

export default async function NieuweCheckPage({ searchParams }: { searchParams: Promise<{ klant?: string; vorige?: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { klant, vorige: vorigeId } = await searchParams
  const vorige = vorigeId && /^[0-9a-f-]{36}$/i.test(vorigeId) ? await getCheck(vorigeId) : null
  if (vorigeId && !vorige) notFound()

  // Eerst de klant: welke merken, doelgroepen en campagnes er te kiezen zijn, hangt daarvan af.
  const gegevens = vorige ? await getKlantVoorCheck({ id: vorige.organizationId }) : klant ? await getKlantVoorCheck({ slug: klant }) : null
  if (!gegevens) {
    const klanten = await listKlantenVoorCheck()
    return (
      <AppShell user={user} actief="checks">
        <PaginaKop titel="Nieuwe check" uitleg="Voor welke klant is de uiting?" />
        <form className="flex max-w-xl flex-wrap items-end gap-3 rounded-xl bg-white p-6 shadow-sm">
          <label className="min-w-0 flex-1">
            <span className="text-jr-text mb-1.5 block text-[13px] font-medium">Klant</span>
            <select name="klant" required defaultValue="" className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[15px]">
              <option value="">Kies de klant</option>
              {klanten.map((k) => (
                <option key={k.slug} value={k.slug}>
                  {k.name}
                  {k.status === 'prospect' ? ' (in gesprek)' : ''}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="bg-jr-btn hover:bg-jr-btnhover min-h-11 rounded-lg px-5 py-2 text-sm font-medium text-white">
            Verder
          </button>
        </form>
      </AppShell>
    )
  }

  const { organisatie, instellingen, campagnes, basis } = gegevens
  const merken =
    instellingen.merken.length > 0
      ? [{ value: '', label: `${organisatie.name} (hoofdmerk)` }, ...instellingen.merken.map((m) => ({ value: m.id, label: m.naam }))]
      : []
  const ontbreekt = [
    basis.afspraken === 0 ? 'nog geen afspraken met deze klant' : null,
    basis.logos === 0 ? 'geen logo’s in de merkkluis' : null,
    !basis.stem ? 'geen tone of voice' : null,
  ].filter(Boolean)

  return (
    <AppShell user={user} actief="checks">
      <PaginaKop
        titel={vorige ? `Nieuwe versie: ${vorige.titel}` : 'Nieuwe check'}
        uitleg={`Voor ${organisatie.name}. De check gebruikt ${basis.regels} algemene ${basis.regels === 1 ? 'regel' : 'regels'}, ${basis.afspraken} ${basis.afspraken === 1 ? 'afspraak' : 'afspraken'} met de klant, ${basis.logos} ${basis.logos === 1 ? 'logo' : 'logo’s'} uit de merkkluis${basis.stem ? ' en de tone of voice' : ''}.`}
      />
      {ontbreekt.length > 0 && (
        <p className="mb-6 max-w-3xl rounded-lg border-l-4 border-jr-orange bg-jr-orange/10 px-4 py-3 text-sm">
          Let op: {ontbreekt.join(', ')}. De check toetst dan alleen op de algemene regels, spelling en de landingspagina.{' '}
          <a href={`/beheer/klanten/${organisatie.slug}?tab=uitingen`} className="text-jr-link font-medium hover:underline">
            Vul het aan op de klantkaart
          </a>
        </p>
      )}
      <div className="max-w-3xl">
        <NieuweCheck
          organizationId={organisatie.id}
          soorten={SOORTEN.map((s) => ({ value: s.value, label: s.label }))}
          merken={merken}
          doelgroepen={instellingen.doelgroepen.map((d) => ({ value: d.id, label: d.name }))}
          campagnes={campagnes.map((c) => ({ value: c.id, label: c.title }))}
          vorige={
            vorige
              ? {
                  id: vorige.id,
                  titel: vorige.titel,
                  soort: vorige.soort,
                  kanaal: vorige.kanaal,
                  merkId: vorige.merkId,
                  kanaalMerkId: vorige.kanaalMerkId,
                  doelgroepId: vorige.doelgroepId,
                  campaignId: vorige.campaignId,
                  doel: vorige.doel,
                  tekst: vorige.tekst,
                  uitingUrl: vorige.uitingUrl,
                  lpUrl: vorige.lpUrl,
                  toelichting: vorige.toelichting,
                  bestanden: vorige.bestanden.length,
                }
              : null
          }
        />
      </div>
    </AppShell>
  )
}
