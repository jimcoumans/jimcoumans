/* -------------------------------------------------------------------------
   AI voor de voorstelgenerator: de generator stuurt een opdracht, Claude
   schrijft. Synchrone route, dus binnen de tijdsgrens van Netlify (26 s):
   daarom Sonnet zonder denkstap, met een korte uitvoer.
   ------------------------------------------------------------------------- */

import Anthropic from '@anthropic-ai/sdk'

export const MODEL = 'claude-sonnet-5-5'
const MAX_OPDRACHT = 60_000

export class AiFout extends Error {
  constructor(
    message: string,
    public code: 'geen_sleutel' | 'te_lang' | 'refused' | 'invalid_json' | 'leeg',
  ) {
    super(message)
  }
}

export const aiBeschikbaar = () => !!process.env.ANTHROPIC_API_KEY

/** Eén opdracht, één antwoord. Met json: true wordt het antwoord als JSON gelezen. */
export async function schrijf(opdracht: string, json: boolean): Promise<string | unknown> {
  if (!aiBeschikbaar()) throw new AiFout('De AI-sleutel ontbreekt. Zet ANTHROPIC_API_KEY in de omgevingsvariabelen van Netlify.', 'geen_sleutel')
  if (!opdracht.trim()) throw new AiFout('Lege opdracht.', 'leeg')
  if (opdracht.length > MAX_OPDRACHT) throw new AiFout('De opdracht is te lang.', 'te_lang')
  const client = new Anthropic()
  const bericht = await client.messages
    .stream({
      model: MODEL,
      max_tokens: 4000,
      system: json
        ? 'Je antwoordt uitsluitend met één geldig JSON-object, zonder tekst ervoor of erna en zonder codeblok.'
        : 'Je antwoordt alleen met de gevraagde tekst, zonder inleiding of afsluiting.',
      messages: [{ role: 'user', content: opdracht }],
    })
    .finalMessage()
  if (bericht.stop_reason === 'refusal') throw new AiFout('De AI wilde hier niet op antwoorden.', 'refused')
  const tekst = bericht.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim()
  if (!json) return tekst
  const a = tekst.indexOf('{')
  const b = tekst.lastIndexOf('}')
  try {
    return JSON.parse(tekst.slice(a, b + 1))
  } catch {
    throw new AiFout('Het antwoord was niet te lezen.', 'invalid_json')
  }
}
