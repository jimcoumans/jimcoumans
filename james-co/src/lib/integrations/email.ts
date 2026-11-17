/**
 * E-mailadapter (Resend via HTTPS). Zonder configuratie:
 *  - productie: status not_configured, er wordt niets verzonden of gesimuleerd;
 *  - development/demo/test: het bericht gaat naar een lokale dev-mailbox
 *    (.dev-mailbox/mail.jsonl, gitignored) zodat je lokaal kunt inloggen.
 *    Nooit naar de serverlog: inloglinks horen niet in logs.
 */
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { devMailToConsole, emailConfigured } from '../config'

export type EmailResult = { status: 'sent' | 'dev_mailbox' | 'not_configured' | 'failed'; error?: string }

export async function sendEmail(msg: { to: string; subject: string; text: string }): Promise<EmailResult> {
  if (!emailConfigured()) {
    if (devMailToConsole()) {
      const dir = join(process.cwd(), '.dev-mailbox')
      mkdirSync(dir, { recursive: true })
      appendFileSync(join(dir, 'mail.jsonl'), JSON.stringify({ ...msg, at: new Date().toISOString() }) + '\n')
      return { status: 'dev_mailbox' }
    }
    return { status: 'not_configured' }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [msg.to], subject: msg.subject, text: msg.text }),
    })
    if (!res.ok) return { status: 'failed', error: `http_${res.status}` }
    return { status: 'sent' }
  } catch (e) {
    return { status: 'failed', error: e instanceof Error ? e.name : 'network_error' }
  }
}
