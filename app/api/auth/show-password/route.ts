import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generatePassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const admin = createAdminClient()

  // Reject if mode is disabled
  const { data: setting } = await admin
    .from('profiles')
    .select('show_password_mode')
    .eq('role', 'teacher')
    .limit(1)
    .single()
  if (!setting?.show_password_mode) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
  }

  const { email, prn_id } = await req.json()
  if (!email || !prn_id) return NextResponse.json({ error: 'Email and PRN are required' }, { status: 400 })

  const { data: profile } = await admin
    .from('profiles')
    .select('id, prn_id, full_name')
    .eq('email', email.toLowerCase().trim())
    .eq('role', 'student')
    .single()

  // Return same error for both not-found and wrong PRN to avoid enumeration
  if (!profile || profile.prn_id?.trim() !== prn_id.trim()) {
    return NextResponse.json({ error: 'No student found with that email and PRN combination.' }, { status: 404 })
  }

  const newPw = generatePassword()
  await admin.auth.admin.updateUserById(profile.id, { password: newPw })
  await admin.from('profiles').update({ must_change_password: false }).eq('id', profile.id)

  return NextResponse.json({ password: newPw, name: profile.full_name })
}
