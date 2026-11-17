import type { Metadata } from 'next'
import { Notice } from '@/components/ui'

export const metadata: Metadata = { title: 'Privacy' }

export default function Privacy() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-16 sm:px-6 [&_h2]:mt-8 [&_h2]:text-[26px] [&_p]:mt-3 [&_p]:text-[16px] [&_p]:leading-relaxed [&_li]:text-[16px]">
      <h1 className="text-[44px]">Privacyverklaring</h1>
      <div className="mt-6"><Notice tone="warn" title="Concept">Deze tekst is een inhoudelijk te beoordelen concept. Hij wordt definitief zodra de juridische entiteit, verwerkingen en bewaartermijnen zijn vastgesteld.</Notice></div>
      <h2>Wat we verzamelen</h2>
      <p>Bij een aanvraag: naam, e-mailadres, woonregio, voorkeurscontact, uw hulpvraag en hoe u ons vond. Als lid: de verzoeken die u ons geeft, berichten, voorstellen, uw akkoorden, boekingsgegevens en de voorkeuren die u zelf met ons deelt. We vragen geen inkomensbewijs, paspoort of betaalkaartgegevens.</p>
      <h2>Gevoelige voorkeuren</h2>
      <p>Dieet- en allergiegegevens bewaren we alleen met uw uitdrukkelijke toestemming, met beperkte toegang. U kunt die toestemming in uw profiel intrekken; de gegevens worden dan verwijderd.</p>
      <h2>Delen met leveranciers</h2>
      <p>We delen met een leverancier alleen wat voor dat ene verzoek nodig is, zoals een naam op de reservering en het aantal personen.</p>
      <h2>Toestemming voor berichten</h2>
      <p>Servicecommunicatie en marketing leggen we apart vast. Er staat nooit vooraf een vinkje aan, en we sturen geen ongevraagde uitnodigingen aan mensen die we niet kennen.</p>
      <h2>Uitnodigingen</h2>
      <p>Wie een uitnodiging deelt, ziet alleen of de link is gebruikt. Nooit uw wensen, uitgaven of profiel.</p>
      <h2>Uw rechten</h2>
      <p>U kunt inzage, correctie, export of verwijdering vragen. Voor sommige gegevens, zoals facturen, gelden wettelijke bewaarplichten.</p>
    </article>
  )
}
