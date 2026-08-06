'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const { data: profile } = await supabase.from('profiles').select('role, must_change_password').eq('id', data.user.id).single()

      if (profile?.must_change_password) {
        router.push('/change-password')
      } else if (profile?.role === 'teacher') {
        router.push('/teacher/dashboard')
      } else {
        router.push('/student/dashboard')
      }
    } catch (e: any) {
      toast.error(e.message || 'Login failed')
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
          <h2>Welcome back</h2>
          <p>Sign in to your assessment account</p>
        </div>
        <div className="auth-card-body">
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div style={{ marginTop: 20, padding: 14, background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--slate-500)' }}>
            <strong style={{ color: 'var(--slate-600)' }}>Students:</strong> Use the credentials sent to your email. You will be prompted to change your password on first login.
          </div>
        </div>
      </div>
    </div>
  )
}
