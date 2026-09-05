/**
 * Maakt een inloglink aan en print die, zonder mail te versturen.
 * Handig lokaal en bij het testen van een nieuwe klantomgeving.
 *
 * Gebruik: npm run login:link -- iemand@bedrijf.nl
 */
import { client } from './index'
import { createLoginToken } from '../lib/auth'

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Gebruik: npm run login:link -- iemand@bedrijf.nl')
    process.exitCode = 1
    return
  }

  const result = await createLoginToken(email)
  const base = process.env.APP_URL ?? 'http://localhost:3000'

  switch (result.status) {
    case 'sent':
      console.log(`${base}/auth/verify?token=${encodeURIComponent(result.token)}`)
      break
    case 'unknown_email':
      console.error(`Onbekend of geblokkeerd e-mailadres: ${email}`)
      process.exitCode = 1
      break
    case 'rate_limited':
      console.error('Te veel aanvragen voor dit adres. Wacht een uur.')
      process.exitCode = 1
      break
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => client.end())
