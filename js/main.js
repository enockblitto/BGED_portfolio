import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/three/RoomEnvironment.js';
import { createCharacter } from './character.js';
import { createLogo } from './logo.js';

clearTimeout(window.__bgedFallback);
const html = document.documentElement;
const RM = html.classList.contains('rm');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const ease = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

$('[data-year]').textContent = new Date().getFullYear();

/* ── DOM: menu, reveals, compteurs, barres, cartes, lightbox ─────────── */
const burger = $('#burger'), mnav = $('#mnav');
burger.addEventListener('click', () => {
  const o = burger.getAttribute('aria-expanded') !== 'true';
  burger.setAttribute('aria-expanded', o);
  mnav.classList.toggle('open', o);
});
$$('a', mnav).forEach((a) => a.addEventListener('click', () => { burger.setAttribute('aria-expanded', 'false'); mnav.classList.remove('open'); }));

const counters = [];
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach((el) => counters.push({ el, to: +el.dataset.count, t0: performance.now() }));
    $$('[data-lv]', e.target).forEach((li) => li.style.setProperty('--p', li.dataset.lv / 100));
    io.unobserve(e.target);
  });
}, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
$$('.reveal').forEach((el) => io.observe(el));

$$('.card').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(10px)`;
  });
  card.addEventListener('pointerleave', () => { card.style.transform = ''; });
});

const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
$$('#strip figure').forEach((f) => f.addEventListener('click', () => {
  lbImg.src = f.dataset.src; lbImg.alt = $('img', f).alt; lbCap.textContent = $('figcaption', f).textContent;
  lb.hidden = false;
}));
const closeLb = () => { lb.hidden = true; lbImg.src = ''; };
$('#lbClose').addEventListener('click', closeLb);
lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLb(); });

const nav = $('#nav');
const navLinks = $$('.nav ul a');
const sections = $$('main > section');
const footer = $('.foot');
const design = $('#design'), strip = $('#strip'), figs = $$('#strip figure');
const dcount = $('#dcount');
$('#dtotal').textContent = String(figs.length).padStart(2, '0');
const heroLetters = $$('.hero__word span');

function sizeDesign() {
  const over = Math.max(0, strip.scrollWidth - innerWidth);
  design.style.height = `${innerHeight + over * 0.55}px`;
  return over;
}
let designOver = sizeDesign();
addEventListener('resize', () => { designOver = sizeDesign(); });
addEventListener('load', () => { designOver = sizeDesign(); });
$$('img', strip).forEach((im) => im.addEventListener('load', () => { designOver = sizeDesign(); }, { once: true }));

let activeSection = sections[0];
function domFrame(now) {
  const vh = innerHeight;
  for (let i = counters.length - 1; i >= 0; i--) {
    const c = counters[i], p = clamp((now - c.t0) / 1400, 0, 1);
    c.el.textContent = Math.round(c.to * ease(p));
    if (p >= 1) counters.splice(i, 1);
  }
  let ground = 'dark';
  for (const s of [...sections, footer]) {
    const r = s.getBoundingClientRect();
    if (r.top <= 40 && r.bottom > 40) ground = s.dataset.ground;
    if (r.top <= vh * 0.55 && r.bottom > vh * 0.55 && s.tagName === 'SECTION') activeSection = s;
  }
  if (nav.dataset.on !== ground) nav.dataset.on = ground;
  navLinks.forEach((a) => a.classList.toggle('on', a.hash === '#' + activeSection.id));

  const dr = design.getBoundingClientRect();
  const dp = clamp(-dr.top / Math.max(1, dr.height - vh), 0, 1);
  strip.style.transform = `translate3d(${-dp * designOver}px,0,0)`;
  if (dr.top < vh && dr.bottom > 0) {
    let best = 0, bd = 1e9;
    figs.forEach((f, i) => {
      const r = f.getBoundingClientRect();
      const cx = (r.left + r.width / 2) / innerWidth - 0.5;
      if (!RM) f.style.transform = `rotateY(${clamp(-cx * 38, -30, 30)}deg) translateZ(${-Math.abs(cx) * 120}px)`;
      const d = Math.abs(cx - 0.12);
      if (d < bd) { bd = d; best = i; }
    });
    dcount.textContent = String(best + 1).padStart(2, '0');
  }
  if (!RM && scrollY < vh * 1.2) heroLetters.forEach((l, i) => { l.style.transform = `translate3d(0,${scrollY * (0.08 + i * 0.05)}px,0)`; });
}

/* ── 3D ──────────────────────────────────────────────────────────────── */
const canvas = $('#stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  fallback();
}

function fallback() {
  html.classList.add('no3d', 'ready', 'landed');
  const L = $('#loader'); if (L) L.remove();
  const loop = (t) => { domFrame(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

if (renderer) boot().catch((e) => { console.error(e); fallback(); });

async function boot() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 12);
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0x1a2a2a, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x35c3cc, 2.4); rim.position.set(-5, 3, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xf1c73d, 1.2); rim2.position.set(5, 1, -3); scene.add(rim2);

  const pctEl = $('#pct'), barEl = $('#bar'), msgEl = $('#loadMsg'), skipEl = $('#skip'), loaderEl = $('#loader');
  const msgs = ['Préparation de l\'atelier…', 'Repassage du costume…', 'Polissage du logo…', 'Compilation des projets…', 'Presque prêt…'];
  let real = 0;
  const parts = { tex: 0, svg: 0, fonts: 0 };
  const upd = () => { real = (parts.tex + parts.svg + parts.fonts) / 3; };

  const manager = new THREE.LoadingManager();
  manager.onProgress = (_u, l, t) => { parts.tex = l / t; upd(); };
  const texP = new THREE.TextureLoader(manager).loadAsync('assets/head.png');
  const svgP = fetch('assets/logo.svg').then((r) => r.text()).then((t) => { parts.svg = 1; upd(); return t; });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { parts.fonts = 1; upd(); });
  setTimeout(() => { parts.fonts = 1; upd(); }, 4000);
  const [faceTex, svgText] = await Promise.all([texP, svgP]);

  const ch = createCharacter(faceTex);
  scene.add(ch.root);
  const logo = createLogo(svgText);
  scene.add(logo.group);
  const CH_H = 2.9;

  const nib = createLogo(svgText); nib.solid();
  nib.group.scale.setScalar(0.32);
  nib.group.rotation.set(0.25, 0, Math.PI);
  nib.group.position.set(0, 0.08, 0.02);
  const nibTip = new THREE.Object3D(); nibTip.position.set(0, 0.5, 0); nib.group.add(nibTip);
  ch.arms[0].anchor.add(nib.group);
  nib.group.visible = false;

  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.02), new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.2, metalness: 0.6 }));
  phone.position.set(0, -0.04, 0.02); phone.rotation.z = 0.2;
  ch.arms[1].anchor.add(phone); phone.visible = false;

  const cubeLabels = ['JS', 'PHP', 'React', 'Laravel', 'Node', 'Python', 'MySQL', 'Git', 'HTML'];
  const cubeTex = cubeLabels.map((txt, i) => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = ['#1597a0', '#d6a40c', '#0b5b52'][i % 3]; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 6; x.strokeRect(6, 6, 116, 116);
    x.fillStyle = '#fff'; x.font = `600 ${txt.length > 4 ? 30 : 42}px Inter, sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 64, 66);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
  const cubes = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), new THREE.MeshStandardMaterial({ map: cubeTex[i], roughness: 0.4, metalness: 0.1 }));
    m.userData.k = i; m.scale.setScalar(0.001); ch.root.add(m); return m;
  });
  let cubeVis = 0, cubeCycle = 0;

  const TRAIL = 70;
  const trail = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0x35c3cc, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }), TRAIL);
  trail.frustumCulled = false;
  scene.add(trail);
  const trailPts = Array.from({ length: TRAIL }, () => new THREE.Vector3(0, -99, 0));
  let trailHead = 0, trailVis = 0;
  const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();

  let W = 1, H = 1, visH = 1, visW = 1;
  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    visW = visH * camera.aspect;
  }
  resize();
  addEventListener('resize', resize);
  const toWorld = (fx, fy) => new THREE.Vector3((fx - 0.5) * visW, (0.5 - fy) * visH, 0);

  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => { pointer.x = e.clientX / W * 2 - 1; pointer.y = e.clientY / H * 2 - 1; }, { passive: true });

  const bubble = $('#bubble');
  let bubbleText = '', bubbleOn = false;

  // state
  let phase = 'loading';
  let shown = 0;
  const tStart = performance.now();
  const visited = sessionStorage.getItem('bged-visited');
  const MIN_T = RM ? 0 : visited ? 1400 : 3400;
  let doneAt = 0, throwT = 0, landedAt = 0, flight = null;
  let skip = false;
  skipEl.addEventListener('click', () => { skip = true; });
  setTimeout(() => skipEl.classList.add('show'), 1200);

  const charPos = new THREE.Vector3(0, -visH * 0.36, 0);
  let charScale = (H * 0.5 / H) * visH / CH_H;
  let lastScroll = scrollY, scrollVel = 0, lastAct = '';
  let actT = 0;
  const logoPos = new THREE.Vector3(), logoQ = new THREE.Quaternion();
  let logoSpin = 0;

  function layout() {
    const mobile = W < 900;
    if (phase === 'loading' || (phase === 'throw' && throwT < 0.5)) {
      const hFrac = mobile ? 0.42 : 0.5;
      return { x: 0.5, feet: mobile ? 0.74 : 0.84, h: hFrac };
    }
    const sec = activeSection;
    const side = sec.dataset.side;
    if (mobile) return { x: side === 'left' ? 0.13 : 0.87, feet: 0.985, h: 0.2 };
    const stage = $('.split__stage', sec);
    let x = side === 'left' ? 0.2 : 0.8;
    if (sec.id === 'accueil') x = 0.75;
    if (sec.id === 'design') x = 0.14;
    if (stage) { const r = stage.getBoundingClientRect(); if (r.width > 40) x = (r.left + r.width / 2) / W; }
    const h = sec.id === 'accueil' ? 0.6 : sec.id === 'design' ? 0.36 : 0.5;
    return { x, feet: sec.id === 'design' ? 0.97 : 0.93, h };
  }

  function headScreen() {
    tmpV.set(0, CH_H + 0.05, 0);
    ch.root.localToWorld(tmpV);
    tmpV.project(camera);
    return { x: (tmpV.x + 1) / 2 * W, y: (1 - tmpV.y) / 2 * H };
  }

  function startThrow() {
    phase = 'throw'; throwT = 0;
    sessionStorage.setItem('bged-visited', '1');
    msgEl.textContent = 'C\'est parti !';
  }

  function land() {
    phase = 'site';
    landedAt = performance.now();
    logo.group.visible = false;
    html.classList.add('landed', 'ready');
    setTimeout(() => loaderEl.remove(), 1200);
  }

  let last = performance.now();
  function frame(now) {
    const rdt = Math.min(0.25, (now - last) / 1000); last = now;
    const dt = Math.min(0.05, rdt);
    const t = now / 1000;
    domFrame(now);

    const sv = (scrollY - lastScroll) / Math.max(dt, 1e-3); lastScroll = scrollY;
    scrollVel = damp(scrollVel, sv, 6, dt);

    // ── loader progress
    if (phase === 'loading') {
      const timeP = MIN_T ? clamp((now - tStart) / MIN_T, 0, 1) : 1;
      const target = skip ? 1 : Math.min(real, timeP);
      shown = skip ? 1 : damp(shown, target, 5, dt);
      if (target >= 1 && shown > 0.995) shown = 1;
      pctEl.textContent = Math.round(shown * 100);
      barEl.style.transform = `scaleX(${shown})`;
      msgEl.textContent = msgs[Math.min(msgs.length - 1, Math.floor(shown * msgs.length))];
      if (shown >= 1) {
        if (!doneAt) doneAt = now;
        if (RM) { startThrow(); throwT = 9; }
        else if (skip || now - doneAt > 450) startThrow();
      }
    }

    // ── character placement
    const L = layout();
    const targetScale = L.h * visH / CH_H;
    const tp = toWorld(L.x, L.feet);
    const instant = RM && phase !== 'loading';
    charScale = instant ? targetScale : damp(charScale, targetScale, phase === 'site' ? 3 : 4, rdt);
    const dx = tp.x - charPos.x;
    const speed = (phase === 'site' ? 3.2 : 6) * charScale;
    const step = instant ? dx : Math.sign(dx) * Math.min(Math.abs(dx), speed * rdt);
    charPos.x += step;
    charPos.y = instant ? tp.y : damp(charPos.y, tp.y, 5, rdt);
    ch.root.position.copy(charPos);
    ch.root.scale.setScalar(charScale);
    const moving = phase === 'site' && Math.abs(dx) > 0.02 * charScale * 3;
    const walkAmt = moving ? 1 : clamp(Math.abs(scrollVel) / 1600, 0, 0.75);

    // ── act / pose
    const act = phase === 'site' ? activeSection.dataset.act : '';
    if (act !== lastAct) { lastAct = act; actT = 0; }
    actT += rdt;
    const J = ch.J;
    if (phase === 'loading') {
      ch.poses.hold(t);
    } else if (phase === 'throw') {
      throwT += rdt;
      if (throwT < 0.5) ch.poses.windup(t);
      else if (throwT < 1.1) ch.poses.release(t);
      else ch.poses.cheer(t);
    } else {
      const sinceLand = (now - landedAt) / 1000;
      const side = activeSection.dataset.side === 'left' ? 1 : -1;
      if (sinceLand < 1.6 && !RM) ch.poses.cheer(t);
      else if (act === 'wave' || (act === 'idle' && (t % 7) < 2.4)) ch.poses.wave(t);
      else if (act === 'juggle') ch.poses.juggle(t);
      else if (act === 'point') ch.poses.point(t, side);
      else if (act === 'draw') ch.poses.draw(t);
      else if (act === 'call') ch.poses.call(t);
      else ch.poses.idle(t);
      const face = activeSection.id === 'accueil' ? -0.25 : side * 0.3;
      J.bodyRotY = moving ? Math.sign(dx) * 0.75 : face;
      if (moving) J.headY = -Math.sign(dx) * 0.45;
      if (!moving) { J.headY += pointer.x * 0.35; J.headX += pointer.y * 0.18; }
      ch.walk(walkAmt, dt);
    }
    if (phase !== 'site') J.bodyRotY = phase === 'throw' && throwT > 0.4 ? -0.35 : 0.12 * Math.sin(t * 0.8);
    ch.apply(dt, phase === 'throw' ? 16 : 9);
    ch.root.updateMatrixWorld(true);

    // ── logo
    if (phase === 'loading' || (phase === 'throw' && !flight && throwT < 0.62)) {
      const hand = ch.arms[0].hand;
      hand.getWorldPosition(tmpV);
      const lh = 0.62 * charScale;
      const target = tmpV.clone().add(new THREE.Vector3(0, lh * 0.62, 0.15 * charScale));
      if (phase === 'loading') logoPos.lerp(target, logoPos.lengthSq() ? 1 - Math.exp(-14 * dt) : 1);
      else logoPos.copy(target);
      logoSpin += dt * (phase === 'loading' ? 1.4 + shown * 2 : 6);
      logo.group.position.copy(logoPos);
      logo.group.scale.setScalar(lh);
      logo.group.rotation.set(0, logoSpin, 0);
      logo.setFill(phase === 'throw' ? 1.2 : shown, logoPos.y - lh / 2, logoPos.y + lh / 2);
    } else if (phase === 'throw' && !flight) {
      logo.solid();
      const slot = $('#logoSlot').getBoundingClientRect();
      const end = toWorld((slot.left + slot.width / 2) / W, (slot.top + slot.height / 2) / H);
      const start = logo.group.position.clone();
      const ctrl = start.clone().lerp(end, 0.4); ctrl.y += visH * 0.35; ctrl.z += 2;
      flight = { start, end, ctrl, t: 0, s0: logo.group.scale.x, s1: slot.height / H * visH * 0.98, r0: logoSpin };
      loaderEl.classList.add('out');
    }
    if (flight && phase === 'throw') {
      flight.t += rdt / (RM ? 0.01 : 1.05);
      const p = clamp(flight.t, 0, 1), e = easeInOut(p);
      const a = flight.start, b = flight.ctrl, c = flight.end;
      logo.group.position.set(
        (1 - e) * (1 - e) * a.x + 2 * (1 - e) * e * b.x + e * e * c.x,
        (1 - e) * (1 - e) * a.y + 2 * (1 - e) * e * b.y + e * e * c.y,
        (1 - e) * (1 - e) * a.z + 2 * (1 - e) * e * b.z + e * e * c.z,
      );
      logo.group.scale.setScalar(flight.s0 + (flight.s1 - flight.s0) * ease(p));
      const spinTarget = Math.ceil(flight.r0 / (Math.PI * 2) + 3) * Math.PI * 2;
      logo.group.rotation.set(Math.sin(p * Math.PI) * 0.6, flight.r0 + (spinTarget - flight.r0) * ease(p), Math.sin(p * Math.PI) * -0.4);
      if (p >= 1) land();
    }

    // ── props
    const juggle = act === 'juggle' && !moving;
    cubeVis = damp(cubeVis, juggle ? 1 : 0, 6, dt);
    cubeCycle += dt;
    cubes.forEach((m, i) => {
      const th = t * 3.4 + i * (Math.PI * 2 / 3);
      m.position.set(Math.cos(th) * 0.42, 1.75 + Math.sin(th) * 0.55, 0.55);
      m.rotation.set(t * 2 + i, t * 1.6 + i, 0);
      m.scale.setScalar(Math.max(0.001, cubeVis));
      const li = (Math.floor(cubeCycle / 3) * 3 + i) % cubeTex.length;
      if (m.material.map !== cubeTex[li] && Math.sin(th) < -0.9) { m.material.map = cubeTex[li]; m.material.needsUpdate = true; }
    });
    const drawing = act === 'draw' && !moving;
    nib.group.visible = drawing;
    phone.visible = act === 'call' && !moving;
    trailVis = damp(trailVis, drawing ? 1 : 0, 4, dt);
    if (drawing) { nibTip.getWorldPosition(trailPts[trailHead]); trailHead = (trailHead + 1) % TRAIL; }
    for (let i = 0; i < TRAIL; i++) {
      const idx = (trailHead - 1 - i + TRAIL) % TRAIL;
      const s = (1 - i / TRAIL) * charScale * 1.2 * trailVis;
      tmpS.setScalar(Math.max(0.0001, s));
      tmpM.compose(trailPts[idx], tmpQ, tmpS);
      trail.setMatrixAt(i, tmpM);
    }
    trail.instanceMatrix.needsUpdate = true;

    // ── bubble
    const say = phase === 'site' && !moving && (now - landedAt) > 1800 && actT > 0.6 ? activeSection.dataset.say : '';
    if (say !== bubbleText) { bubbleText = say; if (say) bubble.textContent = say; }
    const on = !!say && Math.abs(scrollVel) < 900;
    if (on !== bubbleOn) { bubbleOn = on; bubble.classList.toggle('on', on); }
    if (bubbleOn) {
      const hs = headScreen();
      const bx = clamp(hs.x + (W < 900 && hs.x > W / 2 ? -60 : 40), 100, W - 100);
      bubble.style.transform = `translate3d(${bx}px,${hs.y - 6}px,0) translate(-50%,-100%)`;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
