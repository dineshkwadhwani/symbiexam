'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    if (password !== confirm) return toast.error('Passwords do not match')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Password changed! Welcome aboard.')

      // Re-check role
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
      router.push(profile?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="auth-card-header">
          <div className="auth-logo">
            <div className="auth-logo-mark">SA</div>
            <div className="auth-logo-name">Symbi Assess</div>
          </div>
          <h2>Set your password</h2>
          <p>Choose a new password to secure your account</p>
        </div>
        <div className="auth-card-body">
          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            This is your first login. Please set a personal password.
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New password</label>
              <input type="password" className="form-input" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input type="password" className="form-input" placeholder="Repeat your password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Saving…' : 'Set password & continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
