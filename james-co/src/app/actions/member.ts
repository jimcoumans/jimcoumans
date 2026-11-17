'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/lib/auth/session'
import { createRequest, addMemberMessage, submitFeedback } from '@/lib/domain/requests'
import { approveProposal } from '@/lib/domain/proposals'
import { requestCancellation } from '@/lib/domain/bookings'
import { acceptMembershipOffer, declineMembershipOffer, requestMembershipEnd } from '@/lib/domain/memberships'
import { createMemberInvitation, revokeInvitation } from '@/lib/domain/invitations'
import { registerInterest, withdrawParticipation, acceptPlaceOffer } from '@/lib/domain/society'
import { saveMyPreferences, saveMyProfile, recordConsent, saveSensitivePreferences } from '@/lib/domain/members'
import { errorState, str, type FormState } from './state'

async function actor() {
  const a = await getActor()
  if (!a.userId) redirect('/login')
  return a
}

export async function createRequestAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  let id: string
  try {
    const r = await createRequest(a, {
      brief: str(fd, 'brief'), category: str(fd, 'category'), desiredDate: str(fd, 'desiredDate'), desiredTime: str(fd, 'desiredTime'),
      location: str(fd, 'location'), partySize: str(fd, 'partySize'), budget: str(fd, 'budget'), budgetBasis: str(fd, 'budgetBasis'),
      flexibility: str(fd, 'flexibility'), idempotencyKey: str(fd, 'idempotencyKey'),
    })
    id = r.id
  } catch (e) { return errorState(e) }
  redirect(`/app/requests/${id}?nieuw=1`)
}

export async function memberMessageAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  const id = str(fd, 'requestId')
  try { await addMemberMessage(a, id, str(fd, 'body'), str(fd, 'idempotencyKey')) } catch (e) { return errorState(e) }
  revalidatePath(`/app/requests/${id}`)
  return { ok: true }
}

export async function approveAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  const requestId = str(fd, 'requestId')
  try {
    await approveProposal(a, { proposalId: str(fd, 'proposalId'), optionId: str(fd, 'optionId'), snapshotHash: str(fd, 'snapshotHash'), termsAccepted: fd.get('terms') === 'on' })
  } catch (e) { return errorState(e) }
  revalidatePath(`/app/requests/${requestId}`)
  return { ok: true, message: 'Dank u. Uw akkoord is vastgelegd. We regelen het nu en bevestigen zodra de leverancier heeft bevestigd.' }
}

export async function cancelBookingAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  try { await requestCancellation(a, str(fd, 'bookingId')) } catch (e) { return errorState(e) }
  revalidatePath(`/app/requests/${str(fd, 'requestId')}`)
  return { ok: true, message: 'Annuleringsverzoek ontvangen. Dit is nog geen bevestigde annulering.' }
}

export async function feedbackAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  try { await submitFeedback(a, str(fd, 'requestId'), Number(str(fd, 'rating')), str(fd, 'text')) } catch (e) { return errorState(e) }
  revalidatePath(`/app/requests/${str(fd, 'requestId')}`)
  return { ok: true, message: 'Dank voor uw feedback.' }
}

export async function acceptOfferAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  if (fd.get('terms') !== 'on') return { error: 'Accepteer de inhoud, prijs en voorwaarden om verder te gaan.' }
  try { await acceptMembershipOffer(a, str(fd, 'offerId'), str(fd, 'snapshotHash')) } catch (e) { return errorState(e) }
  revalidatePath('/onboarding')
  return { ok: true }
}

export async function declineOfferAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  try { await declineMembershipOffer(a, str(fd, 'offerId')) } catch (e) { return errorState(e) }
  revalidatePath('/onboarding')
  return { ok: true }
}

export async function requestEndAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  try { await requestMembershipEnd(a, str(fd, 'note')) } catch (e) { return errorState(e) }
  return { ok: true, message: 'Uw verzoek is ontvangen. We nemen contact op over de afronding.' }
}

export async function createInvitationAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  try {
    const inv = await createMemberInvitation(a, { displayName: str(fd, 'displayName'), revealConsent: fd.get('revealConsent') === 'on' })
    revalidatePath('/app/invitations')
    return { ok: true, data: { url: inv.url } }
  } catch (e) { return errorState(e) }
}

export async function revokeInvitationAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  try { await revokeInvitation(a, str(fd, 'id')) } catch (e) { return errorState(e) }
  revalidatePath('/app/invitations')
  return { ok: true }
}

export async function societyInterestAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  const id = str(fd, 'eventId')
  try { await registerInterest(a, id, Number(str(fd, 'partySize') || '1'), str(fd, 'note')) } catch (e) { return errorState(e) }
  revalidatePath(`/app/society/${id}`)
  return { ok: true, message: 'Uw interesse is genoteerd. Dit is nog geen gereserveerde plek; we nemen contact op.' }
}

export async function societyWithdrawAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  const id = str(fd, 'eventId')
  try { await withdrawParticipation(a, id) } catch (e) { return errorState(e) }
  revalidatePath(`/app/society/${id}`)
  return { ok: true }
}

export async function societyAcceptAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  const id = str(fd, 'eventId')
  if (fd.get('terms') !== 'on') return { error: 'Accepteer het aanbod en de voorwaarden.' }
  try { await acceptPlaceOffer(a, id) } catch (e) { return errorState(e) }
  revalidatePath(`/app/society/${id}`)
  return { ok: true, message: 'Dank u. We bevestigen uw plek zodra alles rond is.' }
}

export async function preferencesAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  try {
    await saveMyPreferences(a, {
      language: str(fd, 'language'), homeRegion: str(fd, 'homeRegion'), travelRadiusKm: str(fd, 'travelRadiusKm'), budgetBand: str(fd, 'budgetBand'),
      preferredTimes: str(fd, 'preferredTimes'), favoriteCategories: fd.getAll('favoriteCategories').map(String), communicationPreference: str(fd, 'communicationPreference'),
      notes: str(fd, 'notes'),
    })
  } catch (e) { return errorState(e) }
  revalidatePath('/app/profile')
  return { ok: true, message: 'Voorkeuren opgeslagen.' }
}

export async function profileAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  try { await saveMyProfile(a, { fullName: str(fd, 'fullName'), displayName: str(fd, 'displayName'), phone: str(fd, 'phone'), preferredContact: str(fd, 'preferredContact') || 'email' }) } catch (e) { return errorState(e) }
  revalidatePath('/app/profile')
  revalidatePath('/onboarding')
  return { ok: true, message: 'Gegevens opgeslagen.' }
}

export async function consentAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  const purpose = str(fd, 'purpose') as 'service_whatsapp' | 'marketing_email' | 'marketing_whatsapp' | 'sensitive_preferences'
  if (!['service_whatsapp', 'marketing_email', 'marketing_whatsapp', 'sensitive_preferences'].includes(purpose)) return { error: 'Onbekend doel.' }
  try { await recordConsent(a, purpose, str(fd, 'granted') === 'true') } catch (e) { return errorState(e) }
  revalidatePath('/app/profile')
  return { ok: true }
}

export async function sensitiveAction(fd: FormData): Promise<FormState> {
  const a = await actor()
  try { await saveSensitivePreferences(a, { dietary: str(fd, 'dietary'), allergies: str(fd, 'allergies') }) } catch (e) { return errorState(e) }
  revalidatePath('/app/profile')
  return { ok: true, message: 'Opgeslagen.' }
}
