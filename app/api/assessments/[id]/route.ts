import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getTeacherAndAssessment(id: string, supabase: any, userId: string) {
  const { data } = await supabase.from('assessments').select('*').eq('id', id).eq('teacher_id', userId).single()
  return data
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const assessment = await getTeacherAndAssessment(id, supabase, user.id)
  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: questions } = await supabase.from('questions').select('*').eq('assessment_id', id).order('created_at')

  return NextResponse.json({ assessment, questions: questions ?? [] })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const assessment = await getTeacherAndAssessment(id, supabase, user.id)
  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { data, error } = await supabase.from('assessments').update(body).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ assessment: data })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await supabase.from('assessments').delete().eq('id', id).eq('teacher_id', user.id)
  return NextResponse.json({ ok: true })
}
