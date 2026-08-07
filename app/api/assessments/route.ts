import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Count questions per assessment in a single query
  const assessmentIds = data.map(a => a.id)
  const { data: qCounts } = await supabase
    .from('questions')
    .select('assessment_id')
    .in('assessment_id', assessmentIds)

  const countMap: Record<string, number> = {}
  for (const q of qCounts ?? []) {
    countMap[q.assessment_id] = (countMap[q.assessment_id] ?? 0) + 1
  }

  const assessments = data.map(a => ({
    ...a,
    question_count: countMap[a.id] ?? 0,
  }))

  return NextResponse.json({ assessments })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data, error } = await supabase
      .from('assessments')
      .insert({
        name: body.name,
        total_questions: body.total_questions,
        total_time_seconds: body.total_time_seconds || null,
        time_per_question: body.time_per_question || null,
        marks_per_correct: body.marks_per_correct,
        total_marks: body.total_marks,
        is_active: body.is_active ?? false,
        teacher_id: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ assessment: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
