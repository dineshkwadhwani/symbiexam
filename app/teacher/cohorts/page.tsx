'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import type { Profile, Cohort, CohortStudent } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

type View = 'list' | 'detail'

export default function CohortsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [view, setView] = useState<View>('list')
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null)
  const [members, setMembers] = useState<CohortStudent[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      fetchCohorts()
    }
    init()
  }, [])

  async function fetchCohorts() {
    setLoading(true)
    const res = await fetch('/api/cohorts')
    const data = await res.json()
    setCohorts(data.cohorts ?? [])
    setLoading(false)
  }

  async function openCohort(c: Cohort) {
    setSelectedCohort(c)
    const res = await fetch(`/api/cohorts/${c.id}`)
    const data = await res.json()
    setMembers(data.members ?? [])
    setView('detail')
  }

  async function removeStudent(studentId: string) {
    if (!confirm('Remove this student from cohort?')) return
    await fetch(`/api/students/${studentId}?cohort_id=${selectedCohort!.id}`, { method: 'DELETE' })
    setMembers(m => m.filter(x => x.student_id !== studentId))
    toast.success('Student removed')
  }

  async function resetPassword(studentId: string) {
    const res = await fetch(`/api/students/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset_password: true }),
    })
    const data = await res.json()
    if (data.new_password) {
      toast.success('New password sent to student\'s email', { duration: 5000 })
    } else {
      toast.error(data.error || 'Reset failed')
    }
  }

  async function deleteCohort(c: Cohort) {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/cohorts/${c.id}`, { method: 'DELETE' })
    if (res.ok) {
      setCohorts(list => list.filter(x => x.id !== c.id))
      toast.success('Cohort deleted')
    } else {
      toast.error('Failed to delete cohort')
    }
  }

  if (!profile) return <div className="loading-page"><span className="spinner" /> Loading…</div>

  return (
    <AppShell profile={profile}>
      {view === 'list' ? (
        <>
          <div className="page-header-row">
            <div className="page-header" style={{ marginBottom: 0 }}>
              <h1>Cohorts</h1>
              <p>Manage your student groups</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Cohort
            </button>
          </div>
          <div style={{ height: 24 }} />
          {loading ? (
            <div className="loading-page"><span className="spinner" /></div>
          ) : cohorts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
              <h3>No cohorts yet</h3>
              <p>Create your first cohort and start adding students.</p>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>Create Cohort</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {cohorts.map(c => (
                <div key={c.id} className="card" style={{ padding: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openCohort(c)}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--slate-900)', marginBottom: 4 }}>{c.name}</div>
                      {c.description && <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>{c.description}</div>}
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red-600)', whiteSpace: 'nowrap', marginLeft: 12 }}
                      onClick={() => deleteCohort(c)}
                      title="Delete cohort"
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }} onClick={() => openCohort(c)}>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--blue-600)' }}>{c.student_count ?? 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Students</div>
                    </div>
                    <div style={{ color: 'var(--slate-300)', fontSize: '0.8rem' }}>·</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <CohortDetail
          cohort={selectedCohort!}
          members={members}
          onBack={() => { setView('list'); fetchCohorts() }}
          onMembersChange={setMembers}
          onRemove={removeStudent}
          onReset={resetPassword}
        />
      )}

      {showCreateModal && (
        <CreateCohortModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(c) => { setCohorts(cs => [c, ...cs]); setShowCreateModal(false) }}
        />
      )}
    </AppShell>
  )
}

function CohortDetail({ cohort, members, onBack, onMembersChange, onRemove, onReset }: any) {
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['full_name', 'email', 'phone', 'prn_id'],
      ['Rahul Sharma', 'rahul.sharma@gmail.com', '9876543210', 'PRN2025001'],
    ])
    ws['!cols'] = [{ wch: 24 }, { wch: 32 }, { wch: 14 }, { wch: 16 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    XLSX.writeFile(wb, 'student_upload_template.xlsx')
  }

  return (
    <>
      <div className="breadcrumb">
        <span className="breadcrumb-item" onClick={onBack}>Cohorts</span>
        <span className="breadcrumb-sep">›</span>
        <span>{cohort.name}</span>
      </div>
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>{cohort.name}</h1>
          <p>{members.length} student{members.length !== 1 ? 's' : ''} enrolled</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={downloadTemplate}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download Template
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowBulk(true)}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Upload Excel
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Student
          </button>
        </div>
      </div>
      <div style={{ height: 20 }} />
      <div className="card">
        {members.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></div>
            <h3>No students yet</h3>
            <p>Add students individually or upload an Excel file.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>PRN ID</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
              <tbody>
                {members.map((m: any) => (
                  <tr key={m.id}>
                    <td><div style={{ fontWeight: 600 }}>{m.profile?.full_name}</div></td>
                    <td style={{ color: 'var(--slate-500)' }}>{m.profile?.prn_id || '—'}</td>
                    <td style={{ color: 'var(--slate-500)' }}>{m.profile?.email}</td>
                    <td style={{ color: 'var(--slate-500)' }}>{m.profile?.phone || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => onReset(m.student_id)} title="Reset password">Reset PW</button>
                        <button className="btn btn-danger btn-sm" onClick={() => onRemove(m.student_id)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddStudentModal
          cohortId={cohort.id}
          cohortName={cohort.name}
          onClose={() => setShowAdd(false)}
          onAdded={(m: any) => { onMembersChange((ms: any) => [...ms, m]); setShowAdd(false) }}
        />
      )}
      {showBulk && (
        <BulkUploadModal
          cohortId={cohort.id}
          cohortName={cohort.name}
          onClose={() => setShowBulk(false)}
          onDone={() => { setShowBulk(false); window.location.reload() }}
        />
      )}
    </>
  )
}

function CreateCohortModal({ onClose, onCreated }: any) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/cohorts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description: desc }) })
    const data = await res.json()
    setLoading(false)
    if (res.ok) { toast.success('Cohort created'); onCreated(data.cohort) }
    else toast.error(data.error)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Create Cohort</h3><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Cohort name *</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="e.g. CSE 2025 Batch A" /></div>
            <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create Cohort'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddStudentModal({ cohortId, cohortName, onClose, onAdded }: any) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' })
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, cohort_id: cohortId, cohort_name: cohortName }) })
    const data = await res.json()
    setLoading(false)
    if (res.ok) { toast.success('Student added & email sent'); onAdded({ student_id: data.userId, profile: { ...form, id: data.userId } }) }
    else toast.error(data.error)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Add Student</h3><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Full name *</label><input className="form-input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required autoFocus /></div>
            <div className="form-group"><label className="form-label">Email *</label><input type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Optional" /></div>
            <div className="alert alert-info"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>A welcome email with login credentials will be sent automatically.</div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding…' : 'Add Student'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BulkUploadModal({ cohortId, cohortName, onClose, onDone }: any) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(ws)
      const parsed = (json as any[]).map(r => ({
        full_name: r['full_name'] || r['Full Name'] || r['name'] || '',
        email: r['email'] || r['Email'] || '',
        phone: r['phone'] || r['Phone'] || '',
        prn_id: r['prn_id'] || r['PRN ID'] || r['PRN'] || '',
      })).filter(r => r.full_name && r.email)
      setRows(parsed)
    }
    reader.readAsBinaryString(file)
  }

  async function upload() {
    setLoading(true)
    const res = await fetch('/api/students/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ students: rows, cohort_id: cohortId, cohort_name: cohortName }) })
    const data = await res.json()
    setResults(data.results ?? [])
    setLoading(false)
    toast.success(`Processed ${rows.length} students`)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Bulk Upload Students</h3><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          {results.length === 0 ? (
            <>
              <div className="alert alert-info"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Excel must have columns: <strong>full_name</strong>, <strong>email</strong>, <strong>phone</strong> (optional), <strong>prn_id</strong> (optional)</div>
              <div className="upload-zone" onClick={() => fileRef.current?.click()}>
                <div className="upload-zone-icon"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div>
                <p><strong>Click to upload</strong> or drag and drop</p>
                <p style={{ fontSize: '0.75rem', marginTop: 4 }}>.xlsx or .xls files</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
              </div>
              {rows.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="badge badge-green" style={{ marginBottom: 10 }}>{rows.length} students parsed</div>
                  <div style={{ maxHeight: 200, overflow: 'auto' }}>
                    <table className="table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>PRN ID</th></tr></thead>
                      <tbody>{rows.map((r, i) => <tr key={i}><td>{r.full_name}</td><td>{r.email}</td><td>{r.phone || '—'}</td><td>{r.prn_id || '—'}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="badge badge-green" style={{ marginBottom: 12 }}>Upload complete</div>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                <table className="table"><thead><tr><th>Email</th><th>Status</th></tr></thead>
                  <tbody>{results.map((r, i) => <tr key={i}><td>{r.email}</td><td><span className={`badge ${r.status === 'added' ? 'badge-green' : r.status === 'exists' ? 'badge-amber' : 'badge-red'}`}>{r.status}</span></td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {results.length === 0 ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={upload} disabled={rows.length === 0 || loading}>{loading ? 'Uploading…' : `Upload ${rows.length} students`}</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onDone}>Done</button>
          )}
        </div>
      </div>
    </div>
  )
}
