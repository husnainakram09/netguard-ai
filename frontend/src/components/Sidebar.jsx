const NAV_ITEMS = [
  {
    id: 'dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity=".8"/>
        <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity=".3"/>
      </svg>
    ),
    label: 'Dashboard',
    sub: 'Overview & alerts',
  },
  {
    id: 'scanner',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="11" y1="11" x2="15" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1.2"/>
        <line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
    label: 'Live Scanner',
    sub: 'Analyze a single flow',
  },
  {
    id: 'batch',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="2" rx="1" fill="currentColor" opacity=".8"/>
        <rect x="1" y="7.5" width="14" height="2" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="1" y="11" width="10" height="2" rx="1" fill="currentColor" opacity=".3"/>
      </svg>
    ),
    label: 'Batch Analyzer',
    sub: 'Multi-flow analysis',
  },
  {
    id: 'about',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="8" y1="7" x2="8" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="8" cy="5" r="0.8" fill="currentColor"/>
      </svg>
    ),
    label: 'About',
    sub: 'Dataset & model info',
  },
]

const MODEL_STATS = [
  { label: 'Dataset',       value: 'CICIDS 2017',    color: '#e2e8f0' },
  { label: 'Algorithm',     value: 'Random Forest',  color: '#e2e8f0' },
  { label: 'Features',      value: '10',             color: '#e2e8f0' },
  { label: 'Accuracy',      value: '99.89%',         color: '#00ff88' },
  { label: 'Training rows', value: '180,568',        color: '#e2e8f0' },
]

export default function Sidebar({ active, onNavigate, open = false, isDesktop = false }) {
  return (
    <aside
      className="fixed left-0 top-14 bottom-0 z-40 flex flex-col w-56"
      style={{
        background: 'rgba(10,14,26,0.98)',
        borderRight: '1px solid #1a2744',
        transform: isDesktop || open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
      }}
    >
      {/* Section label */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: '1px solid #1a2744' }}
      >
        <span
          className="text-xs tracking-widest uppercase font-data"
          style={{ color: '#64748b' }}
        >
          Navigation
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`nav-item w-full ${active === item.id ? 'active' : ''}`}
          >
            <span className="flex-shrink-0 w-4">{item.icon}</span>
            <div className="min-w-0">
              <div className="font-medium text-sm leading-tight">{item.label}</div>
              <div
                className="text-xs leading-tight mt-0.5 truncate"
                style={{ color: '#64748b' }}
              >
                {item.sub}
              </div>
            </div>
          </button>
        ))}
      </nav>

      {/* Model stats footer */}
      <div
        className="p-4 space-y-2"
        style={{ borderTop: '1px solid #1a2744' }}
      >
        <div
          className="text-xs tracking-widest uppercase mb-3 font-data"
          style={{ color: '#64748b' }}
        >
          Model Info
        </div>
        {MODEL_STATS.map(s => (
          <div key={s.label} className="flex justify-between items-baseline">
            <span className="text-xs" style={{ color: '#64748b' }}>{s.label}</span>
            <span
              className="text-xs font-medium font-data"
              style={{ color: s.color }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </aside>
  )
}
