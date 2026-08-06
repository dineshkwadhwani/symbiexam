'use client'
import { useState, useEffect, useRef } from 'react'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      setPhone(p?.phone ?? '')
    }
    load()
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) { setProfile(data.profile); toast.success('Profile updated') }
    else toast.error(data.error)
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (file.size > 3 * 1024 * 1024) return toast.error('Max file size is 3MB')

    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`

    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) { toast.error('Upload failed'); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = `${publicUrl}?t=${Date.now()}`

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: url }),
    })
    const data = await res.json()
    setUploading(false)
    if (res.ok) { setProfile(data.profile); toast.success('Photo updated') }
    else toast.error(data.error)
  }

  if (!profile) return <div className="loading-page"><span className="spinner" /></div>

  const initials = profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <AppShell profile={profile}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="breadcrumb">
          <span>Profile</span>
        </div>
        <div className="page-header">
          <h1>My Profile</h1>
          <p>Manage your account information</p>
        </div>

        {/* Avatar */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div
              style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue-400), var(--blue-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', fontWeight: 700, overflow: 'hidden', flexShrink: 0, cursor: 'pointer', position: 'relative' }}
              onClick={() => fileRef.current?.click()}
            >
              {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--slate-800)' }}>{profile.full_name}</div>
              <div style={{ color: 'var(--slate-500)', fontSize: '0.85rem', marginBottom: 10 }}>{profile.role === 'teacher' ? 'Teacher' : 'Student'}</div>
              <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Change photo'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
            </div>
          </div>
        </div>

        {/* Info form */}
        <div className="card">
          <div className="card-header"><h3 style={{ margin: 0 }}>Account Details</h3></div>
          <form onSubmit={saveProfile}>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" value={profile.full_name} disabled style={{ background: 'var(--slate-50)', color: 'var(--slate-400)' }} />
                <span className="form-hint">Name cannot be changed. Contact your administrator.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input className="form-input" value={profile.email} disabled style={{ background: 'var(--slate-50)', color: 'var(--slate-400)' }} />
              </div>
              {profile.prn_id && (
                <div className="form-group">
                  <label className="form-label">PRN ID</label>
                  <input className="form-input" value={profile.prn_id} disabled style={{ background: 'var(--slate-50)', color: 'var(--slate-400)' }} />
                  <span className="form-hint">PRN ID is assigned by your administrator and cannot be changed.</span>
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone number</label>
                <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9876543210" />
              </div>
            </div>
            <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
