'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startCheck } from './start'

/* -------------------------------------------------------------------------
   Een uiting insturen voor de check.

   Afbeeldingen worden in de browser eerst verkleind tot hooguit 2000 pixels
   aan de lange kant: de AI kijkt niet scherper dan dat, en zo past een
   carrousel van tien slides onder de 6 MB die Netlify per verzoek aanneemt.
   ------------------------------------------------------------------------- */

const MAX_ZIJDE = 2000
const MAX_TOTAAL = 4.5 * 1024 * 1024
const MAX_BESTANDEN = 10

async function verklein(bestand: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(bestand.type)) return bestand
  const bitmap = await createImageBitmap(bestand)
  const schaal = Math.min(1, MAX_ZIJDE / Math.max(bitmap.width, bitmap.height))
  if (schaal === 1 && bestand.size <= 1.5 * 1024 * 1024) {
    bitmap.close()
    return bestand
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * schaal)
  canvas.height = Math.round(bitmap.height * schaal)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  // Een png kan transparant zijn: als webp blijft dat zo, als jpg wordt het zwart.
  const type = bestand.type === 'image/png' ? 'image/webp' : 'image/jpeg'
  const blob = await new Promise<Blob>((ok, mis) => canvas.toBlob((b) => (b ? ok(b) : mis(new Error('Verkleinen mislukt'))), type, 0.88))
  return new File([blob], bestand.name.replace(/\.\w+$/, type === 'image/webp' ? '.webp' : '.jpg'), { type })
}

type Optie = { value: string; label: string }

export type NieuweCheckProps = {
  organizationId: string
  soorten: Optie[]
  merken: Optie[]
  doelgroepen: Optie[]
  campagnes: Optie[]
  /** Bij een nieuwe versie: de vorige check, om het formulier mee in te vullen. */
  vorige: {
    id: string
    titel: string
    soort: string
    kanaal: string | null
    merkId: string | null
    kanaalMerkId: string | null
    doelgroepId: string | null
    campaignId: string | null
    doel: string | null
    tekst: string | null
    uitingUrl: string | null
    lpUrl: string | null
    toelichting: string | null
    bestanden: number
  } | null
}

const veldKlasse = 'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400 focus:border-jr-blue disabled:bg-gray-50'

function Label({ titel, hint, children }: { titel: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-jr-text mb-1.5 block text-[13px] font-medium">{titel}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  )
}

export function NieuweCheck({ organizationId, soorten, merken, doelgroepen, campagnes, vorige }: NieuweCheckProps) {
  const router = useRouter()
  const [bezig, setBezig] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)

  async function verstuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFout(null)
    const form = new FormData(e.currentTarget)
    const gekozen = form.getAll('bestanden').filter((b): b is File => b instanceof File && b.size > 0)
    form.delete('bestanden')
    if (gekozen.length > MAX_BESTANDEN) {
      setFout(`Hooguit ${MAX_BESTANDEN} bestanden per check.`)
      return
    }
    try {
      setBezig('Bestanden klaarmaken…')
      const klaar = await Promise.all(gekozen.map(verklein))
      const totaal = klaar.reduce((n, b) => n + b.size, 0)
      if (totaal > MAX_TOTAAL) {
        setFout(`De bestanden zijn samen ${(totaal / 1024 / 1024).toFixed(1).replace('.', ',')} MB; maximaal 4,5 MB. Maak een pdf kleiner of check de onderdelen apart.`)
        return
      }
      for (const b of klaar) form.append('bestanden', b)

      setBezig('Klaarzetten…')
      const antwoord = await fetch('/api/checks', { method: 'POST', body: form })
      const json = (await antwoord.json().catch(() => null)) as { ok: boolean; id?: string; error?: string } | null
      if (!antwoord.ok || !json?.ok || !json.id) {
        setFout(json?.error ?? `Klaarzetten mislukt (fout ${antwoord.status}).`)
        return
      }
      setBezig('Check starten…')
      const startFout = await startCheck(json.id)
      if (startFout) setFout(startFout)
      router.push(`/beheer/checks/${json.id}`)
    } catch (error) {
      setFout(error instanceof Error ? error.message : 'Er ging iets mis.')
    } finally {
      setBezig(null)
    }
  }

  const uit = bezig !== null
  const v = vorige
  return (
    <form onSubmit={verstuur} className="space-y-8">
      <input type="hidden" name="organizationId" value={organizationId} />
      {v && <input type="hidden" name="vorigeCheckId" value={v.id} />}

      <section className="grid gap-4 rounded-xl bg-white p-6 shadow-sm sm:grid-cols-2">
        <h2 className="text-base sm:col-span-2">Wat is het</h2>
        <Label titel="Naam" hint="Zo vind je hem terug.">
          <input name="titel" required defaultValue={v?.titel ?? ''} placeholder="Kerstbrunch · post 2" className={veldKlasse} disabled={uit} />
        </Label>
        <Label titel="Soort uiting">
          <select name="soort" required defaultValue={v?.soort ?? ''} className={veldKlasse} disabled={uit}>
            <option value="">Kies</option>
            {soorten.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Label>
        <Label titel="Kanaal" hint="Bijvoorbeeld Instagram, Facebook, Google Ads, LinkedIn, MailerLite, print.">
          <input name="kanaal" defaultValue={v?.kanaal ?? ''} placeholder="Instagram" className={veldKlasse} disabled={uit} />
        </Label>
        <Label titel="Doelgroep" hint="De check toetst op de aanspreekvorm en stijlaccenten van deze groep.">
          <select name="doelgroepId" defaultValue={v?.doelgroepId ?? ''} className={veldKlasse} disabled={uit}>
            <option value="">Geen bepaalde doelgroep</option>
            {doelgroepen.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </Label>
        {merken.length > 1 && (
          <>
            <Label titel="Merk van de inhoud" hint="Over welk merk gaat de uiting? Dat logo hoort erop.">
              <select name="merkId" defaultValue={v?.merkId ?? ''} className={veldKlasse} disabled={uit}>
                {merken.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Label>
            <Label titel="Verschijnt op het kanaal van">
              <select name="kanaalMerkId" defaultValue={v?.kanaalMerkId ?? ''} className={veldKlasse} disabled={uit}>
                {merken.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Label>
          </>
        )}
        <Label titel="Doel" hint="Wat moet de uiting doen? De check kijkt of de oproep daarbij past.">
          <input name="doel" defaultValue={v?.doel ?? ''} placeholder="Tickets verkopen voor de wijnproeverij" className={veldKlasse} disabled={uit} />
        </Label>
        <Label titel="Campagne" hint="Aanbod, prijzen en data uit de briefing gaan mee in de check.">
          <select name="campaignId" defaultValue={v?.campaignId ?? ''} className={veldKlasse} disabled={uit}>
            <option value="">Geen campagne</option>
            {campagnes.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Label>
      </section>

      <section className="grid gap-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base">De uiting</h2>
        <Label
          titel="Afbeeldingen of pdf"
          hint={
            v && v.bestanden > 0
              ? `Laat leeg om dezelfde ${v.bestanden === 1 ? 'afbeelding' : `${v.bestanden} bestanden`} van de vorige versie te houden. Bij een carrousel: alle slides, in volgorde.`
              : 'Bij een carrousel: alle slides, in volgorde. Tot tien bestanden, samen tot 4,5 MB.'
          }
        >
          <input
            type="file"
            name="bestanden"
            multiple
            disabled={uit}
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-full file:border file:border-gray-300 file:bg-white file:px-4 file:py-1.5 file:text-sm hover:file:bg-gray-50"
          />
        </Label>
        <Label titel="Of de uiting als link" hint="Een afbeelding, of de webversie van een nieuwsbrief. Pagina’s achter een login kan de check niet openen.">
          <input name="uitingUrl" type="url" defaultValue={v?.uitingUrl ?? ''} placeholder="https://" className={veldKlasse} disabled={uit} />
        </Label>
        <Label titel="De tekst erbij" hint="Caption, advertentietekst, onderwerpregel en preheader. Plak hem precies zoals hij live gaat.">
          <textarea name="tekst" rows={6} defaultValue={v?.tekst ?? ''} className={veldKlasse} disabled={uit} />
        </Label>
        <Label titel="Landingspagina" hint="Waar de uiting naartoe linkt. De check vergelijkt aanbod, prijzen en data.">
          <input name="lpUrl" type="url" defaultValue={v?.lpUrl ?? ''} placeholder="https://" className={veldKlasse} disabled={uit} />
        </Label>
        <Label titel="Nog iets dat de check moet weten" hint="Alleen voor deze uiting. Iets dat altijd geldt, zet je bij de afspraken van de klant.">
          <textarea name="toelichting" rows={2} defaultValue={v?.toelichting ?? ''} className={veldKlasse} disabled={uit} />
        </Label>
      </section>

      {fout && (
        <p role="alert" className="rounded-lg bg-[#FDECEA] px-4 py-3 text-sm text-[#C02A22]">
          {fout}
        </p>
      )}
      <button type="submit" disabled={uit} className="bg-jr-btn hover:bg-jr-btnhover min-h-11 rounded-lg px-6 py-2.5 text-sm font-medium text-white disabled:opacity-40">
        {bezig ?? (v ? 'Check de nieuwe versie' : 'Check deze uiting')}
      </button>
    </form>
  )
}
