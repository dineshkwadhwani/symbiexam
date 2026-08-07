import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: cohort } = await supabase.from('cohorts').select('*').eq('id', id).eq('teacher_id', user.id).single()
  if (!cohort) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: members } = await supabase
    .from('cohort_students')
    .select('*, profile:profiles(*)')
    .eq('cohort_id', id)

  return NextResponse.json({ cohort, members: members ?? [] })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await supabase.from('cohorts').delete().eq('id', id).eq('teacher_id', user.id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { name, description } = await req.json()
  const { data, error } = await supabase
    .from('cohorts')
    .update({ name, description })
    .eq('id', id)
    .eq('teacher_id', user.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ cohort: data })
}
