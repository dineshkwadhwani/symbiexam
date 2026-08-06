import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { QuestionBankJSON } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { assessment_id, questions: rawQuestions } = await req.json() as {
      assessment_id: string
      questions: QuestionBankJSON['questions']
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Verify ownership
    const { data: assessment } = await supabase
      .from('assessments')
      .select('id')
      .eq('id', assessment_id)
      .eq('teacher_id', user.id)
      .single()
    if (!assessment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Delete existing questions for this assessment
    await supabase.from('questions').delete().eq('assessment_id', assessment_id)

    // Insert new questions
    const rows = rawQuestions.map(q => ({
      assessment_id,
      co: q.co,
      topic_number: q.topic_number,
      topic_name: q.topic_name,
      bloom_level: q.bloom_level,
      bloom_label: q.bloom_label,
      question_text: q.question,
      option_a: q.options.A,
      option_b: q.options.B,
      option_c: q.options.C,
      option_d: q.options.D,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }))

    const { error, data: inserted } = await supabase.from('questions').insert(rows).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ inserted: inserted?.length ?? rows.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
