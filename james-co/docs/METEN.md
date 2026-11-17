# Meten — definities in de rapportage (`/ops/reports`)

Kleine aantallen: de cockpit toont aantallen naast percentages. Dit zijn
beschrijvingen en managementdrempels, geen statistische significantie. Geen
A/B-dashboard bij 25 leden.

| Maat | Definitie zoals gebouwd |
|---|---|
| Actieve leden | Lidmaatschap `active` of `ending` met startdatum vóór het einde van de periode. Betalend en "zonder kosten" apart. |
| Lidmaatschapsomzet | Som netto (excl. btw) van niet-vervallen lidmaatschapsfactuurrecords uitgegeven in de periode. |
| Kasontvangsten | Ontvangsten − restituties − correcties met ontvangstdatum in de periode. Los van omzet. |
| Leveranciersbesteding | Som van geaccepteerde bedragen in akkoorden in de periode. **Nooit eigen omzet.** |
| Overige eigen omzet | Netto van project-, Society- en visitorfacturen. |
| Actieve behandeltijd | Geregistreerde minuten (handmatig of timer). Wachten op leverancier telt niet. p50/p90 per verzoek per categorie. |
| Eerste reactietijd | Ontvangst tot eerste staffbericht in het portaal. **Nog in kalendertijd**: correctie voor gepubliceerde service-uren volgt zodra die zijn vastgesteld. Automatische berichten tellen niet. |
| Doorlooptijd | Intake tot laatste leveranciersbevestiging (p50). |
| Activatie | Lid met minstens één afgeronde opdracht. Een ingevuld profiel telt niet. |
| Herhaald gebruik | Tweede verzoek binnen 30 dagen na activatie. |
| Instroom | Geverifieerde aanmeldingen, via uitnodiging, aanbod gedaan, aanbod geaccepteerd. |
| Retentie | Nog niet getoond: pas zinvol na de eerste verlengmomenten. |
| Bijdrage | Nog niet getoond: vereist een vastgesteld intern uurtarief. |

Geen omzet = een eerlijke lege staat, geen verzonnen groei.

## Pilotbeslissingen (uit de briefing)

| Hypothese | Waar te zien | Drempel |
|---|---|---|
| Mensen betalen voor uitvoering | Instroom: geaccepteerd / aanbod | Eerst 5 betaalde leden |
| Herhaald gebruik | Activatie en gebruik | Interview actieve én stille leden |
| Leverbaarheid | Verzoeken: bevestigd/afgerond/probleem | Onderzoek iedere gemiste toezegging |
| Houdbare werkdruk | Behandeltijd p50/p90 per categorie | Scope/prijs aanpassen bij structurele overschrijding |
| Visitor-aanbod | Segment `international_visitor` in aanmeldingen | Pas verbreden na 3 betaalde proefopdrachten |
