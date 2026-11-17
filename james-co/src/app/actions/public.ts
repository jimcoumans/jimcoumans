'use server'

import { redirect } from 'next/navigation'
import { submitApplication } from '@/lib/domain/applications'
import { revealInviter } from '@/lib/domain/invitations'
import { clientKey } from '@/lib/auth/session'
import { str, type FormState } from './state'

export async function applyAction(fd: FormData): Promise<FormState> {
  const lang = str(fd, 'language') === 'en' ? 'en' : 'nl'
  const partySize = str(fd, 'partySize')
  const res = await submitApplication({
    fullName: str(fd, 'fullName'), email: str(fd, 'email'), region: str(fd, 'region'), preferredContact: str(fd, 'preferredContact') || 'email',
    phone: str(fd, 'phone'), helpRequest: str(fd, 'helpRequest'), source: str(fd, 'source'), segment: str(fd, 'segment') || 'nl_member',
    language: lang, visitStart: str(fd, 'visitStart'), visitEnd: str(fd, 'visitEnd'), partySize: partySize ? Number(partySize) : undefined,
    privacyAck: fd.get('privacyAck') === 'on', idempotencyKey: str(fd, 'idempotencyKey'), invitationToken: str(fd, 'invitationToken'),
  }, await clientKey())
  if (!res.ok) {
    if (res.reason === 'rate_limited') return { error: lang === 'en' ? 'Too many attempts. Please try again later.' : 'Te veel pogingen. Probeer het later opnieuw.' }
    const field = res.field === 'privacyAck' ? (lang === 'en' ? 'Please confirm you have read the privacy statement.' : 'Bevestig dat u de privacyverklaring heeft gelezen.')
      : lang === 'en' ? 'Please check your details (name, email and your request are required).' : 'Controleer uw gegevens (naam, e-mail en uw hulpvraag zijn verplicht).'
    return { error: field }
  }
  redirect(lang === 'en' ? '/apply/sent?lang=en' : '/apply/sent')
}

export async function revealAction(fd: FormData): Promise<FormState> {
  const r = await revealInviter(str(fd, 'token'), await clientKey())
  if (!r.ok) return { error: r.reason === 'rate_limited' ? 'Te veel pogingen. Probeer het later opnieuw.' : 'Deze uitnodiging is niet (meer) geldig.' }
  if (r.team) return { ok: true, message: 'U bent uitgenodigd door James & Co.' }
  if (!r.name) return { ok: true, message: 'De verwijzer heeft er niet voor gekozen een naam te tonen. U kunt ons altijd vragen naar de herkomst van deze uitnodiging.' }
  return { ok: true, message: `U bent uitgenodigd door ${r.name}.` }
}
