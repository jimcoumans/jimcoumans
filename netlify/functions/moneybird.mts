import { syncMoneybirdAbonnementen } from '../../src/lib/moneybird/abonnementen'

export default async function handler() {
  try {
    const fouten = await syncMoneybirdAbonnementen()
    return new Response(`Moneybird: ${fouten} fouten`, { status: fouten ? 500 : 200 })
  } catch (error) {
    console.error('[moneybird] synchronisatie mislukt', error instanceof Error ? error.name : '')
    return new Response('Moneybird-synchronisatie mislukt', { status: 500 })
  }
}

export const config: { schedule: string } = { schedule: '7,22,37,52 * * * *' }
