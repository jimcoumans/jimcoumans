'use client'

import { useState, useTransition } from 'react'
import { teamInvitationAction } from '@/app/actions/staff'

export function TeamInvite() {
  const [url, setUrl] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return url ? (
    <div className="rounded-xl bg-forest-soft p-4"><p className="text-sm">Eenmalig zichtbaar. Deel deze link zelf:</p><input readOnly className="field mt-2 font-mono text-[13px]" value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Uitnodigingslink" /></div>
  ) : (
    <div>
      <button type="button" className="btn-secondary" disabled={pending} onClick={() => start(async () => { try { const r = await teamInvitationAction(); if (r?.data?.url) setUrl(r.data.url); else setErr(r?.error ?? 'Mislukt') } catch { setErr('Verbinding mislukt') } })}>{pending ? 'Aanmaken…' : 'Uitnodiging namens het team maken'}</button>
      {err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}
    </div>
  )
}
