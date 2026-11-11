/* main.js — navigasi halaman (routing) + gerbang buka */
(function () {
  const slides = [...document.querySelectorAll('.slide')];
  const dotsEl = document.getElementById('dots');
  const chapterEl = document.getElementById('chapter');
  const hud = document.getElementById('hud');
  const wipe = document.getElementById('wipe');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur = -1;

  slides.forEach((s, i) => {
    const b = document.createElement('button'); b.title = (i + 1) + '. ' + (s.dataset.title || '');
    b.onclick = () => go(i); dotsEl.appendChild(b);
    s.querySelectorAll('.rv').forEach((el, k) => el.style.setProperty('--d', k));
  });

  function nudge() {
    hud.classList.remove('nudge-x'); void hud.offsetWidth; hud.classList.add('nudge-x');
  }
  function sweep() {
    if (reduced) return;
    wipe.classList.remove('go'); void wipe.offsetWidth; wipe.classList.add('go');
  }

  function go(n) {
    const clamped = Math.max(0, Math.min(slides.length - 1, n));
    if (clamped !== n) nudge();
    if (clamped === cur) return;
    sweep();
    slides.forEach((s, i) => { s.classList.toggle('active', i === clamped); s.classList.toggle('prev', i < clamped); });
    [...dotsEl.children].forEach((d, i) => d.classList.toggle('on', i === clamped));
    document.getElementById('progress').style.width = ((clamped + 1) / slides.length) * 100 + '%';
    document.getElementById('counter').textContent = String(clamped + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    chapterEl.textContent = slides[clamped].dataset.eyebrow || '';
    slides[clamped].scrollTop = 0;
    cur = clamped; history.replaceState(null, '', '#' + (clamped + 1));
    MH.emit(slides[clamped].dataset.id);
    window.dispatchEvent(new CustomEvent('slidechange', { detail: { index: clamped, theme: slides[clamped].dataset.theme || 'cy' } }));
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

  /* ---------------- gerbang buka (preloader) ---------------- */
  const gate = document.getElementById('gate');
  const deepLink = new URLSearchParams(location.search).get('state');
  if (gate && !deepLink) {
    const gatePct = document.getElementById('gate-pct');
    const gateOrb = document.getElementById('gate-orb');
    const gateStart = document.getElementById('gate-start');
    let p = 0, ready = document.readyState === 'complete';
    addEventListener('load', () => { ready = true; });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { ready = true; });
    const gt = setInterval(() => {
      p = ready ? Math.min(100, p + 7) : Math.min(90, p + 3);
      gatePct.textContent = Math.floor(p) + '%';
      gateOrb.style.left = (6 + p * .88) + '%';
      gateOrb.style.transform = 'translate(-50%,-50%) rotate(' + p * 3.6 + 'deg)';
      if (p >= 100) { clearInterval(gt); gate.classList.add('ready'); gateStart.hidden = false; }
    }, 90);
    gateStart.onclick = () => { gate.classList.add('done'); setTimeout(() => gate.remove(), 650); };
  } else if (gate) { gate.remove(); }

  const start = parseInt(location.hash.slice(1)) || 1;
  const stateId = new URLSearchParams(location.search).get('state');
  const stateIdx = stateId ? slides.findIndex(s => s.dataset.id === stateId) : -1;
  go(stateIdx >= 0 ? stateIdx : start - 1);
})();
