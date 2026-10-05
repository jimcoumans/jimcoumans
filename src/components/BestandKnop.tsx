'use client'

/**
 * Een knop die een bestand laat kiezen en het formulier er meteen mee
 * verstuurt. In plaats van het kale "Choose File · No file chosen" van de
 * browser, gevolgd door nog een knop om te uploaden.
 */
export function BestandKnop({ label, naam = 'bestand', accept }: { label: string; naam?: string; accept: string }) {
  return (
    <label className="text-jr-link inline-flex cursor-pointer items-center rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium hover:bg-gray-50 focus-within:ring-2 focus-within:ring-jr-blue">
      {label}
      <input
        type="file"
        name={naam}
        accept={accept}
        required
        className="sr-only"
        onChange={(e) => e.currentTarget.files?.length && e.currentTarget.form?.requestSubmit()}
      />
    </label>
  )
}
