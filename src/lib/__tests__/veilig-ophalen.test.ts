/**
 * Tests voor het ophalen van een bestand van een adres dat van buiten komt.
 *
 * Dit is de plek waar een systeem van binnenuit opengaat als je het verkeerd
 * doet: een server die een willekeurig adres ophaalt, kan praten met dingen
 * die alleen die server kan bereiken. Elke test hieronder staat voor een
 * manier waarop zo'n filter in de praktijk wordt omzeild.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { haalBestandVeiligOp, hostIsToegestaan, bestandsnaamUit } from '../veilig-ophalen'

const TYPES = ['application/pdf'] as const

/** Een nep-fetch die altijd hetzelfde teruggeeft. */
function nepFetch(
  body: Uint8Array,
  headers: Record<string, string>,
  status = 200,
): typeof fetch {
  return (async () =>
    new Response(status === 200 ? new Uint8Array(body) : null, {
      status,
      headers,
    })) as unknown as typeof fetch
}

const basisOpties = {
  toegestaneHost: 'jamesrobinson.nl',
  toegestaneTypes: TYPES,
  maxBytes: 1000,
}

/* --- De hostcontrole ------------------------------------------------------ */

test('alleen de eigen host en subdomeinen daarvan', () => {
  assert.equal(hostIsToegestaan('jamesrobinson.nl', 'jamesrobinson.nl'), true)
  assert.equal(hostIsToegestaan('www.jamesrobinson.nl', 'jamesrobinson.nl'), true)
  assert.equal(hostIsToegestaan('JamesRobinson.NL', 'jamesrobinson.nl'), true)
})

test('een host die er alleen op eindigt komt er niet in', () => {
  /* Dit is hoe zo'n filter wordt omzeild: wie "eindigt op jamesrobinson.nl"
     controleert, laat kwaadjamesrobinson.nl door. De punt ervoor is het
     hele verschil. */
  assert.equal(hostIsToegestaan('kwaadjamesrobinson.nl', 'jamesrobinson.nl'), false)
  assert.equal(hostIsToegestaan('jamesrobinson.nl.kwaad.com', 'jamesrobinson.nl'), false)
  assert.equal(hostIsToegestaan('localhost', 'jamesrobinson.nl'), false)
  assert.equal(hostIsToegestaan('169.254.169.254', 'jamesrobinson.nl'), false)
})

test('zonder een opgegeven host mag niets', () => {
  assert.equal(hostIsToegestaan('jamesrobinson.nl', ''), false)
})

/* --- Wat er geweigerd wordt ----------------------------------------------- */

test('http wordt geweigerd, ook van de eigen host', async () => {
  const r = await haalBestandVeiligOp('http://jamesrobinson.nl/cv.pdf', {
    ...basisOpties,
    fetchImpl: nepFetch(new Uint8Array([1]), { 'content-type': 'application/pdf' }),
  })
  assert.equal(r.ok, false)
  assert.match(r.reden, /https/)
})

test('een ander adres wordt geweigerd', async () => {
  for (const adres of [
    'https://169.254.169.254/latest/meta-data/',
    'https://localhost/cv.pdf',
    'https://kwaadjamesrobinson.nl/cv.pdf',
  ]) {
    const r = await haalBestandVeiligOp(adres, {
      ...basisOpties,
      fetchImpl: nepFetch(new Uint8Array([1]), { 'content-type': 'application/pdf' }),
    })
    assert.equal(r.ok, false, `${adres} hoort geweigerd te worden`)
  }
})

test('de melding verraadt het geweigerde adres niet', async () => {
  // Anders komt dat adres in een log of op een scherm terecht.
  const r = await haalBestandVeiligOp('https://intern.kantoor.local/geheim.pdf', {
    ...basisOpties,
    fetchImpl: nepFetch(new Uint8Array([1]), { 'content-type': 'application/pdf' }),
  })
  assert.equal(r.ok, false)
  assert.ok(!r.reden.includes('intern.kantoor.local'))
})

test('een adres met inloggegevens wordt geweigerd', async () => {
  // https://jamesrobinson.nl@intern/ wijst niet naar jamesrobinson.nl.
  const r = await haalBestandVeiligOp('https://gebruiker:wachtwoord@jamesrobinson.nl/cv.pdf', {
    ...basisOpties,
    fetchImpl: nepFetch(new Uint8Array([1]), { 'content-type': 'application/pdf' }),
  })
  assert.equal(r.ok, false)
  assert.match(r.reden, /inloggegevens/)
})

test('onzin als adres levert een nette weigering op en geen uitzondering', async () => {
  const r = await haalBestandVeiligOp('dit is geen adres', basisOpties)
  assert.equal(r.ok, false)
})

test('een verkeerd bestandstype wordt geweigerd', async () => {
  const r = await haalBestandVeiligOp('https://jamesrobinson.nl/cv.svg', {
    ...basisOpties,
    fetchImpl: nepFetch(new Uint8Array([1, 2]), { 'content-type': 'image/svg+xml' }),
  })
  assert.equal(r.ok, false)
  assert.match(r.reden, /bestandstype/)
})

test('een te groot bestand wordt geweigerd, ook als de opgegeven lengte liegt', async () => {
  // Eerst op de opgegeven lengte.
  const opgegeven = await haalBestandVeiligOp('https://jamesrobinson.nl/cv.pdf', {
    ...basisOpties,
    fetchImpl: nepFetch(new Uint8Array(10), {
      'content-type': 'application/pdf',
      'content-length': '99999',
    }),
  })
  assert.equal(opgegeven.ok, false)

  // En daarna op wat er echt binnenkwam. Een content-length die liegt is
  // geen bijzonderheid.
  const echt = await haalBestandVeiligOp('https://jamesrobinson.nl/cv.pdf', {
    ...basisOpties,
    fetchImpl: nepFetch(new Uint8Array(5000), { 'content-type': 'application/pdf' }),
  })
  assert.equal(echt.ok, false)
  assert.match(echt.reden, /te groot/)
})

test('een leeg bestand wordt geweigerd', async () => {
  const r = await haalBestandVeiligOp('https://jamesrobinson.nl/cv.pdf', {
    ...basisOpties,
    fetchImpl: nepFetch(new Uint8Array(0), { 'content-type': 'application/pdf' }),
  })
  assert.equal(r.ok, false)
})

test('een foutstatus van de website wordt geweigerd', async () => {
  const r = await haalBestandVeiligOp('https://jamesrobinson.nl/weg.pdf', {
    ...basisOpties,
    fetchImpl: nepFetch(new Uint8Array(0), {}, 404),
  })
  assert.equal(r.ok, false)
  assert.match(r.reden, /404/)
})

test('een fetch die ontploft geeft een nette weigering', async () => {
  const r = await haalBestandVeiligOp('https://jamesrobinson.nl/cv.pdf', {
    ...basisOpties,
    fetchImpl: (async () => {
      throw new Error('verbinding geweigerd naar 10.0.0.5:5432')
    }) as unknown as typeof fetch,
  })
  assert.equal(r.ok, false)
  // De oorspronkelijke melding niet doorgeven: daar staan interne adressen in.
  assert.ok(!r.reden.includes('10.0.0.5'))
})

test('omleidingen worden niet gevolgd', async () => {
  /* Een omleiding kan naar een heel ander adres wijzen, en dan is de
     hostcontrole waardeloos. Er wordt met redirect: 'error' gevraagd; dit
     test dat die vlag ook echt wordt meegegeven. */
  let meegegeven: RequestInit | undefined
  const r = await haalBestandVeiligOp('https://jamesrobinson.nl/cv.pdf', {
    ...basisOpties,
    fetchImpl: (async (_u: string, init: RequestInit) => {
      meegegeven = init
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { 'content-type': 'application/pdf' },
      })
    }) as unknown as typeof fetch,
  })
  assert.equal(r.ok, true)
  assert.equal(meegegeven?.redirect, 'error')
})

/* --- Wat er wel doorkomt --------------------------------------------------- */

test('een gewoon pdf van de eigen site komt binnen', async () => {
  const inhoud = new Uint8Array([37, 80, 68, 70])
  const r = await haalBestandVeiligOp('https://jamesrobinson.nl/uploads/cv-maarten.pdf', {
    ...basisOpties,
    fetchImpl: nepFetch(inhoud, { 'content-type': 'application/pdf' }),
  })

  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.contentType, 'application/pdf')
  assert.equal(r.bytes.byteLength, 4)
  assert.equal(r.filename, 'cv-maarten.pdf')
})

test('een content-type met tekenset erachter wordt herkend', async () => {
  const r = await haalBestandVeiligOp('https://jamesrobinson.nl/cv.pdf', {
    ...basisOpties,
    fetchImpl: nepFetch(new Uint8Array([1]), { 'content-type': 'application/pdf; charset=binary' }),
  })
  assert.equal(r.ok, true)
})

/* --- De bestandsnaam ------------------------------------------------------- */

test('de bestandsnaam wordt schoongemaakt', () => {
  assert.equal(bestandsnaamUit('https://jamesrobinson.nl/u/cv.pdf'), 'cv.pdf')
  // Padtekens eruit: deze naam gaat een download-header in.
  assert.equal(bestandsnaamUit('https://jamesrobinson.nl/u/%2e%2e%2fetc%2fpasswd'), '.._etc_passwd')
  assert.equal(bestandsnaamUit('https://jamesrobinson.nl/u/'), null)
  assert.equal(bestandsnaamUit('geen adres'), null)
})
