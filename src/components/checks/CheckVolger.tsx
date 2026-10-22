'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { startCheck } from './start'

/** Zolang een check loopt, elke vier seconden kijken of hij klaar is. */
export function CheckVolger({ loopt }: { loopt: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (!loopt) return
    const t = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(t)
  }, [loopt, router])
  return null
}

/** Een mislukte check opnieuw starten, met dezelfde invoer. */
export function OpnieuwKnop({ id }: { id: string }) {
  const router = useRouter()
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  async function opnieuw() {
    setBezig(true)
    setFout(null)
    try {
      const antwoord = await fetch(`/api/checks/${id}/opnieuw`, { method: 'POST' })
      const json = (await antwoord.json().catch(() => null)) as { ok: boolean; error?: string } | null
      if (!json?.ok) {
        setFout(json?.error ?? 'Opnieuw starten mislukt.')
        return
      }
      const startFout = await startCheck(id)
      if (startFout) setFout(startFout)
    } finally {
      setBezig(false)
      router.refresh()
    }
  }
  return (
    <div className="mt-3">
      <button type="button" onClick={opnieuw} disabled={bezig} className="bg-jr-btn hover:bg-jr-btnhover min-h-10 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-40">
        {bezig ? 'Bezig…' : 'Probeer opnieuw'}
      </button>
      {fout && <p className="mt-2 text-sm text-[#C02A22]">{fout}</p>}
    </div>
  )
}

/** De verbeterde tekst met één klik naar het klembord. */
export function KopieerKnop({ tekst }: { tekst: string }) {
  const [gekopieerd, setGekopieerd] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(tekst)
        setGekopieerd(true)
        setTimeout(() => setGekopieerd(false), 2000)
      }}
      className="text-jr-link rounded-lg px-2 py-1 text-xs font-medium hover:bg-gray-100"
    >
      {gekopieerd ? 'Gekopieerd' : 'Kopieer'}
    </button>
  )
}
