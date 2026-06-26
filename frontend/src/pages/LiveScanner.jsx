import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shuffle, Target, ShieldAlert, Shield,
  Cpu, AlertTriangle, ChevronRight, Zap,
} from 'lucide-react'
import { apiUrl } from '../config/api'

/* ─── Field metadata ────────────────────────────────────────── */
const FIELDS = [
  { key: 'flow_duration', label: 'Flow Duration',       unit: 'µs',   ph: '72,879,388',  hint: 'Flow lifetime in microseconds' },
  { key: 'fwd_pkts',      label: 'Total Fwd Packets',   unit: 'pkts', ph: '8',           hint: 'Packets from client → server' },
  { key: 'bwd_pkts',      label: 'Total Bwd Packets',   unit: 'pkts', ph: '4',           hint: 'Packets from server → client' },
  { key: 'bytes_s',       label: 'Flow Bytes/s',        unit: 'B/s',  ph: '159.9',       hint: 'Total bytes transferred per second' },
  { key: 'pkts_s',        label: 'Flow Packets/s',      unit: 'pps',  ph: '0.20',        hint: 'Total packets per second' },
  { key: 'iat_mean',      label: 'Flow IAT Mean',       unit: 'µs',   ph: '6,625,399',   hint: 'Mean inter-arrival time between packets' },
  { key: 'fwd_psh',       label: 'Fwd PSH Flags',       unit: '',     ph: '0',           hint: 'TCP PSH flag count, forward direction' },
  { key: 'bwd_psh',       label: 'Bwd PSH Flags',       unit: '',     ph: '0',           hint: 'TCP PSH flag count, backward direction' },
  { key: 'fwd_urg',       label: 'Fwd URG Flags',       unit: '',     ph: '0',           hint: 'TCP URG flag count, forward direction' },
  { key: 'bwd_urg',       label: 'Bwd URG Flags',       unit: '',     ph: '0',           hint: 'TCP URG flag count, backward direction' },
]

/* ─── Presets (exact CICIDS 2017 test-set rows from eval) ───── */
const DDOS_PRESET = {
  flow_duration: '72879388',
  fwd_pkts: '8',   bwd_pkts: '4',
  bytes_s: '159.9', pkts_s: '0.2',
  iat_mean: '6625398.9',
  fwd_psh: '0', bwd_psh: '0', fwd_urg: '0', bwd_urg: '0',
}
const NORMAL_PRESET = {
  flow_duration: '81387224',
  fwd_pkts: '5',   bwd_pkts: '9',
  bytes_s: '143.5', pkts_s: '0.2',
  iat_mean: '6260555.7',
  fwd_psh: '0', bwd_psh: '0', fwd_urg: '0', bwd_urg: '0',
}

/* ─── Feature importances (our trained RandomForest, 10 trees) ─ */
const IMPORTANCES = [
  { label: 'Total Fwd Packets',  key: 'fwd_pkts',      pct: 41.76 },
  { label: 'Total Bwd Packets',  key: 'bwd_pkts',      pct: 24.44 },
  { label: 'Flow Duration',      key: 'flow_duration', pct:  9.98 },
  { label: 'Flow Bytes/s',       key: 'bytes_s',       pct:  9.53 },
  { label: 'Flow Packets/s',     key: 'pkts_s',        pct:  6.97 },
  { label: 'Flow IAT Mean',      key: 'iat_mean',      pct:  5.34 },
  { label: 'Fwd PSH Flags',      key: 'fwd_psh',       pct:  1.98 },
  { label: 'Bwd PSH Flags',      key: 'bwd_psh',       pct:  0.00 },
  { label: 'Fwd URG Flags',      key: 'fwd_urg',       pct:  0.00 },
  { label: 'Bwd URG Flags',      key: 'bwd_urg',       pct:  0.00 },
]

/* ─── Scan terminal log steps ───────────────────────────────── */
const SCAN_STEPS = [
  { ms: 0,    text: 'Flow ingested. Parsing CICFlowMeter features…' },
  { ms: 340,  text: 'Extracting 10-feature vector from payload…' },
  { ms: 680,  text: 'Applying StandardScaler normalization…' },
  { ms: 1020, text: 'Running RandomForest inference (100 estimators)…' },
  { ms: 1360, text: 'Aggregating tree votes, computing probabilities…' },
  { ms: 1700, text: 'Threat classification complete.' },
]
const MIN_SCAN_MS = 2100

/* ─── Helpers ───────────────────────────────────────────────── */
const initValues = () => Object.fromEntries(FIELDS.map(f => [f.key, '']))
const sleep = ms => new Promise(r => setTimeout(r, ms))

function randomSample() {
  // 65 % attack-like  |  35 % benign-like
  if (Math.random() < 0.65) {
    return {
      flow_duration: String(Math.round(40e6 + Math.random() * 50e6)),
      fwd_pkts:      String(Math.round(6 + Math.random() * 3)),
      bwd_pkts:      String(Math.round(2 + Math.random() * 5)),
      bytes_s:       (120 + Math.random() * 80).toFixed(1),
      pkts_s:        (0.1 + Math.random() * 0.3).toFixed(2),
      iat_mean:      String(Math.round(3e6 + Math.random() * 6e6)),
      fwd_psh: '0', bwd_psh: '0', fwd_urg: '0', bwd_urg: '0',
    }
  }
  return {
    flow_duration: String(Math.round(1e6 + Math.random() * 15e6)),
    fwd_pkts:      String(Math.round(1 + Math.random() * 5)),
    bwd_pkts:      String(Math.round(4 + Math.random() * 8)),
    bytes_s:       (800 + Math.random() * 3000).toFixed(1),
    pkts_s:        (3 + Math.random() * 15).toFixed(2),
    iat_mean:      String(Math.round(100e3 + Math.random() * 800e3)),
    fwd_psh:       String(Math.floor(Math.random() * 2)),
    bwd_psh: '0', fwd_urg: '0', bwd_urg: '0',
  }
}

/* ─── Panel animation variants ──────────────────────────────── */
const panelAnim = {
  enter:   { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.22 } },
}

/* ─── Idle panel ────────────────────────────────────────────── */
function IdlePanel() {
  return (
    <motion.div
      key="idle"
      variants={panelAnim} initial="enter" animate="visible" exit="exit"
      className="flex flex-col items-center justify-center gap-4 h-full"
      style={{ minHeight: 440 }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 72, height: 72,
          background: 'rgba(0,212,255,0.06)',
          border: '1px solid rgba(0,212,255,0.15)',
          boxShadow: '0 0 30px rgba(0,212,255,0.08)',
        }}
      >
        <Target size={30} style={{ color: 'rgba(0,212,255,0.5)' }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: '#64748b' }}>
          Awaiting flow submission
        </p>
        <p className="text-xs mt-1" style={{ color: '#1a2744' }}>
          Load a preset or enter values, then click Analyze Traffic
        </p>
      </div>
      <div className="flex gap-2 mt-2">
        {['Flow Duration', 'Fwd Pkts', 'Bwd Pkts', 'Bytes/s', 'Pkts/s'].map(f => (
          <span
            key={f}
            className="text-xs px-2 py-0.5 rounded font-data"
            style={{ color: '#1a2744', border: '1px solid #1a2744' }}
          >
            {f}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

/* ─── Scan animation panel ──────────────────────────────────── */
function ScanPanel({ logs }) {
  return (
    <motion.div
      key="scan"
      variants={panelAnim} initial="enter" animate="visible" exit="exit"
      className="relative overflow-hidden rounded-lg"
      style={{
        minHeight: 440,
        background: '#050b14',
        border: '1px solid rgba(0,255,136,0.2)',
        boxShadow: '0 0 40px rgba(0,255,136,0.06)',
      }}
    >
      {/* CRT scanline texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
          zIndex: 0,
        }}
      />

      {/* Sweep blade — sharp leading edge, soft trailing glow */}
      <motion.div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ zIndex: 2 }}
        animate={{ top: ['2%', '98%'] }}
        transition={{ duration: 1.6, ease: 'linear', repeat: Infinity }}
      >
        {/* Trailing glow */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 60,
          background: 'linear-gradient(to top, transparent, rgba(0,255,136,0.06))',
        }} />
        {/* Sharp blade */}
        <div style={{
          height: 2,
          background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,136,0.7) 20%, #00ff88 50%, rgba(0,255,136,0.7) 80%, transparent 100%)',
          boxShadow: '0 0 8px rgba(0,255,136,0.9), 0 0 20px rgba(0,255,136,0.4)',
        }} />
        {/* Leading edge hot spot */}
        <div style={{
          position: 'absolute', top: 2, left: 0, right: 0,
          height: 6,
          background: 'linear-gradient(to bottom, rgba(0,255,136,0.08), transparent)',
        }} />
      </motion.div>

      {/* Terminal content */}
      <div className="relative p-5 font-data text-xs" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(0,255,136,0.12)' }}>
          <span style={{ color: '#00ff88', fontSize: 10 }}>●</span>
          <span className="tracking-widest uppercase" style={{ color: '#00ff88', fontSize: 10 }}>
            NETGUARD AI — THREAT ANALYSIS ENGINE
          </span>
        </div>

        {/* Log steps */}
        <div className="space-y-2">
          {SCAN_STEPS.map((step, i) => {
            const visible = logs.includes(i)
            return (
              <div key={i} className="flex items-start gap-2" style={{ minHeight: 18 }}>
                <span style={{ color: visible ? '#00ff88' : '#1a2744', flexShrink: 0 }}>
                  {visible ? '✓' : '·'}
                </span>
                <AnimatePresence>
                  {visible && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ color: i === logs[logs.length - 1] ? '#a7f3d0' : 'rgba(0,255,136,0.5)' }}
                    >
                      {step.text}
                      {i === logs[logs.length - 1] && i < SCAN_STEPS.length - 1 && (
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          style={{ marginLeft: 2 }}
                        >_</motion.span>
                      )}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {/* Hex data rows (decorative, mimic network packet bytes) */}
        <div className="mt-6 space-y-1 opacity-25" style={{ color: '#00ff88', fontSize: 10 }}>
          {[
            '45 00 00 3c 1c 46 40 00 40 06 b1 e6 c0 a8 0a 05',
            'cd ae a8 45 e1 f0 00 50 a2 3b 5f 3c 00 00 00 00',
            'a0 02 fa f0 7d 56 00 00 02 04 05 b4 04 02 08 0a',
          ].map((row, i) => (
            <div key={i} className="font-data tracking-wider">{row}</div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-6">
          {SCAN_STEPS.map((_, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{ width: 6, height: 6 }}
              animate={{
                background: logs.includes(i) ? '#00ff88' : 'rgba(0,255,136,0.15)',
                boxShadow: logs.includes(i) ? '0 0 6px rgba(0,255,136,0.8)' : 'none',
              }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Result panel ──────────────────────────────────────────── */
function ResultPanel({ result, values }) {
  const isAtk   = result.prediction === 'ATTACK'
  const primary = isAtk ? '#ff4444' : '#00ff88'
  const confPct = +(result.confidence * 100).toFixed(2)
  const atkPct  = +(result.attack_probability * 100).toFixed(2)

  return (
    <motion.div
      key="result"
      variants={panelAnim} initial="enter" animate="visible" exit="exit"
      className="rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${primary}35`,
        boxShadow: `0 0 40px ${primary}12, 0 0 0 1px ${primary}20`,
        background: '#0a0e1a',
      }}
    >
      {/* ── Verdict banner ─────────────────────────────── */}
      <div
        className="relative overflow-hidden px-6 py-5 flex flex-col items-center text-center"
        style={{ background: `${isAtk ? 'rgba(255,68,68,0.06)' : 'rgba(0,255,136,0.04)'}`, borderBottom: `1px solid ${primary}20` }}
      >
        {/* Corner blobs */}
        <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full blur-2xl pointer-events-none"
          style={{ background: `${primary}18` }} />
        <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full blur-2xl pointer-events-none"
          style={{ background: `${primary}10` }} />

        {/* Icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className="relative mb-3"
        >
          <div className="absolute inset-0 rounded-full blur-xl" style={{ background: `${primary}30` }} />
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{ width: 52, height: 52, background: `${primary}15`, border: `1px solid ${primary}40` }}
          >
            {isAtk
              ? <ShieldAlert size={22} style={{ color: primary }} />
              : <Shield size={22} style={{ color: primary }} />}
          </div>
        </motion.div>

        {/* Verdict text */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.p
            className="font-data font-bold tracking-widest text-2xl"
            style={{ color: primary }}
            animate={isAtk ? {
              textShadow: [
                `0 0 18px ${primary}80`,
                `0 0 36px ${primary}cc`,
                `0 0 18px ${primary}80`,
              ],
            } : { textShadow: `0 0 20px ${primary}60` }}
            transition={isAtk ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
          >
            {isAtk ? '⚠ ATTACK DETECTED' : '✓ BENIGN TRAFFIC'}
          </motion.p>
          <p className="text-xs mt-1.5" style={{ color: '#64748b' }}>
            {isAtk
              ? 'DDoS flow signature confirmed by RandomForest classifier'
              : 'Normal network traffic — no threat indicators found'}
          </p>
        </motion.div>
      </div>

      {/* ── Metrics row ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-0" style={{ borderBottom: `1px solid ${primary}15` }}>
        {/* Confidence */}
        <div className="p-4" style={{ borderRight: `1px solid ${primary}15` }}>
          <p className="text-xs tracking-widest uppercase font-data mb-2" style={{ color: '#64748b' }}>
            Confidence
          </p>
          <motion.p
            className="font-data font-bold text-2xl mb-2"
            style={{ color: primary, textShadow: `0 0 14px ${primary}50` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {confPct}%
          </motion.p>
          <div className="imp-bar">
            <motion.div
              style={{
                height: '100%', borderRadius: 2,
                background: `linear-gradient(90deg, ${primary}50, ${primary})`,
                boxShadow: `0 0 8px ${primary}50`,
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${confPct}%` }}
              transition={{ duration: 1.1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {/* Attack probability */}
        <div className="p-4">
          <p className="text-xs tracking-widest uppercase font-data mb-2" style={{ color: '#64748b' }}>
            Attack Probability
          </p>
          <motion.p
            className="font-data font-bold text-2xl mb-2"
            style={{
              color: atkPct > 50 ? '#ff4444' : '#00ff88',
              textShadow: `0 0 14px ${atkPct > 50 ? '#ff444450' : '#00ff8850'}`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            {atkPct}%
          </motion.p>
          <div className="imp-bar">
            <motion.div
              style={{
                height: '100%', borderRadius: 2,
                background: atkPct > 50
                  ? 'linear-gradient(90deg, rgba(255,68,68,0.4), #ff4444)'
                  : 'linear-gradient(90deg, rgba(0,255,136,0.4), #00ff88)',
                boxShadow: `0 0 8px ${atkPct > 50 ? 'rgba(255,68,68,0.4)' : 'rgba(0,255,136,0.4)'}`,
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${atkPct}%` }}
              transition={{ duration: 1.1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </div>

      {/* ── Threat badge ───────────────────────────────── */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${primary}15` }}>
        <span className="text-xs tracking-widest uppercase font-data" style={{ color: '#64748b' }}>
          Threat Level
        </span>
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, type: 'spring', stiffness: 180 }}
          className={`badge-${result.threat_level} px-3 py-1 rounded font-data font-semibold text-sm tracking-wider`}
        >
          {result.threat_level}
        </motion.span>
      </div>

      {/* ── Feature contribution breakdown ─────────────── */}
      <div className="p-4">
        <p className="text-xs tracking-widest uppercase font-data mb-3" style={{ color: '#64748b' }}>
          Feature Importance Breakdown
        </p>
        <div className="space-y-2.5">
          {IMPORTANCES.map((feat, i) => {
            const rawVal = parseFloat(values[feat.key] || '0')
            const isTop3 = i < 3
            return (
              <motion.div
                key={feat.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 + i * 0.05, duration: 0.28 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-xs font-data truncate mr-3"
                    style={{ color: isTop3 ? '#94a3b8' : '#4a5568', maxWidth: '55%' }}
                  >
                    {isTop3 && (
                      <span className="mr-1" style={{ color: '#00d4ff', fontSize: 10 }}>▸</span>
                    )}
                    {feat.label}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-xs font-data"
                      style={{ color: '#64748b', width: 36, textAlign: 'right' }}
                    >
                      {feat.pct.toFixed(2)}%
                    </span>
                    <span
                      className="text-xs font-data font-medium"
                      style={{
                        color: isTop3 ? (isAtk ? '#ff6666' : '#00d4ff') : '#374151',
                        width: 80,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {rawVal >= 1e6
                        ? `${(rawVal / 1e6).toFixed(2)}M`
                        : rawVal >= 1e3
                        ? `${(rawVal / 1e3).toFixed(1)}k`
                        : rawVal.toFixed(rawVal % 1 === 0 ? 0 : 2)}
                    </span>
                  </div>
                </div>
                <div className="imp-bar" style={{ height: isTop3 ? 5 : 3 }}>
                  <motion.div
                    style={{
                      height: '100%', borderRadius: 2,
                      background: isTop3
                        ? `linear-gradient(90deg, rgba(0,212,255,0.3), #00d4ff)`
                        : 'rgba(0,212,255,0.15)',
                      boxShadow: isTop3 ? '0 0 6px rgba(0,212,255,0.3)' : 'none',
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${(feat.pct / 41.76) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.7 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
        <p className="text-xs mt-3" style={{ color: '#374151' }}>
          ▸ marks features with highest model influence. Values shown from your input.
        </p>
      </div>
    </motion.div>
  )
}

/* ─── Error panel ───────────────────────────────────────────── */
function ErrorPanel({ message, onRetry }) {
  return (
    <motion.div
      key="error"
      variants={panelAnim} initial="enter" animate="visible" exit="exit"
      className="flex flex-col items-center justify-center gap-4 rounded-lg p-8"
      style={{
        minHeight: 440,
        border: '1px solid rgba(255,68,68,0.25)',
        background: 'rgba(255,68,68,0.03)',
      }}
    >
      <AlertTriangle size={32} style={{ color: '#ff4444', opacity: 0.7 }} />
      <div className="text-center">
        <p className="text-sm font-semibold mb-1" style={{ color: '#ff6666' }}>Analysis Failed</p>
        <p className="text-xs font-data" style={{ color: '#64748b', maxWidth: 280 }}>
          {message.toLowerCase().includes('fetch') || message.toLowerCase().includes('failed to fetch')
            ? 'Backend is offline. Run: cd backend && python app.py'
            : message}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="text-xs px-4 py-1.5 rounded font-data"
        style={{ color: '#ff4444', border: '1px solid rgba(255,68,68,0.3)', background: 'rgba(255,68,68,0.06)' }}
      >
        Retry
      </button>
    </motion.div>
  )
}

/* ─── Main component ────────────────────────────────────────── */
export default function LiveScanner() {
  const [values,  setValues]  = useState(initValues)
  const [phase,   setPhase]   = useState('idle')   // idle|scanning|done|error
  const [result,  setResult]  = useState(null)
  const [errMsg,  setErrMsg]  = useState(null)
  const [logs,    setLogs]    = useState([])
  const [touched, setTouched] = useState({})
  const abortRef = useRef(null)

  /* Load a preset object into state */
  const loadPreset = useCallback(preset => {
    setValues(preset)
    setPhase('idle')
    setResult(null)
    setErrMsg(null)
    setTouched(Object.fromEntries(FIELDS.map(f => [f.key, true])))
  }, [])

  /* Fire scan log timers */
  const runScanLog = useCallback(() => {
    const ids = SCAN_STEPS.map((step, i) =>
      setTimeout(() => setLogs(prev => [...prev, i]), step.ms)
    )
    return () => ids.forEach(clearTimeout)
  }, [])

  const handleAnalyze = async () => {
    // Validate
    const bad = FIELDS.find(f => {
      const v = values[f.key]
      return v === '' || isNaN(parseFloat(v))
    })
    if (bad) {
      setErrMsg(`Fill in a valid number for "${bad.label}"`)
      setPhase('error')
      return
    }
    const features = FIELDS.map(f => parseFloat(values[f.key]))

    setPhase('scanning')
    setResult(null)
    setErrMsg(null)
    setLogs([])

    const cleanupLog = runScanLog()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const [apiRes] = await Promise.all([
        fetch(apiUrl('/api/predict'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features }),
          signal: controller.signal,
        }).then(r => r.json()),
        sleep(MIN_SCAN_MS),
      ])
      setResult(apiRes)
      setPhase('done')
    } catch (err) {
      if (err.name !== 'AbortError') {
        setErrMsg(err.message)
        setPhase('error')
      }
    } finally {
      cleanupLog()
    }
  }

  const handleReset = () => {
    abortRef.current?.abort()
    setPhase('idle')
    setResult(null)
    setErrMsg(null)
    setLogs([])
  }

  /* Input focus/blur glow */
  const glow = e => { e.target.style.borderColor = 'rgba(0,212,255,0.5)'; e.target.style.boxShadow = '0 0 0 1px rgba(0,212,255,0.15)' }
  const dim  = e => { e.target.style.borderColor = '#1a2744'; e.target.style.boxShadow = 'none' }

  const isScanning = phase === 'scanning'

  return (
    <div className="space-y-5">

      {/* ── Page header ─────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Live Scanner</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            Submit a single network flow for real-time threat classification.
          </p>
        </div>
        {phase === 'done' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleReset}
            className="text-xs px-3 py-1.5 rounded font-data flex-shrink-0"
            style={{ color: '#64748b', border: '1px solid #1a2744', background: 'rgba(255,255,255,0.02)' }}
          >
            ← New Scan
          </motion.button>
        )}
      </div>

      {/* ── Main layout ─────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">

        {/* Form column — 2/5 */}
        <div className="xl:col-span-2 space-y-3">

          {/* Preset / randomize buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => loadPreset(DDOS_PRESET)}
              disabled={isScanning}
              className="flex flex-col items-center gap-1 py-2.5 px-2 rounded text-center transition-all"
              style={{
                background: 'rgba(255,68,68,0.07)',
                border: '1px solid rgba(255,68,68,0.25)',
                cursor: isScanning ? 'not-allowed' : 'pointer',
                opacity: isScanning ? 0.4 : 1,
              }}
            >
              <ShieldAlert size={14} style={{ color: '#ff4444' }} />
              <span className="font-data text-xs font-semibold" style={{ color: '#ff6666' }}>DDoS</span>
              <span className="text-xs" style={{ color: '#64748b', fontSize: 10 }}>99.98% attack</span>
            </button>

            <button
              onClick={() => loadPreset(NORMAL_PRESET)}
              disabled={isScanning}
              className="flex flex-col items-center gap-1 py-2.5 px-2 rounded text-center transition-all"
              style={{
                background: 'rgba(0,255,136,0.06)',
                border: '1px solid rgba(0,255,136,0.2)',
                cursor: isScanning ? 'not-allowed' : 'pointer',
                opacity: isScanning ? 0.4 : 1,
              }}
            >
              <Shield size={14} style={{ color: '#00ff88' }} />
              <span className="font-data text-xs font-semibold" style={{ color: '#00ff88' }}>Normal</span>
              <span className="text-xs" style={{ color: '#64748b', fontSize: 10 }}>99.98% benign</span>
            </button>

            <button
              onClick={() => { loadPreset(randomSample()) }}
              disabled={isScanning}
              className="flex flex-col items-center gap-1 py-2.5 px-2 rounded text-center transition-all"
              style={{
                background: 'rgba(255,170,0,0.06)',
                border: '1px solid rgba(255,170,0,0.2)',
                cursor: isScanning ? 'not-allowed' : 'pointer',
                opacity: isScanning ? 0.4 : 1,
              }}
            >
              <Shuffle size={14} style={{ color: '#ffaa00' }} />
              <span className="font-data text-xs font-semibold" style={{ color: '#ffaa00' }}>Random</span>
              <span className="text-xs" style={{ color: '#64748b', fontSize: 10 }}>randomize</span>
            </button>
          </div>

          {/* Input form */}
          <div
            className="rounded-lg p-4 space-y-3"
            style={{ background: '#0f1629', border: '1px solid #1a2744' }}
          >
            <p className="text-xs tracking-widest uppercase font-data" style={{ color: '#64748b' }}>
              Flow Features
            </p>

            {FIELDS.map((f, fi) => {
              const hasVal = values[f.key] !== '' && !isNaN(parseFloat(values[f.key]))
              return (
                <div key={f.key}>
                  <label
                    className="flex items-center justify-between mb-1"
                    htmlFor={`field-${f.key}`}
                  >
                    <span className="text-xs font-data" style={{ color: '#94a3b8' }}>
                      {fi + 1 < 10 ? `0${fi + 1}` : fi + 1}. {f.label}
                    </span>
                    {f.unit && (
                      <span className="text-xs font-data" style={{ color: '#374151' }}>{f.unit}</span>
                    )}
                  </label>
                  <input
                    id={`field-${f.key}`}
                    type="number"
                    step="any"
                    value={values[f.key]}
                    placeholder={f.ph}
                    disabled={isScanning}
                    onChange={e => {
                      setValues(v => ({ ...v, [f.key]: e.target.value }))
                      setTouched(t => ({ ...t, [f.key]: true }))
                    }}
                    onFocus={glow}
                    onBlur={dim}
                    className="w-full px-3 py-1.5 rounded text-xs font-data outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid #1a2744',
                      color: hasVal ? '#e2e8f0' : '#374151',
                      caretColor: '#00d4ff',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      cursor: isScanning ? 'not-allowed' : 'text',
                    }}
                  />
                </div>
              )
            })}
          </div>

          {/* Analyze button */}
          <motion.button
            onClick={handleAnalyze}
            disabled={isScanning}
            whileHover={isScanning ? {} : { scale: 1.01 }}
            whileTap={isScanning ? {} : { scale: 0.99 }}
            className="w-full py-3 rounded font-data font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2"
            style={{
              background: isScanning
                ? 'rgba(0,212,255,0.04)'
                : 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,212,255,0.08))',
              border: `1px solid rgba(0,212,255,${isScanning ? 0.1 : 0.4})`,
              color: isScanning ? '#374151' : '#00d4ff',
              boxShadow: isScanning ? 'none' : '0 0 24px rgba(0,212,255,0.12), inset 0 1px 0 rgba(0,212,255,0.1)',
              cursor: isScanning ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isScanning ? (
              <>
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ◈
                </motion.span>
                Analyzing…
              </>
            ) : (
              <>
                <Zap size={15} />
                Analyze Traffic
              </>
            )}
          </motion.button>

          {/* Feature order legend */}
          <div
            className="rounded p-3 text-xs font-data"
            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #0f1629', color: '#374151' }}
          >
            Feature order sent to API: Duration · FwdPkts · BwdPkts · Bytes/s · Pkts/s · IAT Mean · FwdPSH · BwdPSH · FwdURG · BwdURG
          </div>
        </div>

        {/* Result column — 3/5 */}
        <div className="xl:col-span-3">
          <AnimatePresence mode="wait">
            {phase === 'idle'     && <IdlePanel key="idle" />}
            {phase === 'scanning' && <ScanPanel key="scan" logs={logs} />}
            {phase === 'done'     && <ResultPanel key="done" result={result} values={values} />}
            {phase === 'error'    && <ErrorPanel key="err" message={errMsg} onRetry={handleReset} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
