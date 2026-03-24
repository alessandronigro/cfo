import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend
} from 'recharts'
import { api } from '../services/api.js'

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmt     = (v) => v == null ? '—' : Math.round(v).toLocaleString('it-IT')
const fmtDec  = (v, d = 1) => v == null ? '—' : parseFloat(v).toFixed(d)
const fmtEuro = (v) => v != null ? `€ ${fmt(v)}` : '—'
const fmtPct  = (v) => v != null ? `${fmtDec(v)}%` : '—'

function scoreColor(s) {
  if (s >= 80) return '#22c55e'
  if (s >= 65) return '#3b82f6'
  if (s >= 50) return '#f59e0b'
  return '#ef4444'
}
function scoreDesc(s) {
  if (s >= 80) return 'Azienda in ottima salute finanziaria. Continua a monitorare i KPI.'
  if (s >= 65) return 'Situazione buona con margini di miglioramento. Segui le azioni suggerite.'
  if (s >= 50) return 'Diversi aspetti da migliorare. Le azioni immediate sono prioritarie.'
  if (s >= 30) return 'Situazione critica. Intervento urgente necessario su più fronti.'
  return 'Emergenza finanziaria. Richiede intervento immediato su tutti i fronti.'
}

// ─── Dashboard root ───────────────────────────────────────────────────────────
export default function Dashboard({ companyId, onBack }) {
  const [company,  setCompany]  = useState(null)
  const [report,   setReport]   = useState(null)
  const [history,  setHistory]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [running,  setRunning]  = useState(false)
  const [error,    setError]    = useState(null)
  const [section,  setSection]  = useState('overview')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cData, hist] = await Promise.all([
        api.getCompany(companyId),
        api.getHistory(companyId)
      ])
      setCompany(cData.company)
      setHistory(hist)
      try {
        const rep = await api.getReport(companyId)
        setReport(rep)
      } catch { /* no report yet */ }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { loadData() }, [loadData])

  async function runAnalysis() {
    setRunning(true)
    setError(null)
    try {
      const res = await api.runAnalysis(companyId)
      setReport(res.analysis)
      const hist = await api.getHistory(companyId)
      setHistory(hist)
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  if (loading) return (
    <div className="loader-screen">
      <div className="loader-content">
        <div className="spinner" />
        <p>Caricamento dati azienda…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="error-screen">
      <div className="error-box">
        <h2>Errore</h2>
        <p>{error}</p>
        <button className="btn-primary" onClick={loadData}>Riprova</button>
        <button className="btn-secondary" onClick={onBack}>← Torna alla home</button>
      </div>
    </div>
  )

  const kpis     = report?.kpis
  const problems = report?.problems || []
  const recs     = report?.recommendations || {}
  const score    = report?.score
  const summary  = report?.summary

  const navItems = [
    { id: 'overview',  label: '📊 Panoramica' },
    { id: 'analytics', label: '📈 Analytics' },
    { id: 'kpi',       label: '🧮 KPI Dettaglio' },
    { id: 'problems',  label: `🔍 Problemi${problems.length > 0 ? ` (${problems.length})` : ''}` },
    { id: 'actions',   label: '⚡ Azioni' },
    { id: 'history',   label: '📅 Storico' },
  ]

  return (
    <div className="dashboard">
      <aside className="dash-sidebar">
        <div className="dash-brand">
          <span>📊</span>
          <div>
            <div className="dash-brand-name">Virtual Chief Financial Officer</div>
            <div className="dash-brand-sub">Dashboard</div>
          </div>
        </div>

        {company && (
          <div className="dash-company-info">
            <div className="dash-company-name">{company.nome}</div>
            <div className="dash-company-meta">{company.settore} · {company.dipendenti} dip.</div>
          </div>
        )}

        {score != null && (
          <div className="dash-score-mini">
            <ScoreGauge score={score} label={report.score_label} color={report.score_color} />
          </div>
        )}

        <nav className="dash-nav">
          {navItems.map(n => (
            <button
              key={n.id}
              className={`dash-nav-item ${section === n.id ? 'active' : ''}`}
              onClick={() => setSection(n.id)}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-actions">
          <button className="btn-primary btn-full" onClick={runAnalysis} disabled={running}>
            {running ? '⏳ Analisi in corso…' : '🔄 Aggiorna Analisi'}
          </button>
          <button className="btn-ghost btn-full" onClick={onBack}>← Home</button>
        </div>
      </aside>

      <main className="dash-main">
        {error && <div className="dash-error">{error}</div>}

        {!report && !running && (
          <div className="no-report">
            <div className="no-report-icon">📋</div>
            <h2>Nessuna analisi ancora</h2>
            <p>Clicca il pulsante qui sotto per eseguire la prima analisi CFO.</p>
            <button className="btn-primary btn-lg" onClick={runAnalysis}>
              🚀 Esegui Analisi CFO
            </button>
          </div>
        )}

        {running && (
          <div className="loader-screen">
            <div className="loader-content">
              <div className="spinner" />
              <p>Il motore CFO sta analizzando i tuoi dati…</p>
            </div>
          </div>
        )}

        {report && !running && (
          <>
            {section === 'overview'  && <OverviewSection  report={report} summary={summary} kpis={kpis} problems={problems} sector={company?.sector} />}
            {section === 'analytics' && <AnalyticsSection report={report} kpis={kpis} history={history} />}
            {section === 'kpi'       && <KPISection       kpis={kpis} sector={company?.sector} />}
            {section === 'problems'  && <ProblemsSection  problems={problems} />}
            {section === 'actions'   && <ActionsSection   recs={recs} />}
            {section === 'history'   && <HistorySection   history={history} />}
          </>
        )}
      </main>
    </div>
  )
}

// ─── ANALYTICS SECTION ───────────────────────────────────────────────────────
function AnalyticsSection({ report, kpis, history }) {
  if (!kpis) return <EmptyState text="Esegui prima un'analisi per vedere i grafici." />

  // ── History chart data (oldest → newest) ──
  const scoreHistory = [...history].reverse().map((h, i) => ({
    idx:    i + 1,
    label:  formatPeriod(h.periodo),
    score:  h.score,
    color:  scoreColor(h.score),
  }))

  // ── Net margin vs target ──
  const marginsData = [
    { name: 'Marg. Lordo',   value: parseFloat((kpis.margine_lordo_pct  || 0).toFixed(1)), target: 30,  fill: '#3b82f6' },
    { name: 'Marg. Netto',   value: parseFloat((kpis.margine_netto_pct  || 0).toFixed(1)), target: 5,   fill: '#22c55e' },
    { name: 'Contribuzione', value: parseFloat((kpis.margine_contrib_pct || 0).toFixed(1)), target: 40, fill: '#8b5cf6' },
  ]

  // ── Cost breakdown (must sum to 100) ──
  const mp   = parseFloat((kpis.incidenza_mp           || 0).toFixed(1))
  const mdo  = parseFloat((kpis.incidenza_mdo          || 0).toFixed(1))
  const fix  = parseFloat((kpis.incidenza_costi_fissi  || 0).toFixed(1))
  const net  = Math.max(0, parseFloat((kpis.margine_netto_pct || 0).toFixed(1)))
  const other = Math.max(0, parseFloat((100 - mp - mdo - fix - net).toFixed(1)))

  const costsData = [
    { name: 'Materie Prime',  value: mp,    fill: '#ef4444' },
    { name: 'Manodopera',     value: mdo,   fill: '#f59e0b' },
    { name: 'Costi Fissi',    value: fix,   fill: '#8b5cf6' },
    { name: 'Altri Variabili',value: other, fill: '#94a3b8' },
    { name: 'Margine Netto',  value: net,   fill: '#22c55e' },
  ].filter(d => d.value > 0)

  // ── Liquidity: actual vs target ──
  const liquidityData = [
    { name: 'DSO', actual: parseFloat((kpis.dso || 0).toFixed(1)), target: 45 },
    { name: 'DPO', actual: parseFloat((kpis.dpo || 0).toFixed(1)), target: 30 },
    { name: 'CCC', actual: parseFloat((kpis.ccc || 0).toFixed(1)), target: 60 },
  ]

  // ── Comparison: latest vs previous ──
  const latest = history[0] || null
  const prev   = history[1] || null
  const delta  = latest && prev ? latest.score - prev.score : null

  return (
    <div className="section">
      <h2 className="section-title">Analytics</h2>
      <p className="section-sub">
        Grafici finanziari e confronto andamento. Esegui analisi periodiche per arricchire i trend.
      </p>

      {/* ── Row 1: Score timeline + Comparison ── */}
      <div className="chart-row">

        <ChartCard
          title="Health Score nel Tempo"
          subtitle={`${history.length} analisi disponibili`}
          style={{ flex: 2 }}
        >
          {scoreHistory.length < 2 ? (
            <SinglePointHint value={latest?.score} label="Score attuale" color={scoreColor(latest?.score || 0)} unit="/100" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={scoreHistory} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} width={30} />
                <Tooltip content={<ScoreTooltip />} />
                <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 2" label={{ value: 'Ottimo', fontSize: 10, fill: '#22c55e', position: 'insideTopRight' }} />
                <ReferenceLine y={65} stroke="#3b82f6" strokeDasharray="4 2" label={{ value: 'Buono',  fontSize: 10, fill: '#3b82f6', position: 'insideTopRight' }} />
                <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Soglia', fontSize: 10, fill: '#f59e0b', position: 'insideTopRight' }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={<ScoreDot />}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Confronto Analisi"
          subtitle="Ultima vs precedente"
          style={{ flex: 1 }}
        >
          <ComparisonPanel latest={latest} prev={prev} delta={delta} kpis={kpis} />
        </ChartCard>
      </div>

      {/* ── Row 2: Margins + Cost structure ── */}
      <div className="chart-row">

        <ChartCard
          title="Margini Finanziari"
          subtitle="Valori % — barre: attuale · linea: target"
          style={{ flex: 1 }}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={marginsData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis unit="%" domain={[0, 'auto']} tick={{ fontSize: 11, fill: '#64748b' }} width={36} />
              <Tooltip formatter={(v) => [`${v}%`, 'Valore']} />
              {marginsData.map((d, i) => (
                <ReferenceLine key={i} y={d.target} stroke={d.fill} strokeDasharray="4 2" strokeOpacity={0.5} />
              ))}
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {marginsData.map((d, i) => (
                  <Cell key={i} fill={d.fill} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Struttura dei Costi"
          subtitle="Dove va il tuo fatturato"
          style={{ flex: 1 }}
        >
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={costsData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {costsData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, '']} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span style={{ fontSize: 11, color: '#374151' }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 3: Liquidity ── */}
      <div className="chart-row">
        <ChartCard
          title="Indicatori di Liquidità"
          subtitle="Giorni — blu: attuale · grigio: target"
          style={{ flex: 1 }}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={liquidityData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis unit=" gg" tick={{ fontSize: 12, fill: '#64748b' }} width={44} />
              <Tooltip formatter={(v, n) => [`${v} giorni`, n === 'actual' ? 'Attuale' : 'Target']} />
              <Legend
                formatter={(v) => <span style={{ fontSize: 11 }}>{v === 'actual' ? 'Attuale' : 'Target'}</span>}
              />
              <Bar dataKey="target" name="target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="actual" radius={[4, 4, 0, 0]}>
                {liquidityData.map((d, i) => {
                  const good =
                    (d.name === 'DSO' && d.actual <= 45) ||
                    (d.name === 'DPO' && d.actual >= 30) ||
                    (d.name === 'CCC' && d.actual <= 60)
                  return <Cell key={i} fill={good ? '#22c55e' : '#ef4444'} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Break-even Analysis"
          subtitle="Struttura ricavi e copertura costi"
          style={{ flex: 1 }}
        >
          <BreakevenPanel kpis={kpis} />
        </ChartCard>
      </div>
    </div>
  )
}

// ─── Chart sub-components ─────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children, style = {} }) {
  return (
    <div className="chart-card" style={style}>
      <div className="chart-card-header">
        <div className="chart-card-title">{title}</div>
        {subtitle && <div className="chart-card-sub">{subtitle}</div>}
      </div>
      <div className="chart-card-body">{children}</div>
    </div>
  )
}

function SinglePointHint({ value, label, color, unit = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 8 }}>
      <div style={{ fontSize: 48, fontWeight: 800, color }}>{value ?? '—'}<span style={{ fontSize: 18, fontWeight: 400, color: '#94a3b8' }}>{unit}</span></div>
      <div style={{ fontSize: 13, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', maxWidth: 200 }}>
        Esegui più analisi nel tempo per vedere il trend
      </div>
    </div>
  )
}

function ScoreDot(props) {
  const { cx, cy, payload } = props
  return <circle cx={cx} cy={cy} r={5} fill={scoreColor(payload.score)} stroke="#fff" strokeWidth={2} />
}

function ScoreTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#1e293b', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.label}</div>
      <div style={{ color: scoreColor(d.score) }}>Score: <strong>{d.score}/100</strong></div>
    </div>
  )
}

function ComparisonPanel({ latest, prev, delta, kpis }) {
  if (!latest) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '0 1rem' }}>
      Nessuna analisi disponibile
    </div>
  )

  const deltaColor  = delta == null ? '#94a3b8' : delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : '#f59e0b'
  const deltaArrow  = delta == null ? '—' : delta > 0 ? '▲' : delta < 0 ? '▼' : '→'
  const deltaAbs    = delta != null ? Math.abs(delta) : null

  const comparisons = [
    { label: 'Margine Lordo',  value: fmtPct(kpis?.margine_lordo_pct),  good: kpis?.margine_lordo_pct >= 30 },
    { label: 'Margine Netto',  value: fmtPct(kpis?.margine_netto_pct),  good: kpis?.margine_netto_pct >= 5  },
    { label: 'Break-even',     value: fmtPct(kpis?.break_even_pct),     good: kpis?.break_even_pct < 75     },
    { label: 'DSO',            value: kpis?.dso ? `${fmtDec(kpis.dso, 0)} gg` : '—', good: kpis?.dso <= 45 },
  ]

  return (
    <div style={{ padding: '0.5rem 0', height: 220, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: scoreColor(latest.score) }}>{latest.score}</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>/ 100 — {latest.score_label}</div>
        {delta != null && (
          <div style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: deltaColor }}>
            {deltaArrow} {deltaAbs} {prev && <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>vs {formatPeriod(prev.periodo)}</span>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, paddingTop: '0.5rem' }}>
        {comparisons.map(c => (
          <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>{c.label}</span>
            <span style={{ fontWeight: 700, color: c.good ? '#22c55e' : '#ef4444' }}>{c.value}</span>
          </div>
        ))}
      </div>

      {!prev && (
        <div style={{ fontSize: 11, color: '#94a3b8', paddingTop: '0.4rem', borderTop: '1px solid #f1f5f9' }}>
          Esegui una seconda analisi per vedere il confronto
        </div>
      )}
    </div>
  )
}

function BreakevenPanel({ kpis }) {
  if (!kpis) return null

  const fatturato  = 100
  const costiVar   = parseFloat((100 - (kpis.margine_contrib_pct || 0)).toFixed(1))
  const costiFissi = parseFloat((kpis.incidenza_costi_fissi || 0).toFixed(1))
  const be         = parseFloat((kpis.break_even_pct || 0).toFixed(1))
  const margine    = parseFloat(Math.max(0, kpis.margine_netto_pct || 0).toFixed(1))

  const data = [
    { name: 'Ricavi',         value: fatturato,  fill: '#3b82f6' },
    { name: 'Costi Var.',     value: costiVar,   fill: '#f59e0b' },
    { name: 'Costi Fissi',    value: costiFissi, fill: '#8b5cf6' },
    { name: 'Margine Netto',  value: margine,    fill: '#22c55e' },
  ]

  return (
    <div style={{ height: 220, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis unit="%" tick={{ fontSize: 10, fill: '#64748b' }} width={32} />
          <Tooltip formatter={(v) => [`${v}%`, '']} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingTop: 6 }}>
        <span style={{ color: '#64748b' }}>Break-even point</span>
        <span style={{ fontWeight: 700, color: be < 75 ? '#22c55e' : '#ef4444' }}>{be}% del fatturato</span>
      </div>
    </div>
  )
}

// ─── OVERVIEW ────────────────────────────────────────────────────────────────
function OverviewSection({ report, summary, kpis, problems, sector }) {
  const isServices = sector === 'services'

  return (
    <div className="section">
      <h2 className="section-title">Panoramica Finanziaria</h2>
      <p className="section-sub">
        Generata il {new Date(report.generated_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </p>

      <div className="overview-top">
        <ScoreCard score={report.score} label={report.score_label} color={report.score_color} />
        <div className="overview-summary-grid">
          <SumCard icon="⚠️" label="Problemi critici"  value={summary?.critical || 0}                color="#ef4444" />
          <SumCard icon="🔔" label="Avvisi"            value={summary?.warnings  || 0}               color="#f59e0b" />
          <SumCard icon="⚡" label="Azioni immediate"  value={summary?.immediate_actions || 0}       color="#3b82f6" />
          <SumCard icon="💰" label="Risparmio stimato" value={`€ ${fmt(summary?.savings_potential)}`} color="#22c55e" />
        </div>
      </div>

      {isServices ? (
        <div className="kpi-grid">
          <KPICard label="Margine Lordo"      value={fmtPct(kpis?.gross_margin)}        sub={fmtEuro(kpis?.margine_lordo)}            good={kpis?.gross_margin >= 20} />
          <KPICard label="Margine Netto"      value={fmtPct(kpis?.net_margin)}          sub={fmtEuro(kpis?.margine_netto)}            good={kpis?.net_margin >= 0}    />
          <KPICard label="Utilizzo Risorse"   value={kpis?.utilization_rate != null ? fmtPct(kpis.utilization_rate) : '—'} sub="Ore fatturabili / totali"    good={kpis?.utilization_rate >= 60} />
          <KPICard label="Ricavo/Dipendente"  value={kpis?.revenue_per_employee  != null ? fmtEuro(kpis.revenue_per_employee)  : '—'} sub="Efficienza del team"    good={kpis?.revenue_per_employee >= 50000} />
          <KPICard label="Ricavo/Cliente"     value={kpis?.revenue_per_client    != null ? fmtEuro(kpis.revenue_per_client)    : '—'} sub="Valore medio cliente"   good={kpis?.revenue_per_client >= 10000}   />
          <KPICard label="Break-even"         value={fmtEuro(kpis?.break_even)}         sub={`${fmtPct(kpis?.break_even_pct)} del fatturato`} good={kpis?.break_even_pct < 75} />
        </div>
      ) : (
        <div className="kpi-grid">
          <KPICard label="Margine Lordo"   value={fmtPct(kpis?.margine_lordo_pct)}  sub={fmtEuro(kpis?.margine_lordo)}                              good={kpis?.margine_lordo_pct >= 30} />
          <KPICard label="Margine Netto"   value={fmtPct(kpis?.margine_netto_pct)}  sub={fmtEuro(kpis?.margine_netto)}                              good={kpis?.margine_netto_pct >= 5}  />
          <KPICard label="Break-even"      value={fmtEuro(kpis?.break_even)}        sub={`${fmtPct(kpis?.break_even_pct)} del fatturato`}            good={kpis?.break_even_pct < 75}     />
          <KPICard label="Rot. Magazzino"  value={kpis?.rotazione_magazzino ? `${fmtDec(kpis.rotazione_magazzino)}x/anno` : '—'} sub={kpis?.giorni_magazzino ? `${kpis.giorni_magazzino} giorni` : ''} good={kpis?.rotazione_magazzino >= 4} />
          <KPICard label="DSO (giorni)"    value={kpis?.dso ? `${fmtDec(kpis.dso, 0)} gg` : '—'}    sub="Incasso clienti"      good={kpis?.dso <= 45}  />
          <KPICard label="DPO (giorni)"    value={kpis?.dpo ? `${fmtDec(kpis.dpo, 0)} gg` : '—'}    sub="Pagamento fornitori"  good={kpis?.dpo >= 30}  />
        </div>
      )}

      {problems.length > 0 && (
        <div className="overview-problems">
          <h3>Problemi identificati</h3>
          {problems.slice(0, 4).map(p => <ProblemRow key={p.id} p={p} />)}
        </div>
      )}
    </div>
  )
}

// ─── KPI TABLE ───────────────────────────────────────────────────────────────
function KPISection({ kpis, sector }) {
  if (!kpis) return <EmptyState text="Esegui prima un'analisi." />
  return (
    <div className="section">
      <h2 className="section-title">KPI Dettaglio</h2>
      <p className="section-sub">Tutti i KPI calcolati dal motore CFO.</p>
      <div className="kpi-table-wrap">
        <table className="kpi-table">
          <thead>
            <tr><th>KPI</th><th>Valore</th><th>Target</th><th>Stato</th></tr>
          </thead>
          <tbody>
            {kpiRows(kpis, sector).map(r => (
              <tr key={r.label}>
                <td><strong>{r.label}</strong><br /><span className="kpi-desc">{r.desc}</span></td>
                <td className="kpi-val">{r.value}</td>
                <td className="kpi-threshold">{r.threshold}</td>
                <td><StatusBadge good={r.good} na={r.value === '—'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function kpiRows(k, sector) {
  if (sector === 'services') {
    return [
      { label: 'Margine Lordo',         desc: 'Fatturato - Costi Variabili',              value: fmtPct(k.gross_margin),           threshold: '≥ 20%',     good: k.gross_margin >= 20 },
      { label: 'Margine Lordo (€)',      desc: 'Valore assoluto',                          value: fmtEuro(k.margine_lordo),         threshold: 'Positivo',  good: k.margine_lordo > 0 },
      { label: 'Margine Netto',          desc: 'Dopo costi fissi / Fatturato',             value: fmtPct(k.net_margin),             threshold: '≥ 5%',      good: k.net_margin >= 5 },
      { label: 'Margine Netto (€)',      desc: 'Valore assoluto',                          value: fmtEuro(k.margine_netto),         threshold: 'Positivo',  good: k.margine_netto > 0 },
      { label: 'Tasso Utilizzo',         desc: 'Ore fatturabili / ore totali disponibili', value: k.utilization_rate != null ? fmtPct(k.utilization_rate) : '—', threshold: '≥ 60%', good: k.utilization_rate >= 60 },
      { label: 'Ricavo per Dipendente',  desc: 'Efficienza media del team',                value: k.revenue_per_employee != null ? fmtEuro(k.revenue_per_employee) : '—', threshold: '≥ €50.000', good: k.revenue_per_employee >= 50000 },
      { label: 'Ricavo per Cliente',     desc: 'Valore medio per cliente attivo',          value: k.revenue_per_client != null ? fmtEuro(k.revenue_per_client) : '—',    threshold: '≥ €10.000', good: k.revenue_per_client >= 10000 },
      { label: 'Break-even Point',       desc: 'Fatturato minimo per non perdere',         value: fmtEuro(k.break_even),            threshold: '< 75% fatt.', good: k.break_even_pct < 75 },
      { label: 'Break-even %',          desc: '% sul fatturato',                          value: fmtPct(k.break_even_pct),         threshold: '< 75%',       good: k.break_even_pct < 75 },
      { label: 'Incidenza Costi Fissi',  desc: 'Peso costi fissi sul fatturato',           value: fmtPct(k.incidenza_costi_fissi),  threshold: '< 35%',       good: k.incidenza_costi_fissi < 35 },
      { label: 'Marg. Contribuzione',    desc: '% fatturato dopo costi variabili',         value: fmtPct(k.margine_contrib_pct),    threshold: '≥ 40%',       good: k.margine_contrib_pct >= 40 },
    ]
  }
  return [
    { label: 'Margine Lordo',          desc: 'Fatturato - Costi Variabili',             value: fmtPct(k.margine_lordo_pct),           threshold: '≥ 30%',       good: k.margine_lordo_pct >= 30 },
    { label: 'Margine Lordo (€)',       desc: 'Valore assoluto',                          value: fmtEuro(k.margine_lordo),              threshold: 'Positivo',    good: k.margine_lordo > 0 },
    { label: 'Margine Netto',           desc: 'EBIT / Fatturato',                         value: fmtPct(k.margine_netto_pct),           threshold: '≥ 5%',        good: k.margine_netto_pct >= 5 },
    { label: 'Margine Netto (€)',       desc: 'Valore assoluto',                          value: fmtEuro(k.margine_netto),              threshold: 'Positivo',    good: k.margine_netto > 0 },
    { label: 'Break-even Point',        desc: 'Fatturato minimo per non perdere',         value: fmtEuro(k.break_even),                 threshold: '< 75% fatt.', good: k.break_even_pct < 75 },
    { label: 'Break-even %',           desc: '% sul fatturato',                          value: fmtPct(k.break_even_pct),              threshold: '< 75%',       good: k.break_even_pct < 75 },
    { label: 'Marg. Contribuzione',     desc: '% fatturato dopo costi variabili',         value: fmtPct(k.margine_contrib_pct),         threshold: '≥ 40%',       good: k.margine_contrib_pct >= 40 },
    { label: 'Incidenza Costi Fissi',   desc: 'Peso costi fissi sul fatturato',           value: fmtPct(k.incidenza_costi_fissi),       threshold: '< 35%',       good: k.incidenza_costi_fissi < 35 },
    { label: 'Incidenza Materie Prime', desc: 'Peso MP sul fatturato',                    value: fmtPct(k.incidenza_mp),                threshold: '< 40%',       good: k.incidenza_mp < 40 },
    { label: 'Incidenza Manodopera',    desc: 'Peso MDO diretta sul fatturato',           value: fmtPct(k.incidenza_mdo),               threshold: '< 25%',       good: k.incidenza_mdo < 25 },
    { label: 'Costo Unitario',          desc: 'Costo totale per unità prodotta',          value: k.costo_unitario != null ? `€ ${fmtDec(k.costo_unitario, 2)}` : '—', threshold: '< Prezzo vendita', good: k.costo_unitario < k.prezzo_unitario },
    { label: 'Rotazione Magazzino',     desc: 'Volte che il magazzino ruota/anno',        value: k.rotazione_magazzino ? `${fmtDec(k.rotazione_magazzino)}x` : '—', threshold: '≥ 6x/anno',   good: k.rotazione_magazzino >= 6 },
    { label: 'Giorni Magazzino',        desc: 'Giorni medi di permanenza in stock',       value: k.giorni_magazzino ? `${k.giorni_magazzino} gg` : '—',            threshold: '< 60 giorni', good: k.giorni_magazzino < 60 },
    { label: 'DSO',                     desc: 'Giorni medi incasso clienti',              value: k.dso ? `${fmtDec(k.dso, 0)} gg` : '—',                          threshold: '≤ 45 giorni', good: k.dso <= 45 },
    { label: 'DPO',                     desc: 'Giorni medi pagamento fornitori',          value: k.dpo ? `${fmtDec(k.dpo, 0)} gg` : '—',                          threshold: '≥ 30 giorni', good: k.dpo >= 30 },
    { label: 'Cash Conversion Cycle',  desc: 'DSO + Giorni Mag. - DPO',                 value: k.ccc ? `${fmtDec(k.ccc, 0)} gg` : '—',                          threshold: '< 60 giorni', good: k.ccc < 60 },
    { label: 'Leva Operativa',          desc: 'Sensibilità profitto a variazioni ricavi', value: k.leva_operativa ? fmtDec(k.leva_operativa, 2) : '—',            threshold: '< 5',         good: k.leva_operativa < 5 },
    { label: 'Utilizzo Capacità',       desc: '% capacità produttiva usata',              value: k.utilizzo_capacita ? fmtPct(k.utilizzo_capacita) : '—',         threshold: '≥ 75%',       good: k.utilizzo_capacita >= 75 },
  ]
}

// ─── PROBLEMS ────────────────────────────────────────────────────────────────
function ProblemsSection({ problems }) {
  if (!problems || problems.length === 0) return (
    <div className="section">
      <h2 className="section-title">Problemi Identificati</h2>
      <div className="empty-state"><div className="empty-icon">✅</div><p>Nessun problema critico rilevato.</p></div>
    </div>
  )
  const critical = problems.filter(p => p.severity === 'critical')
  const warnings = problems.filter(p => p.severity === 'warning')
  return (
    <div className="section">
      <h2 className="section-title">Problemi Identificati</h2>
      <p className="section-sub">{problems.length} trovati · {critical.length} critici · {warnings.length} avvisi</p>
      {critical.length > 0 && (
        <div className="problem-group">
          <div className="problem-group-header critical-header">🚨 Critici — Richiede intervento immediato</div>
          {critical.map(p => <ProblemCard key={p.id} p={p} />)}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="problem-group">
          <div className="problem-group-header warning-header">⚠️ Attenzione — Da monitorare e ottimizzare</div>
          {warnings.map(p => <ProblemCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  )
}

function ProblemCard({ p }) {
  const bg  = p.severity === 'critical' ? '#fef2f2' : '#fffbeb'
  const brd = p.severity === 'critical' ? '#fca5a5' : '#fcd34d'
  const ic  = p.severity === 'critical' ? '🚨' : '⚠️'
  return (
    <div className="problem-card" style={{ background: bg, borderColor: brd }}>
      <div className="problem-card-header">
        <span>{ic}</span>
        <strong>{p.titolo}</strong>
        <span className="problem-area">{p.area}</span>
      </div>
      <p className="problem-desc">{p.descrizione}</p>
      <div className="problem-metrics">
        <span>🎯 Target: <strong>{p.soglia}</strong></span>
        <span>📍 Attuale: <strong style={{ color: p.severity === 'critical' ? '#ef4444' : '#d97706' }}>{p.valore_attuale}</strong></span>
      </div>
    </div>
  )
}

function ProblemRow({ p }) {
  return (
    <div className={`problem-row ${p.severity}`}>
      <span className="pr-icon">{p.severity === 'critical' ? '🚨' : '⚠️'}</span>
      <div>
        <div className="pr-title">{p.titolo}</div>
        <div className="pr-meta">{p.area} · Attuale: {p.valore_attuale} · Target: {p.soglia}</div>
      </div>
    </div>
  )
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────
function ActionsSection({ recs }) {
  const hasAny = (recs.immediate?.length || 0) + (recs.short_term?.length || 0) + (recs.medium_term?.length || 0) > 0
  if (!hasAny) return <EmptyState text="Esegui un'analisi per vedere le azioni consigliate." />
  return (
    <div className="section">
      <h2 className="section-title">Piano d'Azione CFO</h2>
      <p className="section-sub">Azioni concrete prioritizzate per impatto economico.</p>
      {recs.immediate?.length   > 0 && <ActionGroup title="⚡ Azioni Immediate" subtitle="Entro 30 giorni"  color="#ef4444" bg="#fef2f2" items={recs.immediate}   />}
      {recs.short_term?.length  > 0 && <ActionGroup title="📅 Breve Termine"   subtitle="30–90 giorni"     color="#f59e0b" bg="#fffbeb" items={recs.short_term}  />}
      {recs.medium_term?.length > 0 && <ActionGroup title="🗓 Medio Termine"   subtitle="3–12 mesi"        color="#3b82f6" bg="#eff6ff" items={recs.medium_term} />}
    </div>
  )
}

function ActionGroup({ title, subtitle, color, bg, items }) {
  return (
    <div className="action-group">
      <div className="action-group-header" style={{ color, background: bg }}>
        <strong>{title}</strong><span>{subtitle}</span>
      </div>
      {items.map((a, i) => (
        <div key={i} className="action-card">
          <div className="action-card-title">{a.titolo}</div>
          <p className="action-card-desc">{a.descrizione}</p>
          <div className="action-card-impact">💰 {a.impatto}</div>
        </div>
      ))}
    </div>
  )
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────
function HistorySection({ history }) {
  if (!history || history.length === 0) return <EmptyState text="Nessuna analisi storica disponibile." />
  return (
    <div className="section">
      <h2 className="section-title">Storico Analisi</h2>
      <p className="section-sub">Evoluzione della salute finanziaria nel tempo.</p>
      <div className="history-list">
        {history.map(h => (
          <div key={h.id} className="history-item">
            <div className="history-period">{h.periodo}</div>
            <div className="history-date">{new Date(h.created_at).toLocaleDateString('it-IT')}</div>
            <div className="history-score">
              <div className="score-bar-bg">
                <div className="score-bar-fill" style={{ width: `${h.score}%`, background: scoreColor(h.score) }} />
              </div>
              <span style={{ color: scoreColor(h.score) }}><strong>{h.score}/100</strong> {h.score_label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SHARED UI ───────────────────────────────────────────────────────────────
function ScoreGauge({ score, label, color }) {
  return (
    <div className="score-gauge-mini">
      <div className="score-number" style={{ color }}>{score}</div>
      <div className="score-label-mini">{label}</div>
      <div className="score-bar-bg">
        <div className="score-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  )
}

function ScoreCard({ score, label, color }) {
  return (
    <div className="score-card" style={{ borderColor: color }}>
      <div className="score-title">Health Score</div>
      <div className="score-big" style={{ color }}>{score}<span className="score-max">/100</span></div>
      <div className="score-label-badge" style={{ background: color }}>{label}</div>
      <div className="score-bar-bg big">
        <div className="score-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <p className="score-desc">{scoreDesc(score)}</p>
    </div>
  )
}

function SumCard({ icon, label, value, color }) {
  return (
    <div className="sum-card">
      <div className="sum-icon">{icon}</div>
      <div className="sum-value" style={{ color }}>{value}</div>
      <div className="sum-label">{label}</div>
    </div>
  )
}

function KPICard({ label, value, sub, good }) {
  return (
    <div className={`kpi-card ${good ? 'kpi-good' : 'kpi-bad'}`}>
      <div className="kpi-card-label">{label}</div>
      <div className="kpi-card-value">{value}</div>
      {sub && <div className="kpi-card-sub">{sub}</div>}
      <div className={`kpi-status-dot ${good ? 'green' : 'red'}`} />
    </div>
  )
}

function StatusBadge({ good, na }) {
  if (na) return <span className="badge grey">N/D</span>
  return <span className={`badge ${good ? 'green' : 'red'}`}>{good ? '✓ OK' : '✗ Critico'}</span>
}

function EmptyState({ text }) {
  return (
    <div className="section">
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <p>{text}</p>
      </div>
    </div>
  )
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function formatPeriod(periodo) {
  if (!periodo) return ''
  // "2025-03" → "Mar 25"
  const [y, m] = periodo.split('-')
  const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
  return `${months[parseInt(m, 10) - 1]} ${y?.slice(2)}`
}
