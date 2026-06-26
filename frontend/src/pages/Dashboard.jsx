import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, ShieldAlert, Cpu, Zap,
  Clock, TrendingUp, Database, Shield, AlertTriangle,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { apiUrl } from '../config/api'

/* ─── Framer-motion variants ────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.44, ease: [0.22, 1, 0.36, 1] },
  },
}

const staggerCards = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45 } },
}

/* ─── Stat card config ──────────────────────────────────────── */
const STAT_CARDS = [
  {
    apiKey: 'total_analyzed',
    label: 'Total Flows Analyzed',
    sub: 'MongoDB live records',
    Icon: Activity,
    color: '#00d4ff',
    shadow: '0 0 0 1px rgba(0,212,255,0.22), 0 0 28px rgba(0,212,255,0.16), 0 8px 32px rgba(0,0,0,0.55)',
    border: '1px solid rgba(0,212,255,0.28)',
    blob: 'rgba(0,212,255,0.12)',
    fmt: v => Number(v).toLocaleString(),
  },
  {
    apiKey: 'attacks_blocked',
    label: 'Attacks Detected',
    sub: 'MongoDB attack records',
    Icon: ShieldAlert,
    color: '#ff4444',
    shadow: '0 0 0 1px rgba(255,68,68,0.22), 0 0 28px rgba(255,68,68,0.16), 0 8px 32px rgba(0,0,0,0.55)',
    border: '1px solid rgba(255,68,68,0.28)',
    blob: 'rgba(255,68,68,0.12)',
    fmt: v => Number(v).toLocaleString(),
  },
  {
    apiKey: 'accuracy',
    label: 'Model Accuracy',
    sub: 'Held-out test set · F1: 0.9991',
    Icon: Cpu,
    color: '#00d4ff',
    shadow: '0 0 0 1px rgba(0,212,255,0.22), 0 0 28px rgba(0,212,255,0.16), 0 8px 32px rgba(0,0,0,0.55)',
    border: '1px solid rgba(0,212,255,0.28)',
    blob: 'rgba(0,212,255,0.12)',
    fmt: v => `${(Number(v) * 100).toFixed(2)}%`,
  },
  {
    apiKey: 'attacks_today',
    label: 'Threats Blocked Today',
    sub: 'Live scans recorded by backend',
    Icon: Zap,
    color: '#ffaa00',
    shadow: '0 0 0 1px rgba(255,170,0,0.22), 0 0 28px rgba(255,170,0,0.16), 0 8px 32px rgba(0,0,0,0.55)',
    border: '1px solid rgba(255,170,0,0.28)',
    blob: 'rgba(255,170,0,0.12)',
    fmt: v => Number(v).toLocaleString(),
  },
]

const PIE_COLORS = ['#ff4444', '#00ff88']

function formatTimestamp(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })
}

function formatDuration(seconds) {
  const n = Number(seconds)
  if (!Number.isFinite(n)) return '-'
  return `${n.toFixed(n >= 10 ? 3 : 4)} s`
}

function formatRate(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(n >= 100 ? 1 : 2)
}

/* ─── Sub-components ────────────────────────────────────────── */

function StatCard({ cfg, value, loading }) {
  const { Icon, label, sub, color, shadow, border, blob, fmt } = cfg
  return (
    <motion.div
      variants={fadeUp}
      className="relative overflow-hidden rounded-lg p-5"
      style={{ background: '#0f1629', border, boxShadow: shadow }}
    >
      {/* Corner light blob — makes the glow "emanate" from inside */}
      <div
        className="absolute pointer-events-none rounded-full blur-3xl"
        style={{ width: 80, height: 80, top: -24, right: -24, background: blob }}
      />

      <div className="relative flex items-start justify-between mb-4">
        <p className="text-xs tracking-widest uppercase font-data" style={{ color: '#64748b' }}>
          {label}
        </p>
        <Icon size={15} style={{ color, opacity: 0.75, flexShrink: 0 }} />
      </div>

      <div className="relative">
        {loading ? (
          /* skeleton shimmer */
          <div
            className="h-9 w-24 rounded animate-pulse"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
        ) : (
          <p
            className="text-3xl font-bold font-data leading-none"
            style={{ color, textShadow: `0 0 22px ${color}65` }}
          >
            {fmt(value ?? 0)}
          </p>
        )}
        <p className="text-xs mt-2" style={{ color: '#64748b' }}>{sub}</p>
      </div>
    </motion.div>
  )
}

function StatusBadge({ status }) {
  const isAtk = status === 'ATTACK'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-data font-semibold tracking-wider badge-${isAtk ? 'HIGH' : 'SAFE'}`}
    >
      {isAtk ? <ShieldAlert size={10} /> : <Shield size={10} />}
      {status}
    </span>
  )
}

function ChartTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null
  const { name, value, fill } = payload[0]
  return (
    <div style={{
      background: 'rgba(10,14,26,0.95)',
      border: `1px solid ${fill}35`,
      borderRadius: 6,
      padding: '10px 14px',
      backdropFilter: 'blur(8px)',
    }}>
      <p className="font-data text-xs font-semibold" style={{ color: fill }}>{name}</p>
      <p className="font-data text-sm font-bold mt-0.5" style={{ color: '#e2e8f0' }}>
        {Number(value).toLocaleString()}
      </p>
      <p className="font-data text-xs mt-0.5" style={{ color: '#64748b' }}>
        {total ? ((value / total) * 100).toFixed(1) : '0.0'}% of total
      </p>
    </div>
  )
}

/* ─── Main component ────────────────────────────────────────── */

export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    fetch(apiUrl('/api/stats'))
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => { setStats(null); setOffline(true); setLoading(false) })
  }, [])

  const total   = stats?.total_analyzed  ?? 0
  const attacks = stats?.attacks_blocked ?? 0
  const benign  = stats?.benign ?? Math.max(total - attacks, 0)
  const atkPct  = total ? ((attacks / total) * 100).toFixed(1) : '0.0'
  const feedRows = stats?.recent_flows ?? []

  const chartData = [
    { name: 'Attacks', value: attacks, fill: PIE_COLORS[0] },
    { name: 'Benign',  value: benign,  fill: PIE_COLORS[1] },
  ]

  return (
    <div className="space-y-5">

      {/* ── Offline banner ───────────────────────── */}
      {offline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-data"
          style={{
            background: 'rgba(255,170,0,0.07)',
            border: '1px solid rgba(255,170,0,0.22)',
            color: '#ffaa00',
          }}
        >
          <AlertTriangle size={13} />
          <span>
            Backend offline or MongoDB unavailable.&nbsp;
            <span style={{ color: '#94a3b8' }}>
              Start Flask:&nbsp;
            </span>
            <code style={{ color: '#e2e8f0' }}>cd backend && python app.py</code>
          </span>
        </motion.div>
      )}

      {/* ── Page header ──────────────────────────── */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="show"
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-wide" style={{ color: '#e2e8f0' }}>
            Security Overview
          </h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            Intrusion detection dashboard · CICIDS 2017 · RandomForest classifier
          </p>
        </div>
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded font-data text-xs"
          style={{
            background: 'rgba(0,212,255,0.06)',
            border: '1px solid rgba(0,212,255,0.15)',
            color: '#00d4ff',
          }}
        >
          <span className="live-dot" style={{ width: 6, height: 6 }} />
          <span>{total.toLocaleString()} flows processed</span>
        </div>
      </motion.div>

      {/* ── 4 stat cards ─────────────────────────── */}
      <motion.div
        variants={staggerCards}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {STAT_CARDS.map(cfg => (
          <StatCard
            key={cfg.label}
            cfg={cfg}
            value={stats?.[cfg.apiKey]}
            loading={loading}
          />
        ))}
      </motion.div>

      {/* ── Main three-column content ─────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Threat feed — 2/3 */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.3 }}
          className="xl:col-span-2 flex flex-col rounded-lg overflow-hidden"
          style={{
            background: '#0f1629',
            border: '1px solid #1a2744',
            boxShadow: '0 0 0 1px rgba(0,212,255,0.05), 0 8px 32px rgba(0,0,0,0.45)',
          }}
        >
          {/* feed header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid #1a2744' }}
          >
            <div>
              <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Threat Feed</h3>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                Live classifications stored in MongoDB
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-data" style={{ color: '#00ff88' }}>
              <span className="live-dot" style={{ width: 6, height: 6 }} />
              LIVE
            </div>
          </div>

          {/* feed table */}
          <div className="overflow-x-auto flex-1">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>
                    <span className="flex items-center gap-1.5">
                      <Clock size={10} />Timestamp
                    </span>
                  </th>
                  <th>Flow Duration</th>
                  <th>
                    <span className="flex items-center gap-1.5">
                      <TrendingUp size={10} />Packets/s
                    </span>
                  </th>
                  <th>Bytes/s</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {feedRows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.42 + i * 0.07, duration: 0.32, ease: 'easeOut' }}
                  >
                    <td>
                      <span className="font-data text-xs" style={{ color: '#64748b' }}>
                        {formatTimestamp(row.ts)}
                      </span>
                    </td>
                    <td>
                      <span className="font-data text-xs" style={{ color: '#94a3b8' }}>
                        {formatDuration(row.duration)}
                      </span>
                    </td>
                    <td>
                      <span
                        className="font-data text-xs"
                        style={{ color: row.pps > 100 ? '#ff8888' : '#94a3b8' }}
                      >
                        {formatRate(row.pps)}
                      </span>
                    </td>
                    <td>
                      <span
                        className="font-data text-xs"
                        style={{ color: row.bps > 10000 ? '#ff8888' : '#94a3b8' }}
                      >
                        {formatRate(row.bps)}
                      </span>
                    </td>
                    <td><StatusBadge status={row.status} /></td>
                  </motion.tr>
                ))}
                {!loading && feedRows.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <span className="font-data text-xs" style={{ color: '#64748b' }}>
                        {stats?.live_db?.connected
                          ? 'No live classifications stored in MongoDB yet.'
                          : 'MongoDB is not connected. Start MongoDB to store and show live attacks.'}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Right column */}
        <div className="space-y-4">

          {/* ── Donut chart ──────────────────────── */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.38 }}
            className="rounded-lg p-4"
            style={{
              background: '#0f1629',
              border: '1px solid #1a2744',
              boxShadow: '0 0 0 1px rgba(0,212,255,0.05), 0 8px 32px rgba(0,0,0,0.45)',
            }}
          >
            <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
              Traffic Distribution
            </h3>
            <p className="text-xs mt-0.5 mb-3" style={{ color: '#64748b' }}>
              Attack vs benign flow ratio
            </p>

            {/* Donut */}
            <div style={{ position: 'relative', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                    animationBegin={500}
                    animationDuration={900}
                    isAnimationActive={true}
                  >
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.fill}
                        style={{
                          filter: idx === 0
                            ? 'drop-shadow(0 0 6px rgba(255,68,68,0.55))'
                            : 'drop-shadow(0 0 5px rgba(0,255,136,0.45))',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<ChartTooltip total={total} />}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center label — absolute overlay in the donut hole */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <p
                  className="font-data font-bold"
                  style={{
                    fontSize: 26,
                    lineHeight: 1,
                    color: '#ff4444',
                    textShadow: '0 0 18px rgba(255,68,68,0.75)',
                  }}
                >
                  {atkPct}%
                </p>
                <p className="font-data text-xs mt-1" style={{ color: '#64748b' }}>
                  attack rate
                </p>
              </div>
            </div>

            {/* Custom legend */}
            <div className="flex justify-center gap-6 mt-2">
              {chartData.map(entry => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span
                    className="rounded-sm inline-block"
                    style={{ width: 10, height: 10, background: entry.fill, flexShrink: 0 }}
                  />
                  <span className="font-data text-xs" style={{ color: '#94a3b8' }}>
                    {entry.name}
                  </span>
                  <span className="font-data text-xs font-semibold" style={{ color: entry.fill }}>
                    {entry.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Model Info card ───────────────────── */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.5 }}
            className="rounded-lg p-4"
            style={{
              background: '#0f1629',
              border: '1px solid #1a2744',
              boxShadow: '0 0 0 1px rgba(0,212,255,0.05), 0 8px 32px rgba(0,0,0,0.45)',
            }}
          >
            <div
              className="flex items-center gap-2 mb-3 pb-3"
              style={{ borderBottom: '1px solid #1a2744' }}
            >
              <Database size={13} style={{ color: '#00d4ff' }} />
              <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Model Info</h3>
            </div>

            {[
              {
                label: 'Model Name',
                value: loading ? '—' : (stats?.model_name ?? 'NetGuard-IDS v1.0'),
                color: '#00d4ff',
              },
              {
                label: 'Dataset',
                value: loading ? '—' : (stats?.dataset ?? 'CICIDS 2017'),
                color: '#e2e8f0',
              },
              {
                label: 'Training Accuracy',
                value: loading ? 'â€”' : `${((stats?.accuracy ?? 0) * 100).toFixed(2)}%`,
                color: '#00ff88',
              },
              {
                label: 'Features Used',
                value: loading ? 'â€”' : String(stats?.feature_count ?? 0),
                color: '#e2e8f0',
              },
              {
                label: 'Algorithm',
                value: loading ? 'â€”' : (stats?.algorithm ?? 'Unknown'),
                color: '#e2e8f0',
              },
              {
                label: 'Training Rows',
                value: loading ? 'â€”' : Number(stats?.training_rows ?? 0).toLocaleString(),
                color: '#e2e8f0',
              },
              {
                label: 'Test Rows',
                value: loading ? 'â€”' : Number(stats?.test_rows ?? 0).toLocaleString(),
                color: '#e2e8f0',
              },
            ].map(row => (
              <div
                key={row.label}
                className="flex justify-between items-center py-1.5"
                style={{ borderBottom: '1px solid rgba(26,39,68,0.5)' }}
              >
                <span className="text-xs" style={{ color: '#64748b' }}>{row.label}</span>
                <span className="text-xs font-data font-medium" style={{ color: row.color }}>
                  {row.value}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
