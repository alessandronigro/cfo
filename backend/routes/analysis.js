const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/init');
const { runCFOAnalysis } = require('../engine/cfoEngine');

// POST /api/analysis/run — Esegui analisi CFO completa
router.post('/run', (req, res) => {
  try {
    const db = getDb();
    const { company_id } = req.body;

    if (!company_id) return res.status(400).json({ error: 'company_id richiesto' });

    // Carica azienda (per settore) e dati più recenti
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(company_id);

    const fin = db.prepare(
      'SELECT * FROM financials WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(company_id);

    if (!fin) return res.status(404).json({ error: 'Nessun dato finanziario trovato. Completa prima il questionario.' });

    const prod = db.prepare(
      'SELECT * FROM production WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(company_id);

    const inv = db.prepare(
      'SELECT * FROM inventory WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(company_id);

    const sector = company?.sector || 'manufacturing';

    // Prepara dati per il motore CFO
    const inputData = {
      sector,
      fatturato_annuo:    fin.fatturato_annuo,
      costi_fissi_annui:  fin.costi_fissi_annui,
      costo_mp:           fin.costo_mp,
      costo_manodopera:   fin.costo_manodopera,
      altri_costi_var:    fin.altri_costi_var || 0,
      crediti_clienti:    fin.crediti_clienti || 0,
      debiti_fornitori:   fin.debiti_fornitori || 0,
      unita_prodotte:     prod?.unita_prodotte || 0,
      prezzo_medio:       prod?.prezzo_medio_vendita || 0,
      capacita_max:       prod?.capacita_max || 0,
      valore_magazzino:   (inv?.valore_mp || 0) + (inv?.valore_wip || 0) + (inv?.valore_fg || 0),
      // Service-specific (mapped from production table)
      employees:          company?.dipendenti || 0,
      billable_hours:     prod?.tempo_ciclo_ore || 0,
      total_hours:        prod?.capacita_max || 0,
      clients:            prod?.unita_prodotte || 0,
    };

    // Esegui analisi
    const analysis = runCFOAnalysis(inputData);

    // Salva report
    const reportId = uuidv4();
    const periodo = new Date().toISOString().slice(0, 7);

    db.prepare(`
      INSERT INTO analysis_reports (id, company_id, periodo, kpis, problems, recommendations, score, score_label)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId, company_id, periodo,
      JSON.stringify(analysis.kpis),
      JSON.stringify(analysis.problems),
      JSON.stringify(analysis.recommendations),
      analysis.score,
      analysis.score_label
    );

    res.json({
      success: true,
      report_id: reportId,
      analysis
    });

  } catch (err) {
    console.error('[analysis/run]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analysis/report/:company_id — Ultimo report disponibile
router.get('/report/:company_id', (req, res) => {
  try {
    const db = getDb();
    const report = db.prepare(
      'SELECT * FROM analysis_reports WHERE company_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(req.params.company_id);

    if (!report) return res.status(404).json({ error: 'Nessun report trovato' });

    res.json({
      ...report,
      kpis:            JSON.parse(report.kpis),
      problems:        JSON.parse(report.problems),
      recommendations: JSON.parse(report.recommendations)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analysis/history/:company_id — Storico report (ultimi 12)
router.get('/history/:company_id', (req, res) => {
  try {
    const db = getDb();
    const reports = db.prepare(
      'SELECT id, periodo, score, score_label, created_at FROM analysis_reports WHERE company_id = ? ORDER BY created_at DESC LIMIT 12'
    ).all(req.params.company_id);

    res.json(reports);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
