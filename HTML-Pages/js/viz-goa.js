/* viz-goa.js — fungsi sosial s(r) + visualisasi Grasshopper Optimization Algorithm */
(function () {
  const { Plot2D, rastrigin2, rastriginN, dot, star, GOA, clamp, ease, loop, setup } = MH;
  const $ = id => document.getElementById(id);

  /* ---------- plot s(r) ---------- */
  (function () {
    const cv = $('cv-s'), fs = $('goa-f'), ls = $('goa-l');
    function draw() {
      const f = +fs.value, l = +ls.value; $('goa-fv').textContent = f.toFixed(2); $('goa-lv').textContent = l.toFixed(2);
      const s = r => f * Math.exp(-r / l) - Math.exp(-r);
      const { ctx: c, w, h } = setup(cv); c.clearRect(0, 0, w, h);
      let mn = 0, mx = 0; for (let r = 0; r <= 4; r += 0.02) { const v = s(r); mn = Math.min(mn, v); mx = Math.max(mx, v); }
      const pad = (mx - mn) * 0.12 + 1e-4; mn -= pad; mx += pad;
      const L = 40, R = 10, Tp = 12, B = 26, W = w - L - R, H = h - Tp - B;
      const X = r => L + (r / 4) * W, Y = v => Tp + (1 - (v - mn) / (mx - mn)) * H;
      const r0 = f < 1 && l > 1 ? -Math.log(f) / (1 - 1 / l) : null;
      // zona
      if (r0 !== null && r0 < 4) {
        c.fillStyle = 'rgba(244,63,94,.12)'; c.fillRect(X(0), Tp, X(r0) - X(0), H);
        c.fillStyle = 'rgba(52,211,153,.10)'; c.fillRect(X(r0), Tp, X(4) - X(r0), H);
      } else { c.fillStyle = r0 === null ? 'rgba(52,211,153,.10)' : 'rgba(244,63,94,.12)'; c.fillRect(L, Tp, W, H); }
      // pita [2,4] yang dipakai kode referensi
      c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(X(1), Tp, X(4) - X(1), H);
      c.strokeStyle = 'rgba(255,255,255,.1)'; c.font = '10px "JetBrains Mono"'; c.fillStyle = 'rgba(226,232,240,.6)'; c.textAlign = 'right'; c.textBaseline = 'middle';
      for (let k = 0; k <= 4; k++) { const v = mn + ((mx - mn) * k) / 4; c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(w - R, Y(v)); c.stroke(); c.fillText(v.toFixed(3), L - 4, Y(v)); }
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(L, Y(0)); c.lineTo(w - R, Y(0)); c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'top'; for (let r = 0; r <= 4; r++) c.fillText(r, X(r), h - B + 6);
      c.fillText('jarak r', L + W / 2, h - 12);
      c.strokeStyle = '#34d399'; c.lineWidth = 2.5; c.beginPath();
      for (let r = 0; r <= 4.001; r += 0.02) r ? c.lineTo(X(r), Y(s(r))) : c.moveTo(X(r), Y(s(r))); c.stroke();
      if (r0 !== null && r0 < 4) { MH.dot(c, X(r0), Y(0), 5, '#fde047', null, '#fde047'); c.fillStyle = '#fde047'; c.textBaseline = 'bottom'; c.fillText('zona nyaman r≈' + r0.toFixed(2), clamp(X(r0), 70, w - 70), Y(0) - 8); }
      c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = 'rgba(244,63,94,.9)'; c.fillText('TOLAK', L + 6, Tp + 4);
      c.textAlign = 'right'; c.fillStyle = 'rgba(52,211,153,.95)'; c.fillText('TARIK', w - R - 6, Tp + 4);
      $('goa-zone').innerHTML = r0 === null ? 'Dengan f ≥ 1 kurva selalu positif: <b>tidak ada zona tolak</b> — belalang hanya saling menarik.' :
        `Zona nyaman di <b>r ≈ ${r0.toFixed(3)}</b>: lebih dekat → <b style="color:#fb7185">tolak</b>, lebih jauh → <b style="color:#34d399">tarik</b>. (Pita abu = rentang jarak 1–4: jarak antar-belalang dinormalisasi ke sini.)`;
    }
    fs.oninput = ls.oninput = draw;
    MH.onSlide('goa', draw, null); addEventListener('resize', draw);
  })();

  /* ---------- visualisasi GOA ---------- */
  const cv = $('cv-goa'), T = 60, LB = -5.12, UB = 5.12;
  let plot, goa, playing = true, speed = 1, n = 16, phaseT = 1, iterActive = false, finished = false, lastPh = '', trails = [];
  function reset() { goa = new GOA({ n, D: 2, lb: LB, ub: UB, T, fit: rastriginN }); phaseT = 1; iterActive = false; finished = false; trails = []; hud(); caption('idle'); }
  function spread() { return goa.g.reduce((s, a) => s + Math.hypot(a.x[0] - goa.target.x[0], a.x[1] - goa.target.x[1]), 0) / goa.g.length; }
  function hud() { $('goa-it').textContent = goa.t + '/' + T; $('goa-c').textContent = goa.t ? goa.c.toFixed(3) : '1.000'; $('goa-best').textContent = goa.bestF.toFixed(3); $('goa-spread').textContent = spread().toFixed(2); }
  function startIter() {
    if (goa.t >= T) { finished = true; playing = false; $('goa-play').textContent = '▶ Main'; caption('end'); return; }
    const oldT = goa.target.f; goa.prevTargetX = goa.target.x.slice(); goa.step(); goa.improved = goa.target.f < oldT - 1e-12; phaseT = 0; iterActive = true;
    if (!$('goa-trail').checked) trails = []; else trails.push(goa.prev.map((p, i) => [p, goa.g[i].x])), trails = trails.slice(-6);
  }
  const phaseOf = p => (p < 0.4 ? 'force' : p < 0.85 ? 'jump' : 'target');
  function caption(ph) {
    const el = $('goa-cap'), k = goa.t;
    if (ph === 'idle') el.innerHTML = '<b>Siap.</b> Titik hijau = <b>belalang</b>, bintang kuning = <b>target</b> (terbaik sejauh ini). Tiap iterasi: hitung gaya sosial → lompat → perbarui target.';
    else if (ph === 'force') el.innerHTML = `<b>Iterasi ${k} · ① Gaya sosial.</b> Tiap belalang menjumlahkan tarik/tolak dari <i>semua</i> belalang lain memakai s(r). Panah merah = vektor gaya sosial c·Σ s(r)·arah (c = <b>${goa.c.toFixed(3)}</b>), digambar dari target T̂ menuju posisi tujuan tiap belalang.`;
    else if (ph === 'jump') el.innerHTML = `<b>Iterasi ${k} · ② Lompat.</b> Posisi baru = <b>target + c·(gaya sosial)</b>. Karena c mengecil, belalang makin merapat ke target (eksploitasi).`;
    else if (ph === 'target') el.innerHTML = `<b>Iterasi ${k} · ③ Perbarui target.</b> ${goa.improved ? 'Ada belalang yang lebih baik → <b style="color:#fde047">target berpindah</b>.' : 'Tidak ada yang lebih baik → target tetap.'} f terbaik = <b>${goa.bestF.toFixed(3)}</b>.`;
    else if (ph === 'end') el.innerHTML = `<b>Selesai (${T} iterasi).</b> Kawanan terkumpul di sekitar target; f terbaik = <b>${goa.bestF.toFixed(4)}</b>. Perhatikan: GOA bisa saja berhenti di lembah lokal — itu sifat stokastiknya. Tekan <b>Reset</b> untuk mencoba lagi.`;
  }
  function draw() {
    const c = plot.begin(), p = plot, ph = iterActive ? phaseOf(phaseT) : 'idle';
    if ($('goa-trail').checked) for (const tr of trails) for (const [a, b] of tr) { c.strokeStyle = 'rgba(167,243,208,.10)'; c.lineWidth = 1; c.beginPath(); c.moveTo(p.px(a[0]), p.py(a[1])); c.lineTo(p.px(b[0]), p.py(b[1])); c.stroke(); }
    for (let i = 0; i < goa.n; i++) {
      let x, y;
      if (!iterActive) { x = goa.g[i].x[0]; y = goa.g[i].x[1]; }
      else {
        const a = goa.prev[i], b = goa.g[i].x, q = ph === 'force' ? 0 : ph === 'jump' ? ease((phaseT - 0.4) / 0.45) : 1;
        x = a[0] + (b[0] - a[0]) * q; y = a[1] + (b[1] - a[1]) * q;
        if (ph === 'force' && $('goa-forces').checked) {
          const S = goa.S[i], sc = Math.min(1, phaseT / 0.3);
          c.strokeStyle = 'rgba(251,113,133,.9)'; c.fillStyle = '#fb7185'; c.lineWidth = 1.6;
          const T0 = goa.prevTargetX, ox = p.px(T0[0]), oy = p.py(T0[1]);   // panah berpangkal di target: tujuan = T + c·ΣS
          const ex = p.px(T0[0] + S[0] * sc), ey = p.py(T0[1] + S[1] * sc); c.beginPath(); c.moveTo(ox, oy); c.lineTo(ex, ey); c.stroke();
          const ang = Math.atan2(ey - oy, ex - ox); c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex - 7 * Math.cos(ang - 0.4), ey - 7 * Math.sin(ang - 0.4)); c.lineTo(ex - 7 * Math.cos(ang + 0.4), ey - 7 * Math.sin(ang + 0.4)); c.fill();
        }
      }
      dot(c, p.px(x), p.py(y), 5, '#a7f3d0', 'rgba(15,23,42,.85)', 'rgba(52,211,153,.8)');
    }
    // target
    const tg = (iterActive && phaseT < 0.85 && goa.prevTargetX) ? goa.prevTargetX : goa.target.x;
    star(c, p.px(tg[0]), p.py(tg[1]), 12, '#fde047', '#fde047');
    if (iterActive && ph === 'target' && goa.improved) { const q = (phaseT - 0.85) / 0.15; c.strokeStyle = 'rgba(253,224,71,' + (1 - q) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(p.px(goa.target.x[0]), p.py(goa.target.x[1]), 10 + q * 26, 0, 6.283); c.stroke(); }
    const gx = p.px(MH.SHIFT[0]), gy = p.py(MH.SHIFT[1]);
    c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 1; c.beginPath(); c.moveTo(gx - 7, gy); c.lineTo(gx + 7, gy); c.moveTo(gx, gy - 7); c.lineTo(gx, gy + 7); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '10px "JetBrains Mono"'; c.textAlign = 'left'; c.fillText('optimum global', gx + 9, gy - 6);
  }
  const L = loop(dt => {
    if (playing && !finished) {
      if (!iterActive || phaseT >= 1) startIter();
      if (!finished) {
        phaseT = Math.min(1, phaseT + dt / (2000 / speed));
        const ph = phaseOf(phaseT === 1 ? 0.99 : phaseT); if (ph !== lastPh) { lastPh = ph; caption(ph); if (ph === 'target') hud(); }
        $('goa-ph').style.width = phaseT * 100 + '%';
      }
    }
    draw();
  });
  $('goa-play').onclick = () => { if (finished) reset(); playing = !playing; $('goa-play').textContent = playing ? '⏸ Jeda' : '▶ Main'; };
  $('goa-step').onclick = () => {
    playing = false; $('goa-play').textContent = '▶ Main'; if (finished) reset();
    if (!iterActive || phaseT >= 1) startIter();
    if (!finished) { phaseT = 1; lastPh = 'target'; hud(); caption('target'); $('goa-ph').style.width = '100%'; }
  };
  $('goa-reset').onclick = () => { reset(); playing = true; $('goa-play').textContent = '⏸ Jeda'; };
  $('goa-speed').oninput = e => { speed = +e.target.value; $('goa-speedv').textContent = speed + '×'; };
  $('goa-n').oninput = e => { n = +e.target.value; $('goa-nv').textContent = n; reset(); };
  MH.onSlide('goa-viz', () => { plot = plot || new Plot2D(cv, rastrigin2, LB, UB); if (!goa) reset(); L.start(); }, () => L.stop());
})();
