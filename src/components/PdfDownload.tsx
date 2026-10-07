/** Een knop die een pdf-bestand downloadt, gemaakt op de server. */
export function PdfDownload({ href, label = 'Download als pdf', rustig = false }: { href: string; label?: string; rustig?: boolean }) {
  return (
    <a
      href={href}
      download
      className={`inline-flex min-h-10 items-center gap-2 rounded-full px-5 py-2 text-sm font-medium ${
        rustig ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'bg-jr-btn hover:bg-jr-btnhover text-white'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </a>
  )
}
