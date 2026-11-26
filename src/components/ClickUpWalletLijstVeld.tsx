'use client'

import { useEffect, useState } from 'react'
import { haalClickUpWalletLijsten } from '@/app/beheer/retainer-wallet-actions'
import { Field, Select } from './ActionForm'

export function ClickUpWalletLijstVeld({ huidigId }: { huidigId: string }) {
  const [resultaat, zetResultaat] = useState<Awaited<ReturnType<typeof haalClickUpWalletLijsten>> | null>(null)

  useEffect(() => {
    let actief = true
    haalClickUpWalletLijsten()
      .then((gegevens) => { if (actief) zetResultaat(gegevens) })
      .catch(() => { if (actief) zetResultaat({ ok: false }) })
    return () => { actief = false }
  }, [])

  if (!resultaat) {
    return (
      <>
        <input type="hidden" name="listId" value={huidigId} />
        <p role="status" className="text-sm text-gray-600">ClickUp-takenlijsten ophalen…</p>
      </>
    )
  }

  if (!resultaat.ok || resultaat.opties.length === 0) {
    return (
      <Field label="ClickUp-takenlijst-ID" name="listId" defaultValue={huidigId} markeerOptioneel={false}
        hint="De keuzelijst is leeg of tijdelijk onbereikbaar. Je kunt hier het lijst-ID invullen." />
    )
  }

  const opties = [{ value: '', label: 'Kies een ClickUp-takenlijst' }, ...resultaat.opties]
  if (huidigId && !opties.some((optie) => optie.value === huidigId)) {
    opties.splice(1, 0, { value: huidigId, label: `Huidige takenlijst (${huidigId})` })
  }

  return <Select label="ClickUp-takenlijst" name="listId" options={opties} defaultValue={huidigId} />
}
