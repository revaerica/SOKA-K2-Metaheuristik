/* main.js — navigasi slide + latar belakang 3D (Three.js) */
(function () {
  const slides = [...document.querySelectorAll('.slide')];
  const dotsEl = document.getElementById('dots');
  let cur = -1;

  slides.forEach((s, i) => {
    const b = document.createElement('button'); b.title = (i + 1) + '. ' + (s.dataset.title || '');
    b.onclick = () => go(i); dotsEl.appendChild(b);
    s.querySelectorAll('.rv').forEach((el, k) => el.style.setProperty('--d', k));
  });

  function go(n) {
    n = Math.max(0, Math.min(slides.length - 1, n));
    if (n === cur) return;
    slides.forEach((s, i) => { s.classList.toggle('active', i === n); s.classList.toggle('prev', i < n); });
    [...dotsEl.children].forEach((d, i) => d.classList.toggle('on', i === n));
    document.getElementById('progress').style.width = ((n + 1) / slides.length) * 100 + '%';
    document.getElementById('counter').textContent = String(n + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    slides[n].scrollTop = 0;
    cur = n; history.replaceState(null, '', '#' + (n + 1));
    MH.emit(slides[n].dataset.id);
    window.dispatchEvent(new CustomEvent('slidechange', { detail: { index: n, theme: slides[n].dataset.theme || 'cy', shape: slides[n].dataset.shape || '0' } }));
  }
  window.goSlide = go;
  window.goSlideId = id => go(slides.findIndex(s => s.dataset.id === id));

  document.getElementById('prev').onclick = () => go(cur - 1);
  document.getElementById('next').onclick = () => go(cur + 1);
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' && e.key.startsWith('Arrow') && e.target.type === 'range') return;
    if (['ArrowRight', 'PageDown'].includes(e.key) || (e.key === ' ' && e.target === document.body)) { e.preventDefault(); go(cur + 1); }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) go(cur - 1);
    else if (e.key === 'Home') go(0); else if (e.key === 'End') go(slides.length - 1);
    else if (e.key === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  });
  let tx = null;
  addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 70) go(cur + (dx < 0 ? 1 : -1)); tx = null; }, { passive: true });

  /* ---------------- latar 3D ---------------- */
  const THEME = { cy: [0.22, 0.74, 0.97], alo: [0.98, 0.75, 0.14], goa: [0.2, 0.83, 0.6] };
  try {
    if (!window.THREE) throw 0;
    const cv = document.getElementById('bg');
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100); cam.position.z = 12;

    const N = 1600, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 6 + Math.random() * 16, th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7; pos[i * 3 + 2] = r * Math.cos(ph) - 4;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pm = new THREE.PointsMaterial({ size: 0.075, color: 0x38bdf8, transparent: true, opacity: 0.85, depthWrite: false });
    const pts = new THREE.Points(g, pm); scene.add(pts);

    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(3, 1), new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0 }));
    wire.position.set(5.2, 0.2, 0); scene.add(wire);
    const wire2 = new THREE.Mesh(new THREE.TorusKnotGeometry(1.5, 0.35, 120, 14), new THREE.MeshBasicMaterial({ color: 0xfbbf24, wireframe: true, transparent: true, opacity: 0 }));
    wire2.position.set(5.2, 0.2, -1); scene.add(wire2);

    let col = [...THEME.cy], tgt = [...THEME.cy], shape = 1, mx = 0, my = 0;
    addEventListener('slidechange', e => { tgt = THEME[e.detail.theme] || THEME.cy; shape = +e.detail.shape; });
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
    function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
    addEventListener('resize', resize); resize();
    const clk = new THREE.Clock();
    (function loop() {
      const t = clk.getElapsedTime();
      for (let i = 0; i < 3; i++) col[i] += (tgt[i] - col[i]) * 0.04;
      pm.color.setRGB(col[0], col[1], col[2]); wire.material.color.setRGB(col[0], col[1], col[2]);
      pts.rotation.y = t * 0.03 + mx * 0.3; pts.rotation.x = my * 0.2;
      wire.rotation.x = t * 0.2; wire.rotation.y = t * 0.3; wire2.rotation.x = t * 0.25; wire2.rotation.y = -t * 0.2;
      wire.material.opacity += ((shape ? 0.22 : 0.0) - wire.material.opacity) * 0.05;
      wire2.material.opacity += ((shape === 2 ? 0.2 : 0) - wire2.material.opacity) * 0.05;
      wire.visible = wire.material.opacity > 0.01; wire2.visible = wire2.material.opacity > 0.01;
      cam.position.x += (mx * 1.2 - cam.position.x) * 0.04; cam.position.y += (-my * 0.8 - cam.position.y) * 0.04; cam.lookAt(0, 0, 0);
      renderer.render(scene, cam); requestAnimationFrame(loop);
    })();
  } catch (e) { document.getElementById('bg').style.background = 'radial-gradient(circle at 30% 20%,#0b1a3a,#050816 60%)'; }

  /* KaTeX */
  function math() { if (window.renderMathInElement) renderMathInElement(document.body, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false }); }
  if (document.readyState === 'complete') math(); else addEventListener('load', math);

  const start = parseInt(location.hash.slice(1)) || 1;
  go(start - 1);
})();
