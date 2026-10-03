'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/* -------------------------------------------------------------------------
   Bestanden in de merkkluis zetten.

   Foto's worden in de browser eerst verkleind tot hooguit 3000 pixels aan de
   lange kant. Voor social en ads is dat ruim, en zo blijft elk bestand onder
   de 6 MB die Netlify per verzoek aanneemt. Het origineel in volle resolutie
   blijft waar het al stond (Drive, Kive, de fotograaf).
   ------------------------------------------------------------------------- */

const MAX_ZIJDE = 3000
const MAX_BYTES = 4.5 * 1024 * 1024

async function verklein(bestand: File): Promise<Blob> {
  const isFoto = /^image\/(jpeg|png|webp)$/.test(bestand.type)
  if (!isFoto) return bestand
  const bitmap = await createImageBitmap(bestand)
  const schaal = Math.min(1, MAX_ZIJDE / Math.max(bitmap.width, bitmap.height))
  // Klein genoeg en niet te groot: niets aan doen, dan blijft een PNG met transparantie een PNG.
  if (schaal === 1 && bestand.size <= MAX_BYTES) {
    bitmap.close()
    return bestand
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * schaal)
  canvas.height = Math.round(bitmap.height * schaal)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const type = bestand.type === 'image/png' ? 'image/webp' : 'image/jpeg'
  return new Promise((ok, mis) => canvas.toBlob((b) => (b ? ok(b) : mis(new Error('Verkleinen mislukt'))), type, 0.9))
}

export function MerkUpload({
  organizationId,
  slug,
  kind,
  accept,
  meerdere = false,
  label,
  metLogoKeuze = false,
  vasteVariant,
  rustig = false,
}: {
  organizationId: string
  slug: string
  kind: 'logo' | 'beeld' | 'element' | 'lettertype'
  accept: string
  meerdere?: boolean
  label: string
  metLogoKeuze?: boolean
  /** Voor een vast logovak: de soort ligt vast, alleen achtergrond en kleur kies je nog. */
  vasteVariant?: string
  /** Een rustige knop in plaats van de blauwe. */
  rustig?: boolean
}) {
  const router = useRouter()
  const invoer = useRef<HTMLInputElement>(null)
  const [bezig, setBezig] = useState<string | null>(null)
  const [fouten, setFouten] = useState<string[]>([])
  const [variant, setVariant] = useState(vasteVariant ?? 'primair')
  const [achtergrond, setAchtergrond] = useState('licht')
  const [kleurvorm, setKleurvorm] = useState('kleur')

  async function upload(lijst: FileList | null) {
    if (!lijst || lijst.length === 0) return
    const nieuweFouten: string[] = []
    const bestanden = [...lijst]
    for (const [i, bestand] of bestanden.entries()) {
      setBezig(`${i + 1} van ${bestanden.length}: ${bestand.name}`)
      try {
        const data = await verklein(bestand)
        const form = new FormData()
        form.set('organizationId', organizationId)
        form.set('slug', slug)
        form.set('kind', kind)
        form.set('bestand', data, bestand.name)
        if (metLogoKeuze || vasteVariant) {
          form.set('logoVariant', variant)
          form.set('logoBackground', achtergrond)
          form.set('logoColorway', kleurvorm)
        }
        const antwoord = await fetch('/api/merk/upload', { method: 'POST', body: form })
        const json = (await antwoord.json().catch(() => null)) as { ok: boolean; error?: string } | null
        if (!antwoord.ok || !json?.ok) nieuweFouten.push(`${bestand.name}: ${json?.error ?? `fout ${antwoord.status}`}`)
      } catch (error) {
        nieuweFouten.push(`${bestand.name}: ${error instanceof Error ? error.message : 'mislukt'}`)
      }
    }
    setFouten(nieuweFouten)
    setBezig(null)
    if (invoer.current) invoer.current.value = ''
    router.refresh()
  }

  const keuze = 'min-h-10 rounded-lg border border-gray-300 px-3 py-1.5 text-sm'
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {metLogoKeuze && (
          <>
            {!vasteVariant && (
              <select aria-label="Soort logo" value={variant} onChange={(e) => setVariant(e.target.value)} className={keuze}>
                <option value="primair">Primair logo</option>
                <option value="secundair">Secundair logo</option>
                <option value="beeldmerk">Beeldmerk</option>
                <option value="woordmerk">Woordmerk</option>
                <option value="anders">Anders</option>
              </select>
            )}
            <select aria-label="Achtergrond" value={achtergrond} onChange={(e) => setAchtergrond(e.target.value)} className={keuze}>
              <option value="licht">Voor lichte achtergrond</option>
              <option value="donker">Voor donkere achtergrond</option>
              <option value="beide">Voor beide</option>
            </select>
            <select aria-label="Kleur" value={kleurvorm} onChange={(e) => setKleurvorm(e.target.value)} className={keuze}>
              <option value="kleur">In kleur</option>
              <option value="zwart">Zwart</option>
              <option value="wit">Wit</option>
            </select>
          </>
        )}
        <label
          className={`${rustig ? 'text-jr-link border border-gray-300 bg-white hover:bg-gray-50' : 'bg-jr-btn hover:bg-jr-btnhover text-white'} inline-flex min-h-10 cursor-pointer items-center rounded-full px-5 py-2 text-sm font-medium ${
            bezig ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          {bezig ? 'Bezig…' : label}
          <input
            ref={invoer}
            type="file"
            accept={accept}
            multiple={meerdere}
            className="sr-only"
            onChange={(e) => upload(e.target.files)}
          />
        </label>
      </div>
      {bezig && <p className="text-xs text-gray-600">Uploaden {bezig}</p>}
      {fouten.length > 0 && (
        <ul role="alert" className="rounded-lg bg-[#FDECEA] px-4 py-3 text-sm text-[#C02A22]">
          {fouten.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
