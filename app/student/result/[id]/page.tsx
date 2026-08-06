'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [paperId, setPaperId] = useState<string | null>(null)
  const [paper, setPaper] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(p => setPaperId(p.id))
  }, [params])

  useEffect(() => {
    if (!paperId) return
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch(`/api/papers/${paperId}`)
      if (!res.ok) { toast.error('Not found'); router.push('/student/dashboard'); return }

      const data = await res.json()
      if (data.paper.status !== 'completed') {
        router.push(`/student/assessment/${paperId}`)
        return
      }
      setPaper(data.paper)
      setQuestions(data.questions ?? [])
      setLoading(false)
    }
    load()
  }, [paperId])

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

  if (loading) return <div className="loading-page"><span className="spinner" /> Loading result…</div>

  const a = paper?.assessment
  const correct = questions.filter(pq => pq.is_correct).length
  const wrong = questions.filter(pq => pq.selected_answer && !pq.is_correct).length
  const skipped = questions.filter(pq => !pq.selected_answer).length
  const pct = a ? Math.round((paper.score / a.total_marks) * 100) : 0

  return (
    <div
      style={{ minHeight: '100vh', background: 'var(--slate-50)' }}
      onCopy={e => e.preventDefault()}
      onCut={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Header */}
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--slate-200)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, userSelect: 'none', WebkitUserSelect: 'none' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/student/dashboard')}>← Dashboard</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--slate-900)', userSelect: 'none', WebkitUserSelect: 'none' }}>{a?.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', userSelect: 'none', WebkitUserSelect: 'none' }}>Results</div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
        {/* Score card */}
        <div className="card" style={{ marginBottom: 28, overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--blue-600), var(--blue-800))', padding: '32px 32px 28px', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 16, userSelect: 'none', WebkitUserSelect: 'none' }}>Your Result</div>
            <div className="result-score-ring" style={{ borderColor: 'rgba(255,255,255,0.5)', margin: '0 auto 20px', userSelect: 'none', WebkitUserSelect: 'none' }}>
              <div className="result-score-num" style={{ color: 'white', userSelect: 'none', WebkitUserSelect: 'none' }}>{paper.score}</div>
              <div className="result-score-label" style={{ color: 'rgba(255,255,255,0.7)', userSelect: 'none', WebkitUserSelect: 'none' }}>/ {a?.total_marks}</div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', userSelect: 'none', WebkitUserSelect: 'none' }}>{pct}%</div>
            <div style={{ opacity: 0.8, marginTop: 4, fontSize: '0.875rem', userSelect: 'none', WebkitUserSelect: 'none' }}>
              {pct >= 75 ? '🎉 Excellent performance!' : pct >= 60 ? '👍 Good effort!' : '📚 Keep studying!'}
            </div>
          </div>
          <div className="card-body">
            <div className="result-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, userSelect: 'none', WebkitUserSelect: 'none' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="result-stat-val green">{correct}</div>
                <div className="result-stat-lbl">Correct</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="result-stat-val red">{wrong}</div>
                <div className="result-stat-lbl">Wrong</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="result-stat-val" style={{ color: 'var(--slate-400)' }}>{skipped}</div>
                <div className="result-stat-lbl">Skipped</div>
              </div>
            </div>
          </div>
        </div>

        {/* Question Review */}
        <h3 style={{ marginBottom: 20, color: 'var(--slate-800)', userSelect: 'none', WebkitUserSelect: 'none' }}>Question Review</h3>
        {questions.map((pq, i) => {
          const q = pq.question
          if (!q) return null
          const sel = pq.selected_answer
          const isCorrect = pq.is_correct

          return (
            <div key={pq.id} className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'center', gap: 10, background: isCorrect ? 'var(--green-50)' : sel ? 'var(--red-50)' : 'var(--slate-50)', userSelect: 'none', WebkitUserSelect: 'none' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)' }}>Q{i + 1}</span>
                <span className={`badge ${isCorrect ? 'badge-green' : sel ? 'badge-red' : 'badge-gray'}`}>
                  {isCorrect ? '✓ Correct' : sel ? '✗ Incorrect' : '— Skipped'}
                </span>
                {q.co && <span className="badge badge-blue">{q.co}</span>}
              </div>
              <div className="card-body">
                <div style={{ fontWeight: 600, color: 'var(--slate-900)', marginBottom: 16, lineHeight: 1.6, userSelect: 'none', WebkitUserSelect: 'none' }}>{q.question_text}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, userSelect: 'none', WebkitUserSelect: 'none' }}>
                  {['A','B','C','D'].map(opt => {
                    const isCorrectOpt = opt === q.correct_answer
                    const isSelected = opt === sel
                    const isWrong = isSelected && !isCorrectOpt

                    return (
                      <div
                        key={opt}
                        className={`quiz-option ${isCorrectOpt ? 'correct' : isWrong ? 'incorrect' : ''}`}
                        style={{ cursor: 'default', userSelect: 'none', WebkitUserSelect: 'none' }}
                      >
                        <span className="quiz-option-key">{opt}</span>
                        <span className="quiz-option-text" style={{ flex: 1 }}>{q[`option_${opt.toLowerCase()}`]}</span>
                        {isCorrectOpt && <span style={{ fontSize: '0.75rem', color: 'var(--green-600)', fontWeight: 600 }}>✓ Correct</span>}
                        {isWrong && <span style={{ fontSize: '0.75rem', color: 'var(--red-600)', fontWeight: 600 }}>Your answer</span>}
                      </div>
                    )
                  })}
                </div>
                {q.explanation && (
                  <div className="quiz-explanation" style={{ marginTop: 16, userSelect: 'none', WebkitUserSelect: 'none' }}>
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div style={{ textAlign: 'center', padding: 32, userSelect: 'none', WebkitUserSelect: 'none' }}>
          <button className="btn btn-primary btn-lg" onClick={() => router.push('/student/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    </div>
  )
}
