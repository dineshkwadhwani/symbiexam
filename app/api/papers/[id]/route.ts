import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/papers/:id - load paper with questions (student only sees own)
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: paper } = await supabase
    .from('student_papers')
    .select('*, assessment:assessments(*)')
    .eq('id', id)
    .eq('student_id', user.id)  // RBAC: only own paper
    .single()

  if (!paper) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })

  const { data: pqs } = await supabase
    .from('paper_questions')
    .select('*, question:questions(*)')
    .eq('paper_id', id)
    .order('question_order')

  return NextResponse.json({ paper, questions: pqs ?? [] })
}

// PATCH /api/papers/:id — start or submit
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // RBAC: must own this paper
  const { data: paper } = await supabase
    .from('student_papers')
    .select('*, assessment:assessments(*)')
    .eq('id', id)
    .eq('student_id', user.id)
    .single()
  if (!paper) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // action: start
  if (body.action === 'start') {
    if (paper.status === 'completed') return NextResponse.json({ error: 'Already completed' }, { status: 400 })
    const { data: updated } = await supabase
      .from('student_papers')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return NextResponse.json({ paper: updated })
  }

  // action: answer (save single answer)
  if (body.action === 'answer') {
    const { paper_question_id, selected_answer } = body
    await supabase
      .from('paper_questions')
      .update({ selected_answer })
      .eq('id', paper_question_id)
      .eq('paper_id', id)
    return NextResponse.json({ ok: true })
  }

  // action: submit
  if (body.action === 'submit') {
    if (paper.status === 'completed') return NextResponse.json({ error: 'Already submitted' }, { status: 400 })

    // Load all answers
    const { data: pqs } = await supabase
      .from('paper_questions')
      .select('*, question:questions(correct_answer)')
      .eq('paper_id', id)

    let score = 0
    const updates = []
    for (const pq of pqs ?? []) {
      const correct = pq.selected_answer === pq.question?.correct_answer
      if (correct) score += Number(paper.assessment?.marks_per_correct ?? 1)
      updates.push({ id: pq.id, is_correct: correct })
    }

    // Batch update correctness
    for (const u of updates) {
      await supabase.from('paper_questions').update({ is_correct: u.is_correct }).eq('id', u.id)
    }

    const { data: updated } = await supabase
      .from('student_papers')
      .update({ status: 'completed', submitted_at: new Date().toISOString(), score })
      .eq('id', id)
      .select()
      .single()

    return NextResponse.json({ paper: updated, score })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
