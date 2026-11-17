import { requireStaff } from '@/lib/auth/session'
import { PageTitle } from '@/components/ui'
import { SupplierForm } from '@/components/SupplierForm'

export default async function NewSupplier() {
  await requireStaff()
  return (<><PageTitle title="Nieuwe leverancier" /><div className="card max-w-3xl"><SupplierForm /></div></>)
}
