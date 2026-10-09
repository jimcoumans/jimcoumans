'use client'

import { startTransition, useActionState, useState } from 'react'
import { leverAan, type Aanlevering } from './actions'

const VELD = 'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400 focus:border-jr-blue'
const MAX_TOTAAL = 4.5 * 1024 * 1024

/**
 * Een foto van een paspoort of formulier is van een telefoon al snel 4 MB.
 * In de browser verkleinen naar 2000 pixels breed: scherp genoeg om te lezen,
 * klein genoeg om in één keer te versturen. Pdf's blijven zoals ze zijn.
 */
async function verklein(bestand: File): Promise<Blob> {
  if (!bestand.type.startsWith('image/') || bestand.size < 900 * 1024) return bestand
  const beeld = await createImageBitmap(bestand)
  const schaal = Math.min(1, 2000 / Math.max(beeld.width, beeld.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(beeld.width * schaal)
  canvas.height = Math.round(beeld.height * schaal)
  canvas.getContext('2d')!.drawImage(beeld, 0, 0, canvas.width, canvas.height)
  return new Promise((klaar) => canvas.toBlob((b) => klaar(b ?? bestand), 'image/jpeg', 0.85))
}

function Veld({ label, name, hint, ...rest }: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-jr-text mb-1.5 block text-[13px] font-medium">{label}</span>
      <input name={name} className={VELD} {...rest} />
      {hint && <span className="mt-1 block text-xs text-gray-600">{hint}</span>}
    </label>
  )
}

export function GegevensFormulier({
  id,
  token,
  voornaam,
  bekend,
  formulierLink = null,
}: {
  id: string
  token: string
  voornaam: string
  /** Het lege formulier van de Belastingdienst om te downloaden, als het bij de bedrijfsgegevens staat. */
  formulierLink?: string | null
  bekend: { voornamen: string; tussenvoegsel: string; achternaam: string; adres: string; postcode: string; woonplaats: string; geboortedatum: string; geboorteplaats: string; geslacht: string; nationaliteit: string; email: string; telefoon: string; noodNaam: string; noodRelatie: string; noodTelefoon: string; heeftIban: boolean; heeftId: boolean; heeftLoonheffing: boolean }
}) {
  const [state, actie, bezig] = useActionState<Aanlevering, FormData>(async (vorige, data) => {
    try {
      return await leverAan(vorige, data)
    } catch {
      return { ok: false, error: 'Versturen lukte niet. Herlaad de pagina en probeer het nog eens.' }
    }
  }, null)
  const [voorbereiden, setVoorbereiden] = useState<string | null>(null)

  if (state?.ok) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-3 text-[24px] leading-tight">Dank je{voornaam ? `, ${voornaam}` : ''}. We hebben het binnen.</h2>
        {state.ontbreekt.length > 0 ? (
          <p className="text-[15px] text-gray-700">
            Er ontbreekt nog: {state.ontbreekt.join(', ')}. Gebruik dezelfde link om dat aan te vullen; wat je al stuurde, blijft staan.
          </p>
        ) : (
          <p className="text-[15px] text-gray-700">Alles is compleet. Wij geven het door aan onze salarisadministratie. Je hoeft verder niets te doen.</p>
        )}
      </div>
    )
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const data = new FormData(form)
        setVoorbereiden('Bestanden voorbereiden…')
        let totaal = 0
        for (const naam of ['id_kopie', 'id_kopie_achter', 'loonheffing']) {
          const f = data.get(naam)
          if (f instanceof File && f.size > 0) {
            const klein = await verklein(f)
            totaal += klein.size
            data.set(naam, klein, f.name.replace(/\.(heic|png|jpe?g)$/i, '') + (klein.type === 'image/jpeg' && klein !== f ? '.jpg' : f.name.match(/\.[a-z]+$/i)?.[0] ?? ''))
          }
        }
        setVoorbereiden(null)
        if (totaal > MAX_TOTAAL) {
          alert('De bestanden zijn samen te groot. Stuur de pdf als kleinere scan, of verstuur ze in twee keer: eerst het ID, daarna het formulier.')
          return
        }
        startTransition(() => actie(data))
      }}
      className="space-y-7 rounded-2xl bg-white p-5 shadow-sm sm:p-8"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="token" value={token} />
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>
          Laat dit veld leeg
          <input name="bedrijfswebsite" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-[17px] font-semibold">Je naam, zoals in je paspoort of ID-kaart</legend>
        <Veld label="Alle voornamen, voluit" name="voornamen" defaultValue={bekend.voornamen} required autoComplete="given-name" hint="Zonder je achternaam: die heeft een eigen veld." />
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <Veld label="Tussenvoegsel" name="tussenvoegsel" defaultValue={bekend.tussenvoegsel} />
          <Veld label="Achternaam" name="achternaam" defaultValue={bekend.achternaam} required autoComplete="family-name" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Veld label="Geboortedatum" name="geboortedatum" type="date" defaultValue={bekend.geboortedatum} required autoComplete="bday" />
          <Veld label="Geboorteplaats" name="geboorteplaats" defaultValue={bekend.geboorteplaats} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-jr-text mb-1.5 block text-[13px] font-medium">Geslacht</span>
            <select name="geslacht" defaultValue={bekend.geslacht} className={VELD}>
              <option value="">Kies</option>
              <option value="man">Man</option>
              <option value="vrouw">Vrouw</option>
              <option value="x">X</option>
            </select>
          </label>
          <Veld label="Nationaliteit" name="nationaliteit" defaultValue={bekend.nationaliteit} placeholder="Nederlandse" />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-[17px] font-semibold">Hoe we je bereiken</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Veld label="E-mail" name="email" type="email" defaultValue={bekend.email} autoComplete="email" />
          <Veld label="Mobiel nummer" name="telefoon" type="tel" defaultValue={bekend.telefoon} autoComplete="tel" />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-[17px] font-semibold">Je adres</legend>
        <Veld label="Straat en huisnummer" name="adres" defaultValue={bekend.adres} required autoComplete="street-address" />
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <Veld label="Postcode" name="postcode" defaultValue={bekend.postcode} required autoComplete="postal-code" />
          <Veld label="Woonplaats" name="woonplaats" defaultValue={bekend.woonplaats} required autoComplete="address-level2" />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-[17px] font-semibold">Waar we je salaris op storten</legend>
        <Veld
          label="IBAN"
          name="iban"
          placeholder={bekend.heeftIban ? 'Al ontvangen; alleen invullen om te wijzigen' : 'NL00 BANK 0123 4567 89'}
          required={!bekend.heeftIban}
          autoComplete="off"
          hint="Staat op je bankpas of in je bankapp."
        />
        <Veld label="Ten name van" name="tenaamstelling" autoComplete="name" />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-[17px] font-semibold">Wie we bellen als er iets is</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <Veld label="Naam" name="noodNaam" defaultValue={bekend.noodNaam} />
          <Veld label="Relatie" name="noodRelatie" defaultValue={bekend.noodRelatie} placeholder="Partner, ouder…" />
          <Veld label="Telefoon" name="noodTelefoon" type="tel" defaultValue={bekend.noodTelefoon} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-[17px] font-semibold">Twee documenten</legend>
        <p className="text-sm text-gray-600">Een foto met je telefoon is prima, zolang alles goed leesbaar is. Pdf, jpg of png.</p>
        <label className="block">
          <span className="text-jr-text mb-1.5 block text-[13px] font-medium">
            Kopie van je paspoort of ID-kaart (voorkant){bekend.heeftId && <span className="font-normal text-[#1d7a36]"> · al ontvangen</span>}
          </span>
          <input type="file" name="id_kopie" accept="application/pdf,image/jpeg,image/png" capture="environment" className="block w-full text-sm" />
        </label>
        <label className="block">
          <span className="text-jr-text mb-1.5 block text-[13px] font-medium">Achterkant (bij een ID-kaart)</span>
          <input type="file" name="id_kopie_achter" accept="application/pdf,image/jpeg,image/png" capture="environment" className="block w-full text-sm" />
        </label>
        <label className="block">
          <span className="text-jr-text mb-1.5 block text-[13px] font-medium">
            Ingevuld en ondertekend loonheffingsformulier{bekend.heeftLoonheffing && <span className="font-normal text-[#1d7a36]"> · al ontvangen</span>}
          </span>
          <input type="file" name="loonheffing" accept="application/pdf,image/jpeg,image/png" className="block w-full text-sm" />
          <span className="mt-1 block text-xs text-gray-600">
            Het formulier “Opgaaf gegevens voor de loonheffingen” van de Belastingdienst
            {formulierLink ? (
              <>
                {' '}
                (
                <a href={formulierLink} target="_blank" rel="noopener" className="text-jr-link underline">
                  download het hier
                </a>
                )
              </>
            ) : null}
            . Vul het in, geef aan of je loonheffingskorting wilt, teken het en upload een scan of foto.
          </span>
        </label>
      </fieldset>

      {state?.ok === false && (
        <p role="alert" className="rounded-lg bg-[#FDECEA] px-4 py-3 text-sm text-[#C02A22]">
          {state.error}
        </p>
      )}

      <div>
        <button type="submit" disabled={bezig || !!voorbereiden} className="bg-jr-btn hover:bg-jr-btnhover min-h-12 w-full rounded-full px-6 text-[15px] font-medium text-white disabled:opacity-50 sm:w-auto">
          {voorbereiden ?? (bezig ? 'Versturen…' : 'Verstuur mijn gegevens')}
        </button>
        <p className="mt-3 text-xs text-gray-500">
          Je gegevens gaan versleuteld naar ons. Alleen de eigenaren van James Robinson kunnen ze inzien, en we geven ze alleen door aan onze salarisadministratie.
        </p>
      </div>
    </form>
  )
}
