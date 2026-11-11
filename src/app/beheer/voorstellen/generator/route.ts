import { getSessionUser } from '@/lib/auth'
import { generatorPagina } from '@/lib/voorstel/pagina'

/** De voorstelgenerator, alleen voor het team: er staan prijzen en interne afwegingen in. */
export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return Response.redirect(new URL('/login', request.url), 303)
  if (user.role !== 'staff' && user.role !== 'admin') return Response.redirect(new URL('/', request.url), 303)
  return new Response(await generatorPagina(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
  })
}
