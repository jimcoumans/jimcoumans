/* -------------------------------------------------------------------------
   Puntenlijsten: een opmerkingenveld als losse regels in plaats van één
   tekstvlak. In de database blijft het platte tekst, één punt per regel;
   een punt dat begint met "- " hoort onder het punt erboven (een subpunt,
   zoals de gangen onder het kerstdiner).
   ------------------------------------------------------------------------- */

export type Punt = { tekst: string; sub: boolean }

const OPSOMTEKEN = /^\s*[-•*]\s*/

/** Platte tekst naar punten. Lege regels vallen weg. */
export function leesPunten(tekst: string | null | undefined): Punt[] {
  const regels = (tekst ?? '')
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
  // Staat overal een opsommingsteken voor, dan zijn het gewone punten en geen subpunten.
  const allemaal = regels.length > 0 && regels.every((r) => OPSOMTEKEN.test(r))
  const punten: Punt[] = []
  for (const r of regels) {
    const opgesomd = OPSOMTEKEN.test(r)
    const t = r.replace(OPSOMTEKEN, '').trim()
    if (t === '') continue
    punten.push({ tekst: t, sub: opgesomd && !allemaal && punten.length > 0 })
  }
  return punten
}

/** Punten naar platte tekst; leeg wordt null. */
export function schrijfPunten(punten: Punt[]): string | null {
  const regels = punten
    .map((p, i) => ({ tekst: p.tekst.replace(/\s*\n\s*/g, ' ').trim(), sub: p.sub && i > 0 }))
    .filter((p) => p.tekst !== '')
  if (regels.length === 0) return null
  return regels.map((p, i) => (p.sub && i > 0 ? `- ${p.tekst}` : p.tekst)).join('\n')
}

/** Punten gegroepeerd: elk hoofdpunt met zijn subpunten, om te tonen. */
export function groepeerPunten(punten: Punt[]): { tekst: string; sub: string[] }[] {
  const groepen: { tekst: string; sub: string[] }[] = []
  for (const p of punten) {
    const laatste = groepen[groepen.length - 1]
    if (p.sub && laatste) laatste.sub.push(p.tekst)
    else groepen.push({ tekst: p.tekst, sub: [] })
  }
  return groepen
}
