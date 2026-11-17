'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/lib/auth/session'
import type { Actor } from '@/lib/actor'
import * as R from '@/lib/domain/requests'
import * as P from '@/lib/domain/proposals'
import * as B from '@/lib/domain/bookings'
import * as S from '@/lib/domain/suppliers'
import * as W from '@/lib/domain/work'
import * as SO from '@/lib/domain/society'
import * as A from '@/lib/domain/applications'
import * as M from '@/lib/domain/memberships'
import * as BI from '@/lib/domain/billing'
import * as MB from '@/lib/domain/members'
import { createTeamInvitation } from '@/lib/domain/invitations'
import { updateSetting, type SettingKey } from '@/lib/domain/settings'
import { parseEuroInput } from '@/lib/money'
import { zonedToUtc } from '@/lib/time'
import { errorState, str, type FormState } from './state'
import { fail } from '@/lib/errors'

async function staff(): Promise<Actor> {
  const a = await getActor()
  if (!a.staffVerified) redirect('/login')
  return a
}

function done(path: string, message?: string): FormState {
  revalidatePath(path)
  return { ok: true, message }
}

async function run(path: string, fn: (a: Actor) => Promise<unknown>, message?: string): Promise<FormState> {
  const a = await staff()
  try { await fn(a) } catch (e) { return errorState(e) }
  return done(path, message)
}

const reqPath = (fd: FormData) => `/ops/requests/${str(fd, 'requestId')}`
/** 'YYYY-MM-DDTHH:mm' uit een datetime-local veld, geïnterpreteerd in Europe/Amsterdam. */
function localDateTime(v: string): Date {
  const [d, t] = v.split('T')
  return zonedToUtc(d ?? '', (t ?? '').slice(0, 5))
}

// ------------------------------------------------------------------ verzoeken

export async function assignAction(fd: FormData) { return run(reqPath(fd), (a) => R.assignOwner(a, str(fd, 'requestId'), str(fd, 'ownerId'), str(fd, 'note')), 'Eigenaar bijgewerkt.') }
export async function statusAction(fd: FormData) { return run(reqPath(fd), (a) => R.setRequestStatus(a, str(fd, 'requestId'), { status: str(fd, 'status'), note: str(fd, 'note'), waitingOn: str(fd, 'waitingOn') }), 'Status bijgewerkt.') }
export async function nextActionAction(fd: FormData) {
  return run(reqPath(fd), (a) => R.setNextAction(a, str(fd, 'requestId'), {
    nextAction: str(fd, 'nextAction'), dueAt: localDateTime(str(fd, 'dueAt')), urgency: str(fd, 'urgency') || 'normal', waitingOn: str(fd, 'waitingOn'),
    title: str(fd, 'title'), category: str(fd, 'category'),
  }), 'Volgende actie opgeslagen.')
}
export async function issueFlagAction(fd: FormData) { return run(reqPath(fd), (a) => R.setIssue(a, str(fd, 'requestId'), str(fd, 'hasIssue') === 'true', str(fd, 'note'))) }
export async function staffMessageAction(fd: FormData) {
  const channel = (str(fd, 'channel') || 'portal') as 'portal' | 'whatsapp_manual' | 'phone_note' | 'email'
  const r = await run(reqPath(fd), (a) => R.addStaffMessage(a, str(fd, 'requestId'), str(fd, 'body'), channel, str(fd, 'idempotencyKey')))
  return r?.ok ? { ok: true, message: channel === 'portal' ? 'Bericht geplaatst in het portaal van het lid.' : 'Gesprek vastgelegd in het dossier (niet verzonden).' } : r
}
export async function noteAction(fd: FormData) {
  const target = { requestId: str(fd, 'requestId') || undefined, memberId: str(fd, 'memberId') || undefined, applicationId: str(fd, 'applicationId') || undefined, supplierId: str(fd, 'supplierId') || undefined }
  return run(str(fd, 'path') || '/ops', (a) => R.addInternalNote(a, target, str(fd, 'body')))
}
export async function createForMemberAction(fd: FormData): Promise<FormState> {
  const a = await staff()
  let id: string
  try {
    const r = await R.createRequestForMember(a, str(fd, 'memberId'), {
      brief: str(fd, 'brief'), category: str(fd, 'category'), desiredDate: str(fd, 'desiredDate'), desiredTime: str(fd, 'desiredTime'), location: str(fd, 'location'),
      partySize: str(fd, 'partySize'), budget: str(fd, 'budget'), budgetBasis: str(fd, 'budgetBasis'), idempotencyKey: str(fd, 'idempotencyKey'),
    }, (str(fd, 'channel') || 'whatsapp_manual') as 'whatsapp_manual' | 'phone_note' | 'email')
    id = r.id
  } catch (e) { return errorState(e) }
  redirect(`/ops/requests/${id}`)
}

// ------------------------------------------------------------------ voorstel

export async function draftProposalAction(fd: FormData) { return run(reqPath(fd), (a) => P.createDraftProposal(a, str(fd, 'requestId'), str(fd, 'intro'))) }
export async function optionAction(fd: FormData) {
  return run(reqPath(fd), (a) => P.upsertOption(a, str(fd, 'proposalId'), {
    position: str(fd, 'position'), label: str(fd, 'label'), description: str(fd, 'description'), supplierId: str(fd, 'supplierId'), supplierName: str(fd, 'supplierName'),
    included: str(fd, 'included'), excluded: str(fd, 'excluded'), priceKind: str(fd, 'priceKind'), total: str(fd, 'total'), max: str(fd, 'max'), taxNote: str(fd, 'taxNote'),
    paymentRoute: str(fd, 'paymentRoute'), cancellationTerms: str(fd, 'cancellationTerms'), availabilityStatus: str(fd, 'availabilityStatus'), availabilityCheckId: str(fd, 'availabilityCheckId'),
  }), 'Optie opgeslagen.')
}
export async function removeOptionAction(fd: FormData) { return run(reqPath(fd), (a) => P.removeOption(a, str(fd, 'proposalId'), Number(str(fd, 'position')))) }
export async function issueProposalAction(fd: FormData) { return run(reqPath(fd), (a) => P.issueProposal(a, str(fd, 'proposalId'), localDateTime(str(fd, 'expiresAt')), str(fd, 'intro')), 'Voorstel uitgegeven aan het lid.') }
export async function withdrawProposalAction(fd: FormData) { return run(reqPath(fd), (a) => P.withdrawProposal(a, str(fd, 'proposalId'))) }

// ------------------------------------------------------------------ boekingen

export async function addBookingAction(fd: FormData) {
  return run(reqPath(fd), (a) => B.addBooking(a, str(fd, 'requestId'), {
    title: str(fd, 'title'), supplierId: str(fd, 'supplierId'), supplierName: str(fd, 'supplierName'), required: fd.get('required') === 'on',
    date: str(fd, 'date'), time: str(fd, 'time'), price: str(fd, 'price'), terms: str(fd, 'terms'),
  }), 'Onderdeel toegevoegd.')
}
export async function bookingRequestedAction(fd: FormData) { return run(reqPath(fd), (a) => B.setBookingRequested(a, str(fd, 'bookingId'))) }
export async function confirmBookingAction(fd: FormData) {
  return run(reqPath(fd), (a) => B.confirmBooking(a, str(fd, 'bookingId'), {
    supplierReference: str(fd, 'supplierReference'), confirmationNote: str(fd, 'confirmationNote'), confirmationSource: str(fd, 'confirmationSource'),
    checkedAt: localDateTime(str(fd, 'checkedAt')), memberDetails: str(fd, 'memberDetails'), emergencyContact: str(fd, 'emergencyContact'),
  }), 'Onderdeel bevestigd met bewijs.')
}
export async function bookingFailedAction(fd: FormData) { return run(reqPath(fd), (a) => B.markBookingFailed(a, str(fd, 'bookingId'), str(fd, 'note'))) }
export async function confirmCancellationAction(fd: FormData) { return run(reqPath(fd), (a) => B.confirmCancellation(a, str(fd, 'bookingId'), str(fd, 'evidence')), 'Annulering vastgelegd.') }

// ------------------------------------------------------------------ werk

export async function availabilityAction(fd: FormData) {
  return run(reqPath(fd), (a) => S.recordAvailabilityCheck(a, str(fd, 'requestId'), {
    supplierId: str(fd, 'supplierId'), source: str(fd, 'source'), checkedAt: localDateTime(str(fd, 'checkedAt')),
    validUntil: str(fd, 'validUntil') ? localDateTime(str(fd, 'validUntil')) : '', result: str(fd, 'result'), details: str(fd, 'details'),
  }), 'Beschikbaarheidscheck vastgelegd.')
}
export async function taskAction(fd: FormData) {
  return run(str(fd, 'path') || '/ops', (a) => W.createTask(a, {
    title: str(fd, 'title'), type: str(fd, 'type') || 'other', dueAt: str(fd, 'dueAt') ? localDateTime(str(fd, 'dueAt')) : '', assignedTo: str(fd, 'assignedTo'),
    requestId: str(fd, 'requestId') || undefined, memberId: str(fd, 'memberId') || undefined,
  }))
}
export async function taskStatusAction(fd: FormData) { return run(str(fd, 'path') || '/ops', (a) => W.setTaskStatus(a, str(fd, 'taskId'), (str(fd, 'status') || 'done') as 'open' | 'done' | 'cancelled')) }
export async function timeAction(fd: FormData) {
  return run(str(fd, 'path') || '/ops', (a) => W.addTime(a, { requestId: str(fd, 'requestId') || undefined, memberId: str(fd, 'memberId') || undefined }, { minutes: str(fd, 'minutes'), activity: str(fd, 'activity'), note: str(fd, 'note') }), 'Tijd geregistreerd.')
}
export async function startTimerAction(fd: FormData) { return run(reqPath(fd), (a) => W.startTimer(a, str(fd, 'requestId'), str(fd, 'activity'))) }
export async function stopTimerAction(fd: FormData) { return run(str(fd, 'path') || '/ops', (a) => W.stopTimer(a)) }

// ------------------------------------------------------------------ leveranciers

export async function saveSupplierAction(fd: FormData): Promise<FormState> {
  const a = await staff()
  const id = str(fd, 'id') || null
  let saved: { id: string }
  try {
    saved = await S.saveSupplier(a, id, {
      name: str(fd, 'name'), category: str(fd, 'category'), region: str(fd, 'region'), contactName: str(fd, 'contactName'), email: str(fd, 'email'), phone: str(fd, 'phone'),
      website: str(fd, 'website'), reachability: str(fd, 'reachability'), serviceLevel: str(fd, 'serviceLevel'), bookingMethod: str(fd, 'bookingMethod'), emergencyContact: str(fd, 'emergencyContact'),
    })
  } catch (e) { return errorState(e) }
  if (!id) redirect(`/ops/suppliers/${saved.id}`)
  return done(`/ops/suppliers/${saved.id}`, 'Opgeslagen.')
}
export async function supplierVerificationAction(fd: FormData) { return run(`/ops/suppliers/${str(fd, 'id')}`, (a) => S.setSupplierVerification(a, str(fd, 'id'), str(fd, 'status') as 'verified', str(fd, 'note'))) }
export async function supplierTermsAction(fd: FormData) {
  return run(`/ops/suppliers/${str(fd, 'id')}`, (a) => S.addSupplierTerms(a, str(fd, 'id'), { validFrom: str(fd, 'validFrom'), validUntil: str(fd, 'validUntil'), agreement: str(fd, 'agreement'), commissionBasis: str(fd, 'commissionBasis'), commissionPercent: str(fd, 'commissionPercent') }), 'Afspraak vastgelegd.')
}
export async function supplierContactAction(fd: FormData) { return run(`/ops/suppliers/${str(fd, 'id')}`, (a) => S.logSupplierContact(a, str(fd, 'id'), { channel: str(fd, 'channel'), summary: str(fd, 'summary') })) }

// ------------------------------------------------------------------ society

export async function saveEventAction(fd: FormData): Promise<FormState> {
  const a = await staff()
  const id = str(fd, 'id') || null
  let saved: { id: string }
  try {
    saved = await SO.saveEvent(a, id, {
      title: str(fd, 'title'), summary: str(fd, 'summary'), description: str(fd, 'description'), location: str(fd, 'location'), date: str(fd, 'date'), time: str(fd, 'time'),
      capacity: str(fd, 'capacity'), price: str(fd, 'price'), priceNote: str(fd, 'priceNote'), publicTeaser: fd.get('publicTeaser') === 'on',
    })
  } catch (e) { return errorState(e) }
  if (!id) redirect(`/ops/society/${saved.id}`)
  return done(`/ops/society/${saved.id}`, 'Opgeslagen.')
}
const evPath = (fd: FormData) => `/ops/society/${str(fd, 'eventId')}`
export async function eventStatusAction(fd: FormData) { return run(evPath(fd), (a) => SO.setEventStatus(a, str(fd, 'eventId'), str(fd, 'status') as 'open')) }
export async function inviteMembersAction(fd: FormData) { return run(evPath(fd), (a) => SO.inviteMembers(a, str(fd, 'eventId'), fd.getAll('memberIds').map(String)), 'Uitnodigingen bijgewerkt.') }
export async function offerPlaceAction(fd: FormData) { return run(evPath(fd), (a) => SO.offerPlace(a, str(fd, 'participationId'), { offerText: str(fd, 'offerText'), price: str(fd, 'price'), paymentRequired: fd.get('paymentRequired') === 'on' })) }
export async function participationStatusAction(fd: FormData) { return run(evPath(fd), (a) => SO.setParticipationStatus(a, str(fd, 'participationId'), str(fd, 'status') as 'waitlisted')) }
export async function confirmPlaceAction(fd: FormData) { return run(evPath(fd), (a) => SO.confirmPlace(a, str(fd, 'participationId')), 'Plek bevestigd.') }
export async function linkParticipationBillingAction(fd: FormData) { return run(evPath(fd), (a) => SO.linkParticipationBilling(a, str(fd, 'participationId'), str(fd, 'billingId'))) }

// ------------------------------------------------------------------ aanmeldingen & lidmaatschap

const appPath = (fd: FormData) => `/ops/applications/${str(fd, 'applicationId')}`
export async function applicationStatusAction(fd: FormData) { return run(appPath(fd), (a) => A.setApplicationStatus(a, str(fd, 'applicationId'), str(fd, 'status'))) }
export async function issueOfferAction(fd: FormData) {
  const price = str(fd, 'price')
  return run(appPath(fd), async (a) => {
    const priceMinor = price ? parseEuroInput(price) : undefined
    if (price && priceMinor == null) fail('invalid_input', 'Prijs niet herkend.')
    return M.issueMembershipOffer(a, str(fd, 'applicationId'), { priceMinor: priceMinor ?? undefined, scopeText: str(fd, 'scopeText') || undefined, validDays: str(fd, 'validDays') ? Number(str(fd, 'validDays')) : undefined })
  }, 'Aanbod uitgegeven. De kandidaat ziet het na inloggen.')
}
export async function activateAction(fd: FormData): Promise<FormState> {
  const a = await staff()
  try { await M.activateMembership(a, str(fd, 'membershipId'), { complimentary: fd.get('complimentary') === 'on' }) } catch (e) { return errorState(e) }
  // De rij verdwijnt uit "wacht op activatie"; de pagina toont recente activaties bovenaan.
  return done('/ops/billing', 'Lidmaatschap geactiveerd.')
}
export async function membershipChangeAction(fd: FormData) {
  return run(`/ops/members/${str(fd, 'userId')}`, (a) => M.changeMembershipStatus(a, str(fd, 'membershipId'), str(fd, 'change') as 'suspend', { reason: str(fd, 'reason'), endsOn: str(fd, 'endsOn') || undefined }), 'Lidmaatschap bijgewerkt.')
}

// ------------------------------------------------------------------ facturatie (admin)

export async function billingAction(fd: FormData) {
  return run('/ops/billing', async (a) => {
    const amount = parseEuroInput(str(fd, 'amount'))
    if (amount == null) fail('invalid_input', 'Bedrag niet herkend.')
    return BI.createBillingRecord(a, {
      memberId: str(fd, 'memberId'), kind: str(fd, 'kind'), membershipId: str(fd, 'membershipId') || undefined, description: str(fd, 'description'),
      amountMinor: amount, amountIncludesTax: str(fd, 'includesTax') === 'true', taxRateBp: Math.round(Number(str(fd, 'taxRate').replace(',', '.')) * 100),
      societyEventId: str(fd, 'societyEventId') || undefined,
    })
  }, 'Factuurrecord aangemaakt.')
}
export async function paymentAction(fd: FormData) {
  return run('/ops/billing', async (a) => {
    const amount = parseEuroInput(str(fd, 'amount'))
    if (amount == null) fail('invalid_input', 'Bedrag niet herkend.')
    return BI.registerPayment(a, {
      billingId: str(fd, 'billingId'), kind: str(fd, 'kind'), amountMinor: amount, method: str(fd, 'method'), reference: str(fd, 'reference'),
      evidenceRef: str(fd, 'evidenceRef'), correctsPaymentId: str(fd, 'correctsPaymentId') || undefined, note: str(fd, 'note'), occurredAt: localDateTime(str(fd, 'occurredAt')),
    })
  }, 'Geregistreerd.')
}
export async function voidBillingAction(fd: FormData) { return run('/ops/billing', (a) => BI.voidBillingRecord(a, str(fd, 'billingId'), str(fd, 'reason'))) }

// ------------------------------------------------------------------ instellingen (admin)

function settingValue(key: SettingKey, fd: FormData): unknown {
  const on = (k: string) => fd.get(k) === 'on'
  const num = (k: string) => Number(str(fd, k))
  switch (key) {
    case 'company': return { tradeName: str(fd, 'tradeName') || 'James & Co.', legalName: str(fd, 'legalName'), kvk: str(fd, 'kvk'), vat: str(fd, 'vat'), address: str(fd, 'address'), email: str(fd, 'email'), phone: str(fd, 'phone'), published: on('published') }
    case 'serviceHours': return { enabled: on('enabled'), description: str(fd, 'description'), responseTime: str(fd, 'responseTime') }
    case 'whatsapp': return { enabled: on('enabled'), number: str(fd, 'number').replace(/\s/g, '') }
    case 'membershipPlan': {
      const price = parseEuroInput(str(fd, 'price'))
      if (price == null) fail('invalid_input', 'Prijs niet herkend.')
      return { priceMinor: price, currency: 'EUR', taxRateBp: Math.round(Number(str(fd, 'taxRate').replace(',', '.')) * 100), includesTax: on('includesTax'), billingPeriod: str(fd, 'billingPeriod'), scopeText: str(fd, 'scopeText'), termsVersion: str(fd, 'termsVersion'), termsText: str(fd, 'termsText'), offerValidDays: num('offerValidDays') }
    }
    case 'capacity': return { maxActiveMembers: num('maxActiveMembers') }
    case 'invitations': return { maxOpenPerMember: num('maxOpenPerMember'), validDays: num('validDays') }
  }
}

export async function settingAction(fd: FormData) {
  const key = str(fd, 'key') as SettingKey
  return run('/ops/settings', (a) => updateSetting(a, key, settingValue(key, fd)), 'Instelling opgeslagen.')
}
export async function staffUpsertAction(fd: FormData) {
  return run('/ops/settings', (a) => MB.upsertStaff(a, { email: str(fd, 'email'), fullName: str(fd, 'fullName'), role: str(fd, 'role') as 'admin', active: str(fd, 'active') !== 'false' }), 'Team bijgewerkt.')
}
export async function teamInvitationAction(): Promise<FormState> {
  const a = await staff()
  try { const inv = await createTeamInvitation(a); return { ok: true, data: { url: inv.url } } } catch (e) { return errorState(e) }
}
