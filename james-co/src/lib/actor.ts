/** Wie voert een handeling uit. Wordt server-side uit de sessie afgeleid, nooit uit de client. */
export type Actor = {
  userId: string | null
  /** Alleen true voor een actieve staffrol met een (indien vereist) MFA-geverifieerde sessie. */
  staffVerified: boolean
  staffRole: 'admin' | 'concierge' | null
}

export const ANONYMOUS: Actor = { userId: null, staffVerified: false, staffRole: null }

export function memberActor(userId: string): Actor {
  return { userId, staffVerified: false, staffRole: null }
}

export function staffActor(userId: string, role: 'admin' | 'concierge'): Actor {
  return { userId, staffVerified: true, staffRole: role }
}

export function actorType(a: Actor): 'member' | 'staff' | 'anonymous' {
  if (!a.userId) return 'anonymous'
  return a.staffVerified ? 'staff' : 'member'
}
