import type { Metadata } from 'next'
import { uitvraagViaLink, omvangTekst, EENHEID_LABELS, type Eenheid } from '@/lib/partneraanvragen'
import { Logo } from '@/components/Logo'
import { ActionForm } from '@/components/ActionForm'
import { verstuurAntwoord } from '../../actions'
import { formatEuro } from '@/lib/money'
import { formatDate } from '@/lib/dates'

export const metadata: Metadata = { title: 'Aanvraag · James Robinson', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * Een uitvraag voor een partner, via een persoonlijke link. Geen login: de
 * link is de sleutel en werkt maar voor deze ene uitvraag. De partner ziet
 * alleen wat hij nodig heeft: niet wat andere partners rekenen en niet wat
 * de klant betaalt.
 */
export default async function UitvraagPagina({ params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = await params
  const u = await uitvraagViaLink(id, token)
  const veld = 'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400'

  return (
    <div className="min-h-screen bg-[#F2F2F7] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Logo onderschrift="Partners" />
        </div>
        {!u ? (
          <Kaart kop="Deze link werkt niet (meer)">Vraag ons om een nieuwe: mail support@jamesrobinson.nl of bel 045 792 0009.</Kaart>
        ) : u.status === 'bevestigd' || u.status === 'afgewezen' ? (
          <Kaart kop="Dank je wel">
            We hebben je antwoord verwerkt{u.status === 'bevestigd' ? ' en de opdracht bevestigd. Je hoort van ons over de briefing.' : '. Deze keer gaat de opdracht naar een ander; we komen graag bij je terug.'}
          </Kaart>
        ) : (
          <>
            <header className="mb-6">
              <p className="text-jr-blue text-sm font-medium">Voor {u.partnernaam}</p>
              <h1 className="mt-1 text-[30px] leading-tight sm:text-[34px]">
                {u.aanvraag.specialisme} voor {u.klant.name}
              </h1>
              {u.antwoord.beantwoordOp && (
                <p className="mt-3 rounded-lg bg-[#E6F7EB] px-4 py-3 text-sm text-[#1D7D3F]">
                  Je antwoord van {formatDate(u.antwoord.beantwoordOp)} is binnen. Klopt er iets niet meer, pas het hieronder aan.
                </p>
              )}
            </header>

            <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
              <dl className="space-y-3 text-[15px]">
                <div>
                  <dt className="text-xs text-gray-600">De vraag</dt>
                  <dd className="whitespace-pre-wrap">{u.aanvraag.vraag}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-600">Wanneer</dt>
                  <dd>{u.datum}</dd>
                </div>
                {u.aanvraag.locatie && (
                  <div>
                    <dt className="text-xs text-gray-600">Waar</dt>
                    <dd>{u.aanvraag.locatie}</dd>
                  </div>
                )}
                {(u.aanvraag.dagdelen || u.aanvraag.stuks) && (
                  <div>
                    <dt className="text-xs text-gray-600">Omvang</dt>
                    <dd>
                      {omvangTekst(u.aanvraag)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-600">Klant</dt>
                  <dd>{[u.klant.name, u.klant.city, u.klant.website].filter(Boolean).join(' · ')}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <ActionForm action={verstuurAntwoord} submitLabel="Verstuur mijn antwoord" resetOnSuccess={false} className="space-y-6" bevestig={false}>
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="token" value={token} />
                <fieldset>
                  <legend className="mb-2 text-[15px] font-medium">Kun je op deze datum?</legend>
                  <label className="flex items-center gap-2.5 text-[15px]">
                    <input type="radio" name="beschikbaar" value="ja" required defaultChecked={u.antwoord.beschikbaar === true} className="accent-jr-blue h-[18px] w-[18px]" />
                    Ja
                  </label>
                  <label className="mt-1.5 flex items-center gap-2.5 text-[15px]">
                    <input type="radio" name="beschikbaar" value="nee" defaultChecked={u.antwoord.beschikbaar === false} className="accent-jr-blue h-[18px] w-[18px]" />
                    Nee
                  </label>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-sm text-gray-700">Niet op die datum? Wanneer wel</span>
                    <input name="andereDatum" defaultValue={u.antwoord.andereDatum ?? ''} placeholder="Dinsdag 18 of woensdag 19 november" className={veld} />
                  </label>
                </fieldset>

                <fieldset>
                  <legend className="mb-2 text-[15px] font-medium">{u.pakketten.length > 0 ? 'Welk pakket past?' : 'Wat kost het?'}</legend>
                  {u.pakketten.map((p) => (
                    <label key={p.id} className="mb-2 flex items-start gap-2.5 text-[15px]">
                      <input
                        type="radio"
                        name="pakket"
                        value={p.id}
                        defaultChecked={(u.antwoord.antwoordPakketId ?? (u.antwoord.beantwoordOp ? null : u.voorgesteldPakketId)) === p.id}
                        className="accent-jr-blue mt-1 h-[18px] w-[18px]"
                      />
                      <span>
                        {p.naam}: <span className="tabular">{formatEuro(p.prijsCents)}</span> {EENHEID_LABELS[p.eenheid as Eenheid] ?? ''}
                        {p.omschrijving && <span className="block text-sm text-gray-600">{p.omschrijving}</span>}
                      </span>
                    </label>
                  ))}
                  {u.pakketten.length > 0 && (
                    <label className="flex items-center gap-2.5 text-[15px]">
                      <input type="radio" name="pakket" value="geen" defaultChecked={!!u.antwoord.beantwoordOp && !u.antwoord.antwoordPakketId} className="accent-jr-blue h-[18px] w-[18px]" />
                      Past in geen pakket
                    </label>
                  )}
                  <label className="mt-3 block">
                    <span className="mb-1 block text-sm text-gray-700">
                      {u.pakketten.length > 0 ? 'Past het in geen pakket, of wijkt de prijs af? Jouw prijs voor deze opdracht' : 'Jouw prijs voor deze opdracht'}, exclusief btw
                    </span>
                    <input name="prijs" defaultValue={u.antwoord.antwoordPrijsCents ? (u.antwoord.antwoordPrijsCents / 100).toFixed(2).replace('.', ',') : ''} placeholder="950,00" className={`${veld} max-w-[200px]`} />
                  </label>
                </fieldset>

                <label className="block">
                  <span className="mb-1 block text-[15px] font-medium">Opmerking</span>
                  <textarea name="opmerking" rows={3} defaultValue={u.antwoord.antwoordOpmerking ?? ''} placeholder="Reiskosten, wat je van de klant nodig hebt, een vraag over de opdracht." className={veld} />
                </label>
              </ActionForm>
            </div>
            <p className="mt-6 text-center text-xs text-gray-500">Vragen? Antwoord gewoon op de mail, of bel 045 792 0009.</p>
          </>
        )}
      </div>
    </div>
  )
}

function Kaart({ kop, children }: { kop: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <h1 className="mb-2 text-[24px]">{kop}</h1>
      <p className="text-[15px] text-gray-700">{children}</p>
    </div>
  )
}
