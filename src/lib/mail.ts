/**
 * Verstuurt de inlogmail via de Resend-API.
 *
 * Bewust met fetch in plaats van de resend-sdk: die sleept een React-email
 * renderer mee die we niet gebruiken, en dit is een enkele POST. Minder
 * afhankelijkheden om over een jaar bij te houden.
 *
 * Zonder RESEND_API_KEY (lokaal) wordt de link naar de console geschreven
 * in plaats van verstuurd, zodat je kunt ontwikkelen zonder mailkoppeling.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

const JR_BLUE = '#007AFF'
const JR_BLACK = '#1C1C1E'
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export type MailResult = { delivered: boolean; loggedToConsole: boolean }

export async function sendLoginEmail(email: string, loginUrl: string): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM ?? 'James Robinson Wallet <wallet@jamesrobinson.nl>'

  if (!apiKey) {
    // Bewust niet stil falen: anders zoek je je scheel waarom er geen mail komt.
    console.warn(
      `[wallet] RESEND_API_KEY ontbreekt, geen mail verstuurd.\n` +
        `[wallet] Inloglink voor ${email}:\n${loginUrl}\n`,
    )
    return { delivered: false, loggedToConsole: true }
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Je inloglink voor de James Robinson Wallet',
        text: [
        'Hoi,',
        '',
        'Met deze link log je in op je wallet:',
        loginUrl,
        '',
        'De link is 15 minuten geldig en werkt een keer.',
        'Heb je hem niet zelf aangevraagd? Dan kun je deze mail negeren.',
        '',
        'James Robinson - Marketing & Branding',
        'www.jamesrobinson.nl',
      ].join('\n'),
      html: loginEmailHtml(loginUrl),
    }),
  })

  if (!response.ok) {
    // De aanroeper mag niet doen alsof de mail verstuurd is als dat niet zo
    // is; anders wacht een klant op een link die nooit komt.
    const body = await response.text().catch(() => '')
    throw new Error(`Resend gaf ${response.status}: ${body.slice(0, 300)}`)
  }

  return { delivered: true, loggedToConsole: false }
}

function loginEmailHtml(loginUrl: string): string {
  return `<!doctype html>
<html lang="nl">
  <body style="margin:0;padding:32px 16px;background:#F2F2F7;font-family:${FONT};color:${JR_BLACK};line-height:1.4;font-weight:300;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="background:${JR_BLACK};padding:24px 32px;">
          <div style="color:#ffffff;font-weight:700;font-size:18px;line-height:1.1;">James Robinson</div>
          <div style="color:${JR_BLUE};font-size:13px;margin-top:4px;">Wallet</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.1;font-weight:700;color:${JR_BLUE};">Inloggen op je wallet</h1>
          <p style="margin:0 0 24px;font-size:15px;">Klik op de knop om in te loggen. De link is 15 minuten geldig en werkt een keer.</p>
          <a href="${loginUrl}"
             style="display:inline-block;background:#0857C3;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:400;font-size:15px;">
            Naar mijn wallet
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#636466;">
            Werkt de knop niet? Kopieer deze link in je browser:<br />
            <span style="word-break:break-all;color:${JR_BLUE};">${loginUrl}</span>
          </p>
          <p style="margin:24px 0 0;font-size:13px;color:#636466;">
            Heb je deze link niet zelf aangevraagd? Dan kun je deze mail negeren.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 24px;border-top:1px solid #E5E5E9;font-size:12px;color:#636466;">
          James Robinson &mdash; Marketing &amp; Branding | www.jamesrobinson.nl
        </td>
      </tr>
    </table>
  </body>
</html>`
}
