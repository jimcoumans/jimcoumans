/**
 * Woordmerk in tekst. Het echte logo is een beeldmerk plus woordmerk; zolang
 * er geen SVG-export beschikbaar is, is dit een nette benadering die op elke
 * achtergrond werkt en nooit vervormt.
 */
export function Logo({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const naam = variant === 'light' ? 'text-white' : 'text-jr-black'
  return (
    <span className="inline-flex items-baseline gap-2 leading-none">
      <span className={`text-lg font-bold tracking-tight ${naam}`}>James Robinson</span>
      <span className="text-jr-blue text-sm font-normal">Wallet</span>
    </span>
  )
}
