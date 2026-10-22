import { OORDEEL_LABELS } from '@/lib/uitingen-check'
import type { UitingCheck } from '@/db/schema'

const STIJL: Record<NonNullable<UitingCheck['oordeel']>, string> = {
  groen: 'bg-[#E6F7EB] text-[#1D7D3F]',
  oranje: 'bg-[#FFF3E0] text-[#94590A]',
  rood: 'bg-[#FDECEA] text-[#C02A22]',
}

const STIP: Record<NonNullable<UitingCheck['oordeel']>, string> = {
  groen: 'bg-[#34C759]',
  oranje: 'bg-[#F6A027]',
  rood: 'bg-[#FF3B30]',
}

/** Het oordeel of, zolang er nog geen is, de status van de check. */
export function OordeelLabel({ check }: { check: Pick<UitingCheck, 'status' | 'oordeel'> & { vastgelopen?: boolean } }) {
  if (check.status === 'klaar' && check.oordeel) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STIJL[check.oordeel]}`}>
        <span className={`h-2 w-2 rounded-full ${STIP[check.oordeel]}`} />
        {OORDEEL_LABELS[check.oordeel]}
      </span>
    )
  }
  if (check.status === 'fout' || check.vastgelopen) return <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-[#C02A22]">Mislukt</span>
  return <span className="rounded-full bg-jr-lightblue px-2.5 py-0.5 text-xs text-jr-link">{check.status === 'wacht' ? 'In de wacht' : 'Bezig met checken'}</span>
}
