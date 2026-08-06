import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return NextResponse.json({ profile: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const allowed = ['phone', 'avatar_url']
  const updates: Record<string, any> = {}
  for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k]

  const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ profile: data })
}
