import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendWelcomeEmail, sendCohortAddedEmail } from '@/lib/email'
import { generatePassword } from '@/lib/auth'

interface StudentRow {
  full_name: string
  email: string
  phone?: string
  prn_id?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { students, cohort_id, cohort_name }: { students: StudentRow[]; cohort_id: string; cohort_name: string } = body
    const admin = createAdminClient()

    const results: { email: string; status: 'added' | 'exists' | 'error'; error?: string }[] = []

    for (const s of students) {
      try {
        const { data: existingUsers } = await admin.auth.admin.listUsers()
        const existing = existingUsers?.users?.find((u: any) => u.email === s.email)

        let userId: string

        if (existing) {
          userId = existing.id
          const { data: profile } = await admin.from('profiles').select('id, full_name').eq('id', userId).single()
          if (!profile) {
            await admin.from('profiles').insert({
              id: userId, full_name: s.full_name, email: s.email, phone: s.phone, prn_id: s.prn_id,
              role: 'student', must_change_password: false
            })
          }
          await admin.from('cohort_students').insert({ cohort_id, student_id: userId }).select()
          try { await sendCohortAddedEmail(s.email, profile?.full_name ?? s.full_name, cohort_name) } catch {}
          results.push({ email: s.email, status: 'exists' })
        } else {
          const pw = generatePassword()
          const { data: newUser, error } = await admin.auth.admin.createUser({
            email: s.email,
            password: pw,
            email_confirm: true,
          })
          if (error) throw error

          userId = newUser.user.id
          await admin.from('profiles').insert({
            id: userId,
            full_name: s.full_name,
            email: s.email,
            phone: s.phone,
            prn_id: s.prn_id,
            role: 'student',
            must_change_password: true,
          })
          await admin.from('cohort_students').insert({ cohort_id, student_id: userId })

          try {
            await sendWelcomeEmail(s.email, s.full_name, pw, cohort_name)
          } catch {}

          results.push({ email: s.email, status: 'added' })
        }
      } catch (e: any) {
        results.push({ email: s.email, status: 'error', error: e.message })
      }
    }

    return NextResponse.json({ results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
