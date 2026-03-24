const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/init');

// POST /api/company/setup — Crea azienda con tutti i dati
router.post('/setup', (req, res) => {
  try {
    const db = getDb();
    const { company, financials, production, inventory } = req.body;

    if (!company?.nome) return res.status(400).json({ error: 'Nome azienda obbligatorio' });
    if (!financials?.fatturato_annuo) return res.status(400).json({ error: 'Fatturato annuo obbligatorio' });

    const now = new Date().toISOString();
    const periodo = now.slice(0, 7); // YYYY-MM

    // Crea o aggiorna azienda
    let companyId = company.id;
    if (companyId) {
      db.prepare(`
        UPDATE companies
        SET nome=?, settore=?, sector=?, anno_fond=?, dipendenti=?, note=?, updated_at=?
        WHERE id=?
      `).run(
        company.nome, company.settore || 'Manifatturiero',
        company.sector || 'manufacturing',
        company.anno_fond || null, company.dipendenti || 0,
        company.note || null, now, companyId
      );
    } else {
      companyId = uuidv4();
      db.prepare(`
        INSERT INTO companies (id, nome, settore, sector, anno_fond, dipendenti, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        companyId, company.nome,
        company.settore || 'Manifatturiero',
        company.sector || 'manufacturing',
        company.anno_fond || null,
        company.dipendenti || 0,
        company.note || null
      );
    }

    // Inserisci dati finanziari
    db.prepare(`
      INSERT INTO financials
        (id, company_id, periodo, fatturato_annuo, costi_fissi_annui, costo_mp,
         costo_manodopera, altri_costi_var, crediti_clienti, debiti_fornitori)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), companyId, periodo,
      financials.fatturato_annuo,
      financials.costi_fissi_annui || 0,
      financials.costo_mp || 0,
      financials.costo_manodopera || 0,
      financials.altri_costi_var || 0,
      financials.crediti_clienti || 0,
      financials.debiti_fornitori || 0
    );

    // Inserisci dati produzione
    if (production) {
      db.prepare(`
        INSERT INTO production
          (id, company_id, periodo, unita_prodotte, prezzo_medio_vendita, tempo_ciclo_ore, capacita_max)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), companyId, periodo,
        production.unita_prodotte || 0,
        production.prezzo_medio_vendita || 0,
        production.tempo_ciclo_ore || 0,
        production.capacita_max || 0
      );
    }

    // Inserisci magazzino
    if (inventory) {
      db.prepare(`
        INSERT INTO inventory
          (id, company_id, valore_mp, valore_wip, valore_fg, giorni_copertura)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), companyId,
        inventory.valore_mp || 0,
        inventory.valore_wip || 0,
        inventory.valore_fg || 0,
        inventory.giorni_copertura || 0
      );
    }

    res.status(201).json({
      success: true,
      company_id: companyId,
      message: `Dati di ${company.nome} salvati con successo`
    });

  } catch (err) {
    console.error('[company/setup]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/company/data/:id — Recupera tutti i dati dell'azienda
router.get('/data/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
    if (!company) return res.status(404).json({ error: 'Azienda non trovata' });

    const financials = db.prepare(
      'SELECT * FROM financials WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(id);

    const production = db.prepare(
      'SELECT * FROM production WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(id);

    const inventory = db.prepare(
      'SELECT * FROM inventory WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(id);

    res.json({ company, financials: financials || null, production: production || null, inventory: inventory || null });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/company/list — Lista tutte le aziende
router.get('/list', (req, res) => {
  try {
    const db = getDb();
    const companies = db.prepare(
      'SELECT c.*, (SELECT score FROM analysis_reports WHERE company_id = c.id ORDER BY created_at DESC LIMIT 1) as last_score FROM companies c ORDER BY c.updated_at DESC'
    ).all();
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/company/:id — Elimina azienda
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
