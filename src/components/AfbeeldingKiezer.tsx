import { ActionForm } from './ActionForm'
import { Avatar } from './Avatar'
import { BestandKnop } from './BestandKnop'
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
    <div className="flex items-center gap-4">
      <Avatar naam={naam} imageId={imageId} maat={64} rond={rond} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <ActionForm
            action={uploadAfbeelding}
            submitLabel="Uploaden"
            submitClassName="sr-only"
            resetOnSuccess
            meldGelukt={false}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="soort" value={soort} />
            <input type="hidden" name="doelId" value={doelId} />
            {slug && <input type="hidden" name="slug" value={slug} />}
            <BestandKnop label={imageId ? `Ander${label === 'Logo' ? '' : 'e'} ${label.toLowerCase()}` : `${label} kiezen`} accept="image/png,image/jpeg,image/webp" />
          </ActionForm>

          {imageId && (
            <ActionForm
              action={verwijderAfbeelding}
              submitLabel="Weghalen"
              submitClassName="text-gray-600 hover:bg-gray-100 !min-h-0 !rounded-full !px-3 !py-1.5"
              resetOnSuccess={false}
              meldGelukt={false}
              className=""
            >
              <input type="hidden" name="soort" value={soort} />
              <input type="hidden" name="doelId" value={doelId} />
              {slug && <input type="hidden" name="slug" value={slug} />}
            </ActionForm>
          )}
        </div>
        <p className="mt-1.5 text-xs text-gray-500">PNG, JPEG of WebP, tot 1 MB.</p>
      </div>
    </div>
  )
}
