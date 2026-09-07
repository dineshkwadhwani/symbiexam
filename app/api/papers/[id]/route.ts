import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { processEvaluationQueue } from '@/lib/subjective-evaluation'

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

  const questions = (pqs ?? []).map((pq: any) => {
    if (paper.assessment?.assessment_type === 'subjective' && pq.question) {
      const { model_answer: _modelAnswer, ...safeQuestion } = pq.question
      return { ...pq, question: safeQuestion }
    }
    return pq
  })

  return NextResponse.json({ paper, questions })
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
    const { paper_question_id, selected_answer, answer_text } = body
    const update = paper.assessment?.assessment_type === 'subjective'
      ? { answer_text: String(answer_text ?? '') }
      : { selected_answer }
    await supabase
      .from('paper_questions')
      .update(update)
      .eq('id', paper_question_id)
      .eq('paper_id', id)
    return NextResponse.json({ ok: true })
  }

  // action: submit
  if (body.action === 'submit') {
    if (paper.status === 'completed') return NextResponse.json({ error: 'Already submitted' }, { status: 400 })

    if (paper.assessment?.assessment_type === 'subjective') {
      const admin = createAdminClient()
      const { data: pqs } = await admin
        .from('paper_questions')
        .select('id')
        .eq('paper_id', id)

      if (pqs?.length) {
        await admin.from('ai_evaluation_jobs').upsert(
          pqs.map((pq: { id: string }) => ({ paper_id: id, paper_question_id: pq.id, status: 'queued' })),
          { onConflict: 'paper_question_id' },
        )
        await admin.from('paper_questions').update({ evaluation_status: 'queued' }).eq('paper_id', id)
      }

      await processEvaluationQueue(id)
      const { data: evaluated } = await admin.from('paper_questions').select('marks_awarded').eq('paper_id', id)
      const score = (evaluated ?? []).reduce((sum: number, row: { marks_awarded?: number }) => sum + Number(row.marks_awarded ?? 0), 0)
      const { data: updated } = await admin
        .from('student_papers')
        .update({ status: 'completed', submitted_at: new Date().toISOString(), score })
        .eq('id', id)
        .select()
        .single()
      return NextResponse.json({ paper: updated, score })
    }

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
