import type { Tx } from '../db-core'
import { actorType, type Actor } from '../actor'

const REDACT = new Set(['tokenHash', 'token_hash', 'secretBase32', 'body', 'brief', 'dietary', 'allergies', 'phone', 'email'])

/** Laat gevoelige velden weg uit audit-snapshots. */
export function redact(obj: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!obj) return null
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) out[k] = REDACT.has(k) ? '[redacted]' : v
  return out
}

export async function audit(
  tx: Tx,
  actor: Actor | null,
  action: string,
  entityType: string,
  entityId: string | null,
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
): Promise<void> {
  const type = actor ? actorType(actor) : 'system'
  await tx`
    insert into audit_events (actor_id, actor_type, action, entity_type, entity_id, before, after)
    values (${actor?.userId ?? null}, ${type}, ${action}, ${entityType}, ${entityId},
            ${before ? tx.json(redact(before) as never) : null}, ${after ? tx.json(redact(after) as never) : null})`
}
