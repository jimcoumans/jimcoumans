import type { Metadata } from 'next'
import { ApplyForm } from '@/components/ApplyForm'

export const metadata: Metadata = { title: 'Kennismaken' }

export default function Apply() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="eyebrow mb-4">Kennismaken</p>
      <h1 className="text-[42px] leading-tight sm:text-[52px]">Vertel ons wat u graag uit handen geeft.</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">We vragen alleen wat nodig is voor een eerste gesprek. Daarin bespreken we wat u zoekt, wat u van bereikbaarheid verwacht en welke dienstverlening daarbij past.</p>
      <div className="card mt-8"><ApplyForm /></div>
    </div>
  )
}
