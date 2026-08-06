import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function GET() {
  const results: Record<string, { ok: boolean; message: string; latencyMs?: number }> = {}

  // Supabase check — simple query against a known table
  const t1 = Date.now()
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    results.supabase = error
      ? { ok: false, message: error.message }
      : { ok: true, message: 'Connected', latencyMs: Date.now() - t1 }
  } catch (e: any) {
    results.supabase = { ok: false, message: e.message ?? 'Unknown error' }
  }

  // Resend check — validate API key only, no email sent
  const t2 = Date.now()
  try {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.domains.list()
    results.resend = error
      ? { ok: false, message: (error as any).message ?? 'Auth failed' }
      : { ok: true, message: 'API key valid', latencyMs: Date.now() - t2 }
  } catch (e: any) {
    results.resend = { ok: false, message: e.message ?? 'Unknown error' }
  }

  const allOk = Object.values(results).every(r => r.ok)
  return NextResponse.json({ status: allOk ? 'ok' : 'degraded', checks: results }, {
    status: allOk ? 200 : 503,
  })
}

export async function POST() {
  try {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.RESEND_FROM_EMAIL || 'assessments@yourdomain.com'
    const t = Date.now()
    const { error } = await resend.emails.send({
      from,
      to: 'dinesh.k.wadhwani@gmail.com',
      subject: '✅ Symbi Assess — Email Delivery Test',
      html: `
        <div style="font-family: Inter, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; padding: 32px 16px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 28px 32px; color: white;">
              <div style="font-size: 20px; font-weight: 800; margin-bottom: 4px;">Symbi Assess</div>
              <div style="font-size: 12px; opacity: 0.75;">Assessment Platform · Symbiosis Institute of Technology</div>
            </div>
            <div style="padding: 28px 32px;">
              <h2 style="color: #1e293b; margin: 0 0 12px; font-size: 18px;">Email Delivery Test</h2>
              <p style="color: #475569; line-height: 1.65; margin: 0 0 20px; font-size: 14px;">
                This is an automated test email sent from the Symbi Assess health check system.
                If you received this, the Resend email pipeline is working correctly.
              </p>
              <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #15803d; margin-bottom: 6px;">✅ DELIVERY CONFIRMED</div>
                <div style="font-size: 13px; color: #166534;">Sent at: ${new Date().toUTCString()}</div>
              </div>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">You are receiving this because you are listed as the system administrator for Symbi Assess.</p>
            </div>
          </div>
        </div>
      `,
    })
    if (error) return NextResponse.json({ ok: false, message: (error as any).message ?? 'Send failed' }, { status: 400 })
    return NextResponse.json({ ok: true, message: `Test email sent · ${Date.now() - t}ms` })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message ?? 'Unknown error' }, { status: 500 })
  }
}
