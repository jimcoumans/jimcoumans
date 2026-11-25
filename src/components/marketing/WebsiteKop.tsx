import Link from 'next/link'
import { CEL_NAAM, type CelStatus } from '@/lib/marketing/content'

/* De tabbladen van Marketing → Website, en een statuslabel met tekst en
   teken, zodat de status ook zonder kleur te lezen is. */

const BLADEN = [
  { href: '/beheer/marketing/website', label: 'Overzicht', key: 'overzicht' },
  { href: '/beheer/marketing/website/architectuur', label: 'Architectuur', key: 'architectuur' },
  { href: '/beheer/marketing/website/content', label: 'Content', key: 'content' },
  { href: '/beheer/marketing/website/matrix', label: 'Contentmatrix', key: 'matrix' },
] as const

export function WebsiteTabs({ actief }: { actief: (typeof BLADEN)[number]['key'] }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3 text-sm" aria-label="Website">
      {BLADEN.map((b) => (
        <Link
          key={b.key}
          href={b.href}
          aria-current={actief === b.key ? 'page' : undefined}
          className={`rounded-full px-4 py-1.5 ${actief === b.key ? 'bg-jr-blue text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        >
          {b.label}
        </Link>
      ))}
    </nav>
  )
}

const STIJL: Record<CelStatus, { teken: string; klasse: string }> = {
  niet_gepland: { teken: '·', klasse: 'text-gray-400' },
  niet_relevant: { teken: '–', klasse: 'text-gray-400 line-through' },
  uitgesteld: { teken: '‖', klasse: 'text-gray-500' },
  gepland: { teken: '○', klasse: 'text-gray-700' },
  concept: { teken: '✎', klasse: 'text-[#94590A]' },
  in_review: { teken: '→', klasse: 'text-[#0857C3]' },
  goedgekeurd: { teken: '✓', klasse: 'text-[#1D7D3F]' },
  gepubliceerd: { teken: '●', klasse: 'text-[#1D7D3F] font-medium' },
  herbeoordeling: { teken: '!', klasse: 'text-[#B42318] font-medium' },
}

export function StatusLabel({ status, kort = false }: { status: CelStatus; kort?: boolean }) {
  const s = STIJL[status]
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${s.klasse}`}>
      <span aria-hidden="true">{s.teken}</span>
      <span className={kort ? 'sr-only' : ''}>{CEL_NAAM[status]}</span>
    </span>
  )
}
