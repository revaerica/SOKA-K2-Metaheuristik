/* viz-alo.js — ALO di permukaan fitness 3D (three.js):
   semut turun ke lembah, terperangkap dalam lingkaran yang menyempit
   di sekitar antlion; elite = bendera. Seret untuk memutar kamera. */
(function () {
  const { make3D, rastrigin2, rastriginN, dot, star, ALO, clamp, ease, lerp, loop } = MH;
  const cv = document.getElementById('cv-alo');
  const $ = id => document.getElementById(id);
  const T = 60, LB = -5.12, UB = 5.12;
  let world, alo, playing = true, speed = 1, n = 14, phaseT = 1, iterActive = false, finished = false, lastPh = '';
  let antGroup, pitGroup, ringGroup, flashGroup, optGroup;
  let antMeshes = [], pitCones = [], pitRims = [], rings = [], flashMeshes = [];
  let eliteFlag, optFlag;

  const M = {
    ink: new THREE.MeshStandardMaterial({ color: 0x292317, roughness: 0.75 }),
    pit: new THREE.MeshStandardMaterial({ color: 0x0d0b20, roughness: 0.95 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xffb020, roughness: 0.6, emissive: 0x553300, emissiveIntensity: 0.25 }),
    coral: new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.45 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, emissive: 0x4a2c05, emissiveIntensity: 0.5 }),
    teal: new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.5 }),
    inkLine: new THREE.LineBasicMaterial({ color: 0x292317, transparent: true, opacity: 0.35 })
  };

  function reset() {
    alo = new ALO({ n, D: 2, lb: LB, ub: UB, T, W: 36, keepPaths: true, fit: rastriginN });
    phaseT = 1; iterActive = false; finished = false; hud(); caption('idle');
    if (world) buildAgents();
  }
  function hud() {
    $('alo-it').textContent = alo.t + '/' + T; $('alo-I').textContent = alo.t ? alo.I.toFixed(alo.I < 100 ? 1 : 0) : '1';
    $('alo-best').textContent = alo.bestF.toFixed(3); $('alo-rep').textContent = alo.replaced ? alo.replaced.length : 0;
  }
  function startIter() {
    if (alo.t >= T) { finished = true; playing = false; $('alo-play').textContent = '▶ Main'; caption('end'); return; }
    alo.step(); phaseT = 0; iterActive = true;
  }
  const phaseOf = p => (p < 0.22 ? 'select' : p < 0.78 ? 'walk' : 'settle');
  function caption(ph) {
    const el = $('alo-cap');
    const k = alo.t;
    if (ph === 'idle') el.innerHTML = '<b>Siap.</b> Permukaan 3D = fungsi fitness — <b>semakin rendah semakin bagus</b>. Lubang gelap = <b>perangkap antlion</b>, titik gelap = <b>semut</b>, bendera merah = elite. <b>Seret untuk memutar kamera.</b> Tekan <b>Main</b>.';
    else if (ph === 'select') el.innerHTML = `<b>Iterasi ${k} · ① Roulette wheel.</b> Tiap semut dipasangkan dengan satu antlion lewat roulette — yang fitness-nya lebih bagus lebih sering terpilih.`;
    else if (ph === 'walk') el.innerHTML = `<b>Iterasi ${k} · ② Jalan acak.</b> Semut berjalan acak <i>di dalam lingkaran perangkap</i> di sekitar antlion &amp; elite. Rasio <b>I = ${alo.I.toFixed(alo.I < 100 ? 1 : 0)}</b> → lingkaran <i>menyempit</i>: eksplorasi → eksploitasi.`;
    else if (ph === 'settle') el.innerHTML = `<b>Iterasi ${k} · ③ Menangkap mangsa.</b> Semut dievaluasi; <b style="color:var(--goa)">${alo.replaced.length} semut</b> lebih baik dari antlionnya → antlion memindahkan perangkap ke posisi semut itu. Elite: f = <b>${alo.bestF.toFixed(3)}</b>.`;
    else if (ph === 'end') el.innerHTML = `<b>Selesai (${T} iterasi).</b> Semua perangkap berkumpul di lembah terdalam; f terbaik = <b>${alo.bestF.toFixed(4)}</b> (optimum = 0). Tekan <b>Reset</b> untuk ulang.`;
  }

  /* ---------- pool mesh ---------- */
  function buildAgents() {
    [antGroup, pitGroup, ringGroup, flashGroup].forEach(g => { if (g) world.scene.remove(g); });
    antGroup = new THREE.Group(); pitGroup = new THREE.Group(); ringGroup = new THREE.Group(); flashGroup = new THREE.Group();
    world.scene.add(antGroup, pitGroup, ringGroup, flashGroup);
    antMeshes = []; pitCones = []; pitRims = []; rings = []; flashMeshes = [];
    for (let i = 0; i < alo.n; i++) {
      const ant = new THREE.Mesh(new THREE.SphereGeometry(world.R * 0.035, 12, 10), M.ink);
      antGroup.add(ant); antMeshes.push(ant);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 22, 1, true), M.pit);
      cone.rotation.x = Math.PI; pitGroup.add(cone); pitCones.push(cone);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1, world.R * 0.012, 8, 36), M.rim);
      rim.rotation.x = Math.PI / 2; pitGroup.add(rim); pitRims.push(rim);
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 41 }, () => new THREE.Vector3())
      ), M.inkLine);
      ring.visible = false; ringGroup.add(ring); rings.push(ring);
      const fl = new THREE.Mesh(new THREE.SphereGeometry(world.R * 0.03, 10, 8), M.teal);
      fl.visible = false; flashGroup.add(fl); flashMeshes.push(fl);
    }
    // bendera elite: tiang ramping + bola kecil menyala
    eliteFlag = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(world.R * 0.012, world.R * 0.012, world.H * 0.4, 8), M.coral);
    pole.position.y = world.H * 0.2; eliteFlag.add(pole);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(world.R * 0.035, 12, 10), M.coral);
    tip.position.y = world.H * 0.42; eliteFlag.add(tip);
    world.scene.add(eliteFlag);
  }

  function buildStatic() {
    optFlag = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(world.R * 0.016, world.R * 0.016, world.H * 0.5, 8), M.gold);
    pole.position.y = world.H * 0.25; optFlag.add(pole);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(world.R * 0.06), M.gold);
    gem.position.y = world.H * 0.52; optFlag.add(gem);
    world.scene.add(optFlag);
    optFlag.position.set(world.worldX(MH.SHIFT[0]), 0, world.worldZ(MH.SHIFT[1]));
  }

  function updateScene(time) {
    const ph = iterActive ? phaseOf(phaseT) : 'idle';
    const I = alo.I || 1;
    const showAl = (iterActive && phaseT < 0.78) ? alo.prevAl : alo.al;

    // perangkap: bergeser mulus saat settle
    for (let i = 0; i < pitCones.length; i++) {
      let fx = showAl[i] ? showAl[i].x[0] : 0, fz = showAl[i] ? showAl[i].x[1] : 0;
      if (iterActive && phaseT >= 0.78 && alo.prevAl[i] && alo.al[i]) {
        const q = ease((phaseT - 0.78) / 0.22);
        fx = lerp(alo.prevAl[i].x[0], alo.al[i].x[0], q);
        fz = lerp(alo.prevAl[i].x[1], alo.al[i].x[1], q);
      }
      const wx = world.worldX(fx), wz = world.worldZ(fz);
      const sy = world.heightAt(fx, fz);
      const mouth = Math.max(world.R * 0.05, world.R * 0.22 / Math.sqrt(I));
      const depth = Math.min(world.H * 0.7, world.R * 0.16 + world.R * 0.3 / Math.sqrt(I));
      pitCones[i].scale.set(mouth, depth, mouth);
      pitCones[i].position.set(wx, sy - depth / 2 + 0.05, wz);
      pitRims[i].scale.set(mouth * 1.02, mouth * 1.02, 1);
      pitRims[i].position.set(wx, sy + 0.06, wz);
    }
    // NOTE: posisi semut yang akurat dihitung di bawah dari path
    if (iterActive) {
      const W = alo.paths[0] ? alo.paths[0].length - 1 : 0;
      const wp = clamp((phaseT - 0.22) / 0.56, 0, 1), kf = ph === 'select' ? 0 : ph === 'walk' ? wp * W : W;
      const k = Math.floor(kf), fr = kf - k;
      for (let i = 0; i < alo.ants.length; i++) {
        const path = alo.paths[i]; if (!path) continue;
        const a0 = path[Math.min(W, k)], a1 = path[Math.min(W, k + 1)];
        const x = a0[0] + (a1[0] - a0[0]) * fr, y = a0[1] + (a1[1] - a0[1]) * fr;
        const ant = antMeshes[i];
        ant.position.set(world.worldX(x), world.heightAt(x, y) + world.R * 0.03, world.worldZ(y));
        // lingkaran perangkap milik semut ini
        const ring = rings[i];
        if (ph !== 'settle') {
          const src = alo.prevAl[alo.sel[i]];
          if (src) {
            const r = Math.max(UB / I, 0.18), cxw = world.worldX(src.x[0]), czw = world.worldZ(src.x[1]);
            const posAttr = ring.geometry.attributes.position;
            for (let t = 0; t <= 40; t++) {
              const th = (t / 40) * 6.2832, px = src.x[0] + r * Math.cos(th), pz = src.x[1] + r * Math.sin(th);
              posAttr.setXYZ(t, cxw, world.heightAt(px, pz) + 0.03, czw);
            }
            posAttr.needsUpdate = true;
            ring.geometry.computeBoundingSphere();
            ring.visible = true;
          }
        } else ring.visible = false;
      }
    } else {
      for (const r of rings) r.visible = false;
      for (let i = 0; i < antMeshes.length; i++) {
        const a = alo.al[i]; if (!a) continue;
        antMeshes[i].position.set(world.worldX(a.x[0]), world.heightAt(a.x[0], a.x[1]) + world.R * 0.03, world.worldZ(a.x[1]));
      }
    }
    // semut yang menggantikan antlion berkedip teal
    if (iterActive && phaseT >= 0.78) {
      const q = (phaseT - 0.78) / 0.22;
      for (let i = 0; i < alo.replaced.length && i < flashMeshes.length; i++) {
        const r = alo.replaced[i];
        const m = flashMeshes[i];
        m.visible = true;
        m.position.set(world.worldX(r[0]), world.heightAt(r[0], r[1]) + world.R * 0.05 + q * world.R * 0.12, world.worldZ(r[1]));
        m.scale.setScalar(1 + q * 1.2);
      }
      for (let i = alo.replaced.length; i < flashMeshes.length; i++) flashMeshes[i].visible = false;
    } else for (const m of flashMeshes) m.visible = false;
    // bendera elite mengikuti elite
    const el = (iterActive && phaseT < 0.78) ? alo.prevAl[0].x : alo.elite.x;
    eliteFlag.position.set(world.worldX(el[0]), world.heightAt(el[0], el[1]), world.worldZ(el[1]));
  }

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
    if (world) { updateScene(); world.render(); }
  });

  $('alo-play').onclick = () => {
    if (finished) { reset(); }
    playing = !playing; $('alo-play').textContent = playing ? '⏸ Jeda' : '▶ Main';
  };
  $('alo-step').onclick = () => {
    playing = false; $('alo-play').textContent = '▶ Main';
    if (finished) reset();
    if (!iterActive || phaseT >= 1) startIter();
    if (!finished) { phaseT = 1; lastPh = 'settle'; hud(); caption('settle'); $('alo-ph').style.width = '100%'; }
  };
  $('alo-reset').onclick = () => { reset(); playing = true; $('alo-play').textContent = '⏸ Jeda'; };
  $('alo-speed').oninput = e => { speed = +e.target.value; $('alo-speedv').textContent = speed + '×'; };
  $('alo-n').oninput = e => { n = +e.target.value; $('alo-nv').textContent = n; reset(); };

  MH.onSlide('alo-viz', () => { if (!world) { world = make3D(cv, rastrigin2, LB, UB); buildStatic(); } if (!alo) reset(); buildAgents(); world.resize(); L.start(); }, () => L.stop());
})();
