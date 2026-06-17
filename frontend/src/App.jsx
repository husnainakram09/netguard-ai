import { useState } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import LiveScanner from './pages/LiveScanner'
import BatchAnalyzer from './pages/BatchAnalyzer'
import About from './pages/About'

const PAGES = {
  dashboard: { component: Dashboard,    title: 'Security Overview' },
  scanner:   { component: LiveScanner,  title: 'Live Scanner'       },
  batch:     { component: BatchAnalyzer,title: 'Batch Analyzer'     },
  about:     { component: About,        title: 'About'              },
}

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const { component: Page } = PAGES[activePage]

  return (
    <div style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>

      {/* ── Animated radar background ───────────────── */}
      <div className="bg-radar" aria-hidden="true" />
      <div className="bg-glow"  aria-hidden="true" />
      <div className="scan-line" aria-hidden="true" />

      {/* ── Chrome ──────────────────────────────────── */}
      <Navbar />
      <Sidebar active={activePage} onNavigate={setActivePage} />

      {/* ── Scrollable content ──────────────────────── */}
      <main
        style={{
          position: 'absolute',
          top: 56,                   /* navbar height */
          left: 224,                 /* sidebar width */
          right: 0,
          bottom: 0,
          overflowY: 'auto',
          zIndex: 10,
          padding: '24px',
        }}
      >
        <Page />
        {/* Bottom breathing room */}
        <div style={{ height: 40 }} />
      </main>
    </div>
  )
}
