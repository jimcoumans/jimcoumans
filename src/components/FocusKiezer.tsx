'use client'

import { useState } from 'react'

/**
 * Het focuspunt van een foto: waar het om draait. Klik erop, en je ziet
 * meteen hoe de foto uitvalt in de drie formaten waar sjablonen hem later
 * in zetten. Het punt gaat als twee verborgen velden mee met het formulier.
 */
export function FocusKiezer({ src, x, y }: { src: string; x: number; y: number }) {
  const [punt, setPunt] = useState({ x, y })
  const positie = `${punt.x}% ${punt.y}%`
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
      <input type="hidden" name="focusX" value={punt.x} />
      <input type="hidden" name="focusY" value={punt.y} />
      <div>
        <p className="text-jr-text mb-1.5 text-[13px] font-medium">Focuspunt</p>
        <button
          type="button"
          className="relative block w-full cursor-crosshair overflow-hidden rounded-lg bg-gray-100"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            setPunt({
              x: Math.round(((e.clientX - r.left) / r.width) * 100),
              y: Math.round(((e.clientY - r.top) / r.height) * 100),
            })
          }}
          aria-label="Klik op het belangrijkste deel van de foto"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="block h-auto w-full" />
          <span
            className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,122,255,.9)]"
            style={{ left: `${punt.x}%`, top: `${punt.y}%` }}
          />
        </button>
        <p className="mt-1.5 text-xs text-gray-600">Klik op het belangrijkste deel van de foto.</p>
      </div>
      <div className="flex items-start gap-3 md:flex-col">
        {[
          { label: '1:1', klasse: 'aspect-square w-24' },
          { label: '4:5', klasse: 'aspect-[4/5] w-24' },
          { label: '9:16', klasse: 'aspect-[9/16] w-20' },
        ].map((f) => (
          <div key={f.label}>
            <div className={`overflow-hidden rounded-md bg-gray-100 ${f.klasse}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: positie }} />
            </div>
            <p className="mt-1 text-center text-[11px] text-gray-600">{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
