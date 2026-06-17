/**
 * Spinner.jsx — consistent loading indicator used across all pages.
 *
 * <Spinner />                    inline, cyan, 20px
 * <Spinner size={32} color="#ff4444" />
 * <SpinnerPage message="Loading model…" />   full-panel centred variant
 */
import { motion } from 'framer-motion'

export function Spinner({ size = 20, color = '#00d4ff', style: extraStyle = {} }) {
  return (
    <motion.span
      display="inline-block"
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid rgba(0,212,255,0.15)`,
        borderTopColor: color,
        flexShrink: 0,
        ...extraStyle,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.72, repeat: Infinity, ease: 'linear' }}
    />
  )
}

/** Full-panel variant for pages that are waiting for an initial load. */
export function SpinnerPage({ message = 'Loading…' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        minHeight: 240,
        padding: 40,
      }}
    >
      <Spinner size={30} />
      <p
        style={{
          color: '#64748b',
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          margin: 0,
        }}
      >
        {message}
      </p>
    </div>
  )
}
