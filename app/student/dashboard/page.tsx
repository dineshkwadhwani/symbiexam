'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import type { Profile, StudentPaper } from '@/lib/types'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function StudentDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [papers, setPapers] = useState<StudentPaper[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (!p) { router.push('/login'); return }
        setProfile(p)
        const res = await fetch('/api/papers')
        const data = await res.json()
        setPapers(data.papers ?? [])
      } catch (e) {
        toast.error('Failed to load dashboard')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function startAssessment(paper: StudentPaper) {
    if (!paper.assessment?.is_active) return toast.error('This assessment is not active yet.')
    if (paper.status === 'completed') return toast.error('You have already completed this assessment.')

    router.push(`/student/assessment/${paper.id}`)
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m${s > 0 ? ` ${s}s` : ''}` : `${s}s`
  }

  if (!profile) return <div className="loading-page"><span className="spinner" /> Loading…</div>

  const pending = papers.filter(p => p.status === 'pending')
  const inProgress = papers.filter(p => p.status === 'in_progress')
  const completed = papers.filter(p => p.status === 'completed')

  return (
    <AppShell profile={profile}>
      <div className="page-header">
        <h1>My Assessments</h1>
        <p>Welcome, {profile.full_name.split(' ')[0]}. Here are your assigned assessments.</p>
      </div>

      {loading ? (
        <div className="loading-page"><span className="spinner" /></div>
      ) : papers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
          <h3>No assessments assigned yet</h3>
          <p>Your teacher will assign assessments to you. You'll receive an email when one is ready.</p>
        </div>
      ) : (
        <div>
          {inProgress.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--amber-600)', marginBottom: 14 }}>● In Progress</div>
              <AssessmentGrid papers={inProgress} profile={profile} onStart={startAssessment} onView={p => router.push(`/student/result/${p.id}`)} formatTime={formatTime} />
            </div>
          )}
          {pending.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--slate-500)', marginBottom: 14 }}>Pending</div>
              <AssessmentGrid papers={pending} profile={profile} onStart={startAssessment} onView={p => router.push(`/student/result/${p.id}`)} formatTime={formatTime} />
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--green-600)', marginBottom: 14 }}>✓ Completed</div>
              <AssessmentGrid papers={completed} profile={profile} onStart={startAssessment} onView={p => router.push(`/student/result/${p.id}`)} formatTime={formatTime} />
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}

function AssessmentGrid({ papers, profile, onStart, onView, formatTime }: any) {
  return (
    <div className="assessment-grid">
      {papers.map((p: StudentPaper) => {
        const a = p.assessment as any
        const isActive = a?.is_active
        const isDone = p.status === 'completed'
        const isInProgress = p.status === 'in_progress'

        return (
          <div key={p.id} className="assessment-tile">
            <div className="assessment-tile-header">
              <div style={{ flex: 1 }}>
                <div className="assessment-tile-title">{a?.name}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className={`badge ${isDone ? 'badge-green' : isInProgress ? 'badge-amber' : isActive ? 'badge-blue' : 'badge-gray'}`}>
                    {isDone ? '✓ Completed' : isInProgress ? '● In progress' : isActive ? 'Active' : 'Not active'}
                  </span>
                </div>
              </div>
            </div>

            <div className="assessment-tile-meta">
              <span className="assessment-meta-item">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {a?.total_questions} questions
              </span>
              {a?.total_time_seconds && (
                <span className="assessment-meta-item">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>
                  {formatTime(a.total_time_seconds)}
                </span>
              )}
              {a?.time_per_question && (
                <span className="assessment-meta-item">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {a.time_per_question}s/Q
                </span>
              )}
              <span className="assessment-meta-item">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                {a?.total_marks} marks
              </span>
            </div>

            {isDone && p.score != null && (
              <div style={{ background: 'var(--blue-50)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>Your score</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--blue-700)' }}>
                  {p.score} / {a?.total_marks}
                </span>
              </div>
            )}

            <div className="assessment-tile-actions">
              {isDone ? (
                <button className="btn btn-primary btn-sm w-full" style={{ justifyContent: 'center' }} onClick={() => onView(p)}>
                  View Result
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-sm w-full"
                  style={{ justifyContent: 'center' }}
                  disabled={!isActive}
                  onClick={() => onStart(p)}
                >
                  {isInProgress ? 'Continue' : isActive ? 'Start Assessment' : 'Not active'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
