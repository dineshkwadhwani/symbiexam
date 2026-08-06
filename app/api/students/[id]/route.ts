import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { sendPasswordResetEmail } from '@/lib/email'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cohort_id = searchParams.get('cohort_id')

  const admin = createAdminClient()

  // Verify teacher owns this cohort
  const { data: cohort } = await supabase.from('cohorts').select('id').eq('id', cohort_id).eq('teacher_id', user.id).single()
  if (!cohort) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await admin.from('cohort_students').delete().eq('student_id', id).eq('cohort_id', cohort_id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: pData } = await supabase.from('profiles').select('role').eq('id', user.id).single() as any
  if (pData?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const admin = createAdminClient()

  // Reset password
  if (body.reset_password) {
    const { generatePassword } = await import('@/lib/auth')
    const newPw = generatePassword()
    await admin.auth.admin.updateUserById(id, { password: newPw })
    await admin.from('profiles').update({ must_change_password: true }).eq('id', id)

    // Send the new password to the student by email
    const { data: profile } = await admin.from('profiles').select('email, full_name').eq('id', id).single()
    if (profile) {
      try { await sendPasswordResetEmail(profile.email, profile.full_name, newPw) } catch (e) { console.error('Reset email failed:', e) }
    }

    return NextResponse.json({ new_password: newPw })
  }

  return NextResponse.json({ ok: true })
}
