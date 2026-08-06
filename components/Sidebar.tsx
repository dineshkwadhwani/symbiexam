'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Profile } from '@/lib/types'

interface Props {
  profile: Profile
  open?: boolean
  onClose?: () => void
}

function Icon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    dashboard: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="14" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="14" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    cohorts: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    assessments: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    results: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    my_tests: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
    logout: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    profile: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  }
  return <>{icons[name] ?? null}</>
}

export default function Sidebar({ profile, open, onClose }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const isTeacher = profile.role === 'teacher'

  const navItems = isTeacher
    ? [
        { icon: 'dashboard', label: 'Dashboard', href: '/teacher/dashboard' },
        { icon: 'cohorts', label: 'Cohorts', href: '/teacher/cohorts' },
        { icon: 'assessments', label: 'Assessments', href: '/teacher/assessments' },
        { icon: 'results', label: 'Results', href: '/teacher/results' },
      ]
    : [
        { icon: 'dashboard', label: 'Dashboard', href: '/student/dashboard' },
      ]

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">SA</div>
          <div>
            <div className="sidebar-logo-text">Symbi Assess</div>
            <div className="sidebar-logo-sub">SIT · F0003</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map(item => (
            <button
              key={item.href}
              className={`sidebar-link ${pathname.startsWith(item.href) ? 'active' : ''}`}
              onClick={() => { router.push(item.href); onClose?.() }}
            >
              <Icon name={item.icon} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile-dropdown-wrap" ref={dropRef}>
            {profileOpen && (
              <div className="profile-dropdown">
                <button className="profile-dropdown-item" onClick={() => { router.push('/profile'); setProfileOpen(false); onClose?.() }}>
                  <Icon name="profile" /> My Profile
                </button>
                <div style={{ height: 1, background: 'var(--slate-100)', margin: '4px 0' }} />
                <button className="profile-dropdown-item danger" onClick={handleLogout}>
                  <Icon name="logout" /> Log out
                </button>
              </div>
            )}
            <button className="sidebar-user" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }} onClick={() => setProfileOpen(p => !p)}>
              <div className="sidebar-avatar">
                {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name} /> : initials}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{profile.full_name}</div>
                <div className="sidebar-user-role">{profile.role === 'teacher' ? 'Teacher' : 'Student'}</div>
              </div>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ flexShrink: 0, color: 'var(--slate-400)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
