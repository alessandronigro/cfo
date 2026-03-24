const Database = require('better-sqlite3');
const path = require('path');

let db;

function initDatabase() {
  const dbPath = path.join(__dirname, '../cfo.db');
  db = new Database(dbPath);

  // Performance pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id          TEXT PRIMARY KEY,
      nome        TEXT NOT NULL,
      settore     TEXT DEFAULT 'Generico',
      anno_fond   INTEGER,
      dipendenti  INTEGER DEFAULT 0,
      note        TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS financials (
      id                    TEXT PRIMARY KEY,
      company_id            TEXT NOT NULL,
      periodo               TEXT NOT NULL,
      fatturato_annuo       REAL NOT NULL DEFAULT 0,
      costi_fissi_annui     REAL NOT NULL DEFAULT 0,
      costo_mp              REAL NOT NULL DEFAULT 0,
      costo_manodopera      REAL NOT NULL DEFAULT 0,
      altri_costi_var       REAL DEFAULT 0,
      crediti_clienti       REAL DEFAULT 0,
      debiti_fornitori      REAL DEFAULT 0,
      created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS production (
      id                      TEXT PRIMARY KEY,
      company_id              TEXT NOT NULL,
      periodo                 TEXT NOT NULL,
      unita_prodotte          INTEGER DEFAULT 0,
      prezzo_medio_vendita    REAL DEFAULT 0,
      tempo_ciclo_ore         REAL DEFAULT 0,
      capacita_max            INTEGER DEFAULT 0,
      created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id              TEXT PRIMARY KEY,
      company_id      TEXT NOT NULL,
      valore_mp       REAL DEFAULT 0,
      valore_wip      REAL DEFAULT 0,
      valore_fg       REAL DEFAULT 0,
      giorni_copertura INTEGER DEFAULT 0,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analysis_reports (
      id              TEXT PRIMARY KEY,
      company_id      TEXT NOT NULL,
      periodo         TEXT NOT NULL,
      kpis            TEXT NOT NULL,
      problems        TEXT NOT NULL,
      recommendations TEXT NOT NULL,
      score           INTEGER DEFAULT 0,
      score_label     TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  // Migrate: add sector column if not yet present (English value for engine dispatch)
  try { db.exec(`ALTER TABLE companies ADD COLUMN sector TEXT DEFAULT 'manufacturing'`) } catch {}

  console.log(`✅ Database inizializzato: ${dbPath}`);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database non inizializzato. Chiama initDatabase() prima.');
  return db;
}

module.exports = { initDatabase, getDb };
