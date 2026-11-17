import type { Metadata } from 'next'
import { ApplyForm } from '@/components/ApplyForm'

export const metadata: Metadata = { title: 'Visiting the Netherlands', description: 'Your private contact in the Netherlands.' }

export default function Visitors() {
  return (
    <div lang="en" className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="eyebrow mb-4">Visitor arrangement</p>
      <h1 className="text-[44px] leading-tight sm:text-[56px]">Your private contact in the Netherlands.</h1>
      <div className="rule my-8" />
      <p className="max-w-prose text-[17px] leading-relaxed text-ink/85">
        From your arrival to the plans that make your stay worthwhile, James &amp; Co. brings everything together through one personal contact.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[
          ['One stay, one contact', 'An intake, planning within an agreed scope, proposals and local coordination during your visit.'],
          ['Clear terms first', 'A fixed coordination fee is agreed in advance. Supplier costs such as hotels, dining and transport are paid separately.'],
          ['Where we work', 'We are based in Maastricht and South Limburg. For other locations we work with partners and tell you upfront who does what.'],
        ].map(([t, d]) => (
          <div key={t} className="card"><h2 className="text-[22px]">{t}</h2><p className="mt-2 text-[15px] text-muted">{d}</p></div>
        ))}
      </div>
      <p className="mt-6 max-w-prose text-[15px] text-muted">
        Requests may come from the traveller, an assistant, a travel advisor or a family office. Tell us about language, privacy, family, dietary wishes and mobility, and we will discuss what we can arrange. Contracts and invoices are in euros.
      </p>
      <div className="card mt-10">
        <h2 className="mb-4 text-[28px]">Tell us about your visit</h2>
        <ApplyForm language="en" segment="international_visitor" />
      </div>
    </div>
  )
}
