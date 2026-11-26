import type { ReactNode } from 'react'

const AANTAL_ZICHTBAAR = 5

export function UitklapLijst<T>({ regels, label, renderLijst, open }: {
  regels: T[]
  label: string
  renderLijst: (regels: T[]) => ReactNode
  open?: boolean
}) {
  const oudereRegels = regels.slice(AANTAL_ZICHTBAAR)

  return (
    <>
      {renderLijst(regels.slice(0, AANTAL_ZICHTBAAR))}
      {oudereRegels.length > 0 && (
        <details className="group mt-3" open={open}>
          <summary className="w-fit cursor-pointer select-none text-sm font-medium text-jr-link hover:underline">
            <span className="group-open:hidden">Meer {label} tonen ({oudereRegels.length})</span>
            <span className="hidden group-open:inline">Minder {label} tonen</span>
          </summary>
          <div className="mt-3">{renderLijst(oudereRegels)}</div>
        </details>
      )}
    </>
  )
}
