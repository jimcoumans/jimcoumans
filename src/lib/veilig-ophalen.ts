/* -------------------------------------------------------------------------
   Een bestand ophalen van een adres dat van buiten komt.

   Dit bestand bestaat omdat "haal even dat cv op" een van de gevaarlijkste
   zinnen in een webapplicatie is. Een server die een willekeurig adres
   ophaalt kan gebruikt worden om te praten met dingen die alleen die server
   kan bereiken: interne netwerkadressen, metadata-diensten van de hoster,
   databases zonder poort naar buiten. Dat heet server-side request forgery
   en het is een van de manieren waarop een systeem van binnenuit opengaat.

   Het adres komt hier van WordPress, dus in theorie is het te vertrouwen.
   Maar "in theorie te vertrouwen" is precies de aanname die je niet wilt
   maken op de plek waar een aanvaller uitkomt als er ergens anders iets
   lekt.

   Daarom: alleen https, alleen de host die je vooraf hebt opgegeven, geen
   omleidingen volgen, een tijdslimiet, een maximum aantal bytes, en alleen
   de bestandstypes die je verwacht. Alles wat daarbuiten valt gaat niet
   door - er wordt niet geprobeerd er het beste van te maken.
   ------------------------------------------------------------------------- */

export type OphaalResultaat =
  | { ok: true; bytes: Uint8Array; contentType: string; filename: string | null }
  | { ok: false; reden: string }

export type OphaalOpties = {
  /** De enige host waarvan opgehaald mag worden, bijv. jamesrobinson.nl. */
  toegestaneHost: string
  /** Welke content-types goed zijn. Alles daarbuiten wordt geweigerd. */
  toegestaneTypes: readonly string[]
  maxBytes: number
  timeoutMs?: number
  /** Alleen voor tests: een eigen fetch meegeven. */
  fetchImpl?: typeof fetch
}

/**
 * Of een host bij de toegestane host hoort.
 *
 * Exact gelijk, of een subdomein ervan. Let op de punt: zonder die controle
 * zou "kwaadjamesrobinson.nl" ook door de test "eindigt op
 * jamesrobinson.nl" komen, en dat is precies hoe zo'n filter wordt omzeild.
 */
export function hostIsToegestaan(host: string, toegestaneHost: string): boolean {
  const h = host.toLowerCase()
  const t = toegestaneHost.toLowerCase().replace(/^\./, '')
  if (t === '') return false
  return h === t || h.endsWith(`.${t}`)
}

/** Alles achter de laatste schuine streep, opgeschoond tot een veilige naam. */
export function bestandsnaamUit(url: string): string | null {
  try {
    const pad = new URL(url).pathname
    const laatste = pad.slice(pad.lastIndexOf('/') + 1)
    const schoon = decodeURIComponent(laatste)
      // Geen padtekens en geen rare tekens: deze naam komt op een scherm en
      // in een download-header terecht.
      .replace(/[^\w .\-()]/g, '_')
      .slice(0, 120)
      .trim()
    return schoon === '' ? null : schoon
  } catch {
    return null
  }
}

/**
 * Haalt een bestand op, of geeft een reden waarom niet.
 *
 * Geeft nooit een uitzondering terug aan de aanroeper: een sollicitatie die
 * binnenkomt mag niet stranden omdat een bestand niet op te halen was. De
 * kandidaat is belangrijker dan zijn bijlage.
 */
export async function haalBestandVeiligOp(
  adres: string,
  opties: OphaalOpties,
): Promise<OphaalResultaat> {
  const doeFetch = opties.fetchImpl ?? fetch
  const timeoutMs = opties.timeoutMs ?? 10_000

  let url: URL
  try {
    url = new URL(adres)
  } catch {
    return { ok: false, reden: 'Geen geldig adres.' }
  }

  if (url.protocol !== 'https:') {
    return { ok: false, reden: 'Alleen https is toegestaan.' }
  }
  if (!hostIsToegestaan(url.hostname, opties.toegestaneHost)) {
    // De host niet in de melding zetten: die komt van buiten en zou zo in
    // een log of op een scherm terechtkomen.
    return { ok: false, reden: 'Dit adres hoort niet bij de eigen website.' }
  }
  if (url.username !== '' || url.password !== '') {
    // https://iets@interneserver/ is een klassieke manier om een hostfilter
    // te misleiden bij een slordige parser.
    return { ok: false, reden: 'Een adres met inloggegevens wordt niet opgehaald.' }
  }

  const afbreken = new AbortController()
  const klok = setTimeout(() => afbreken.abort(), timeoutMs)

  try {
    const antwoord = await doeFetch(url.toString(), {
      // Een omleiding kan naar een heel ander adres wijzen, en dan is de
      // controle hierboven waardeloos. Dus: niet volgen, maar weigeren.
      redirect: 'error',
      signal: afbreken.signal,
      headers: { accept: opties.toegestaneTypes.join(', ') },
    })

    if (!antwoord.ok) {
      return { ok: false, reden: `De website gaf status ${antwoord.status}.` }
    }

    const type = (antwoord.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase()
    if (!opties.toegestaneTypes.includes(type)) {
      return { ok: false, reden: 'Dit bestandstype wordt niet geaccepteerd.' }
    }

    // Eerst de opgegeven lengte controleren: scheelt het binnenhalen van
    // iets wat toch te groot is.
    const opgegeven = Number(antwoord.headers.get('content-length') ?? '')
    if (Number.isFinite(opgegeven) && opgegeven > opties.maxBytes) {
      return { ok: false, reden: 'Het bestand is te groot.' }
    }

    const buffer = await antwoord.arrayBuffer()
    // En daarna nog een keer op wat er echt binnenkwam: een content-length
    // die liegt is geen bijzonderheid.
    if (buffer.byteLength > opties.maxBytes) {
      return { ok: false, reden: 'Het bestand is te groot.' }
    }
    if (buffer.byteLength === 0) {
      return { ok: false, reden: 'Het bestand is leeg.' }
    }

    return {
      ok: true,
      bytes: new Uint8Array(buffer),
      contentType: type,
      filename: bestandsnaamUit(adres),
    }
  } catch (fout) {
    if (fout instanceof Error && fout.name === 'AbortError') {
      return { ok: false, reden: 'Het ophalen duurde te lang.' }
    }
    // De oorspronkelijke melding niet doorgeven: daar kunnen interne
    // adressen of hostnamen in staan.
    return { ok: false, reden: 'Het bestand kon niet worden opgehaald.' }
  } finally {
    clearTimeout(klok)
  }
}
