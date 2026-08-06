'use client'
import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import toast from 'react-hot-toast'

export default function ResultsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [assessments, setAssessments] = useState<any[]>([])
  const [cohorts, setCohorts] = useState<any[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState('')
  const [selectedCohort, setSelectedCohort] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [detailPaper, setDetailPaper] = useState<any | null>(null)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      const [ar, cr] = await Promise.all([fetch('/api/assessments'), fetch('/api/cohorts')])
      const [ad, cd] = await Promise.all([ar.json(), cr.json()])
      setAssessments(ad.assessments ?? [])
      setCohorts(cd.cohorts ?? [])
    }
    init()
  }, [])

  async function search() {
    if (!selectedAssessment) return toast.error('Select an assessment')
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('student_papers')
      .select('*, student:profiles(*), assessment:assessments(*), assignment:assignments(cohort_id, cohort:cohorts(name))')
      .eq('assessment_id', selectedAssessment)
      .order('submitted_at', { ascending: false })

    if (selectedCohort) {
      query = query.eq('assignment.cohort_id', selectedCohort)
    }

    const { data } = await query
    setResults(data ?? [])
    setLoading(false)
  }

  async function openDetail(paper: any) {
    const res = await fetch(`/api/papers/${paper.id}/teacher`)
    const data = await res.json()
    setDetailPaper(data)
  }

  function printResults() {
    const printWin = window.open('', '_blank')
    if (!printWin) return
    const assessment = assessments.find(a => a.id === selectedAssessment)
    const cohort = cohorts.find(c => c.id === selectedCohort)
    const rows = results.filter(r => r.status === 'completed').map(r =>
      `<tr><td>${r.student?.full_name}</td><td>${r.student?.email}</td><td>${r.score ?? '-'} / ${assessment?.total_marks}</td><td>${r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-IN') : '-'}</td></tr>`
    ).join('')
    printWin.document.write(`
      <html><head><title>Results</title>
      <style>body{font-family:sans-serif;padding:24px}h1{font-size:18px;margin-bottom:4px}p{color:#64748b;font-size:13px;margin-bottom:20px}table{width:100%;border-collapse:collapse}th,td{padding:10px 12px;border:1px solid #e2e8f0;font-size:13px;text-align:left}th{background:#f8fafc;font-weight:600}</style>
      </head><body>
      <h1>${assessment?.name} — Results</h1>
      <p>${cohort?.name || 'All students'} · Printed ${new Date().toLocaleDateString('en-IN')}</p>
      <table><thead><tr><th>Name</th><th>Email</th><th>Score</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>
    `)
    printWin.document.close()
    printWin.print()
  }

  if (!profile) return <div className="loading-page"><span className="spinner" /></div>

  return (
    <AppShell profile={profile}>
      <div className="page-header">
        <h1>Results</h1>
        <p>View and analyse student performance</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div className="form-row" style={{ alignItems: 'flex-end', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Assessment</label>
              <select className="form-select" value={selectedAssessment} onChange={e => setSelectedAssessment(e.target.value)}>
                <option value="">— All assessments —</option>
                {assessments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Cohort</label>
              <select className="form-select" value={selectedCohort} onChange={e => setSelectedCohort(e.target.value)}>
                <option value="">— All cohorts —</option>
                {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={search} disabled={loading}>{loading ? 'Loading…' : 'Search'}</button>
              {results.length > 0 && <button className="btn btn-secondary" onClick={printResults}>🖨 Print</button>}
            </div>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>{results.length} result{results.length !== 1 ? 's' : ''}</h3>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                <span>Avg: <strong style={{ color: 'var(--blue-600)' }}>
                  {(results.filter(r => r.score != null).reduce((s, r) => s + Number(r.score), 0) / Math.max(1, results.filter(r => r.score != null).length)).toFixed(1)}
                </strong></span>
                <span>Completed: <strong>{results.filter(r => r.status === 'completed').length}</strong></span>
                <span>Pending: <strong>{results.filter(r => r.status === 'pending').length}</strong></span>
              </div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Cohort</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => {
                  const assessment = assessments.find(a => a.id === r.assessment_id)
                  const pct = r.score != null && assessment ? Math.round((r.score / assessment.total_marks) * 100) : null
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.student?.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{r.student?.email}</div>
                      </td>
                      <td style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>{r.assignment?.cohort?.name || '—'}</td>
                      <td>
                        <span className={`badge ${r.status === 'completed' ? 'badge-green' : r.status === 'in_progress' ? 'badge-amber' : 'badge-gray'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {r.score != null ? (
                          <span style={{ fontWeight: 700, color: pct! >= 60 ? 'var(--green-600)' : 'var(--red-600)' }}>
                            {r.score} <span style={{ fontWeight: 400, color: 'var(--slate-400)' }}>/ {assessment?.total_marks}</span>
                            {pct != null && <span style={{ marginLeft: 6, fontSize: '0.75rem' }}>({pct}%)</span>}
                          </span>
                        ) : <span style={{ color: 'var(--slate-400)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
                        {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td>
                        {r.status === 'completed' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openDetail(r)}>View</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailPaper && (
        <PaperDetailModal data={detailPaper} assessment={assessments.find(a => a.id === detailPaper.paper?.assessment_id)} onClose={() => setDetailPaper(null)} />
      )}
    </AppShell>
  )
}

function PaperDetailModal({ data, assessment, onClose }: any) {
  const { paper, questions } = data
  const student = paper?.student

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720, maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ fontWeight: 700 }}>{student?.full_name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-400)' }}>{student?.email} · Score: {paper.score} / {assessment?.total_marks}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '70vh' }}>
          {questions.map((pq: any, i: number) => {
            const q = pq.question
            if (!q) return null
            const sel = pq.selected_answer
            const isCorrect = pq.is_correct
            return (
              <div key={pq.id} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>Q{i + 1}</span>
                  <span className={`badge ${isCorrect ? 'badge-green' : sel ? 'badge-red' : 'badge-gray'}`}>
                    {isCorrect ? '✓ Correct' : sel ? '✗ Wrong' : 'Skipped'}
                  </span>
                  {q.co && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', borderRadius: 5, padding: '2px 8px' }}>
                      CO: {q.co}
                    </span>
                  )}
                  {q.bloom_label && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#fdf4ff', color: '#7e22ce', borderRadius: 5, padding: '2px 8px' }}>
                      {q.bloom_label}{q.bloom_level ? ` (L${q.bloom_level})` : ''}
                    </span>
                  )}
                  {q.topic_name && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--slate-500)', background: 'var(--slate-100)', borderRadius: 5, padding: '2px 8px' }}>
                      {q.topic_number ? `${q.topic_number} · ` : ''}{q.topic_name}
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 600, color: 'var(--slate-800)', marginBottom: 10, lineHeight: 1.5 }}>{q.question_text}</div>
                {['A','B','C','D'].map(opt => {
                  let cls = 'quiz-option'
                  if (opt === q.correct_answer) cls += ' correct'
                  else if (opt === sel && !isCorrect) cls += ' incorrect'
                  return (
                    <button key={opt} className={cls} style={{ marginBottom: 8, cursor: 'default' }}>
                      <span className="quiz-option-key">{opt}</span>
                      <span className="quiz-option-text">{q[`option_${opt.toLowerCase()}`]}</span>
                    </button>
                  )
                })}
                {q.explanation && <div className="quiz-explanation"><strong>Explanation:</strong> {q.explanation}</div>}
              </div>
            )
          })}
        </div>
        <div className="modal-footer"><button className="btn btn-primary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  )
}
