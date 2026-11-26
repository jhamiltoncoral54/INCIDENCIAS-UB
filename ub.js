window.UB_METAS = {
  Clavel: { 'ACAROS': 10, 'BABOSA DAÑO Y/O PRESENCIA': 4, 'TRIPS FLOR': 4, 'TRIPS BROTE': 8, 'HETEROSPORIUM': 1 },
  Statice: { 'ACAROS': 10, 'BABOSA DAÑO Y/O PRESENCIA': 5, 'BOTRYTIS FLOR': 3, 'BOTRYTIS BASAL (CORONA)': 5, 'AFIDOS': 2 },
  Limonium: { 'ACAROS': 10, 'BABOSA DAÑO Y/O PRESENCIA': 3, 'TRIPS ADULTO': 8, 'MILDEO VELLOSO': 30, 'BOTRYTIS BASAL (CORONA)': 5, 'MILDEO POLVOSO': 4 },
  Sinensis: { 'ACAROS': 8, 'BABOSA DAÑO Y/O PRESENCIA': 4, 'TRIPS ADULTO': 8, 'TRIPS LARVA': 5, 'BOTRYTIS FLOR': 3 }
};
window.UB_CORTO = { 'ACAROS':'Ácaros','AFIDOS':'Áfidos','BABOSA DAÑO Y/O PRESENCIA':'Babosa','BOTRYTIS BASAL (CORONA)':'Botrytis basal (corona)','BOTRYTIS FLOR':'Botrytis flor','CHARCOS':'Charcos','FLOR ABIERTA':'Flor abierta','FUSARIUM OXYSPORUM':'F. oxysporum','FUSARIUM ROSEUM':'F. roseum','HETEROSPORIUM':'Heterosporium','LEPIDOPTERA DAÑO':'Lepidóptera daño','MALEZAS':'Malezas','MILDEO VELLOSO':'Mildeo velloso','PARCHES':'Parches','PUDRICION FLOR':'Pudrición flor','TRIPS BROTE':'Trips brote','TRIPS FLOR':'Trips flor','TRIPS ADULTO':'Trips adulto','TRIPS LARVA':'Trips larva','TRIPS DAÑO':'Trips daño','MILDEO POLVOSO':'Mildeo polvoso','PUDRICION BASAL':'Bacteria basal','PUDRICION FOLLAJE':'Bacteria follaje','BACTERIA':'Bacteria','FUNGUS GNAT':'Fungus gnat','GOTERAS':'Goteras','VIRUS':'Virus','MANCHAS CLOROTICAS FOLIARES':'Mancha clorótica','TALLO VELLOSO':'Tallo velloso','LEPIDOPTERA LARVA':'Lepidóptera larva','LEPIDOPTERA POSTURA':'Lepidóptera postura','FITOTOXICIDAD':'Fitotoxicidad','MINADOR LARVA':'Minador larva' };
window.UB_ORDEN_BLOQUE = (b) => {
  const t = String(b).replace('Bloque ', '').trim();
  const m = t.match(/^(\d+)([A-Za-z]*)$/);
  if (!m) return [999, t];
  return [+m[1], m[2].toUpperCase()];
};
window.UB_CMP_BLOQUE = (a, b) => {
  const x = window.UB_ORDEN_BLOQUE(a), y = window.UB_ORDEN_BLOQUE(b);
  return x[0] - y[0] || String(x[1]).localeCompare(String(y[1]));
};
window.UB_NOMBRE = (b) => window.UB_CORTO[b] || (b.charAt(0) + b.slice(1).toLowerCase());
window.UB = window.UB || { cultivo: 'Clavel', bloque: null };
window.UB_FMT = (v) => v == null ? '—' : (+v).toLocaleString('es-CO', { maximumFractionDigits: 1 });
window.UB_FMT2 = (v) => v == null ? '—' : (+v).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

dash.calc('ultima', {
  title: 'Última semana por bloque y blanco',
  inputs: ['incidencia'],
  fn: (incidencia) => {
    const metas = window.UB_METAS;
    const prom = d3.rollup(incidencia, (v) => Math.round(d3.sum(v, (r) => Math.round(+r.incidencia_pct * 10)) / v.length) / 10, (r) => +r.semana, (r) => r.cultivo, (r) => r.blanco);
    const out = incidencia.map((r) => {
      const meta = (metas[r.cultivo] || {})[r.blanco] ?? null;
      const inc = +r.incidencia_pct;
      return { semana: +r.semana, cultivo: r.cultivo, bloque: r.bloque, blanco: r.blanco, incidencia: inc,
        promedio_cultivo: prom.get(+r.semana).get(r.cultivo).get(r.blanco), meta,
        estado: meta == null ? 'Sin meta' : inc > meta ? 'Sobre meta' : 'Bajo control' };
    });
    for (const semana of prom.keys()) {
      const rs = incidencia.filter((r) => +r.semana === semana);
      for (const [cultivo, m] of Object.entries(metas)) {
        const bloques = [...new Set(rs.filter((r) => r.cultivo === cultivo).map((r) => r.bloque))];
        for (const [blanco, meta] of Object.entries(m)) {
          if (rs.some((r) => r.cultivo === cultivo && r.blanco === blanco)) continue;
          for (const bloque of bloques) out.push({ semana, cultivo, bloque, blanco, incidencia: 0, promedio_cultivo: 0, meta, estado: 'Bajo control' });
        }
      }
    }
    return out;
  }
});

dash.calc('tendencia', {
  title: 'Tendencia semanal por bloque',
  inputs: ['incidencia'],
  fn: (incidencia) => {
    const out = incidencia.map((r) => ({ cultivo: r.cultivo, semana: +r.semana, bloque: r.bloque, blanco: r.blanco, incidencia: +r.incidencia_pct }));
    const prom = d3.rollup(incidencia, (v) => Math.round(d3.sum(v, (r) => Math.round(+r.incidencia_pct * 10)) / v.length) / 10, (r) => r.cultivo, (r) => +r.semana, (r) => r.blanco);
    for (const [cultivo, porSem] of prom) for (const [semana, porBl] of porSem) for (const [blanco, valor] of porBl)
      out.push({ cultivo, semana, bloque: 'Promedio cultivo', blanco, incidencia: valor });
    return out;
  }
});

window.UB_ctx = () => {
  const u = dash.data('ultima');
  if (u.status !== 'ok' || !u.data) return null;
  const st = window.UB;
  const semanas = [...new Set(u.data.map((r) => r.semana))].sort((a, b) => b - a);
  if (!st.semana || !semanas.includes(st.semana)) st.semana = semanas[0];
  const rowsC = u.data.filter((r) => r.cultivo === st.cultivo && r.semana === st.semana);
  const bloques = [...new Set(rowsC.map((r) => r.bloque))].sort(window.UB_CMP_BLOQUE);
  if (!st.bloque || !bloques.includes(st.bloque)) st.bloque = bloques[0] || null;
  const metas = window.UB_METAS[st.cultivo] || {};
  const tieneMetas = Object.keys(metas).length > 0;
  const blancosC = [...new Set(rowsC.map((r) => r.blanco))];
  const rowsB = rowsC.filter((r) => r.bloque === st.bloque).sort((a, b) => (b.meta != null) - (a.meta != null) || b.incidencia - a.incidencia);
  return { u, st, rowsC, bloques, metas, tieneMetas, blancosC, rowsB, semanas, semana: st.semana };
};
window.UB_blancosClave = (c) => Object.keys(c.metas);
window.UB_tr = (c) => {
  const t = dash.data('tendencia');
  if (t.status !== 'ok' || !t.data) return null;
  const rows = t.data.filter((r) => r.cultivo === c.st.cultivo);
  return { rows, semanas: [...new Set(rows.map((r) => r.semana))].sort((a, b) => a - b) };
};
window.UB_an = (c) => {
  const a = dash.data('tendencia');
  if (a.status !== 'ok' || !a.data) return null;
  const rows = a.data.filter((r) => r.cultivo === c.st.cultivo && r.bloque === 'Promedio cultivo')
    .map((r) => ({ semana: r.semana, blanco: r.blanco, incidencia: r.incidencia }));
  return { rows, semanas: [...new Set(rows.map((r) => r.semana))].sort((x, y) => x - y) };
};

dash.draw('sel-semana', (sel) => {
  const c = window.UB_ctx();
  sel.replaceChildren(...(c ? c.semanas : []).map((s) => new Option('Semana ' + s, s)));
  if (c) sel.value = c.st.semana;
  sel.onchange = () => { window.UB.semana = +sel.value; window.UB_redraw(); };
});

dash.draw('sel-bloque', (sel) => {
  const c = window.UB_ctx();
  sel.replaceChildren(...(c ? c.bloques : []).map((b) => new Option(b, b)));
  if (c && c.st.bloque) sel.value = c.st.bloque;
  sel.onchange = () => { window.UB.bloque = sel.value; window.UB_redraw(); };
});

dash.draw('sem-ult', (el) => {
  const c = window.UB_ctx();
  el.textContent = c ? c.st.semana : '—';
});

dash.draw('hist-tit', (el) => {
  const c = window.UB_ctx();
  el.textContent = c && c.st.bloque ? '· ' + c.st.bloque + ' · ' + c.st.cultivo : '—';
});

dash.draw('histc-tit', (el) => {
  const c = window.UB_ctx();
  el.textContent = c ? '· ' + c.st.cultivo : '—';
});

dash.draw('tit-bloque', (el) => {
  const c = window.UB_ctx();
  el.textContent = c && c.st.bloque ? c.st.bloque + ' · ' + c.st.cultivo + ' · semana ' + c.semana : '—';
});

dash.draw('lead', (el) => {
  const c = window.UB_ctx();
  el.classList.toggle('dash-skeleton', dash.data('ultima').status === 'loading');
  if (!c || !c.st.bloque) { el.textContent = '—'; return; }
  const f = (v) => window.UB_FMT(v) + ' %';
  const sobre = c.rowsB.filter((r) => r.estado === 'Sobre meta').sort((a, b) => b.incidencia - a.incidencia);
  const altos = c.rowsB.filter((r) => r.meta == null && r.incidencia >= 5).sort((a, b) => b.incidencia - a.incidencia).slice(0, 3);
  let t = sobre.length
    ? sobre.length + (sobre.length === 1 ? ' blanco supera su meta: ' : ' blancos superan su meta: ') + sobre.map((r) => window.UB_NOMBRE(r.blanco) + ' ' + f(r.incidencia) + ' (meta ' + r.meta + ' %)').join(', ') + '.'
    : 'Ningún blanco con meta la supera esta semana.';
  if (altos.length) t += ' Sin meta, lo más alto: ' + altos.map((r) => window.UB_NOMBRE(r.blanco) + ' ' + f(r.incidencia)).join(', ') + '.';
  el.textContent = t;
});

dash.draw('nota-metas', (el) => {
  const c = window.UB_ctx();
  el.textContent = c ? 'Metas de ' + c.st.cultivo + ': ' + Object.entries(c.metas).map(([b, m]) => window.UB_NOMBRE(b) + ' ' + m + ' %').join(' · ') : '';
});

dash.draw('cards', (el) => {
  const c = window.UB_ctx();
  el.replaceChildren();
  if (!c || !c.st.bloque) { el.textContent = '—'; return; }
  for (const b of window.UB_blancosClave(c)) {
    const r = c.rowsB.find((x) => x.blanco === b);
    const card = document.createElement('div'); card.className = 'card';
    const l = document.createElement('span'); l.className = 'lbl';
    l.textContent = window.UB_NOMBRE(b) + ' · meta ' + c.metas[b] + ' %';
    const v = document.createElement('span'); v.className = 'big';
    v.textContent = r ? window.UB_FMT(r.incidencia) + ' %' : '—';
    if (r) v.classList.add(r.incidencia > c.metas[b] ? 'over' : 'ok');
    const d = document.createElement('span'); d.className = 'det';
    d.textContent = r ? 'Promedio cultivo ' + window.UB_FMT(r.promedio_cultivo) + ' %' : 'Sin dato';
    card.append(l, v, d); el.append(card);
  }
});

dash.draw('tabla-bloque', (tb) => {
  const c = window.UB_ctx();
  tb.replaceChildren();
  if (!c || !c.st.bloque) { const td = tb.insertRow().insertCell(); td.colSpan = 5; td.textContent = dash.data('ultima').status === 'error' ? 'No se pudo cargar' : 'Cargando…'; return; }
  for (const r of c.rowsB) {
    const tr = tb.insertRow();
    tr.insertCell().textContent = window.UB_NOMBRE(r.blanco);
    const c1 = tr.insertCell(); c1.textContent = window.UB_FMT(r.incidencia); if (r.estado === 'Sobre meta') c1.className = 'over';
    tr.insertCell().textContent = window.UB_FMT(r.promedio_cultivo);
    tr.insertCell().textContent = window.UB_FMT(r.meta);
    const s = document.createElement('span');
    s.className = 'est ' + (r.estado === 'Sobre meta' ? 'sobre' : r.estado === 'Bajo control' ? 'bajo' : 'sin');
    s.textContent = r.estado; tr.insertCell().append(s);
  }
});

dash.draw('matriz', (tbl) => {
  const c = window.UB_ctx();
  tbl.replaceChildren();
  if (!c) { tbl.createTBody().insertRow().insertCell().textContent = dash.data('ultima').status === 'error' ? 'No se pudo cargar' : 'Cargando…'; return; }
  const orden = Object.keys(window.UB_CORTO);
  const metasK = Object.keys(c.metas);
  const cols = c.blancosC.filter((b) => c.metas[b] != null || c.rowsC.some((r) => r.blanco === b && r.incidencia > 0))
    .sort((a, b) => (c.metas[b] != null) - (c.metas[a] != null) || (metasK.indexOf(a) - metasK.indexOf(b)) || orden.indexOf(a) - orden.indexOf(b));
  const th = tbl.createTHead().insertRow();
  const h0 = document.createElement('th'); h0.textContent = 'Bloque'; th.append(h0);
  for (const b of cols) {
    const h = document.createElement('th'); h.textContent = window.UB_NOMBRE(b);
    if (c.metas[b] != null) { h.className = 'meta'; const s = document.createElement('span'); s.className = 'm'; s.textContent = 'meta ' + c.metas[b] + ' %'; h.append(s); }
    th.append(h);
  }
  const body = tbl.createTBody();
  const pinta = (td, b, v) => {
    const meta = c.metas[b];
    if (meta != null) { if (v > meta) { td.classList.add('over'); td.style.background = 'color-mix(in srgb, var(--color-bad) 30%, transparent)'; } }
    else if (v >= 1) td.style.background = 'color-mix(in srgb, var(--color-warn) ' + Math.min(45, 8 + v * 0.4) + '%, transparent)';
  };
  for (const bl of c.bloques) {
    const tr = body.insertRow(); if (bl === c.st.bloque) tr.className = 'sel';
    tr.insertCell().textContent = bl;
    for (const b of cols) { const r = c.rowsC.find((x) => x.bloque === bl && x.blanco === b); const td = tr.insertCell(); const v = r ? r.incidencia : 0; td.textContent = window.UB_FMT(v); pinta(td, b, v); }
  }
  const tr = body.insertRow(); tr.className = 'total';
  tr.insertCell().textContent = 'Promedio cultivo';
  for (const b of cols) { const r = c.rowsC.find((x) => x.blanco === b); const td = tr.insertCell(); const v = r ? r.promedio_cultivo : 0; td.textContent = window.UB_FMT(v); pinta(td, b, v); }
});

dash.draw('hbar', (el) => {
  const c = window.UB_ctx();
  el.replaceChildren();
  if (!c || !c.st.bloque) { el.textContent = dash.data('ultima').status === 'error' ? 'No se pudo cargar' : '—'; return; }
  const rows = c.rowsB.filter((r) => r.incidencia > 0 || r.promedio_cultivo > 0 || r.meta != null);
  if (!rows.length) { el.textContent = 'Sin incidencia registrada.'; return; }
  const W = Math.max(280, el.clientWidth), rowH = 28;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${rows.length * rowH + 30}`)
    .attr('role', 'img').attr('aria-label', 'Incidencia por blanco en ' + c.st.bloque + ', con meta y promedio del cultivo');
  const tmp = svg.append('g'); let ml = 0;
  rows.forEach((r) => { ml = Math.max(ml, tmp.append('text').text(window.UB_NOMBRE(r.blanco)).node().getComputedTextLength()); });
  tmp.remove(); ml += 12;
  const xmax = Math.max(10, d3.max(rows, (r) => Math.max(r.incidencia, r.promedio_cultivo, r.meta ?? 0)));
  const x = d3.scaleLinear().domain([0, xmax]).nice().range([ml, W - 56]);
  const h = rows.length * rowH;
  svg.append('g').selectAll('line').data(x.ticks(5)).join('line').attr('x1', (v) => x(v)).attr('x2', (v) => x(v)).attr('y1', 0).attr('y2', h).style('stroke', 'var(--cds-chart-grid)');
  const ax = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h + 4})`).call(d3.axisBottom(x).ticks(5).tickFormat((v) => v + ' %').tickSize(0));
  ax.select('.domain').remove();
  const g = svg.append('g').selectAll('g').data(rows).join('g').attr('transform', (r, i) => `translate(0,${i * rowH})`);
  g.append('text').attr('x', ml - 8).attr('y', rowH / 2).attr('dy', '0.35em').attr('text-anchor', 'end').text((r) => window.UB_NOMBRE(r.blanco));
  g.append('rect').attr('x', x(0)).attr('y', 6).attr('height', rowH - 12).attr('rx', 3).attr('width', (r) => Math.max(0, x(r.incidencia) - x(0)))
    .style('fill', (r) => r.estado === 'Sobre meta' ? 'var(--cds-chart-status-critical)' : dash.colors[0]);
  g.filter((r) => r.meta != null).append('line').attr('x1', (r) => x(r.meta)).attr('x2', (r) => x(r.meta)).attr('y1', 2).attr('y2', rowH - 2).style('stroke', 'var(--color-bad)').style('stroke-width', 2);
  g.append('circle').attr('cx', (r) => x(r.promedio_cultivo)).attr('cy', rowH / 2).attr('r', 4).style('fill', 'var(--color-bg)').style('stroke', 'var(--color-fg)').style('stroke-width', 2);
  g.append('text').attr('x', (r) => x(Math.max(r.incidencia, r.promedio_cultivo, r.meta ?? 0)) + 8).attr('y', rowH / 2).attr('dy', '0.35em').style('font-variant-numeric', 'tabular-nums').text((r) => window.UB_FMT(r.incidencia) + ' %');
  const tip = d3.select(el).append('div').attr('class', 'tip').style('display', 'none');
  g.append('rect').attr('width', W).attr('height', rowH).style('fill', 'transparent')
    .on('pointermove', (ev, r) => { const [px, py] = d3.pointer(ev, el);
      tip.style('display', null).style('left', Math.min(px + 12, el.clientWidth - 240) + 'px').style('top', (py + 12) + 'px')
        .text(window.UB_NOMBRE(r.blanco) + ': ' + window.UB_FMT(r.incidencia) + ' % · cultivo ' + window.UB_FMT(r.promedio_cultivo) + ' %' + (r.meta != null ? ' · meta ' + r.meta + ' %' : '')); })
    .on('pointerleave', () => tip.style('display', 'none'));
});

dash.draw('gb-charts', (el) => {
  const c = window.UB_ctx();
  el.replaceChildren();
  if (!c) { el.textContent = dash.data('ultima').status === 'error' ? 'No se pudo cargar' : '—'; return; }
  const f = (v) => window.UB_FMT(v) + ' %';
  for (const [b, meta] of Object.entries(c.metas)) {
    const serie = c.bloques.map((bl) => { const r = c.rowsC.find((x) => x.bloque === bl && x.blanco === b); return { bloque: bl, incidencia: r ? r.incidencia : 0 }; });
    const gen = (c.rowsC.find((x) => x.blanco === b) || {}).promedio_cultivo || 0;
    const card = document.createElement('div'); card.className = 'tr-card'; el.append(card);
    const h = document.createElement('h3'); h.textContent = window.UB_NOMBRE(b) + ' · meta ' + meta + ' %'; card.append(h);
    const nSobre = serie.filter((r) => r.incidencia > meta).length;
    const v = document.createElement('div'); v.className = 'tr-v';
    v.textContent = 'General finca ' + f(gen) + ' · ' + nSobre + ' de ' + serie.length + ' bloques sobre meta'; card.append(v);
    const W = Math.max(220, card.clientWidth - 24), H = 170, m = { t: 14, r: 8, b: 26, l: 30 };
    const x = d3.scaleBand().domain(serie.map((r) => r.bloque)).range([m.l, W - m.r]).padding(0.2);
    const y = d3.scaleLinear().domain([0, Math.max(meta * 1.5, gen, d3.max(serie, (r) => r.incidencia) || 0, 2)]).nice().range([H - m.b, m.t]);
    const svg = d3.select(card).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', window.UB_NOMBRE(b) + ' por bloque en ' + c.st.cultivo + ', semana ' + c.st.semana + ', con general finca y meta');
    svg.append('g').selectAll('line').data(y.ticks(3)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', (q) => y(q)).attr('y2', (q) => y(q)).style('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(y.ticks(3)).join('text').attr('x', m.l - 5).attr('y', (q) => y(q)).attr('dy', '0.35em').attr('text-anchor', 'end').text((q) => q);
    svg.append('rect').attr('x', m.l).attr('width', W - m.l - m.r).attr('y', y(gen)).attr('height', Math.max(0, y(0) - y(gen))).style('fill', 'color-mix(in srgb, var(--color-fg) 10%, transparent)');
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(gen)).attr('y2', y(gen)).style('stroke', 'var(--color-fg-muted)').style('stroke-width', 1.5);
    svg.append('g').selectAll('rect').data(serie).join('rect').attr('x', (r) => x(r.bloque)).attr('width', x.bandwidth()).attr('y', (r) => y(r.incidencia)).attr('height', (r) => y(0) - y(r.incidencia)).attr('rx', 2)
      .style('fill', (r) => r.incidencia > meta ? 'var(--cds-chart-status-critical)' : dash.colors[0])
      .style('stroke', (r) => r.bloque === c.st.bloque ? 'var(--color-fg)' : 'none').style('stroke-width', 2);
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(meta)).attr('y2', y(meta)).style('stroke', 'var(--color-bad)').style('stroke-dasharray', '4 3').style('stroke-width', 1.5);
    const lab = (bl) => bl.replace('Bloque ', '');
    const cada = x.bandwidth() < 16 ? 2 : 1;
    svg.append('g').selectAll('text').data(serie.filter((r, i) => i % cada === 0)).join('text').attr('x', (r) => x(r.bloque) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle')
      .style('font-weight', (r) => r.bloque === c.st.bloque ? 700 : 400).text((r) => lab(r.bloque));
    const tip = d3.select(card).append('div').attr('class', 'tip').style('display', 'none');
    svg.append('g').selectAll('rect').data(serie).join('rect').attr('x', (r) => x(r.bloque) - x.step() * x.paddingInner() / 2).attr('width', x.step()).attr('y', 0).attr('height', H).style('fill', 'transparent')
      .on('pointermove', (ev, r) => { const [px, py] = d3.pointer(ev, card);
        tip.style('display', null).style('left', Math.min(px + 10, card.clientWidth - 200) + 'px').style('top', (py + 10) + 'px')
          .text(r.bloque + ': ' + f(r.incidencia) + ' · general ' + f(gen) + ' · meta ' + meta + ' %'); })
      .on('pointerleave', () => tip.style('display', 'none'))
      .on('click', (ev, r) => { window.UB.bloque = r.bloque; window.UB_redraw(); });
  }
});

dash.draw('tr-lead', (el) => {
  const c = window.UB_ctx();
  const t = c && window.UB_tr(c);
  el.classList.toggle('dash-skeleton', dash.data('tendencia').status === 'loading');
  if (!c || !t || !c.st.bloque) { el.textContent = '—'; return; }
  const partes = [];
  for (const b of window.UB_blancosClave(c)) {
    const s = t.rows.filter((r) => r.bloque === c.st.bloque && r.blanco === b);
    const n = s.filter((r) => r.incidencia > c.metas[b]).length;
    const sem = new Set(t.rows.filter((r) => r.bloque === c.st.bloque).map((r) => r.semana)).size;
    if (n) partes.push(window.UB_NOMBRE(b) + ' ' + n + ' de ' + sem);
  }
  el.textContent = partes.length ? c.st.bloque + ', semanas sobre meta: ' + partes.join(', ') + '.' : c.st.bloque + ' no superó ninguna meta en estas semanas.';
});

dash.draw('tr-charts', (el) => {
  const c = window.UB_ctx();
  const t = c && window.UB_tr(c);
  el.replaceChildren();
  if (!c || !t || !c.st.bloque) { el.textContent = dash.data('tendencia').status === 'error' ? 'No se pudo cargar' : '—'; return; }
  const f = (v) => window.UB_FMT(v) + ' %';
  const semB = new Set(t.rows.filter((r) => r.bloque === c.st.bloque).map((r) => r.semana));
  for (const b of window.UB_blancosClave(c)) {
    const meta = c.metas[b];
    const val = (bl, s) => { const r = t.rows.find((x) => x.bloque === bl && x.blanco === b && x.semana === s); return r ? r.incidencia : 0; };
    const sb = t.semanas.filter((s) => semB.has(s)).map((s) => ({ semana: s, incidencia: val(c.st.bloque, s) }));
    const sf = t.semanas.map((s) => ({ semana: s, incidencia: val('Promedio cultivo', s) }));
    const card = document.createElement('div'); card.className = 'tr-card'; el.append(card);
    const h = document.createElement('h3'); h.textContent = window.UB_NOMBRE(b) + ' · meta ' + meta + ' %'; card.append(h);
    const ult = sb.find((r) => r.semana === c.st.semana);
    const v = document.createElement('div'); v.className = 'tr-v';
    v.textContent = ult ? 'Semana ' + ult.semana + ': ' + f(ult.incidencia) : 'Sin monitoreo en la semana ' + c.st.semana; card.append(v);
    const W = Math.max(220, card.clientWidth - 24), H = 140, m = { t: 10, r: 10, b: 22, l: 34 };
    const x = d3.scalePoint().domain(t.semanas).range([m.l, W - m.r]).padding(0.2);
    const ymax = Math.max(meta * 1.5, d3.max([...sb, ...sf], (r) => r.incidencia) || 0, 2);
    const y = d3.scaleLinear().domain([0, ymax]).nice().range([H - m.b, m.t]);
    const svg = d3.select(card).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', window.UB_NOMBRE(b) + ' en ' + c.st.bloque + ', semanas ' + t.semanas[0] + ' a ' + t.semanas[t.semanas.length - 1]);
    svg.append('g').selectAll('line').data(y.ticks(3)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', (q) => y(q)).attr('y2', (q) => y(q)).style('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(y.ticks(3)).join('text').attr('x', m.l - 6).attr('y', (q) => y(q)).attr('dy', '0.35em').attr('text-anchor', 'end').text((q) => q);
    const cada = W < 330 ? 2 : 1;
    svg.append('g').selectAll('text').data(t.semanas.filter((s, i) => i % cada === (t.semanas.length - 1) % cada)).join('text').attr('x', (s) => x(s)).attr('y', H - 6).attr('text-anchor', 'middle').text((s) => 'S' + s);
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(meta)).attr('y2', y(meta)).style('stroke', 'var(--color-bad)').style('stroke-dasharray', '4 3').style('stroke-width', 1.5);
    if (x(c.st.semana) != null) svg.append('rect').attr('x', x(c.st.semana) - x.step() / 2).attr('width', x.step()).attr('y', m.t).attr('height', H - m.b - m.t)
      .style('fill', 'color-mix(in srgb, var(--color-fg) 8%, transparent)');
    const line = d3.line().x((r) => x(r.semana)).y((r) => y(r.incidencia));
    svg.append('path').attr('d', d3.area().x((r) => x(r.semana)).y0(y(0)).y1((r) => y(r.incidencia))(sf)).style('fill', 'color-mix(in srgb, var(--color-fg) 10%, transparent)');
    svg.append('path').attr('d', line(sf)).style('fill', 'none').style('stroke', 'var(--color-fg-muted)').style('stroke-width', 1.5);
    const todoCero = !sb.some((r) => r.incidencia > 0);
    svg.append('path').attr('d', line(sb)).style('fill', 'none').style('stroke', dash.colors[0]).style('stroke-width', todoCero ? 1.5 : 2.5);
    svg.append('g').selectAll('circle').data(t.semanas.filter((s) => !semB.has(s))).join('circle').attr('cx', (s) => x(s)).attr('cy', y(0)).attr('r', 3).style('fill', 'var(--color-panel)').style('stroke', 'var(--color-fg-muted)');
    if (!todoCero) svg.append('g').selectAll('circle').data(sb).join('circle').attr('cx', (r) => x(r.semana)).attr('cy', (r) => y(r.incidencia)).attr('r', 3)
      .style('fill', (r) => r.incidencia > meta ? 'var(--cds-chart-status-critical)' : dash.colors[0]);
    if (todoCero) v.textContent = 'Sin incidencia en el bloque durante estas semanas · general finca semana ' + c.st.semana + ': ' + f((sf.find((r) => r.semana === c.st.semana) || {}).incidencia || 0);
    else if (ult) v.textContent = 'Semana ' + ult.semana + ': bloque ' + f(ult.incidencia) + ' · general finca ' + f((sf.find((r) => r.semana === c.st.semana) || {}).incidencia || 0);
    const tip = d3.select(card).append('div').attr('class', 'tip').style('display', 'none');
    svg.append('g').selectAll('rect').data(t.semanas).join('rect').attr('x', (s) => x(s) - x.step() / 2).attr('width', x.step()).attr('y', 0).attr('height', H).style('fill', 'transparent')
      .on('pointermove', (ev, s) => { const rb = sb.find((r) => r.semana === s), rf = sf.find((r) => r.semana === s); const [px, py] = d3.pointer(ev, card);
        tip.style('display', null).style('left', Math.min(px + 10, card.clientWidth - 200) + 'px').style('top', (py + 10) + 'px')
          .text('S' + s + ' · bloque ' + (rb ? f(rb.incidencia) : 'sin monitoreo') + ' · cultivo ' + (rf ? f(rf.incidencia) : '—')); })
      .on('pointerleave', () => tip.style('display', 'none'));
  }
});

dash.draw('trc-lead', (el) => {
  const c = window.UB_ctx();
  const t = c && window.UB_an(c);
  el.classList.toggle('dash-skeleton', dash.data('tendencia').status === 'loading');
  if (!c || !t || !t.rows.length) { el.textContent = '—'; return; }
  const partes = [];
  for (const [b, meta] of Object.entries(c.metas)) {
    const s = t.rows.filter((r) => r.blanco === b);
    const n = s.filter((r) => r.incidencia > meta).length;
    if (n) partes.push(window.UB_NOMBRE(b) + ' ' + n + ' de ' + s.length);
  }
  el.textContent = partes.length ? c.st.cultivo + ' (semanas ' + t.semanas[0] + ' a ' + t.semanas[t.semanas.length - 1] + '), semanas sobre la meta: ' + partes.join(', ') + '.' : c.st.cultivo + ' no superó ninguna meta en estas semanas.';
});

dash.draw('trc-charts', (el) => {
  const c = window.UB_ctx();
  const t = c && window.UB_an(c);
  el.replaceChildren();
  if (!c || !t) { el.textContent = dash.data('tendencia').status === 'error' ? 'No se pudo cargar' : '—'; return; }
  const f = (v) => window.UB_FMT(v) + ' %';
  for (const [b, meta] of Object.entries(c.metas)) {
    const serie = t.semanas.map((w) => { const r = t.rows.find((x) => x.blanco === b && x.semana === w); return { semana: w, incidencia: r ? r.incidencia : 0 }; });
    const card = document.createElement('div'); card.className = 'tr-card'; el.append(card);
    const h = document.createElement('h3'); h.textContent = window.UB_NOMBRE(b) + ' · meta ' + meta + ' %'; card.append(h);
    const cur = serie.find((r) => r.semana === c.st.semana);
    const n = serie.filter((r) => r.incidencia > meta).length;
    const v = document.createElement('div'); v.className = 'tr-v';
    v.textContent = (cur ? 'Semana ' + cur.semana + ': ' + f(cur.incidencia) + ' · ' : '') + 'promedio del periodo ' + f(d3.mean(serie, (r) => r.incidencia)) + ' · ' + n + ' semanas sobre meta';
    card.append(v);
    const W = Math.max(220, card.clientWidth - 24), H = 150, m = { t: 10, r: 10, b: 22, l: 34 };
    const x = d3.scaleLinear().domain(d3.extent(t.semanas)).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, Math.max(meta * 1.5, d3.max(serie, (r) => r.incidencia) || 0, 2)]).nice().range([H - m.b, m.t]);
    const svg = d3.select(card).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', window.UB_NOMBRE(b) + ' en ' + c.st.cultivo + ' durante 2026, semanas ' + t.semanas[0] + ' a ' + t.semanas[t.semanas.length - 1]);
    svg.append('g').selectAll('line').data(y.ticks(3)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', (q) => y(q)).attr('y2', (q) => y(q)).style('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(y.ticks(3)).join('text').attr('x', m.l - 6).attr('y', (q) => y(q)).attr('dy', '0.35em').attr('text-anchor', 'end').text((q) => q);
    const ticks = t.semanas.length <= 12 ? t.semanas.filter((s, i) => W >= 330 || i % 2 === (t.semanas.length - 1) % 2) : t.semanas.filter((s) => s === 1 || s % (W < 330 ? 10 : 5) === 0);
    svg.append('g').selectAll('text').data(ticks).join('text').attr('x', (s) => x(s)).attr('y', H - 6).attr('text-anchor', 'middle').text((s) => 'S' + s);
    const step = (W - m.l - m.r) / Math.max(1, t.semanas.length - 1);
    if (t.semanas.includes(c.st.semana)) svg.append('rect').attr('x', x(c.st.semana) - step / 2).attr('width', step).attr('y', m.t).attr('height', H - m.b - m.t).style('fill', 'color-mix(in srgb, var(--color-fg) 10%, transparent)');
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(meta)).attr('y2', y(meta)).style('stroke', 'var(--color-bad)').style('stroke-dasharray', '4 3').style('stroke-width', 1.5);
    svg.append('path').attr('d', d3.line().x((r) => x(r.semana)).y((r) => y(r.incidencia))(serie)).style('fill', 'none').style('stroke', 'var(--color-fg)').style('stroke-width', 2);
    svg.append('g').selectAll('circle').data(serie.filter((r) => r.incidencia > meta)).join('circle').attr('cx', (r) => x(r.semana)).attr('cy', (r) => y(r.incidencia)).attr('r', 2.8)
      .style('fill', 'var(--cds-chart-status-critical)');
    const tip = d3.select(card).append('div').attr('class', 'tip').style('display', 'none');
    svg.append('g').selectAll('rect').data(serie).join('rect').attr('x', (r) => x(r.semana) - step / 2).attr('width', step).attr('y', 0).attr('height', H).style('fill', 'transparent')
      .on('pointermove', (ev, r) => { const [px, py] = d3.pointer(ev, card);
        tip.style('display', null).style('left', Math.min(px + 10, card.clientWidth - 200) + 'px').style('top', (py + 10) + 'px')
          .text('S' + r.semana + ' · ' + f(r.incidencia)); })
      .on('pointerleave', () => tip.style('display', 'none'));
  }
});

window.UB_HIST = ['hist-tit', 'tr-lead', 'tr-charts', 'histc-tit', 'trc-lead', 'trc-charts'];
window.UB_redraw = () => ['histc-tit','trc-lead','trc-charts','hist-tit','sel-semana','sel-bloque','tit-bloque','lead','nota-metas','cards','hbar','tabla-bloque','tr-lead','tr-charts','gb-charts','matriz','sem-ult'].forEach((n) => dash.draw(n));
window.UB_tab = (id) => {
  document.querySelectorAll('.ub .vista').forEach((v) => { v.hidden = v.id !== id; });
  document.querySelectorAll('.ub .tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
  if (id === 'historico') window.UB_HIST.forEach((n) => dash.draw(n));
  if (id === 'mortalidad') window.UB_MORT_redraw();
  dash.setLink(id);
};
document.querySelectorAll('.ub .tab').forEach((b) => b.addEventListener('click', () => window.UB_tab(b.dataset.tab)));
if (location.hash === '#historico') window.UB_tab('historico');
window.addEventListener('beforeprint', () => { document.querySelectorAll('.ub .vista').forEach((v) => { v.hidden = false; }); window.UB_HIST.forEach((n) => dash.draw(n)); window.UB_MORT_redraw(); });
window.addEventListener('afterprint', () => { const sel = document.querySelector('.ub .tab[aria-selected="true"]'); window.UB_tab(sel ? sel.dataset.tab : 'vista-semana'); });
document.querySelectorAll('#ub-cult').forEach((sel) => {
  sel.value = window.UB.cultivo;
  sel.addEventListener('change', () => { window.UB.cultivo = sel.value; window.UB.bloque = null; window.UB_redraw(); });
});

/* ---------- Mortalidad (Monitoreo Plantas Muertas, lectura mensual) ---------- */

dash.calc('mortalidad', {
  title: 'Mortalidad por bloque y variedad',
  inputs: ['mortalidad_src'],
  fn: (src) => src.map((r) => {
    const sem = +r.sembradas, mue = +r.muertas;
    return { periodo: r.periodo, periodo_nombre: r.periodo_nombre, cultivo: r.cultivo, bloque: r.bloque,
      variedad: r.variedad, camas: +r.camas, sembradas: sem, muertas: mue,
      mortalidad: sem ? Math.round(mue / sem * 10000) / 100 : 0 };
  })
});

window.UB_MORT = () => {
  const d = dash.data('mortalidad');
  if (d.status !== 'ok' || !d.data) return null;
  const st = window.UB;
  const periodos = [...new Set(d.data.map((r) => r.periodo))].sort().reverse();
  if (!st.mes || !periodos.includes(st.mes)) st.mes = periodos[0];
  const rows = d.data.filter((r) => r.periodo === st.mes);
  const nombre = rows.length ? rows[0].periodo_nombre : st.mes;
  const pct = (m, s) => s ? Math.round(m / s * 10000) / 100 : 0;
  const agrupa = (clave) => {
    const g = new Map();
    for (const r of rows) {
      const k = r[clave];
      const o = g.get(k) || { k, sembradas: 0, muertas: 0, camas: 0 };
      o.sembradas += r.sembradas; o.muertas += r.muertas; o.camas += r.camas;
      g.set(k, o);
    }
    return [...g.values()].map((o) => ({ ...o, mortalidad: pct(o.muertas, o.sembradas) }));
  };
  const sembradas = d3.sum(rows, (r) => r.sembradas);
  const muertas = d3.sum(rows, (r) => r.muertas);
  return { rows, periodos, nombre, sembradas, muertas, total: pct(muertas, sembradas), pct,
    bloques: agrupa('bloque').sort((a, b) => b.mortalidad - a.mortalidad),
    variedades: agrupa('variedad').sort((a, b) => b.mortalidad - a.mortalidad) };
};

window.UB_META_MORT = 2;
window.UB_MORT_COLOR = (v) => v > window.UB_META_MORT ? 'var(--cds-chart-status-critical)'
  : v >= 1 ? 'color-mix(in srgb, var(--color-warn) 75%, var(--color-fg))' : dash.colors[0];

dash.draw('sel-mes', (sel) => {
  const m = window.UB_MORT();
  if (!m) { sel.replaceChildren(); return; }
  const nom = {};
  dash.data('mortalidad').data.forEach((r) => { nom[r.periodo] = r.periodo_nombre; });
  sel.replaceChildren(...m.periodos.map((p) => new Option(nom[p] || p, p)));
  sel.value = window.UB.mes;
  sel.onchange = () => { window.UB.mes = sel.value; window.UB_MORT_redraw(); };
});

dash.draw('mort-fuente', (el) => {
  el.textContent = 'WiPest · Monitoreo Plantas Muertas · lectura mensual · finca UB';
});

dash.draw('mort-tit', (el) => {
  const m = window.UB_MORT();
  el.textContent = m ? '· ' + m.nombre : '—';
});

dash.draw('mort-lead', (el) => {
  const m = window.UB_MORT();
  el.classList.toggle('dash-skeleton', dash.data('mortalidad').status === 'loading');
  if (!m) { el.textContent = '—'; return; }
  const f = (v) => window.UB_FMT(v) + ' %';
  const n = (v) => v.toLocaleString('es-CO');
  const peor = m.bloques[0], pv = m.variedades.filter((v) => v.sembradas >= 2000)[0];
  let t = 'Mortalidad del cultivo ' + window.UB_FMT2(m.total) + ' % (meta ' + window.UB_META_MORT + ' %): ' + n(m.muertas) + ' plantas muertas de ' + n(m.sembradas) + ' sembradas en ' + m.bloques.length + ' bloques.';
  if (peor) t += ' El bloque más afectado es el ' + peor.k.replace('Bloque ', '') + ' con ' + f(peor.mortalidad) + '.';
  if (pv) t += ' Entre las variedades de volumen, la más afectada es ' + pv.k + ' con ' + f(pv.mortalidad) + '.';
  el.textContent = t;
});

dash.draw('mort-cards', (el) => {
  const m = window.UB_MORT();
  el.replaceChildren();
  if (!m) { el.textContent = '—'; return; }
  const n = (v) => v.toLocaleString('es-CO');
  const sobre = m.bloques.filter((b) => b.mortalidad > window.UB_META_MORT).length;
  const datos = [
    ['Mortalidad del cultivo', window.UB_FMT2(m.total) + ' %', n(m.muertas) + ' de ' + n(m.sembradas) + ' plantas'],
    ['Bloque más afectado', m.bloques[0] ? m.bloques[0].k.replace('Bloque ', '') : '—', m.bloques[0] ? window.UB_FMT(m.bloques[0].mortalidad) + ' %' : ''],
    ['Bloques sobre la meta', String(sobre), 'de ' + m.bloques.length + ' bloques · meta ' + window.UB_META_MORT + ' %'],
    ['Variedades sembradas', String(m.variedades.length), n(d3.sum(m.rows, (r) => r.camas)) + ' camas']
  ];
  for (const [lbl, big, det] of datos) {
    const card = document.createElement('div'); card.className = 'card';
    const l = document.createElement('span'); l.className = 'lbl'; l.textContent = lbl;
    const v = document.createElement('span'); v.className = 'big'; v.textContent = big;
    const d = document.createElement('span'); d.className = 'det'; d.textContent = det;
    card.append(l, v, d); el.append(card);
  }
});

window.UB_MORT_BARRAS = (el, items, etiqueta, general, alTocar) => {
  el.replaceChildren();
  if (!items.length) { el.textContent = 'Sin datos en esta lectura.'; return; }
  const f = (v) => window.UB_FMT(v) + ' %';
  const n = (v) => v.toLocaleString('es-CO');
  const W = Math.max(280, el.clientWidth), rowH = 26;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${items.length * rowH + 30}`)
    .attr('role', 'img').attr('aria-label', etiqueta);
  const tmp = svg.append('g'); let ml = 0;
  items.forEach((r) => { ml = Math.max(ml, tmp.append('text').text(r.etq).node().getComputedTextLength()); });
  tmp.remove(); ml += 12;
  const xmax = Math.max(1, d3.max(items, (r) => r.mortalidad), general || 0);
  const x = d3.scaleLinear().domain([0, xmax]).nice().range([ml, W - 70]);
  const h = items.length * rowH;
  svg.append('g').selectAll('line').data(x.ticks(5)).join('line').attr('x1', (v) => x(v)).attr('x2', (v) => x(v)).attr('y1', 0).attr('y2', h).style('stroke', 'var(--cds-chart-grid)');
  const ax = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h + 4})`).call(d3.axisBottom(x).ticks(5).tickFormat((v) => v + ' %').tickSize(0));
  ax.select('.domain').remove();
  const g = svg.append('g').selectAll('g').data(items).join('g').attr('transform', (r, i) => `translate(0,${i * rowH})`);
  g.append('text').attr('x', ml - 8).attr('y', rowH / 2).attr('dy', '0.35em').attr('text-anchor', 'end').text((r) => r.etq);
  g.append('rect').attr('x', x(0)).attr('y', 5).attr('height', rowH - 10).attr('rx', 3)
    .attr('width', (r) => Math.max(0, x(r.mortalidad) - x(0))).style('fill', (r) => window.UB_MORT_COLOR(r.mortalidad));
  g.append('text').attr('x', (r) => x(r.mortalidad) + 8).attr('y', rowH / 2).attr('dy', '0.35em')
    .style('font-variant-numeric', 'tabular-nums').text((r) => f(r.mortalidad));
  if (general != null && x(general) != null) svg.append('line').attr('x1', x(general)).attr('x2', x(general)).attr('y1', 0).attr('y2', h)
    .style('stroke', 'var(--color-bad)').style('stroke-dasharray', '4 3').style('stroke-width', 1.5);
  const tip = d3.select(el).append('div').attr('class', 'tip').style('display', 'none');
  g.append('rect').attr('width', W).attr('height', rowH).style('fill', 'transparent')
    .on('pointermove', (ev, r) => { const [px, py] = d3.pointer(ev, el);
      tip.style('display', null).style('left', Math.min(px + 12, el.clientWidth - 260) + 'px').style('top', (py + 12) + 'px')
        .text(r.etq + ': ' + f(r.mortalidad) + ' · ' + n(r.muertas) + ' de ' + n(r.sembradas) + ' plantas · ' + r.camas + ' camas'); })
    .on('pointerleave', () => tip.style('display', 'none'))
    .style('cursor', alTocar ? 'pointer' : null)
    .on('click', (ev, r) => { if (alTocar) alTocar(r); });
  if (alTocar) g.filter((r) => r.k === window.UB.mortBloque).select('rect')
    .style('stroke', 'var(--color-fg)').style('stroke-width', 2);
};

dash.draw('mort-hbar', (el) => {
  const m = window.UB_MORT();
  if (!m) { el.textContent = dash.data('mortalidad').status === 'error' ? 'No se pudo cargar' : '—'; return; }
  window.UB_MORT_BARRAS(el, m.bloques.map((b) => ({ ...b, etq: b.k.replace('Bloque ', 'Bl ') })), 'Mortalidad por bloque', window.UB_META_MORT,
    (r) => { window.UB.mortBloque = r.k; window.UB_MORT_redraw(); });
});

dash.draw('mort-var', (el) => {
  const m = window.UB_MORT();
  if (!m) { el.textContent = dash.data('mortalidad').status === 'error' ? 'No se pudo cargar' : '—'; return; }
  window.UB_MORT_BARRAS(el, m.variedades.slice(0, 15).map((v) => ({ ...v, etq: v.k + ' (' + v.sembradas.toLocaleString('es-CO') + ')' })), 'Variedades con mayor mortalidad', m.total);
});

dash.draw('mort-matriz', (tbl) => {
  const m = window.UB_MORT();
  tbl.replaceChildren();
  if (!m) { tbl.createTBody().insertRow().insertCell().textContent = dash.data('mortalidad').status === 'error' ? 'No se pudo cargar' : 'Cargando…'; return; }
  const bloques = [...new Set(m.rows.map((r) => r.bloque))].sort(window.UB_CMP_BLOQUE);
  const vars = m.variedades.map((v) => v.k);
  const celda = new Map(m.rows.map((r) => [r.bloque + '|' + r.variedad, r]));
  const th = tbl.createTHead().insertRow();
  const h0 = document.createElement('th'); h0.textContent = 'Bloque'; th.append(h0);
  for (const v of vars) { const h = document.createElement('th'); h.textContent = v; th.append(h); }
  const hT = document.createElement('th'); hT.textContent = 'Bloque %'; hT.className = 'meta'; th.append(hT);
  const pinta = (td, v) => {
    if (v > window.UB_META_MORT) { td.classList.add('over'); td.style.background = 'color-mix(in srgb, var(--color-bad) 30%, transparent)'; }
    else if (v >= 1) td.style.background = 'color-mix(in srgb, var(--color-warn) ' + Math.min(45, 8 + v * 12) + '%, transparent)';
  };
  const body = tbl.createTBody();
  for (const bl of bloques) {
    const tr = body.insertRow();
    tr.insertCell().textContent = bl;
    for (const v of vars) {
      const r = celda.get(bl + '|' + v); const td = tr.insertCell();
      if (!r) { td.textContent = ''; continue; }
      td.textContent = window.UB_FMT(r.mortalidad); pinta(td, r.mortalidad);
      td.title = r.muertas.toLocaleString('es-CO') + ' de ' + r.sembradas.toLocaleString('es-CO') + ' plantas';
    }
    const b = m.bloques.find((x) => x.k === bl); const td = tr.insertCell();
    td.textContent = window.UB_FMT(b ? b.mortalidad : 0); pinta(td, b ? b.mortalidad : 0);
  }
  const tr = body.insertRow(); tr.className = 'total';
  tr.insertCell().textContent = 'Variedad %';
  for (const v of vars) { const o = m.variedades.find((x) => x.k === v); const td = tr.insertCell(); td.textContent = window.UB_FMT(o ? o.mortalidad : 0); pinta(td, o ? o.mortalidad : 0); }
  const tdT = tr.insertCell(); tdT.textContent = window.UB_FMT2(m.total); pinta(tdT, m.total);
});

window.UB_MORT_LISTA = ['sel-mes', 'mort-fuente', 'mort-tit', 'mort-lead', 'mort-cards', 'mort-hbar', 'mort-var', 'mort-matriz'];
window.UB_MORT_redraw = () => window.UB_MORT_LISTA.forEach((n) => dash.draw(n));

/* ---------- Camas más afectadas y tendencia anual ---------- */

dash.calc('camas', {
  title: 'Camas con mayor mortalidad',
  inputs: ['camas_src'],
  fn: (src) => src.map((r) => {
    const sem = +r.sembradas, mue = +r.muertas;
    return { periodo: r.periodo, bloque: r.bloque, nave: r.nave, lado: r.lado, cama: r.cama,
      variedad: r.variedad, sembradas: sem, muertas: mue,
      mortalidad: sem ? Math.round(mue / sem * 10000) / 100 : 0 };
  })
});

window.UB_MORT_CAMAS = () => {
  const d = dash.data('camas');
  const m = window.UB_MORT();
  if (d.status !== 'ok' || !d.data || !m) return null;
  const bloques = m.bloques.map((b) => b.k);
  let bl = window.UB.mortBloque;
  if (!bl || !bloques.includes(bl)) bl = m.bloques[0] ? m.bloques[0].k : null;
  window.UB.mortBloque = bl;
  const rows = d.data.filter((r) => r.periodo === window.UB.mes && r.bloque === bl)
    .sort((a, b) => b.mortalidad - a.mortalidad);
  return { bloque: bl, rows, nombre: m.nombre };
};

dash.draw('mort-camas-tit', (el) => {
  const c = window.UB_MORT_CAMAS();
  el.textContent = c ? '· ' + c.bloque + ' · ' + c.nombre : '—';
});

dash.draw('mort-camas', (tbl) => {
  const c = window.UB_MORT_CAMAS();
  tbl.replaceChildren();
  if (!c) { tbl.createTBody().insertRow().insertCell().textContent = dash.data('camas').status === 'error' ? 'No se pudo cargar' : 'Cargando…'; return; }
  const th = tbl.createTHead().insertRow();
  for (const t of ['Cama', 'Nave', 'Lado', 'Variedad', 'Sembradas', 'Muertas', 'Mortalidad']) {
    const h = document.createElement('th'); h.textContent = t; th.append(h);
  }
  const body = tbl.createTBody();
  if (!c.rows.length) {
    const td = body.insertRow().insertCell(); td.colSpan = 7;
    td.textContent = 'Ninguna cama de este bloque registró plantas muertas en esta lectura.';
    return;
  }
  const n = (v) => v.toLocaleString('es-CO');
  for (const r of c.rows) {
    const tr = body.insertRow();
    tr.insertCell().textContent = r.cama;
    tr.insertCell().textContent = r.nave;
    tr.insertCell().textContent = r.lado;
    tr.insertCell().textContent = r.variedad;
    tr.insertCell().textContent = n(r.sembradas);
    tr.insertCell().textContent = n(r.muertas);
    const td = tr.insertCell(); td.textContent = window.UB_FMT(r.mortalidad) + ' %';
    if (r.mortalidad > window.UB_META_MORT) { td.className = 'over'; td.style.background = 'color-mix(in srgb, var(--color-bad) 25%, transparent)'; }
  }
});

dash.draw('mort-anual', (el) => {
  const d = dash.data('mortalidad');
  el.replaceChildren();
  if (d.status !== 'ok' || !d.data) { el.textContent = d.status === 'error' ? 'No se pudo cargar' : '—'; return; }
  const g = new Map();
  for (const r of d.data) {
    const o = g.get(r.periodo) || { periodo: r.periodo, nombre: r.periodo_nombre, s: 0, m: 0 };
    o.s += r.sembradas; o.m += r.muertas; g.set(r.periodo, o);
  }
  const serie = [...g.values()].sort((a, b) => a.periodo.localeCompare(b.periodo))
    .map((o) => ({ ...o, mortalidad: Math.round(o.m / o.s * 10000) / 100 }));
  const meta = window.UB_META_MORT;
  const W = Math.max(320, el.clientWidth), H = 220, mg = { t: 14, r: 14, b: 34, l: 40 };
  const x = d3.scaleBand().domain(serie.map((r) => r.periodo)).range([mg.l, W - mg.r]).padding(0.25);
  const y = d3.scaleLinear().domain([0, Math.max(meta * 1.5, d3.max(serie, (r) => r.mortalidad) || 0)]).nice().range([H - mg.b, mg.t]);
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img').attr('aria-label', 'Mortalidad mensual del clavel en 2026 frente a la meta');
  svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', mg.l).attr('x2', W - mg.r)
    .attr('y1', (q) => y(q)).attr('y2', (q) => y(q)).style('stroke', 'var(--cds-chart-grid)');
  svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', mg.l - 6).attr('y', (q) => y(q))
    .attr('dy', '0.35em').attr('text-anchor', 'end').text((q) => q + ' %');
  svg.append('g').selectAll('rect').data(serie).join('rect')
    .attr('x', (r) => x(r.periodo)).attr('width', x.bandwidth())
    .attr('y', (r) => y(r.mortalidad)).attr('height', (r) => y(0) - y(r.mortalidad)).attr('rx', 2)
    .style('fill', (r) => window.UB_MORT_COLOR(r.mortalidad))
    .style('stroke', (r) => r.periodo === window.UB.mes ? 'var(--color-fg)' : 'none').style('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('click', (ev, r) => { window.UB.mes = r.periodo; window.UB_MORT_redraw(); });
  svg.append('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y(meta)).attr('y2', y(meta))
    .style('stroke', 'var(--color-bad)').style('stroke-dasharray', '4 3').style('stroke-width', 1.5);
  svg.append('g').selectAll('text').data(serie).join('text')
    .attr('x', (r) => x(r.periodo) + x.bandwidth() / 2).attr('y', (r) => y(r.mortalidad) - 5)
    .attr('text-anchor', 'middle').style('font-variant-numeric', 'tabular-nums')
    .text((r) => window.UB_FMT(r.mortalidad));
  svg.append('g').selectAll('text').data(serie).join('text')
    .attr('x', (r) => x(r.periodo) + x.bandwidth() / 2).attr('y', H - 10).attr('text-anchor', 'middle')
    .style('font-weight', (r) => r.periodo === window.UB.mes ? 700 : 400)
    .text((r) => r.nombre.slice(0, 3));
});

window.UB_MORT_LISTA = ['sel-mes', 'mort-fuente', 'mort-tit', 'mort-lead', 'mort-cards', 'mort-anual', 'mort-hbar', 'mort-camas-tit', 'mort-camas', 'mort-var', 'mort-matriz'];
window.UB_MORT_redraw = () => window.UB_MORT_LISTA.forEach((n) => dash.draw(n));

/* ---------- Rango de edad vs mortalidad, por bloque ---------- */

dash.calc('edad', {
  title: 'Mortalidad por edad del cultivo y bloque',
  inputs: ['edad_src'],
  fn: (src) => src.map((r) => ({ bloque: r.bloque, edad: +r.edad_semanas, lecturas: +r.lecturas,
    sembradas: +r.sembradas, muertas: +r.muertas }))
});

window.UB_RANGOS_WIPEST = [
  { ini: 0, fin: 12, etq: '0–12' }, { ini: 13, fin: 32, etq: '13–32' },
  { ini: 33, fin: 55, etq: '33–55' }, { ini: 56, fin: 74, etq: '56–74' }, { ini: 75, fin: 999, etq: '≥75' }
];

window.UB_EDAD = () => {
  const d = dash.data('edad');
  if (d.status !== 'ok' || !d.data) return null;
  const modo = window.UB.edadModo || '4';
  const rangos = modo === 'wipest' ? window.UB_RANGOS_WIPEST
    : (() => {
        const p = +modo, out = [];
        for (let i = 0; i <= 72; i += p) out.push({ ini: i, fin: Math.min(i + p - 1, 72), etq: p === 1 ? String(i) : i + '–' + Math.min(i + p - 1, 72) });
        out.push({ ini: 73, fin: 999, etq: '73+' });
        return out;
      })();
  const bloques = [...new Set(d.data.map((r) => r.bloque))].sort(window.UB_CMP_BLOQUE);
  const por = bloques.map((bl) => {
    const filas = d.data.filter((r) => r.bloque === bl);
    const serie = rangos.map((g) => {
      const f = filas.filter((r) => r.edad >= g.ini && r.edad <= g.fin);
      const s = d3.sum(f, (r) => r.sembradas), m = d3.sum(f, (r) => r.muertas);
      return { etq: g.etq, ini: g.ini, sembradas: s, muertas: m, hay: s > 0,
        mortalidad: s ? Math.round(m / s * 10000) / 100 : 0 };
    }).filter((r) => r.hay);
    const cruce = serie.find((r) => r.mortalidad > window.UB_META_MORT);
    return { bloque: bl, serie, cruce };
  }).filter((b) => b.serie.length);
  return { por, modo };
};

dash.draw('edad-lead', (el) => {
  const e = window.UB_EDAD();
  el.classList.toggle('dash-skeleton', dash.data('edad').status === 'loading');
  if (!e) { el.textContent = '—'; return; }
  const con = e.por.filter((b) => b.cruce);
  if (!con.length) { el.textContent = 'Ningún bloque pasa la meta del 2 % en los rangos de edad con datos.'; return; }
  con.sort((a, b) => a.cruce.ini - b.cruce.ini);
  const lista = con.map((b) => b.bloque.replace('Bloque ', '') + ' en ' + b.cruce.etq).join(', ');
  el.textContent = 'La mortalidad pasa la meta del 2 % a partir de estas edades (semanas desde la siembra o poda): ' + lista + '.'
    + ' El más temprano es el bloque ' + con[0].bloque.replace('Bloque ', '') + '.';
});

dash.draw('edad-charts', (el) => {
  const e = window.UB_EDAD();
  el.replaceChildren();
  if (!e) { el.textContent = dash.data('edad').status === 'error' ? 'No se pudo cargar' : '—'; return; }
  const f = (v) => window.UB_FMT(v) + ' %';
  const n = (v) => v.toLocaleString('es-CO');
  const meta = window.UB_META_MORT;
  const ymax = Math.max(meta * 1.5, d3.max(e.por, (b) => d3.max(b.serie, (r) => r.mortalidad)) || 0);
  for (const b of e.por) {
    const card = document.createElement('div'); card.className = 'tr-card'; el.append(card);
    const h = document.createElement('h3'); h.textContent = b.bloque; card.append(h);
    const v = document.createElement('div'); v.className = 'tr-v';
    v.textContent = b.cruce ? 'Pasa la meta en la semana ' + b.cruce.etq + ' con ' + f(b.cruce.mortalidad)
      : 'No pasa la meta en el rango con datos';
    card.append(v);
    const W = Math.max(240, card.clientWidth - 24), H = 160, m = { t: 12, r: 10, b: 30, l: 34 };
    const x = d3.scaleBand().domain(b.serie.map((r) => r.etq)).range([m.l, W - m.r]).padding(0.15);
    const y = d3.scaleLinear().domain([0, ymax]).nice().range([H - m.b, m.t]);
    const svg = d3.select(card).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'img').attr('aria-label', 'Mortalidad por edad del cultivo en ' + b.bloque);
    svg.append('g').selectAll('line').data(y.ticks(3)).join('line').attr('x1', m.l).attr('x2', W - m.r)
      .attr('y1', (q) => y(q)).attr('y2', (q) => y(q)).style('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(y.ticks(3)).join('text').attr('x', m.l - 5).attr('y', (q) => y(q))
      .attr('dy', '0.35em').attr('text-anchor', 'end').text((q) => q);
    svg.append('g').selectAll('rect').data(b.serie).join('rect')
      .attr('x', (r) => x(r.etq)).attr('width', x.bandwidth())
      .attr('y', (r) => y(r.mortalidad)).attr('height', (r) => Math.max(0, y(0) - y(r.mortalidad))).attr('rx', 2)
      .style('fill', (r) => window.UB_MORT_COLOR(r.mortalidad));
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(meta)).attr('y2', y(meta))
      .style('stroke', 'var(--color-bad)').style('stroke-dasharray', '4 3').style('stroke-width', 1.5);
    if (b.cruce) svg.append('circle').attr('cx', x(b.cruce.etq) + x.bandwidth() / 2)
      .attr('cy', y(b.cruce.mortalidad)).attr('r', 4)
      .style('fill', 'var(--color-bg)').style('stroke', 'var(--color-fg)').style('stroke-width', 2);
    const paso = Math.ceil(b.serie.length / (W < 320 ? 4 : 7));
    svg.append('g').selectAll('text').data(b.serie.filter((r, i) => i % paso === 0)).join('text')
      .attr('x', (r) => x(r.etq) + x.bandwidth() / 2).attr('y', H - 14).attr('text-anchor', 'middle')
      .text((r) => r.etq);
    svg.append('text').attr('x', (m.l + W - m.r) / 2).attr('y', H - 2).attr('text-anchor', 'middle')
      .text('semanas desde siembra o poda');
    const tip = d3.select(card).append('div').attr('class', 'tip').style('display', 'none');
    svg.append('g').selectAll('rect').data(b.serie).join('rect')
      .attr('x', (r) => x(r.etq)).attr('width', x.step()).attr('y', 0).attr('height', H).style('fill', 'transparent')
      .on('pointermove', (ev, r) => { const [px, py] = d3.pointer(ev, card);
        tip.style('display', null).style('left', Math.min(px + 10, card.clientWidth - 230) + 'px').style('top', (py + 10) + 'px')
          .text('Semanas ' + r.etq + ': ' + f(r.mortalidad) + ' · ' + n(r.muertas) + ' de ' + n(r.sembradas) + ' plantas'); })
      .on('pointerleave', () => tip.style('display', 'none'));
  }
});

document.querySelectorAll('#ub-edad').forEach((sel) => {
  window.UB.edadModo = window.UB.edadModo || sel.value;
  sel.value = window.UB.edadModo;
  sel.addEventListener('change', () => { window.UB.edadModo = sel.value; dash.draw('edad-lead'); dash.draw('edad-charts'); });
});

window.UB_MORT_LISTA = ['sel-mes', 'mort-fuente', 'mort-tit', 'mort-lead', 'mort-cards', 'mort-anual', 'mort-hbar', 'mort-camas-tit', 'mort-camas', 'edad-lead', 'edad-charts', 'mort-var', 'mort-matriz'];
window.UB_MORT_redraw = () => window.UB_MORT_LISTA.forEach((n) => dash.draw(n));

/* ---------- Consolidado de plantas muertas ---------- */

dash.calc('camas_oct', {
  title: 'Plantas muertas por cama, octubre 2026',
  inputs: ['camas_oct_src'],
  fn: (src) => src.map((r) => {
    const sem = +r.sembradas, mue = +r.muertas;
    return { bloque: r.bloque, nave: r.nave, lado: r.lado, cama: r.cama, variedad: r.variedad,
      sembradas: sem, muertas: mue, mortalidad: sem ? Math.round(mue / sem * 10000) / 100 : 0 };
  })
});

window.UB_CONS = () => {
  const m = window.UB_MORT();
  if (!m) return null;
  const pct = (mu, s) => s ? Math.round(mu / s * 10000) / 100 : 0;
  const g = new Map();
  for (const r of m.rows) {
    const o = g.get(r.variedad) || { variedad: r.variedad, bloques: new Set(), camas: 0, sembradas: 0, muertas: 0 };
    o.bloques.add(r.bloque); o.camas += r.camas; o.sembradas += r.sembradas; o.muertas += r.muertas;
    g.set(r.variedad, o);
  }
  const variedades = [...g.values()].map((o) => ({ ...o, nBloques: o.bloques.size, mortalidad: pct(o.muertas, o.sembradas) }))
    .sort((a, b) => b.muertas - a.muertas);
  const porBloque = m.rows.map((r) => ({ ...r })).sort((a, b) => window.UB_CMP_BLOQUE(a.bloque, b.bloque) || b.muertas - a.muertas);
  return { nombre: m.nombre, variedades, porBloque, total: m.muertas, sembradas: m.sembradas };
};

const UB_tabla = (tbl, cabeceras, filas, pinta) => {
  tbl.replaceChildren();
  const th = tbl.createTHead().insertRow();
  for (const t of cabeceras) { const h = document.createElement('th'); h.textContent = t; th.append(h); }
  const body = tbl.createTBody();
  for (const f of filas) {
    const tr = body.insertRow();
    if (f.clase) tr.className = f.clase;
    f.celdas.forEach((v, i) => {
      const td = tr.insertCell();
      td.textContent = v;
      if (pinta) pinta(td, f, i);
    });
  }
};

dash.draw('cons-tit', (el) => { const c = window.UB_CONS(); el.textContent = c ? '· ' + c.nombre : '—'; });
dash.draw('consc-tit', (el) => {
  const c = window.UB_MORT_CAMAS();
  el.textContent = c ? '· ' + c.bloque : '—';
});

dash.draw('cons-lead', (el) => {
  const c = window.UB_CONS();
  el.classList.toggle('dash-skeleton', dash.data('mortalidad').status === 'loading');
  if (!c) { el.textContent = '—'; return; }
  const n = (v) => v.toLocaleString('es-CO');
  const top = c.variedades.slice(0, 3);
  const suma = d3.sum(top, (v) => v.muertas);
  el.textContent = n(c.total) + ' plantas muertas en total. Las tres variedades que más aportan son '
    + top.map((v) => v.variedad + ' con ' + n(v.muertas)).join(', ')
    + ', que juntas son ' + Math.round(suma / c.total * 100) + ' % de las muertas del cultivo.';
});

dash.draw('cons-variedad', (tbl) => {
  const c = window.UB_CONS();
  if (!c) { tbl.replaceChildren(); tbl.createTBody().insertRow().insertCell().textContent = 'Cargando…'; return; }
  const n = (v) => v.toLocaleString('es-CO');
  const filas = c.variedades.map((v) => ({ mort: v.mortalidad,
    celdas: [v.variedad, String(v.nBloques), n(v.camas), n(v.sembradas), n(v.muertas), window.UB_FMT(v.mortalidad) + ' %'] }));
  filas.push({ clase: 'total', mort: null,
    celdas: ['TOTAL', '', n(d3.sum(c.variedades, (v) => v.camas)), n(c.sembradas), n(c.total),
      window.UB_FMT2(c.total / c.sembradas * 100) + ' %'] });
  UB_tabla(tbl, ['Variedad', 'Bloques', 'Camas', 'Plantas sembradas', 'Plantas muertas', 'Mortalidad'], filas,
    (td, f, i) => { if (i === 5 && f.mort != null && f.mort > window.UB_META_MORT) { td.className = 'over'; } });
});

dash.draw('cons-varbloque', (tbl) => {
  const c = window.UB_CONS();
  if (!c) { tbl.replaceChildren(); tbl.createTBody().insertRow().insertCell().textContent = 'Cargando…'; return; }
  const n = (v) => v.toLocaleString('es-CO');
  const filas = c.porBloque.filter((r) => r.muertas > 0).map((r) => ({ mort: r.mortalidad,
    celdas: [r.bloque, r.variedad, n(r.camas), n(r.sembradas), n(r.muertas), window.UB_FMT(r.mortalidad) + ' %'] }));
  UB_tabla(tbl, ['Bloque', 'Variedad', 'Camas', 'Plantas sembradas', 'Plantas muertas', 'Mortalidad'], filas,
    (td, f, i) => { if (i === 5 && f.mort > window.UB_META_MORT) { td.className = 'over'; } });
});

dash.draw('cons-camas', (tbl) => {
  const d = dash.data('camas_oct');
  const c = window.UB_MORT_CAMAS();
  if (d.status !== 'ok' || !d.data || !c) { tbl.replaceChildren(); tbl.createTBody().insertRow().insertCell().textContent = d.status === 'error' ? 'No se pudo cargar' : 'Cargando…'; return; }
  const n = (v) => v.toLocaleString('es-CO');
  const rows = d.data.filter((r) => r.bloque === c.bloque).sort((a, b) => b.muertas - a.muertas);
  if (!rows.length) {
    tbl.replaceChildren();
    const td = tbl.createTBody().insertRow().insertCell();
    td.textContent = 'Este bloque no registró plantas muertas en octubre de 2026.';
    return;
  }
  const filas = rows.map((r) => ({ mort: r.mortalidad,
    celdas: [r.cama, r.nave, r.lado, r.variedad, n(r.sembradas), n(r.muertas), window.UB_FMT(r.mortalidad) + ' %'] }));
  filas.push({ clase: 'total', mort: null,
    celdas: ['TOTAL', '', '', String(rows.length) + ' camas', n(d3.sum(rows, (r) => r.sembradas)), n(d3.sum(rows, (r) => r.muertas)), ''] });
  UB_tabla(tbl, ['Cama', 'Nave', 'Lado', 'Variedad', 'Plantas sembradas', 'Plantas muertas', 'Mortalidad'], filas,
    (td, f, i) => { if (i === 6 && f.mort != null && f.mort > window.UB_META_MORT) { td.className = 'over'; } });
});

window.UB_MORT_LISTA = ['sel-mes', 'mort-fuente', 'mort-tit', 'mort-lead', 'mort-cards', 'mort-anual', 'mort-hbar', 'mort-camas-tit', 'mort-camas', 'cons-tit', 'cons-lead', 'cons-variedad', 'cons-varbloque', 'consc-tit', 'cons-camas', 'edad-lead', 'edad-charts', 'mort-var', 'mort-matriz'];
window.UB_MORT_redraw = () => window.UB_MORT_LISTA.forEach((n) => dash.draw(n));
