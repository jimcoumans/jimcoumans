import type { Metadata } from 'next'
import { formulierViaLink } from '@/lib/formulieren'
import type { Antwoorden } from '@/lib/formulieren/vragenlijst'
import { Logo } from '@/components/Logo'
import { PubliekeVragenlijst } from '../../PubliekeVragenlijst'

export const metadata: Metadata = { title: 'Een paar vragen vooraf · James Robinson', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * De vragenlijst (01.1) voor de klant, via een persoonlijke link. Geen login:
 * de link zelf is de sleutel, 30 dagen geldig, en hij werkt maar voor één
 * vragenlijst. Een verkeerde of verlopen link zegt niet waarom.
 */
export default async function VragenlijstPagina({ params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = await params
  const f = await formulierViaLink(id, token)

  return (
    <div className="min-h-screen bg-[#F2F2F7] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Logo onderschrift="Marketing &amp; Branding" />
        </div>
        {!f ? (
          <Melding kop="Deze link werkt niet (meer)">
            Vraag ons om een nieuwe: mail support@jamesrobinson.nl of bel 045 792 0009.
          </Melding>
        ) : f.status !== 'open' ? (
          <Melding kop="Je antwoorden zijn binnen. Dank je wel!">We nemen binnen een werkdag contact met je op.</Melding>
        ) : (
          <>
            <header className="mb-6">
              <p className="text-jr-blue text-sm font-medium">Voor {f.klantnaam}</p>
              <h1 className="mt-1 text-[30px] leading-tight sm:text-[36px]">Een paar vragen vooraf</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-gray-700">
                Vijftien korte vragen, zo’n vijf minuten. Schatten mag: een globaal getal is genoeg. Bij elke vraag over geld zeggen we waarom we hem stellen. Met je antwoorden kijken we naar je website en je markt voordat we elkaar spreken. Past het niet, dan hoor je dat direct, met de reden.
              </p>
            </header>
            <PubliekeVragenlijst id={id} token={token} antwoorden={f.antwoorden as Antwoorden} />
          </>
        )}
      </div>
    </div>
  )
}

function Melding({ kop, children }: { kop: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <h1 className="mb-2 text-[24px]">{kop}</h1>
      <p className="text-[15px] text-gray-700">{children}</p>
    </div>
  )
}
