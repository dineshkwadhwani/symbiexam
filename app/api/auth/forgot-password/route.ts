import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPasswordResetEmail } from '@/lib/email'
import { generatePassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ ok: true }) // silent fail

    const admin = createAdminClient()
    const { data: { users } } = await admin.auth.admin.listUsers()
    const user = users?.find((u: any) => u.email === email)

    if (user) {
      const { data: profile } = await admin.from('profiles').select('full_name, role').eq('id', user.id).single()
      // Only reset for students (teachers use a different flow)
      if (profile?.role === 'student') {
        const newPw = generatePassword()
        await admin.auth.admin.updateUserById(user.id, { password: newPw })
        await admin.from('profiles').update({ must_change_password: true }).eq('id', user.id)
        try { await sendPasswordResetEmail(email, profile.full_name, newPw) } catch (e) { console.error(e) }
      }
    }

    // Always return ok — don't reveal whether the email exists
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
