'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [paperId, setPaperId] = useState<string | null>(null)
  const [paper, setPaper] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({}) // pq.id -> answer
  const [started, setStarted] = useState(false)
  const [qTimer, setQTimer] = useState<number | null>(null)
  const [totalTimer, setTotalTimer] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const submitRef = useRef(false)
  const advancedRef = useRef(false)

  useEffect(() => {
    params.then(p => setPaperId(p.id))
  }, [params])

  useEffect(() => {
    if (!paperId) return
    async function load() {
      // Auth check
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch(`/api/papers/${paperId}`)
      if (!res.ok) { toast.error('Assessment not found'); router.push('/student/dashboard'); return }

      const data = await res.json()
      setPaper(data.paper)
      setQuestions(data.questions ?? [])

      if (data.paper.status === 'completed') {
        router.push(`/student/result/${paperId}`)
        return
      }

      // Pre-fill any saved answers
      const savedAnswers: Record<string, string> = {}
      for (const pq of data.questions ?? []) {
        if (pq.selected_answer) savedAnswers[pq.id] = pq.selected_answer
      }
      setAnswers(savedAnswers)

      if (data.paper.status === 'in_progress') {
        setStarted(true)
        if (data.paper.assessment?.time_per_question) {
          setQTimer(data.paper.assessment.time_per_question)
        }
        if (data.paper.assessment?.total_time_seconds) {
          // Compute remaining time
          const elapsed = data.paper.started_at
            ? Math.floor((Date.now() - new Date(data.paper.started_at).getTime()) / 1000)
            : 0
          const remaining = Math.max(0, data.paper.assessment.total_time_seconds - elapsed)
          setTotalTimer(remaining)
        }
      }
      setLoading(false)
    }
    load()
  }, [paperId])

  const submitPaper = useCallback(async () => {
    if (submitRef.current) return
    submitRef.current = true
    setSubmitting(true)
    await fetch(`/api/papers/${paperId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit' }),
    })
    router.push(`/student/result/${paperId}`)
  }, [paperId, router])

  // Per-question timer — reset advance guard then start countdown
  useEffect(() => {
    if (!started || !paper?.assessment?.time_per_question || submitting) return
    const tpq = paper.assessment.time_per_question
    advancedRef.current = false
    setQTimer(tpq)
    const t = setInterval(() => {
      setQTimer(prev => (prev === null ? null : Math.max(0, prev - 1)))
    }, 1000)
    return () => clearInterval(t)
  }, [current, started, paper?.assessment?.time_per_question, submitting])

  // Auto-advance when per-question timer expires — ref prevents double-fire
  useEffect(() => {
    if (qTimer !== 0 || !started || submitting || !paper?.assessment?.time_per_question) return
    if (advancedRef.current) return
    advancedRef.current = true
    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
    } else {
      submitPaper()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qTimer])

  // Total timer — single stable interval, submit when it reaches 0
  useEffect(() => {
    if (!started || !paper?.assessment?.total_time_seconds || submitting) return
    const t = setInterval(() => {
      setTotalTimer(prev => {
        if (prev === null || prev <= 0) return 0
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [started, paper?.assessment?.total_time_seconds, submitting])

  useEffect(() => {
    if (totalTimer !== 0 || !started || submitting || !paper?.assessment?.total_time_seconds) return
    submitPaper()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalTimer])

  // Prevent Cmd+P / Ctrl+P globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  async function startQuiz() {
    const res = await fetch(`/api/papers/${paperId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }
    setStarted(true)
    const a = paper.assessment
    if (a?.time_per_question) setQTimer(a.time_per_question)
    if (a?.total_time_seconds) setTotalTimer(a.total_time_seconds)
  }

  async function selectAnswer(pqId: string, answer: string) {
    setAnswers(prev => ({ ...prev, [pqId]: answer }))
    await fetch(`/api/papers/${paperId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'answer', paper_question_id: pqId, selected_answer: answer }),
    })
  }

  function nextQ() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
      if (paper?.assessment?.time_per_question) setQTimer(paper.assessment.time_per_question)
    }
  }

  function prevQ() {
    if (current > 0) {
      setCurrent(c => c - 1)
      if (paper?.assessment?.time_per_question) setQTimer(paper.assessment.time_per_question)
    }
  }

  function formatTimer(s: number | null) {
    if (s === null) return ''
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  if (loading) return <div className="loading-page"><span className="spinner" /> Loading assessment…</div>

  const a = paper?.assessment

  // Pre-start screen
  if (!started) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--slate-50)', padding: 24 }}>
        <div className="card" style={{ maxWidth: 480, width: '100%', padding: 0 }}>
          <div style={{ background: 'linear-gradient(135deg, var(--blue-600), var(--blue-800))', padding: '28px 32px', borderRadius: '14px 14px 0 0', color: 'white' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 8 }}>Assessment</div>
            <h2 style={{ margin: 0 }}>{a?.name}</h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'var(--slate-50)', borderRadius: 'var(--radius)', padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--blue-600)' }}>{a?.total_questions}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Questions</div>
              </div>
              <div style={{ background: 'var(--slate-50)', borderRadius: 'var(--radius)', padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--blue-600)' }}>{a?.total_marks}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Total marks</div>
              </div>
              {a?.total_time_seconds && (
                <div style={{ background: 'var(--slate-50)', borderRadius: 'var(--radius)', padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--blue-600)' }}>{Math.round(a.total_time_seconds / 60)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Minutes total</div>
                </div>
              )}
              {a?.time_per_question && (
                <div style={{ background: 'var(--slate-50)', borderRadius: 'var(--radius)', padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--blue-600)' }}>{a.time_per_question}s</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Per question</div>
                </div>
              )}
            </div>
            <div className="alert alert-info" style={{ marginBottom: 20 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <strong>Read before starting:</strong>
                <ul style={{ marginTop: 6, marginLeft: 16, fontSize: '0.85rem' }}>
                  <li>Once started, the assessment cannot be paused</li>
                  {a?.time_per_question && <li>Each question auto-advances after {a.time_per_question} seconds</li>}
                  {a?.total_time_seconds && <li>Assessment auto-submits after {Math.round(a.total_time_seconds / 60)} minutes</li>}
                  <li>You cannot retake this assessment</li>
                </ul>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => router.push('/student/dashboard')}>Back</button>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={startQuiz}>
                Start Assessment →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const pq = questions[current]
  const q = pq?.question
  if (!q) return null

  const totalWarn = totalTimer !== null && totalTimer <= 60
  const qWarn = qTimer !== null && qTimer <= 10
  const answered = questions.filter(x => answers[x.id]).length

  return (
    <div
      className="quiz-shell"
      onCopy={e => e.preventDefault()}
      onCut={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
    >
      <header className="quiz-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-800)' }}>{a?.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{answered} of {questions.length} answered</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {totalTimer !== null && (
            <div style={{ textAlign: 'center' }}>
              <div className={`quiz-timer ${totalWarn ? 'warning' : ''}`}>{formatTimer(totalTimer)}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--slate-400)' }}>Total</div>
            </div>
          )}
          {qTimer !== null && (
            <div style={{ textAlign: 'center' }}>
              <div className={`quiz-timer ${qWarn ? 'warning' : ''}`} style={{ fontSize: '1.2rem' }}>{qTimer}s</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--slate-400)' }}>This Q</div>
            </div>
          )}
        </div>
      </header>

      <div className="quiz-body">
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>

        <div className="quiz-question-num">Question {current + 1} of {questions.length}</div>

        <div style={{
          maxHeight: '320px',
          overflowY: 'auto',
          border: '1px solid var(--slate-200)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          background: 'var(--white)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}>
          <div className="quiz-question-text">{q.question_text}</div>

          <div className="quiz-options">
            {['A', 'B', 'C', 'D'].map(opt => (
              <button
                key={opt}
                className={`quiz-option ${answers[pq.id] === opt ? 'selected' : ''}`}
                onClick={() => selectAnswer(pq.id, opt)}
                disabled={submitting}
              >
                <span className="quiz-option-key">{opt}</span>
                <span className="quiz-option-text">{q[`option_${opt.toLowerCase()}`]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Question navigator dots */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 28 }}>
          {questions.map((pq2, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrent(i)
                if (paper?.assessment?.time_per_question) setQTimer(paper.assessment.time_per_question)
              }}
              style={{
                width: 28, height: 28,
                borderRadius: 6,
                border: i === current ? '2px solid var(--blue-500)' : '1.5px solid var(--slate-200)',
                background: answers[pq2.id] ? 'var(--blue-100)' : i === current ? 'var(--blue-50)' : 'var(--white)',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: i === current ? 'var(--blue-700)' : answers[pq2.id] ? 'var(--blue-600)' : 'var(--slate-400)',
                cursor: 'pointer',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'flex-end' }}>
          {current > 0 && (
            <button className="btn btn-secondary" onClick={prevQ}>← Previous</button>
          )}
          {current < questions.length - 1 && (
            <button className="btn btn-primary" onClick={nextQ}>Next →</button>
          )}
          {current === questions.length - 1 && (
            <button className="btn btn-primary" style={{ background: 'var(--green-600)', borderColor: 'var(--green-600)' }} onClick={submitPaper} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
