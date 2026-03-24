import { useState, useEffect } from 'react'
import Questionnaire from './components/Questionnaire.jsx'
import Dashboard from './components/Dashboard.jsx'
import { api } from './services/api.js'

export default function App() {
  const [view, setView]           = useState('home')   // 'home' | 'questionnaire' | 'dashboard'
  const [companyId, setCompanyId] = useState(null)
  const [companies, setCompanies] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    loadCompanies()
    // Ripristina sessione salvata
    const saved = localStorage.getItem('cfo_company_id')
    if (saved) setCompanyId(saved)
  }, [])

  async function loadCompanies() {
    try {
      const list = await api.listCompanies()
      setCompanies(list)
    } catch (e) {
      setError('Backend non raggiungibile. Assicurati che il server sia avviato su porta 3001.')
    } finally {
      setLoading(false)
    }
  }

  function handleCompanyReady(id) {
    setCompanyId(id)
    localStorage.setItem('cfo_company_id', id)
    setView('dashboard')
  }

  function handleNewCompany() {
    setCompanyId(null)
    setView('questionnaire')
  }

  function handleSelectCompany(id) {
    setCompanyId(id)
    localStorage.setItem('cfo_company_id', id)
    setView('dashboard')
  }

  function handleBack() {
    setView('home')
    loadCompanies()
  }

  if (loading) return (
    <div className="loader-screen">
      <div className="loader-content">
        <div className="spinner" />
        <p>Connessione al backend CFO…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="error-screen">
      <div className="error-box">
        <div className="error-icon">⚠️</div>
        <h2>Backend non raggiungibile</h2>
        <p>{error}</p>
        <div className="code-block">
          <span>cd backend && npm install && npm run dev</span>
        </div>
        <button className="btn-primary" onClick={() => { setError(null); setLoading(true); loadCompanies() }}>
          Riprova
        </button>
      </div>
    </div>
  )

  if (view === 'questionnaire') return (
    <Questionnaire
      onComplete={handleCompanyReady}
      onBack={handleBack}
    />
  )

  if (view === 'dashboard' && companyId) return (
    <Dashboard
      companyId={companyId}
      onBack={handleBack}
    />
  )

  // HOME
  return (
    <div className="home-screen">
      <header className="home-header">
        <div className="header-brand">
          <span className="header-icon">📊</span>
          <div>
            <h1>CFO Virtuale</h1>
            <p>Analisi finanziaria per aziende manifatturiere</p>
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="home-hero">
          <h2>Conosci davvero i numeri della tua azienda?</h2>
          <p>
            Inserisci i dati finanziari e produttivi della tua azienda.<br />
            Il motore CFO calcola KPI, identifica problemi e ti dà azioni concrete.
          </p>
          <button className="btn-primary btn-lg" onClick={handleNewCompany}>
            + Nuova analisi CFO
          </button>
        </div>

        {companies.length > 0 && (
          <div className="home-companies">
            <h3>Aziende salvate</h3>
            <div className="company-grid">
              {companies.map(c => (
                <div key={c.id} className="company-card" onClick={() => handleSelectCompany(c.id)}>
                  <div className="company-card-name">{c.nome}</div>
                  <div className="company-card-meta">
                    {c.settore} · {c.dipendenti} dip.
                  </div>
                  {c.last_score != null && (
                    <div
                      className="company-card-score"
                      style={{ color: scoreColor(c.last_score) }}
                    >
                      Score: {c.last_score}/100
                    </div>
                  )}
                  <div className="company-card-cta">Apri Dashboard →</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="home-features">
          {[
            { icon: '🧮', t: 'KPI Automatici',        d: 'Margini, break-even, rotazione magazzino, DSO/DPO calcolati in tempo reale' },
            { icon: '🔍', t: 'Problemi Individuati',  d: 'Il motore CFO identifica inefficienze e rischi finanziari nel tuo modello' },
            { icon: '⚡', t: 'Azioni Concrete',        d: 'Non teoria: azioni prioritizzate con impatto economico stimato' },
            { icon: '📈', t: 'Storico Analisi',        d: 'Tieni traccia dell\'evoluzione della salute finanziaria nel tempo' }
          ].map(f => (
            <div key={f.t} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.t}</div>
              <div className="feature-desc">{f.d}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function scoreColor(s) {
  if (s >= 80) return '#22c55e'
  if (s >= 65) return '#3b82f6'
  if (s >= 50) return '#f59e0b'
  return '#ef4444'
}
