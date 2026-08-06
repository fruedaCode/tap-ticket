import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/auth']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Refresh cookies written to `response` by setAll must survive redirects.
  const redirectWithCookies = (url: URL) => {
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => {
      const { name, value, ...options } = c
      redirect.cookies.set(name, value, options)
    })
    return redirect
  }
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p))
  if (!user && !isPublic) {
    if (path.startsWith('/api')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    const next = path + request.nextUrl.search
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(next)}`
    return redirectWithCookies(url)
  }
  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/tickets'
    url.search = ''
    return redirectWithCookies(url)
  }
  return response
}
