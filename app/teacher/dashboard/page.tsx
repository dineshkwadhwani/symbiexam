import { requireTeacher } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import Link from 'next/link'

export default async function TeacherDashboard() {
  const profile = await requireTeacher()
  const supabase = await createClient()

  const [{ count: cohortCount }, { count: assessmentCount }, { count: studentCount }, { count: paperCount }] = await Promise.all([
    supabase.from('cohorts').select('*', { count: 'exact', head: true }).eq('teacher_id', profile.id),
    supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('teacher_id', profile.id),
    supabase.from('cohort_students').select('*, cohorts!inner(teacher_id)', { count: 'exact', head: true }).eq('cohorts.teacher_id', profile.id),
    supabase.from('student_papers').select('*, assessments!inner(teacher_id)', { count: 'exact', head: true }).eq('assessments.teacher_id', profile.id).eq('status', 'completed'),
  ])

  const { data: recentPapers } = await supabase
    .from('student_papers')
    .select('*, student:profiles(full_name, email), assessment:assessments(name)')
    .eq('assessments.teacher_id', profile.id)
    .eq('status', 'completed')
    .order('submitted_at', { ascending: false })
    .limit(5)

  return (
    <AppShell profile={profile}>
      <div className="page-header">
        <h1>Good day, {profile.full_name.split(' ')[0]} 👋</h1>
        <p>Here's an overview of your assessments and students.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div className="stat-card-value">{cohortCount ?? 0}</div>
          <div className="stat-card-label">Cohorts</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <div className="stat-card-value">{studentCount ?? 0}</div>
          <div className="stat-card-label">Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div className="stat-card-value">{assessmentCount ?? 0}</div>
          <div className="stat-card-label">Assessments</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon amber">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="stat-card-value">{paperCount ?? 0}</div>
          <div className="stat-card-label">Completed attempts</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Recent Submissions</h3>
        </div>
        {recentPapers && recentPapers.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assessment</th>
                  <th>Score</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recentPapers.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{p.student?.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{p.student?.email}</div>
                    </td>
                    <td>{p.assessment?.name}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--blue-600)' }}>{p.score}</span>
                    </td>
                    <td style={{ color: 'var(--slate-400)', fontSize: '0.8rem' }}>
                      {p.submitted_at ? new Date(p.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <h3>No submissions yet</h3>
            <p>Once students complete assessments, their results will appear here.</p>
            <Link href="/teacher/assessments" className="btn btn-primary btn-sm">Create an assessment</Link>
          </div>
        )}
      </div>
    </AppShell>
  )
}
