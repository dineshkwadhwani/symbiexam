import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generatePaper } from '@/lib/paper-generator'
import { sendAssessmentAssignedEmail } from '@/lib/email'
import type { Question } from '@/lib/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data } = await supabase
    .from('assignments')
    .select('*, assessment:assessments(*), cohort:cohorts(*), student:profiles(*)')
    .eq('assigned_by', user.id)
    .order('assigned_at', { ascending: false })

  return NextResponse.json({ assignments: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const { assessment_id, cohort_id, student_id } = await req.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createAdminClient()

    // Verify assessment ownership
    const { data: assessment } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessment_id)
      .eq('teacher_id', user.id)
      .single()
    if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

    // Fetch all questions for this assessment
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('assessment_id', assessment_id)

    if (!questions || questions.length < assessment.total_questions) {
      return NextResponse.json({ error: `Not enough questions. Need ${assessment.total_questions}, have ${questions?.length ?? 0}.` }, { status: 400 })
    }

    // Create assignment record
    const { data: assignment, error: aErr } = await admin
      .from('assignments')
      .insert({ assessment_id, cohort_id: cohort_id || null, student_id: student_id || null, assigned_by: user.id })
      .select()
      .single()
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 })

    // Determine target students
    let targetStudents: { id: string; email: string; full_name: string }[] = []

    if (cohort_id) {
      const { data: members } = await admin
        .from('cohort_students')
        .select('student_id, profile:profiles(id, email, full_name)')
        .eq('cohort_id', cohort_id)
      targetStudents = members?.map((m: any) => m.profile) ?? []
    } else if (student_id) {
      const { data: profile } = await admin.from('profiles').select('id, email, full_name').eq('id', student_id).single()
      if (profile) targetStudents = [profile as any]
    }

    // Generate paper for each student
    for (const student of targetStudents) {
      const paperQuestions = generatePaper(questions as Question[], assessment.total_questions)

      const { data: paper } = await admin
        .from('student_papers')
        .insert({
          assignment_id: assignment.id,
          student_id: student.id,
          assessment_id,
          status: 'pending',
        })
        .select()
        .single()

      if (paper) {
        const pqRows = paperQuestions.map((q: Question, idx: number) => ({
          paper_id: paper.id,
          question_id: q.id,
          question_order: idx + 1,
        }))
        await admin.from('paper_questions').insert(pqRows)
      }
    }

    // Send emails after all papers are generated, with 1s delay between each
    void (async () => {
      for (const student of targetStudents) {
        try {
          await sendAssessmentAssignedEmail(student.email, student.full_name, assessment.name)
        } catch (e) {
          console.error('Assignment email failed for', student.email, e)
        }
        await new Promise(res => setTimeout(res, Number(process.env.EMAIL_SEND_DELAY_MS ?? 1000)))
      }
    })()

    return NextResponse.json({ assignment, students_assigned: targetStudents.length }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
