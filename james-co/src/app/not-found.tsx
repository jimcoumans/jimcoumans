import Link from 'next/link'

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-[40px]">Niet gevonden</h1>
      <p className="mt-3 text-muted">Deze pagina bestaat niet of is niet voor u beschikbaar.</p>
      <Link href="/" className="btn-secondary mt-8">Naar home</Link>
    </main>
  )
}
