'use client'
import { useState, useEffect } from 'react'

type CheckResult = { ok: boolean; message: string; latencyMs?: number }
type HealthData = { status: 'ok' | 'degraded'; checks: Record<string, CheckResult> }

const ICONS: Record<string, string> = {
  supabase: '🗄️',
  resend: '📧',
}

const LABELS: Record<string, string> = {
  supabase: 'Supabase Database',
  resend: 'Resend Email',
}

export default function HealthCheckPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function runCheck() {
    setLoading(true)
    setEmailResult(null)
    try {
      const res = await fetch('/api/healthcheck')
      const json = await res.json()
      setData(json)
      setLastChecked(new Date())
    } finally {
      setLoading(false)
    }
  }

  async function sendTestEmail() {
    setEmailSending(true)
    setEmailResult(null)
    try {
      const res = await fetch('/api/healthcheck', { method: 'POST' })
      const json = await res.json()
      setEmailResult(json)
    } finally {
      setEmailSending(false)
    }
  }

  useEffect(() => { runCheck() }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--slate-50, #f8fafc)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--slate-900, #0f172a)', marginBottom: 4 }}>System Health</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--slate-500, #64748b)' }}>
            {lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : 'Checking…'}
          </div>
        </div>

        {data && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '12px 20px', borderRadius: 10, marginBottom: 20,
            background: data.status === 'ok' ? '#f0fdf4' : '#fff7ed',
            border: '1.5px solid ' + (data.status === 'ok' ? '#86efac' : '#fdba74'),
          }}>
            <span style={{ fontSize: 20 }}>{data.status === 'ok' ? '✅' : '⚠️'}</span>
            <span style={{ fontWeight: 700, color: data.status === 'ok' ? '#15803d' : '#c2410c', fontSize: '0.95rem' }}>
              {data.status === 'ok' ? 'All systems operational' : 'One or more services degraded'}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && !data && [1, 2].map(i => (
            <div key={i} style={{ background: 'white', borderRadius: 10, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f1f5f9' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, width: 120, background: '#f1f5f9', borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 11, width: 80, background: '#f8fafc', borderRadius: 4 }} />
              </div>
            </div>
          ))}

          {data && Object.entries(data.checks).map(([key, check]) => (
            <div key={key} style={{
              background: 'white', borderRadius: 10, padding: '16px 20px',
              border: '1px solid ' + (check.ok ? '#e2e8f0' : '#fecaca'),
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  background: check.ok ? '#f0fdf4' : '#fef2f2', flexShrink: 0,
                }}>
                  {ICONS[key] ?? '🔧'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem', marginBottom: 2 }}>{LABELS[key] ?? key}</div>
                  <div style={{ fontSize: '0.8rem', color: check.ok ? '#16a34a' : '#dc2626' }}>
                    {check.message}{check.latencyMs !== undefined ? ' · ' + check.latencyMs + 'ms' : ''}
                  </div>
                </div>
                <div style={{ fontSize: 18 }}>{check.ok ? '✅' : '❌'}</div>
              </div>

              {key === 'resend' && check.ok && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={sendTestEmail}
                    disabled={emailSending}
                    style={{
                      padding: '7px 16px', borderRadius: 7, border: '1px solid #bfdbfe',
                      background: '#eff6ff', fontWeight: 600, fontSize: '0.8rem',
                      color: '#1d4ed8', cursor: emailSending ? 'not-allowed' : 'pointer',
                      opacity: emailSending ? 0.6 : 1,
                    }}
                  >
                    {emailSending ? 'Sending…' : '📤 Send test email to dinesh.k.wadhwani@gmail.com'}
                  </button>
                  {emailResult && (
                    <div style={{ marginTop: 8, fontSize: '0.8rem', color: emailResult.ok ? '#16a34a' : '#dc2626' }}>
                      {emailResult.ok ? '✅' : '❌'} {emailResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            onClick={runCheck}
            disabled={loading}
            style={{
              padding: '9px 22px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: 'white', fontWeight: 600, fontSize: '0.85rem',
              color: '#475569', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Checking…' : '↻ Recheck'}
          </button>
        </div>
      </div>
    </div>
  )
}
