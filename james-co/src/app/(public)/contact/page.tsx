import Link from 'next/link'
import type { Metadata } from 'next'
import { getSettings, publicCompany, whatsappLink } from '@/lib/domain/settings'

export const metadata: Metadata = { title: 'Contact' }
export const dynamic = 'force-dynamic'

export default async function Contact() {
  const s = await getSettings()
  const company = publicCompany(s)
  const wa = whatsappLink(s)
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-[44px]">Contact</h1>
      <div className="rule my-6" />
      {company ? (
        <address className="card not-italic text-[16px] leading-relaxed">
          <p className="font-medium">{company.legalName}{company.tradeName && company.tradeName !== company.legalName ? ` (handelend als ${company.tradeName})` : ''}</p>
          {company.address && <p>{company.address}</p>}
          {company.kvk && <p>KvK {company.kvk}</p>}
          {company.vat && <p>Btw {company.vat}</p>}
          <p className="mt-3"><a href={`mailto:${company.email}`} className="underline">{company.email}</a></p>
          {company.phone && <p><a href={`tel:${company.phone}`} className="underline">{company.phone}</a></p>}
        </address>
      ) : (
        <p className="text-[16px] text-muted">De volledige bedrijfsgegevens worden hier gepubliceerd zodra ze zijn vastgesteld. Tot die tijd kunt u contact opnemen via het <Link href="/apply" className="underline">kennismakingsformulier</Link>.</p>
      )}
      {wa && <a href={wa} className="btn-secondary mt-6" rel="noopener">WhatsApp James &amp; Co.</a>}
    </div>
  )
}
