import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'
import { generatePassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, phone, cohort_id, cohort_name } = await req.json()
    const admin = createAdminClient()

    // Check if user already exists in auth
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existing = existingUsers?.users?.find((u: any) => u.email === email)

    let userId: string
    let plainPassword: string | null = null

    if (existing) {
      userId = existing.id
      // Ensure profile exists
      const { data: profile } = await admin.from('profiles').select('id').eq('id', userId).single()
      if (!profile) {
        await admin.from('profiles').insert({
          id: userId, full_name, email, phone, role: 'student', must_change_password: false
        })
      }
    } else {
      plainPassword = generatePassword()
      const { data: newUser, error } = await admin.auth.admin.createUser({
        email,
        password: plainPassword,
        email_confirm: true,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      userId = newUser.user.id

      await admin.from('profiles').insert({
        id: userId,
        full_name,
        email,
        phone,
        role: 'student',
        must_change_password: true,
      })
    }

    // Add to cohort (ignore duplicate)
    const { error: csError } = await admin
      .from('cohort_students')
      .insert({ cohort_id, student_id: userId })

    if (csError && !csError.message.includes('duplicate')) {
      return NextResponse.json({ error: csError.message }, { status: 400 })
    }

    // Send welcome email only for new users
    if (plainPassword) {
      try {
        await sendWelcomeEmail(email, full_name, plainPassword, cohort_name || 'your cohort')
      } catch (e) {
        console.error('Email failed:', e)
      }
    }

    return NextResponse.json({ ok: true, userId }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
