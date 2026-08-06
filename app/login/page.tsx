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
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setForgotLoading(true)
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail }),
    })
    setForgotLoading(false)
    setForgotSent(true)
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div className="auth-card-header">
          <div className="auth-logo">
            <div className="auth-logo-mark">DW</div>
            <div className="auth-logo-name">Exam Studio</div>
          </div>
          {!showForgot ? (
            <>
              <h2>Sign in</h2>
              <p>Sign in to your assessment account</p>
            </>
          ) : (
            <>
              <h2>Retrieve Password</h2>
              <p>Enter your email to receive a new password</p>
            </>
          )}
        </div>
        <div className="auth-card-body">
          {!showForgot ? (
            <>
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
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--blue-600)', fontSize: '0.875rem' }}
                  onClick={() => { setShowForgot(true); setForgotSent(false); setForgotEmail('') }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ marginTop: 12, padding: 14, background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                <strong style={{ color: 'var(--slate-600)' }}>Students:</strong> Use the credentials sent to your email. You will be prompted to change your password on first login.
              </div>
            </>
          ) : forgotSent ? (
            <div>
              <div className="alert alert-info" style={{ marginBottom: 20 }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <div>
                  <strong>Check your inbox</strong>
                  <div style={{ marginTop: 4, fontSize: '0.85rem' }}>
                    If an account exists for <strong>{forgotEmail}</strong>, a new temporary password has been sent. Please check your email and use it to log in.
                  </div>
                </div>
              </div>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => setShowForgot(false)}>
                Back to Sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={forgotLoading}>
                {forgotLoading ? <span className="spinner" /> : null}
                {forgotLoading ? 'Sending…' : 'Retrieve Password'}
              </button>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }} onClick={() => setShowForgot(false)}>
                  ← Back to Sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
