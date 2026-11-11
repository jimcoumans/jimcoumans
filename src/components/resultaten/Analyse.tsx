import type { ReportAction } from '@/db/schema'
import { formatDate } from '@/lib/dates'
import type { Bevinding, Eigenaar, Ernst } from '@/lib/resultaten/analyse'
import { vinkActieAan, vinkActieUit, zetActieStatus } from '@/app/beheer/resultaten-actions'
import s from './resultaten.module.css'

/* -------------------------------------------------------------------------
   De analyse onderaan: wat de cijfers zeggen, en wat we eraan doen.

   De klant ziet de bevindingen met de knoppen, en alleen de acties die de
   marketingmanager heeft aangevinkt. In het beheer staan er knoppen bij om
   aan te vinken, met de urgentie die het systeem eraan geeft.
   ------------------------------------------------------------------------- */

const EIGENAAR: Record<Eigenaar, { klasse: string | undefined; label: string }> = {
  wij: { klasse: s.eig_wij, label: 'Wij' },
  jullie: { klasse: s.eig_jullie, label: 'Jullie' },
  kost_geld: { klasse: s.eig_kost_geld, label: 'Kost geld' },
}
const ERNST_KAART: Record<Ernst, string | undefined> = { urgent: s.b_urgent, aandacht: s.b_aandacht, neutraal: undefined, goed: s.b_goed }
const STATUS: Record<string, { klasse: string | undefined; label: string }> = {
  gepland: { klasse: s.status, label: 'Gepland' },
  bezig: { klasse: s.status_bezig, label: 'Bezig' },
  klaar: { klasse: s.status_klaar, label: 'Klaar' },
}

export type BeheerContext = { slug: string; organizationId: string; maand: string }

export function Analyse({ bevindingen, acties, beheer }: { bevindingen: Bevinding[]; acties: ReportAction[]; beheer?: BeheerContext }) {
  const gekozen = new Map(acties.map((a) => [`${a.findingCode}|${a.action}`, a]))

  return (
    <section className={s.analyse} id="analyse" aria-label="Analyse">
      <div className={s.kaartKop}>
        <span className={s.k}>Analyse</span>
        <h2>Wat de cijfers zeggen, en wat we eraan doen</h2>
      </div>

      <div className={s.kaart}>
        <div className={s.kaartKop}>
          <span className={s.k}>Vastgelegd door je marketingmanager</span>
          <h3>Waar we aan werken</h3>
        </div>
        {acties.length === 0 ? (
          <p className={s.leeg}>
            {beheer
              ? 'Nog niets aangevinkt voor deze maand. Kies hieronder bij de bevindingen wat je gaat doen; alleen dat ziet de klant.'
              : 'Voor deze maand zijn nog geen acties vastgelegd. Je marketingmanager kiest ze na de maandafsluiting.'}
          </p>
        ) : (
          <div>
            {acties.map((a) => {
              const st = STATUS[a.status] ?? STATUS.gepland!
              return (
                <div key={a.id} className={s.actie}>
                  <span className={st.klasse}>{st.label}</span>
                  <div>
                    {a.action}
                    <span className={s.actieM}>
                      {a.findingTitle} · uitvoering: {a.owner === 'jullie' ? 'jullie' : a.owner === 'kost_geld' ? 'James Robinson, met extra budget' : 'James Robinson'} · vastgelegd{' '}
                      {formatDate(a.createdAt)}
                    </span>
                  </div>
                  {beheer ? (
                    <div className={s.inline}>
                      <form action={zetActieStatus} className={s.inline}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="organizationId" value={beheer.organizationId} />
                        <input type="hidden" name="slug" value={beheer.slug} />
                        {(['gepland', 'bezig', 'klaar'] as const).map((x) => (
                          <button key={x} type="submit" name="status" value={x} className={a.status === x ? s.knopjeAan : s.knopje} aria-pressed={a.status === x}>
                            {STATUS[x]!.label}
                          </button>
                        ))}
                      </form>
                      <form action={vinkActieUit}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="organizationId" value={beheer.organizationId} />
                        <input type="hidden" name="slug" value={beheer.slug} />
                        <button type="submit" className={s.knopje} title="Uitvinken: de klant ziet deze actie dan niet meer">
                          ✕
                        </button>
                      </form>
                    </div>
                  ) : (
                    <span />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className={s.kaartKop}>
        <h3>Wat we zien, en de knoppen die er zijn</h3>
        <div className={s.legendaEig}>
          <span>
            <span className={s.eig_wij}>Wij</span> zit in de retainer
          </span>
          <span>
            <span className={s.eig_jullie}>Jullie</span> beslissing of actie
          </span>
          <span>
            <span className={s.eig_kost_geld}>Kost geld</span> extra budget
          </span>
          <span>
            <span className={s.gekozen}>✓ gekozen</span> staat bij &quot;Waar we aan werken&quot;
          </span>
        </div>
      </div>

      {bevindingen.map((b) => (
        <article key={b.code} className={`${s.bevinding} ${ERNST_KAART[b.ernst] ?? ''}`}>
          <div className={s.bKop}>
            <b>{b.titel}</b>
            {beheer && b.ernst === 'urgent' && <span className={s.u_urgent}>Urgent</span>}
            {beheer && b.ernst === 'aandacht' && <span className={s.u_aandacht}>Aandacht</span>}
          </div>
          <div className={s.bCols}>
            <div>
              <span className={s.k}>WAAROM</span>
              <p style={{ fontSize: 13 }}>{b.waarom}</p>
            </div>
            <div>
              <span className={s.k}>KNOPPEN</span>
              <ul className={s.knoppen}>
                {b.knoppen.map((k) => {
                  const actie = gekozen.get(`${b.code}|${k.tekst}`)
                  const e = EIGENAAR[k.eigenaar]
                  return (
                    <li key={k.tekst}>
                      <span className={e.klasse}>{e.label}</span>
                      <span>
                        {k.tekst} {actie && <span className={s.gekozen}>✓ gekozen</span>}
                      </span>
                      {beheer && !actie ? (
                        <form action={vinkActieAan}>
                          <input type="hidden" name="organizationId" value={beheer.organizationId} />
                          <input type="hidden" name="slug" value={beheer.slug} />
                          <input type="hidden" name="maand" value={beheer.maand} />
                          <input type="hidden" name="code" value={b.code} />
                          <input type="hidden" name="titel" value={b.titel} />
                          <input type="hidden" name="actie" value={k.tekst} />
                          <input type="hidden" name="eigenaar" value={k.eigenaar} />
                          <button type="submit" className={s.knopje}>
                            Aanvinken
                          </button>
                        </form>
                      ) : (
                        <span />
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}
