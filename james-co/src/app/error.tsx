'use client'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-[36px]">Er ging iets mis</h1>
      <p className="mt-3 text-muted">Uw gegevens zijn niet verloren. Probeer het opnieuw; blijft het misgaan, neem dan contact met ons op.</p>
      <button onClick={() => reset()} className="btn-primary mt-8">Opnieuw proberen</button>
    </main>
  )
}
