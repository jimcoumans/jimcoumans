import { ActionForm } from './ActionForm'
import { Avatar } from './Avatar'
import { uploadAfbeelding, verwijderAfbeelding } from '@/app/beheer/afbeelding-actions'

/**
 * Een logo of profielfoto kiezen, met wat er nu staat ernaast.
 *
 * Een eigen formulier en niet een veld in het grote formulier: een bestand
 * gaat anders over de lijn dan tekst, en een mislukte upload mag nooit de
 * rest van je ingevulde gegevens meenemen.
 */
export function AfbeeldingKiezer({
  soort,
  doelId,
  naam,
  imageId,
  slug,
  label = 'Profielfoto',
  rond = true,
}: {
  soort: 'klant' | 'contact' | 'medewerker'
  doelId: string
  naam: string
  imageId: string | null
  slug?: string
  label?: string
  rond?: boolean
}) {
  return (
    <div className="flex items-start gap-4">
      <Avatar naam={naam} imageId={imageId} maat={64} rond={rond} />

      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs text-gray-600">{label}</p>

        <ActionForm
          action={uploadAfbeelding}
          submitLabel={imageId ? 'Vervangen' : 'Uploaden'}
          submitClassName="bg-jr-btn hover:bg-jr-btnhover text-white !text-xs"
          resetOnSuccess={false}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="soort" value={soort} />
          <input type="hidden" name="doelId" value={doelId} />
          {slug && <input type="hidden" name="slug" value={slug} />}
          <input
            type="file"
            name="bestand"
            accept="image/png,image/jpeg,image/webp"
            required
            className="file:bg-jr-lightblue file:text-jr-deepblue max-w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-xs"
          />
        </ActionForm>

        <p className="mt-1 text-xs text-gray-500">
          PNG, JPEG of WebP, maximaal 1 MB. Geen SVG.
        </p>

        {imageId && (
          <div className="mt-1">
            <ActionForm
              action={verwijderAfbeelding}
              submitLabel="Weghalen"
              submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs"
              resetOnSuccess={false}
              className=""
            >
              <input type="hidden" name="soort" value={soort} />
              <input type="hidden" name="doelId" value={doelId} />
              {slug && <input type="hidden" name="slug" value={slug} />}
            </ActionForm>
          </div>
        )}
      </div>
    </div>
  )
}
