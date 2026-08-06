'use client'
import { useState } from 'react'
import Sidebar from './Sidebar'
import type { Profile } from '@/lib/types'

interface Props {
  profile: Profile
  children: React.ReactNode
}

export default function AppShell({ profile, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      <Sidebar profile={profile} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="topbar">
        <button className="topbar-menu-btn" onClick={() => setSidebarOpen(true)}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <span className="topbar-title">Symbi Assess</span>
      </div>
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
