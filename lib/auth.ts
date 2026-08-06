import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from './types'

export async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireAuth(): Promise<Profile> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  if (profile.must_change_password) {
    redirect('/change-password')
  }

  return profile as Profile
}

export async function requireTeacher(): Promise<Profile> {
  const profile = await requireAuth()
  if (profile.role !== 'teacher') redirect('/student/dashboard')
  return profile
}

export async function requireStudent(): Promise<Profile> {
  const profile = await requireAuth()
  if (profile.role !== 'student') redirect('/teacher/dashboard')
  return profile
}

export function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
