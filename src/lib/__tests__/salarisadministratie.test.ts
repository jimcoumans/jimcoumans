/**
 * Tests voor de salarisadministratie: het Excel-bestand en de mail.
 *
 * Wat hier vastligt: de Excel is een echte xlsx (een zip met de vaste
 * onderdelen) met tekst als tekst en getallen als getal, en de mail naar de
 * salarisadministratie bevat de link en laat geen plaatshouders staan.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { strFromU8, unzipSync } from 'fflate'
import { maakXlsx } from '../xlsx'
import { salarisMail } from '../mailsjablonen'

test('de Excel is een xlsx met een blad, tekst als tekst en bedragen als getal', () => {
  const xlsx = maakXlsx(['Naam', 'Bruto per maand'], [['Daan & Co <test>', 2360.41], ['Leeg', null]])
  const delen = unzipSync(xlsx)
  for (const deel of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']) {
    assert.ok(delen[deel], `${deel} ontbreekt`)
  }
  const blad = strFromU8(delen['xl/worksheets/sheet1.xml']!)
  assert.match(blad, /<t xml:space="preserve">Daan &amp; Co &lt;test&gt;<\/t>/)
  assert.match(blad, /<c r="B2"><v>2360.41<\/v><\/c>/)
  assert.match(blad, /<c r="B3"\/>/)
  // De kop is vet en blijft staan bij scrollen.
  assert.match(blad, /<c r="A1" t="inlineStr" s="1">/)
  assert.match(blad, /state="frozen"/)
})

test('de mail naar de salarisadministratie heeft de link en geen losse plaatshouders', () => {
  const mail = salarisMail({
    aan: 'loon@example.nl',
    roepnaam: 'Daan',
    functie: 'Marketing Manager',
    startdatum: new Date('2026-10-13T12:00:00'),
    afzender: 'Jim Coumans',
    samenvatting: '- Uren per week: 24',
    werknemerNaam: 'Daan Voncken',
    ontvangerVoornaam: 'Sanne',
    beveiligdeLink: 'https://send.bitwarden.com/#abc',
    opmerking: 'Hij begint om 9 uur.',
  })
  assert.match(mail.onderwerp, /Daan Voncken/)
  assert.match(mail.onderwerp, /13 oktober 2026/)
  assert.match(mail.tekst, /^Beste Sanne,/)
  assert.match(mail.tekst, /https:\/\/send\.bitwarden\.com\/#abc/)
  assert.match(mail.tekst, /Hij begint om 9 uur\./)
  assert.match(mail.tekst, /- Uren per week: 24/)
  assert.doesNotMatch(mail.tekst + mail.onderwerp, /\{\{/)
})

test('zonder opmerking staat er ook geen lege alinea voor', () => {
  const mail = salarisMail({
    aan: 'loon@example.nl',
    roepnaam: 'Daan',
    functie: 'Marketing Manager',
    startdatum: null,
    afzender: 'Jim Coumans',
    werknemerNaam: 'Daan Voncken',
    ontvangerVoornaam: 'Sanne',
    beveiligdeLink: 'https://send.bitwarden.com/#abc',
  })
  assert.match(mail.tekst, /Binnenkort komt Daan Voncken/)
  assert.doesNotMatch(mail.tekst, /\n\n\n/)
  assert.doesNotMatch(mail.tekst + mail.onderwerp, /\{\{/)
})
