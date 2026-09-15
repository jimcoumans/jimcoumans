import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSessionUser, createLoginToken, createSession, normalizeEmail } from '@/lib/auth'
import { controleerInlog } from '@/lib/wachtwoord'
import { sendLoginEmail } from '@/lib/mail'
import { Logo } from '@/components/Logo'

/* Inloggen met een e-mailadres. Geen wachtwoord, geen registratie. */

async function vraagLinkAan(formData: FormData) {
  'use server'

  const email = String(formData.get('email') ?? '')
  if (!email.includes('@')) {
    redirect('/login?fout=email')
  }

  const result = await createLoginToken(normalizeEmail(email))

  if (result.status === 'sent') {
    const base = process.env.APP_URL ?? 'http://localhost:3000'
    const url = `${base}/auth/verify?token=${encodeURIComponent(result.token)}`
    await sendLoginEmail(result.email, url)
  }

  // Bij een onbekend adres krijgt de bezoeker exact dezelfde bevestiging.
  // Anders kun je via dit formulier uitvissen wie klant is bij James Robinson.
  // Bij te veel aanvragen wel een eigen melding: dat verraadt niets, want
  // die kun je alleen zien als je zelf al vaak hebt geprobeerd.
  if (result.status === 'rate_limited') {
    redirect('/login?fout=limiet')
  }

  redirect('/login?verstuurd=1')
}

/**
 * Inloggen met een wachtwoord.
 *
 * Staat naast de inloglink, niet in plaats daarvan: klanten loggen in met een
 * link — daar valt niets te raden en niets te vergeten — en het eigen team
 * kan een wachtwoord instellen. Dat werkt ook als de mail het niet doet.
 */
async function logIn(formData: FormData) {
  'use server'

  const email = String(formData.get('email') ?? '')
  const wachtwoord = String(formData.get('wachtwoord') ?? '')
  if (!email.includes('@') || wachtwoord === '') redirect('/login?fout=inlog')

  // Het IP alleen om te tellen, zodat je kunt zien waar het raden vandaan komt.
  const kop = await headers()
  const ip = kop.get('x-nf-client-connection-ip') ?? kop.get('x-forwarded-for')

  const uitkomst = await controleerInlog(email, wachtwoord, ip)

  if (uitkomst.status === 'op_slot') redirect('/login?fout=slot')
  if (uitkomst.status !== 'ok') redirect('/login?fout=inlog')

  await createSession(uitkomst.userId)
  redirect('/')
}

const foutmeldingen: Record<string, string> = {
  inlog: 'Dit e-mailadres en wachtwoord horen niet bij elkaar.',
  slot: 'Te vaak mis geprobeerd. Wacht een kwartier, of vraag een inloglink aan.',
  email: 'Vul een geldig e-mailadres in.',
  limiet: 'Je hebt te veel inloglinks aangevraagd. Probeer het over een uur opnieuw.',
  ongeldig: 'Deze inloglink is niet geldig. Vraag een nieuwe aan.',
  verlopen: 'Deze inloglink is verlopen. Vraag een nieuwe aan.',
  gebruikt: 'Deze inloglink is al gebruikt. Vraag een nieuwe aan.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verstuurd?: string; fout?: string }>
}) {
  const user = await getSessionUser()
  if (user) redirect('/')

  const params = await searchParams
  const fout = params.fout ? foutmeldingen[params.fout] : null

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo />
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm">
          {params.verstuurd ? (
            <>
              <h1 className="text-jr-blue mb-3 text-2xl">Check je mail</h1>
              <p className="text-sm">
                Als dit e-mailadres bij ons bekend is, staat er een inloglink in je
                inbox. De link is 15 minuten geldig.
              </p>
              <p className="mt-4 text-sm text-gray-600">
                Geen mail ontvangen? Kijk in je spamfolder, of{' '}
                <a href="/login" className="text-jr-blue underline">
                  probeer het opnieuw
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <h1 className="text-jr-blue mb-2 text-2xl">Inloggen</h1>
              <p className="mb-6 text-sm text-gray-600">
                Met je wachtwoord, of laat een inloglink sturen als je er geen hebt.
              </p>

              {fout && (
                <p
                  role="alert"
                  className="border-jr-red bg-jr-red/5 mb-4 rounded border-l-4 p-3 text-sm"
                >
                  {fout}
                </p>
              )}

              <form action={logIn} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-normal">
                    E-mailadres
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    autoFocus
                    placeholder="naam@bedrijf.nl"
                    className="focus:border-jr-blue focus:ring-jr-blue/20 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-base outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label htmlFor="wachtwoord" className="mb-1.5 block text-sm font-normal">
                    Wachtwoord
                  </label>
                  <input
                    id="wachtwoord"
                    name="wachtwoord"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="focus:border-jr-blue focus:ring-jr-blue/20 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-base outline-none focus:ring-2"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-jr-btn hover:bg-jr-btnhover w-full rounded-lg px-4 py-2.5 text-base text-white transition-colors"
                >
                  Inloggen
                </button>
              </form>

              {/* De inloglink blijft: klanten hebben geen wachtwoord, en wie
                  het zijne vergeet komt er zo alsnog in. */}
              <form action={vraagLinkAan} className="mt-5 border-t border-gray-200 pt-5">
                <label htmlFor="linkmail" className="mb-1.5 block text-sm text-gray-600">
                  Geen wachtwoord? Laat een inloglink sturen.
                </label>
                <div className="flex gap-2">
                  <input
                    id="linkmail"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="naam@bedrijf.nl"
                    className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Stuur link
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          James Robinson &mdash; Marketing &amp; Branding
          <br />
          <a href="https://www.jamesrobinson.nl" className="hover:text-jr-blue">
            www.jamesrobinson.nl
          </a>
        </p>
      </div>
    </main>
  )
}
