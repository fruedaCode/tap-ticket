import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  // remove the caller's receipt images first — orphaned storage objects would survive the user delete
  const { data: ownedTickets } = await admin.from('tickets').select('img_path').eq('owner_id', user.id)
  const imgPaths = (ownedTickets ?? []).map((t) => t.img_path).filter((p): p is string => typeof p === 'string' && p.length > 0)
  if (imgPaths.length > 0) {
    const { error: storageError } = await admin.storage.from('ticket-images').remove(imgPaths)
    if (storageError) console.error('account delete: failed to remove receipt images', storageError)
  }
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
