import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { ToastProvider } from './components/Toast'
import Navbar           from './components/Navbar'
import Sidebar          from './components/Sidebar'
import Dashboard        from './pages/Dashboard'
import LiveScanner      from './pages/LiveScanner'
import BatchAnalyzer    from './pages/BatchAnalyzer'
import About            from './pages/About'
import { apiUrl }       from './config/api'

const PAGES = {
  dashboard: Dashboard,
  scanner:   LiveScanner,
  batch:     BatchAnalyzer,
  about:     About,
}

const SIDEBAR_W = 224   // px — must match Sidebar's width

/* ── xs/sm/md = mobile drawer, xl+ = always-open sidebar ─────── */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1024
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = e => setDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return desktop
}

export default function App() {
  const [activePage,   setActivePage]   = useState('dashboard')
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [modelStatus,  setModelStatus]  = useState(null) // null|true|false
  const isDesktop = useIsDesktop()

  /* Health check — shared so Navbar shows real status */
  const checkHealth = useCallback(async () => {
    try {
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 4000)
      const r = await fetch(apiUrl('/api/health'), { signal: c.signal })
      clearTimeout(t)
      setModelStatus(r.ok)
    } catch {
      setModelStatus(false)
    }
  }, [])

  useEffect(() => {
    // checkHealth()
    const id = setInterval(checkHealth, 30_000)
    return () => clearInterval(id)
  }, [checkHealth])

  /* Navigate + close drawer on mobile */
  const navigate = useCallback(page => {
    setActivePage(page)
    setSidebarOpen(false)
  }, [])

  const Page = PAGES[activePage]

  return (
    <ToastProvider>
      <div style={{ height: '100dvh', overflow: 'hidden', position: 'relative' }}>

        {/* ── Background layers ───────────────────────────── */}
        <div className="bg-radar"  aria-hidden="true" />
        <div className="bg-glow"   aria-hidden="true" />
        <div className="scan-line" aria-hidden="true" />

        {/* ── Navbar ──────────────────────────────────────── */}
        <Navbar
          modelStatus={modelStatus}
          sidebarOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen(o => !o)}
          isDesktop={isDesktop}
        />

        {/* ── Mobile backdrop ─────────────────────────────── */}
        <AnimatePresence>
          {!isDesktop && sidebarOpen && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.55)',
                zIndex: 35,
                backdropFilter: 'blur(2px)',
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Sidebar ─────────────────────────────────────── */}
        <Sidebar
          active={activePage}
          onNavigate={navigate}
          open={sidebarOpen}
          isDesktop={isDesktop}
        />

        {/* ── Main content ────────────────────────────────── */}
        <main
          style={{
            position: 'absolute',
            top: 56,
            left: isDesktop ? SIDEBAR_W : 0,
            right: 0,
            bottom: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            zIndex: 10,
            padding: '20px 20px 40px',
            transition: 'left 0.25s ease',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, y: -8  }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Page />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </ToastProvider>
  )
}
