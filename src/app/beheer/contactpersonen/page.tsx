import { redirect } from 'next/navigation'

/**
 * Het oude adres van de contactpersonenlijst.
 *
 * De lijst heet nu CRM en staat op /beheer/crm, omdat er behalve
 * klantcontacten ook partners en collega's in staan. Een oud adres dat een
 * 404 geeft is een bookmark die stukgaat, dus die sturen we door in plaats
 * van weg te gooien.
 */
export default async function ContactpersonenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const zoek = (q ?? '').trim()
  redirect(zoek === '' ? '/beheer/crm' : `/beheer/crm?q=${encodeURIComponent(zoek)}`)
}
