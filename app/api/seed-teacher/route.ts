import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const email = 'dinesh.k.wadhwani@gmail.com'
  const password = 'SymbiTeacher@2024'

  // Check if already exists
  const { data: users } = await admin.auth.admin.listUsers()
  const existing = users?.users?.find((u: any) => u.email === email)

  if (existing) {
    // Ensure profile exists
    const { data: profile } = await admin.from('profiles').select('id').eq('id', existing.id).single()
    if (!profile) {
      await admin.from('profiles').insert({
        id: existing.id,
        full_name: 'Dinesh Wadhwani',
        email,
        phone: '9767676738',
        role: 'teacher',
        must_change_password: false,
      })
    }
    return NextResponse.json({ message: 'Teacher already exists', email })
  }

  const { data: newUser, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from('profiles').insert({
    id: newUser.user.id,
    full_name: 'Dinesh Wadhwani',
    email,
    phone: '9767676738',
    role: 'teacher',
    must_change_password: false,
  })

  return NextResponse.json({ message: 'Teacher created', email, password })
}
