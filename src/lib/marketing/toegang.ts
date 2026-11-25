import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { magMarketing } from './registers'

/** Voor de pagina's van Marketing → Website: alleen het team, klanten nooit. */
export async function marketingGebruiker() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (!magMarketing(user.role, 'lezen')) redirect('/')
  return user
}
