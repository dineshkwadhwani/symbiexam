import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

// Public GET — login page reads this without auth
export async function GET() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('show_password_mode')
    .eq('role', 'teacher')
    .limit(1)
    .single()
  return NextResponse.json({ show_password_mode: data?.show_password_mode ?? false })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { show_password_mode } = await req.json()
  const { error } = await supabase.from('profiles').update({ show_password_mode }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, show_password_mode })
}
