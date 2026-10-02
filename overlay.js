'use strict';

const cv = document.getElementById('c');
const g = cv.getContext('2d');
const api = window.fxAPI;
const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const now = () => performance.now() / 1000;

let W = 0;
let H = 0;
let dpr = 1;
let bounds = { x: 0, y: 0 };
let shot = null;
let shotReady = false;

let kind = 'normal';
let dir = 1;
let center = { x: 0, y: 0 };
let ground = 0;
let fist = { x: 0, y: 0 };
let initAt = now();
let chargeAt = 0;
let chargeDur = 1;
let joltAt = 0;
let impactAt = 0;
let endAt = 0;
let finished = true;

let wind = [];
let dust = [];
let debris = [];
let lines = [];
let puffs = [];
let cracks = [];
let shards = [];

const TEXT = {
  normal: 'PUÑETAZO NORMAL',
  combo: '¡PUÑETAZOS NORMALES CONSECUTIVOS!',
  serious: '¡PUÑETAZO SERIO!'
};

function resize() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
}
window.addEventListener('resize', resize);
resize();

const local = (p) => ({ x: p.x - bounds.x, y: p.y - bounds.y });

function finish() {
  if (finished) return;
  finished = true;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  api.done();
}

function reset() {
  shot = null;
  shotReady = false;
  kind = 'normal';
  dir = 1;
  chargeAt = 0;
  joltAt = 0;
  impactAt = 0;
  endAt = 0;
  finished = false;
  wind = [];
  dust = [];
  debris = [];
  lines = [];
  puffs = [];
  cracks = [];
  shards = [];
}

// ---------- spawners ----------

function spawnWind() {
  const side = Math.floor(Math.random() * 4);
  const x = side === 0 ? -50 : side === 1 ? W + 50 : rand(0, W);
  const y = side === 2 ? -50 : side === 3 ? H + 50 : rand(0, H);
  const a = Math.atan2(center.y - y, center.x - x);
  wind.push({ x, y, a, v: rand(500, 900), len: rand(60, 220), life: 0, max: 2 });
}

function spawnDust(n, big) {
  for (let i = 0; i < n; i++) {
    const rock = Math.random() < 0.35;
    dust.push({
      x: center.x + rand(-260, 260) * (big ? 1.3 : 1),
      y: ground - rand(0, 8),
      vx: rand(-20, 20),
      vy: rand(-220, -60) * (big ? 1.4 : 1),
      g: rock ? -30 : -10,
      rot: rand(0, TAU),
      vr: rand(-5, 5),
      s: rock ? rand(3, 8) : rand(4, 12),
      rock,
      life: 0,
      max: rand(1, 2)
    });
  }
}

function rockShape(s) {
  const n = 5 + Math.floor(Math.random() * 3);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rand(-0.25, 0.25);
    const r = s * rand(0.6, 1);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

function spawnDebris(n, power) {
  const cols = ['#8d8478', '#a2968a', '#6f675e', '#b8ab97', '#7b6a58'];
  for (let i = 0; i < n; i++) {
    const s = rand(4, 24) * (Math.random() < 0.15 ? 1.6 : 1);
    debris.push({
      x: fist.x + rand(-10, 10),
      y: fist.y + rand(-10, 10),
      vx: dir * rand(300, 1700) * power + rand(-320, 320),
      vy: rand(-1200, 250) * power,
      rot: rand(0, TAU),
      vr: rand(-12, 12),
      pts: rockShape(s),
      col: cols[i % cols.length],
      life: 0,
      max: 3
    });
  }
}

function spawnLines(n, power) {
  for (let i = 0; i < n; i++) {
    const near = Math.random() < 0.6;
    lines.push({
      x: fist.x - dir * rand(0, 120),
      y: near ? fist.y + rand(-160, 160) : rand(0, H),
      v: dir * rand(2400, 4600) * power,
      len: rand(250, 900) * power,
      w: rand(1.5, 5),
      life: 0,
      max: rand(0.35, 0.7)
    });
  }
}

function spawnPuffs(n, power) {
  for (let i = 0; i < n; i++) {
    puffs.push({
      x: center.x + rand(-60, 60) + dir * rand(0, 200),
      y: ground - rand(0, 30),
      vx: rand(-400, 400) * power + dir * rand(0, 500) * power,
      vy: rand(-140, -10),
      r: rand(20, 50),
      life: 0,
      max: rand(1.2, 2.2)
    });
  }
}

function buildCracks(power) {
  cracks = [];
  shards = [];
  const n = Math.round(7 + power * 4);
  const ends = [];
  for (let i = 0; i < n; i++) {
    const base = (i / n) * TAU + rand(-0.18, 0.18);
    let a = base;
    let x = fist.x;
    let y = fist.y;
    let d = 0;
    const total = rand(160, 460) * power;
    const pts = [[x, y, 0]];
    while (d < total) {
      const seg = rand(16, 42);
      a += rand(-0.38, 0.38);
      a = base + clamp(a - base, -0.6, 0.6);
      x += Math.cos(a) * seg;
      y += Math.sin(a) * seg;
      d += seg;
      pts.push([x, y, d]);
      if (Math.random() < 0.14 && d > 40) {
        let ba = a + (Math.random() < 0.5 ? -1 : 1) * rand(0.45, 1);
        let bx = x;
        let by = y;
        let bd = d;
        const bp = [[bx, by, bd]];
        const bl = d + rand(40, 170) * power;
        while (bd < bl) {
          const s2 = rand(12, 30);
          ba += rand(-0.4, 0.4);
          bx += Math.cos(ba) * s2;
          by += Math.sin(ba) * s2;
          bd += s2;
          bp.push([bx, by, bd]);
        }
        cracks.push({ pts: bp, w: 0.7 });
      }
    }
    cracks.push({ pts, w: 1 });
    ends.push(pts);
  }
  for (const r of [45, 110, 190].map((v) => v * (0.7 + power * 0.3))) {
    const ring = [];
    for (const p of ends) {
      let best = p[p.length - 1];
      for (const q of p) {
        if (Math.abs(Math.hypot(q[0] - fist.x, q[1] - fist.y) - r) < Math.abs(Math.hypot(best[0] - fist.x, best[1] - fist.y) - r)) best = q;
      }
      if (Math.abs(Math.hypot(best[0] - fist.x, best[1] - fist.y) - r) < 30) ring.push([best[0] + rand(-4, 4), best[1] + rand(-4, 4), r * 1.3]);
      else ring.push(null);
    }
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if (a && b && Math.random() < 0.8) cracks.push({ pts: [a, b], w: 0.6 });
    }
  }
  for (let i = 0; i < Math.min(ends.length, 10); i++) {
    const p = ends[i];
    const q = ends[(i + 1) % ends.length];
    if (p.length > 2 && q.length > 2) {
      shards.push([[fist.x, fist.y], [p[2][0], p[2][1]], [q[2][0], q[2][1]]]);
    }
  }
}

// ---------- events ----------

api.onFx((type, d) => {
  const t = now();
  if (type === 'init') {
    reset();
    resize();
    bounds = d.bounds || bounds;
    initAt = t;
    if (d.shot) {
      shot = new Image();
      shot.onload = () => {
        shotReady = true;
      };
      shot.src = d.shot;
    }
  } else if (finished) {
    return;
  } else if (type === 'charge') {
    kind = d.kind || 'normal';
    dir = d.dir || 1;
    center = local(d.center);
    ground = local({ x: 0, y: d.ground }).y;
    fist = local(d.fist);
    chargeAt = t;
    chargeDur = Math.max(0.2, d.charge || 1);
  } else if (type === 'jolt') {
    joltAt = t;
    dir = d.dir || dir;
    fist = local(d.fist);
    spawnDebris(5, 0.5);
    spawnLines(5, 0.6);
  } else if (type === 'impact') {
    impactAt = t;
    kind = d.kind || kind;
    dir = d.dir || dir;
    fist = local(d.fist);
    const power = kind === 'serious' ? 1.5 : kind === 'combo' ? 1.15 : 1;
    buildCracks(power);
    spawnDebris(Math.round(40 * power), power);
    spawnLines(Math.round(80 * power), power);
    spawnPuffs(Math.round(16 * power), power);
  } else if (type === 'end') {
    if (!impactAt) endAt = t;
  }
});

// ---------- drawing ----------

function shakeAmp(t) {
  let a = 0;
  if (chargeAt && !impactAt) {
    const k = clamp((t - chargeAt) / chargeDur, 0, 1);
    a += (kind === 'serious' ? 9 : 4) * k * k;
  }
  if (joltAt) a += 10 * Math.exp(-(t - joltAt) * 16);
  if (impactAt) {
    const dt = t - impactAt;
    const big = kind === 'serious' ? 48 : kind === 'combo' ? 34 : 26;
    if (dt < 2.2) a += big * Math.exp(-dt * 2.3);
  }
  return a;
}

function drawShot(ox, oy, filter) {
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  if (filter) g.filter = filter;
  g.drawImage(shot, ox, oy, W, H);
  g.filter = 'none';
}

function drawVignette(k) {
  const r = Math.hypot(W, H);
  const v = g.createRadialGradient(center.x, center.y, 90, center.x, center.y, r * 0.6);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.45, kind === 'serious' ? `rgba(30,0,0,${0.4 * k})` : `rgba(0,0,0,${0.3 * k})`);
  v.addColorStop(1, kind === 'serious' ? `rgba(40,0,0,${0.78 * k})` : `rgba(0,0,0,${0.62 * k})`);
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
}

function drawFocusLines(col, alpha) {
  const n = 120;
  const R = Math.hypot(W, H);
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + Math.sin(i * 12.9898) * 0.03;
    const w = 0.004 + Math.abs(Math.sin(i * 78.233)) * 0.011;
    const r0 = 90 + Math.abs(Math.sin(i * 3.7)) * 160;
    g.beginPath();
    g.moveTo(fist.x + Math.cos(a) * r0, fist.y + Math.sin(a) * r0);
    g.lineTo(fist.x + Math.cos(a - w) * R, fist.y + Math.sin(a - w) * R);
    g.lineTo(fist.x + Math.cos(a + w) * R, fist.y + Math.sin(a + w) * R);
    g.closePath();
    g.fill();
  }
  g.restore();
}

function drawCracks(ox, oy, reveal, alpha) {
  if (!cracks.length || alpha <= 0) return;
  g.save();
  g.translate(ox, oy);
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const s of shards) {
    g.beginPath();
    g.moveTo(s[0][0], s[0][1]);
    g.lineTo(s[1][0], s[1][1]);
    g.lineTo(s[2][0], s[2][1]);
    g.closePath();
    g.fillStyle = 'rgba(255,255,255,0.07)';
    g.fill();
  }
  for (const pass of [0, 1]) {
    for (const c of cracks) {
      g.beginPath();
      let started = false;
      for (let i = 0; i < c.pts.length; i++) {
        const p = c.pts[i];
        if (p[2] > reveal) break;
        if (!started) {
          g.moveTo(p[0], p[1]);
          started = true;
        } else {
          g.lineTo(p[0], p[1]);
        }
      }
      if (!started) continue;
      if (pass === 0) {
        g.strokeStyle = 'rgba(0,0,0,0.55)';
        g.lineWidth = 4.2 * c.w;
      } else {
        g.strokeStyle = 'rgba(255,255,255,0.92)';
        g.lineWidth = 1.5 * c.w;
      }
      g.stroke();
    }
  }
  g.restore();
}

function drawRings(dt) {
  const n = kind === 'serious' ? 4 : 3;
  const R = Math.hypot(W, H) * 1.1;
  for (let i = 0; i < n; i++) {
    const t = dt - i * 0.08;
    if (t <= 0) continue;
    const r = Math.pow(t, 0.75) * (kind === 'serious' ? 3200 : 2400);
    const k = r / R;
    if (k >= 1) continue;
    g.save();
    g.globalAlpha = (1 - k) * 0.9;
    g.lineWidth = 34 * (1 - k) + 2;
    g.strokeStyle = 'rgba(70,70,90,0.45)';
    g.beginPath();
    g.ellipse(fist.x + dir * r * 0.15, fist.y, r, r * 0.82, 0, 0, TAU);
    g.stroke();
    g.lineWidth = 12 * (1 - k) + 1.5;
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.stroke();
    g.restore();
  }
}

function drawSlash(dt) {
  if (kind !== 'serious' || dt < 0.04 || dt > 1.3) return;
  const k = (dt - 0.04) / 1.26;
  const w = Math.sin(Math.min(1, k * 3) * Math.PI * 0.5) * 9 * (1 - k);
  const x0 = dir > 0 ? fist.x : 0;
  const x1 = dir > 0 ? W : fist.x;
  g.save();
  g.globalAlpha = 1 - k;
  g.shadowColor = 'rgba(255,240,170,1)';
  g.shadowBlur = 40;
  g.fillStyle = '#ffffff';
  g.fillRect(x0, fist.y - w / 2, x1 - x0, w);
  g.restore();
}

function drawText(dt, ox, oy) {
  if (dt < 0.03 || dt > 2.7) return;
  const s = TEXT[kind] || TEXT.normal;
  const k = clamp((dt - 0.03) / 0.2, 0, 1);
  const scale = k < 1 ? 2.6 - 1.75 * k + Math.sin(k * Math.PI) * 0.25 : 1 + Math.sin((dt - 0.23) * 3) * 0.012;
  const a = dt > 2.1 ? 1 - (dt - 2.1) / 0.6 : k;
  let size = Math.min(W * 0.09, 160);
  g.save();
  g.font = `900 ${size}px Impact, "Arial Black", "Segoe UI Black", sans-serif`;
  const tw = g.measureText(s).width;
  if (tw > W * 0.9) size *= (W * 0.9) / tw;
  g.font = `900 ${size}px Impact, "Arial Black", "Segoe UI Black", sans-serif`;
  g.translate(W / 2 + ox * 0.5, H * 0.24 + oy * 0.5);
  g.rotate(-0.05);
  g.scale(scale, scale);
  g.globalAlpha = clamp(a, 0, 1);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.strokeStyle = '#ffffff';
  g.lineWidth = size * 0.26;
  g.strokeText(s, 0, 0);
  g.strokeStyle = '#000000';
  g.lineWidth = size * 0.14;
  g.strokeText(s, 0, 0);
  const grad = g.createLinearGradient(0, -size / 2, 0, size / 2);
  grad.addColorStop(0, '#fff6a0');
  grad.addColorStop(0.5, kind === 'serious' ? '#ffcc1a' : '#ffe14d');
  grad.addColorStop(1, kind === 'serious' ? '#ff5a1f' : '#ff9d1a');
  g.fillStyle = grad;
  g.fillText(s, 0, 0);
  g.restore();
}

function step(list, dt, fn) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life += dt;
    if (p.life >= p.max) {
      list.splice(i, 1);
      continue;
    }
    fn(p);
  }
}

let last = now();
function frame() {
  const t = now();
  const dt = Math.min(0.05, t - last);
  last = t;
  if (finished) {
    requestAnimationFrame(frame);
    return;
  }

  if (!chargeAt && t - initAt > 4) finish();
  if (chargeAt && !impactAt && t - chargeAt > chargeDur + 9) finish();
  if (endAt && t - endAt > 0.4) finish();
  if (impactAt && t - impactAt > 3.4) finish();

  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);

  const amp = shakeAmp(t);
  const ox = amp * (Math.sin(t * 97) * 0.6 + Math.sin(t * 61) * 0.4) + amp * rand(-0.15, 0.15);
  const oy = amp * (Math.cos(t * 83) * 0.6 + Math.sin(t * 47) * 0.4) * 0.8 + amp * rand(-0.15, 0.15);
  const idt = impactAt ? t - impactAt : -1;
  const impactFrame = idt >= 0 && idt < 0.11;

  if (shotReady && (amp > 0.35 || impactFrame)) {
    drawShot(ox, oy, impactFrame ? 'grayscale(1) contrast(6) invert(1)' : null);
  } else if (impactFrame) {
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillRect(0, 0, W, H);
  }

  if (idt >= 0) {
    const reveal = idt * 4200;
    const ca = idt < 2.4 ? 1 : 1 - (idt - 2.4) / 0.8;
    drawCracks(ox, oy, reveal, clamp(ca, 0, 1));
  }

  if (chargeAt && !impactAt && !endAt) {
    const k = clamp((t - chargeAt) / chargeDur, 0, 1);
    drawVignette(Math.pow(k, 1.4));
    const big = kind === 'serious';
    if (Math.random() < dt * (big ? 70 : 35) * (0.3 + k)) spawnWind();
    if (Math.random() < dt * (big ? 60 : 30) * (0.3 + k)) spawnDust(1, big);
  } else if (idt >= 0 && idt < 0.6) {
    drawVignette(1 - idt / 0.6);
  }

  g.save();
  g.lineCap = 'round';
  step(wind, dt, (p) => {
    p.x += Math.cos(p.a) * p.v * dt;
    p.y += Math.sin(p.a) * p.v * dt;
    p.v *= 1 + dt * 1.6;
    if (Math.hypot(center.x - p.x, center.y - p.y) < 90 || impactAt) p.life = p.max;
    g.globalAlpha = Math.min(1, p.life * 4) * 0.55;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x - Math.cos(p.a) * p.len, p.y - Math.sin(p.a) * p.len);
    g.stroke();
  });
  step(dust, dt, (p) => {
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    g.globalAlpha = (1 - p.life / p.max) * (p.rock ? 0.95 : 0.45);
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    g.fillStyle = p.rock ? '#7f766b' : '#d8cdb8';
    if (p.rock) g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.8);
    else {
      g.beginPath();
      g.arc(0, 0, p.s, 0, TAU);
      g.fill();
    }
    g.restore();
  });
  g.restore();

  if (idt >= 0) {
    if (impactFrame) drawFocusLines('#000000', 0.92);
    else if (idt < 0.45) drawFocusLines('#ffffff', 0.55 * (1 - idt / 0.45));

    const fl = kind === 'serious' ? 0.95 : 0.7;
    if (idt >= 0.11 && idt < 0.6) {
      g.fillStyle = `rgba(255,255,255,${fl * (1 - (idt - 0.11) / 0.49)})`;
      g.fillRect(0, 0, W, H);
    }

    drawRings(idt);
    drawSlash(idt);
  }

  g.save();
  g.lineCap = 'round';
  step(lines, dt, (p) => {
    p.x += p.v * dt;
    g.globalAlpha = 1 - p.life / p.max;
    g.strokeStyle = 'rgba(60,60,80,0.5)';
    g.lineWidth = p.w + 2.5;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x - Math.sign(p.v) * p.len, p.y);
    g.stroke();
    g.strokeStyle = '#ffffff';
    g.lineWidth = p.w;
    g.stroke();
  });
  step(puffs, dt, (p) => {
    p.vx *= 1 - dt * 2.2;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const k = p.life / p.max;
    const r = p.r * (1 + k * 2.2);
    const pg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    pg.addColorStop(0, 'rgba(217,207,189,0.55)');
    pg.addColorStop(0.6, 'rgba(217,207,189,0.3)');
    pg.addColorStop(1, 'rgba(217,207,189,0)');
    g.globalAlpha = 1 - k;
    g.fillStyle = pg;
    g.beginPath();
    g.arc(p.x, p.y, r, 0, TAU);
    g.fill();
  });
  step(debris, dt, (p) => {
    p.vy += 2300 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.y > H + 60) p.life = p.max;
    g.globalAlpha = p.life > p.max - 0.4 ? (p.max - p.life) / 0.4 : 1;
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    g.beginPath();
    g.moveTo(p.pts[0][0], p.pts[0][1]);
    for (let i = 1; i < p.pts.length; i++) g.lineTo(p.pts[i][0], p.pts[i][1]);
    g.closePath();
    g.fillStyle = p.col;
    g.fill();
    g.strokeStyle = '#2a2420';
    g.lineWidth = 1.6;
    g.stroke();
    g.restore();
  });
  g.restore();

  if (idt >= 0) drawText(idt, ox, oy);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
