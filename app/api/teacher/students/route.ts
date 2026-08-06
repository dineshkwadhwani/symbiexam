import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/teacher/students — all students in teacher's cohorts with paper stats
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Get all cohorts owned by this teacher
  const { data: cohorts } = await supabase
    .from('cohorts')
    .select('id, name')
    .eq('teacher_id', user.id)

  if (!cohorts?.length) return NextResponse.json({ students: [] })

  const cohortIds = cohorts.map(c => c.id)

  // Get all cohort memberships with profiles
  const { data: members } = await supabase
    .from('cohort_students')
    .select('student_id, cohort_id, profile:profiles(id, full_name, email, phone, prn_id, avatar_url, created_at)')
    .in('cohort_id', cohortIds)

  if (!members?.length) return NextResponse.json({ students: [] })

  // Deduplicate students (may be in multiple cohorts)
  const studentMap = new Map<string, any>()
  for (const m of members) {
    const profile = m.profile as any
    if (!profile) continue
    if (!studentMap.has(m.student_id)) {
      studentMap.set(m.student_id, {
        ...profile,
        cohorts: [],
      })
    }
    const cohort = cohorts.find(c => c.id === m.cohort_id)
    if (cohort) studentMap.get(m.student_id).cohorts.push(cohort.name)
  }

  const studentIds = Array.from(studentMap.keys())

  // Get paper stats for all students
  const { data: papers } = await supabase
    .from('student_papers')
    .select('id, student_id, assessment_id, status, score, submitted_at, created_at, assessment:assessments(id, name, total_marks)')
    .in('student_id', studentIds)
    .order('created_at', { ascending: false })

  // Attach papers to students
  for (const [studentId, student] of studentMap) {
    const studentPapers = papers?.filter(p => p.student_id === studentId) ?? []
    student.papers = studentPapers
    student.total_assessments = studentPapers.length
    student.completed_assessments = studentPapers.filter(p => p.status === 'completed').length
    student.last_activity = studentPapers[0]?.created_at ?? null
  }

  return NextResponse.json({ students: Array.from(studentMap.values()) })
}
