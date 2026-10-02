import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { campaigns, campaignTimeline, users } from '@/db/schema'
import { ClickUpClient } from './client'
import type { CampagneVolledig } from '../campagnes'

/* -------------------------------------------------------------------------
   Een goedgekeurde briefing naar ClickUp.

   Eén taak met de campagnenaam, en per regel uit de tijdlijn een subtaak met
   de verantwoordelijke en de deadline. Collega's zoeken we op e-mailadres op
   in ClickUp, zodat er geen tweede lijst met ClickUp-id's bij te houden is.

   De lijst waarin de taken komen staat in CLICKUP_LIST_CAMPAGNES. Staat die
   er niet, of geen token, dan doen we niets en zeggen we dat: een akkoord
   mag niet mislukken omdat ClickUp niet is ingesteld.
   ------------------------------------------------------------------------- */

export type ClickUpUitkomst =
  | { gedaan: true; taakId: string; subtaken: number; url?: string }
  | { gedaan: false; reden: string }

export async function zetCampagneInClickUp(v: CampagneVolledig): Promise<ClickUpUitkomst> {
  const token = process.env.CLICKUP_API_TOKEN ?? ''
  const lijst = process.env.CLICKUP_LIST_CAMPAGNES ?? ''
  if (!token || !lijst) {
    return { gedaan: false, reden: 'ClickUp is nog niet ingesteld (CLICKUP_API_TOKEN en CLICKUP_LIST_CAMPAGNES).' }
  }
  if (v.campagne.clickupTaskId) {
    return { gedaan: false, reden: 'Deze campagne staat al in ClickUp.' }
  }

  const client = new ClickUpClient(token)
  const leden = await client.teamMembers().catch(() => [] as { id: number; email: string }[])
  const perEmail = new Map(leden.map((l) => [l.email, l.id]))

  const emails = new Map<string, string>()
  const ids = [v.campagne.marketingManagerId, ...v.tijdlijn.map((t) => t.assigneeUserId)].filter((x): x is string => !!x)
  for (const id of new Set(ids)) {
    const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1)
    if (u) emails.set(id, u.email.toLowerCase())
  }
  const clickupId = (userId: string | null) => {
    const email = userId ? emails.get(userId) : undefined
    const id = email ? perEmail.get(email) : undefined
    return id ? [id] : []
  }

  const hoofd = await client.createTask(lijst, {
    name: `${v.organisatie.name}: ${v.campagne.title}`,
    description: [v.campagne.summary, v.campagne.goalSentence].filter(Boolean).join('\n\n'),
    due_date: v.campagne.endOn?.getTime(),
    assignees: clickupId(v.campagne.marketingManagerId),
  })
  await db.update(campaigns).set({ clickupTaskId: hoofd.id }).where(eq(campaigns.id, v.campagne.id))

  let subtaken = 0
  for (const t of v.tijdlijn) {
    const sub = await client.createTask(lijst, {
      name: t.assigneeLabel && !t.assigneeUserId ? `${t.description} (${t.assigneeLabel})` : t.description,
      parent: hoofd.id,
      due_date: t.dueOn?.getTime(),
      assignees: clickupId(t.assigneeUserId),
    })
    await db.update(campaignTimeline).set({ clickupTaskId: sub.id }).where(eq(campaignTimeline.id, t.id))
    subtaken++
  }
  return { gedaan: true, taakId: hoofd.id, subtaken, url: hoofd.url }
}
