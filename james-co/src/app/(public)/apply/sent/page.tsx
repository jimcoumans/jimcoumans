import Link from 'next/link'

export default async function Sent({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const en = (await searchParams).lang === 'en'
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-[40px] leading-tight">{en ? 'Thank you. Please check your inbox.' : 'Dank u. Kijk in uw inbox.'}</h1>
      <p className="mt-4 text-[16px] text-muted">
        {en
          ? 'We have sent you an email to confirm your address. After confirming, your request reaches our team and we will contact you personally.'
          : 'We hebben u een e-mail gestuurd om uw adres te bevestigen. Daarna komt uw aanvraag bij ons team en nemen we persoonlijk contact met u op.'}
      </p>
      <Link href={en ? '/visiting-the-netherlands' : '/'} className="btn-secondary mt-8">{en ? 'Back' : 'Terug naar home'}</Link>
    </div>
  )
}
