/* viz-intro.js — slide "Apa itu metaheuristik" & "Cara kerja" */
(function () {
  const { setup, rnd, clamp, loop, dot, star } = MH;

  /* ============ DEMO 1D: hill-climbing vs populasi ============ */
  (function () {
    const cv = document.getElementById('cv-land'), msg = document.getElementById('land-msg');
    const g = (x, m, s, a) => a * Math.exp(-Math.pow((x - m) / s, 2));
    const f = x => -g(x, 2, 0.8, 1.0) - g(x, 5, 0.7, 1.4) - g(x, 8, 0.6, 2.4) - g(x, 3.4, 0.3, 0.55) - g(x, 6.4, 0.3, 0.7) + 0.05 * (x - 5) * (x - 5) * 0.2;
    const X0 = 0, X1 = 10, Y0 = -2.9, Y1 = 0.9, GLOBAL = 8;
    let hc, pop, best, t, T = 90, running = false, done = false, acc = 0;

    function reset() {
      hc = { x: rnd(0.4, 6.0), stuck: false, steps: 0 };
      pop = Array.from({ length: 14 }, () => { const x = rnd(0, 10); return { x, f: f(x) }; });
      best = pop.reduce((m, a) => (a.f < m.f ? a : m), pop[0]); best = { x: best.x, f: best.f };
      t = 0; done = false; acc = 0; draw();
    }
    function stepHC() {
      if (hc.stuck) return;
      const s = 0.07, a = clamp(hc.x - s, X0, X1), b = clamp(hc.x + s, X0, X1), fx = f(hc.x);
      if (f(a) < fx && f(a) <= f(b)) hc.x = a; else if (f(b) < fx) hc.x = b; else hc.stuck = true;
      hc.steps++;
    }
    function stepPop() {
      if (t >= T) return; t++;
      const sig = 1.7 * Math.pow(1 - t / T, 1.5) + 0.04;
      for (const a of pop) {
        const nx = clamp(a.x + (Math.random() + Math.random() + Math.random() - 1.5) * 2 * sig + 0.25 * Math.random() * (best.x - a.x), X0, X1), nf = f(nx);
        if (nf < a.f) { a.x = nx; a.f = nf; if (nf < best.f) best = { x: nx, f: nf }; }
      }
    }
    function draw() {
      const { ctx: c, w, h } = setup(cv); c.clearRect(0, 0, w, h);
      const X = x => 10 + ((x - X0) / (X1 - X0)) * (w - 20), Y = y => 12 + (1 - (y - Y0) / (Y1 - Y0)) * (h - 40);
      c.beginPath(); c.moveTo(X(X0), Y(Y1));
      for (let i = 0; i <= 300; i++) { const x = X0 + (i / 300) * (X1 - X0); c.lineTo(X(x), Y(f(x))); }
      c.lineTo(X(X1), Y(Y1)); c.closePath();
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(56,189,248,.05)'); gr.addColorStop(1, 'rgba(56,189,248,.28)');
      c.fillStyle = gr; c.fill();
      c.beginPath(); for (let i = 0; i <= 300; i++) { const x = X0 + (i / 300) * (X1 - X0); i ? c.lineTo(X(x), Y(f(x))) : c.moveTo(X(x), Y(f(x))); }
      c.strokeStyle = 'rgba(226,232,240,.8)'; c.lineWidth = 2; c.stroke();
      star(c, X(GLOBAL), Y(f(GLOBAL)) + 18, 9, '#fbbf24', '#fbbf24');
      for (const a of pop) dot(c, X(a.x), Y(a.f) - 7, 5, '#38bdf8', 'rgba(255,255,255,.6)', '#38bdf8');
      dot(c, X(hc.x), Y(f(hc.x)) - 8, 7, '#fb7185', '#fff', '#fb7185');
      if (hc.stuck) { c.fillStyle = '#fb7185'; c.font = '600 12px "JetBrains Mono"'; c.textAlign = 'center'; c.fillText('terjebak!', X(hc.x), Y(f(hc.x)) - 24); }
    }
    const L = loop(dt => {
      if (!running) { draw(); return; }
      acc += dt;
      while (acc > 55) { acc -= 55; stepHC(); stepHC(); stepPop(); }
      draw();
      if (t >= T && hc.stuck && !done) {
        done = true; running = false; btn.textContent = '▶ Jalankan';
        const ok = Math.abs(best.x - GLOBAL) < 0.5, hcok = Math.abs(hc.x - GLOBAL) < 0.5;
        msg.innerHTML = (hcok ? '<b>Hill-climbing</b> kebetulan mulai dekat lembah terdalam. ' : '<b style="color:#fb7185">Hill-climbing</b> berhenti di lembah dangkal (local optimum). ') +
          (ok ? '<b style="color:#38bdf8">Populasi</b> menemukan lembah terdalam (global optimum) ✔.' : '<b style="color:#38bdf8">Populasi</b> belum tepat di puncak optimum — metaheuristik tidak menjamin optimal, coba lagi.');
      }
    });
    const btn = document.getElementById('land-run');
    btn.onclick = () => { if (done) reset(); running = !running; btn.textContent = running ? '⏸ Jeda' : '▶ Jalankan'; if (running) msg.textContent = 'Agen merah selalu melangkah turun; agen biru menjelajah acak dengan langkah yang makin kecil.'; };
    document.getElementById('land-new').onclick = () => { running = false; btn.textContent = '▶ Jalankan'; msg.innerHTML = 'Tekan <b>Jalankan</b>. Agen merah hanya turun ke lembah terdekat; populasi biru menyebar dulu lalu mengerucut.'; reset(); };
    MH.onSlide('meta', () => { reset(); L.start(); }, () => { L.stop(); running = false; btn.textContent = '▶ Jalankan'; });
    addEventListener('resize', () => draw());
  })();

  /* ============ Alur + eksplorasi → eksploitasi ============ */
  (function () {
    const cv = document.getElementById('cv-flow'), slider = document.getElementById('flow-t'), tv = document.getElementById('flow-tv');
    const bar = document.getElementById('flow-bar'), auto = document.getElementById('flow-auto');
    const steps = [...document.querySelectorAll('#flow-steps .flow-step')];
    const seeds = Array.from({ length: 48 }, () => ({ a: rnd(0, 6.283), r: Math.sqrt(Math.random()), p: rnd(0, 6.283), s: rnd(0.4, 1.2) }));
    let si = 0, stepTimer = 0, tt = 0;
    steps[0].classList.add('on');
    steps.forEach((el, i) => el.addEventListener('click', () => { si = i; stepTimer = 0; mark(); }));
    function mark() { steps.forEach((e, i) => e.classList.toggle('on', i === si)); }

    function draw(time) {
      const t = +slider.value / 100, { ctx: c, w, h } = setup(cv); c.clearRect(0, 0, w, h);
      const cx = w * 0.62, cy = h * 0.5, R0 = Math.min(w, h) * 0.46, R = R0 * Math.pow(1 - t, 1.8) + 5;
      // lingkaran area pencarian
      c.strokeStyle = 'rgba(56,189,248,.35)'; c.setLineDash([5, 5]); c.beginPath(); c.arc(cx, cy, R, 0, 6.283); c.stroke(); c.setLineDash([]);
      const gr = c.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, 'rgba(56,189,248,.18)'); gr.addColorStop(1, 'rgba(56,189,248,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R, 0, 6.283); c.fill();
      for (const s of seeds) {
        const wob = Math.sin(time / 600 * s.s + s.p) * 3;
        const x = cx + Math.cos(s.a) * s.r * R + wob, y = cy + Math.sin(s.a) * s.r * R + Math.cos(time / 700 * s.s + s.p) * 3;
        dot(c, x, y, 4, '#38bdf8', 'rgba(255,255,255,.4)', '#38bdf8');
      }
      star(c, cx, cy, 11, '#fbbf24', '#fbbf24');
      c.fillStyle = 'rgba(226,232,240,.7)'; c.font = '11px "JetBrains Mono"'; c.textAlign = 'left';
      c.fillText('solusi terbaik', cx + 14, cy - 12);
      c.fillText(t < 0.35 ? 'FASE: EKSPLORASI — agen menyebar luas' : t < 0.7 ? 'FASE: PERALIHAN' : 'FASE: EKSPLOITASI — agen merapat', 12, 20);
      bar.style.width = t * 100 + '%'; bar.style.display = 'block';
      tv.textContent = Math.round(t * 100);
    }
    slider.addEventListener('input', () => { auto.checked = false; });
    const L = loop((dt, ts) => {
      stepTimer += dt; if (stepTimer > 1500) { stepTimer = 0; si = (si + 1) % steps.length; mark(); }
      if (auto.checked) { tt += dt / 90; if (tt > 130) tt = 0; slider.value = Math.min(100, tt); }
      draw(ts);
    });
    MH.onSlide('flow', () => L.start(), () => L.stop());
  })();
})();
