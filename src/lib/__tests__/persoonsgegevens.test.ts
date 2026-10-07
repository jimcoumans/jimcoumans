/**
 * Het kandidaatprofiel en de persoonsgegevens voor het contract.
 *
 * Wat hier vastligt: een IBAN wordt gecontroleerd en nooit leesbaar
 * opgeslagen; documenten staan versleuteld en wie ze opent wordt vastgelegd;
 * de link voor de kandidaat werkt alleen met het juiste token en een nieuwe
 * link maakt de oude ongeldig; doorgeven aan de salarisadministratie kan pas
 * als alles compleet is; en wie wordt gewist, neemt zijn gegevens mee.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { candidates, users, personalRecords, personalDocuments, personalDocumentViews } from '../../db/schema'
import { versleutel, ontsleutel } from '../versleuteling'
import {
  ibanKlopt,
  ibanInGroepjes,
  schoonPostcode,
  zorgVoorGegevens,
  slaGegevensOp,
  getGegevens,
  leesIban,
  maakGegevenslink,
  gegevensViaLink,
  dienGegevensIn,
  leesDocument,
  markeerDoorgegeven,
  GegevensError,
} from '../persoonsgegevens'
import { maakKandidaat, bewerkKandidaat, listNotities, voegNotitieToe, zetKandidaatStatus, wisKandidaat, getKandidaat } from '../werving'

const merk = `pg${Date.now()}`
let beheerderId: string
const kandidaten: string[] = []

before(async () => {
  const [u] = await db.insert(users).values({ email: `${merk}@jamesrobinson.nl`, name: 'Jim Test', role: 'admin' }).returning()
  beheerderId = u!.id
})

after(async () => {
  await db.delete(candidates).where(inArray(candidates.id, kandidaten))
  await db.delete(users).where(eq(users.id, beheerderId))
  await client.end()
})

async function nieuweKandidaat(naam = 'Daan') {
  const k = await maakKandidaat({ firstName: naam, lastName: `${merk} Jansen`, email: `${naam.toLowerCase()}@example.nl`, source: 'linkedin', notes: 'Sterk portfolio.', doorUserId: beheerderId })
  kandidaten.push(k.id)
  return k
}

/* ------------------------------ Zonder database --------------------------- */

test('IBAN: het controlegetal wordt gecontroleerd', () => {
  assert.equal(ibanKlopt('NL91 ABNA 0417 1643 00'), true)
  assert.equal(ibanKlopt('nl91abna0417164300'), true)
  assert.equal(ibanKlopt('NL91 ABNA 0417 1643 01'), false)
  assert.equal(ibanKlopt('NL91 ABNA 0417 1643'), false)
  assert.equal(ibanKlopt('BE68 5390 0754 7034'), true)
  assert.equal(ibanInGroepjes('nl91abna0417164300'), 'NL91 ABNA 0417 1643 00')
})

test('postcode wordt netjes geschreven, een buitenlandse blijft staan', () => {
  assert.equal(schoonPostcode('6181ez'), '6181 EZ')
  assert.equal(schoonPostcode('6181 EZ'), '6181 EZ')
  assert.equal(schoonPostcode('B-3600'), 'B-3600')
})

test('versleutelen: heen en terug, en een aangepaste waarde wordt geweigerd', () => {
  const v = versleutel('NL91ABNA0417164300')
  assert.ok(!v.includes('ABNA'))
  assert.equal(ontsleutel(v).toString(), 'NL91ABNA0417164300')
  assert.notEqual(versleutel('x'), versleutel('x'), 'elke keer een andere iv')
  const [versie, iv, tag, data] = v.split(':')
  const geknoeid = [versie, iv, tag, Buffer.from('nep').toString('base64') + data!.slice(4)].join(':')
  assert.throws(() => ontsleutel(geknoeid))
})

/* ------------------------------ Het profiel ------------------------------- */

test('kandidaat: wijzigen, officiële voornamen, en elke statuswijziging op de tijdlijn', async () => {
  const k = await nieuweKandidaat()
  await bewerkKandidaat(k.id, {
    firstName: 'Daan',
    infix: 'van',
    lastName: `${merk} Jansen`,
    officialFirstNames: 'Daniël Johannes Maria',
    email: 'daan@example.nl',
    phone: '06 12345678',
    linkedinUrl: null,
    vacancyId: null,
    source: 'doorverwijzing',
    referredByUserId: beheerderId,
    school: null,
    study: null,
    appliedOn: k.appliedOn,
  })
  const na = (await getKandidaat(k.id))!.kandidaat
  assert.equal(na.name, `Daan van ${merk} Jansen`)
  assert.equal(na.officialFirstNames, 'Daniël Johannes Maria')
  assert.equal(na.source, 'doorverwijzing')

  await voegNotitieToe(k.id, 'Eerste gesprek: enthousiast, wil 32 uur.', 'gesprek', beheerderId)
  await zetKandidaatStatus(k.id, 'in_gesprek', null, new Date(), beheerderId)
  await zetKandidaatStatus(k.id, 'contract', null, new Date(Date.now() + 1000), beheerderId)
  const tijdlijn = await listNotities(k.id)
  assert.deepEqual(
    tijdlijn.map((n) => n.kind),
    ['status', 'status', 'gesprek', 'notitie'],
  )
  assert.equal(tijdlijn[0]!.body, 'In gesprek → Contract ter ondertekening')
  assert.equal(tijdlijn[3]!.body, 'Sterk portfolio.', 'de notitie bij het toevoegen staat op de tijdlijn')
  await assert.rejects(voegNotitieToe(k.id, '   ', 'notitie', beheerderId), /Schrijf eerst iets op/)
})

/* ------------------------------ Persoonsgegevens -------------------------- */

test('gegevens: IBAN alleen versleuteld, een fout IBAN wordt geweigerd', async () => {
  const k = await nieuweKandidaat('Eva')
  const r = await zorgVoorGegevens(k.id)
  assert.equal(r.lastName, `${merk} Jansen`, 'wat we al weten, staat er alvast')
  await assert.rejects(slaGegevensOp(r.id, { iban: 'NL91 ABNA 0417 1643 01' }), GegevensError)
  await slaGegevensOp(r.id, { officialFirstNames: 'Eva Maria', lastName: 'Jansen', iban: 'nl91 abna 0417 1643 00', postalCode: '6181ez' })
  const [rij] = await db.select().from(personalRecords).where(eq(personalRecords.id, r.id))
  assert.ok(rij!.ibanEnc && !rij!.ibanEnc.includes('0417'), 'het IBAN staat nergens leesbaar')
  assert.equal(rij!.ibanLast4, '4300')
  assert.equal(rij!.postalCode, '6181 EZ')
  assert.equal(leesIban(rij!), 'NL91 ABNA 0417 1643 00')
  // Leeg IBAN bij opnieuw opslaan: het oude blijft staan.
  await slaGegevensOp(r.id, { officialFirstNames: 'Eva Maria', lastName: 'Jansen', iban: '' })
  const [nog] = await db.select().from(personalRecords).where(eq(personalRecords.id, r.id))
  assert.equal(nog!.ibanEnc, rij!.ibanEnc)
})

test('de link: alleen met het juiste token, en een nieuwe link maakt de oude ongeldig', async () => {
  const k = await nieuweKandidaat('Finn')
  const r = await zorgVoorGegevens(k.id)
  const pad = await maakGegevenslink(r.id)
  const token = pad.split('/')[3]!
  assert.ok(await gegevensViaLink(r.id, token))
  assert.equal(await gegevensViaLink(r.id, token.replace(/.$/, token.endsWith('A') ? 'B' : 'A')), null)
  const nieuw = await maakGegevenslink(r.id, true)
  assert.equal(await gegevensViaLink(r.id, token), null, 'de oude link werkt niet meer')
  assert.ok(await gegevensViaLink(r.id, nieuw.split('/')[3]!))
})

test('aanleveren via de link, document openen wordt vastgelegd, doorgeven pas als het compleet is', async () => {
  const k = await nieuweKandidaat('Gijs')
  const r = await zorgVoorGegevens(k.id)
  const token = (await maakGegevenslink(r.id)).split('/')[3]!
  const pdf = Buffer.from('%PDF-1.4 test')

  // Eerst alleen de gegevens en het ID: het loonheffingsformulier ontbreekt nog.
  const nogNodig = await dienGegevensIn(
    r.id,
    token,
    {
      officialFirstNames: 'Gijsbert',
      lastName: 'Jansen',
      birthDate: new Date('1998-04-12T12:00:00'),
      addressLine: 'Dorpsstraat 1',
      postalCode: '6181EZ',
      city: 'Elsloo',
      iban: 'NL91ABNA0417164300',
    },
    [{ kind: 'id_kopie', contentType: 'image/jpeg', filename: 'paspoort.jpg', data: pdf }],
  )
  assert.deepEqual(nogNodig, ['loonheffingsformulier'])
  await assert.rejects(markeerDoorgegeven(r.id, beheerderId), /Nog niet compleet: loonheffingsformulier/)
  // Een bestand van een verkeerde soort wordt geweigerd.
  await assert.rejects(dienGegevensIn(r.id, token, {}, [{ kind: 'loonheffing', contentType: 'text/html', filename: 'x.html', data: pdf }]), /Alleen een pdf/)

  // Met dezelfde link aanvullen.
  const klaar = await dienGegevensIn(r.id, token, { officialFirstNames: 'Gijsbert', lastName: 'Jansen', birthDate: new Date('1998-04-12T12:00:00'), addressLine: 'Dorpsstraat 1', postalCode: '6181EZ', city: 'Elsloo' }, [
    { kind: 'loonheffing', contentType: 'application/pdf', filename: 'loonheffing.pdf', data: pdf },
  ])
  assert.deepEqual(klaar, [])
  assert.equal((await getKandidaat(k.id))!.kandidaat.officialFirstNames, 'Gijsbert', 'de naam uit het paspoort staat ook op de kandidaat')

  const g = (await getGegevens({ candidateId: k.id }))!
  const [opgeslagen] = await db.select().from(personalDocuments).where(eq(personalDocuments.id, g.documenten[0]!.id))
  assert.ok(!opgeslagen!.dataEnc.includes(pdf.toString('base64')), 'het document staat versleuteld')
  const gelezen = await leesDocument(g.documenten[0]!.id, beheerderId)
  assert.equal(gelezen!.data.toString(), pdf.toString())
  const inzage = await db.select().from(personalDocumentViews).where(eq(personalDocumentViews.documentId, g.documenten[0]!.id))
  assert.equal(inzage.length, 1)
  assert.equal(inzage[0]!.userId, beheerderId)

  await markeerDoorgegeven(r.id, beheerderId)
  assert.ok((await getGegevens({ candidateId: k.id }))!.record.doorgegevenOp)
  assert.ok((await listNotities(k.id)).some((n) => n.body === 'Gegevens doorgegeven aan de salarisadministratie.'))

  // Wie wordt gewist, neemt zijn gegevens en documenten mee.
  await wisKandidaat(k.id)
  assert.equal(await getGegevens({ candidateId: k.id }), null)
  const over = await db.select().from(personalDocuments).where(eq(personalDocuments.recordId, r.id))
  assert.equal(over.length, 0)
})
