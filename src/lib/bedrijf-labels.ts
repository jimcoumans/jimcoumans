/* -------------------------------------------------------------------------
   Labels voor het bedrijfsprofiel, zonder database.
   ------------------------------------------------------------------------- */

export const RECHTSVORM_LABELS = {
  eenmanszaak: 'Eenmanszaak',
  vof: 'VOF',
  maatschap: 'Maatschap',
  cv: 'CV',
  bv: 'BV',
  nv: 'NV',
  stichting: 'Stichting',
  vereniging: 'Vereniging',
  overheid: 'Overheid',
  anders: 'Anders',
} as const

export const GEZONDHEID_LABELS = {
  uitstekend: 'Uitstekend',
  goed: 'Goed',
  aandacht: 'Vraagt aandacht',
  zorgelijk: 'Zorgelijk',
} as const

export const GEZONDHEID_STIJLEN = {
  uitstekend: 'bg-jr-green/10 text-jr-green',
  goed: 'bg-jr-lightblue text-jr-deepblue',
  aandacht: 'bg-jr-orange/10 text-jr-orange',
  zorgelijk: 'bg-jr-red/10 text-jr-red',
} as const

/**
 * Regio's waarin we werken.
 *
 * Een suggestielijst en geen vaste keuze: een klant buiten Limburg moet je
 * gewoon kunnen invoeren zonder dat er een migratie aan te pas komt.
 */
export const REGIOS = [
  'Zuid-Limburg',
  'Midden-Limburg',
  'Noord-Limburg',
  'Limburg (overig)',
  'Noord-Brabant',
  'Gelderland',
  'Randstad',
  'Overig Nederland',
  'België',
  'Duitsland',
] as const

/** De sociale kanalen die we bijhouden, in de volgorde waarin we ze tonen. */
export const SOCIALS = [
  { veld: 'website', label: 'Website', naamInForm: 'website' },
  { veld: 'linkedinUrl', label: 'LinkedIn', naamInForm: 'linkedin' },
  { veld: 'facebookUrl', label: 'Facebook', naamInForm: 'facebook' },
  { veld: 'instagramUrl', label: 'Instagram', naamInForm: 'instagram' },
  { veld: 'youtubeUrl', label: 'YouTube', naamInForm: 'youtube' },
  { veld: 'tiktokUrl', label: 'TikTok', naamInForm: 'tiktok' },
] as const

/** Hoeveel jaar een bedrijf bestaat, en of dat dit jaar een rond getal is. */
export function bedrijfsjubileum(
  foundedOn: Date | null,
  nu: Date = new Date(),
): { jaren: number; isRond: boolean } | null {
  if (foundedOn === null) return null
  const jaren = nu.getFullYear() - foundedOn.getFullYear()
  if (jaren < 1) return null
  // Vanaf vijf jaar is elk vijftal een reden voor een kaartje.
  return { jaren, isRond: jaren >= 5 && jaren % 5 === 0 }
}
