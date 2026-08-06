import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // behind fly.io's proxy request.url carries the internal listener (0.0.0.0:3000);
  // the public origin arrives in the forwarded headers
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const origin = host ? `${proto}://${host}` : new URL(request.url).origin
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/tickets'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/tickets'
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
