require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database/init');
const companyRoutes = require('./routes/company');
const analysisRoutes = require('./routes/analysis');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Init DB
initDatabase();

// Routes
app.use('/api/company', companyRoutes);
app.use('/api/analysis', analysisRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint ${req.path} non trovato` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Errore interno del server', details: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Virtual Chief Financial Officer Backend avviato su http://localhost:${PORT}`);
  console.log(`📊 Endpoints disponibili:`);
  console.log(`   POST /api/company/setup`);
  console.log(`   GET  /api/company/data/:id`);
  console.log(`   GET  /api/company/list`);
  console.log(`   POST /api/analysis/run`);
  console.log(`   GET  /api/analysis/report/:company_id`);
  console.log(`   GET  /api/analysis/history/:company_id\n`);
});
