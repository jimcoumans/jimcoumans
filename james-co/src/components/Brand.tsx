import Link from 'next/link'

export function Wordmark({ href = '/', small }: { href?: string; small?: boolean }) {
  return (
    <Link href={href} className={`font-serif ${small ? 'text-[22px]' : 'text-[26px]'} leading-none tracking-tight text-ink`} aria-label="James & Co. — home">
      James <span className="italic text-forest">&amp;</span> Co.
    </Link>
  )
}
