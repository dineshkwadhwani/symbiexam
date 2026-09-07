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
    const { data: ownedAssessment } = await supabase
      .from('assessments')
      .select('id')
      .eq('id', assessment_id)
      .eq('teacher_id', user.id)
      .single()
    if (!ownedAssessment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: assessment } = await supabase
      .from('assessments')
      .select('assessment_type')
      .eq('id', assessment_id)
      .single()

    if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    if (assessment.assessment_type === 'subjective_online') {
      return NextResponse.json({ error: 'Subjective Online workflow is not available yet' }, { status: 400 })
    }

    // Uploads replace the bank as one atomic authoring operation.
    await supabase.from('questions').delete().eq('assessment_id', assessment_id)

    const rows = rawQuestions.map((q: any) => assessment.assessment_type === 'subjective'
      ? {
          assessment_id,
          co: q.co,
          topic_number: q.topic_number,
          topic_name: q.topic_name,
          bloom_level: q.bloom_level,
          bloom_label: q.bloom_label,
          question_text: q.question ?? q.question_text,
          image_url: q.image_url ?? null,
          model_answer: q.model_answer ?? '',
          max_marks: Number(q.max_marks ?? 0),
        }
      : {
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
        })

    const { error, data: inserted } = await supabase.from('questions').insert(rows).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ inserted: inserted?.length ?? rows.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
