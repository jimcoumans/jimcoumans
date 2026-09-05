import { redirect } from 'next/navigation'
import { consumeLoginToken, createSession } from '@/lib/auth'
import { Logo } from '@/components/Logo'

/**
 * Wisselt de inloglink in voor een sessie.
 *
 * Waarom hier een knop staat en het niet in een klik gaat: mailclients en
 * beveiligingsscanners (Outlook SafeLinks, virusscanners, link-previews)
 * openen links in mails automatisch met een GET. Bij een eenmalig token zou
 * de link dan al verbruikt zijn voordat de klant zelf klikt, en die krijgt
 * dan "deze link is al gebruikt" te zien terwijl hij niets fout deed.
 *
 * Een scanner doet geen POST. Door het inwisselen achter deze knop te
 * zetten werkt de link altijd, ten koste van een extra klik.
 */

async function login(formData: FormData) {
  'use server'

  const token = String(formData.get('token') ?? '')
  if (!token) redirect('/login?fout=ongeldig')

  const result = await consumeLoginToken(token)

  switch (result.status) {
    case 'ok':
      await createSession(result.userId)
      redirect('/')
    case 'expired':
      redirect('/login?fout=verlopen')
    case 'used':
      redirect('/login?fout=gebruikt')
    default:
      redirect('/login?fout=ongeldig')
  }
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (!token) redirect('/login?fout=ongeldig')

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo />
        </div>

        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-jr-blue mb-2 text-2xl">Welkom terug</h1>
          <p className="mb-6 text-sm text-gray-600">
            Nog een klik en je bent binnen.
          </p>

          <form action={login}>
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="bg-jr-btn hover:bg-jr-btnhover w-full rounded-lg px-4 py-2.5 text-base text-white transition-colors"
            >
              Naar mijn wallet
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          James Robinson &mdash; Marketing &amp; Branding
        </p>
      </div>
    </main>
  )
}
