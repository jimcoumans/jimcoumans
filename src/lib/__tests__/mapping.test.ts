/**
 * Tests voor de omzetting van een ClickUp-taak naar een boeking.
 * Geen netwerk, geen database: alleen de regels die bepalen welk bedrag
 * een klant in zijn wallet ziet.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapTaskNaarAfboeking, leesBudgetCents } from '../clickup/mapping'
import type { ClickUpTask, ClickUpCustomField } from '../clickup/client'

const FACTURATIE_OPTIES = [
  { id: 'opt-open', name: 'Open' },
  { id: 'opt-niet', name: 'Niet factureerbaar' },
  { id: 'opt-moneybird', name: 'Naar Moneybird' },
  { id: 'opt-factureerbaar', name: 'Factureerbaar' },
  { id: 'opt-gefactureerd', name: 'Gefactureerd' },
]

const PRODUCTGROEP_OPTIES = [
  { id: 'pg-sea', name: 'SEA' },
  { id: 'pg-web', name: 'Web' },
]

function veld(
  name: string,
  type: string,
  value: unknown,
  options?: { id: string; name: string }[],
): ClickUpCustomField {
  return { id: `veld-${name}`, name, type, value, type_config: options ? { options } : {} }
}

function taak(opties: {
  id?: string
  naam?: string
  facturatie?: string | number | null
  verkoopfactuur?: unknown
  advies?: unknown
  productgroep?: string
  dateDone?: string | null
  dateCreated?: string
}): ClickUpTask {
  const velden: ClickUpCustomField[] = []

  if (opties.facturatie !== undefined) {
    velden.push(veld('Facturatie', 'drop_down', opties.facturatie, FACTURATIE_OPTIES))
  }
  if (opties.verkoopfactuur !== undefined) {
    velden.push(veld('Verkoopfactuur', 'currency', opties.verkoopfactuur))
  }
  if (opties.advies !== undefined) {
    velden.push(veld('Advies', 'formula', opties.advies))
  }
  if (opties.productgroep !== undefined) {
    velden.push(veld('Productgroep', 'drop_down', opties.productgroep, PRODUCTGROEP_OPTIES))
  }

  return {
    id: opties.id ?? 'TASK-1',
    name: opties.naam ?? 'Website wijzigingen',
    date_created: opties.dateCreated ?? '1767225600000', // 1 jan 2026
    date_done: opties.dateDone ?? null,
    custom_fields: velden,
  }
}

test('een factureerbare taak met verkoopfactuur wordt een afschrijving', () => {
  const result = mapTaskNaarAfboeking(
    taak({ facturatie: 'opt-factureerbaar', verkoopfactuur: 122.5, productgroep: 'pg-web' }),
  )

  assert.equal(result.soort, 'boeken')
  assert.ok(result.soort === 'boeken')
  assert.equal(result.afboeking.amountCents, 12250)
  assert.equal(result.afboeking.description, 'Website wijzigingen')
  assert.equal(result.afboeking.category, 'Web')
  assert.equal(result.afboeking.sourceRef, 'TASK-1')
})

test('alle drie de afboekbare statussen werken', () => {
  for (const optie of ['opt-factureerbaar', 'opt-moneybird', 'opt-gefactureerd']) {
    const result = mapTaskNaarAfboeking(taak({ facturatie: optie, verkoopfactuur: 100 }))
    assert.equal(result.soort, 'boeken', `status ${optie} hoort geboekt te worden`)
  }
})

test('een taak op Open wordt overgeslagen: het bedrag staat nog niet vast', () => {
  const result = mapTaskNaarAfboeking(taak({ facturatie: 'opt-open', verkoopfactuur: 500 }))
  assert.ok(result.soort === 'overslaan')
  assert.equal(result.reden, 'nog_niet_factureerbaar')
})

test('werk binnen het abonnement wordt niet afgeboekt', () => {
  const result = mapTaskNaarAfboeking(taak({ facturatie: 'opt-niet', verkoopfactuur: 500 }))
  assert.ok(result.soort === 'overslaan')
  assert.equal(result.reden, 'niet_factureerbaar')
})

test('zonder Facturatie-veld wordt er niets geboekt', () => {
  const result = mapTaskNaarAfboeking(taak({ verkoopfactuur: 500 }))
  assert.ok(result.soort === 'overslaan')
  assert.equal(result.reden, 'geen_facturatie_status')
})

test('Advies wordt gebruikt als Verkoopfactuur leeg is', () => {
  const result = mapTaskNaarAfboeking(taak({ facturatie: 'opt-factureerbaar', advies: 87.5 }))
  assert.ok(result.soort === 'boeken')
  assert.equal(result.afboeking.amountCents, 8750)
})

test('Verkoopfactuur gaat voor op Advies', () => {
  // Advies is een berekening, Verkoopfactuur is wat er echt in rekening gaat.
  const result = mapTaskNaarAfboeking(
    taak({ facturatie: 'opt-factureerbaar', verkoopfactuur: 100, advies: 250 }),
  )
  assert.ok(result.soort === 'boeken')
  assert.equal(result.afboeking.amountCents, 10000)
})

test('ClickUp-bedragen als string worden ook gelezen', () => {
  const result = mapTaskNaarAfboeking(
    taak({ facturatie: 'opt-factureerbaar', verkoopfactuur: '122.50' }),
  )
  assert.ok(result.soort === 'boeken')
  assert.equal(result.afboeking.amountCents, 12250)
})

test('zonder bedrag wordt er niet gegokt', () => {
  const result = mapTaskNaarAfboeking(taak({ facturatie: 'opt-factureerbaar' }))
  assert.ok(result.soort === 'overslaan')
  assert.equal(result.reden, 'geen_bedrag')
})

test('een leeg bedrag is geen nul-boeking', () => {
  const result = mapTaskNaarAfboeking(
    taak({ facturatie: 'opt-factureerbaar', verkoopfactuur: '' }),
  )
  assert.ok(result.soort === 'overslaan')
  assert.equal(result.reden, 'geen_bedrag')
})

test('een bedrag van nul wordt overgeslagen', () => {
  const result = mapTaskNaarAfboeking(
    taak({ facturatie: 'opt-factureerbaar', verkoopfactuur: 0 }),
  )
  assert.ok(result.soort === 'overslaan')
  assert.equal(result.reden, 'bedrag_nul')
})

test('een negatief bedrag wordt nooit stil een bijschrijving', () => {
  // Een min-bedrag in ClickUp is een invoerfout. Als de sync dat als
  // bijschrijving zou boeken, krijgt een klant gratis budget.
  const result = mapTaskNaarAfboeking(
    taak({ facturatie: 'opt-factureerbaar', verkoopfactuur: -500 }),
  )
  assert.ok(result.soort === 'overslaan')
  assert.equal(result.reden, 'bedrag_nul')
})

test('een taak zonder naam wordt overgeslagen', () => {
  const t = taak({ facturatie: 'opt-factureerbaar', verkoopfactuur: 100 })
  t.name = '   '
  const result = mapTaskNaarAfboeking(t)
  assert.ok(result.soort === 'overslaan')
  assert.equal(result.reden, 'geen_naam')
})

test('de boekdatum is wanneer het werk klaar was, niet vandaag', () => {
  const klaar = '1770000000000' // 2 feb 2026
  const result = mapTaskNaarAfboeking(
    taak({ facturatie: 'opt-factureerbaar', verkoopfactuur: 100, dateDone: klaar }),
  )
  assert.ok(result.soort === 'boeken')
  assert.equal(result.afboeking.bookedOn.getTime(), Number(klaar))
})

test('zonder afrondingsdatum valt de boeking terug op de aanmaakdatum', () => {
  const result = mapTaskNaarAfboeking(
    taak({ facturatie: 'opt-factureerbaar', verkoopfactuur: 100, dateCreated: '1767225600000' }),
  )
  assert.ok(result.soort === 'boeken')
  assert.equal(result.afboeking.bookedOn.getTime(), 1767225600000)
})

test('een dropdown die als index komt wordt ook gelezen', () => {
  // ClickUp levert dropdowns soms als optie-id, soms als index.
  const result = mapTaskNaarAfboeking(taak({ facturatie: 3, verkoopfactuur: 100 }))
  assert.equal(result.soort, 'boeken', 'index 3 is Factureerbaar')
})

test('halve centen in ClickUp worden correct afgerond', () => {
  const result = mapTaskNaarAfboeking(
    taak({ facturatie: 'opt-factureerbaar', verkoopfactuur: 122.505 }),
  )
  assert.ok(result.soort === 'boeken')
  assert.equal(result.afboeking.amountCents, 12251)
})

test('leesBudgetCents leest het afgesproken budget', () => {
  const t: ClickUpTask = {
    id: 'ABO-1',
    name: 'Marketing abonnement',
    custom_fields: [veld('Budget', 'currency', 1500)],
  }
  assert.equal(leesBudgetCents(t), 150000)
})

test('leesBudgetCents geeft niets terug bij nul of leeg', () => {
  const leeg: ClickUpTask = { id: 'A', name: 'A', custom_fields: [] }
  assert.equal(leesBudgetCents(leeg), null)

  const nul: ClickUpTask = {
    id: 'B',
    name: 'B',
    custom_fields: [veld('Budget', 'currency', 0)],
  }
  assert.equal(leesBudgetCents(nul), null)
})
