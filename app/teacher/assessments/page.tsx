'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/AppShell'
import toast from 'react-hot-toast'
import type { Profile, Assessment, Cohort } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AssessmentsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [assignModal, setAssignModal] = useState<Assessment | null>(null)
  const [tryModal, setTryModal] = useState<Assessment | null>(null)
  const [uploadModal, setUploadModal] = useState<Assessment | null>(null)
  const [reviewModal, setReviewModal] = useState<Assessment | null>(null)
  const [editModal, setEditModal] = useState<Assessment | null>(null)
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
        const [aRes, cRes] = await Promise.all([fetch('/api/assessments'), fetch('/api/cohorts')])
        const [aData, cData] = await Promise.all([aRes.json(), cRes.json()])
        if (aData.error) toast.error(aData.error)
        if (cData.error) toast.error(cData.error)
        setAssessments(aData.assessments ?? [])
        setCohorts(cData.cohorts ?? [])
      } catch (e: any) {
        toast.error(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function toggleActive(a: Assessment) {
    const res = await fetch(`/api/assessments/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !a.is_active }) })
    const data = await res.json()
    if (res.ok) setAssessments(list => list.map(x => x.id === a.id ? data.assessment : x))
    else toast.error(data.error)
  }

  async function deleteAssessment(a: Assessment) {
    if (!confirm(`Delete "${a.name}"? This cannot be undone.`)) return
    await fetch(`/api/assessments/${a.id}`, { method: 'DELETE' })
    setAssessments(list => list.filter(x => x.id !== a.id))
    toast.success('Assessment deleted')
  }

  if (!profile) return <div className="loading-page"><span className="spinner" /> Loading…</div>

  return (
    <AppShell profile={profile}>
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Assessments</h1>
          <p>Create and manage your assessments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Assessment
        </button>
      </div>
      <div style={{ height: 24 }} />

      {loading ? <div className="loading-page"><span className="spinner" /></div> :
       assessments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
          <h3>No assessments yet</h3>
          <p>Create your first assessment, upload your question bank, and assign it to a cohort.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Assessment</button>
        </div>
      ) : (
        <div className="assessment-grid">
          {assessments.map(a => (
            <div key={a.id} className="assessment-tile">
              <div className="assessment-tile-header">
                <div>
                  <div className="assessment-tile-title">{a.name}</div>
                  <div style={{ marginTop: 6 }}>
                    <span className={`badge ${a.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {a.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="assessment-tile-meta">
                <span className="assessment-meta-item">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {a.total_questions} Qs · {(a.question_count ?? 0)} in bank
                </span>
                {a.total_time_seconds && (
                  <span className="assessment-meta-item">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>
                    {Math.round(a.total_time_seconds / 60)} min
                  </span>
                )}
                {a.time_per_question && (
                  <span className="assessment-meta-item">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {a.time_per_question}s / Q
                  </span>
                )}
                <span className="assessment-meta-item">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                  {a.marks_per_correct} marks/Q · {a.total_marks} total
                </span>
              </div>
              <div className="assessment-tile-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setUploadModal(a)}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Questions
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(a)}>
                  {a.is_active ? 'Deactivate' : 'Activate'}
                </button>
                                <button className="btn btn-primary btn-sm" onClick={() => setAssignModal(a)}>Assign</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blue-600)' }} onClick={() => setReviewModal(a)}>
                  Review
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blue-600)' }} onClick={() => setTryModal(a)}>
                  Try Now
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--slate-600)' }} onClick={() => setEditModal(a)}>
                  Edit
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red-600)', marginLeft: 'auto' }} onClick={() => deleteAssessment(a)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAssessmentModal
          onClose={() => setShowCreate(false)}
          onCreated={a => { setAssessments(list => [a, ...list]); setShowCreate(false) }}
        />
      )}
      {assignModal && (
        <AssignModal
          assessment={assignModal}
          cohorts={cohorts}
          onClose={() => setAssignModal(null)}
        />
      )}
      {uploadModal && (
        <UploadQuestionsModal
          assessment={uploadModal}
          onClose={() => setUploadModal(null)}
          onUploaded={() => { setUploadModal(null); window.location.reload() }}
        />
      )}
      {tryModal && (
        <TryAssessmentModal assessment={tryModal} onClose={() => setTryModal(null)} />
      )}
      {editModal && (
        <EditAssessmentModal
          assessment={editModal}
          onClose={() => setEditModal(null)}
          onUpdated={updated => { setAssessments(list => list.map(x => x.id === updated.id ? updated : x)); setEditModal(null) }}
        />
      )}
      {reviewModal && (
        <ReviewQuestionsModal
          assessment={reviewModal}
          onClose={() => setReviewModal(null)}
          onQuestionDeleted={() => { window.location.reload() }}
        />
      )}
    </AppShell>
  )
}

function CreateAssessmentModal({ onClose, onCreated }: any) {
  const [form, setForm] = useState({ name: '', total_questions: 20, total_time_seconds: '', time_per_question: '', marks_per_correct: 1, total_marks: 20, is_active: false })
  const [loading, setLoading] = useState(false)

  const f = (k: string) => (e: any) => setForm(x => ({ ...x, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/assessments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, total_questions: Number(form.total_questions), total_time_seconds: form.total_time_seconds ? Number(form.total_time_seconds) : null, time_per_question: form.time_per_question ? Number(form.time_per_question) : null, marks_per_correct: Number(form.marks_per_correct), total_marks: Number(form.total_marks) }) })
    const data = await res.json()
    setLoading(false)
    if (res.ok) { toast.success('Assessment created'); onCreated(data.assessment) }
    else toast.error(data.error)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Create Assessment</h3><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Assessment name *</label><input className="form-input" value={form.name} onChange={f('name')} required autoFocus placeholder="e.g. CO1-CO2 Mid Term" /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Total questions *</label><input type="number" className="form-input" value={form.total_questions} onChange={f('total_questions')} required min={1} /><span className="form-hint">Drawn from question bank</span></div>
              <div className="form-group"><label className="form-label">Marks per correct answer *</label><input type="number" className="form-input" value={form.marks_per_correct} onChange={f('marks_per_correct')} required min={0.5} step={0.5} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Total marks *</label><input type="number" className="form-input" value={form.total_marks} onChange={f('total_marks')} required /></div>
              <div className="form-group"><label className="form-label">Total time (seconds)</label><input type="number" className="form-input" value={form.total_time_seconds} onChange={f('total_time_seconds')} placeholder="Leave blank = no limit" min={60} /></div>
            </div>
            <div className="form-group"><label className="form-label">Time per question (seconds)</label><input type="number" className="form-input" value={form.time_per_question} onChange={f('time_per_question')} placeholder="Leave blank = no per-question timer" min={10} /><span className="form-hint">If set, question auto-advances when timer ends</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="isActive" checked={form.is_active} onChange={e => setForm(x => ({ ...x, is_active: e.target.checked }))} />
              <label htmlFor="isActive" style={{ fontSize: '0.875rem', color: 'var(--slate-700)', cursor: 'pointer' }}>Make active immediately</label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UploadQuestionsModal({ assessment, onClose, onUploaded }: any) {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        const qs = json.questions ?? json
        if (!Array.isArray(qs)) { toast.error('JSON must contain a "questions" array'); return }
        setQuestions(qs)
        toast.success(`${qs.length} questions loaded`)
      } catch { toast.error('Invalid JSON file') }
    }
    reader.readAsText(file)
  }

  async function upload() {
    if (questions.length === 0) return
    setLoading(true)
    const res = await fetch('/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assessment_id: assessment.id, questions }) })
    const data = await res.json()
    setLoading(false)
    if (res.ok) { toast.success(`${data.inserted} questions uploaded`); onUploaded() }
    else toast.error(data.error)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Upload Questions — {assessment.name}</h3><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="alert alert-info"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Upload the JSON question bank (same format as Symbi_MCQ_Bank_F0003.json). Existing questions will be replaced.</div>
          <div className="upload-zone" onClick={() => fileRef.current?.click()}>
            <div className="upload-zone-icon"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div>
            <p><strong>Click to upload</strong> JSON file</p>
            <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFile} />
          </div>
          {questions.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <span className="badge badge-green">{questions.length} questions ready to upload</span>
              <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                Assessment needs {assessment.total_questions} per paper. Bank has {questions.length} questions.
                {questions.length < assessment.total_questions && <span style={{ color: 'var(--red-600)', marginLeft: 6 }}>⚠ Need at least {assessment.total_questions}</span>}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={questions.length === 0 || loading} onClick={upload}>{loading ? 'Uploading…' : 'Upload Questions'}</button>
        </div>
      </div>
    </div>
  )
}

function AssignModal({ assessment, cohorts, onClose }: any) {
  const [mode, setMode] = useState<'cohort' | 'student'>('cohort')
  const [cohortId, setCohortId] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')

  async function loadStudents(cId: string) {
    if (!cId) return
    const res = await fetch(`/api/cohorts/${cId}`)
    const data = await res.json()
    setStudents(data.members?.map((m: any) => m.profile) ?? [])
  }

  async function assign() {
    setLoading(true)
    const body: any = { assessment_id: assessment.id }
    if (mode === 'cohort') body.cohort_id = cohortId
    else body.student_id = selectedStudent

    const res = await fetch('/api/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setLoading(false)
    if (res.ok) { toast.success(`Assigned to ${data.students_assigned} student(s). Emails sent.`); onClose() }
    else toast.error(data.error)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Assign — {assessment.name}</h3><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button className={`btn ${mode === 'cohort' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setMode('cohort')}>Whole Cohort</button>
            <button className={`btn ${mode === 'student' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setMode('student')}>Single Student</button>
          </div>
          {mode === 'cohort' ? (
            <div className="form-group">
              <label className="form-label">Select Cohort</label>
              <select className="form-select" value={cohortId} onChange={e => setCohortId(e.target.value)} required>
                <option value="">— Choose cohort —</option>
                {cohorts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Select Cohort first</label>
                <select className="form-select" value={cohortId} onChange={e => { setCohortId(e.target.value); loadStudents(e.target.value) }}>
                  <option value="">— Choose cohort —</option>
                  {cohorts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {students.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Select Student</label>
                  <select className="form-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                    <option value="">— Choose student —</option>
                    {students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}
                  </select>
                </div>
              )}
            </>
          )}
          <div className="alert alert-info"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Question papers will be generated automatically and students notified by email.</div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={assign} disabled={loading || (mode === 'cohort' ? !cohortId : !selectedStudent)}>{loading ? 'Assigning…' : 'Assign Assessment'}</button>
        </div>
      </div>
    </div>
  )
}

function TryAssessmentModal({ assessment, onClose }: any) {
  const [questions, setQuestions] = useState<any[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [qTimer, setQTimer] = useState<number | null>(null)
  const [totalTimer, setTotalTimer] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/assessments/${assessment.id}`)
      const data = await res.json()
      const all: any[] = data.questions ?? []
      // Shuffle and take total_questions
      const shuffled = all.sort(() => Math.random() - 0.5).slice(0, assessment.total_questions)
      setQuestions(shuffled)
      if (assessment.time_per_question) setQTimer(assessment.time_per_question)
      if (assessment.total_time_seconds) setTotalTimer(assessment.total_time_seconds)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (submitted || questions.length === 0) return
    if (assessment.time_per_question) {
      setQTimer(assessment.time_per_question)
      const t = setInterval(() => {
        setQTimer(prev => {
          if (prev === null) return null
          if (prev <= 1) { advanceQ(); return assessment.time_per_question }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(t)
    }
  }, [current, questions, submitted])

  useEffect(() => {
    if (submitted || !assessment.total_time_seconds || questions.length === 0) return
    const t = setInterval(() => {
      setTotalTimer(prev => {
        if (prev === null) return null
        if (prev <= 1) { setSubmitted(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [questions, submitted])

  function advanceQ() {
    if (current < questions.length - 1) setCurrent(c => c + 1)
    else setSubmitted(true)
  }

  function selectAnswer(qId: string, opt: string) {
    if (submitted) return
    setAnswers(a => ({ ...a, [qId]: opt }))
  }

  if (loading) return (
    <div className="modal-overlay"><div className="modal" style={{ padding: 40, textAlign: 'center' }}><span className="spinner" style={{ margin: '0 auto' }} /></div></div>
  )

  if (submitted) {
    const correct = questions.filter(q => answers[q.id] === q.correct_answer).length
    const score = correct * assessment.marks_per_correct
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><h3>Try Now — Result</h3><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
          <div className="modal-body">
            <div className="result-hero">
              <div className="result-score-ring">
                <div className="result-score-num">{score}</div>
                <div className="result-score-label">/ {assessment.total_marks}</div>
              </div>
              <h2>Practice Complete</h2>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem', marginTop: 6 }}>This was a practice run — not stored.</p>
              <div className="result-stats">
                <div><div className="result-stat-val green">{correct}</div><div className="result-stat-lbl">Correct</div></div>
                <div><div className="result-stat-val red">{questions.length - correct}</div><div className="result-stat-lbl">Incorrect</div></div>
                <div><div className="result-stat-val blue">{questions.length}</div><div className="result-stat-lbl">Total</div></div>
              </div>
            </div>
            <div className="divider" />
            {questions.map((q, i) => {
              const sel = answers[q.id]
              const isCorrect = sel === q.correct_answer
              return (
                <div key={q.id} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--blue-500)', fontWeight: 600, marginBottom: 6 }}>Q{i + 1}</div>
                  <div style={{ fontWeight: 600, color: 'var(--slate-800)', marginBottom: 10 }}>{q.question_text}</div>
                  {['A','B','C','D'].map(opt => {
                    let cls = 'quiz-option'
                    if (opt === q.correct_answer) cls += ' correct'
                    else if (opt === sel && !isCorrect) cls += ' incorrect'
                    return (
                      <button key={opt} className={cls} style={{ marginBottom: 8 }}>
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

  const q = questions[current]
  const timeWarn = qTimer !== null && qTimer <= 10

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 680, maxHeight: '90vh' }}>
        <div className="modal-header">
          <span style={{ fontWeight: 600, color: 'var(--slate-700)' }}>Try Now — {assessment.name}</span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {qTimer !== null && <span className={`quiz-timer ${timeWarn ? 'warning' : ''}`} style={{ fontSize: '1.1rem' }}>{qTimer}s</span>}
            {totalTimer !== null && <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>Total: {Math.floor(totalTimer / 60)}:{String(totalTimer % 60).padStart(2, '0')}</span>}
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          <div className="quiz-progress-bar"><div className="quiz-progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div>
          <div className="quiz-question-num">Question {current + 1} of {questions.length}</div>
          <div className="quiz-question-text">{q.question_text}</div>
          <div className="quiz-options">
            {['A','B','C','D'].map(opt => (
              <button key={opt} className={`quiz-option ${answers[q.id] === opt ? 'selected' : ''}`} onClick={() => selectAnswer(q.id, opt)}>
                <span className="quiz-option-key">{opt}</span>
                <span className="quiz-option-text">{q[`option_${opt.toLowerCase()}`]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          {current > 0 && <button className="btn btn-secondary" onClick={() => setCurrent(c => c - 1)}>Back</button>}
          <div style={{ flex: 1 }} />
          {current < questions.length - 1 ? (
            <button className="btn btn-primary" onClick={advanceQ}>Next</button>
          ) : (
            <button className="btn btn-primary" onClick={() => setSubmitted(true)}>Submit</button>
          )}
        </div>
      </div>
    </div>
  )
}

function EditAssessmentModal({ assessment, onClose, onUpdated }: any) {
  const [form, setForm] = useState({
    name: assessment.name,
    total_questions: assessment.total_questions,
    total_time_seconds: assessment.total_time_seconds ?? '',
    time_per_question: assessment.time_per_question ?? '',
    marks_per_correct: assessment.marks_per_correct,
    total_marks: assessment.total_marks,
    is_active: assessment.is_active,
  })
  const [loading, setLoading] = useState(false)

  const f = (k: string) => (e: any) => setForm(x => ({ ...x, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`/api/assessments/${assessment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        total_questions: Number(form.total_questions),
        total_time_seconds: form.total_time_seconds ? Number(form.total_time_seconds) : null,
        time_per_question: form.time_per_question ? Number(form.time_per_question) : null,
        marks_per_correct: Number(form.marks_per_correct),
        total_marks: Number(form.total_marks),
        is_active: form.is_active,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) { toast.success('Assessment updated'); onUpdated(data.assessment) }
    else toast.error(data.error)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Edit Assessment</h3><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Assessment name *</label><input className="form-input" value={form.name} onChange={f('name')} required autoFocus /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Total questions *</label><input type="number" className="form-input" value={form.total_questions} onChange={f('total_questions')} required min={1} /><span className="form-hint">Drawn from question bank</span></div>
              <div className="form-group"><label className="form-label">Marks per correct *</label><input type="number" className="form-input" value={form.marks_per_correct} onChange={f('marks_per_correct')} required min={0.5} step={0.5} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Total marks *</label><input type="number" className="form-input" value={form.total_marks} onChange={f('total_marks')} required /></div>
              <div className="form-group"><label className="form-label">Total time (seconds)</label><input type="number" className="form-input" value={form.total_time_seconds} onChange={f('total_time_seconds')} placeholder="No limit" min={60} /></div>
            </div>
            <div className="form-group"><label className="form-label">Time per question (seconds)</label><input type="number" className="form-input" value={form.time_per_question} onChange={f('time_per_question')} placeholder="No per-question timer" min={10} /><span className="form-hint">If set, question auto-advances when timer ends</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="editIsActive" checked={form.is_active} onChange={e => setForm(x => ({ ...x, is_active: e.target.checked }))} />
              <label htmlFor="editIsActive" style={{ fontSize: '0.875rem', color: 'var(--slate-700)', cursor: 'pointer' }}>Active</label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ReviewQuestionsModal({ assessment, onClose, onQuestionDeleted }: any) {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/assessments/${assessment.id}`)
      const data = await res.json()
      setQuestions(data.questions ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function deleteQuestion(questionId: string) {
    if (!confirm('Delete this question? This cannot be undone.')) return
    const res = await fetch(`/api/questions/${questionId}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      toast.success('Question deleted')
      setQuestions(list => list.filter(q => q.id !== questionId))
      onQuestionDeleted()
    } else {
      toast.error(data.error || 'Failed to delete question')
    }
  }

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ padding: 40, textAlign: 'center' }}>
          <span className="spinner" style={{ margin: '0 auto' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Review Questions — {assessment.name}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--slate-500)', padding: 40 }}>
              <p>No questions uploaded yet.</p>
            </div>
          ) : (
            <div>
              {questions.map((q, idx) => {
                const correctOptionKey = q.correct_answer?.toUpperCase() || 'A'
                const optionMap: Record<string, string> = {
                  'A': q.option_a,
                  'B': q.option_b,
                  'C': q.option_c,
                  'D': q.option_d,
                }
                
                return (
                  <div key={q.id} style={{ marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid var(--slate-200)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--blue-600)', fontWeight: 600, marginBottom: 6 }}>
                          Q{idx + 1}
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--slate-800)', marginBottom: 12 }}>
                          {q.question_text}
                        </div>
                        {q.co && <span className="badge" style={{ backgroundColor: 'var(--blue-50)', color: 'var(--blue-700)', marginRight: 6 }}>CO: {q.co}</span>}
                        {q.bloom_label && <span className="badge" style={{ backgroundColor: 'var(--purple-50)', color: 'var(--purple-700)', marginRight: 6 }}>{q.bloom_label} (L{q.bloom_level})</span>}
                        {q.topic_name && <span className="badge" style={{ backgroundColor: 'var(--slate-100)', color: 'var(--slate-700)' }}>{q.topic_number} · {q.topic_name}</span>}
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--red-600)', whiteSpace: 'nowrap' }}
                        onClick={() => deleteQuestion(q.id)}
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    </div>
                    <div>
                      {['A', 'B', 'C', 'D'].map(opt => {
                        const isCorrect = opt === correctOptionKey
                        const optionText = optionMap[opt]
                        return (
                          <div
                            key={opt}
                            style={{
                              display: 'flex',
                              gap: 10,
                              padding: '10px 12px',
                              marginBottom: 8,
                              border: '1px solid var(--slate-200)',
                              borderRadius: '6px',
                              backgroundColor: isCorrect ? 'var(--green-50)' : 'var(--white)',
                              borderColor: isCorrect ? 'var(--green-300)' : 'var(--slate-200)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                height: 28,
                                borderRadius: '4px',
                                backgroundColor: isCorrect ? 'var(--green-200)' : 'var(--slate-100)',
                                color: isCorrect ? 'var(--green-800)' : 'var(--slate-600)',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                flexShrink: 0,
                              }}
                            >
                              {opt}
                            </div>
                            <div style={{ flex: 1, paddingTop: 2 }}>
                              <div style={{ color: 'var(--slate-800)', fontSize: '0.9375rem' }}>
                                {optionText}
                              </div>
                            </div>
                            {isCorrect && (
                              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--green-600)', fontWeight: 600, fontSize: '0.8rem' }}>
                                ✓ Correct
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {q.explanation && (
                      <div style={{ marginTop: 12, padding: 12, backgroundColor: 'var(--blue-50)', borderLeft: '3px solid var(--blue-400)', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--blue-700)', marginBottom: 4 }}>Explanation</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--blue-800)' }}>{q.explanation}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
