import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { PaginaKop, LeegVlak } from '@/components/PaginaKop'
import { FilterBalk, Zoekveld } from '@/components/FilterBalk'
import { KandidaatKaartWeergave } from '@/components/KandidaatKaart'
import { listKandidaten, listVacatures } from '@/lib/werving'
import { listDocumentenPerKandidaat } from '@/lib/sollicitatie'

export const maxDuration = 26

const FASEN = [
  { value: 'lopend', label: 'In procedure' },
  { value: 'afgesloten', label: 'Afgerond' },
  { value: 'alles', label: 'Alle fasen' },
] as const

const PIL = 'min-h-11 rounded-full border border-gray-300 bg-white py-2.5 pr-9 pl-4 text-[15px] outline-none hover:border-gray-400'

/**
 * Alle kandidaten op één plek, ook wie op geen vacature solliciteerde.
 * Een open sollicitatie had eerst geen eigen pagina en raakte zo uit beeld.
 */
export default async function KandidatenPagina({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; fase?: string; vacature?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { q = '', fase: faseParam, vacature = '' } = await searchParams
  const fase = FASEN.some((f) => f.value === faseParam) ? (faseParam as (typeof FASEN)[number]['value']) : 'lopend'

  const [alle, vacatures] = await Promise.all([listKandidaten({ status: fase }), listVacatures()])
  const zoek = q.trim().toLowerCase()
  const kandidaten = alle
    .filter((k) => (vacature === 'open' ? k.vacatureId === null : vacature ? k.vacatureId === vacature : true))
    .filter((k) => !zoek || [k.kandidaat.name, k.kandidaat.email ?? '', k.vacatureTitel ?? ''].some((v) => v.toLowerCase().includes(zoek)))
    // Nieuwste sollicitaties bovenaan: daar ligt meestal het werk.
    .sort((a, b) => b.kandidaat.appliedOn.getTime() - a.kandidaat.appliedOn.getTime())
  const bestanden = await listDocumentenPerKandidaat(kandidaten.map((k) => k.kandidaat.id))
  const filtert = zoek !== '' || vacature !== '' || fase !== 'lopend'

  return (
    <AppShell user={user} actief="kandidaten">
      <a href="/beheer/werving" className="text-jr-link text-sm hover:underline">
        &larr; Vacatures
      </a>
      <PaginaKop
        titel="Alle kandidaten"
        uitleg="Iedereen die solliciteerde of die we benaderden, met of zonder vacature. De nieuwste bovenaan."
        cijfers={[
          { label: 'Getoond', waarde: kandidaten.length },
          { label: 'Wachten op antwoord', waarde: kandidaten.filter((k) => k.wachtDagen !== null).length, toon: 'let-op' },
          { label: 'Zonder vervolgstap', waarde: kandidaten.filter((k) => k.looptAchter).length, toon: 'let-op' },
        ]}
      />

      <FilterBalk wisHref={filtert ? '/beheer/werving/kandidaten' : null}>
        <Zoekveld naam="q" waarde={q} placeholder="Zoek op naam, e-mail of vacature" />
        <select name="fase" defaultValue={fase} aria-label="Fase" className={PIL}>
          {FASEN.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select name="vacature" defaultValue={vacature} aria-label="Vacature" className={PIL}>
          <option value="">Alle vacatures</option>
          <option value="open">Open sollicitaties</option>
          {vacatures.map((v) => (
            <option key={v.vacature.id} value={v.vacature.id}>
              {v.vacature.title}
            </option>
          ))}
        </select>
      </FilterBalk>

      {kandidaten.length === 0 ? (
        <LeegVlak
          titel={filtert ? 'Niemand gevonden' : 'Nog geen kandidaten'}
          tekst={filtert ? 'Probeer een andere zoekterm, of kies “Alle fasen”.' : 'Sollicitaties via de website komen hier vanzelf binnen. Iemand die je zelf benadert, voeg je toe bij Werving.'}
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {kandidaten.map((k) => (
            <div key={k.kandidaat.id}>
              <p className="mb-1.5 px-1 text-xs text-gray-500">
                {k.vacatureId ? (
                  <a href={`/beheer/werving/${k.vacatureId}`} className="hover:text-jr-link">
                    {k.vacatureTitel}
                  </a>
                ) : (
                  'Open sollicitatie'
                )}
              </p>
              <KandidaatKaartWeergave kaart={k} vacatureId={k.vacatureId} bestanden={bestanden.get(k.kandidaat.id) ?? []} />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
