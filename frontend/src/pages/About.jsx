import { motion } from 'framer-motion'
import {
  Activity, Layers, Database, Cpu, Shield, Zap,
  BarChart3, CheckCircle, ExternalLink, BookOpen,
  Network, Binary, GraduationCap, Award,
  ChevronRight, Code2, FlaskConical, Sliders,
} from 'lucide-react'

/* ─── Shared animation variant ──────────────────────────────── */
const sect = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] } },
}

/* ─── Helpers ────────────────────────────────────────────────── */
function SectionLabel({ num, title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="font-data text-xs font-semibold" style={{ color: '#00d4ff' }}>{num}</span>
      <div style={{ width: 1, height: 12, background: '#1a2744' }} />
      <span className="text-xs tracking-widest uppercase" style={{ color: '#64748b' }}>{title}</span>
    </div>
  )
}

function Rule() {
  return <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(0,212,255,0.3), transparent)' }} />
}

function KV({ label, value, color, mono = true }) {
  return (
    <div className="flex justify-between items-start py-1.5" style={{ borderBottom: '1px solid rgba(26,39,68,0.45)' }}>
      <span className="text-xs" style={{ color: '#64748b' }}>{label}</span>
      <span className={`text-xs ml-4 text-right ${mono ? 'font-data font-medium' : ''}`}
        style={{ color: color ?? '#94a3b8', maxWidth: '58%' }}>
        {value}
      </span>
    </div>
  )
}

/* ─── 01 Header ──────────────────────────────────────────────── */
function Header() {
  const metrics = [
    { val: '99.89%',   sub: 'Accuracy',    color: '#00ff88' },
    { val: '0.9991',   sub: 'F1-Score',    color: '#00d4ff' },
    { val: '<1 ms',    sub: 'Latency',     color: '#00d4ff' },
    { val: '225,745',  sub: 'Training flows', color: '#ffaa00' },
  ]
  return (
    <motion.div variants={sect} className="rounded-xl overflow-hidden"
      style={{ background: '#0f1629', border: '1px solid rgba(0,212,255,0.18)', boxShadow: '0 0 0 1px rgba(0,212,255,0.06), 0 20px 60px rgba(0,0,0,0.5)' }}>

      {/* Title band */}
      <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid #1a2744' }}>
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)' }}>
            <Shield size={18} style={{ color: '#00d4ff' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-data text-xs tracking-widest uppercase" style={{ color: '#64748b' }}>Research Project</span>
              <span className="font-data text-xs px-2 py-0.5 rounded" style={{ color: '#00d4ff', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}>v1.0</span>
            </div>
            <h1 className="text-xl font-bold leading-tight" style={{ color: '#e2e8f0' }}>
              NetGuard AI
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
              ML-Based Network Intrusion Detection System
            </p>
          </div>
        </div>

        {/* Abstract */}
        <div className="mt-5 pl-14">
          <p className="text-xs leading-relaxed" style={{ color: '#94a3b8', borderLeft: '2px solid rgba(0,212,255,0.2)', paddingLeft: 12 }}>
            <span className="font-semibold" style={{ color: '#e2e8f0' }}>Abstract.</span>{' '}
            NetGuard AI applies supervised machine learning to classify network flows as benign or
            malicious in real time. Trained on the CICIDS 2017 benchmark — 225,745 labeled flows captured
            over a live enterprise testbed — a Random Forest classifier operating on 10 CICFlowMeter-derived
            statistical features achieves{' '}
            <span style={{ color: '#00ff88' }}>99.89% accuracy</span> and{' '}
            <span style={{ color: '#00d4ff' }}>F1-score 0.9991</span> on a stratified 20% hold-out
            partition, with sub-millisecond inference latency suitable for inline deployment.
          </p>
        </div>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-4">
        {metrics.map((m, i) => (
          <div key={m.sub}
            className="flex flex-col items-center justify-center py-4 text-center"
            style={{ borderRight: i < 3 ? '1px solid #1a2744' : 'none' }}>
            <span className="font-data text-2xl font-bold leading-none"
              style={{ color: m.color, textShadow: `0 0 16px ${m.color}60` }}>
              {m.val}
            </span>
            <span className="text-xs mt-1.5 tracking-wider uppercase font-data"
              style={{ color: '#64748b' }}>
              {m.sub}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ─── 02 Motivation ──────────────────────────────────────────── */
const FINDINGS = [
  {
    tag:   'Problem',
    num:   '01',
    color: '#ff4444',
    Icon:  Network,
    head:  'Growing threat landscape',
    body:  'Modern enterprise networks process millions of packets per second. Volumetric DDoS attacks, stealthy port scans, and multi-stage infiltration campaigns are increasingly difficult to distinguish from legitimate traffic at wire speed — and attack frequency continues to compound year-over-year.',
  },
  {
    tag:   'Research Gap',
    num:   '02',
    color: '#ffaa00',
    Icon:  Binary,
    head:  'Failure of rule-based detection',
    body:  'Traditional intrusion detection relies on static signature databases and hand-crafted rule sets. This approach fundamentally fails against zero-day exploits and obfuscated attack variants, requires constant expert maintenance, and produces unacceptably high false-positive rates in dynamic, encrypted environments.',
  },
  {
    tag:   'Contribution',
    num:   '03',
    color: '#00d4ff',
    Icon:  GraduationCap,
    head:  'Supervised ML on flow features',
    body:  'NetGuard AI addresses this gap by applying a Random Forest classifier to flow-level statistical features extracted by CICFlowMeter. Operating on aggregate flow metrics — not raw packets — enables real-time detection without deep packet inspection, preserving privacy while achieving sub-millisecond classification per flow.',
  },
]

function Motivation() {
  return (
    <motion.div variants={sect}>
      <SectionLabel num="01" title="Research Motivation" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {FINDINGS.map(f => (
          <div key={f.tag} className="rounded-lg p-4"
            style={{
              background: '#0f1629',
              border: '1px solid #1a2744',
              borderLeft: `3px solid ${f.color}`,
              boxShadow: `inset 0 0 40px ${f.color}06`,
            }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-6 h-6 rounded"
                style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}>
                <f.Icon size={12} style={{ color: f.color }} />
              </div>
              <span className="font-data text-xs font-semibold tracking-widest uppercase"
                style={{ color: f.color }}>{f.tag}</span>
            </div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#e2e8f0' }}>{f.head}</h3>
            <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{f.body}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ─── 03 Pipeline ────────────────────────────────────────────── */
const STAGES = [
  {
    tag:   'INPUT',
    label: 'Raw Network\nTraffic',
    sub:   'PCAP / live tap',
    Icon:  Activity,
    color: '#64748b',
    border:'rgba(100,116,139,0.35)',
  },
  {
    tag:   'EXTRACT',
    label: 'Feature\nExtraction',
    sub:   'CICFlowMeter\n78 metrics',
    Icon:  Sliders,
    color: '#00d4ff',
    border:'rgba(0,212,255,0.25)',
  },
  {
    tag:   'PROCESS',
    label: 'Scale &\nClean',
    sub:   'StandardScaler\nDrop NaN/∞',
    Icon:  Database,
    color: '#00d4ff',
    border:'rgba(0,212,255,0.25)',
  },
  {
    tag:   'MODEL',
    label: 'Random Forest\nClassifier',
    sub:   '100 trees\n10 features',
    Icon:  Cpu,
    color: '#00d4ff',
    border:'rgba(0,212,255,0.6)',
    glow:  true,
  },
  {
    tag:   'OUTPUT',
    label: 'Threat\nClassification',
    sub:   'BENIGN / DDoS\nwith confidence',
    Icon:  Shield,
    color: '#00ff88',
    border:'rgba(0,255,136,0.3)',
  },
  {
    tag:   'ALERT',
    label: 'Real-time\nAlert',
    sub:   'REST API\n<1 ms latency',
    Icon:  Zap,
    color: '#ffaa00',
    border:'rgba(255,170,0,0.35)',
  },
]

/* Arrow with two traveling dots (staggered so one follows the other) */
function PipeArrow({ delay }) {
  return (
    <div style={{ flex: 1, position: 'relative', minWidth: 32, display: 'flex', alignItems: 'center' }}>
      {/* Track */}
      <div style={{ position: 'absolute', inset: '0 0 0 0', display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1, borderTop: '1px dashed rgba(0,212,255,0.22)' }} />
      </div>
      {/* Dot 1 */}
      {[0, 0.9].map((off, i) => (
        <motion.div key={i}
          style={{
            position: 'absolute', width: 5, height: 5, borderRadius: '50%',
            background: '#00d4ff', top: '50%', marginTop: -2.5,
            boxShadow: '0 0 6px rgba(0,212,255,0.9)',
          }}
          animate={{ left: ['-6px', 'calc(100% + 6px)'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', delay: delay + off }}
        />
      ))}
      {/* Arrowhead */}
      <div style={{
        position: 'absolute', right: -1, top: '50%', transform: 'translateY(-50%)',
        width: 0, height: 0,
        borderTop: '4px solid transparent',
        borderBottom: '4px solid transparent',
        borderLeft: '6px solid rgba(0,212,255,0.45)',
      }} />
    </div>
  )
}

function Pipeline() {
  return (
    <motion.div variants={sect}>
      <SectionLabel num="02" title="System Architecture & Data Pipeline" />
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#0f1629', border: '1px solid #1a2744', padding: '24px 20px' }}>

        {/* Scrollable on mobile */}
        <div className="overflow-x-auto">
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 860, gap: 0 }}>
            {STAGES.map((s, i) => (
              <div key={s.tag} style={{ display: 'flex', alignItems: 'center', flex: i === 3 ? '0 0 auto' : '0 0 auto' }}>
                {/* Stage box */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
                  style={{
                    width: 120, padding: '12px 10px',
                    background: s.glow ? 'rgba(0,212,255,0.06)' : '#0a0e1a',
                    border: `1px solid ${s.border}`,
                    borderRadius: 8,
                    boxShadow: s.glow
                      ? '0 0 0 1px rgba(0,212,255,0.2), 0 0 20px rgba(0,212,255,0.12)'
                      : 'none',
                    textAlign: 'center',
                    flexShrink: 0,
                  }}
                >
                  {/* Eyebrow */}
                  <div className="font-data text-center mb-2"
                    style={{ fontSize: 9, letterSpacing: '0.12em', color: s.color, opacity: 0.75 }}>
                    {s.tag}
                  </div>
                  {/* Icon */}
                  <div className="flex justify-center mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full"
                      style={{ background: `${s.color}12`, border: `1px solid ${s.color}30` }}>
                      <s.Icon size={15} style={{ color: s.color }} />
                    </div>
                  </div>
                  {/* Label */}
                  <div className="font-data text-center" style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.3, whiteSpace: 'pre-line' }}>
                    {s.label}
                  </div>
                  {/* Sub-label */}
                  <div className="font-data text-center mt-1.5" style={{ fontSize: 9.5, color: '#4a5568', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                    {s.sub}
                  </div>
                </motion.div>

                {/* Arrow (not after last) */}
                {i < STAGES.length - 1 && (
                  <div style={{ width: 48, flexShrink: 0, position: 'relative', height: 50, display: 'flex', alignItems: 'center' }}>
                    <PipeArrow delay={i * 0.36} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-4 pt-3 flex-wrap"
          style={{ borderTop: '1px solid #1a2744' }}>
          {[
            { color: '#64748b', label: 'Input / Output' },
            { color: '#00d4ff', label: 'Feature processing' },
            { color: '#00ff88', label: 'Classification result' },
            { color: '#ffaa00', label: 'API alert' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="rounded-full" style={{ width: 7, height: 7, background: l.color }} />
              <span className="font-data" style={{ fontSize: 10, color: '#4a5568' }}>{l.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="rounded-full" style={{ width: 5, height: 5, background: '#00d4ff', boxShadow: '0 0 5px rgba(0,212,255,0.8)' }} />
            <span className="font-data" style={{ fontSize: 10, color: '#4a5568' }}>Animated dots = data packet in transit</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── 04 Dataset ─────────────────────────────────────────────── */
function DatasetSection() {
  const benign = 97718, ddos = 128027, total = 225745
  const benignPct = (benign / total * 100).toFixed(1)
  const ddosPct   = (ddos   / total * 100).toFixed(1)

  return (
    <motion.div variants={sect}>
      <SectionLabel num="03" title="Dataset" />
      <div className="rounded-lg overflow-hidden h-full"
        style={{ background: '#0f1629', border: '1px solid #1a2744' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #1a2744' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>CICIDS 2017</h3>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Canadian Institute for Cybersecurity · University of New Brunswick</p>
        </div>
        <div className="p-4 space-y-0.5">
          <KV label="Collection period" value="July 3–7, 2017" />
          <KV label="File used" value="Friday Afternoon (DDoS)" />
          <KV label="Total flows" value="225,745" />
          <KV label="After cleaning" value="225,711 (34 rows dropped)" />
          <KV label="Feature extractor" value="CICFlowMeter" />
          <KV label="Original features" value="78 network flow metrics" />
          <KV label="Selected features" value="10 (feature importance)" />
        </div>

        {/* Class balance bar */}
        <div className="px-4 pb-4">
          <div className="flex justify-between text-xs font-data mb-1.5">
            <span style={{ color: '#00ff88' }}>BENIGN {benignPct}%</span>
            <span style={{ color: '#ff4444' }}>DDoS {ddosPct}%</span>
          </div>
          <div className="rounded overflow-hidden" style={{ height: 10, background: '#0a0e1a', border: '1px solid #1a2744', display: 'flex' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${benignPct}%` }}
              transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ background: 'linear-gradient(90deg, rgba(0,255,136,0.4), #00ff88)', height: '100%' }}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ddosPct}%` }}
              transition={{ duration: 1.2, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{ background: 'linear-gradient(90deg, rgba(255,68,68,0.4), #ff4444)', height: '100%' }}
            />
          </div>
          <div className="flex justify-between text-xs font-data mt-1">
            <span style={{ color: '#374151' }}>{benign.toLocaleString()} flows</span>
            <span style={{ color: '#374151' }}>{ddos.toLocaleString()} flows</span>
          </div>
        </div>

        {/* CICIDS classes note */}
        <div className="px-4 pb-4">
          <div className="text-xs mb-1.5 tracking-wider uppercase font-data" style={{ color: '#374151' }}>Full CICIDS 2017 attack classes</div>
          <div className="flex flex-wrap gap-1.5">
            {['DDoS ✓ used', 'PortScan', 'Bot', 'Infiltration', 'DoS Variants', 'Web Attacks', 'Heartbleed', 'Benign ✓ used'].map(c => (
              <span key={c} className="font-data text-xs px-2 py-0.5 rounded"
                style={{
                  color:   c.includes('✓') ? '#00d4ff' : '#374151',
                  background: c.includes('✓') ? 'rgba(0,212,255,0.07)' : 'transparent',
                  border: `1px solid ${c.includes('✓') ? 'rgba(0,212,255,0.2)' : '#1a2744'}`,
                }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── 05 Model ───────────────────────────────────────────────── */
function ModelSection() {
  /* Confusion matrix: [[TN, FP], [FN, TP]] */
  const CM = [
    { label: 'True Negative',  val: '19,520', sub: 'BENIGN correct',   bg: 'rgba(0,255,136,0.08)',  border: 'rgba(0,255,136,0.25)',  color: '#00ff88'  },
    { label: 'False Positive', val: '18',     sub: 'BENIGN as attack',  bg: 'rgba(255,170,0,0.06)', border: 'rgba(255,170,0,0.2)',   color: '#ffaa00'  },
    { label: 'False Negative', val: '30',     sub: 'Attack missed',     bg: 'rgba(255,68,68,0.06)', border: 'rgba(255,68,68,0.2)',   color: '#ff6666'  },
    { label: 'True Positive',  val: '25,575', sub: 'Attack correct',    bg: 'rgba(0,212,255,0.06)', border: 'rgba(0,212,255,0.2)',   color: '#00d4ff'  },
  ]
  const METRICS = [
    { label: 'Accuracy',  val: '99.89%', color: '#00ff88' },
    { label: 'Precision', val: '99.93%', color: '#00d4ff' },
    { label: 'Recall',    val: '99.88%', color: '#00d4ff' },
    { label: 'F1-Score',  val: '99.91%', color: '#00d4ff' },
  ]

  return (
    <motion.div variants={sect}>
      <SectionLabel num="04" title="Model & Results" />
      <div className="rounded-lg overflow-hidden"
        style={{ background: '#0f1629', border: '1px solid #1a2744' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #1a2744' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>RandomForestClassifier</h3>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>scikit-learn 1.9.0 · 100 estimators · Gini impurity · Stratified 80/20 split</p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-4" style={{ borderBottom: '1px solid #1a2744' }}>
          {METRICS.map((m, i) => (
            <div key={m.label}
              className="flex flex-col items-center py-3 text-center"
              style={{ borderRight: i < 3 ? '1px solid #1a2744' : 'none' }}>
              <motion.span
                className="font-data font-bold"
                style={{ color: m.color, fontSize: 18, textShadow: `0 0 12px ${m.color}50` }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.08 }}>
                {m.val}
              </motion.span>
              <span className="font-data text-center mt-1" style={{ fontSize: 10, color: '#4a5568', letterSpacing: '0.06em' }}>
                {m.label}
              </span>
            </div>
          ))}
        </div>

        {/* Confusion matrix */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs tracking-widest uppercase font-data" style={{ color: '#374151' }}>Confusion matrix · 45,143 test flows</span>
            <div className="text-xs font-data" style={{ color: '#374151' }}>→ Predicted</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="font-data flex items-center" style={{ fontSize: 9, color: '#374151', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 80 }}>
              Actual ↑
            </div>
            <div className="grid grid-cols-2 flex-1 gap-1.5">
              {CM.map(c => (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55, type: 'spring', stiffness: 160 }}
                  className="rounded flex flex-col items-center justify-center py-3 px-2 text-center"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                  <span className="font-data font-bold" style={{ fontSize: 18, color: c.color, lineHeight: 1 }}>
                    {c.val}
                  </span>
                  <span className="text-xs mt-1" style={{ color: '#4a5568', fontSize: 9, lineHeight: 1.3 }}>
                    {c.label}
                  </span>
                  <span style={{ fontSize: 9, color: '#374151', marginTop: 2 }}>{c.sub}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Training config */}
        <div className="px-4 pb-4 space-y-0">
          <KV label="Training rows"    value="180,568 (80%)" />
          <KV label="Test rows"        value="45,143 (20%)" />
          <KV label="Random seed"      value="42" />
          <KV label="Inference time"   value="<1 ms per flow" color="#00ff88" />
          <KV label="Top feature"      value="Total Fwd Packets (41.76% importance)" />
        </div>

        {/* Model note */}
        <div className="px-4 pb-4">
          <div className="rounded p-2.5 text-xs leading-relaxed"
            style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)', color: '#4a5568' }}>
            ◆ The near-perfect accuracy on this dataset reflects the separability of LOIC DDoS
            flows from benign traffic along volumetric features (forward packet count, IAT mean).
            Generalisation to other attack families would require training on the full CICIDS suite.
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── 06 Feature analysis (10 selected) ─────────────────────── */
const FEATURES = [
  { name: 'Total Fwd Packets',   imp: 41.76, why: 'Primary discriminator — DDoS LOIC generates 7–9 forward pkts per flow' },
  { name: 'Total Bwd Packets',   imp: 24.44, why: 'Second-highest importance; interplay with forward count defines flow asymmetry' },
  { name: 'Flow Duration',       imp:  9.98, why: 'DDoS flows show distinct duration clustering around 50–90M µs' },
  { name: 'Flow Bytes/s',        imp:  9.53, why: 'Surprisingly low for DDoS — LOIC creates low-rate per-flow, high-count aggregate' },
  { name: 'Flow Packets/s',      imp:  6.97, why: 'Complements Bytes/s; short high-rate bursts give distinct pps signature' },
  { name: 'Flow IAT Mean',       imp:  5.34, why: 'Inter-arrival time separates DDoS (high IAT, slow drip) from benign browsing' },
  { name: 'Fwd PSH Flags',       imp:  1.98, why: 'TCP push flags present in ~10% of benign but rare in DDoS flows' },
  { name: 'Bwd PSH Flags',       imp:  0.00, why: 'Constant across Friday DDoS session — zero variance, zero information gain' },
  { name: 'Fwd URG Flags',       imp:  0.00, why: 'Constant — retained for API compatibility with other CICIDS subsets' },
  { name: 'Bwd URG Flags',       imp:  0.00, why: 'Constant — retained for API compatibility with other CICIDS subsets' },
]

function FeatureSection() {
  const maxImp = 41.76
  return (
    <motion.div variants={sect}>
      <SectionLabel num="05" title="Feature Selection Analysis" />
      <div className="rounded-lg overflow-hidden"
        style={{ background: '#0f1629', border: '1px solid #1a2744' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #1a2744' }}>
          <p className="text-xs" style={{ color: '#64748b' }}>
            10 features selected from 78 CICFlowMeter outputs via Random Forest Gini importance.
            Three features have zero importance in the Friday DDoS subset due to constant values.
          </p>
        </div>
        <div className="divide-y" style={{ '--tw-divide-color': '#1a2744' }}>
          {FEATURES.map((f, i) => (
            <div key={f.name} className="grid gap-4 px-4 py-2.5" style={{ gridTemplateColumns: '2fr 60px 3fr' }}>
              <div className="flex items-center gap-2">
                <span className="font-data text-xs" style={{ color: '#374151', width: 20, flexShrink: 0 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-data text-xs font-medium" style={{ color: i < 3 ? '#94a3b8' : '#4a5568' }}>
                  {f.name}
                </span>
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-data text-xs font-semibold text-right"
                  style={{ color: f.imp > 10 ? '#00d4ff' : f.imp > 1 ? '#64748b' : '#1a2744' }}>
                  {f.imp.toFixed(2)}%
                </span>
                <div className="imp-bar mt-1" style={{ height: 3 }}>
                  <motion.div
                    className="imp-bar-fill"
                    style={{ height: '100%', background: f.imp > 10 ? undefined : f.imp > 0 ? 'rgba(0,212,255,0.3)' : '#1a2744' }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${(f.imp / maxImp) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.5 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
              <p className="text-xs leading-relaxed self-center" style={{ color: '#374151' }}>
                {f.why}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── 07 Tech stack ──────────────────────────────────────────── */
const STACK = [
  { name: 'Python',       ver: '3.12',   role: 'Core language',          color: '#3b82f6', Icon: Code2        },
  { name: 'scikit-learn', ver: '1.9.0',  role: 'RandomForest, scaler',   color: '#f97316', Icon: Cpu          },
  { name: 'Flask',        ver: '3.1.3',  role: 'REST API server',        color: '#10b981', Icon: FlaskConical  },
  { name: 'React',        ver: '19.2',   role: 'Frontend SPA',           color: '#38bdf8', Icon: Code2        },
  { name: 'TailwindCSS',  ver: '4.3.1',  role: 'UI styling',             color: '#06b6d4', Icon: Sliders      },
  { name: 'Recharts',     ver: '3.8.1',  role: 'Data visualisation',     color: '#8b5cf6', Icon: BarChart3    },
  { name: 'framer-motion',ver: '12.4',   role: 'UI animation',           color: '#ec4899', Icon: Activity     },
  { name: 'CICIDS 2017',  ver: 'UNB',    role: 'Training dataset',       color: '#00d4ff', Icon: Database     },
]

function TechStack() {
  return (
    <motion.div variants={sect}>
      <SectionLabel num="06" title="Technology Stack" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STACK.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, duration: 0.35 }}
            className="rounded-lg p-3 flex items-start gap-2.5"
            style={{ background: '#0f1629', border: '1px solid #1a2744' }}
          >
            <div className="flex items-center justify-center w-7 h-7 rounded flex-shrink-0 mt-0.5"
              style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
              <s.Icon size={13} style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="font-data text-xs font-semibold truncate" style={{ color: '#e2e8f0' }}>
                  {s.name}
                </span>
                <span className="font-data flex-shrink-0" style={{ fontSize: 9, color: s.color }}>
                  {s.ver}
                </span>
              </div>
              <p style={{ fontSize: 10, color: '#4a5568', marginTop: 1 }}>{s.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

/* ─── 08 References ──────────────────────────────────────────── */
function References() {
  return (
    <motion.div variants={sect}>
      <SectionLabel num="07" title="References & Attribution" />
      <div className="rounded-lg p-4 space-y-3"
        style={{ background: '#0f1629', border: '1px solid #1a2744' }}>
        {[
          {
            cite: '[1]',
            text: 'I. Sharafaldin, A. H. Lashkari, and A. A. Ghorbani, "Toward Generating a New Intrusion Detection Dataset and Intrusion Traffic Characterization," in ',
            venue: '4th International Conference on Information Systems Security and Privacy (ICISSP)',
            detail: ', pp. 108–116, 2018.',
          },
          {
            cite: '[2]',
            text: 'L. Breiman, "Random Forests," ',
            venue: 'Machine Learning',
            detail: ', vol. 45, pp. 5–32, 2001. doi:10.1023/A:1010933404324',
          },
          {
            cite: '[3]',
            text: 'F. Pedregosa et al., "Scikit-learn: Machine Learning in Python," ',
            venue: 'Journal of Machine Learning Research',
            detail: ', vol. 12, pp. 2825–2830, 2011.',
          },
        ].map(r => (
          <div key={r.cite} className="flex gap-3">
            <span className="font-data text-xs flex-shrink-0 mt-0.5" style={{ color: '#00d4ff' }}>{r.cite}</span>
            <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
              {r.text}
              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{r.venue}</span>
              {r.detail}
            </p>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid #1a2744' }}>
          <Award size={12} style={{ color: '#64748b' }} />
          <span className="text-xs" style={{ color: '#374151' }}>
            Dataset made publicly available by the Canadian Institute for Cybersecurity, University of New Brunswick, under academic research licence.
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Root ───────────────────────────────────────────────────── */
export default function About() {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } } }}
      className="max-w-5xl space-y-7 pb-8"
    >
      <Header />
      <Motivation />
      <Pipeline />

      {/* Dataset + Model side-by-side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <DatasetSection />
        <ModelSection />
      </div>

      <FeatureSection />
      <TechStack />
      <References />
    </motion.div>
  )
}
