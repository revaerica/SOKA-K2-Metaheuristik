/* viz-alo.js — visualisasi Ant Lion Optimizer di atas peta fitness 2D */
(function () {
  const { Plot2D, rastrigin2, rastriginN, dot, star, tri, ALO, clamp, ease, loop } = MH;
  const cv = document.getElementById('cv-alo');
  const $ = id => document.getElementById(id);
  const T = 60, LB = -5.12, UB = 5.12;
  let plot, alo, playing = true, speed = 1, n = 14, phaseT = 1, iterActive = false, finished = false, flash = 0;

  function reset() {
    alo = new ALO({ n, D: 2, lb: LB, ub: UB, T, W: 36, keepPaths: true, fit: rastriginN });
    phaseT = 1; iterActive = false; finished = false; flash = 0; hud(); caption('idle');
  }
  function hud() {
    $('alo-it').textContent = alo.t + '/' + T; $('alo-I').textContent = alo.t ? alo.I.toFixed(alo.I < 100 ? 1 : 0) : '1';
    $('alo-best').textContent = alo.bestF.toFixed(3); $('alo-rep').textContent = alo.replaced ? alo.replaced.length : 0;
  }
  function startIter() {
    if (alo.t >= T) { finished = true; playing = false; $('alo-play').textContent = '▶ Main'; caption('end'); return; }
    alo.step(); phaseT = 0; iterActive = true; flash = 0;
  }
  const phaseOf = p => (p < 0.22 ? 'select' : p < 0.78 ? 'walk' : 'settle');
  function caption(ph) {
    const el = $('alo-cap');
    const k = alo.t;
    if (ph === 'idle') el.innerHTML = '<b>Siap.</b> Segitiga kuning = <b>antlion</b> (solusi bagus). Tekan <b>Main</b>: tiap iterasi punya 3 tahap — pilih antlion → semut berjalan acak → evaluasi &amp; bangun ulang perangkap.';
    else if (ph === 'select') el.innerHTML = `<b>Iterasi ${k} · ① Roulette wheel.</b> Tiap semut (titik putih) dipasangkan dengan satu antlion — yang fitness-nya lebih bagus lebih sering terpilih. Garis kuning = pasangan semut–antlion.`;
    else if (ph === 'walk') el.innerHTML = `<b>Iterasi ${k} · ② Jalan acak.</b> Semut berjalan acak <i>di dalam lingkaran perangkap</i> (rata-rata jalan acak sekitar antlion terpilih &amp; elite). Rasio <b>I = ${alo.I.toFixed(alo.I < 100 ? 1 : 0)}</b> → radius = ub/I, makin lama makin kecil.`;
    else if (ph === 'settle') el.innerHTML = `<b>Iterasi ${k} · ③ Menangkap mangsa.</b> Semut dievaluasi; <b style="color:#2dd4bf">${alo.replaced.length} semut</b> lebih baik dari antlion lama sehingga perangkap dipindah ke posisinya. Elite terbaik: f = <b>${alo.bestF.toFixed(3)}</b>.`;
    else if (ph === 'end') el.innerHTML = `<b>Selesai (${T} iterasi).</b> Semua antlion menumpuk di sekitar lembah terdalam; f terbaik = <b>${alo.bestF.toFixed(4)}</b> (optimum = 0). Tekan <b>Reset</b> untuk ulang dengan populasi acak baru.`;
  }

  function draw() {
    const c = plot.begin(), p = plot, ph = iterActive ? phaseOf(phaseT) : 'idle';
    c.save(); c.beginPath(); c.rect(p.ox, p.oy, p.size, p.size); c.clip();
    const showAl = (iterActive && phaseT < 0.78) ? alo.prevAl : alo.al;
    const walks = $('alo-walks').checked, trap = $('alo-trap').checked;

    // lingkaran perangkap (batas jalan acak) di sekitar antlion terpilih
    if (iterActive && trap && phaseT < 0.9) {
      const r = p.len(Math.max(UB / alo.I, 0.15)), seen = new Set();
      c.save(); c.lineWidth = 1.2;
      for (const j of alo.sel) {
        if (seen.has(j)) continue; seen.add(j);
        const a = alo.prevAl[j].x; c.strokeStyle = 'rgba(251,191,36,.55)'; c.fillStyle = 'rgba(251,191,36,.06)';
        c.beginPath(); c.arc(p.px(a[0]), p.py(a[1]), r, 0, 6.283); c.fill(); c.stroke();
      }
      c.restore();
    }

    // semut
    if (iterActive) {
      const W = alo.paths[0] ? alo.paths[0].length - 1 : 0;
      const wp = clamp((phaseT - 0.22) / 0.56, 0, 1), kf = ph === 'select' ? 0 : ph === 'walk' ? wp * W : W;
      const k = Math.floor(kf), fr = kf - k;
      for (let i = 0; i < alo.ants.length; i++) {
        const path = alo.paths[i]; if (!path) continue;
        if (ph === 'select') { // garis ke antlion terpilih
          const a = alo.prevAl[alo.sel[i]].x, s = path[0];
          c.strokeStyle = 'rgba(251,191,36,' + (0.25 + 0.4 * Math.sin(phaseT / 0.22 * Math.PI)) + ')'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(p.px(s[0]), p.py(s[1])); c.lineTo(p.px(a[0]), p.py(a[1])); c.stroke();
        }
        if (walks && ph !== 'select') {
          c.strokeStyle = ph === 'walk' ? 'rgba(255,255,255,.38)' : 'rgba(255,255,255,.14)'; c.lineWidth = 1; c.beginPath();
          for (let q = 0; q <= k; q++) q ? c.lineTo(p.px(path[q][0]), p.py(path[q][1])) : c.moveTo(p.px(path[q][0]), p.py(path[q][1]));
          const nq = path[Math.min(W, k + 1)]; c.lineTo(p.px(path[k][0] + (nq[0] - path[k][0]) * fr), p.py(path[k][1] + (nq[1] - path[k][1]) * fr)); c.stroke();
        }
        const a0 = path[k], a1 = path[Math.min(W, k + 1)];
        const x = a0[0] + (a1[0] - a0[0]) * fr, y = a0[1] + (a1[1] - a0[1]) * fr;
        dot(c, p.px(x), p.py(y), 3.6, '#f8fafc', 'rgba(15,23,42,.8)');
      }
    }

    // antlion
    for (const a of showAl) tri(c, p.px(a.x[0]), p.py(a.x[1]), 7.5, '#fbbf24', 'rgba(15,23,42,.9)', 'rgba(251,191,36,.7)');
    // antlion baru (hasil swap) berkedip
    if (iterActive && phaseT >= 0.78) {
      const q = (phaseT - 0.78) / 0.22;
      for (const r of alo.replaced) { c.strokeStyle = 'rgba(45,212,191,' + (1 - q) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(p.px(r[0]), p.py(r[1]), 8 + q * 22, 0, 6.283); c.stroke(); dot(c, p.px(r[0]), p.py(r[1]), 4, '#2dd4bf'); }
    }
    // elite
    const el = (iterActive && phaseT < 0.78) ? alo.prevAl[0].x : alo.elite.x;
    star(c, p.px(el[0]), p.py(el[1]), 11, '#f43f5e', '#f43f5e');
    c.restore();
    // optimum global sebenarnya
    c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 1; const gx = p.px(MH.SHIFT[0]), gy = p.py(MH.SHIFT[1]);
    c.beginPath(); c.moveTo(gx - 7, gy); c.lineTo(gx + 7, gy); c.moveTo(gx, gy - 7); c.lineTo(gx, gy + 7); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '10px "JetBrains Mono"'; c.textAlign = 'left'; c.fillText('optimum global', gx + 9, gy - 6);
  }
  function bestOf(list) { return list.reduce((m, a) => (a.f < m.f ? a : m), list[0]).x; }

  let lastPh = '';
  const L = loop(dt => {
    if (playing && !finished) {
      if (!iterActive || phaseT >= 1) startIter();
      if (!finished) {
        phaseT = Math.min(1, phaseT + dt / (2300 / speed));
        const ph = phaseOf(phaseT === 1 ? 0.99 : phaseT);
        if (ph !== lastPh) { lastPh = ph; caption(ph); if (ph === 'settle') hud(); }
        $('alo-ph').style.width = (phaseT * 100) + '%';
      }
    }
    draw();
  });

  $('alo-play').onclick = () => {
    if (finished) { reset(); }
    playing = !playing; $('alo-play').textContent = playing ? '⏸ Jeda' : '▶ Main';
  };
  $('alo-step').onclick = () => {
    playing = false; $('alo-play').textContent = '▶ Main';
    if (finished) reset();
    if (!iterActive || phaseT >= 1) startIter();
    if (!finished) { phaseT = 1; lastPh = 'settle'; hud(); caption('settle'); $('alo-ph').style.width = '100%'; } // loncat ke akhir iterasi
  };
  $('alo-reset').onclick = () => { reset(); playing = true; $('alo-play').textContent = '⏸ Jeda'; };
  $('alo-speed').oninput = e => { speed = +e.target.value; $('alo-speedv').textContent = speed + '×'; };
  $('alo-n').oninput = e => { n = +e.target.value; $('alo-nv').textContent = n; reset(); };

  MH.onSlide('alo-viz', () => { plot = plot || new Plot2D(cv, rastrigin2, LB, UB); if (!alo) reset(); L.start(); }, () => L.stop());
})();
