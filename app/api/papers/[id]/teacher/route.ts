import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Teacher can view any paper for their assessments
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Verify teacher owns this assessment
  const { data: paper } = await supabase
    .from('student_papers')
    .select('*, assessment:assessments(*), student:profiles(*)')
    .eq('id', id)
    .single()

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (paper.assessment?.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: pqs } = await supabase
    .from('paper_questions')
    .select('*, question:questions(*)')
    .eq('paper_id', id)
    .order('question_order')

  return NextResponse.json({ paper, questions: pqs ?? [] })
}
