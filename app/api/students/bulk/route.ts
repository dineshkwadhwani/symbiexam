import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail, sendCohortAddedEmail } from '@/lib/email'
import { generatePassword } from '@/lib/auth'

interface StudentRow {
  full_name: string
  email: string
  phone?: string
  prn_id?: string
}

type PendingEmail =
  | { type: 'welcome'; email: string; name: string; password: string }
  | { type: 'cohort'; email: string; name: string }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { students, cohort_id, cohort_name }: { students: StudentRow[]; cohort_id: string; cohort_name: string } = body
    const admin = createAdminClient()

    const results: { email: string; status: 'added' | 'exists' | 'error'; error?: string }[] = []
    const pendingEmails: PendingEmail[] = []

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
          pendingEmails.push({ type: 'cohort', email: s.email, name: profile?.full_name ?? s.full_name })
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
          pendingEmails.push({ type: 'welcome', email: s.email, name: s.full_name, password: pw })
          results.push({ email: s.email, status: 'added' })
        }
      } catch (e: any) {
        results.push({ email: s.email, status: 'error', error: e.message })
      }
    }

    void (async () => {
      for (const e of pendingEmails) {
        try {
          if (e.type === 'welcome') await sendWelcomeEmail(e.email, e.name, e.password, cohort_name)
          else await sendCohortAddedEmail(e.email, e.name, cohort_name)
        } catch {}
      }
    })()

    return NextResponse.json({ results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { action, student_ids }: { action: string; student_ids: string[] } = await req.json()
    if (action !== 'resend_welcome' || !Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Collect data for all students before firing emails
    const pendingEmails: { email: string; name: string; password: string; cohortName: string }[] = []

    for (const id of student_ids) {
      const { data: profile } = await admin.from('profiles').select('email, full_name').eq('id', id).single()
      if (!profile) continue

      const newPw = generatePassword()
      await admin.auth.admin.updateUserById(id, { password: newPw })
      await admin.from('profiles').update({ must_change_password: true }).eq('id', id)

      const { data: cohortRows } = await admin
        .from('cohort_students')
        .select('cohort:cohorts(name)')
        .eq('student_id', id)
        .limit(1)
      const cohortName = (cohortRows?.[0]?.cohort as any)?.name ?? 'your cohort'

      pendingEmails.push({ email: profile.email, name: profile.full_name, password: newPw, cohortName })
    }

    void (async () => {
      for (const e of pendingEmails) {
        try { await sendWelcomeEmail(e.email, e.name, e.password, e.cohortName) } catch {}
      }
    })()

    return NextResponse.json({ ok: true, count: pendingEmails.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
