/* viz-goa.js — GOA di permukaan fitness 3D (three.js):
   belalang melompat dalam busur ke makanan (target);
   panjang busur = c × gaya sosial → makin lama makin pendek. */
(function () {
  const { make3D, rastrigin2, rastriginN, GOA, clamp, ease, lerp, loop, setup } = MH;
  const $ = id => document.getElementById(id);

  /* ---------- plot s(r) (grafik di pelat gelap) ---------- */
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
      if (r0 !== null && r0 < 4) {
        c.fillStyle = 'rgba(244,63,94,.12)'; c.fillRect(X(0), Tp, X(r0) - X(0), H);
        c.fillStyle = 'rgba(52,211,153,.10)'; c.fillRect(X(r0), Tp, X(4) - X(r0), H);
      } else { c.fillStyle = r0 === null ? 'rgba(52,211,153,.10)' : 'rgba(244,63,94,.12)'; c.fillRect(L, Tp, W, H); }
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
        `Zona nyaman di <b>r ≈ ${r0.toFixed(3)}</b>: lebih dekat → <b style="color:var(--coral)">tolak</b>, lebih jauh → <b style="color:var(--goa)">tarik</b>. (Pita abu = rentang jarak 1–4: jarak antar-belalang dinormalisasi ke sini.)`;
    }
    fs.oninput = ls.oninput = draw;
    MH.onSlide('goa', draw, null); addEventListener('resize', draw);
  })();

  /* ---------- adegan lompat di permukaan 3D ---------- */
  const cv = $('cv-goa'), T = 60, LB = -5.12, UB = 5.12;
  let world, goa, playing = true, speed = 1, n = 16, phaseT = 1, iterActive = false, finished = false, lastPh = '';
  let hopGroup, arcGroup, foodGroup;
  let hopMeshes = [], arcLines = [];
  let food;

  const tealMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.5 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, emissive: 0x4a2c05, emissiveIntensity: 0.5 });
  const inkLine = new THREE.LineDashedMaterial({ color: 0x292317, dashSize: 0.12, gapSize: 0.09, transparent: true, opacity: 0.6 });
  const tealLine = new THREE.LineBasicMaterial({ color: 0x0f766e, transparent: true, opacity: 0.6 });

  function reset() { goa = new GOA({ n, D: 2, lb: LB, ub: UB, T, fit: rastriginN }); phaseT = 1; iterActive = false; finished = false; hud(); caption('idle'); if (world) buildAgents(); }
  function spread() { return goa.g.reduce((s, a) => s + Math.hypot(a.x[0] - goa.target.x[0], a.x[1] - goa.target.x[1]), 0) / goa.g.length; }
  function hud() { $('goa-it').textContent = goa.t + '/' + T; $('goa-c').textContent = goa.t ? goa.c.toFixed(3) : '1.000'; $('goa-best').textContent = goa.bestF.toFixed(3); $('goa-spread').textContent = spread().toFixed(2); }
  function startIter() {
    if (goa.t >= T) { finished = true; playing = false; $('goa-play').textContent = '▶ Main'; caption('end'); return; }
    const oldT = goa.target.f; goa.prevTargetX = goa.target.x.slice(); goa.step(); goa.improved = goa.target.f < oldT - 1e-12; phaseT = 0; iterActive = true;
  }
  const phaseOf = p => (p < 0.4 ? 'force' : p < 0.85 ? 'jump' : 'target');
  function caption(ph) {
    const el = $('goa-cap'), k = goa.t;
    if (ph === 'idle') el.innerHTML = '<b>Siap.</b> Permukaan 3D = fungsi fitness — <b>semakin rendah semakin bagus</b>. Titik teal = <b>belalang</b>, makanan emas = <b>target</b>. <b>Seret untuk memutar kamera.</b> Tekan <b>Main</b>.';
    else if (ph === 'force') el.innerHTML = `<b>Iterasi ${k} · ① Gaya sosial.</b> Belalang yang terlalu rapat saling <b style="color:var(--coral)">menolak</b>, yang terlalu jauh saling <b style="color:var(--goa)">menarik</b> lewat s(r). Busur putus-putus = rencana lompatan, panjangnya memakai <b>c = ${goa.c.toFixed(3)}</b>.`;
    else if (ph === 'jump') el.innerHTML = `<b>Iterasi ${k} · ② Melompat.</b> Posisi baru = <b>target + c·(gaya sosial)</b>. Karena c mengecil tiap iterasi, <b>busur lompatan makin pendek</b> — kawanan merapat ke target (eksploitasi).`;
    else if (ph === 'target') el.innerHTML = `<b>Iterasi ${k} · ③ Makanan pindah.</b> ${goa.improved ? 'Ada posisi lebih baik → <b style="color:var(--alo)">makanan pindah ke sana</b>.' : 'Tidak ada yang lebih baik → makanan tetap.'} f terbaik = <b>${goa.bestF.toFixed(3)}</b>.`;
    else if (ph === 'end') el.innerHTML = `<b>Selesai (${T} iterasi).</b> Kawanan terkumpul di sekitar makanan; f terbaik = <b>${goa.bestF.toFixed(4)}</b>. Perhatikan: GOA bisa saja berhenti di lembah lokal — itu sifat stokastiknya. Tekan <b>Reset</b> untuk mencoba lagi.`;
  }

  function buildAgents() {
    [hopGroup, arcGroup].forEach(g => { if (g) world.scene.remove(g); });
    hopGroup = new THREE.Group(); arcGroup = new THREE.Group();
    world.scene.add(hopGroup, arcGroup);
    hopMeshes = []; arcLines = [];
    for (let i = 0; i < goa.n; i++) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(world.R * 0.032, 12, 10), tealMat);
      hopGroup.add(h); hopMeshes.push(h);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 21 }, () => new THREE.Vector3())
      ), inkLine.clone());
      arcGroup.add(line); arcLines.push(line);
    }
    if (!food) {
      food = new THREE.Mesh(new THREE.SphereGeometry(world.R * 0.045, 16, 12), goldMat);
      world.scene.add(food);
    }
  }

  function updateScene() {
    const ph = iterActive ? phaseOf(phaseT) : 'idle';
    for (let i = 0; i < hopMeshes.length; i++) {
      const a = goa.prev[i], b = goa.g[i].x;
      const fa = rastrigin2(a[0], a[1]), fb = rastrigin2(b[0], b[1]);
      const lift = Math.min(world.H * 0.6, world.R * 0.1 + dist2(a, b) * goa.c * 0.14);
      let q = ph === 'force' ? 0 : ph === 'jump' ? ease((phaseT - 0.4) / 0.45) : 1;
      const wx = lerp(world.worldX(a[0]), world.worldX(b[0]), q);
      const wz = lerp(world.worldZ(a[1]), world.worldZ(b[1]), q);
      const wy = lerp(world.heightAt(a[0], a[1]), world.heightAt(b[0], b[1]), q) + Math.sin(clamp(q, 0, 1) * Math.PI) * lift + world.R * 0.025;
      hopMeshes[i].position.set(wx, wy, wz);
      // busur lintasan
      const pts = [];
      for (let t = 0; t <= 20; t++) {
        const tt = t / 20;
        const px = lerp(world.worldX(a[0]), world.worldX(b[0]), tt);
        const pz = lerp(world.worldZ(a[1]), world.worldZ(b[1]), tt);
        const py = lerp(world.heightAt(a[0], a[1]), world.heightAt(b[0], b[1]), tt) + Math.sin(tt * Math.PI) * lift;
        pts.push(new THREE.Vector3(px, py, pz));
      }
      arcLines[i].geometry.setFromPoints(pts);
      arcLines[i].computeLineDistances();
      arcLines[i].visible = iterActive && (ph === 'jump' || (ph === 'force' && $('goa-forces').checked));
      arcLines[i].material.opacity = ph === 'jump' ? 0.85 : 0.45;
    }
    // makanan (target)
    let fx = goa.target.x[0], fz = goa.target.x[1];
    if (iterActive && phaseT < 0.85 && goa.prevTargetX) {
      const q = clamp(phaseT / 0.85, 0, 1);
      fx = lerp(goa.prevTargetX[0], goa.target.x[0], q);
      fz = lerp(goa.prevTargetX[1], goa.target.x[1], q);
    }
    food.position.set(world.worldX(fx), world.heightAt(fx, fz) + world.R * 0.05, world.worldZ(fz));
    const pulse = 1 + Math.sin(performance.now() / 300) * 0.12;
    food.scale.setScalar(pulse);
  }
  function dist2(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }

  const L = loop(dt => {
    if (playing && !finished) {
      if (!iterActive || phaseT >= 1) startIter();
      if (!finished) {
        phaseT = Math.min(1, phaseT + dt / (2000 / speed));
        const ph = phaseOf(phaseT === 1 ? 0.99 : phaseT); if (ph !== lastPh) { lastPh = ph; caption(ph); if (ph === 'target') hud(); }
        $('goa-ph').style.width = phaseT * 100 + '%';
      }
    }
    if (world) { updateScene(); world.render(); }
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
  MH.onSlide('goa-viz', () => {
    if (!world) { world = make3D(cv, rastrigin2, LB, UB); }
    if (!goa) reset();
    buildAgents();
    world.resize();
    L.start();
  }, () => L.stop());
})();
