import type { Metadata } from 'next'
import { ActionForm } from '@/components/ActionForm'
import { verifyAction } from '@/app/actions/auth'

export const metadata: Metadata = { title: 'Inloggen', robots: { index: false } }

/** De link zelf logt niet in (linkscanners in mailprogramma's openen links); de knop wel. */
export default async function Verify({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? ''
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
      <h1 className="text-[40px] leading-tight">Welkom bij James &amp; Co.</h1>
      <p className="mt-3 text-[15px] text-muted">Bevestig om verder te gaan.</p>
      <div className="mt-8 flex justify-center">
        <ActionForm action={verifyAction} submitLabel="Doorgaan" pendingLabel="Een moment…">
          <input type="hidden" name="token" value={token} />
        </ActionForm>
      </div>
    </div>
  )
}
