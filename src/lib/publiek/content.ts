import { and, eq, inArray, isNotNull, ne } from 'drizzle-orm'
import { db } from '@/db'
import {
  marketingClients,
  marketingContentClientLinks,
  marketingContentIndustryLinks,
  marketingContentItems,
  marketingContentRevisions,
  marketingContentSubjectLinks,
  marketingIndustries,
  marketingSubjects,
} from '@/db/schema'

/* -------------------------------------------------------------------------
   Goedgekeurde content voor de website.

   De website toont de GOEDGEKEURDE versie, niet wat er nu in de editor staat:
   wie een goedgekeurde tekst weer bewerkt, maakt er een concept van, en dat
   concept hoort niet live. Daarom komt de tekst uit de goedgekeurde revisie.

   Bewijs (cases, reviews) van een klant zonder publicatietoestemming gaat er
   niet uit, net als bij de export. Verborgen velden ook niet.
   ------------------------------------------------------------------------- */

type Snapshot = { velden?: { sleutel: string; effectief: string; herkomst: string }[] }

export type PubliekeContent = {
  id: string
  soort: 'page' | 'case' | 'review' | 'faq' | 'insight'
  titel: string
  slug: string | null
  onderwerp: { type: string; naam: string; slug: string } | null
  branche: { naam: string; slug: string } | null
  /** Waar dit ook bij hoort: voor interne links en "gerelateerd". */
  onderwerpen: string[]
  branches: string[]
  velden: Record<string, string>
  goedgekeurdOp: string
}

export async function goedgekeurdeContent(): Promise<PubliekeContent[]> {
  const items = await db
    .select()
    .from(marketingContentItems)
    .where(and(isNotNull(marketingContentItems.approvedRevisionId), ne(marketingContentItems.workflowStatus, 'archived')))
  if (!items.length) return []
  const ids = items.map((i) => i.id)
  const [revisies, onderwerpen, branches, sl, il, cl] = await Promise.all([
    db.select().from(marketingContentRevisions).where(inArray(marketingContentRevisions.id, items.map((i) => i.approvedRevisionId!))),
    db.select().from(marketingSubjects),
    db.select().from(marketingIndustries),
    db.select().from(marketingContentSubjectLinks).where(inArray(marketingContentSubjectLinks.contentItemId, ids)),
    db.select().from(marketingContentIndustryLinks).where(inArray(marketingContentIndustryLinks.contentItemId, ids)),
    db
      .select({ contentItemId: marketingContentClientLinks.contentItemId, toestemming: marketingClients.publicPermissionStatus })
      .from(marketingContentClientLinks)
      .innerJoin(marketingClients, eq(marketingClients.id, marketingContentClientLinks.clientId))
      .where(inArray(marketingContentClientLinks.contentItemId, ids)),
  ])
  const ond = new Map(onderwerpen.map((o) => [o.id, o]))
  const br = new Map(branches.map((b) => [b.id, b]))
  const uit: PubliekeContent[] = []
  for (const item of items) {
    if (item.demo) continue
    if (item.contentKind !== 'page' && cl.some((c) => c.contentItemId === item.id && c.toestemming !== 'granted')) continue
    const rev = revisies.find((r) => r.id === item.approvedRevisionId)
    if (!rev) continue
    const snap = rev.snapshot as Snapshot
    const velden: Record<string, string> = {}
    for (const v of snap.velden ?? []) if (v.herkomst !== 'verborgen' && v.effectief?.trim()) velden[v.sleutel] = v.effectief
    const o = item.subjectId ? ond.get(item.subjectId) : undefined
    const b = item.industryId ? br.get(item.industryId) : undefined
    uit.push({
      id: item.id,
      soort: item.contentKind,
      titel: item.title,
      slug: item.slug,
      onderwerp: o ? { type: o.type, naam: o.name, slug: o.slug } : null,
      branche: b ? { naam: b.name, slug: b.slug } : null,
      onderwerpen: [...new Set([...(o ? [o.slug] : []), ...sl.filter((l) => l.contentItemId === item.id).map((l) => ond.get(l.subjectId)?.slug).filter((s): s is string => !!s)])],
      branches: [...new Set([...(b ? [b.slug] : []), ...il.filter((l) => l.contentItemId === item.id).map((l) => br.get(l.industryId)?.slug).filter((s): s is string => !!s)])],
      velden,
      goedgekeurdOp: rev.createdAt.toISOString(),
    })
  }
  return uit
}
