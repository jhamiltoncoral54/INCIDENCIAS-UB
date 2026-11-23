/* Capa mínima que reemplaza el entorno de Claude: datos, cálculos y dibujos. */
(function () {
  const datasets = {};
  const calcs = {};
  const drawers = {};

  function runDraw(name) {
    const fn = drawers[name];
    if (!fn) return;
    document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => {
      try { fn(el); } catch (e) { console.error('draw ' + name, e); }
    });
  }

  const dash = {
    colors: ['#2a6fdb', '#d97757', '#1f9d76', '#9a6fb0', '#8c6d3f', '#3d8a8a'],
    calc(name, spec) {
      calcs[name] = { inputs: spec.inputs || [], fn: spec.fn, state: { status: 'loading', data: null } };
    },
    data(name) {
      if (datasets[name]) return datasets[name];
      const c = calcs[name];
      if (!c) return { status: 'error', data: null };
      if (c.state.status === 'ok' || c.state.status === 'error') return c.state;
      const args = c.inputs.map((n) => datasets[n]);
      if (args.some((a) => !a || a.status !== 'ok')) return c.state;
      try {
        c.state = { status: 'ok', data: c.fn(...args.map((a) => a.data)) };
      } catch (e) {
        console.error('calc ' + name, e);
        c.state = { status: 'error', data: null };
      }
      return c.state;
    },
    draw(name, fn) {
      if (fn) drawers[name] = fn;
      runDraw(name);
    },
    setLink(id) {
      try { history.replaceState(null, '', '#' + id); } catch (e) { /* sin historial */ }
    },
    redrawAll() { Object.keys(drawers).forEach(runDraw); }
  };

  window.dash = dash;

  window.UB_cargar = async function (url) {
    try {
      datasets.incidencia = { status: 'ok', data: await d3.csv(url) };
    } catch (e) {
      console.error('no se pudo cargar ' + url, e);
      datasets.incidencia = { status: 'error', data: null };
    }
    dash.redrawAll();
  };

  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => dash.redrawAll(), 250); });
})();
