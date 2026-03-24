/**
 * CFO ENGINE — Motore di analisi finanziaria per aziende manifatturiere
 * Calcola KPI, identifica problemi, genera raccomandazioni concrete.
 */

// ─────────────────────────────────────────────
// CALCOLO KPI
// ─────────────────────────────────────────────
function calculateKPIs(d) {
  const fatturato      = d.fatturato_annuo    || 0;
  const costiFixi      = d.costi_fissi_annui  || 0;
  const costoMP        = d.costo_mp           || 0;
  const costoMDO       = d.costo_manodopera   || 0;
  const altriVar       = d.altri_costi_var    || 0;
  const crediti        = d.crediti_clienti    || 0;
  const debiti         = d.debiti_fornitori   || 0;
  const unitaProd      = d.unita_prodotte     || 0;
  const prezzoMedio    = d.prezzo_medio       || 0;
  const magazzino      = d.valore_magazzino   || 0;

  // Totale costi variabili (COGS)
  const costiVar = costoMP + costoMDO + altriVar;

  // ── Margine Lordo ──────────────────────────
  const margineLordo    = fatturato - costiVar;
  const margineLordoPct = fatturato > 0 ? (margineLordo / fatturato) * 100 : 0;

  // ── Margine Netto (EBIT) ───────────────────
  const margineNetto    = margineLordo - costiFixi;
  const margineNettoPct = fatturato > 0 ? (margineNetto / fatturato) * 100 : 0;

  // ── Break-even ────────────────────────────
  const tassoCV           = fatturato > 0 ? costiVar / fatturato : 0;
  const margineContribPct = 1 - tassoCV;
  const breakEven         = margineContribPct > 0 ? costiFixi / margineContribPct : 0;
  const breakEvenPct      = fatturato > 0 ? (breakEven / fatturato) * 100 : 0;

  // ── Costo Unitario ────────────────────────
  const costoUnitario = unitaProd > 0
    ? (costiVar + costiFixi) / unitaProd
    : null;

  const prezzoUnitEff = prezzoMedio > 0 ? prezzoMedio
    : (unitaProd > 0 ? fatturato / unitaProd : null);

  const margineContribUnit = (costoUnitario !== null && prezzoUnitEff !== null && unitaProd > 0)
    ? prezzoUnitEff - (costiVar / unitaProd)
    : null;

  // ── Rotazione Magazzino ───────────────────
  const rotazioneMag    = magazzino > 0 ? costiVar / magazzino : null;
  const giorniMagazzino = rotazioneMag > 0 ? Math.round(365 / rotazioneMag) : null;

  // ── DSO / DPO / CCC ──────────────────────
  const dso = (crediti > 0 && fatturato > 0) ? (crediti / fatturato) * 365 : 0;
  const dpo = (debiti > 0 && costiVar > 0)   ? (debiti / costiVar)   * 365 : 0;
  const ccc = (giorniMagazzino || 0) + dso - dpo;

  // ── Leva Operativa ────────────────────────
  const levaOperativa = margineNetto !== 0 ? margineLordo / margineNetto : null;

  // ── Incidenze ─────────────────────────────
  const incidenzaFixi = fatturato > 0 ? (costiFixi / fatturato) * 100 : 0;
  const incidenzaMP   = fatturato > 0 ? (costoMP   / fatturato) * 100 : 0;
  const incidenzaMDO  = fatturato > 0 ? (costoMDO  / fatturato) * 100 : 0;

  // ── Utilizzo capacità ─────────────────────
  const utilizzoCapacita = (d.capacita_max > 0 && unitaProd > 0)
    ? (unitaProd / d.capacita_max) * 100 : null;

  return {
    // Margini
    margine_lordo:          round(margineLordo),
    margine_lordo_pct:      pct(margineLordoPct),
    margine_netto:          round(margineNetto),
    margine_netto_pct:      pct(margineNettoPct),
    // Break-even
    break_even:             round(breakEven),
    break_even_pct:         pct(breakEvenPct),
    // Costi
    costi_variabili:        round(costiVar),
    margine_contrib_pct:    pct(margineContribPct * 100),
    incidenza_costi_fissi:  pct(incidenzaFixi),
    incidenza_mp:           pct(incidenzaMP),
    incidenza_mdo:          pct(incidenzaMDO),
    // Produzione
    costo_unitario:         costoUnitario ? dec2(costoUnitario) : null,
    prezzo_unitario:        prezzoUnitEff ? dec2(prezzoUnitEff) : null,
    margine_contrib_unit:   margineContribUnit ? dec2(margineContribUnit) : null,
    utilizzo_capacita:      utilizzoCapacita ? pct(utilizzoCapacita) : null,
    // Magazzino
    rotazione_magazzino:    rotazioneMag ? dec2(rotazioneMag) : null,
    giorni_magazzino:       giorniMagazzino,
    // Liquidità
    dso:                    dec1(dso),
    dpo:                    dec1(dpo),
    ccc:                    dec1(ccc),
    leva_operativa:         levaOperativa ? dec2(levaOperativa) : null
  };
}

// ─────────────────────────────────────────────
// IDENTIFICAZIONE PROBLEMI
// ─────────────────────────────────────────────
function identifyProblems(d, kpis) {
  const problems = [];

  // 1. Margine lordo
  if (kpis.margine_lordo_pct < 20) {
    problems.push(problem('low_gross_margin', 'critical', 'Marginalità',
      'Margine lordo critico',
      `${kpis.margine_lordo_pct}% — stai vendendo quasi al costo. Le materie prime e la manodopera mangiano quasi tutto.`,
      '≥ 30%', `${kpis.margine_lordo_pct}%`
    ));
  } else if (kpis.margine_lordo_pct < 30) {
    problems.push(problem('med_gross_margin', 'warning', 'Marginalità',
      'Margine lordo sotto la soglia target',
      `${kpis.margine_lordo_pct}% è insufficiente. Difficile coprire i costi fissi e generare profitto.`,
      '≥ 30%', `${kpis.margine_lordo_pct}%`
    ));
  }

  // 2. Margine netto
  if (kpis.margine_netto < 0) {
    problems.push(problem('negative_net', 'critical', 'Redditività',
      '⚠ L\'azienda è in perdita',
      `Margine netto ${kpis.margine_netto_pct}%. Stai bruciando cassa ogni mese. Intervento immediato necessario.`,
      '> 0%', `${kpis.margine_netto_pct}%`
    ));
  } else if (kpis.margine_netto_pct < 5) {
    problems.push(problem('low_net_margin', 'critical', 'Redditività',
      'Margine netto troppo basso',
      `Solo il ${kpis.margine_netto_pct}% di profitto sul fatturato. Zero buffer per imprevisti o investimenti.`,
      '≥ 5%', `${kpis.margine_netto_pct}%`
    ));
  }

  // 3. Break-even
  if (kpis.break_even_pct > 90) {
    problems.push(problem('critical_breakeven', 'critical', 'Rischio Operativo',
      'Break-even pericolosamente vicino al fatturato',
      `Devi fare il ${kpis.break_even_pct}% del tuo fatturato solo per non perdere soldi. Vulnerabilità massima.`,
      '< 75%', `${kpis.break_even_pct}%`
    ));
  } else if (kpis.break_even_pct > 75) {
    problems.push(problem('high_breakeven', 'warning', 'Rischio Operativo',
      'Margine di sicurezza insufficiente',
      `Break-even all'${kpis.break_even_pct}% del fatturato. Un calo delle vendite del 25% ti porta in perdita.`,
      '< 75%', `${kpis.break_even_pct}%`
    ));
  }

  // 4. Magazzino
  if (kpis.rotazione_magazzino !== null) {
    if (kpis.rotazione_magazzino < 2) {
      problems.push(problem('dead_stock', 'critical', 'Magazzino',
        'Magazzino quasi fermo: capitale immobilizzato',
        `Rotazione ${kpis.rotazione_magazzino}x/anno (${kpis.giorni_magazzino} giorni). Soldi bloccati, rischio obsolescenza alto.`,
        '≥ 6x/anno', `${kpis.rotazione_magazzino}x/anno`
      ));
    } else if (kpis.rotazione_magazzino < 4) {
      problems.push(problem('slow_stock', 'warning', 'Magazzino',
        'Stock in rotazione lenta',
        `Rotazione ${kpis.rotazione_magazzino}x/anno (${kpis.giorni_magazzino} giorni). Scorte eccessive rispetto alla produzione.`,
        '≥ 6x/anno', `${kpis.rotazione_magazzino}x/anno`
      ));
    }
  }

  // 5. DSO — crediti clienti
  if (kpis.dso > 90) {
    problems.push(problem('critical_dso', 'critical', 'Crediti Clienti',
      'Incassi gravemente in ritardo',
      `I clienti pagano in media dopo ${kpis.dso} giorni. Stai finanziando i tuoi clienti. Rischio insolvenza alto.`,
      '≤ 45 giorni', `${kpis.dso} giorni`
    ));
  } else if (kpis.dso > 60) {
    problems.push(problem('high_dso', 'warning', 'Crediti Clienti',
      'Tempi di incasso lunghi',
      `DSO a ${kpis.dso} giorni. Tensione sulla liquidità quotidiana. I clienti pagano troppo tardi.`,
      '≤ 45 giorni', `${kpis.dso} giorni`
    ));
  }

  // 6. Costi fissi pesanti
  if (kpis.incidenza_costi_fissi > 45) {
    problems.push(problem('heavy_fixed', 'critical', 'Struttura Costi',
      'Struttura fissa eccessivamente pesante',
      `Costi fissi al ${kpis.incidenza_costi_fissi}% del fatturato. Ogni calo delle vendite si trasforma in perdita rapida.`,
      '< 35%', `${kpis.incidenza_costi_fissi}%`
    ));
  } else if (kpis.incidenza_costi_fissi > 35) {
    problems.push(problem('high_fixed', 'warning', 'Struttura Costi',
      'Costi fissi da ottimizzare',
      `Il ${kpis.incidenza_costi_fissi}% del fatturato in costi fissi lascia poco spazio di manovra.`,
      '< 35%', `${kpis.incidenza_costi_fissi}%`
    ));
  }

  // 7. Materie prime
  if (kpis.incidenza_mp > 45) {
    problems.push(problem('high_mp', 'warning', 'Costi Produzione',
      'Costo materie prime fuori controllo',
      `Le MP incidono per il ${kpis.incidenza_mp}% sul fatturato. Revisione fornitori o mix produttivo necessaria.`,
      '< 40%', `${kpis.incidenza_mp}%`
    ));
  }

  // 8. Utilizzo capacità produttiva basso
  if (kpis.utilizzo_capacita !== null && kpis.utilizzo_capacita < 60) {
    problems.push(problem('low_capacity', 'warning', 'Efficienza Produttiva',
      'Capacità produttiva sottoutilizzata',
      `Stai usando solo il ${kpis.utilizzo_capacita}% della capacità disponibile. I costi fissi pesano di più per unità prodotta.`,
      '≥ 75%', `${kpis.utilizzo_capacita}%`
    ));
  }

  return problems;
}

// ─────────────────────────────────────────────
// GENERAZIONE RACCOMANDAZIONI
// ─────────────────────────────────────────────
function generateRecommendations(d, kpis, problems) {
  const actions = { immediate: [], short_term: [], medium_term: [] };
  const ids = problems.map(p => p.id);

  // ── AZIONI IMMEDIATE (0-30 giorni) ─────────
  if (ids.includes('negative_net') || ids.includes('low_net_margin')) {
    action(actions.immediate, 1,
      '🚨 Blocca i costi non essenziali subito',
      'Fai una lista di ogni spesa ricorrente. Sospendi quelle non critiche per la produzione. Telefona a fornitori e rinegozia. Ogni giorno in perdita è peggio del giorno dopo.',
      `Risparmio stimato: €${fmt(d.costi_fissi_annui * 0.08)}/anno`
    );
  }

  if (ids.includes('critical_dso') || ids.includes('high_dso')) {
    action(actions.immediate, 1,
      '📞 Campagna incassi urgente',
      `Ordina i clienti per scaduto più alto. Chiama i primi 10. Offri sconto 1.5% per pagamento entro 15 giorni. Non delegare questa attività.`,
      `Liquidità attesa: €${fmt((d.crediti_clienti || 0) * 0.25)}`
    );
  }

  if (ids.includes('low_gross_margin') || ids.includes('med_gross_margin')) {
    action(actions.immediate, 1,
      '📋 Analisi ABC fornitori materie prime',
      'Identifica le top 5 voci di costo MP. Per ognuna chiedi preventivo ad almeno 2 fornitori alternativi entro 2 settimane. Non aspettare il contratto in scadenza.',
      `Risparmio MP stimato: €${fmt((d.costo_mp || 0) * 0.10)}/anno`
    );
  }

  if (ids.includes('dead_stock') || ids.includes('slow_stock')) {
    action(actions.immediate, 2,
      '🏭 Audit magazzino — classifica e liquida',
      'Dividi tutto il magazzino in A (ruota spesso), B (lento), C (fermo > 90 giorni). Metti in promozione o a prezzo di costo tutto lo stock C. Meglio recuperare liquidità che svalutare.',
      `Liquidità liberabile: €${fmt((d.valore_magazzino || 0) * 0.25)}`
    );
  }

  if (ids.includes('low_capacity')) {
    action(actions.immediate, 2,
      '📈 Azione commerciale per riempire la capacità',
      'Con il ${kpis.utilizzo_capacita}% di utilizzo, ogni unità aggiuntiva prodotta ha costo marginale molto basso. Valuta promozioni, prezzi spot o nuovi canali per riempire la capacità inutilizzata.',
      `Potenziale ricavo addizionale stimato: €${fmt(d.fatturato_annuo * 0.15)}/anno`
    );
  }

  // ── BREVE TERMINE (30-90 giorni) ──────────
  if (ids.includes('low_gross_margin') || ids.includes('med_gross_margin')) {
    action(actions.short_term, 1,
      '💰 Revisione pricing — alza i prezzi dove puoi',
      'Analizza ogni linea di prodotto: quale ha meno concorrenza? Quale il cliente non sostituirebbe facilmente? Lì hai spazio per +5-10%. Non serve alzare tutto, bastano i prodotti giusti.',
      `Aumento fatturato: €${fmt(d.fatturato_annuo * 0.06)}/anno`
    );
  }

  if (ids.includes('high_dso') || ids.includes('critical_dso')) {
    action(actions.short_term, 1,
      '📄 Nuove condizioni di pagamento clienti',
      'Da oggi: nuovi clienti massimo 30 giorni. Clienti esistenti: rinegozia a 45 giorni entro il prossimo contratto. Per scaduti > 90 giorni valuta factoring o legale.',
      `Miglioramento DSO: -15 giorni → +€${fmt((d.crediti_clienti || 0) * 0.20)} liquidità`
    );
  }

  if (ids.includes('heavy_fixed') || ids.includes('high_fixed')) {
    action(actions.short_term, 1,
      '🔍 Analisi chirurgica costi fissi voce per voce',
      'Lista ogni costo fisso con importo annuo. Per ognuno rispondi: è indispensabile? Si può ridurre? Si può rendere variabile? Obiettivo: -10% della struttura fissa.',
      `Target risparmio: €${fmt((d.costi_fissi_annui || 0) * 0.10)}/anno`
    );
  }

  if (ids.includes('slow_stock') || ids.includes('dead_stock')) {
    action(actions.short_term, 2,
      '⚡ Just-in-time: riduci i lotti di acquisto',
      'Calcola le scorte minime reali per ogni materia prima. Ordina il 30-40% in meno ma più frequentemente. Coordina con i fornitori per consegne più frequenti.',
      `Riduzione magazzino: €${fmt((d.valore_magazzino || 0) * 0.30)}`
    );
  }

  if (ids.includes('high_mp')) {
    action(actions.short_term, 2,
      '🔄 Gara fornitori su top 3 voci di costo MP',
      'Per le materie prime più costose lancia una gara formale. Almeno 3 offerte per voce. Consolida gli ordini dove possibile per avere più potere negoziale.',
      `Risparmio stimato: €${fmt((d.costo_mp || 0) * 0.12)}/anno`
    );
  }

  // ── MEDIO TERMINE (3-12 mesi) ──────────────
  action(actions.medium_term, 1,
    '📊 Dashboard CFO mensile — smetti di volare alla cieca',
    'Implementa un report mensile con: P&L effettivo vs budget, cash flow a 90 giorni, KPI produttivi, margini per linea. Chi non misura non può migliorare.',
    'Riduzione sprechi stimata: 8-15% annuo grazie a decisioni data-driven'
  );

  action(actions.medium_term, 2,
    '🎯 Analisi mix produttivo — taglia i prodotti in perdita',
    'Calcola il margine di contribuzione per ogni prodotto o linea. Elimina o riduci quelli sotto il 15% di margine. Concentra la capacità sui più profittevoli.',
    `Ottimizzazione margine: +€${fmt(d.fatturato_annuo * 0.04)}/anno stimato`
  );

  action(actions.medium_term, 3,
    '🤖 Valuta automazione processi ad alta intensità di manodopera',
    'Identifica le fasi produttive con più ore/uomo. Calcola il ROI di automazione. Con i costi attuali, molti impianti si ripagano in 2-3 anni.',
    `Risparmio MOD stimato: €${fmt((d.costo_manodopera || 0) * 0.20)}/anno`
  );

  action(actions.medium_term, 3,
    '📦 Rinegozia condizioni logistica e approvvigionamenti',
    'Centralizza gli acquisti, aumenta il potere contrattuale. Valuta accordi pluriennali con fornitori strategici in cambio di sconti quantità.',
    `Risparmio stimato: €${fmt(d.fatturato_annuo * 0.02)}/anno`
  );

  return actions;
}

// ─────────────────────────────────────────────
// SCORE SALUTE AZIENDALE
// ─────────────────────────────────────────────
function calculateScore(kpis, problems) {
  let score = 100;
  for (const p of problems) {
    score -= p.severity === 'critical' ? 20 : 10;
  }
  if (kpis.margine_lordo_pct > 40) score += 5;
  if (kpis.margine_netto_pct > 10)  score += 5;
  if (kpis.rotazione_magazzino > 6) score += 3;
  if (kpis.dso < 30)                score += 3;
  return Math.max(0, Math.min(100, score));
}

function scoreLabel(score) {
  if (score >= 80) return { label: 'Eccellente',           color: '#22c55e' };
  if (score >= 65) return { label: 'Buono',                color: '#3b82f6' };
  if (score >= 50) return { label: 'Da migliorare',        color: '#f59e0b' };
  if (score >= 30) return { label: 'Critico',              color: '#ef4444' };
  return              { label: 'Emergenza finanziaria', color: '#991b1b' };
}

function savingsPotential(d, problems) {
  let total = 0;
  const ids = problems.map(p => p.id);
  if (ids.some(i => ['low_gross_margin','med_gross_margin'].includes(i))) {
    total += (d.costo_mp || 0) * 0.10 + d.fatturato_annuo * 0.05;
  }
  if (ids.some(i => ['critical_dso','high_dso'].includes(i))) total += (d.crediti_clienti || 0) * 0.25;
  if (ids.some(i => ['dead_stock','slow_stock'].includes(i)))  total += (d.valore_magazzino || 0) * 0.25;
  if (ids.some(i => ['heavy_fixed','high_fixed'].includes(i))) total += (d.costi_fissi_annui || 0) * 0.10;
  return Math.round(total);
}

// ─────────────────────────────────────────────
// MANUFACTURING ENTRY POINT (original logic)
// ─────────────────────────────────────────────
function runManufacturingAnalysis(data) {
  const kpis            = calculateKPIs(data);
  const problems        = identifyProblems(data, kpis);
  const recommendations = generateRecommendations(data, kpis, problems);
  const score           = calculateScore(kpis, problems);
  const sl              = scoreLabel(score);

  return {
    kpis,
    problems,
    recommendations,
    score,
    score_label: sl.label,
    score_color: sl.color,
    summary: {
      total_problems:      problems.length,
      critical:            problems.filter(p => p.severity === 'critical').length,
      warnings:            problems.filter(p => p.severity === 'warning').length,
      immediate_actions:   recommendations.immediate.length,
      savings_potential:   savingsPotential(data, problems)
    },
    generated_at: new Date().toISOString()
  };
}

// ─────────────────────────────────────────────
// SERVICES — KPI
// ─────────────────────────────────────────────
function calculateServiceKPIs(d) {
  const revenue       = d.fatturato_annuo   || 0;
  const costsFixed    = d.costi_fissi_annui || 0;
  const costsVariable = d.costo_mp          || 0; // stored as costo_mp for services
  const employees     = d.employees         || 0;
  const billable      = d.billable_hours     || 0;
  const total         = d.total_hours        || 0;
  const clients       = d.clients            || 0;

  const grossMarginVal = revenue - costsVariable;
  const netMarginVal   = grossMarginVal - costsFixed;
  const grossMarginPct = revenue > 0 ? (grossMarginVal / revenue) * 100 : 0;
  const netMarginPct   = revenue > 0 ? (netMarginVal   / revenue) * 100 : 0;

  const tassoCV           = revenue > 0 ? costsVariable / revenue : 0;
  const margineContribPct = 1 - tassoCV;
  const breakEven         = margineContribPct > 0 ? costsFixed / margineContribPct : 0;
  const breakEvenPct      = revenue > 0 ? (breakEven / revenue) * 100 : 0;
  const incidenzaFixi     = revenue > 0 ? (costsFixed / revenue) * 100 : 0;

  return {
    // Service-specific
    gross_margin:           pct(grossMarginPct),
    net_margin:             pct(netMarginPct),
    revenue_per_employee:   employees > 0 ? round(revenue / employees) : null,
    utilization_rate:       total > 0 ? pct((billable / total) * 100) : null,
    revenue_per_client:     clients > 0 ? round(revenue / clients) : null,
    // Shared (used by score + dashboard compatibility)
    margine_lordo:          round(grossMarginVal),
    margine_lordo_pct:      pct(grossMarginPct),
    margine_netto:          round(netMarginVal),
    margine_netto_pct:      pct(netMarginPct),
    break_even:             round(breakEven),
    break_even_pct:         pct(breakEvenPct),
    margine_contrib_pct:    pct(margineContribPct * 100),
    incidenza_costi_fissi:  pct(incidenzaFixi),
    // Nulls for manufacturing-only KPIs
    rotazione_magazzino: null, giorni_magazzino: null,
    dso: 0, dpo: 0, ccc: 0, leva_operativa: null, utilizzo_capacita: null,
  };
}

// ─────────────────────────────────────────────
// SERVICES — PROBLEMS
// ─────────────────────────────────────────────
function identifyServiceProblems(d, kpis) {
  const problems = [];

  if (kpis.utilization_rate !== null && kpis.utilization_rate < 60) {
    problems.push(problem('low_utilization', 'critical', 'Efficienza',
      'Tasso di utilizzo basso',
      `Solo il ${kpis.utilization_rate}% delle ore è fatturabile. Capacità e costi sprecati.`,
      '≥ 60%', `${kpis.utilization_rate}%`
    ));
  } else if (kpis.utilization_rate !== null && kpis.utilization_rate < 75) {
    problems.push(problem('med_utilization', 'warning', 'Efficienza',
      'Tasso di utilizzo migliorabile',
      `Il ${kpis.utilization_rate}% di utilizzo lascia margine di crescita senza costi aggiuntivi.`,
      '≥ 75%', `${kpis.utilization_rate}%`
    ));
  }

  if (kpis.net_margin < 0) {
    problems.push(problem('negative_net', 'critical', 'Redditività',
      'L\'azienda è in perdita',
      `Margine netto ${kpis.net_margin}%. I costi superano i ricavi. Intervento immediato necessario.`,
      '> 0%', `${kpis.net_margin}%`
    ));
  } else if (kpis.gross_margin < 20) {
    problems.push(problem('low_gross_margin', 'critical', 'Marginalità',
      'Margine lordo critico',
      `${kpis.gross_margin}% — i costi variabili consumano quasi tutto il fatturato.`,
      '≥ 20%', `${kpis.gross_margin}%`
    ));
  }

  if (kpis.revenue_per_employee !== null && kpis.revenue_per_employee < 50000) {
    problems.push(problem('low_rev_per_emp', 'warning', 'Produttività',
      'Fatturato per dipendente basso',
      `€${fmt(kpis.revenue_per_employee)}/dipendente. Rivedi la struttura organizzativa o i prezzi.`,
      '≥ €50.000', `€${fmt(kpis.revenue_per_employee)}`
    ));
  }

  if (d.clients !== null && d.clients > 0 && d.clients < 3) {
    problems.push(problem('client_concentration', 'critical', 'Rischio Cliente',
      'Concentrazione clienti pericolosa',
      `Solo ${d.clients} client${d.clients === 1 ? 'e' : 'i'}. La perdita di uno mette a rischio l\'intera azienda.`,
      '≥ 5 clienti', `${d.clients} client${d.clients === 1 ? 'e' : 'i'}`
    ));
  }

  return problems;
}

// ─────────────────────────────────────────────
// SERVICES — RECOMMENDATIONS
// ─────────────────────────────────────────────
function generateServiceRecommendations(d, kpis, problems) {
  const actions = { immediate: [], short_term: [], medium_term: [] };
  const ids = problems.map(p => p.id);

  if (ids.includes('low_utilization')) {
    action(actions.immediate, 1,
      '📅 Ottimizza la pianificazione delle ore',
      'Analizza le ore non fatturabili: riunioni eccessive, attività amministrative, attese. Riduci quelle non essenziali e trasforma più tempo in ore fatturabili.',
      `Potenziale aggiuntivo: €${fmt((d.fatturato_annuo || 0) * 0.15)}/anno`
    );
  }

  if (ids.includes('client_concentration')) {
    action(actions.immediate, 1,
      '🎯 Diversifica la base clienti',
      'Avvia azioni commerciali per acquisire nuovi clienti. Con pochi clienti, la perdita di uno è una crisi. Obiettivo minimo: 5 clienti attivi entro 90 giorni.',
      'Riduzione rischio concentrazione'
    );
  }

  if (ids.includes('negative_net') || ids.includes('low_gross_margin')) {
    action(actions.immediate, 1,
      '💰 Rivedi i prezzi dei servizi',
      'Calcola il costo reale per ora/servizio erogato. Se stai vendendo sotto costo, aumenta i prezzi del 10-15% o elimina le attività meno redditizie.',
      `Risparmio stimato: €${fmt((d.costi_fissi_annui || 0) * 0.10)}/anno`
    );
  }

  if (ids.includes('low_rev_per_emp')) {
    action(actions.short_term, 1,
      '📈 Aumenta il valore per dipendente',
      'Forma il team su attività ad alto valore. Automatizza compiti ripetitivi. Aumenta i prezzi per servizi specializzati dove hai meno concorrenza.',
      `Target: €${fmt((kpis.revenue_per_employee || 0) * 1.2)}/dipendente`
    );
  }

  if (ids.includes('med_utilization')) {
    action(actions.short_term, 2,
      '⚡ Piano di miglioramento utilizzo risorse',
      'Identifica le fasce orarie a bassa produttività. Pianifica i progetti per riempire i buchi. Ogni punto percentuale di utilizzo in più si traduce direttamente in margine.',
      `Potenziale: €${fmt((d.fatturato_annuo || 0) * 0.05)}/anno`
    );
  }

  action(actions.medium_term, 1,
    '📊 Implementa il tracciamento ore per risorsa',
    'Monitora le ore fatturabili vs non fatturabili per ogni persona. Identifica dove si perde produttività. Chi non misura non può migliorare.',
    'Miglioramento utilizzo stimato: +5-10% annuo'
  );

  action(actions.medium_term, 2,
    '🔄 Sviluppa contratti ricorrenti e abbonamenti',
    'I contratti ricorrenti garantiscono stabilità dei ricavi. Trasforma i progetti one-shot in relazioni continuative con pacchetti mensili o annuali.',
    `Stabilizzazione ricavi: riduzione volatilità del 30-40%`
  );

  return actions;
}

function calculateServiceScore(kpis, problems) {
  let score = 100;
  for (const p of problems) score -= p.severity === 'critical' ? 20 : 10;
  if (kpis.gross_margin > 40)       score += 5;
  if (kpis.net_margin > 10)         score += 5;
  if (kpis.utilization_rate > 80)   score += 3;
  return Math.max(0, Math.min(100, score));
}

function savingsPotentialService(d, problems) {
  let total = 0;
  const ids = problems.map(p => p.id);
  if (ids.some(i => ['low_gross_margin', 'negative_net'].includes(i))) total += (d.fatturato_annuo || 0) * 0.05;
  if (ids.includes('low_utilization'))  total += (d.fatturato_annuo || 0) * 0.10;
  if (ids.includes('low_rev_per_emp'))  total += (d.fatturato_annuo || 0) * 0.05;
  return Math.round(total);
}

function runServiceAnalysis(data) {
  const kpis            = calculateServiceKPIs(data);
  const problems        = identifyServiceProblems(data, kpis);
  const recommendations = generateServiceRecommendations(data, kpis, problems);
  const score           = calculateServiceScore(kpis, problems);
  const sl              = scoreLabel(score);

  return {
    kpis,
    problems,
    recommendations,
    score,
    score_label: sl.label,
    score_color: sl.color,
    summary: {
      total_problems:    problems.length,
      critical:          problems.filter(p => p.severity === 'critical').length,
      warnings:          problems.filter(p => p.severity === 'warning').length,
      immediate_actions: recommendations.immediate.length,
      savings_potential: savingsPotentialService(data, problems)
    },
    generated_at: new Date().toISOString()
  };
}

// ─────────────────────────────────────────────
// COMMERCE — STUB
// ─────────────────────────────────────────────
function runCommerceAnalysis(data) {
  // Minimal stub: reuse manufacturing logic until commerce-specific rules are built
  return runManufacturingAnalysis(data);
}

// ─────────────────────────────────────────────
// MAIN DISPATCHER
// ─────────────────────────────────────────────
function runCFOAnalysis(data) {
  switch (data.sector) {
    case 'services': return runServiceAnalysis(data);
    case 'commerce': return runCommerceAnalysis(data);
    default:         return runManufacturingAnalysis(data);
  }
}

// ─────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────
const round  = v => Math.round(v);
const pct    = v => parseFloat(v.toFixed(2));
const dec1   = v => parseFloat(v.toFixed(1));
const dec2   = v => parseFloat(v.toFixed(2));
const fmt    = v => Math.round(v).toLocaleString('it-IT');

function problem(id, severity, area, titolo, descrizione, soglia, valore) {
  return { id, severity, area, titolo, descrizione, soglia, valore_attuale: valore };
}

function action(arr, priorita, titolo, descrizione, impatto) {
  arr.push({ titolo, descrizione, impatto, priorita });
}

module.exports = { runCFOAnalysis, runManufacturingAnalysis, runServiceAnalysis, runCommerceAnalysis };
