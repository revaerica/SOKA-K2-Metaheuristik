/* =========================================================
   core.js — utilitas + implementasi algoritma (ALO, GOA, MALO-ringkas, Random)
   + model cloud task scheduling. Semua visualisasi memakai file ini.
   ========================================================= */
window.MH = (function () {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- canvas helper (hi-dpi) ---------- */
  function setup(cv) {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(10, Math.floor(r.width)), h = Math.max(10, Math.floor(r.height));
    if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  /* ---------- hook slide aktif/nonaktif ---------- */
  const hooks = {};
  function onSlide(id, show, hide) { hooks[id] = { show, hide }; }
  function emit(id) {
    for (const k in hooks) if (k !== id && hooks[k].hide) hooks[k].hide();
    if (hooks[id] && hooks[id].show) hooks[id].show();
  }
  function loop(fn) {
    let raf = 0, last = 0, on = false;
    function tick(ts) {
      if (!on) return;
      const dt = Math.min(64, ts - (last || ts)); last = ts;
      fn(dt, ts);
      raf = requestAnimationFrame(tick);
    }
    return {
      start() { if (on) return; on = true; last = 0; raf = requestAnimationFrame(tick); },
      stop() { on = false; cancelAnimationFrame(raf); },
      get running() { return on; }
    };
  }

  /* ---------- landscape 2D (Rastrigin yang digeser) ---------- */
  const SHIFT = [1.5, -1.0];
  function rastrigin2(x, y) {
    const a = x - SHIFT[0], b = y - SHIFT[1];
    return 20 + a * a + b * b - 10 * (Math.cos(2 * Math.PI * a) + Math.cos(2 * Math.PI * b));
  }
  const rastriginN = x => rastrigin2(x[0], x[1]);

  function makeHeat(fn, lb, ub, res = 150) {
    const c = document.createElement('canvas'); c.width = c.height = res;
    const g = c.getContext('2d'); const im = g.createImageData(res, res);
    const vals = new Float32Array(res * res); let mx = 0;
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const v = fn(lb + ((i + 0.5) / res) * (ub - lb), ub - ((j + 0.5) / res) * (ub - lb));
      vals[j * res + i] = v; if (v > mx) mx = v;
    }
    const st = [[6, 9, 26], [16, 40, 96], [12, 112, 140], [40, 205, 185], [250, 208, 80]];
    for (let k = 0; k < vals.length; k++) {
      const q = vals[k] / mx, t = Math.pow(q, 0.85), p = t * (st.length - 1);
      const a = Math.min(Math.floor(p), st.length - 2), f = p - a;
      let r = lerp(st[a][0], st[a + 1][0], f), gg = lerp(st[a][1], st[a + 1][1], f), b = lerp(st[a][2], st[a + 1][2], f);
      if ((q * 14) % 1 < 0.07) { r *= 0.72; gg *= 0.72; b *= 0.72; } // garis kontur
      im.data[k * 4] = r; im.data[k * 4 + 1] = gg; im.data[k * 4 + 2] = b; im.data[k * 4 + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return c;
  }

  class Plot2D {
    constructor(cv, fn, lb, ub) { this.cv = cv; this.lb = lb; this.ub = ub; this.heat = makeHeat(fn, lb, ub); }
    begin() {
      const s = setup(this.cv);
      this.ctx = s.ctx; this.w = s.w; this.h = s.h;
      this.size = Math.min(s.w, s.h); this.ox = (s.w - this.size) / 2; this.oy = (s.h - this.size) / 2;
      const c = this.ctx; c.clearRect(0, 0, this.w, this.h);
      c.imageSmoothingEnabled = true;
      c.drawImage(this.heat, this.ox, this.oy, this.size, this.size);
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1;
      c.strokeRect(this.ox + .5, this.oy + .5, this.size - 1, this.size - 1);
      return c;
    }
    px(x) { return this.ox + ((x - this.lb) / (this.ub - this.lb)) * this.size; }
    py(y) { return this.oy + (1 - (y - this.lb) / (this.ub - this.lb)) * this.size; }
    len(d) { return (d / (this.ub - this.lb)) * this.size; }
  }

  function dot(c, x, y, r, fill, stroke, glow) {
    c.save();
    if (glow) { c.shadowColor = glow; c.shadowBlur = 14; }
    c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fillStyle = fill; c.fill();
    if (stroke) { c.lineWidth = 1.5; c.strokeStyle = stroke; c.stroke(); }
    c.restore();
  }
  function star(c, x, y, r, fill, glow) {
    c.save(); if (glow) { c.shadowColor = glow; c.shadowBlur = 18; }
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fillStyle = fill; c.fill(); c.restore();
  }
  function tri(c, x, y, r, fill, stroke, glow) { // "pit" antlion
    c.save(); if (glow) { c.shadowColor = glow; c.shadowBlur = 14; }
    c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.9, y + r * 0.7); c.lineTo(x - r * 0.9, y + r * 0.7); c.closePath();
    c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = 1.5; c.strokeStyle = stroke; c.stroke(); } c.restore();
  }

  /* =======================================================
     ALO — Ant Lion Optimizer (Mirjalili, 2015)
     ======================================================= */
  class ALO {
    constructor(o) {
      Object.assign(this, { n: 20, D: 2, lb: -5.12, ub: 5.12, T: 100, W: 40, keepPaths: false, fit: null }, o);
      this.t = 0; this.hist = [];
      this.al = [];
      for (let i = 0; i < this.n; i++) { const x = Array.from({ length: this.D }, () => rnd(this.lb, this.ub)); this.al.push({ x, f: this.fit(x) }); }
      this.al.sort((a, b) => a.f - b.f);
      this.elite = { x: this.al[0].x.slice(), f: this.al[0].f };
      this.ants = []; this.paths = []; this.sel = []; this.prevAl = this.al.map(a => ({ x: a.x.slice(), f: a.f })); this.replaced = [];
      this.I = 1; this.hist.push(this.elite.f);
    }
    get bestF() { return this.elite.f; }
    get bestX() { return this.elite.x; }
    ratio() {
      const r = this.t / this.T; let w = 0;
      if (r > 0.1) w = 2; if (r > 0.5) w = 3; if (r > 0.75) w = 4; if (r > 0.9) w = 5; if (r > 0.95) w = 6;
      return w ? 1 + Math.pow(10, w) * r : 1;
    }
    roulette() {
      const f = this.al.map(a => a.f), mx = Math.max(...f), mn = Math.min(...f);
      const w = f.map(v => mx - v + 0.05 * (mx - mn) + 1e-12);
      let s = w.reduce((a, b) => a + b, 0), r = Math.random() * s;
      for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
      return w.length - 1;
    }
    walk(c, d) {
      const W = this.W, X = new Array(W + 1); X[0] = 0;
      for (let k = 1; k <= W; k++) X[k] = X[k - 1] + (Math.random() < 0.5 ? -1 : 1);
      let a = 0, b = 0; for (const v of X) { if (v < a) a = v; if (v > b) b = v; }
      if (b === a) return X.map(() => c);
      const m = (d - c) / (b - a); return X.map(v => (v - a) * m + c);
    }
    step() {
      this.t++;
      const I = (this.I = this.ratio()), lbt = this.lb / I, ubt = this.ub / I, D = this.D, W = this.W;
      this.prevAl = this.al.map(a => ({ x: a.x.slice(), f: a.f }));
      const ants = [], paths = [], sel = [];
      for (let i = 0; i < this.n; i++) {
        const j = this.roulette(); sel.push(j);
        const A = this.al[j].x, E = this.elite.x;
        const fin = new Array(D), path = this.keepPaths ? Array.from({ length: W + 1 }, () => new Array(D)) : null;
        for (let d = 0; d < D; d++) {
          const ca = (Math.random() < 0.5 ? lbt : -lbt) + A[d], da = (Math.random() >= 0.5 ? ubt : -ubt) + A[d];
          const ce = (Math.random() < 0.5 ? lbt : -lbt) + E[d], de = (Math.random() >= 0.5 ? ubt : -ubt) + E[d];
          const wa = this.walk(ca, da), we = this.walk(ce, de);
          if (path) for (let k = 0; k <= W; k++) path[k][d] = clamp((wa[k] + we[k]) / 2, this.lb, this.ub);
          fin[d] = clamp((wa[W] + we[W]) / 2, this.lb, this.ub);
        }
        ants.push({ x: fin, f: this.fit(fin) }); if (path) paths.push(path);
      }
      this.ants = ants; this.paths = paths; this.sel = sel;
      this.merge(ants);
      return this;
    }
    merge(ants) {
      const all = this.al.map(a => ({ ...a, ant: false })).concat(ants.map(a => ({ ...a, ant: true })));
      all.sort((a, b) => a.f - b.f);
      const keep = all.slice(0, this.n);
      this.replaced = keep.filter(k => k.ant).map(k => k.x.slice());
      this.al = keep.map(k => ({ x: k.x, f: k.f }));
      if (this.al[0].f < this.elite.f) this.elite = { x: this.al[0].x.slice(), f: this.al[0].f };
      this.hist.push(this.elite.f);
    }
  }

  /* MALO-ringkas: ALO + Differential Evolution berbasis elite sebagai local search
     (ide dari Abualigah & Diabat, 2021 — implementasi ilustratif, bukan replikasi paper) */
  class MALO extends ALO {
    step() {
      super.step();
      const n = this.al.length, F = 0.5, CR = 0.8, D = this.D;
      for (let i = 0; i < n; i++) {
        let r1 = (Math.random() * n) | 0, r2 = (Math.random() * n) | 0;
        const trial = this.al[i].x.slice(), jr = (Math.random() * D) | 0;
        for (let d = 0; d < D; d++) if (Math.random() < CR || d === jr)
          trial[d] = clamp(this.elite.x[d] + F * (this.al[r1].x[d] - this.al[r2].x[d]), this.lb, this.ub);
        const f = this.fit(trial);
        if (f < this.al[i].f) this.al[i] = { x: trial, f };
      }
      this.al.sort((a, b) => a.f - b.f);
      if (this.al[0].f < this.elite.f) this.elite = { x: this.al[0].x.slice(), f: this.al[0].f };
      this.hist[this.hist.length - 1] = this.elite.f;
      return this;
    }
  }

  /* =======================================================
     GOA — Grasshopper Optimization Algorithm (Saremi dkk., 2017)
     ======================================================= */
  class GOA {
    constructor(o) {
      Object.assign(this, { n: 20, D: 2, lb: -5.12, ub: 5.12, T: 100, cmax: 1, cmin: 0.00004, f: 0.5, l: 1.5, fit: null }, o);
      this.t = 0; this.hist = [];
      this.g = [];
      for (let i = 0; i < this.n; i++) { const x = Array.from({ length: this.D }, () => rnd(this.lb, this.ub)); this.g.push({ x, f: this.fit(x) }); }
      const b = this.g.reduce((m, a) => (a.f < m.f ? a : m), this.g[0]);
      this.target = { x: b.x.slice(), f: b.f };
      this.c = this.cmax; this.S = []; this.hist.push(this.target.f);
    }
    get bestF() { return this.target.f; }
    get bestX() { return this.target.x; }
    s(r) { return this.f * Math.exp(-r / this.l) - Math.exp(-r); }
    step() {
      this.t++;
      const c = (this.c = this.cmax - (this.t * (this.cmax - this.cmin)) / this.T), D = this.D, n = this.n;
      const cur = this.g.map(a => a.x), S = [], nxt = [], maxD = (this.ub - this.lb) * Math.sqrt(D);
      for (let i = 0; i < n; i++) {
        const sum = new Array(D).fill(0);
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          let d2 = 0; for (let d = 0; d < D; d++) { const q = cur[j][d] - cur[i][d]; d2 += q * q; }
          const dist = Math.sqrt(d2), r = Math.min(4, 1 + 3 * dist / maxD);   // jarak dinormalisasi ke [1,4] (Saremi dkk., 2017)
          const coef = ((this.ub - this.lb) * c / 2) * this.s(r) / (dist + 1e-12);
          for (let d = 0; d < D; d++) sum[d] += coef * (cur[j][d] - cur[i][d]);
        }
        const x = new Array(D);
        for (let d = 0; d < D; d++) { sum[d] *= c; x[d] = clamp(sum[d] + this.target.x[d], this.lb, this.ub); }
        S.push(sum); nxt.push({ x, f: this.fit(x) });
      }
      this.S = S; this.prev = cur; this.g = nxt;
      for (const a of nxt) if (a.f < this.target.f) this.target = { x: a.x.slice(), f: a.f };
      this.hist.push(this.target.f);
      return this;
    }
  }

  /* Random search (pembanding) */
  class RandomSearch {
    constructor(o) {
      Object.assign(this, { n: 20, D: 2, lb: 0, ub: 1, T: 100, fit: null }, o);
      this.t = 0; this.hist = []; this.best = { x: null, f: Infinity }; this.sample(); this.hist.push(this.best.f);
    }
    get bestF() { return this.best.f; } get bestX() { return this.best.x; }
    sample() { for (let i = 0; i < this.n; i++) { const x = Array.from({ length: this.D }, () => rnd(this.lb, this.ub)); const f = this.fit(x); if (f < this.best.f) this.best = { x, f }; } }
    step() { this.t++; this.sample(); this.hist.push(this.best.f); return this; }
  }

  /* =======================================================
     Model cloud task scheduling
     ======================================================= */
  function makeProblem(nT, nV, seed = 7) {
    const r = mulberry(seed), sp = [1000, 1500, 2000, 2500, 3000, 4000];
    return {
      nT, nV,
      len: Array.from({ length: nT }, () => Math.round(2000 + r() * 18000)),   // panjang tugas (MI)
      spd: Array.from({ length: nV }, (_, k) => sp[Math.floor(r() * sp.length)])  // kecepatan VM (MIPS)
    };
  }
  const decode = (p, x) => x.map(v => Math.min(p.nV - 1, Math.max(0, Math.floor(v))));
  function evalSched(p, a) {
    const load = new Array(p.nV).fill(0);
    for (let j = 0; j < p.nT; j++) load[a[j]] += p.len[j] / p.spd[a[j]];
    const mk = Math.max(...load), sum = load.reduce((s, v) => s + v, 0);
    return { mk, util: sum / (p.nV * mk), load };
  }
  const schedFit = p => x => evalSched(p, decode(p, x)).mk;
  const roundRobin = p => Array.from({ length: p.nT }, (_, j) => j % p.nV);

  const PAL = ['#38bdf8', '#fbbf24', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf', '#f87171', '#a3e635', '#60a5fa', '#e879f9', '#facc15'];

  function drawGantt(cv, p, a, opt = {}) {
    const { ctx: c, w, h } = setup(cv); c.clearRect(0, 0, w, h);
    const ev = evalSched(p, a), padL = 40, padR = 14, padT = 8, padB = 22;
    const rows = p.nV, rowH = (h - padT - padB) / rows, scale = opt.maxT || ev.mk * 1.1, W = w - padL - padR;
    c.font = '11px "JetBrains Mono", monospace'; c.textBaseline = 'middle';
    for (let k = 0; k < rows; k++) {
      const y = padT + k * rowH;
      c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(padL, y + 2, W, rowH - 4);
      c.fillStyle = 'rgba(226,232,240,.75)'; c.textAlign = 'right'; c.fillText('VM' + (k + 1), padL - 6, y + rowH / 2);
      let t = 0;
      for (let j = 0; j < p.nT; j++) if (a[j] === k) {
        const dur = p.len[j] / p.spd[k], x0 = padL + (t / scale) * W, ww = Math.max(1, (dur / scale) * W);
        c.fillStyle = PAL[j % PAL.length]; c.globalAlpha = 0.88; c.fillRect(x0, y + 3, ww - 1, rowH - 6); c.globalAlpha = 1;
        if (ww > 18 && rowH > 14) { c.fillStyle = '#04101f'; c.textAlign = 'center'; c.fillText(j + 1, x0 + ww / 2, y + rowH / 2); }
        t += dur;
      }
    }
    const xm = padL + (ev.mk / scale) * W;
    c.strokeStyle = '#f43f5e'; c.setLineDash([5, 4]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(xm, padT - 2); c.lineTo(xm, h - padB); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#fb7185'; c.textAlign = xm > w - 90 ? 'right' : 'left'; c.fillText('makespan ' + ev.mk.toFixed(1) + ' s', xm + (xm > w - 90 ? -4 : 4), h - 9);
    c.fillStyle = 'rgba(226,232,240,.5)'; c.textAlign = 'left'; c.fillText('0 s', padL, h - 9);
    return ev;
  }

  function drawLines(cv, series, opt = {}) { // grafik konvergensi
    const { ctx: c, w, h } = setup(cv); c.clearRect(0, 0, w, h);
    const padL = 48, padR = 12, padT = 12, padB = 24, W = w - padL - padR, H = h - padT - padB;
    let mn = Infinity, mx = -Infinity, L = opt.T || 1;
    for (const s of series) for (const v of s.data) { if (v < mn) mn = v; if (v > mx) mx = v; L = Math.max(L, s.data.length - 1); }
    if (opt.base) { mx = Math.max(mx, opt.base.v); mn = Math.min(mn, opt.base.v); }
    const pad = (mx - mn) * 0.08 || 1; mn -= pad; mx += pad;
    const X = i => padL + (i / L) * W, Y = v => padT + (1 - (v - mn) / (mx - mn)) * H;
    c.font = '11px "JetBrains Mono", monospace'; c.strokeStyle = 'rgba(255,255,255,.08)'; c.fillStyle = 'rgba(226,232,240,.55)';
    c.textAlign = 'right'; c.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) { const v = mn + ((mx - mn) * k) / 4, y = Y(v); c.beginPath(); c.moveTo(padL, y); c.lineTo(w - padR, y); c.stroke(); c.fillText(v.toFixed(opt.dec ?? 1), padL - 6, y); }
    c.textAlign = 'center'; c.fillText('iterasi →', padL + W / 2, h - 8);
    if (opt.base) { c.strokeStyle = 'rgba(148,163,184,.8)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(padL, Y(opt.base.v)); c.lineTo(w - padR, Y(opt.base.v)); c.stroke(); c.setLineDash([]); c.fillStyle = 'rgba(148,163,184,.95)'; c.textAlign = 'right'; c.fillText(opt.base.label, w - padR, Y(opt.base.v) - 8); }
    for (const s of series) {
      c.strokeStyle = s.color; c.lineWidth = s.w || 2.2; c.beginPath();
      s.data.forEach((v, i) => (i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)))); c.stroke();
      const lv = s.data[s.data.length - 1]; dot(c, X(s.data.length - 1), Y(lv), 3.5, s.color, null, s.color);
    }
  }

  return { clamp, rnd, lerp, ease, mulberry, setup, onSlide, emit, loop, rastrigin2, rastriginN, SHIFT, Plot2D, dot, star, tri,
    ALO, MALO, GOA, RandomSearch, makeProblem, decode, evalSched, schedFit, roundRobin, drawGantt, drawLines, PAL };
})();
