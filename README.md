# Virtual Chief Financial Officer — Sistema di Analisi Finanziaria

Applicazione completa per il controllo di gestione di aziende di ogni settore.
Calcola KPI, identifica problemi finanziari, genera raccomandazioni concrete.

---

## Stack Tecnologico

- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: React 18 + Vite
- **Database**: SQLite (file locale `backend/cfo.db`)

---

## Avvio Rapido

### 1. Avvia il Backend

```bash
cd backend
npm install
npm run dev
```

Il server parte su **http://localhost:3001**

### 2. Avvia il Frontend (in un altro terminale)

```bash
cd frontend
npm install
npm run dev
```

Il frontend parte su **http://localhost:5173**

### 3. Apri il browser

Vai su: **http://localhost:5173**

---

## Struttura Progetto

```
cfo-app/
├── backend/
│   ├── server.js              # Entry point Express
│   ├── package.json
│   ├── database/
│   │   └── init.js            # Schema SQLite + init
│   ├── routes/
│   │   ├── company.js         # CRUD aziende
│   │   └── analysis.js        # Endpoint analisi
│   └── engine/
│       └── cfoEngine.js       # Motore CFO (KPI, problemi, raccomandazioni)
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx             # Root app + routing
        ├── index.css           # Design system completo
        ├── main.jsx
        ├── services/
        │   └── api.js          # Client HTTP
        └── components/
            ├── Questionnaire.jsx  # Wizard 6 step
            └── Dashboard.jsx      # Dashboard CFO completa
```

---

## API Endpoints

| Metodo | Endpoint                         | Descrizione                    |
|--------|----------------------------------|--------------------------------|
| POST   | `/api/company/setup`             | Crea azienda con tutti i dati  |
| GET    | `/api/company/data/:id`          | Recupera dati azienda          |
| GET    | `/api/company/list`              | Lista tutte le aziende         |
| DELETE | `/api/company/:id`               | Elimina azienda                |
| POST   | `/api/analysis/run`              | Esegui analisi CFO             |
| GET    | `/api/analysis/report/:id`       | Ultimo report                  |
| GET    | `/api/analysis/history/:id`      | Storico analisi (ultimi 12)    |
| GET    | `/api/health`                    | Health check                   |

---

## KPI Calcolati

| KPI                     | Formula                                   | Target        |
|-------------------------|-------------------------------------------|---------------|
| Margine Lordo %         | (Fatturato - Costi Var.) / Fatturato      | ≥ 30%         |
| Margine Netto %         | (Margine Lordo - Costi Fissi) / Fatturato | ≥ 5%          |
| Break-even Point        | Costi Fissi / (1 - %Costi Var.)           | < 75% fatt.   |
| Rotazione Magazzino     | Costi Var. / Valore Magazzino             | ≥ 6x/anno     |
| DSO                     | (Crediti / Fatturato) × 365              | ≤ 45 giorni   |
| DPO                     | (Debiti / Costi Var.) × 365              | ≥ 30 giorni   |
| Cash Conversion Cycle   | DSO + Giorni Mag. - DPO                   | < 60 giorni   |
| Leva Operativa          | Margine Lordo / Margine Netto             | < 5           |
| Utilizzo Capacità       | Unità Prodotte / Capacità Max × 100       | ≥ 75%         |

---

## Motore CFO — Logica

Il file `backend/engine/cfoEngine.js` implementa:

1. **calculateKPIs(data)** — Calcolo di tutti i KPI finanziari
2. **identifyProblems(data, kpis)** — Rilevamento automatico di 8 categorie di problemi
3. **generateRecommendations(data, kpis, problems)** — Azioni in 3 orizzonti temporali
4. **calculateScore(kpis, problems)** — Health Score 0-100
5. **runCFOAnalysis(data)** — Entry point che orchestra tutto

### Categorie di problemi rilevate:
- Margine lordo basso / critico
- Margine netto insufficiente / negativo
- Break-even pericolosamente alto
- Magazzino fermo / lento
- DSO eccessivo (incassi lenti)
- Costi fissi pesanti
- Materie prime fuori controllo
- Capacità produttiva sottoutilizzata

---

## Sviluppi Futuri Consigliati

- [ ] Autenticazione utenti (JWT)
- [ ] Export report PDF
- [ ] Grafici storici (Chart.js / Recharts)
- [ ] Budget vs Actual comparison
- [ ] Analisi per linea di prodotto
- [ ] Alert automatici via email
- [ ] Integrazione con ERP (Fatture in Cloud, Gestionale 1…)

---

## Requisiti

- Node.js ≥ 18
- npm ≥ 9

Non servono database esterni: SQLite è incluso e si crea automaticamente al primo avvio.
