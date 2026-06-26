import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Papa from 'papaparse'
import {
  Upload, FileText, Table2, Play, Download,
  RefreshCw, ShieldAlert, Shield, AlertTriangle,
  CheckCircle, BarChart3, Layers,
} from 'lucide-react'
import { apiUrl } from '../config/api'

/* ─── Feature column names (match train_model.py exactly) ───── */
const FEATURE_COLS = [
  'Flow Duration',
  'Total Fwd Packets',
  'Total Backward Packets',
  'Flow Bytes/s',
  'Flow Packets/s',
  'Flow IAT Mean',
  'Fwd PSH Flags',
  'Bwd PSH Flags',
  'Fwd URG Flags',
  'Bwd URG Flags',
]

/* Short names for table headers */
const COL_SHORT = ['Duration', 'Fwd', 'Bwd', 'Bytes/s', 'Pkts/s', 'IAT Mean', 'FwdPSH', 'BwdPSH', 'FwdURG', 'BwdURG']

/* ─── Helpers ───────────────────────────────────────────────── */
const sleep = ms => new Promise(r => setTimeout(r, ms))

/** Extract a 10-number feature vector from a parsed CSV row object. */
function rowToVec(row) {
  const byName = FEATURE_COLS.map(col => parseFloat(row[col]))
  if (byName.every(v => !Number.isNaN(v))) return byName
  // Fallback: use first 10 columns in order
  return Object.values(row).slice(0, 10).map(v => {
    const f = parseFloat(v); return Number.isNaN(f) ? 0 : f
  })
}

/** Check if a CSV row has our expected column names. */
function hasExpectedCols(row) {
  return FEATURE_COLS.slice(0, 6).every(c =>
    Object.keys(row).some(k => k.trim() === c)
  )
}

/** Format a feature value for compact table display. */
function fmtVal(v) {
  const n = Number(v)
  if (Number.isNaN(n)) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`
  return n % 1 === 0 ? String(n) : n.toFixed(n >= 10 ? 1 : 2)
}

/** Build and trigger a CSV download of batch results. */
function downloadReport(rows, results, fileName) {
  const headers = ['#', ...COL_SHORT, 'Prediction', 'Confidence%', 'Threat', 'AttackProb%']
  const body = results.each_result.map(r => {
    const srcRow = rows[r.index] ?? {}
    const feats = FEATURE_COLS.map(c => srcRow[c] ?? '')
    return [
      r.index + 1,
      ...feats,
      r.prediction,
      (r.confidence * 100).toFixed(2),
      r.threat_level,
      (r.attack_probability * 100).toFixed(2),
    ]
  })
  const csv = [headers, ...body].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `netguard-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/* ─── Progress steps ────────────────────────────────────────── */
const PROG_STEPS = [
  { at: 0,  label: 'Parsing flow records…' },
  { at: 22, label: 'Normalising with StandardScaler…' },
  { at: 46, label: 'Running RandomForest inference (100 trees)…' },
  { at: 72, label: 'Aggregating prediction votes…' },
  { at: 88, label: 'Generating threat report…' },
]

/* ─── Panel variants ────────────────────────────────────────── */
const pv = {
  enter:   { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.22 } },
}

/* ═══════════════════════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════════════════════ */

/* ── Upload zone ──────────────────────────────────────────────── */
function UploadZone({ onFile }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDragOver  = e => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)
  const handleDrop      = e => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }
  const handleChange = e => { const f = e.target.files?.[0]; if (f) onFile(f) }

  return (
    <div className="grid gap-4 items-stretch">
      {/* Drop zone — 2/3 */}
      <motion.div
        className="relative flex flex-col items-center justify-center gap-3 py-10 px-6 rounded-lg cursor-pointer text-center"
        style={{
          border: `2px dashed ${dragging ? '#00d4ff' : 'rgba(0,212,255,0.35)'}`,
          background: dragging ? 'rgba(0,212,255,0.04)' : 'transparent',
          boxShadow: dragging ? '0 0 30px rgba(0,212,255,0.1), inset 0 0 30px rgba(0,212,255,0.03)' : 'none',
          transition: 'all 0.2s ease',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        whileHover={{ borderColor: 'rgba(0,212,255,0.65)' }}
      >
        <motion.div
          animate={dragging ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <div
            className="flex items-center justify-center w-14 h-14 rounded-full"
            style={{
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.25)',
              boxShadow: '0 0 20px rgba(0,212,255,0.1)',
            }}
          >
            <Upload size={22} style={{ color: '#00d4ff' }} />
          </div>
        </motion.div>

        <div>
          <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
            {dragging ? 'Release to upload' : 'Drop your CSV here'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#64748b' }}>
            or <span style={{ color: '#00d4ff' }}>click to browse</span> · .csv files only
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5 mt-1">
          {['Flow Duration', 'Fwd Pkts', 'Bwd Pkts', 'Bytes/s', '…+6 more'].map(c => (
            <span
              key={c}
              className="text-xs font-data px-2 py-0.5 rounded"
              style={{ color: '#374151', border: '1px solid #1a2744' }}
            >
              {c}
            </span>
          ))}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleChange}
          onClick={e => { e.target.value = '' }}
        />
      </motion.div>

      {/* Demo button — 1/3 */}
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-lg p-6 text-center"
        style={{ background: '#0f1629', border: '1px solid #1a2744' }}
      >
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full"
          style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.2)' }}
        >
          <Layers size={20} style={{ color: '#ffaa00' }} />
        </div>
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#e2e8f0' }}>Upload Required</p>
          <p className="text-xs" style={{ color: '#64748b' }}>
            Upload a CSV to run the backend classifier on real flow data.
          </p>
        </div>
        <button
          disabled
          className="w-full py-2 rounded text-xs font-data font-semibold tracking-wide transition-all"
          style={{
            background: 'rgba(255,170,0,0.08)',
            border: '1px solid rgba(255,170,0,0.3)',
            color: '#ffaa00',
          }}
        >
          No Sample Data
        </button>
      </div>
    </div>
  )
}

/* ── File info bar ────────────────────────────────────────────── */
function FileInfoBar({ fileName, rowCount, colWarning, onClear }) {
  return (
    <motion.div
      variants={pv} initial="enter" animate="visible"
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
      style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}
    >
      <FileText size={15} style={{ color: '#00d4ff', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-data font-medium truncate" style={{ color: '#e2e8f0' }}>
          {fileName}
        </span>
        <span className="ml-3 text-xs font-data" style={{ color: '#64748b' }}>
          {rowCount} rows
        </span>
        {colWarning && (
          <span className="ml-3 text-xs font-data" style={{ color: '#ffaa00' }}>
            ⚠ Column names not recognised — using positional order
          </span>
        )}
      </div>
      <button
        onClick={onClear}
        className="text-xs font-data px-2 py-1 rounded flex-shrink-0"
        style={{ color: '#64748b', border: '1px solid #1a2744' }}
      >
        Clear
      </button>
    </motion.div>
  )
}

/* ── Preview table — first 5 rows ─────────────────────────────── */
function PreviewTable({ rows }) {
  const preview = rows.slice(0, 5)
  return (
    <motion.div
      variants={pv} initial="enter" animate="visible"
      className="rounded-lg overflow-hidden"
      style={{ background: '#0f1629', border: '1px solid #1a2744' }}
    >
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid #1a2744' }}>
        <Table2 size={13} style={{ color: '#64748b' }} />
        <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>
          Data Preview
        </span>
        <span className="text-xs" style={{ color: '#64748b' }}>
          (first 5 rows)
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>#</th>
              {COL_SHORT.map(c => <th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i}>
                <td>
                  <span className="font-data text-xs" style={{ color: '#374151' }}>{i + 1}</span>
                </td>
                {FEATURE_COLS.map(col => (
                  <td key={col}>
                    <span className="font-data text-xs" style={{ color: '#94a3b8' }}>
                      {fmtVal(row[col])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

/* ── Progress section ─────────────────────────────────────────── */
function ProgressSection({ progress, rowCount }) {
  const step = [...PROG_STEPS].reverse().find(s => progress >= s.at)

  return (
    <motion.div
      variants={pv} initial="enter" animate="visible"
      className="rounded-lg p-5 space-y-4"
      style={{ background: '#0f1629', border: '1px solid rgba(0,212,255,0.15)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw size={14} style={{ color: '#00d4ff' }} />
          </motion.div>
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
            Analyzing {rowCount} flows…
          </span>
        </div>
        <span className="font-data text-sm font-bold" style={{ color: '#00d4ff' }}>
          {Math.round(progress)}%
        </span>
      </div>

      {/* Bar */}
      <div
        className="relative rounded-full overflow-hidden"
        style={{ height: 8, background: 'rgba(0,212,255,0.1)' }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, rgba(0,212,255,0.5), #00d4ff)',
            boxShadow: '0 0 12px rgba(0,212,255,0.6)',
          }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
        {/* Shimmer */}
        <motion.div
          className="absolute inset-y-0 w-20 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
          animate={{ left: ['-20%', '120%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Step label */}
      <AnimatePresence mode="wait">
        <motion.p
          key={step?.label}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs font-data"
          style={{ color: '#64748b' }}
        >
          {step?.label}
        </motion.p>
      </AnimatePresence>

      {/* Step dots */}
      <div className="flex items-center gap-2">
        {PROG_STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <motion.div
              className="rounded-full"
              style={{ width: 7, height: 7 }}
              animate={{
                background: progress >= s.at ? '#00d4ff' : 'rgba(0,212,255,0.15)',
                boxShadow: progress >= s.at ? '0 0 6px rgba(0,212,255,0.7)' : 'none',
              }}
            />
            {i < PROG_STEPS.length - 1 && (
              <div style={{ width: 12, height: 1, background: progress >= PROG_STEPS[i + 1].at ? 'rgba(0,212,255,0.4)' : '#1a2744' }} />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ── Summary cards ────────────────────────────────────────────── */
function SummaryCards({ results }) {
  const detectionRate = `${((results.attacks_detected / results.total) * 100).toFixed(1)}%`
  const cards = [
    { label: 'Total Flows',   value: results.total,             Icon: Layers,      color: '#00d4ff', glow: 'rgba(0,212,255,0.2)',  border: 'rgba(0,212,255,0.25)' },
    { label: 'Attacks Found', value: results.attacks_detected,  Icon: ShieldAlert,  color: '#ff4444', glow: 'rgba(255,68,68,0.18)', border: 'rgba(255,68,68,0.25)'  },
    { label: 'Benign',        value: results.benign,            Icon: Shield,       color: '#00ff88', glow: 'rgba(0,255,136,0.18)', border: 'rgba(0,255,136,0.25)'  },
    { label: 'Detection Rate',value: detectionRate,             Icon: BarChart3,    color: '#ffaa00', glow: 'rgba(255,170,0,0.18)', border: 'rgba(255,170,0,0.25)'  },
  ]
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 * i, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-lg p-4"
          style={{
            background: '#0f1629',
            border: `1px solid ${c.border}`,
            boxShadow: `0 0 0 1px ${c.border}, 0 0 24px ${c.glow}, 0 8px 24px rgba(0,0,0,0.4)`,
          }}
        >
          <div className="absolute -top-5 -right-5 w-16 h-16 rounded-full blur-2xl pointer-events-none"
            style={{ background: `${c.color}20` }} />
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs tracking-widest uppercase font-data" style={{ color: '#64748b' }}>{c.label}</p>
            <c.Icon size={13} style={{ color: c.color, opacity: 0.7 }} />
          </div>
          <p
            className="text-2xl font-bold font-data leading-none"
            style={{ color: c.color, textShadow: `0 0 18px ${c.color}60` }}
          >
            {c.value}
          </p>
        </motion.div>
      ))}
    </div>
  )
}

/* ── Results table ────────────────────────────────────────────── */
function ResultsTable({ rows, results }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-lg overflow-hidden"
      style={{ background: '#0f1629', border: '1px solid #1a2744' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #1a2744' }}
      >
        <div>
          <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Flow-by-Flow Results</h3>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            {results.attacks_detected} attacks highlighted in red · {results.benign} benign flows in green
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 text-xs font-data" style={{ color: '#ff4444' }}>
            <div style={{ width: 10, height: 3, background: '#ff4444', borderRadius: 1 }} />ATTACK
          </div>
          <div className="flex items-center gap-1.5 text-xs font-data" style={{ color: '#00ff88' }}>
            <div style={{ width: 10, height: 3, background: '#00ff88', borderRadius: 1 }} />BENIGN
          </div>
        </div>
      </div>

      <div className="overflow-x-auto" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        <table className="data-table w-full">
          <thead className="sticky top-0" style={{ background: '#0f1629', zIndex: 1 }}>
            <tr>
              <th>#</th>
              <th>Fwd Pkts</th>
              <th>Bwd Pkts</th>
              <th>Duration</th>
              <th>Bytes/s</th>
              <th>Pkts/s</th>
              <th>Prediction</th>
              <th>Confidence</th>
              <th>Threat</th>
            </tr>
          </thead>
          <tbody>
            {results.each_result.map((r, i) => {
              const isAtk  = r.prediction === 'ATTACK'
              const srcRow = rows[r.index] ?? {}
              return (
                <motion.tr
                  key={r.index}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.5), duration: 0.26 }}
                  style={{
                    background: isAtk ? 'rgba(255,68,68,0.05)' : 'rgba(0,255,136,0.02)',
                    boxShadow: isAtk
                      ? 'inset 3px 0 0 rgba(255,68,68,0.55)'
                      : 'inset 3px 0 0 rgba(0,255,136,0.35)',
                  }}
                >
                  <td>
                    <span className="font-data text-xs" style={{ color: '#374151' }}>
                      {r.index + 1}
                    </span>
                  </td>
                  <td>
                    <span className="font-data text-xs" style={{ color: '#94a3b8' }}>
                      {fmtVal(srcRow['Total Fwd Packets'])}
                    </span>
                  </td>
                  <td>
                    <span className="font-data text-xs" style={{ color: '#94a3b8' }}>
                      {fmtVal(srcRow['Total Backward Packets'])}
                    </span>
                  </td>
                  <td>
                    <span className="font-data text-xs" style={{ color: '#94a3b8' }}>
                      {fmtVal(srcRow['Flow Duration'])}
                    </span>
                  </td>
                  <td>
                    <span
                      className="font-data text-xs"
                      style={{ color: Number(srcRow['Flow Bytes/s']) > 10000 ? '#ff8888' : '#94a3b8' }}
                    >
                      {fmtVal(srcRow['Flow Bytes/s'])}
                    </span>
                  </td>
                  <td>
                    <span
                      className="font-data text-xs"
                      style={{ color: Number(srcRow['Flow Packets/s']) > 50 ? '#ff8888' : '#94a3b8' }}
                    >
                      {fmtVal(srcRow['Flow Packets/s'])}
                    </span>
                  </td>
                  <td>
                    <span
                      className="font-data text-xs font-semibold"
                      style={{ color: isAtk ? '#ff4444' : '#00ff88' }}
                    >
                      {r.prediction}
                    </span>
                  </td>
                  <td>
                    <span className="font-data text-xs" style={{ color: '#94a3b8' }}>
                      {(r.confidence * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <span className={`badge-${r.threat_level} px-2 py-0.5 rounded text-xs font-data font-medium tracking-wider`}>
                      {r.threat_level}
                    </span>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════ */
export default function BatchAnalyzer() {
  /* State */
  const [phase,      setPhase]    = useState('idle')   // idle|preview|analyzing|done|error
  const [rows,       setRows]     = useState([])
  const [fileName,   setFileName] = useState('')
  const [colWarning, setColWarn]  = useState(false)
  const [progress,   setProgress] = useState(0)
  const [results,    setResults]  = useState(null)
  const [errMsg,     setErrMsg]   = useState(null)

  /* Load uploaded CSV */
  const handleFile = useCallback(file => {
    if (!file.name.endsWith('.csv')) {
      setErrMsg('Please upload a .csv file.')
      setPhase('error')
      return
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      complete: ({ data }) => {
        if (!data.length) { setErrMsg('CSV is empty.'); setPhase('error'); return }
        setColWarn(!hasExpectedCols(data[0]))
        setRows(data)
        setFileName(file.name)
        setPhase('preview')
      },
      error: err => { setErrMsg(`Parse error: ${err.message}`); setPhase('error') },
    })
  }, [])

  /* Reset to idle */
  const handleClear = () => {
    setPhase('idle'); setRows([]); setFileName('')
    setResults(null); setErrMsg(null); setProgress(0)
  }

  /* Run batch analysis */
  const handleAnalyze = async () => {
    setPhase('analyzing')
    setProgress(0)
    setResults(null)

    /* Animate progress independently */
    let prog = 0
    const iv = setInterval(() => {
      prog = Math.min(prog + Math.random() * 4.5 + 1.5, 88)
      setProgress(prog)
    }, 140)

    try {
      const flows = rows.map(rowToVec)
      const [apiRes] = await Promise.all([
        fetch(apiUrl('/api/analyze-batch'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flows }),
        }).then(r => r.json()),
        sleep(2000),
      ])

      clearInterval(iv)
      setProgress(100)
      await sleep(350)

      if (apiRes.error) throw new Error(apiRes.error)
      setResults(apiRes)
      setPhase('done')
    } catch (err) {
      clearInterval(iv)
      setErrMsg(
        err.message.toLowerCase().includes('fetch') || err.message.toLowerCase().includes('failed to fetch')
          ? 'Backend offline — run: cd backend && python app.py'
          : err.message
      )
      setPhase('error')
    }
  }

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Batch Analyzer</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            Upload a CSV to classify multiple network flows with the backend model.
          </p>
        </div>
        {phase === 'done' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-data flex-shrink-0"
            style={{ color: '#64748b', border: '1px solid #1a2744', background: 'rgba(255,255,255,0.02)' }}
          >
            <RefreshCw size={11} /> New Batch
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait">

        {/* ── IDLE phase ─────────────────────────────────────── */}
        {phase === 'idle' && (
          <motion.div key="idle" variants={pv} initial="enter" animate="visible" exit="exit">
            <UploadZone onFile={handleFile} />
          </motion.div>
        )}

        {/* ── PREVIEW phase ──────────────────────────────────── */}
        {phase === 'preview' && (
          <motion.div key="preview" variants={pv} initial="enter" animate="visible" exit="exit" className="space-y-4">
            <FileInfoBar
              fileName={fileName}
              rowCount={rows.length}
              colWarning={colWarning}
              onClear={handleClear}
            />
            <PreviewTable rows={rows} />

            {/* Run button */}
            <motion.button
              onClick={handleAnalyze}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded font-data font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(0,212,255,0.14), rgba(0,212,255,0.07))',
                border: '1px solid rgba(0,212,255,0.4)',
                color: '#00d4ff',
                boxShadow: '0 0 24px rgba(0,212,255,0.1), inset 0 1px 0 rgba(0,212,255,0.1)',
              }}
            >
              <Play size={15} />
              Run Batch Analysis · {rows.length} flows
            </motion.button>
          </motion.div>
        )}

        {/* ── ANALYZING phase ────────────────────────────────── */}
        {phase === 'analyzing' && (
          <motion.div key="analyzing" variants={pv} initial="enter" animate="visible" exit="exit" className="space-y-4">
            <FileInfoBar
              fileName={fileName}
              rowCount={rows.length}
              colWarning={false}
              onClear={() => {}}
            />
            <ProgressSection progress={progress} rowCount={rows.length} />
          </motion.div>
        )}

        {/* ── DONE phase ─────────────────────────────────────── */}
        {phase === 'done' && results && (
          <motion.div key="done" variants={pv} initial="enter" animate="visible" exit="exit" className="space-y-4">
            <SummaryCards results={results} />
            <ResultsTable rows={rows} results={results} />

            {/* Download button */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              onClick={() => downloadReport(rows, results, fileName)}
              className="flex items-center gap-2 ml-auto text-sm px-4 py-2.5 rounded font-data font-semibold"
              style={{
                background: 'rgba(0,255,136,0.07)',
                border: '1px solid rgba(0,255,136,0.25)',
                color: '#00ff88',
                boxShadow: '0 0 16px rgba(0,255,136,0.08)',
              }}
            >
              <Download size={14} />
              Download Report CSV
            </motion.button>
          </motion.div>
        )}

        {/* ── ERROR phase ────────────────────────────────────── */}
        {phase === 'error' && (
          <motion.div
            key="error"
            variants={pv} initial="enter" animate="visible" exit="exit"
            className="flex flex-col items-center justify-center gap-4 rounded-lg p-10 text-center"
            style={{ border: '1px solid rgba(255,68,68,0.2)', background: 'rgba(255,68,68,0.02)' }}
          >
            <AlertTriangle size={28} style={{ color: '#ff4444', opacity: 0.7 }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#ff6666' }}>
                Analysis Failed
              </p>
              <p className="text-xs font-data max-w-sm" style={{ color: '#64748b' }}>{errMsg}</p>
            </div>
            <button
              onClick={() => setPhase(rows.length ? 'preview' : 'idle')}
              className="text-xs px-4 py-1.5 rounded font-data"
              style={{ color: '#ff4444', border: '1px solid rgba(255,68,68,0.3)', background: 'rgba(255,68,68,0.06)' }}
            >
              ← Go Back
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
