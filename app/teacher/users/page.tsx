'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any | null>(null)
  const [detailPaper, setDetailPaper] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || p.role !== 'teacher') { router.push('/login'); return }
      setProfile(p)
      const res = await fetch('/api/teacher/students')
      const data = await res.json()
      if (data.error) toast.error(data.error)
      setStudents(data.students ?? [])
      setLoading(false)
    }
    init()
  }, [])

  async function openPaperDetail(paper: any) {
    setDetailLoading(true)
    const res = await fetch(`/api/papers/${paper.id}/teacher`)
    const data = await res.json()
    if (data.error) toast.error(data.error)
    else setDetailPaper(data)
    setDetailLoading(false)
  }

  if (!profile) return <div className="loading-page"><span className="spinner" /></div>

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.prn_id?.toLowerCase().includes(search.toLowerCase())
  )

  // ── Detail view ─────────────────────────────────────────────
  if (detailPaper) {
    const paper = detailPaper.paper
    const questions = detailPaper.questions ?? []
    const a = paper?.assessment
    return (
      <AppShell profile={profile}>
        <div className="breadcrumb">
          <span className="breadcrumb-item" onClick={() => setDetailPaper(null)}>
            {selected?.full_name}
          </span>
          <span className="breadcrumb-sep">›</span>
          <span>{a?.name}</span>
        </div>
        <div className="page-header">
          <h1>{a?.name}</h1>
          <p>Assessment detail for {paper?.student?.full_name}</p>
        </div>
        <div style={{ maxWidth: 760 }}>
          <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--blue-600), var(--blue-800))', padding: '20px 24px', color: 'white', display: 'flex', gap: 32, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>SCORE</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{paper.score ?? '—'}<span style={{ fontSize: '1rem', opacity: 0.7 }}> / {a?.total_marks}</span></div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>CORRECT</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{questions.filter((q: any) => q.is_correct).length} / {questions.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>SUBMITTED</div>
                <div style={{ fontSize: '0.9rem' }}>{paper.submitted_at ? new Date(paper.submitted_at).toLocaleString('en-IN') : '—'}</div>
              </div>
            </div>
          </div>
          {questions.map((pq: any, i: number) => {
            const q = pq.question
            if (!q) return null
            const sel = pq.selected_answer
            const isCorrect = pq.is_correct
            return (
              <div key={pq.id} className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'center', gap: 10, background: isCorrect ? 'var(--green-50)' : sel ? 'var(--red-50)' : 'var(--slate-50)' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)' }}>Q{i + 1}</span>
                  <span className={`badge ${isCorrect ? 'badge-green' : sel ? 'badge-red' : 'badge-gray'}`}>
                    {isCorrect ? '✓ Correct' : sel ? '✗ Incorrect' : '— Skipped'}
                  </span>
                  {q.co && <span className="badge badge-blue">{q.co}</span>}
                  {q.bloom_label && <span className="badge" style={{ background: 'var(--purple-50)', color: 'var(--purple-700)' }}>{q.bloom_label}</span>}
                </div>
                <div className="card-body">
                  <div style={{ fontWeight: 600, color: 'var(--slate-800)', marginBottom: 12 }}>{q.question_text}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['A', 'B', 'C', 'D'].map(opt => {
                      const isCorrectOpt = opt === q.correct_answer
                      const isSelectedWrong = opt === sel && !isCorrectOpt
                      return (
                        <div key={opt} className={`quiz-option ${isCorrectOpt ? 'correct' : isSelectedWrong ? 'incorrect' : ''}`} style={{ cursor: 'default' }}>
                          <span className="quiz-option-key">{opt}</span>
                          <span className="quiz-option-text" style={{ flex: 1 }}>{q[`option_${opt.toLowerCase()}`]}</span>
                          {isCorrectOpt && <span style={{ fontSize: '0.75rem', color: 'var(--green-600)', fontWeight: 600 }}>✓ Correct</span>}
                          {isSelectedWrong && <span style={{ fontSize: '0.75rem', color: 'var(--red-600)', fontWeight: 600 }}>Student's answer</span>}
                        </div>
                      )
                    })}
                  </div>
                  {q.explanation && <div className="quiz-explanation" style={{ marginTop: 12 }}><strong>Explanation:</strong> {q.explanation}</div>}
                </div>
              </div>
            )
          })}
          <div style={{ paddingBottom: 32 }}>
            <button className="btn btn-secondary" onClick={() => setDetailPaper(null)}>← Back to Student</button>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Student detail view ──────────────────────────────────────
  if (selected) {
    const completed = selected.papers.filter((p: any) => p.status === 'completed')
    const pending = selected.papers.filter((p: any) => p.status !== 'completed')
    return (
      <AppShell profile={profile}>
        <div className="breadcrumb">
          <span className="breadcrumb-item" onClick={() => setSelected(null)}>Students</span>
          <span className="breadcrumb-sep">›</span>
          <span>{selected.full_name}</span>
        </div>
        <div className="page-header">
          <h1>{selected.full_name}</h1>
          <p>Student profile &amp; assessment history</p>
        </div>
        <div style={{ maxWidth: 760 }}>
          {/* Profile card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><h3 style={{ margin: 0 }}>Profile</h3></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: 4 }}>Full Name</div>
                  <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{selected.full_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: 4 }}>PRN ID</div>
                  <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{selected.prn_id || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: 4 }}>Email</div>
                  <div style={{ color: 'var(--slate-700)' }}>{selected.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: 4 }}>Phone</div>
                  <div style={{ color: 'var(--slate-700)' }}>{selected.phone || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: 4 }}>Cohorts</div>
                  <div style={{ color: 'var(--slate-700)' }}>{selected.cohorts.join(', ') || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: 4 }}>Added on</div>
                  <div style={{ color: 'var(--slate-700)' }}>{new Date(selected.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--blue-600)' }}>{selected.total_assessments}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Total Assigned</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--green-600)' }}>{selected.completed_assessments}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Completed</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-400)' }}>{selected.total_assessments - selected.completed_assessments}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Pending</div>
            </div>
          </div>

          {/* Assessments */}
          <h3 style={{ marginBottom: 12, color: 'var(--slate-800)' }}>Assessments</h3>
          {selected.papers.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--slate-400)' }}>No assessments assigned yet.</div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Assessment</th><th>Status</th><th>Score</th><th>Submitted</th><th></th></tr>
                  </thead>
                  <tbody>
                    {selected.papers.map((p: any) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.assessment?.name ?? '—'}</td>
                        <td>
                          <span className={`badge ${p.status === 'completed' ? 'badge-green' : p.status === 'in_progress' ? 'badge-amber' : 'badge-gray'}`}>
                            {p.status === 'completed' ? 'Completed' : p.status === 'in_progress' ? 'In Progress' : 'Pending'}
                          </span>
                        </td>
                        <td>{p.status === 'completed' ? `${p.score} / ${p.assessment?.total_marks}` : '—'}</td>
                        <td style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>
                          {p.submitted_at ? new Date(p.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td>
                          {p.status === 'completed' && (
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blue-600)' }} onClick={() => openPaperDetail(p)} disabled={detailLoading}>
                              View Detail
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div style={{ paddingBottom: 32, marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setSelected(null)}>← Back to Students</button>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Student list view ────────────────────────────────────────
  return (
    <AppShell profile={profile}>
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Students</h1>
          <p>All students across your cohorts</p>
        </div>
      </div>
      <div style={{ height: 20 }} />

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          className="form-input"
          style={{ maxWidth: 340 }}
          placeholder="Search by name, email or PRN…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-page"><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <h3>{search ? 'No students match your search' : 'No students yet'}</h3>
          <p>Add students to your cohorts to see them here.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>PRN ID</th>
                  <th>Email</th>
                  <th>Cohorts</th>
                  <th>Status</th>
                  <th>Assessments</th>
                  <th>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const isNew = s.total_assessments === 0 && !s.last_activity
                  return (
                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(s)}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--blue-600)' }}>{s.full_name}</div>
                      </td>
                      <td style={{ color: 'var(--slate-500)' }}>{s.prn_id || '—'}</td>
                      <td style={{ color: 'var(--slate-500)' }}>{s.email}</td>
                      <td style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>{s.cohorts.join(', ')}</td>
                      <td>
                        <span className={`badge ${isNew ? 'badge-gray' : 'badge-green'}`}>
                          {isNew ? 'New' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{s.completed_assessments}</span>
                        <span style={{ color: 'var(--slate-400)', fontSize: '0.85rem' }}> / {s.total_assessments}</span>
                      </td>
                      <td style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>
                        {s.last_activity ? new Date(s.last_activity).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  )
}
