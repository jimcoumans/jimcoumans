import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getMfaSecret } from '@/lib/auth/core'
import { otpauthUri } from '@/lib/auth/totp'
import { staffMfaRequired } from '@/lib/config'
import { ActionForm } from '@/components/ActionForm'
import { Wordmark } from '@/components/Brand'
import { startMfaAction, verifyMfaAction, logoutAction } from '@/app/actions/auth'

export const metadata: Metadata = { title: 'Tweestapsverificatie', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function Mfa() {
  const s = await getSession()
  if (!s) redirect('/login')
  if (!s.staffRole) redirect('/app')
  if (!staffMfaRequired() || s.mfaVerified) redirect('/ops')
  const mfa = await getMfaSecret(s.userId)
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <Wordmark />
      <h1 className="mt-10 text-[36px] leading-tight">Tweestapsverificatie</h1>
      <p className="mt-2 text-[15px] text-muted">Verplicht voor medewerkers. Gebruik een authenticator-app (bijvoorbeeld 1Password, Google Authenticator of Microsoft Authenticator).</p>
      <div className="card mt-6">
        {!mfa ? (
          <ActionForm action={startMfaAction} submitLabel="Instellen">
            <p className="text-[15px]">U heeft nog geen tweestapsverificatie ingesteld.</p>
          </ActionForm>
        ) : (
          <>
            {!mfa.enabled && (
              <div className="mb-5">
                <p className="text-[15px]">Voeg deze sleutel toe aan uw authenticator-app:</p>
                <p className="mt-2 break-all rounded-lg bg-canvas p-3 font-mono text-[14px] tracking-wider" data-testid="totp-secret">{mfa.secret}</p>
                <details className="mt-2 text-[13px] text-muted"><summary className="cursor-pointer">Als link (otpauth)</summary><p className="mt-1 break-all font-mono">{otpauthUri(mfa.secret, s.email)}</p></details>
              </div>
            )}
            <ActionForm action={verifyMfaAction} submitLabel="Bevestigen" pendingLabel="Controleren…">
              <label className="label" htmlFor="code">Code van 6 cijfers</label>
              <input className="field max-w-[180px] text-center font-mono text-[20px] tracking-[0.3em]" id="code" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required />
            </ActionForm>
          </>
        )}
      </div>
      <form action={logoutAction} className="mt-6"><button className="btn-quiet text-sm">Uitloggen</button></form>
    </div>
  )
}
