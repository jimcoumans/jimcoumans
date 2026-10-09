import { getBedrijf, haalLogo } from '@/lib/bedrijf'

/** Het logo uit de bedrijfsgegevens. Openbaar: het staat ook op elk document dat we versturen. */
export async function GET() {
  const bedrijf = await getBedrijf()
  const logo = await haalLogo(bedrijf?.werkgever ?? null)
  if (!logo) return new Response('Nog geen logo.', { status: 404 })
  return new Response(new Uint8Array(logo.data), {
    headers: { 'Content-Type': logo.contentType, 'Cache-Control': 'public, max-age=300' },
  })
}
