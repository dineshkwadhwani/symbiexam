import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'assessments@yourdomain.com'
const FROM_NAME = process.env.RESEND_FROM_NAME || 'Exam Studio'
const FROM = FROM_NAME ? `${FROM_NAME} <${FROM_EMAIL}>` : FROM_EMAIL
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const emailDelay = () => new Promise(res => setTimeout(res, Number(process.env.EMAIL_SEND_DELAY_MS ?? 1000)))

export async function sendWelcomeEmail(
  to: string,
  name: string,
  password: string,
  cohortName: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to Symbi Assess — You've been added to ${cohortName}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 540px; margin: 0 auto; background: #f8fafc; padding: 32px 16px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 28px 32px; color: white;">
            <div style="font-size: 22px; font-weight: 800; margin-bottom: 4px;">Symbi Assess</div>
            <div style="font-size: 13px; opacity: 0.8;">Assessment Platform · Symbiosis Institute of Technology</div>
          </div>
          <div style="padding: 28px 32px;">
            <h2 style="color: #1e293b; margin: 0 0 16px;">Hello, ${name}!</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 20px;">
              You have been added to the cohort <strong>${cohortName}</strong> on Symbi Assess.
            </p>
            <div style="background: #eff6ff; border-radius: 10px; padding: 18px 20px; margin: 0 0 24px;">
              <div style="font-size: 13px; color: #3b82f6; font-weight: 600; margin-bottom: 8px;">YOUR LOGIN CREDENTIALS</div>
              <div style="margin-bottom: 6px;"><span style="color: #64748b; font-size: 13px;">Email:</span> <strong style="color: #1e293b;">${to}</strong></div>
              <div><span style="color: #64748b; font-size: 13px;">Password:</span> <strong style="color: #1e293b; font-family: monospace; font-size: 15px;">${password}</strong></div>
            </div>
            <p style="color: #64748b; font-size: 13px; margin: 0 0 20px;">
              ⚠️ You will be required to change your password on first login.
            </p>
            <a href="${APP_URL}/login" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Login to Symbi Assess →
            </a>
          </div>
          <div style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">This email was sent by Symbi Assess. If you did not expect this, please contact your teacher.</p>
          </div>
        </div>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, name: string, newPassword: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Symbi Assess — Your password has been reset',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 540px; margin: 0 auto; background: #f8fafc; padding: 32px 16px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 28px 32px; color: white;">
            <div style="font-size: 22px; font-weight: 800; margin-bottom: 4px;">Symbi Assess</div>
            <div style="font-size: 13px; opacity: 0.8;">Assessment Platform · Symbiosis Institute of Technology</div>
          </div>
          <div style="padding: 28px 32px;">
            <h2 style="color: #1e293b; margin: 0 0 16px;">Hello, ${name}!</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 20px;">
              Your password on Symbi Assess has been reset by your teacher. Use the temporary password below to log in, then change it immediately.
            </p>
            <div style="background: #eff6ff; border-radius: 10px; padding: 18px 20px; margin: 0 0 24px;">
              <div style="font-size: 13px; color: #3b82f6; font-weight: 600; margin-bottom: 8px;">YOUR NEW TEMPORARY PASSWORD</div>
              <div style="font-family: monospace; font-size: 22px; font-weight: 800; color: #1e293b; letter-spacing: 2px;">${newPassword}</div>
            </div>
            <a href="${APP_URL}/login" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Log in now →
            </a>
            <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0;">If you did not expect this, contact your teacher immediately.</p>
          </div>
        </div>
      </div>
    `,
  })
  await emailDelay()
}

export async function sendCohortAddedEmail(to: string, name: string, cohortName: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `You've been added to ${cohortName}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 540px; margin: 0 auto; background: #f8fafc; padding: 32px 16px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 28px 32px; color: white;">
            <div style="font-size: 22px; font-weight: 800; margin-bottom: 4px;">Exam Studio</div>
          </div>
          <div style="padding: 28px 32px;">
            <h2 style="color: #1e293b; margin: 0 0 16px;">Hello, ${name}!</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 20px;">
              You have been added to a new cohort: <strong>${cohortName}</strong>.
            </p>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 20px;">
              Log in using your existing credentials to access your dashboard.
            </p>
            <a href="${APP_URL}/login" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Go to Dashboard →
            </a>
          </div>
          <div style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">If you did not expect this, please contact your teacher.</p>
          </div>
        </div>
      </div>
    `,
  })
  await emailDelay()
}

export async function sendAssessmentAssignedEmail(
  to: string,
  name: string,
  assessmentName: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `New Assessment Assigned: ${assessmentName}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 540px; margin: 0 auto; background: #f8fafc; padding: 32px 16px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 28px 32px; color: white;">
            <div style="font-size: 22px; font-weight: 800; margin-bottom: 4px;">Symbi Assess</div>
            <div style="font-size: 13px; opacity: 0.8;">Assessment Platform</div>
          </div>
          <div style="padding: 28px 32px;">
            <h2 style="color: #1e293b; margin: 0 0 16px;">Hi ${name}, a new assessment is waiting!</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 20px;">
              Your teacher has assigned you a new assessment:
            </p>
            <div style="background: #eff6ff; border-radius: 10px; padding: 18px 20px; margin: 0 0 24px;">
              <div style="font-size: 18px; font-weight: 700; color: #1e293b;">${assessmentName}</div>
            </div>
            <p style="color: #64748b; font-size: 13px; margin: 0 0 20px;">
              Log in to your dashboard to view and start the assessment when you are ready.
            </p>
            <a href="${APP_URL}/student/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Go to My Dashboard →
            </a>
          </div>
        </div>
      </div>
    `,
  })
  await emailDelay()
}
