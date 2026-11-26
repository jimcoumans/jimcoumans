/** Moneybird plant op kalenderdagen in de administratie. */
const dagInNederland = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam' })

export function moneybirdPlanning(start: Date, eind: Date | null, dag: number, nu: Date) {
  const vandaag = new Date(dagInNederland.format(nu))
  vandaag.setUTCDate(vandaag.getUTCDate() + 1)
  const vroegste = start > vandaag ? start : vandaag
  const eerste = new Date(Date.UTC(vroegste.getUTCFullYear(), vroegste.getUTCMonth(), dag))
  if (eerste < vroegste) eerste.setUTCMonth(eerste.getUTCMonth() + 1)
  const eersteDatum = eerste.toISOString().slice(0, 10)
  if (!eind) return { eersteDatum, aantal: null }

  const laatste = new Date(Date.UTC(eind.getUTCFullYear(), eind.getUTCMonth(), dag))
  if (laatste > eind) laatste.setUTCMonth(laatste.getUTCMonth() - 1)
  const aantal = 1 + (laatste.getUTCFullYear() - eerste.getUTCFullYear()) * 12
    + laatste.getUTCMonth() - eerste.getUTCMonth()
  if (aantal < 1) throw new Error('Er past geen facturatiedag vóór de einddatum.')
  return { eersteDatum, aantal }
}

export function retainerReferentie(abonnementId: string) {
  return `JR-WALLET-${abonnementId}`
}
