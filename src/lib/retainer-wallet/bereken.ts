import { findField, readDropdown, readTimestamp, type ClickUpTask } from '../clickup/client'
import { parseAmountToCents } from '../money'
import { datumInNederland } from '../moneybird/planning'

export type WalletRegel = {
  id: string
  titel: string
  datum: string | null
  bedragCents: number
  bron: 'Moneybird' | 'ClickUp'
}

type Retainerfactuur = {
  id: string
  nummer: string | null
  datum: string | null
  retainer: boolean
  bedragExclCents: number
  currency: string
}

/** MM/JJ in het beheerscherm, ISO-datum voor opslag en vergelijking. */
export function leesWalletStartmaand(invoer: string) {
  const match = /^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/.exec(invoer.trim())
  return match ? `20${match[2]}-${match[1]}-01` : null
}

export function toonWalletStartmaand(datum: string | null) {
  return datum ? `${datum.slice(5, 7)}/${datum.slice(2, 4)}` : ''
}

const vergelijk = (value: string | undefined | null) => value?.trim().replace(/\s+/g, ' ').toLowerCase()

function dropdownWaarde(taak: ClickUpTask, naam: string) {
  const veld = findField(taak, naam)
  const waarde = veld?.value
  if (waarde && typeof waarde === 'object' && 'name' in waarde && typeof waarde.name === 'string') {
    return waarde.name
  }
  // ClickUp gebruikt zowel een optie-id als een volgnummer voor dropdowns.
  if (typeof waarde === 'number' || (typeof waarde === 'string' && /^\d+$/.test(waarde))) {
    const opties = veld?.type_config?.options ?? []
    return opties.find((optie) => optie.orderindex === Number(waarde))?.name ?? opties[Number(waarde)]?.name
  }
  return readDropdown(taak, naam)
}

function verkoopCents(taak: ClickUpTask) {
  const waarde = findField(taak, 'Verkooptarief')?.value
  if (typeof waarde !== 'string' && typeof waarde !== 'number') return null
  const bedrag = String(waarde).trim()
  if (!/^-?\d+(\.\d+)?$/.test(bedrag)) return null
  return parseAmountToCents(bedrag)
}

export function berekenRetainerWallet(facturen: Retainerfactuur[], taken: ClickUpTask[], vanaf: string) {
  const regels: WalletRegel[] = []
  let bijgeschrevenCents = 0
  let besteedCents = 0
  let zonderTarief = 0

  for (const factuur of new Map(facturen.map((f) => [f.id, f])).values()) {
    if (!factuur.retainer || !factuur.datum || factuur.datum < vanaf) continue
    if (factuur.currency !== 'EUR') throw new Error('Een retainerfactuur heeft een andere valuta dan EUR.')
    bijgeschrevenCents += factuur.bedragExclCents
    regels.push({
      id: `moneybird:${factuur.id}`,
      titel: factuur.nummer ? `Factuur ${factuur.nummer}` : 'Retainerfactuur',
      datum: factuur.datum,
      bedragCents: factuur.bedragExclCents,
      bron: 'Moneybird',
    })
  }

  for (const taak of new Map(taken.map((t) => [t.id, t])).values()) {
    if (
      vergelijk(taak.status?.status) !== 'afgerond'
      || vergelijk(dropdownWaarde(taak, 'Boekplaats')) !== 'marketing abonnement'
      || vergelijk(dropdownWaarde(taak, 'Balans')) !== 'opdracht'
    ) {
      continue
    }
    const bedrag = verkoopCents(taak)
    if (bedrag === null) {
      zonderTarief++
      continue
    }
    const datum = readTimestamp(taak.date_done) ?? readTimestamp(taak.date_closed)
    besteedCents += bedrag
    regels.push({
      id: `clickup:${taak.id}`,
      titel: taak.name,
      datum: datum ? datumInNederland(datum) : null,
      bedragCents: bedrag === 0 ? 0 : -bedrag,
      bron: 'ClickUp',
    })
  }

  regels.sort((a, b) => (b.datum ?? '').localeCompare(a.datum ?? '') || a.id.localeCompare(b.id))

  return {
    saldoCents: bijgeschrevenCents - besteedCents,
    bijgeschrevenCents,
    besteedCents,
    zonderTarief,
    regels,
  }
}
