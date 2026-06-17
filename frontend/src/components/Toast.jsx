/**
 * Toast.jsx — lightweight toast notification system.
 *
 * Usage:
 *   const toast = useToast()
 *   toast('Connection failed', 'error')
 *   toast('Analysis complete', 'success')
 *   toast('Backend offline', 'warning')
 *   toast('10 features loaded', 'info')
 */
import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react'

/* ── Theme per type ─────────────────────────────────────────── */
const THEMES = {
  success: { color: '#00ff88', bg: 'rgba(0,255,136,0.09)',  border: 'rgba(0,255,136,0.28)',  Icon: CheckCircle  },
  error:   { color: '#ff4444', bg: 'rgba(255,68,68,0.09)',  border: 'rgba(255,68,68,0.28)',  Icon: XCircle      },
  warning: { color: '#ffaa00', bg: 'rgba(255,170,0,0.09)',  border: 'rgba(255,170,0,0.28)',  Icon: AlertTriangle },
  info:    { color: '#00d4ff', bg: 'rgba(0,212,255,0.09)',  border: 'rgba(0,212,255,0.28)', Icon: Info          },
}

/* ── Context ────────────────────────────────────────────────── */
const ToastCtx = createContext(() => {})

export const useToast = () => useContext(ToastCtx)

/* ── Single toast item ──────────────────────────────────────── */
function ToastItem({ id, message, type, onDismiss }) {
  const th = THEMES[type] ?? THEMES.info
  const { Icon } = th
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0,  scale: 1     }}
      exit={{    opacity: 0, x: 60, scale: 0.92  }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '11px 14px',
        borderRadius: 8,
        background: th.bg,
        border: `1px solid ${th.border}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${th.border}`,
        maxWidth: 340,
        backdropFilter: 'blur(8px)',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      <Icon size={15} style={{ color: th.color, flexShrink: 0, marginTop: 1 }} />
      <p style={{ flex: 1, color: '#e2e8f0', fontSize: 13, lineHeight: 1.45,
                  fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        {message}
      </p>
      <button
        onClick={() => onDismiss(id)}
        style={{ color: '#4a5568', background: 'none', border: 'none', cursor: 'pointer',
                 padding: 0, lineHeight: 1, flexShrink: 0, marginTop: 1 }}
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </motion.div>
  )
}

/* ── Provider ───────────────────────────────────────────────── */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback(id =>
    setToasts(prev => prev.filter(t => t.id !== id)),
  [])

  /**
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration  ms before auto-dismiss; 0 = manual only
   */
  const toast = useCallback((message, type = 'info', duration = 4500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-4), { id, message, type }])
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  return (
    <ToastCtx.Provider value={toast}>
      {children}

      {/* Toast stack — bottom-right, above everything */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <ToastItem {...t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
