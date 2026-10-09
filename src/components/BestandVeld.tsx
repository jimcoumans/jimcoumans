'use client'

import { useState } from 'react'

/* -------------------------------------------------------------------------
   Een bestandsveld dat weet wat er door de deur past.

   Netlify neemt per verzoek hoogstens 6 MB aan, en rekent een bestand daarbij
   om naar ongeveer 1,33 keer zijn grootte. Een scan van 5 MB komt dus nooit
   aan, en de browser meldt dan alleen "geen verbinding". Daarom hier, voor
   het versturen:

   - een foto (jpg, png) verkleinen we zelf tot 2000 pixels: scherp genoeg om
     een paspoort of formulier te lezen;
   - een pdf die te groot is, houden we tegen met een melding die zegt hoe
     groot hij is en hoe je hem kleiner maakt.
   ------------------------------------------------------------------------- */

/** Wat er na omrekening nog door de 6 MB van Netlify past, met wat ruimte voor de rest van het formulier. */
export const MAX_UPLOAD = 4 * 1024 * 1024

const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1).replace('.', ',')

async function verklein(bestand: File): Promise<File> {
  if (!bestand.type.startsWith('image/') || bestand.size < 900 * 1024) return bestand
  try {
    const beeld = await createImageBitmap(bestand)
    const schaal = Math.min(1, 2000 / Math.max(beeld.width, beeld.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(beeld.width * schaal)
    canvas.height = Math.round(beeld.height * schaal)
    canvas.getContext('2d')!.drawImage(beeld, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((klaar) => canvas.toBlob(klaar, 'image/jpeg', 0.85))
    if (!blob || blob.size >= bestand.size) return bestand
    return new File([blob], bestand.name.replace(/\.(png|jpe?g|heic)$/i, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return bestand
  }
}

export function BestandVeld({ name = 'bestand', label, className = 'max-w-[15rem] text-xs' }: { name?: string; label: string; className?: string }) {
  const [melding, setMelding] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  return (
    <span className="inline-flex flex-col">
      <input
        type="file"
        name={name}
        required
        accept="application/pdf,image/jpeg,image/png"
        aria-label={label}
        className={className}
        onChange={async (e) => {
          const input = e.currentTarget
          const bestand = input.files?.[0]
          input.setCustomValidity('')
          setMelding(null)
          if (!bestand) return
          setBezig(true)
          const klaar = await verklein(bestand)
          setBezig(false)
          if (klaar !== bestand) {
            // Het verkleinde bestand in het veld zetten, zodat het formulier dat verstuurt.
            const dt = new DataTransfer()
            dt.items.add(klaar)
            input.files = dt.files
          }
          if (klaar.size > MAX_UPLOAD) {
            const tekst =
              klaar.type === 'application/pdf'
                ? `Deze pdf is ${mb(klaar.size)} MB; er past maximaal 4 MB door. Maak hem kleiner: op de Mac in Voorvertoning via Archief, Exporteer, Kwartsfilter "Verklein bestandsgrootte", of scan in zwart-wit op 150 dpi.`
                : `Dit bestand is ${mb(klaar.size)} MB; er past maximaal 4 MB door.`
            input.setCustomValidity(tekst)
            setMelding(tekst)
          }
        }}
      />
      {bezig && <span className="mt-1 text-xs text-gray-500">Foto verkleinen…</span>}
      {melding && <span className="mt-1 max-w-[22rem] text-xs text-[#C02A22]">{melding}</span>}
    </span>
  )
}
