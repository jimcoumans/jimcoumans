const RETAINER_KENMERK = 'Marketing Partnership'

export function retainerReferentie(abonnementId: string) {
  return `${RETAINER_KENMERK} · JR-WALLET-${abonnementId}`
}

export function isRetainerfactuur(kenmerk: string | null | undefined) {
  const waarde = kenmerk?.trim().replace(/\s+/g, ' ').toLowerCase()
  return waarde === RETAINER_KENMERK.toLowerCase()
    || /^marketing partnership · jr-wallet-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(waarde ?? '')
}
