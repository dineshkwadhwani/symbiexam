export type Role = 'teacher' | 'student'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone?: string
  prn_id?: string
  role: Role
  avatar_url?: string
  must_change_password: boolean
  created_at: string
}

export interface Cohort {
  id: string
  name: string
  description?: string
  teacher_id: string
  created_at: string
  student_count?: number
}

export interface CohortStudent {
  id: string
  cohort_id: string
  student_id: string
  created_at: string
  profile?: Profile
}

export interface Assessment {
  id: string
  name: string
  total_questions: number
  total_time_seconds?: number
  time_per_question?: number
  marks_per_correct: number
  total_marks: number
  is_active: boolean
  teacher_id: string
  created_at: string
  question_count?: number
}

export interface Question {
  id: string
  assessment_id: string
  co?: string
  topic_number?: string
  topic_name?: string
  bloom_level?: number
  bloom_label?: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  explanation?: string
  created_at: string
}

export interface Assignment {
  id: string
  assessment_id: string
  cohort_id?: string
  student_id?: string
  assigned_by: string
  assigned_at: string
  assessment?: Assessment
  cohort?: Cohort
  student?: Profile
}

export interface StudentPaper {
  id: string
  assignment_id: string
  student_id: string
  assessment_id: string
  started_at?: string
  submitted_at?: string
  score?: number
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  assessment?: Assessment
  student?: Profile
  assignment?: Assignment
}

export interface PaperQuestion {
  id: string
  paper_id: string
  question_id: string
  question_order: number
  selected_answer?: 'A' | 'B' | 'C' | 'D'
  is_correct?: boolean
  question?: Question
}

// JSON upload format
export interface QuestionBankItem {
  id?: number
  course_name?: string
  co?: string
  topic_number?: string
  topic_name?: string
  bloom_level?: number
  bloom_label?: string
  question: string
  options: { A: string; B: string; C: string; D: string }
  correct_answer: 'A' | 'B' | 'C' | 'D'
  explanation?: string
}

export interface QuestionBankJSON {
  metadata?: Record<string, unknown>
  questions: QuestionBankItem[]
}
