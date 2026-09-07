/**
 * Tests voor de datumlogica van abonnementen. Geen database: alleen de vraag
 * welke maanden gefactureerd horen te zijn.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  billablePeriods,
  nextBillingDate,
  periodKey,
  billingDate,
  periodLabel,
  vatCents,
  MAX_INHAAL_MAANDEN,
  type PeriodeAbonnement,
} from '../billing-periods'

function abo(over: Partial<PeriodeAbonnement> = {}): PeriodeAbonnement {
  return {
    status: 'active',
    billingDay: 2,
    startedOn: new Date(2026, 0, 1), // 1 januari 2026
    endsOn: null,
    // Standaard net zo lang bekend als de startdatum, zodat de tests over
    // de gewone werking gaan en niet over de aanmaakgrens.
    createdAt: new Date(2026, 0, 1),
    ...over,
  }
}

test('periodKey geeft jaar en maand met een voorloopnul', () => {
  assert.equal(periodKey(new Date(2026, 0, 15)), '2026-01')
  assert.equal(periodKey(new Date(2026, 11, 31)), '2026-12')
})

test('billingDate valt op de facturatiedag van die maand', () => {
  const datum = billingDate('2026-03', 2)
  assert.equal(datum.getFullYear(), 2026)
  assert.equal(datum.getMonth(), 2) // maart
  assert.equal(datum.getDate(), 2)
})

test('op de eerste van de maand wordt die maand nog niet gefactureerd', () => {
  // De facturatiedag is de tweede; op de eerste is die nog niet aangebroken.
  const { periods } = billablePeriods(abo(), new Date(2026, 0, 1))
  assert.deepEqual(periods, [])
})

test('op de tweede van de maand wordt die maand gefactureerd', () => {
  const { periods } = billablePeriods(abo(), new Date(2026, 0, 2))
  assert.deepEqual(periods, ['2026-01'])
})

test('later in de maand blijft het bij die ene periode', () => {
  const { periods } = billablePeriods(abo(), new Date(2026, 0, 28))
  assert.deepEqual(periods, ['2026-01'])
})

test('elke volgende maand komt er een periode bij', () => {
  assert.deepEqual(billablePeriods(abo(), new Date(2026, 1, 2)).periods, [
    '2026-01',
    '2026-02',
  ])
  assert.deepEqual(billablePeriods(abo(), new Date(2026, 2, 5)).periods, [
    '2026-01',
    '2026-02',
    '2026-03',
  ])
})

test('een gemiste maand wordt later alsnog ingehaald', () => {
  // De run heeft januari en februari niet gedraaid. In maart hoort hij die
  // alsnog te factureren, anders mist de klant budget.
  const { periods } = billablePeriods(abo(), new Date(2026, 2, 2))
  assert.deepEqual(periods, ['2026-01', '2026-02', '2026-03'])
})

test('een gepauzeerd abonnement wordt niet gefactureerd', () => {
  const { periods } = billablePeriods(abo({ status: 'paused' }), new Date(2026, 5, 10))
  assert.deepEqual(periods, [])
})

test('een gestopt abonnement wordt niet gefactureerd', () => {
  const { periods } = billablePeriods(abo({ status: 'ended' }), new Date(2026, 5, 10))
  assert.deepEqual(periods, [])
})

test('voor de startdatum wordt er niets gefactureerd', () => {
  const later = abo({ startedOn: new Date(2026, 5, 1) }) // juni
  assert.deepEqual(billablePeriods(later, new Date(2026, 4, 20)).periods, [])
  assert.deepEqual(billablePeriods(later, new Date(2026, 5, 2)).periods, ['2026-06'])
})

test('een startdatum midden in de maand factureert die maand nog', () => {
  // Start 15 januari: januari hoort er nog bij, want de klant heeft die
  // maand een abonnement gehad.
  const start15 = abo({ startedOn: new Date(2026, 0, 15) })
  assert.deepEqual(billablePeriods(start15, new Date(2026, 0, 20)).periods, ['2026-01'])
})

test('na de einddatum stopt het factureren', () => {
  const eindigt = abo({ endsOn: new Date(2026, 2, 31) }) // eind maart
  assert.deepEqual(billablePeriods(eindigt, new Date(2026, 5, 10)).periods, [
    '2026-01',
    '2026-02',
    '2026-03',
  ])
})

test('de maand van de einddatum wordt nog wel gefactureerd', () => {
  // Stopt op 15 maart: maart is nog een abonnementsmaand.
  const eindigt = abo({ endsOn: new Date(2026, 2, 15) })
  const { periods } = billablePeriods(eindigt, new Date(2026, 3, 10))
  assert.ok(periods.includes('2026-03'))
  assert.ok(!periods.includes('2026-04'))
})

test('een andere facturatiedag werkt ook', () => {
  const laat = abo({ billingDay: 28 })
  assert.deepEqual(billablePeriods(laat, new Date(2026, 0, 27)).periods, [])
  assert.deepEqual(billablePeriods(laat, new Date(2026, 0, 28)).periods, ['2026-01'])
})

test('facturatiedag 28 werkt ook in februari', () => {
  // Daarom staat de dag op maximaal 28: 29 tot 31 bestaan niet elke maand.
  const feb = abo({ startedOn: new Date(2026, 1, 1), billingDay: 28 })
  assert.deepEqual(billablePeriods(feb, new Date(2026, 1, 28)).periods, ['2026-02'])
})

test('een jaargrens levert geen gat of dubbele maand op', () => {
  const eindJaar = abo({
    startedOn: new Date(2025, 10, 1), // november 2025
    createdAt: new Date(2025, 10, 1),
  })
  const { periods } = billablePeriods(eindJaar, new Date(2026, 1, 2))
  assert.deepEqual(periods, ['2025-11', '2025-12', '2026-01', '2026-02'])
})

test('een nieuw abonnement met een oude startdatum haalt niets in', () => {
  // Dit is de valstrik: je maakt in september een abonnement met startdatum
  // 1 januari. Zonder deze grens kwamen er negen facturen en negen maanden
  // budget bij. Die facturen staan al in Moneybird.
  const nieuwMetOudeStart = abo({
    startedOn: new Date(2026, 0, 1),
    createdAt: new Date(2026, 8, 7), // aangemaakt op 7 september
  })

  const { periods, overgeslagenVoorAanmaak } = billablePeriods(
    nieuwMetOudeStart,
    new Date(2026, 8, 7),
  )

  assert.deepEqual(periods, ['2026-09'], 'alleen de maand van aanmaken')
  assert.equal(overgeslagenVoorAanmaak.length, 8, 'januari tot augustus gemeld')
  assert.ok(overgeslagenVoorAanmaak.includes('2026-01'))
  assert.ok(overgeslagenVoorAanmaak.includes('2026-08'))
})

test('een bestaand abonnement haalt een gemiste maand wel in', () => {
  // De grens mag de inhaalwerking niet slopen: dit abonnement bestond al in
  // januari, dus januari en februari horen alsnog gefactureerd te worden.
  const bestond = abo({
    startedOn: new Date(2026, 0, 1),
    createdAt: new Date(2026, 0, 1),
  })

  const { periods, overgeslagenVoorAanmaak } = billablePeriods(
    bestond,
    new Date(2026, 2, 5),
  )

  assert.deepEqual(periods, ['2026-01', '2026-02', '2026-03'])
  assert.deepEqual(overgeslagenVoorAanmaak, [])
})

test('nextBillingDate slaat de maanden voor het aanmaken over', () => {
  const nieuwMetOudeStart = abo({
    startedOn: new Date(2026, 0, 1),
    createdAt: new Date(2026, 8, 7),
  })
  // Op 1 september is de facturatiedag nog niet aangebroken.
  const volgende = nextBillingDate(nieuwMetOudeStart, new Date(2026, 8, 1))
  assert.equal(periodKey(volgende!), '2026-09')
})

test('een grote achterstand wordt begrensd en apart gemeld', () => {
  // Een verkeerd ingevulde startdatum mag niet stil in twintig facturen
  // eindigen. Hier is het abonnement al lang bekend, dus de aanmaakgrens
  // speelt niet mee.
  const langGeleden = abo({
    startedOn: new Date(2023, 0, 1),
    createdAt: new Date(2023, 0, 1),
  })
  const { periods, overgeslagenTeOud } = billablePeriods(
    langGeleden,
    new Date(2026, 0, 5),
  )

  assert.equal(periods.length, MAX_INHAAL_MAANDEN)
  assert.ok(overgeslagenTeOud.length > 0, 'de rest hoort gemeld te worden')
  assert.equal(periods.at(-1), '2026-01', 'de nieuwste periode zit er wel bij')
  assert.ok(
    overgeslagenTeOud.includes('2023-01'),
    'de oudste periode staat in de meldlijst',
  )
})

test('nextBillingDate geeft de eerstvolgende factuurdatum', () => {
  const volgende = nextBillingDate(abo(), new Date(2026, 0, 5))
  assert.equal(periodKey(volgende!), '2026-02')
  assert.equal(volgende!.getDate(), 2)
})

test('nextBillingDate geeft vandaag-plus als de dag nog moet komen', () => {
  const volgende = nextBillingDate(abo(), new Date(2026, 0, 1))
  assert.equal(periodKey(volgende!), '2026-01')
  assert.equal(volgende!.getDate(), 2)
})

test('nextBillingDate geeft niets voor een gepauzeerd of afgelopen abonnement', () => {
  assert.equal(nextBillingDate(abo({ status: 'paused' }), new Date(2026, 0, 5)), null)
  assert.equal(
    nextBillingDate(abo({ endsOn: new Date(2025, 11, 31) }), new Date(2026, 0, 5)),
    null,
  )
})

test('nextBillingDate kijkt vooruit naar een abonnement dat nog moet beginnen', () => {
  const later = abo({ startedOn: new Date(2026, 5, 1) })
  const volgende = nextBillingDate(later, new Date(2026, 0, 5))
  assert.equal(periodKey(volgende!), '2026-06')
})

test('periodLabel is leesbaar Nederlands', () => {
  assert.equal(periodLabel('2026-03'), 'maart 2026')
})

test('vatCents rekent btw af op hele centen', () => {
  assert.equal(vatCents(100_000, 21), 21_000)
  assert.equal(vatCents(95_000, 21), 19_950)
  assert.equal(vatCents(100_000, 0), 0)
  assert.equal(vatCents(33_333, 21), 7_000) // 6999,93 -> 7000
})
