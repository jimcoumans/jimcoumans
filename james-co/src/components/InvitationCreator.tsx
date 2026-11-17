'use client'

import { useState, useTransition } from 'react'
import { createInvitationAction } from '@/app/actions/member'

/** De ruwe link wordt alleen hier, direct na aanmaken, getoond. Kwijt = intrekken en een nieuwe maken. */
export function InvitationCreator({ defaultName }: { defaultName: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, start] = useTransition()
  if (url) {
    return (
      <div className="rounded-xl bg-forest-soft p-4">
        <p className="text-[15px] font-medium">Uw persoonlijke link</p>
        <p className="mt-1 text-sm text-muted">Deel hem zelf met iemand die u kent. Deze link wordt maar één keer getoond.</p>
        <input readOnly value={url} className="field mt-3 font-mono text-[13px]" onFocus={(e) => e.currentTarget.select()} aria-label="Uitnodigingslink" />
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-primary" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true) } catch { setCopied(false) } }}>{copied ? 'Gekopieerd' : 'Kopiëren'}</button>
          <button type="button" className="btn-quiet" onClick={() => { setUrl(null); setCopied(false) }}>Klaar</button>
        </div>
      </div>
    )
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(async () => { try { const r = await createInvitationAction(fd); if (r?.data?.url) { setUrl(r.data.url); setError(null) } else setError(r?.error ?? 'Er ging iets mis.') } catch { setError('De verbinding is mislukt. Probeer het opnieuw.') } }) }}>
      <fieldset disabled={pending}>
        <label className="label" htmlFor="displayName">Naam die de ontvanger mag zien</label>
        <input className="field" id="displayName" name="displayName" defaultValue={defaultName} maxLength={60} />
        <label className="mt-3 flex items-start gap-3 text-[15px]"><input type="checkbox" name="revealConsent" className="mt-0.5 h-5 w-5 accent-forest" />
          <span>Iedereen die deze link heeft en op &ldquo;Wie heeft mij uitgenodigd?&rdquo; klikt, mag deze naam zien.</span></label>
        <p className="hint">Zonder vinkje blijft uw naam verborgen. De link is overdraagbaar en verloopt na 30 dagen.</p>
        {error && <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-primary mt-4">{pending ? 'Aanmaken…' : 'Link aanmaken'}</button>
      </fieldset>
    </form>
  )
}
