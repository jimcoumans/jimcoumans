import type { Metadata } from 'next'
import { ActionForm } from '@/components/ActionForm'
import { loginAction } from '@/app/actions/auth'
import { devMailToConsole } from '@/lib/config'

export const metadata: Metadata = { title: 'Ledenlogin', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default function Login() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
      <h1 className="text-[42px] leading-tight">Ledenlogin</h1>
      <p className="mt-3 text-[15px] text-muted">U ontvangt een eenmalige inloglink per e-mail. Geen wachtwoord nodig.</p>
      <div className="card mt-8">
        <ActionForm action={loginAction} submitLabel="Stuur inloglink" pendingLabel="Versturen…">
          <label className="label" htmlFor="email">E-mailadres</label>
          <input className="field" id="email" name="email" type="email" required autoComplete="email" />
        </ActionForm>
      </div>
      {devMailToConsole() && <p className="mt-4 text-[13px] text-muted">Lokaal/demo: e-mail is niet ingericht; berichten staan in <code>.dev-mailbox/mail.jsonl</code>.</p>}
    </div>
  )
}
