import { useState } from 'react'
import { api } from '../services/api.js'

// ─── Steps per sector ────────────────────────────────────────────────────────
const STEPS_MANUFACTURING = [
  { id: 'company',    label: 'Azienda',    icon: '🏭' },
  { id: 'revenue',    label: 'Fatturato',  icon: '💶' },
  { id: 'costs',      label: 'Costi',      icon: '📋' },
  { id: 'production', label: 'Produzione', icon: '⚙️' },
  { id: 'inventory',  label: 'Magazzino',  icon: '📦' },
  { id: 'credit',     label: 'Crediti',    icon: '🏦' },
]

const STEPS_SERVICES = [
  { id: 'company',  label: 'Azienda',   icon: '🏭' },
  { id: 'revenue',  label: 'Fatturato', icon: '💶' },
  { id: 'costs',    label: 'Costi',     icon: '📋' },
  { id: 'services', label: 'Servizi',   icon: '👥' },
  { id: 'credit',   label: 'Crediti',   icon: '🏦' },
]

const STEPS_COMMERCE = [
  { id: 'company', label: 'Azienda',   icon: '🏭' },
  { id: 'revenue', label: 'Fatturato', icon: '💶' },
  { id: 'costs',   label: 'Costi',     icon: '📋' },
  { id: 'credit',  label: 'Crediti',   icon: '🏦' },
]

function getSteps(sector) {
  if (sector === 'services') return STEPS_SERVICES
  if (sector === 'commerce') return STEPS_COMMERCE
  return STEPS_MANUFACTURING
}

// ─── Initial state ────────────────────────────────────────────────────────────
const EMPTY = {
  company:    { nome: '', sector: 'manufacturing', settore: 'Manifatturiero', anno_fond: '', dipendenti: '', note: '' },
  financials: { fatturato_annuo: '', costi_fissi_annui: '', costo_mp: '', costo_manodopera: '', altri_costi_var: '' },
  production: { unita_prodotte: '', prezzo_medio_vendita: '', capacita_max: '', tempo_ciclo_ore: '' },
  inventory:  { valore_mp: '', valore_wip: '', valore_fg: '', giorni_copertura: '' },
  services:   { billable_hours: '', total_hours: '', clients: '' },
  credit:     { crediti_clienti: '', debiti_fornitori: '' },
}

function num(v) { return v === '' ? 0 : parseFloat(v) || 0 }

// ─── Component ────────────────────────────────────────────────────────────────
export default function Questionnaire({ onComplete, onBack }) {
  const [step,    setStep]    = useState(0)
  const [data,    setData]    = useState(EMPTY)
  const [errors,  setErrors]  = useState({})
  const [saving,  setSaving]  = useState(false)
  const [saveErr, setSaveErr] = useState(null)

  const steps   = getSteps(data.company.sector)
  const current = steps[step]

  function update(section, field, value) {
    setData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }))
    setErrors(prev => ({ ...prev, [`${section}.${field}`]: undefined }))
  }

  function validate(stepId) {
    const e = {}
    if (stepId === 'company') {
      if (!data.company.nome.trim()) e['company.nome'] = 'Nome azienda obbligatorio'
    }
    if (stepId === 'revenue') {
      if (!data.financials.fatturato_annuo) e['financials.fatturato_annuo'] = 'Fatturato obbligatorio'
      if (!data.financials.costi_fissi_annui) e['financials.costi_fissi_annui'] = 'Costi fissi obbligatori'
    }
    if (stepId === 'costs') {
      if (data.company.sector === 'services') {
        if (!data.financials.costo_mp) e['financials.costo_mp'] = 'Costi variabili obbligatori'
      } else {
        if (!data.financials.costo_mp) e['financials.costo_mp'] = 'Costo materie prime obbligatorio'
        if (!data.financials.costo_manodopera) e['financials.costo_manodopera'] = 'Costo manodopera obbligatorio'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (!validate(current.id)) return
    if (step < steps.length - 1) setStep(s => s + 1)
    else submit()
  }

  async function submit() {
    setSaving(true)
    setSaveErr(null)
    try {
      const sector = data.company.sector
      const payload = {
        company: {
          nome:       data.company.nome,
          settore:    data.company.settore,
          sector,
          anno_fond:  num(data.company.anno_fond) || null,
          dipendenti: num(data.company.dipendenti),
          note:       data.company.note,
        },
        financials: {
          fatturato_annuo:   num(data.financials.fatturato_annuo),
          costi_fissi_annui: num(data.financials.costi_fissi_annui),
          costo_mp:          num(data.financials.costo_mp),
          costo_manodopera:  sector === 'services' ? 0 : num(data.financials.costo_manodopera),
          altri_costi_var:   sector === 'services' ? 0 : num(data.financials.altri_costi_var),
          crediti_clienti:   num(data.credit.crediti_clienti),
          debiti_fornitori:  num(data.credit.debiti_fornitori),
        },
      }

      if (sector === 'manufacturing') {
        payload.production = {
          unita_prodotte:       num(data.production.unita_prodotte),
          prezzo_medio_vendita: num(data.production.prezzo_medio_vendita),
          capacita_max:         num(data.production.capacita_max),
          tempo_ciclo_ore:      num(data.production.tempo_ciclo_ore),
        }
        payload.inventory = {
          valore_mp:        num(data.inventory.valore_mp),
          valore_wip:       num(data.inventory.valore_wip),
          valore_fg:        num(data.inventory.valore_fg),
          giorni_copertura: num(data.inventory.giorni_copertura),
        }
      }

      if (sector === 'services') {
        // Map service fields into the production table columns
        payload.production = {
          unita_prodotte:       num(data.services.clients),       // clients
          tempo_ciclo_ore:      num(data.services.billable_hours), // billable hours
          capacita_max:         num(data.services.total_hours),    // total hours
          prezzo_medio_vendita: 0,
        }
      }

      if (sector === 'commerce') {
        payload.production = {
          unita_prodotte: 0, prezzo_medio_vendita: 0,
          capacita_max: 0,   tempo_ciclo_ore: 0,
        }
        payload.inventory = {
          valore_mp: 0, valore_wip: 0, valore_fg: 0, giorni_copertura: 0,
        }
      }

      const res = await api.setupCompany(payload)
      onComplete(res.company_id)
    } catch (e) {
      setSaveErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const pct = Math.round(((step + 1) / steps.length) * 100)

  return (
    <div className="questionnaire-screen">
      <div className="q-header">
        <button className="btn-back" onClick={onBack}>← Indietro</button>
        <div className="q-title">
          <span>📊</span> CFO Virtuale — Configurazione Azienda
        </div>
      </div>

      {/* Progress bar */}
      <div className="q-progress-wrap">
        <div className="q-progress-bar" style={{ width: `${pct}%` }} />
      </div>

      {/* Step counter + tabs */}
      <div className="q-steps-header">
        <span className="q-step-counter">Step {step + 1} di {steps.length}</span>
      </div>
      <div className="q-steps">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={`q-step-dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}
            onClick={() => i < step && setStep(i)}
            title={s.label}
          >
            <span>{i < step ? '✓' : s.icon}</span>
            <span className="q-step-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="q-card">
        <StepContent
          stepId={current.id}
          data={data}
          errors={errors}
          update={update}
        />

        {saveErr && <div className="q-error-banner">❌ {saveErr}</div>}

        <div className="q-nav">
          {step > 0 && (
            <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>
              ← Precedente
            </button>
          )}
          <button className="btn-primary" onClick={next} disabled={saving}>
            {saving ? 'Salvataggio…' : step === steps.length - 1 ? '✅ Salva e Analizza' : 'Avanti →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Step content dispatcher ──────────────────────────────────────────────────
function StepContent({ stepId, data, errors, update }) {
  const err = (section, field) => errors[`${section}.${field}`]

  if (stepId === 'company')    return <CompanyStep    data={data} err={err} update={update} />
  if (stepId === 'revenue')    return <RevenueStep    data={data} err={err} update={update} />
  if (stepId === 'costs')      return <CostsStep      data={data} err={err} update={update} />
  if (stepId === 'production') return <ProductionStep data={data} err={err} update={update} />
  if (stepId === 'services')   return <ServicesStep   data={data} err={err} update={update} />
  if (stepId === 'inventory')  return <InventoryStep  data={data} err={err} update={update} />
  if (stepId === 'credit')     return <CreditStep     data={data} err={err} update={update} />
  return null
}

// ─── Step 0: Company ──────────────────────────────────────────────────────────
function CompanyStep({ data, err, update }) {
  const SECTOR_OPTIONS = [
    {
      value: 'manufacturing',
      label: 'Manifattura',
      icon: '🏭',
      desc: 'Produzione di beni fisici. Analisi di KPI produttivi, magazzino, materie prime e capacità.',
    },
    {
      value: 'services',
      label: 'Servizi',
      icon: '👥',
      desc: 'Se selezioni Servizi, analizziamo efficienza delle risorse e redditività per cliente.',
    },
    {
      value: 'commerce',
      label: 'Commercio',
      icon: '🛒',
      desc: 'Distribuzione e rivendita. Analisi margini commerciali e rotazione prodotti.',
    },
  ]

  return (
    <div className="q-step">
      <h2>🏭 Informazioni Azienda</h2>
      <p className="q-step-desc">Seleziona prima il settore, poi completa i dati anagrafici.</p>

      <div className="q-field">
        <label className="q-label">Settore principale *</label>
        <div className="sector-cards">
          {SECTOR_OPTIONS.map(s => (
            <div
              key={s.value}
              className={`sector-card ${data.company.sector === s.value ? 'selected' : ''}`}
              onClick={() => update('company', 'sector', s.value)}
            >
              <span className="sector-card-icon">{s.icon}</span>
              <strong>{s.label}</strong>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <Field label="Nome Azienda *" error={err('company', 'nome')}>
        <input
          type="text"
          placeholder="Es. Rossi Meccanica S.r.l."
          value={data.company.nome}
          onChange={e => update('company', 'nome', e.target.value)}
          className={err('company', 'nome') ? 'input-error' : ''}
        />
      </Field>

      {data.company.sector === 'manufacturing' && (
        <Field label="Sottosettore">
          <select value={data.company.settore} onChange={e => update('company', 'settore', e.target.value)}>
            {['Manifatturiero', 'Metalmeccanica', 'Plastica / Gomma', 'Legno / Arredo', 'Alimentare',
              'Tessile', 'Chimico / Farmaceutico', 'Elettronico', 'Automotive', 'Altro'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      )}

      <div className="q-row">
        <Field label="Anno fondazione">
          <input type="number" placeholder="2010" min="1900" max="2025"
            value={data.company.anno_fond}
            onChange={e => update('company', 'anno_fond', e.target.value)} />
        </Field>
        <Field label="Numero dipendenti">
          <input type="number" placeholder="25" min="1"
            value={data.company.dipendenti}
            onChange={e => update('company', 'dipendenti', e.target.value)} />
        </Field>
      </div>

      <Field label="Note aggiuntive (opzionale)">
        <textarea rows={3} placeholder="Contesto, situazione attuale, sfide principali…"
          value={data.company.note}
          onChange={e => update('company', 'note', e.target.value)} />
      </Field>
    </div>
  )
}

// ─── Step 1: Revenue ──────────────────────────────────────────────────────────
function RevenueStep({ data, err, update }) {
  return (
    <div className="q-step">
      <h2>💶 Fatturato e Costi Fissi</h2>
      <p className="q-step-desc">Usa dati annui. Se hai solo dati mensili, moltiplica × 12.</p>

      <Field label="Fatturato annuo (€) *" hint="Totale ricavi da vendita prodotti/servizi" error={err('financials', 'fatturato_annuo')}>
        <input type="number" placeholder="2.000.000" min="0"
          value={data.financials.fatturato_annuo}
          onChange={e => update('financials', 'fatturato_annuo', e.target.value)}
          className={err('financials', 'fatturato_annuo') ? 'input-error' : ''}
        />
      </Field>

      <Field label="Costi fissi annui (€) *" hint="Affitti, stipendi fissi, leasing, utenze fisse, assicurazioni, ammortamenti…" error={err('financials', 'costi_fissi_annui')}>
        <input type="number" placeholder="600.000" min="0"
          value={data.financials.costi_fissi_annui}
          onChange={e => update('financials', 'costi_fissi_annui', e.target.value)}
          className={err('financials', 'costi_fissi_annui') ? 'input-error' : ''}
        />
      </Field>

      <div className="q-hint-box">
        💡 <strong>Costi fissi</strong> = quelli che paghi anche se non produci nulla quel mese.
      </div>
    </div>
  )
}

// ─── Step 2: Costs (sector-aware) ────────────────────────────────────────────
function CostsStep({ data, err, update }) {
  const sector = data.company.sector

  if (sector === 'services') {
    return (
      <div className="q-step">
        <h2>📋 Costi Variabili</h2>
        <p className="q-step-desc">Costi direttamente legati all'erogazione del servizio (esclusi i fissi).</p>

        <Field label="Costi variabili (€/anno) *" hint="Software, licenze, subappaltatori, trasferte, materiali di consumo…" error={err('financials', 'costo_mp')}>
          <input type="number" placeholder="200.000" min="0"
            value={data.financials.costo_mp}
            onChange={e => update('financials', 'costo_mp', e.target.value)}
            className={err('financials', 'costo_mp') ? 'input-error' : ''}
          />
        </Field>

        <Live data={data} />
      </div>
    )
  }

  return (
    <div className="q-step">
      <h2>📋 Costi Variabili di Produzione</h2>
      <p className="q-step-desc">Costi che variano proporzionalmente alla produzione.</p>

      <Field label="Costo materie prime (€/anno) *" hint="Tutto ciò che va nel prodotto finito" error={err('financials', 'costo_mp')}>
        <input type="number" placeholder="800.000" min="0"
          value={data.financials.costo_mp}
          onChange={e => update('financials', 'costo_mp', e.target.value)}
          className={err('financials', 'costo_mp') ? 'input-error' : ''}
        />
      </Field>

      <Field label="Costo manodopera diretta (€/anno) *" hint="Solo operai/addetti produzione. Non impiegati (vanno nei fissi)" error={err('financials', 'costo_manodopera')}>
        <input type="number" placeholder="350.000" min="0"
          value={data.financials.costo_manodopera}
          onChange={e => update('financials', 'costo_manodopera', e.target.value)}
          className={err('financials', 'costo_manodopera') ? 'input-error' : ''}
        />
      </Field>

      <Field label="Altri costi variabili (€/anno)" hint="Energia produttiva, imballaggi, lavorazioni esterne, provvigioni…">
        <input type="number" placeholder="100.000" min="0"
          value={data.financials.altri_costi_var}
          onChange={e => update('financials', 'altri_costi_var', e.target.value)}
        />
      </Field>

      <Live data={data} />
    </div>
  )
}

// ─── Step 3a: Production (manufacturing) ─────────────────────────────────────
function ProductionStep({ data, err, update }) {
  return (
    <div className="q-step">
      <h2>⚙️ Produzione</h2>
      <p className="q-step-desc">Dati produttivi. Se non hai dati precisi, usa stime ragionevoli.</p>

      <div className="q-row">
        <Field label="Unità prodotte / anno" hint="Pezzi, lotti, ordini — usa la tua unità di misura">
          <input type="number" placeholder="5.000" min="0"
            value={data.production.unita_prodotte}
            onChange={e => update('production', 'unita_prodotte', e.target.value)} />
        </Field>
        <Field label="Prezzo medio di vendita (€/unità)">
          <input type="number" placeholder="400" min="0"
            value={data.production.prezzo_medio_vendita}
            onChange={e => update('production', 'prezzo_medio_vendita', e.target.value)} />
        </Field>
      </div>

      <div className="q-row">
        <Field label="Capacità produttiva massima (unità/anno)" hint="Quante unità potresti fare al 100% di utilizzo">
          <input type="number" placeholder="8.000" min="0"
            value={data.production.capacita_max}
            onChange={e => update('production', 'capacita_max', e.target.value)} />
        </Field>
        <Field label="Tempo ciclo medio (ore/unità)">
          <input type="number" placeholder="4.5" min="0" step="0.1"
            value={data.production.tempo_ciclo_ore}
            onChange={e => update('production', 'tempo_ciclo_ore', e.target.value)} />
        </Field>
      </div>
    </div>
  )
}

// ─── Step 3b: Services data ───────────────────────────────────────────────────
function ServicesStep({ data, err, update }) {
  return (
    <div className="q-step">
      <h2>👥 Dati Operativi Servizi</h2>
      <p className="q-step-desc">Questi dati ci permettono di calcolare l'efficienza delle tue risorse e la redditività per cliente.</p>

      <div className="q-row">
        <Field label="Ore fatturabili / anno" hint="Totale ore vendute ai clienti nell'anno">
          <input type="number" placeholder="15.000" min="0"
            value={data.services.billable_hours}
            onChange={e => update('services', 'billable_hours', e.target.value)} />
        </Field>
        <Field label="Ore totali disponibili / anno" hint="Capacità totale del team (dipendenti × ore lavorative)">
          <input type="number" placeholder="20.000" min="0"
            value={data.services.total_hours}
            onChange={e => update('services', 'total_hours', e.target.value)} />
        </Field>
      </div>

      <Field label="Numero clienti attivi" hint="Clienti che hanno generato fatturato nell'anno">
        <input type="number" placeholder="12" min="0"
          value={data.services.clients}
          onChange={e => update('services', 'clients', e.target.value)} />
      </Field>

      <div className="q-hint-box">
        💡 <strong>Tasso di utilizzo</strong> = Ore fatturabili / Ore totali. Sotto il 60% segnala inefficienza. Sopra l'80% è ottimo.
      </div>
    </div>
  )
}

// ─── Step 4: Inventory (manufacturing only) ───────────────────────────────────
function InventoryStep({ data, err, update }) {
  return (
    <div className="q-step">
      <h2>📦 Magazzino</h2>
      <p className="q-step-desc">Valore del magazzino al costo di acquisto/produzione.</p>

      <Field label="Magazzino materie prime (€)" hint="Valore a costo d'acquisto">
        <input type="number" placeholder="80.000" min="0"
          value={data.inventory.valore_mp}
          onChange={e => update('inventory', 'valore_mp', e.target.value)} />
      </Field>

      <Field label="Work In Progress — WIP (€)" hint="Prodotti in lavorazione, parzialmente completati">
        <input type="number" placeholder="30.000" min="0"
          value={data.inventory.valore_wip}
          onChange={e => update('inventory', 'valore_wip', e.target.value)} />
      </Field>

      <Field label="Prodotti finiti a magazzino (€)" hint="Valore a costo di produzione">
        <input type="number" placeholder="50.000" min="0"
          value={data.inventory.valore_fg}
          onChange={e => update('inventory', 'valore_fg', e.target.value)} />
      </Field>

      <Field label="Giorni di copertura medi" hint="Quanti giorni di produzione copre il magazzino MP">
        <input type="number" placeholder="30" min="0"
          value={data.inventory.giorni_copertura}
          onChange={e => update('inventory', 'giorni_copertura', e.target.value)} />
      </Field>
    </div>
  )
}

// ─── Step last: Credit ────────────────────────────────────────────────────────
function CreditStep({ data, err, update }) {
  const sector = data.company.sector
  const totalVar = sector === 'services'
    ? parseFloat(data.financials.costo_mp || 0)
    : parseFloat(data.financials.costo_mp || 0) +
      parseFloat(data.financials.costo_manodopera || 0) +
      parseFloat(data.financials.altri_costi_var || 0)

  return (
    <div className="q-step">
      <h2>🏦 Crediti e Debiti</h2>
      <p className="q-step-desc">Posizione verso clienti e fornitori. Impatta direttamente sulla liquidità.</p>

      <Field label="Crediti verso clienti (€)" hint="Totale fatture emesse non ancora incassate">
        <input type="number" placeholder="200.000" min="0"
          value={data.credit.crediti_clienti}
          onChange={e => update('credit', 'crediti_clienti', e.target.value)} />
      </Field>

      <Field label="Debiti verso fornitori (€)" hint="Totale fatture ricevute non ancora pagate">
        <input type="number" placeholder="120.000" min="0"
          value={data.credit.debiti_fornitori}
          onChange={e => update('credit', 'debiti_fornitori', e.target.value)} />
      </Field>

      {sector !== 'services' && (
        <div className="q-hint-box">
          📌 DSO e DPO calcolati automaticamente. DSO alto = problemi di liquidità. DPO alto = usi bene il credito fornitori.
        </div>
      )}

      <div className="q-summary">
        <h4>Riepilogo dati inseriti</h4>
        <div className="summary-grid">
          <SummaryRow label="Fatturato annuo"  value={`€ ${fmt(data.financials.fatturato_annuo)}`} />
          <SummaryRow label="Costi fissi"       value={`€ ${fmt(data.financials.costi_fissi_annui)}`} />
          <SummaryRow label="Costi variabili"   value={`€ ${fmt(totalVar)}`} />
          {sector === 'services' && (
            <SummaryRow label="Ore fatturabili" value={`${fmt(data.services.billable_hours)} h`} />
          )}
          {sector === 'services' && (
            <SummaryRow label="Clienti attivi"  value={fmt(data.services.clients)} />
          )}
          {sector === 'manufacturing' && (
            <SummaryRow label="Magazzino totale" value={`€ ${fmt(
              parseFloat(data.inventory.valore_mp  || 0) +
              parseFloat(data.inventory.valore_wip || 0) +
              parseFloat(data.inventory.valore_fg  || 0)
            )}`} />
          )}
          <SummaryRow label="Crediti clienti"   value={`€ ${fmt(data.credit.crediti_clienti)}`} />
          <SummaryRow label="Debiti fornitori"  value={`€ ${fmt(data.credit.debiti_fornitori)}`} />
        </div>
      </div>
    </div>
  )
}

// ─── Live margin preview ──────────────────────────────────────────────────────
function Live({ data }) {
  const fat = parseFloat(data.financials.fatturato_annuo)   || 0
  const mp  = parseFloat(data.financials.costo_mp)          || 0
  const mdo = parseFloat(data.financials.costo_manodopera)  || 0
  const alt = parseFloat(data.financials.altri_costi_var)   || 0
  const fix = parseFloat(data.financials.costi_fissi_annui) || 0
  if (!fat) return null
  const cv  = mp + mdo + alt
  const ml  = fat - cv
  const mn  = ml - fix
  const mlp = ((ml / fat) * 100).toFixed(1)
  const mnp = ((mn / fat) * 100).toFixed(1)
  return (
    <div className="live-preview">
      <strong>📊 Anteprima in tempo reale</strong>
      <div className="live-row"><span>Margine Lordo</span><span className={ml >= 0 ? 'pos' : 'neg'}>€ {fmt(ml)} ({mlp}%)</span></div>
      <div className="live-row"><span>Margine Netto</span><span className={mn >= 0 ? 'pos' : 'neg'}>€ {fmt(mn)} ({mnp}%)</span></div>
    </div>
  )
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────
function Field({ label, hint, error, children }) {
  return (
    <div className="q-field">
      <label className="q-label">{label}</label>
      {hint && <span className="q-hint">{hint}</span>}
      {children}
      {error && <span className="q-field-error">⚠ {error}</span>}
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function fmt(v) {
  const n = parseFloat(v) || 0
  return n.toLocaleString('it-IT')
}
