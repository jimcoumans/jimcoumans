import { afbeeldingUrl, initialen } from '@/lib/afbeeldingen'

/**
 * Een logo of profielfoto, met initialen als er geen is.
 *
 * Initialen in plaats van een grijs poppetje: je herkent een rij sneller aan
 * twee letters dan aan twintig identieke silhouetten.
 */
export function Avatar({
  naam,
  imageId,
  maat = 36,
  rond = true,
}: {
  naam: string
  imageId: string | null
  maat?: number
  rond?: boolean
}) {
  const url = afbeeldingUrl(imageId)
  const vorm = rond ? 'rounded-full' : 'rounded-lg'

  if (url) {
    return (
      // Een gewone img: het bestand komt uit onze eigen route en de maat
      // staat vast, dus de optimalisatielaag van Next voegt hier niets toe.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={maat}
        height={maat}
        style={{ width: maat, height: maat }}
        className={`${vorm} shrink-0 border border-gray-200 bg-white object-cover`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      style={{ width: maat, height: maat, fontSize: Math.round(maat * 0.36) }}
      className={`${vorm} bg-jr-lightblue text-jr-deepblue flex shrink-0 items-center justify-center font-bold`}
    >
      {initialen(naam)}
    </span>
  )
}
