const BASE = '/api';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || `Errore HTTP ${res.status}`);
  return data;
}

export const api = {
  // Company
  setupCompany:  (payload)     => request('POST', '/company/setup', payload),
  getCompany:    (id)          => request('GET',  `/company/data/${id}`),
  listCompanies: ()            => request('GET',  '/company/list'),
  deleteCompany: (id)          => request('DELETE', `/company/${id}`),

  // Analysis
  runAnalysis:   (company_id)  => request('POST', '/analysis/run', { company_id }),
  getReport:     (company_id)  => request('GET',  `/analysis/report/${company_id}`),
  getHistory:    (company_id)  => request('GET',  `/analysis/history/${company_id}`),

  // Health
  health:        ()            => request('GET',  '/health')
};
