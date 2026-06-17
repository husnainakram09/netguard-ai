import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

export default function Navbar({ modelStatus, sidebarOpen, onMenuClick, isXL }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const pad = n => String(n).padStart(2, '0')
  const clock = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`
  const date  = time.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase()

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-5 gap-6"
      style={{
        background: 'rgba(15,22,41,0.95)',
        borderBottom: '1px solid rgba(0,212,255,0.15)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 1px 0 rgba(0,212,255,0.08), 0 4px 24px rgba(0,0,0,0.6)',
      }}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      {!isXL && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={sidebarOpen}
          className="flex items-center justify-center w-9 h-9 rounded"
          style={{
            color: '#00d4ff',
            border: '1px solid rgba(0,212,255,0.25)',
            background: sidebarOpen ? 'rgba(0,212,255,0.14)' : 'rgba(0,212,255,0.06)',
            cursor: 'pointer',
          }}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      <div className="flex items-center gap-3 flex-shrink-0">
        <div
          className="flex items-center justify-center w-8 h-8 rounded text-sm"
          style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)' }}
        >
          🛡️
        </div>
        <div>
          <div
            className="font-bold text-base leading-none tracking-wide"
            style={{ color: '#00d4ff', textShadow: '0 0 12px rgba(0,212,255,0.6)' }}
          >
            NetGuard AI
          </div>
          <div className="text-xs leading-none mt-0.5" style={{ color: '#64748b' }}>
            Intrusion Detection System
          </div>
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="h-6 w-px" style={{ background: '#1a2744' }} />

      {/* ── Dataset tag ───────────────────────────────────── */}
      <span
        className="text-xs tracking-widest uppercase px-2 py-0.5 rounded font-data hidden sm:block"
        style={{ color: '#64748b', border: '1px solid #1a2744' }}
      >
        CICIDS 2017
      </span>

      {/* ── Spacer ────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Status pills ──────────────────────────────────── */}
      <div className="flex items-center gap-4">

        {/* Model active */}
        <div className="items-center gap-1.5 hidden md:flex">
          <span
            className="text-xs tracking-widest uppercase px-2 py-0.5 rounded font-data"
            style={{
              color: modelStatus === false ? '#ff4444' : '#00ff88',
              background: modelStatus === false ? 'rgba(255,68,68,0.08)' : 'rgba(0,255,136,0.08)',
              border: modelStatus === false ? '1px solid rgba(255,68,68,0.25)' : '1px solid rgba(0,255,136,0.25)',
            }}
          >
            {modelStatus === false ? 'MODEL OFFLINE' : 'MODEL ACTIVE'}
          </span>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="text-xs font-medium tracking-widest" style={{ color: '#00ff88' }}>LIVE</span>
        </div>

        {/* Clock */}
        <div className="text-right hidden sm:block">
          <div className="font-data text-sm font-medium" style={{ color: '#e2e8f0' }}>{clock}</div>
          <div className="font-data text-xs"           style={{ color: '#64748b' }}>{date}</div>
        </div>
      </div>
    </header>
  )
}
