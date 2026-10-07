'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/* -------------------------------------------------------------------------
   Feedback van de klant in de briefing laten verwerken.

   Drie stappen in de browser: de feedback klaarzetten in het portaal, de
   achtergrondfunctie op Netlify starten, en de pagina bijwerken tot de
   verwerking klaar is. De browser start de functie en niet de server, omdat
   de site achter de Netlify-login zit: de browser komt erdoor, een
   serverfunctie niet.
   ------------------------------------------------------------------------- */

const MAX_BYTES = 4.5 * 1024 * 1024

export function FeedbackVerwerken({ campaignId, loopt }: { campaignId: string; loopt: boolean }) {
  const router = useRouter()
  const formulier = useRef<HTMLFormElement>(null)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  // Zolang er een verwerking loopt, elke vijf seconden kijken of hij klaar is.
  useEffect(() => {
    if (!loopt) return
    const t = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(t)
  }, [loopt, router])

  async function verwerk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFout(null)
    const form = new FormData(e.currentTarget)
    const bestand = form.get('bestand')
    if (bestand instanceof File && bestand.size > MAX_BYTES) {
      setFout('Het bestand is groter dan 4,5 MB. Maak het kleiner of plak de tekst.')
      return
    }
    if (bestand instanceof File && bestand.size === 0) form.delete('bestand')
    setBezig(true)
    try {
      const antwoord = await fetch('/api/campagnes/verwerken', { method: 'POST', body: form })
      const json = (await antwoord.json().catch(() => null)) as { ok: boolean; id?: string; klaar?: boolean; error?: string } | null
      if (!antwoord.ok || !json?.ok || !json.id) {
        setFout(json?.error ?? `Klaarzetten mislukt (fout ${antwoord.status}).`)
        return
      }
      formulier.current?.reset()
      router.refresh()
      // Een uitgewerkte briefing (.json) is al ingelezen.
      if (json.klaar) return

      const start = await fetch('/.netlify/functions/briefing-verwerken-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: json.id }),
      })
      // Lokaal (next dev) bestaat de achtergrondfunctie niet: dan hier en nu verwerken.
      if (start.status === 404) {
        const hier = await fetch(`/api/campagnes/verwerken/${json.id}`, { method: 'POST' })
        const uit = (await hier.json().catch(() => null)) as { ok: boolean; error?: string } | null
        if (!uit?.ok) setFout(uit?.error ?? 'Verwerken mislukt.')
      } else if (!start.ok) {
        setFout(`De verwerking kon niet starten (fout ${start.status}). Probeer het opnieuw.`)
      }
    } catch (error) {
      setFout(error instanceof Error ? error.message : 'Er ging iets mis.')
    } finally {
      setBezig(false)
      router.refresh()
    }
  }

  const uit = bezig || loopt
  return (
    <form ref={formulier} onSubmit={verwerk} className="space-y-3">
      <input type="hidden" name="campaignId" value={campaignId} />
      <label className="block">
        <span className="text-jr-text mb-1.5 block text-[13px] font-medium">Wat de klant schreef</span>
        <textarea
          name="invoer"
          rows={6}
          disabled={uit}
          placeholder="Plak hier de mail, het WhatsApp-bericht of je aantekeningen van het gesprek."
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400 disabled:bg-gray-50"
        />
      </label>
      <label className="block">
        <span className="text-jr-text mb-1.5 block text-[13px] font-medium">Of een bestand</span>
        <input
          type="file"
          name="bestand"
          disabled={uit}
          accept="application/pdf,image/png,image/jpeg,image/webp,image/gif,text/plain,.txt,.md,.eml,application/json,.json"
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-full file:border file:border-gray-300 file:bg-white file:px-4 file:py-1.5 file:text-sm hover:file:bg-gray-50"
        />
        <span className="mt-1 block text-xs text-gray-500">
          Pdf, afbeelding of tekst, tot 4,5 MB. Word? Bewaar het eerst als pdf. Een al uitgewerkte briefing als .json wordt meteen ingelezen, zonder AI.
        </span>
      </label>
      {fout && (
        <p role="alert" className="rounded-lg bg-[#FDECEA] px-4 py-3 text-sm text-[#C02A22]">
          {fout}
        </p>
      )}
      <button
        type="submit"
        disabled={uit}
        className="bg-jr-btn hover:bg-jr-btnhover min-h-10 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {bezig ? 'Klaarzetten…' : loopt ? 'Bezig met verwerken…' : 'Verwerk feedback'}
      </button>
    </form>
  )
}
