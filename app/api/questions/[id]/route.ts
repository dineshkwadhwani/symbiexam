import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: questionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Verify the question belongs to an assessment owned by this teacher
    const { data: question } = await supabase
      .from('questions')
      .select('assessment_id')
      .eq('id', questionId)
      .single()
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const { data: assessment } = await supabase
      .from('assessments')
      .select('id')
      .eq('id', question.assessment_id)
      .eq('teacher_id', user.id)
      .single()
    if (!assessment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Delete the question
    const { error } = await supabase.from('questions').delete().eq('id', questionId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
