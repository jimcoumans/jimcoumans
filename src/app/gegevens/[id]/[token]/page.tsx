import type { Metadata } from 'next'
import { gegevensViaLink, getGegevens } from '@/lib/persoonsgegevens'
import { formatDateInput } from '@/lib/dates'
import { Logo } from '@/components/Logo'
import { GegevensFormulier } from '../../GegevensFormulier'

export const metadata: Metadata = { title: 'Je gegevens voor het contract · James Robinson', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * Een nieuwe collega levert zijn gegevens aan voor het contract en de
 * salarisadministratie. Geen login: de link is de sleutel, veertien dagen
 * geldig, voor één persoon. Een verkeerde of verlopen link zegt niet waarom.
 *
 * Wat we al weten, staat alvast ingevuld; het IBAN en de documenten tonen we
 * nooit terug, alleen dat we ze hebben.
 */
export default async function GegevensPagina({ params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = await params
  const r = await gegevensViaLink(id, token)
  const g = r ? await getGegevens(r.candidateId ? { candidateId: r.candidateId } : { userId: r.userId! }) : null

  return (
    <div className="min-h-screen bg-[#F2F2F7] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Logo onderschrift="Marketing &amp; Branding" />
        </div>
        {!r || !g ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-3 text-[24px] leading-tight">Deze link werkt niet (meer)</h2>
            <p className="text-[15px] text-gray-700">Vraag ons om een nieuwe: mail work@jamesrobinson.nl of bel 045 792 0009.</p>
          </div>
        ) : (
          <>
            <header className="mb-6">
              <p className="text-jr-blue text-sm font-medium">Welkom bij James Robinson{r.voornaam ? `, ${r.voornaam}` : ''}</p>
              <h1 className="mt-1 text-[30px] leading-tight sm:text-[36px]">Je gegevens voor het contract</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-gray-700">
                Voor je contract en je eerste salaris hebben we een paar dingen van je nodig. Vijf minuten, en je kunt het in delen doen: wat je instuurt, blijft bewaard, en met dezelfde link vul je later aan.
              </p>
            </header>
            <GegevensFormulier
              id={id}
              token={token}
              voornaam={r.voornaam}
              bekend={{
                voornamen: g.record.officialFirstNames ?? '',
                tussenvoegsel: g.record.infix ?? '',
                achternaam: g.record.lastName ?? '',
                adres: g.record.addressLine ?? '',
                postcode: g.record.postalCode ?? '',
                woonplaats: g.record.city ?? '',
                geboortedatum: g.record.birthDate ? formatDateInput(g.record.birthDate) : '',
                geboorteplaats: g.record.birthPlace ?? '',
                heeftIban: !!g.record.ibanEnc,
                heeftId: g.documenten.some((d) => d.kind === 'id_kopie'),
                heeftLoonheffing: g.documenten.some((d) => d.kind === 'loonheffing'),
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
