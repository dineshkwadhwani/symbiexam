import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/papers - list papers for current student
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data } = await supabase
    .from('student_papers')
    .select('*, assessment:assessments(*), assignment:assignments(id, cohort_id, cohort:cohorts(name))')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ papers: data ?? [] })
}
