import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { CATEGORIEEN, CATEGORIE_LABELS, listRegels } from '@/lib/uitingen-check'
import { AppShell } from '@/components/AppShell'
import { PaginaKop } from '@/components/PaginaKop'
import { Paneel } from '@/components/Paneel'
import { ActionForm, Check, Field, Select, TextArea } from '@/components/ActionForm'
import { bewerkRegel, nieuweRegel, wisRegel } from '../../check-actions'

export const maxDuration = 26

const CATEGORIE_OPTIES = CATEGORIEEN.map((c) => ({ value: c, label: CATEGORIE_LABELS[c] }))

export default async function RegelsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const regels = await listRegels()
  const beheerder = user.role === 'admin'

  return (
    <AppShell user={user} actief="checks">
      <PaginaKop
        titel="Algemene regels"
        uitleg="Wat voor elke uiting van elke klant geldt. De check toetst elke actieve regel. Maatwerk per klant leg je vast op de klantkaart, tab Uitingen."
        acties={
          <>
            <a href="/beheer/checks" className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-jr-text hover:bg-gray-50">
              Alle checks
            </a>
            {beheerder && (
              <Paneel knop="+ Nieuwe regel" titel="Nieuwe regel" uitleg="Schrijf hem zo dat een nieuwe collega hem begrijpt: wat moet, en waarom.">
                <ActionForm action={nieuweRegel} submitLabel="Toevoegen">
                  <Field label="Titel" name="titel" required placeholder="Altijd een prijs bij een aanbieding" />
                  <TextArea label="De regel" name="tekst" required rows={4} />
                  <Select label="Soort" name="categorie" options={CATEGORIE_OPTIES} defaultValue="overig" />
                </ActionForm>
              </Paneel>
            )}
          </>
        }
      />
      {!beheerder && <p className="mb-4 text-sm text-gray-600">Alleen een beheerder wijzigt deze regels.</p>}
      <ul className="divide-y divide-gray-100 rounded-xl bg-white shadow-sm">
        {regels.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
            <div className={`min-w-0 flex-1 ${r.actief ? '' : 'opacity-50'}`}>
              <p className="text-sm font-medium">
                {r.titel}
                {!r.actief && <span className="ml-2 text-xs font-normal text-gray-500">uit</span>}
              </p>
              <p className="mt-0.5 text-sm text-gray-700">{r.tekst}</p>
              <p className="mt-1 text-xs text-gray-500">{CATEGORIE_LABELS[r.categorie]}</p>
            </div>
            {beheerder && (
              <div className="flex items-center gap-1">
                <Paneel knop="Wijzig" stijl="klein" titel="Regel wijzigen">
                  <ActionForm action={bewerkRegel} submitLabel="Opslaan" resetOnSuccess={false}>
                    <input type="hidden" name="id" value={r.id} />
                    <Field label="Titel" name="titel" required defaultValue={r.titel} />
                    <TextArea label="De regel" name="tekst" required rows={4} defaultValue={r.tekst} />
                    <Select label="Soort" name="categorie" options={CATEGORIE_OPTIES} defaultValue={r.categorie} />
                    <Check label="Actief: de check toetst deze regel" name="actief" defaultChecked={r.actief} />
                  </ActionForm>
                </Paneel>
                <ActionForm action={wisRegel} submitLabel="Verwijder" submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs" resetOnSuccess={false} meldGelukt={false} className="">
                  <input type="hidden" name="id" value={r.id} />
                </ActionForm>
              </div>
            )}
          </li>
        ))}
      </ul>
    </AppShell>
  )
}
