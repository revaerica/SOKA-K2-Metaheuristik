/* viz-sched.js — cloud task scheduling: kalkulator ruang pencarian, demo encoding, arena ALO vs GOA */
(function () {
  const { makeProblem, decode, evalSched, schedFit, roundRobin, drawGantt, drawLines, ALO, GOA, MALO, RandomSearch, PAL, loop, rnd } = MH;
  const $ = id => document.getElementById(id);

  /* ============ 1) Ledakan kemungkinan jadwal ============ */
  (function () {
    const sn = $('sp-n'), sv = $('sp-v');
    function upd() {
      const n = +sn.value, m = +sv.value; $('sp-nv').textContent = n; $('sp-vv').textContent = m;
      const lg = n * Math.log10(m); let txt;
      if (lg < 15) txt = Math.round(Math.pow(m, n)).toLocaleString('id-ID');
      else { const e = Math.floor(lg), mant = Math.pow(10, lg - e); txt = mant.toFixed(2).replace('.', ',') + ' × 10^' + e; }
      $('sp-out').textContent = txt;
      $('sp-note').innerHTML = lg > 80 ? 'Lebih banyak dari jumlah atom di alam semesta teramati (≈10<sup>80</sup>)!' :
        lg > 17 ? 'Jika 1 jadwal dicek per nanodetik, butuh <b>lebih dari umur alam semesta</b>.' :
        lg > 9 ? 'Sudah terlalu besar untuk dicoba satu per satu.' : 'Masih bisa dihitung komputer — tapi lihat apa yang terjadi saat n bertambah.';
    }
    sn.oninput = sv.oninput = upd; upd();
  })();

  /* ============ 2) Demo encoding: 8 tugas, 3 VM ============ */
  (function () {
    const P = makeProblem(8, 3, 11), V = P.nV, cv = $('cv-map');
    let x, runner = null;
    const maxT = Math.max(evalSched(P, roundRobin(P)).mk * 1.7, 10);
    const rand = () => Array.from({ length: P.nT }, () => rnd(0, V));
    function render() {
      const a = decode(P, x), ev = evalSched(P, a);
      $('map-chips').innerHTML = a.map((k, j) => `<span class="chip" data-j="${j}" style="background:${PAL[j]}">T${j + 1}<small style="opacity:.7">${(P.len[j] / 1000).toFixed(1)}k</small> → VM${k + 1}</span>`).join('');
      $('map-vec').innerHTML = 'x&nbsp;&nbsp;= [' + x.map(v => v.toFixed(2)).join(', ') + ']<br>⌊x⌋ = [' + a.join(', ') + ']  <span style="color:#94a3b8">(0 = VM1, 1 = VM2, 2 = VM3)</span>';
      $('map-stat').innerHTML = `makespan <b style="color:#fb7185">${ev.mk.toFixed(2)} s</b> · utilization <b style="color:#34d399">${(ev.util * 100).toFixed(0)}%</b>`;
      $('map-info').textContent = 'Kecepatan: ' + P.spd.map((s, k) => `VM${k + 1}=${s} MIPS`).join(' · ') + '  |  panjang tugas dalam ribuan MI';
      drawGantt(cv, P, a, { maxT });
    }
    $('map-chips').addEventListener('click', e => {
      const ch = e.target.closest('.chip'); if (!ch) return; stop();
      const j = +ch.dataset.j; x[j] = ((Math.floor(x[j]) + 1) % V) + 0.5; render();
    });
    function stop() { if (runner) { clearInterval(runner); runner = null; } }
    function run(Cls) {
      stop(); const alg = new Cls({ n: 12, D: P.nT, lb: 0, ub: V, T: 45, fit: schedFit(P) }); x = rand(); render();
      runner = setInterval(() => { alg.step(); x = alg.bestX.slice(); render(); if (alg.t >= 45) stop(); }, 110);
    }
    $('map-alo').onclick = () => run(ALO); $('map-goa').onclick = () => run(GOA);
    $('map-reset').onclick = () => { stop(); x = rand(); render(); };
    MH.onSlide('encode', () => { if (!x) x = rand(); render(); }, stop);
    addEventListener('resize', () => x && render());
  })();

  /* ============ 3) Arena ============ */
  (function () {
    const cvC = $('cv-conv'), cvG = $('cv-gantt'), ids = ['ar-t', 'ar-v', 'ar-it', 'ar-n'];
    let P, seed = 5, A = null, running = false, sel = 'alo', per = 1, started = false;
    const COL = { alo: '#fbbf24', goa: '#34d399', malo: '#f472b6', rnd: '#64748b' }, NAME = { alo: 'ALO', goa: 'GOA', malo: 'MALO-ringkas', rnd: 'Random', rr: 'Round-Robin' };
    const val = id => +$(id).value;
    function labels() { ids.forEach(i => $(i + 'v').textContent = $(i).value); }

    function build() {
      labels(); const nT = val('ar-t'), nV = val('ar-v'), T = val('ar-it'), n = val('ar-n');
      P = makeProblem(nT, nV, seed); const fit = schedFit(P), o = { n, D: nT, lb: 0, ub: nV, T, fit };
      A = { alo: new ALO(o), goa: new GOA(o), malo: new MALO(o), rnd: new RandomSearch(o), T };
      A.rr = roundRobin(P); A.rrEv = evalSched(P, A.rr); A.lb = P.len.reduce((a, b) => a + b, 0) / P.spd.reduce((a, b) => a + b, 0); per = Math.max(1, Math.ceil(T / 160));
      $('ar-ph').style.width = '0%'; running = false; $('ar-run').textContent = '▶ Jalankan'; redraw();
    }
    function bestAssign(k) { return k === 'rr' ? A.rr : decode(P, A[k].bestX); }
    function redraw() {
      const series = ['rnd', 'goa', 'malo', 'alo'].map(k => ({ data: A[k].hist, color: COL[k], w: k === 'rnd' ? 1.6 : 2.4 }));
      drawLines(cvC, series, { T: A.T, base: { v: A.lb, label: 'batas bawah ideal ' + A.lb.toFixed(1) + ' s' }, dec: 1 });
      const ev = drawGantt(cvG, P, bestAssign(sel), { maxT: A.rrEv.mk * 1.12 });
      const rows = [['rr', A.rrEv]].concat(['rnd', 'goa', 'alo', 'malo'].map(k => [k, evalSched(P, decode(P, A[k].bestX))]));
      const best = Math.min(...rows.map(r => r[1].mk));
      $('ar-tb').innerHTML = rows.map(([k, e]) => `<tr style="${e.mk === best ? 'background:rgba(52,211,153,.10)' : ''}"><td><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${COL[k] || '#94a3b8'};margin-right:6px"></i>${NAME[k]}</td><td>${e.mk.toFixed(1)} s</td><td>${(e.util * 100).toFixed(0)}%</td><td style="color:${e.mk < A.rrEv.mk ? '#34d399' : '#94a3b8'}">${k === 'rr' ? '—' : '−' + (((A.rrEv.mk - e.mk) / A.rrEv.mk) * 100).toFixed(0) + '%'}</td></tr>`).join('');
    }
    const L = loop(() => {
      if (!running) return;
      for (let i = 0; i < per && A.alo.t < A.T; i++) { A.alo.step(); A.goa.step(); A.malo.step(); A.rnd.step(); }
      $('ar-ph').style.width = (A.alo.t / A.T) * 100 + '%'; redraw();
      if (A.alo.t >= A.T) { running = false; $('ar-run').textContent = '↻ Ulangi'; }
    });
    $('ar-run').onclick = () => {
      if (A.alo.t >= A.T) build();
      running = !running; $('ar-run').textContent = running ? '⏸ Jeda' : '▶ Lanjut';
    };
    $('ar-new').onclick = () => { seed = (Math.random() * 1e6) | 0; build(); running = true; $('ar-run').textContent = '⏸ Jeda'; };
    ids.forEach(i => $(i).oninput = () => { labels(); clearTimeout(build.tm); build.tm = setTimeout(() => { build(); running = true; $('ar-run').textContent = '⏸ Jeda'; }, 250); });
    $('ar-sel').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; sel = b.dataset.k; [...$('ar-sel').children].forEach(x => x.classList.toggle('on', x === b)); redraw(); });
    MH.onSlide('arena', () => { if (!A) build(); if (!started) { started = true; running = true; $('ar-run').textContent = '⏸ Jeda'; } L.start(); }, () => { L.stop(); });
    addEventListener('resize', () => A && redraw());
  })();
})();
