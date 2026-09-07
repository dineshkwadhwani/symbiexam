import Groq from 'groq-sdk'
import { createAdminClient } from '@/lib/supabase/server'

let evaluationChain: Promise<void> = Promise.resolve()

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function evaluateJob(job: { id: string; paper_question_id: string }, admin: ReturnType<typeof createAdminClient>) {
  const { data: pq } = await admin
    .from('paper_questions')
    .select('id, answer_text, question:questions(question_text, model_answer, max_marks)')
    .eq('id', job.paper_question_id)
    .single()

  const question = Array.isArray(pq?.question) ? pq.question[0] : pq?.question
  if (!pq || !question) throw new Error('Evaluation question not found')

  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured')

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'system',
      content: 'Evaluate the student answer against the model answer. Return only JSON: {"marks_awarded": number, "feedback": string}. Marks must be between 0 and max_marks.',
    }, {
      role: 'user',
      content: JSON.stringify({ question: question.question_text, model_answer: question.model_answer, student_answer: pq.answer_text ?? '', max_marks: question.max_marks }),
    }],
  })

  const result = JSON.parse(response.choices[0]?.message?.content ?? '{}') as { marks_awarded?: number; feedback?: string }
  const maxMarks = Number(question.max_marks ?? 0)
  const marks = Math.min(maxMarks, Math.max(0, Number(result.marks_awarded ?? 0)))
  await admin.from('paper_questions').update({
    marks_awarded: marks,
    evaluation_feedback: result.feedback ?? '',
    evaluation_status: 'completed',
  }).eq('id', pq.id)
  await admin.from('ai_evaluation_jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', job.id)
}

export async function processEvaluationQueue(paperId: string) {
  evaluationChain = evaluationChain.then(async () => {
    const admin = createAdminClient()
    const { data: jobs } = await admin
      .from('ai_evaluation_jobs')
      .select('id, paper_question_id')
      .eq('paper_id', paperId)
      .eq('status', 'queued')
      .order('created_at')

    for (const job of jobs ?? []) {
      await admin.from('ai_evaluation_jobs').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', job.id).eq('status', 'queued')
      await admin.from('paper_questions').update({ evaluation_status: 'processing' }).eq('id', job.paper_question_id)
      try {
        await evaluateJob(job, admin)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Evaluation failed'
        await admin.from('ai_evaluation_jobs').update({ status: 'failed', last_error: message }).eq('id', job.id)
        await admin.from('paper_questions').update({ evaluation_status: 'failed', evaluation_feedback: message, marks_awarded: 0 }).eq('id', job.paper_question_id)
      }
      await wait(Number(process.env.AI_EVALUATION_DELAY_MS ?? 1500))
    }
  })
  return evaluationChain
}