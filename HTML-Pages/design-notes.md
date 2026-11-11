# Design notes — v7 · three.js (current)

## v7 decision (current)
User: hasil Surf3D canvas "masih sangat berantakan" — minta cari referensi three.js di
internet dan rebuild dengan three.js sungguhan. Riset menegaskan pola standar:
PlaneGeometry di-displace per-vertex sesuai fungsi → computeVertexNormals → warna
per-vertex → MeshStandardMaterial flatShading; OrbitControls (autoRotate + damping) dari
versi three yang sama (r128, examples/js non-modul via jsDelivr); Hemisphere + Directional
light; plinth di bawah permukaan.

- `make3D(cv, fn, lb, ub)` di core.js: renderer/scene/camera/lights/OrbitControls +
  permukaan Rastrigin 3D + plinth + `heightAt(x,z)` + `worldX/worldZ`.
- ALO: semut & lubang antlion = mesh di permukaan; lingkaran perangkap = LineLoop yang
  titik-titiknya diproyeksikan mengikuti permukaan (menyempit sesuai I); elite = bendera;
  optimum global = tiang emas; semut pengganti antlion berkedip teal.
- GOA: busur lompatan = THREE.Line (pratinjau putus-putus di fase ①, solid saat ②),
  panjang busur = c × gaya; makanan = bola emas berdenyut yang berpindah; hoppers teal.
- Kamera: OrbitControls autoRotate 0.8 + damping; drag untuk memutar; maxPolarAngle
  menjaga kamera di atas permukaan.
- Material verbatim; kelas algoritma & kontrol utuh; three.js r128 + OrbitControls via CDN.
- Polish pass (masukan "masih berantakan"): `flatShading` dibuang → smooth shading
  (computeVertexNormals, G=64), duotone lebih lembut, `scene.fog` senada pelat untuk
  kedalaman, cahaya lebih jinak, bendera diganti tiang ramping + bola menyala, cincin
  perangkap diredupkan (opacity .35). Sumber: threejs.org docs (OrbitControls, terrain+fog
  example), threejsresources.com guides (OrbitControls, sky/fog), Stack Overflow smooth
  shading.

---

# v5/v6 — duotone flat map & Surf3D canvas (superseded)
Referensi internet (PSO/ALO visualizers, PySwarms, Towards Data Science) menunjukkan pola
emas untuk mengajarkan metaheuristik: **permukaan fitness 3D yang bisa diputar + partikel
yang turun ke lembah**. Peta datar v5 dibuang sepenuhnya; `core.js` kini punya `Surf3D`
(mesh Rastrigin G×G, proyeksi aksionometri yaw/pitch, painter's algorithm, shading duotone
kertas, drag untuk memutar + auto-orbit). ALO: semut & lubang antlion di permukaan,
lingkaran perangkap menyempit diproyeksikan di permukaan, elite/optimum = tiang bendera.
GOA: busur lompatan 3D (panjang = c × gaya), makanan + cincin berdenyut, meteran c.
WALK-trail ditampilkan ¼ semut (pensil) agar tak jadi gosong. Plot2D/makeHeat dihapus.

## v5 decision (previous — duotone flat map, digantikan Surf3D)
User feedback with three mobile screenshots of the demo plates: **"ini yang kumaksud,
ubah total cara visualisasi dan animasi dari ini. Karena ini sangat jelek dan tidak
membantu visualisasi belajar untuk algoritma-algoritmanya."** The algorithm figures
(Rastrigin heatmap + white walk scribbles + glowing agents) were the problem — rebuilt:

- `makeHeat` (core.js): the saturated teal/gold heatmap → **soft paper duotone**
  (5 levels, paper → deep amber; f tinggi = terang/buruk, f rendah = kolam amber/bagus),
  flattened curve, whisper contour edges. Reads as an antique topographic map.
- `Plot2D.begin`: subtle ink dot-grid over the map + hairline ink border (graph-paper).
- Agent language (all figures): ink ants, amber antlion triangles, coral elite star,
  teal hoppers, gold target — paper strokes, glows removed. Walk trails = whisper pencil
  (alpha .15), select-lines amber, trap circles ink, force arrows coral, social trails teal.
- `viz-intro`: both demos draw a light paper card inside the dark plate — ink landscape
  curve with sand fill, teal population, coral hill-climber, "terjebak!" label.
- Legends + phase captions updated to the new palette (amber/teal/coral/gold words).
- Algorithm classes, phases, controls, IDs: untouched.
- Flow page follow-up: step cards solid dark (`#232063`, `.on` = `#14403C`) for contrast
  on paper; world anchor moved to the right margin so the orb never sits on the step
  list; `.mx-flow` dial shrunk into the margin, big ring removed.

---

# v4 — div motion kit (previous)
User feedback after v3, with robin-thomas.me as reference ("bikin kaya gini modelnya.
Grafik, motion, dan keseluruhan… buat animasi ulang dengan motion graphic dari shapes
dengan div"): the whole motion layer was rebuilt from zero using **pure div shapes** —
no SVG stages, no canvas.

- **Shape kit** (CSS classes, all divs): `.sh-dot / -ring / -ring-dash / -tri / -chev /
  -plus / -star / -arc / -bar / -ell / -dash-ell / -wheel / -pointer / -num / -ray /
  -orbit / -line / -soft`, animated by a fresh keyframe set (`kfx-spin/-rev/-slow,
  kfx-float, kfx-blink, kfx-shrink, kfx-hop, kfx-hopv, kfx-orbit, kfx-trail, kfx-sway`).
- **Persistent world** (`#world`, robin's rolling-sphere model in 2D div): an amber orb
  protagonist that ROLLS to a per-page anchor on every navigation (direction-aware,
  spring transition, rotation proportional to distance), three companion shapes that fly
  after it with staggered delays and re-arrange per page, dotted trail left along the
  flight path, sand-dune div at the bottom, pointer parallax with per-actor depth.
- **Per-page div compositions** replaced every SVG stage: title (ring cluster + orbit),
  flow (rotating 5-dot dial), two (pulsing funnel + hopping chevrons), alo (storyboard
  band: shrinking funnel ellipses, dashed bound ellipse, conic roulette wheel, star,
  numbered markers), goa (zone bars + hopping dots), apps (dashed orbit + rays + hub),
  refs (dashed arc + pulsing rings + landing dot). Pipeline packets were already divs.
- Removed: the Three.js-free canvas backdrop and all SVG stage blocks. The agenda
  path-map keeps its small SVG (routed map content, not motion).
- Routing, HUD, material, and the untouched demo modules are exactly as v3.

## Verification (v4)
- 15/15 pages shot (`scratchpad/shots/divkit*`) — no console errors; contrast fixes
  applied for floating stats (solid plate bg + scoped accent vars).
- Phone title checked (shapes scale/hide per responsive rules).

---

# v3 — "Book on routed pages" (superseded)
User feedback after v2: **"sepertinya masih rusak, dan juga aku ingin ini tetep ada
routing pages, cuma yang dipermasalahkan desainnya saja."** Two findings:

1. **Root cause of "rusak":** a stray `s` before the doctype (`s<!doctype html>`) put the
   page in quirks mode — KaTeX refused to render (all formulas showed as raw `$$…$$`).
   Removed; formulas render again.
2. **Routing restored:** the disk state was the v1 routed-pages HTML (15 `.slide` pages,
   dots, `#1`–`#15` hash routing, keyboard, swipe) but `main.js` was still the v2 scroll
   engine — mismatched, so the page did nothing. The v1 page-routing engine is restored.

**Design = the book, applied onto the routed structure.** `style.css` rewritten as a
paper-and-ink skin for the existing class names: warm paper `#FAF6EC`, ink `#292317`,
Fraunces display + Lora body + JetBrains Mono data; `.eyebrow` → chapter kicker;
`.grad*` → solid ink accents; all `.pan` panels → dark figure plates with scoped accent
variables (so every inline `var(--alo/--goa/--mute/--ink)` inside panels resolves to the
plate palette); stage SVGs recolored to ink/amber/teal on paper via CSS attribute
selectors (no HTML changes); backdrop canvas recolored to sand/ink; HUD, dots, wipe and
progress restyled for paper. Layout metrics from the v1 compression rounds kept (ALO
one-frame fit, station map, constellation, closing arrival). Demos and material untouched.

## Verification (v3)
- 15/15 pages + 2 phone screens shot and inspected (`scratchpad/shots/paper*`) — no
  console errors, formulas render, plates/canvas/HUD all on the paper system.
- Lint remaining (justified): paper-scene citation tags read as "eyebrows" (they are
  citation labels on cards); one stat box inside the calculator plate (borderless now);
  `#map-vec` long line = scrollable data readout, kept.
- Root-cause note: keep the doctype line clean — any character before `<!doctype html>`
  re-triggers quirks mode and breaks KaTeX.

---

# v2 — "The Book" scroll edition (superseded)
After the motion-graphics theater build, the user ruled out any deck metaphor:
**"not powerpoint-ish, make it like a book. Fully redesign it again."** The deck was
rebuilt a third time as an interactive textbook:

- Warm paper `#FAF6EC`, ink `#292317`; Fraunces (display) + Lora (reading body,
  17px/1.8) + JetBrains Mono (data/labels). Book measure ~760px column.
- Structure: cover → Daftar isi (dotted-leader TOC) → Bab 1–6 matching the material's
  own chapter numbering (eyebrows became chapter kickers) → closing. Continuous scroll;
  no slides.
- Demos live as **dark figure plates** (Gambar 1–8) on the paper — classic textbook
  plates; keeps every demo color/JS untouched. Figure captions reuse material wording.
- Formulas as numbered paper boxes; equations/tables styled like print.
- Book details: drop caps per chapter, pull quote, running head with current chapter,
  reading progress bar, chapter numerals in Fraunces.
- Engine (main.js): scroll-driven; IntersectionObserver/scroll picks the active
  `data-id` (demo) and emits `MH.emit(id)` so the untouched demo modules start/stop;
  `←/→` jump chapters; `F` fullscreen; `#hash` and `?state=` deep-links; `.rv`
  reveal-on-scroll; prefers-reduced-motion flattens.
- Material preserved verbatim; only UI affordances re-worded for the book
  ("Mulai presentasi" → "Mulai membaca").

---

# v1 — Motion-graphics theater (superseded, kept for record)

## Task
Redesign the interactive presentation so it stops reading as a PPT and teaches through
motion graphics (lecturer feedback), keeping ALL material content verbatim:
copy, formulas, demos, sources. Only the design and learning experience change.

## Chosen direction — A · Motion-graphics theater
North star: **every concept is a living scene — the algorithm acts itself out in shapes
before the words explain it.** First impression: a science-channel explainer you can pause
and touch.

- Tone: energetic, polished flat vector, sparse copy / big shapes, playful but academically
  honest (student lecture audience, comprehension first).
- Generator engine: science-channel motion-graphics grammar (other medium borrowed whole):
  scenes act themselves out; type set into the scene.
- Hero skeleton (title scene): full-bleed animated stage pressed with type ("满版图像压字").
  Wireframe: dune + funnel + walking ant occupy the right 55% and bleed off-edge;
  title block lower-left (~45%); one marigold pill CTA; member list as one flat chip card.
- Page structure: 15 scenes in a persistent shape-world; keyboard ←/→ + dot rail kept
  (lecture baseline); each scene = staged composition + one interactive instrument.
- Type: Outfit 700/800 display, Space Grotesk 400/500/600 body, JetBrains Mono 500 only
  for live data readouts. Display/body ratio ≈ 2.5–3×.
- Color (3 layers): base violet night `#14113A` (sky gradient to `#221B62`); primary accent
  marigold `#FFB020` (ALO = sand/trap), teal `#3AD9C3` (GOA = swarm), coral `#FF7A66`
  (hill-climber), star gold `#FFD75E` (global optimum); derived: 10–16% tint fills,
  2px translucent strokes, slate-disabled. Hue family is ours (dusk-desert), shifted off
  benchmark navy.
- Main visual: procedural flat-vector shape scenes (circles, arcs, triangles, chevrons,
  sparkles) — no photographic material by decision (user asked for shape assets).
- Icon grammar: hand-made geometric SVG marks (trap = concentric rings, swarm = chevrons,
  star = 4-point sparkle, etc.); no emoji, no icon library.
- Control grammar: fully rounded pills, 2px strokes, press = scale .96 + shadow tighten,
  round slider thumbs, one grammar across buttons/chips/toggles.
- Motion feel: bouncy flat-motion ("回弹·橡皮球"); small shapes overshoot 10–20%,
  panels ≤2%. Three basics: (1) press feedback sink+bounce, (2) scene switch via shape
  curtain sweep (leave faster than enter), (3) first-entry choreography — stage shapes act
  first, copy follows staggered 60ms. prefers-reduced-motion: everything lands instantly.
- Memory points: (1) title scene's funnel trapping the random-walking ant and rebuilding;
  (2) arena run — convergence lines race while the winner's Gantt skyline builds.
- Structural break: no content boxes on slides — full-bleed stages with type-in-scene;
  chapter labels moved from eyebrow lines to the bottom rail.
- Deliberately dropped: Three.js particle field, glassmorphism panels, gradient text,
  emoji icons, nested cards, per-slide two-column "text + panel" template.

## Benchmarks & trade-offs (real captures, dissected on screen)
- Kurzgesagt (kurzgesagt.org, `scratchpad/benchmarks/kurzgesagt/page.png`): kept
  type-in-scene, flat shapes as visual carrier, saturated accents on deep field, single
  loud CTA, restrained chrome. Changed: their website hero → presentation stages; their
  characters/metaphors → our trap & swarm; base hue shifted off their navy.
- Ciechanowski (ciechanow.ski/gears/, `scratchpad/benchmarks/ciechanowski/page.png`):
  kept "the interactive figure is the star, chrome stays quiet, color belongs to content".
  Changed: article column → stage scenes.
- Nicky Case page never left its loading screen — not used as reference.
- Difference check: skeleton (stage+rail vs website), type (Outfit vs custom), color
  (violet night + marigold/teal vs navy + green/cyan), main visual (procedural scenes vs
  their illustrations) — no two of the four match, no face-collision.

## Key states & constraints
- States: scene idle → scene entrance (first time) → demo idle/running/finished.
- Demos keep their element IDs and JS untouched (core.js, viz-*.js) — the redesign re-frames
  them as scene instruments.
- Presenter constraints: keyboard nav, fullscreen, hash deep-links, touch swipe — kept.
- Acceptance: contrast ≥4.5:1 body, body ≥15px, line-height 1.6+, no clipped titles at
  1440×900 and 390×844, demos interactive, motion observable in recording.

## Verification record

- Evidence (screenshots, masked variants, sheets, entry-motion frames, review rounds):
  session task dir `scratchpad/evidence/` and `scratchpad/shots/` (desktop 1440x900 + phone 390x844).
- Interaction checks (observable results, no console errors): arena "Jalankan"/"Masalah baru"
  regenerates problem + reruns convergence/Gantt/table; meta "Jalankan" runs the
  hill-climber-vs-population race with live captions; encode chip click + "Biarkan GOA mencari"
  re-decodes the vector, updates makespan/utilization and rebuilds the Gantt.
- Review round 1 (independent, no build context): 8/10. Fix list delivered: concept scenes
  re-composed off the card grid (agenda = path-station map, apps = radial constellation,
  two = open halves, cloud = open pipeline band vs instrument panel); phone hero collision
  fixed (trail/glyphs hidden, stage dimmed, sparks shrunk); footer chapter labels wrap;
  chip/Gantt/line palette constrained to the recorded hue families (chip↔bar correspondence
  kept via shared palette); formula panels unified as full-bleed bands (goa matches alo);
  closing scene got the arrival beat (trajectory reaches the target rings, coral dot resting).
- Review round 2 (fix-list verification): see "Round 2" below.
- Lint: one kept default — `#map-vec` long line = single-line data readout (solution vector +
  decode), scrollable code-line behavior kept for vector↔decode correspondence; data, not prose.
  Recording unavailable in this environment (no ffmpeg) — entry motion kept as frames.
- Not done (deliberate): canvas-internal draw-on animations (Gantt grow, convergence
  line-draw, per-scene canvas choreography) stay in the untouched demo modules — changing
  them risked the live demos; DOM content gets the choreography instead.

## Round 2
Independent review: 8/10 (fix-list verdicts: apps RESOLVED, phone collision RESOLVED,
palette RESOLVED, labels resolved on re-shots; concept-scene staging PARTIAL; closing beat
PARTIAL; agenda/apps motif-clearance defects introduced). Round-3 changes made from its list:
- meta restaged as stage-band (lead row + wide live demo band + open 4-point strip).
- alo restaged as annotated mechanism band (storyboard diagram with numbered markers 1–6,
  open annotation grid, formulas as one full-width banded footer).
- refs closing beat enlarged beside the "Terima kasih" line: trajectory draws in, dot lands
  on pulsing rings; orphan margin star removed.
- agenda stations given text scrims + ≥18px chip clearance; apps rays trimmed to node icons.
- cloud formula joined the single banded treatment; calculator panel trimmed to content.
- motion: agenda path draw-on entry, refs arrival choreography, slider grab feedback.
- paper evidence re-shot (round-2 flag was stale evidence, footer wraps fine).

## Round 3
Independent review: 8/10. Round-2 verdicts: closing beat, agenda/appsclearance, phone,
palette, labels RESOLVED; concept staging PARTIAL (meta/alo done, goa nominated). New
defects found: ALO formula sheet clipped below fold; encode GOA-button icon wrap; agenda
chips grazing scrim corners. Round-4 changes:
- ALO scene compressed to stand in one 1440×900 frame: CTA moved into the title row,
  storyboard band tightened, annotations compact, formula band margins collapsed
  (the .formula block margins were eating ~120px). Full RUMUS sheet + CTA now visible
  in one unscrolled frame.
- encode button icon wrap fixed (buttons are inline-flex with nowrap).
- agenda chips nudged clear of scrim corners; closing line scaled up to sign-off size.
- Kept verbatim (user constraint "don't change the material contents"): the paper-scene
  note "…dan ditambahkan oleh presenter" which the reviewer flagged as presenter
  scaffolding — it is original deck text, preserved.

## Deliberate stop (composition rhythm)
The reviewer's residual ask — break the "copy-left / instrument-right" rhythm below 3
occurrences (flow, goa, cloud, encode) — is not taken further: all four panels are live
instruments (exploration viz + slider, s(r) chart + f/l sliders, search-space calculator,
schedule builder), which the review manual exempts as category baseline for working
surfaces, and the user's demos need instrument framing. Further restaging would trade
instrument usability for a composition counter. Documented as the remaining gap to a
9-band score per the reviewer.
