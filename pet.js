'use strict';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 340, H = 380;
const GROUND = H - 3;
const HEAD_Y = -170;

const COL = {
  hair: '#8d7be8',
  hairDark: '#6f5fd0',
  hairLight: '#b9a8ff',
  skin: '#ffe0cf',
  dress: '#fff7fb',
  dressSh: '#ffe3f0',
  trim: '#ff8fbe',
  inner: '#ff9ec4',
  eye: '#2ee6c1',
  eyeSh: '#0f9e85',
  sock: '#ffffff',
  shoe: '#ff7fb0',
  line: '#4b3f86',
  dark: '#332a5e'
};

const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

const api = window.petAPI;

const MODELS = ['waifu', 'webillo', 'saitama', 'dragonball', 'naruto', ...window.Titans.models];
const MODEL_NAME = { waifu: 'Waifu', webillo: 'Webillo', saitama: 'Saitama', dragonball: 'Goku y Vegeta',
  attackontitan: 'Attack on Titan', naruto: 'Naruto y Sasuke', eren: 'Eren', armin: 'Armin', reiner: 'Reiner' };
let modelId = (() => {
  try {
    const saved = localStorage.getItem('pet.model');
    if (window.Titans.characters.some(c => c.id === saved)) return 'attackontitan';
    return MODELS.includes(saved) ? saved : 'webillo';
  } catch (e) {
    return 'webillo';
  }
})();

function setModel(id) {
  if (window.Titans.characters.some(c => c.id === id)) id = 'attackontitan';
  if (MODELS.indexOf(id) < 0 || id === modelId) return;
  if (encounter) encounter = false;
  if (punchBig && api.fx) api.fx('end', {});
  punchBig = false;
  modelId = id;
  setState('idle');
  air = false;
  vy = 0;
  syncGeometry();
  try {
    localStorage.setItem('pet.model', id);
  } catch (e) {}
  if (api.model) api.model(modelId);
  say('~ ' + MODEL_NAME[id] + ' ~');
}

const faceY = () => (modelId === 'webillo' ? -192 : modelId === 'saitama' ? -230 : HEAD_Y);

const SIZE_IDS = ['small', 'normal', 'big'];
const SIZE_MUL = { small: 0.78, normal: 1, big: 1.3 };
const SIZE_NAME = { small: 'Pequeño', normal: 'Normal', big: 'Grande' };
let sizeId = (() => {
  try {
    const v = localStorage.getItem('pet.size');
    return SIZE_IDS.indexOf(v) >= 0 ? v : 'normal';
  } catch (e) {
    return 'normal';
  }
})();
let sizeMul = SIZE_MUL[sizeId];

function setSize(id) {
  if (SIZE_IDS.indexOf(id) < 0 || id === sizeId) return;
  sizeId = id;
  sizeMul = SIZE_MUL[id];
  try {
    localStorage.setItem('pet.size', id);
  } catch (e) {}
  if (api.sizeMul) api.sizeMul(id);
  say('~ Tamaño ' + SIZE_NAME[id] + ' ~');
  syncGeometry();
}

let ready = false;
let wa = null;
let displays = [];
let pos = { x: 0, y: 0 };
let sent = { x: -1, y: -1, w: 0, h: 0 };

function dbg(s) {
  if (api.log) api.log(new Date().toISOString().slice(11, 23) + ' ' + s);
}

function logDisplays(src, list) {
  dbg(src + ' dpr=' + devicePixelRatio + ' ' + JSON.stringify(
    list.map((x) => ({ id: x.id, p: x.primary, s: x.scale, d: x.diag, b: x.bounds, w: x.workArea, ph: x.phys, en: x.enabled }))
  ));
}

let state = 'idle';
let st = 0;
let dur = 4;
let dir = 1;
let phase = 0;
let stateFired = false;
let confT = 0;
let spinT = 0;
let coldT = 0;
let walkT = 0;
let trailT = 0;
let winkT = 0;
let lastHopS = null;
let punchKind = 'normal';
let punchBig = false;
let shakeT = 0;
let shakeAmp = 0;
let comboT = 0;
let impactT = 0;
let chargeFxT = 0;
let joltT = 0;
let fxReady = false;
let fxWaitT = 0;

const PUNCH_DUR = { normal: 2.6, combo: 3.6, serious: 4.2 };
const COMBO_FROM = 0.14;
const COMBO_TO = 0.68;

function punchHitAt() {
  return punchKind === 'serious' ? 0.5 : punchKind === 'combo' ? 0.8 : 0.38;
}

let blinkClose = 0;
let blinkT = 2;
let blinkAmt = 0;

let vy = 0;
let air = false;
let squash = 0;

let paused = false;
let soundOn = true;

let bubble = null;
let parts = [];
let mouse = { x: 0, y: 0, in: false };
let drag = null;
let cursorN = 0;
let lay = null;
let sentSize = { w: 0, h: 0 };
let curDispId = null;
let curDisp = null;
// Pantalla con la que Electron interpreta pos (regla del centro) y último
// cursor visto (para reancorar el agarre al cambiar de interpretación).
let convNow = null;
let lastCursor = { x: 0, y: 0 };
let winDipW = W;
let winDipH = H;
const F = () => (winDipW || W) / W;
const Fh = () => (winDipH || H) / H;
let lastClick = 0;
let noteT = 0;
let zzzT = 0;
let smokeT = 0;
let look = { x: 0, y: 0 };
let time = 0;
let encounter = false;
let encounterHitStop = 0;
let heroReportT = 0;
let capeWind = 0;
let previousPos = { x: 0, y: 0 };
const physicalCape = window.HeroArt.capeState();
let over = false;
let headYCanvas = GROUND + HEAD_Y;

const DUR = {
  idle: [3, 6],
  walk: [5, 9],
  sit: [4, 7],
  read: [7, 11],
  coffee: [6, 9],
  phone: [5, 8],
  dance: [6, 9],
  sleep: [9, 14],
  smoke: [8, 13],
  breakfast: [7, 11],
  stretch: [4, 6],
  sing: [6, 10],
  game: [8, 13],
  wave: [3, 4],
  yawn: [4, 5.5],
  shiver: [3.5, 5],
  sneeze: [1.1, 1.1],
  cheer: [4.5, 6.5],
  hop: [4.5, 6],
  spin: [2.6, 3.2],
  clap: [3.5, 5],
  peek: [4, 6],
  happy: [2.7, 2.7],
  punch: [2, 2],
  shop: [7, 11]
};

const PH = {
  idle: ['Mmm...', '¿Y tú?', '~', 'Qué poco viento'],
  walk: ['Paseando~', 'Nya~', '♪ caminito'],
  sit: ['A descansar', 'Hmm~'],
  read: ['Qué interesante', 'Otro capítulo...'],
  coffee: ['Café caliente ♡', 'Glup, glup...'],
  phone: ['jejeje', '¿Alguien escribió?'],
  dance: ['♪♫ ¡Hola!', '¡A bailar!'],
  sleep: ['Zzz...', 'Ron~'],
  smoke: ['Un momentito~', 'Hmm, qué tranquilo', 'Puff...'],
  breakfast: ['¡A desayunar!', 'Tenía mucha hambre', 'Mmm, rico ♡'],
  stretch: ['¡Aaah~', 'A estirar un poco', 'Qué sueño'],
  sing: ['♪ la la la~', '♪♫ Nanu nanu', '♪ ¡A cantar!'],
  game: ['¡Una partidita!', 'Hmm... casi...', '¡Voy ganando!'],
  wave: ['¡Hola~!', '¡Hey!', '¿Cómo estás?', '¡Nya~!'],
  yawn: ['Bostezo...', '¡Ahhh~', 'Qué sueño me da'],
  shiver: ['¡Brrr!', 'Qué frío hace...', 'Dientes a temblar~'],
  sneeze: ['¡Achú!'],
  cheer: ['¡Sí, sí, sí!', '¡Vamos, vamos!', '¡Tú puedes!', '¡Eres genial!'],
  hop: ['¡Hop!', 'Saltando~', '¡Boing boing!'],
  spin: ['¡Gira, gira!', 'Giro de ballet~', '♪'],
  clap: ['¡Bravo!', '¡Muy bien hecho!', '¡Eres genio!'],
  peek: ['¿Ahí?', 'No quiero ver~', 'Qué susto...'],
  happy: ['¡Miau! ♡', 'Nya~ ♡', '¡Qué rico!', 'Mmmh~ ♡'],
  surprise: ['¡Ay!', '¡Eek!'],
  wake: ['¿Mmm?', 'Ya despierta~'],
  punch: ['Puñetazo normal.', 'OK.', 'Uno y ya.'],
  punchCombo: ['Puñetazos normales consecutivos.'],
  punchSerious: ['Puñetazo... ¡SERIO!'],
  shop: ['¡Que se acaba la oferta del súper!', 'Hoy hay puerros baratos', 'No me olvido de la soja', 'Llego antes del descuento']
};

function enabledDisplays() {
  const out = [];
  for (const d of displays) if (d.enabled !== false) out.push(d);
  return out;
}

function pickDisplay() {
  const en = enabledDisplays();
  const pool = en.length ? en : displays;
  if (!pool.length) return null;
  const cx = pos.x + winDipW / 2;
  if (curDisp && lay && lay.straddle) {
    const s = pool.find((x) => x.id === curDisp.id);
    if (s) {
      curDisp = s;
      return s;
    }
  }
  if (curDisp) {
    const c = pool.find((x) => x.id === curDisp.id);
    if (c) {
      const b = c.bounds;
      // Histéresis: el centro debe alejarse 40px de la costura para cambiar
      // de pantalla. Sin esto, el ancho depende de la pantalla y la pantalla
      // del centro depende del ancho → bucle de parpadeo/temblor al cruzar.
      if (cx >= b.x - 40 && cx <= b.x + b.width + 40) {
        curDisp = c;
        return c;
      }
    }
  }
  let best = pool[0];
  let bd = Infinity;
  for (const d of pool) {
    const b = d.bounds;
    const dist = cx >= b.x && cx < b.x + b.width
      ? 0
      : Math.min(Math.abs(cx - b.x), Math.abs(cx - (b.x + b.width)));
    if (dist < bd) {
      bd = dist;
      best = d;
    }
  }
  curDisp = best;
  return best;
}

function refreshWA() {
  const d = pickDisplay();
  if (d) wa = d.workArea;
  return d;
}

function neighbor(d, side) {
  const b = d.bounds;
  const edge = side > 0 ? b.x + b.width : b.x;
  for (const o of displays) {
    if (o === d) continue;
    if (o.enabled === false) continue;
    const ob = o.bounds;
    const oEdge = side > 0 ? ob.x : ob.x + ob.width;
    if (Math.abs(oEdge - edge) > 1) continue;
    if (ob.y >= b.y + b.height || b.y >= ob.y + ob.height) continue;
    return o;
  }
  return null;
}

// Tramos horizontales (unidos) que ocupan las pantallas activas.
function enabledSegments() {
  const pool = enabledDisplays();
  const segs = [];
  for (const d of pool) {
    const b = d.bounds;
    let merged = false;
    for (const s of segs) {
      if (b.x <= s[1] + 1 && b.x + b.width >= s[0] - 1) {
        s[0] = Math.min(s[0], b.x);
        s[1] = Math.max(s[1], b.x + b.width);
        merged = true;
        break;
      }
    }
    if (!merged) segs.push([b.x, b.x + b.width]);
  }
  return segs;
}

function clampX(x) {
  const fw = winDipW;
  const segs = enabledSegments();
  if (!segs.length) return x;
  for (const s of segs) {
    if (x >= s[0] && x + fw <= s[1]) return x;
  }
  let best = segs[0];
  let bd = Infinity;
  const cx = x + fw / 2;
  for (const s of segs) {
    const dist = cx >= s[0] && cx < s[1] ? 0 : Math.min(Math.abs(cx - s[0]), Math.abs(cx - s[1]));
    if (dist < bd) {
      bd = dist;
      best = s;
    }
  }
  return clamp(x, best[0], Math.max(best[0], best[1] - fw));
}

function groundY() {
  if (!wa) return 0;
  const l = lay;
  if (!l) return (wa.y + wa.height) - H * F();
  const top = l.straddle
    ? Math.min(l.floorL - H * l.AL, l.floorR - H * l.AR)
    : l.floorL - H * l.AL;
  const maj = l.maj;
  if (!maj || !maj.phys) return top;
  return maj.bounds.y + (top - maj.phys.y) / (maj.scaleY || maj.scale);
}

function dipDisplay(c) {
  for (const d of displays) {
    const b = d.bounds;
    if (c.x >= b.x && c.x < b.x + b.width && c.y >= b.y && c.y < b.y + b.height) return d;
  }
  return displays[0] || null;
}

function displayAtPhys(px, py) {
  for (const d of displays) {
    const p = d.phys;
    if (!p) continue;
    if (px >= p.x && px < p.x + p.width && py >= p.y && py < p.y + p.height) return d;
  }
  let best = null;
  let bd = Infinity;
  for (const d of displays) {
    if (!d.phys) continue;
    const p = d.phys;
    const dx = px < p.x ? p.x - px : px >= p.x + p.width ? px - (p.x + p.width) : 0;
    if (dx < bd) {
      bd = dx;
      best = d;
    }
  }
  return best;
}

// Píxeles físicos por unidad. Para que el pet se vea del mismo tamaño real
// (cm) en todas las pantallas, se corrige con las pulgadas (diagonal EDID) y
// los píxeles de diagonal: en un monitor grande con la misma resolución hay
// menos píxeles por cm, así que ocupa menos píxeles. Sin datos de pantalla se
// mantiene el tamaño fijo en píxeles de la principal.
function Aof(d) {
  if (!d) return sizeMul;
  const pd = displays.find((x) => x.primary) || displays[0];
  const base = ((pd && pd.scale) || d.scale || 1) * sizeMul;
  if (pd && pd.diag > 0 && d.diag > 0 && pd.phys && d.phys) {
    const pDiag = Math.hypot(pd.phys.width, pd.phys.height);
    const dDiag = Math.hypot(d.phys.width, d.phys.height);
    if (pDiag > 0) return base * (pd.diag / d.diag) * (dDiag / pDiag);
  }
  return base;
}

const pxOf = (d, dx) => (d && d.phys ? d.phys.x + (dx - d.bounds.x) * (d.scaleX || d.scale) : dx);
const pyOf = (d, dy) => (d && d.phys ? d.phys.y + (dy - d.bounds.y) * (d.scaleY || d.scale) : dy);
const invX = (d, px) => (d && d.phys ? d.bounds.x + (px - d.phys.x) / (d.scaleX || d.scale) : px);
const invY = (d, py) => (d && d.phys ? d.bounds.y + (py - d.phys.y) / (d.scaleY || d.scale) : py);

// Electron interpreta pos con la pantalla que contiene el centro de la
// ventana y lo reinterpreta en cada envío: si esa pantalla cambia, hay que
// reexpresar pos en el nuevo sistema para que el nativo (físico) no salte.
// La pantalla se elige por el centro FÍSICO (invariante al rebase): así el
// siguiente cálculo da la misma pantalla y no hay ping-pong de rebases.
function reanchor() {
  if (!displays.length) return false;
  if (!convNow) {
    convNow = dipDisplay({ x: pos.x + winDipW / 2, y: pos.y + winDipH / 2 }) || displays[0];
    return false;
  }
  const cw = (lay && lay.physW) || winDipW * (convNow.scale || 1);
  const ch = (lay && lay.physH) || winDipH * (convNow.scale || 1);
  const cx = pxOf(convNow, pos.x) + cw / 2;
  const cy = pyOf(convNow, pos.y) + ch / 2;
  const fresh = displayAtPhys(cx, cy) || convNow;
  if (fresh.id === convNow.id) {
    // Misma pantalla: refrescar el objeto (la lista se reconstruye en cada
    // onDisplays y la igualdad por referencia fallaría).
    convNow = fresh;
    return false;
  }
  const ox = pos.x;
  const oy = pos.y;
  pos.x = invX(fresh, pxOf(convNow, pos.x));
  pos.y = invY(fresh, pyOf(convNow, pos.y));
  if (drag && drag.offY !== undefined) drag.offY = lastCursor.y - pos.y;
  convNow = fresh;
  dbg('reank ' + Math.round(ox) + ',' + Math.round(oy) + ' -> ' +
    Math.round(pos.x) + ',' + Math.round(pos.y) + ' conv=' + fresh.id);
  return true;
}

function calcLayout() {
  if (!displays.length) return;
  reanchor();
  // Pantalla con la que Electron interpreta pos (regla del centro, fijada en
  // reanchor): todas las conversiones pos<->físico pasan por aquí.
  const conv = convNow || displays[0];
  const physL = pxOf(conv, pos.x);
  const physT = pyOf(conv, pos.y);
  // Tamaño (cm) y suelo MEZCLADOS por solape ventana↔pantalla: al cruzar, la
  // mascota cambia de tamaño y el suelo sube/baja de forma gradual (lo que
  // pide el usuario), sin flips discretos ni temblor en la costura.
  const pool0 = enabledDisplays();
  const pool = pool0.length ? pool0 : displays;
  const x0 = pos.x;
  const x1 = pos.x + (winDipW || 1);
  let tot = 0;
  let AL = 0;
  let floor = 0;
  let best = null;
  let bov = -1;
  for (const d of pool) {
    const b = d.bounds;
    const ov = Math.max(0, Math.min(x1, b.x + b.width) - Math.max(x0, b.x));
    if (ov <= 0) continue;
    const a = Aof(d);
    const wb = d.workArea ? d.workArea.y + d.workArea.height : 816;
    tot += ov;
    AL += a * ov;
    floor += pyOf(d, wb) * ov;
    if (ov > bov) {
      bov = ov;
      best = d;
    }
  }
  if (tot > 0) {
    AL /= tot;
    floor /= tot;
  } else {
    best = pickDisplay() || conv;
    AL = Aof(best);
    const wb = wa ? wa.y + wa.height : 816;
    floor = pyOf(best, wb);
  }
  const gov = best;
  const us = W;
  const AR = AL;
  const straddle = false;
  const physW = W * AL;
  const floorL = floor;
  const floorR = floor;
  const maj = conv;
  // Escala de conv (= la que Electron aplica al setBounds): el CSS enviado y
  // el centro de la ventana quedan en el mismo sistema y Electron elige la
  // misma pantalla que el modelo (sin mini-salto). devicePixelRatio llega con
  // ~1 frame de retraso y rompía esa igualdad.
  const ctxScale = conv.scale || 1;
  const tyL = floorL - physT - H * AL;
  const tyR = tyL;
  const physH = Math.max(floorL - physT, 1);
  lay = { physL, physT, physW, physH, AL, AR, us, straddle, maj, conv, gov, ctxScale, floorL, floorR, tyL, tyR };
}

// Aplica el layout al canvas. El tamaño de la ventana viaja junto con el
// movimiento (pet-move con w,h) en un único setBounds atómico.
function commitLayout() {
  const l = lay;
  if (!l) return;
  const cssW = l.physW / l.ctxScale;
  const cssH = l.physH / l.ctxScale;
  winDipW = cssW;
  winDipH = cssH;
  const bw = Math.max(1, Math.round(l.physW));
  const bh = Math.max(1, Math.round(l.physH));
  if (canvas.width !== bw) canvas.width = bw;
  if (canvas.height !== bh) canvas.height = bh;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const nw = Math.round(cssW);
  const nh = Math.round(cssH);
  if ((nw !== sentSize.w || nh !== sentSize.h) && nw > 0 && nh > 0) {
    sentSize = { w: nw, h: nh };
    dbg('layout size DIP ' + nw + 'x' + nh + ' phys ' + bw + 'x' + bh + ' ctxScale=' + l.ctxScale + ' dpr=' + devicePixelRatio + ' AL=' + l.AL + ' conv=' + (l.conv ? l.conv.id : '-') + ' pos=' + Math.round(pos.x) + ',' + Math.round(pos.y));
  }
}

function computeLayout() {
  if (!displays.length) return;
  calcLayout();
  commitLayout();
}

function cssToUnit(cx) {
  const l = lay;
  if (!l) return cx / F();
  const px = cx * l.ctxScale;
  const sx = clamp(l.us * l.AL, 0, l.physW);
  if (px <= sx) return px / l.AL;
  return l.us + (px - sx) / Math.max(0.0001, l.AR);
}

function unitToPhysX(u) {
  const l = lay;
  if (!l) return u * (winDipW / W || 1);
  const sx = clamp(l.us * l.AL, 0, l.physW);
  return u <= l.us ? u * l.AL : sx + (u - l.us) * l.AR;
}

function syncGeometry() {
  if (!displays.length) return;
  if (!drag) {
    const nx = clampX(pos.x);
    if (nx !== pos.x) {
      pos.x = nx;
      curDisp = null;
    }
  }
  const d = pickDisplay() || displays[0];
  const newId = d ? d.id : null;
  const crossed = newId !== curDispId;
  const oldId = curDispId;
  if (crossed) {
    curDispId = newId;
    refreshWA();
    // Antes de redimensionar: calcular el layout de la nueva pantalla para
    // posicionar el suelo (floorL no depende de pos.y). Así la ventana salta
    // ya pisando la nueva pantalla, sin aparecer flotando arriba.
    if (ready && !drag && !air) {
      calcLayout();
      pos.y = groundY();
    }
  }
  calcLayout();
  if (crossed) {
    const l = lay;
    dbg('cross ' + oldId + ' -> ' + newId + ' pos=' + Math.round(pos.x) + ',' + Math.round(pos.y) +
      ' dpr=' + devicePixelRatio + ' css=' + Math.round(winDipW) + 'x' + Math.round(winDipH) +
      ' phys=' + (l ? Math.round(l.physW) + 'x' + Math.round(l.physH) : '-') +
      ' ctxScale=' + (l ? l.ctxScale : '-') + ' A=' + (l ? l.AL.toFixed(3) : '-') +
      ' conv=' + (l && l.conv ? l.conv.id : '-') +
      ' floorL=' + (l ? l.floorL : '-'));
  }
  commitLayout();
  if (ready && !drag) {
    pos.x = clampX(pos.x);
    if (!air) pos.y = groundY();
    applyMove();
  }
}
syncGeometry();

function applyMove() {
  if (!ready || !displays.length) return;
  if (reanchor()) computeLayout(); // enviar ya en el sistema nuevo (cssW con conv.scale)
  // pos vive en DIP globales de Electron: setBounds espera exactamente ese
  // espacio (verificado con dd9.js), sin conversiones intermedias.
  const x = Math.round(pos.x);
  const y = Math.round(pos.y);
  const w = Math.max(1, Math.round(winDipW));
  const h = Math.max(1, Math.round(winDipH));
  if (x !== sent.x || y !== sent.y || w !== sent.w || h !== sent.h) {
    sent = { x, y, w, h };
    api.move(x, y, w, h);
  }
}

function say(t) {
  bubble = { t, age: 0, max: 2.9 };
}

function setState(s) {
  if (punchBig) {
    punchBig = false;
    if (api.fx) api.fx('end', {});
  }
  state = s;
  st = 0;
  phase = 0;
  stateFired = false;
  const d = DUR[s] || DUR.idle;
  dur = rand(d[0], d[1]);
  if (s === 'punch') {
    const r = Math.random();
    punchKind = r < 0.6 ? 'normal' : r < 0.85 ? 'combo' : 'serious';
    dur = PUNCH_DUR[punchKind];
    comboT = 0;
    chargeFxT = 0;
    joltT = 0;
    say(pick(punchKind === 'combo' ? PH.punchCombo : punchKind === 'serious' ? PH.punchSerious : PH.punch));
  }
}

function fistGlobal() {
  const f = fistPoint();
  return { x: pos.x + f.x * F(), y: pos.y + f.y * Fh() };
}

function startBigPunch() {
  if (modelId !== 'saitama') return;
  if (air) {
    air = false;
    vy = 0;
    pos.y = groundY();
  }
  setState('punch');
  punchBig = true;
  fxReady = false;
  fxWaitT = 0;
}

function punchChargeEnd() {
  return (punchKind === 'combo' ? COMBO_FROM : punchHitAt()) * dur;
}

function onFxReady() {
  if (state !== 'punch' || !punchBig || fxReady) return;
  fxReady = true;
  const end = punchChargeEnd();
  if (end - st < 0.9) st = Math.max(0, end - 0.9);
  const left = end - st;
  chargeSound(left, punchKind === 'serious');
  if (api.fx) {
    api.fx('charge', {
      kind: punchKind,
      dir,
      charge: left,
      center: { x: pos.x + (W / 2) * F(), y: pos.y + (GROUND - 120) * Fh() },
      ground: pos.y + GROUND * Fh(),
      fist: fistGlobal()
    });
  }
}

function phraseChance(s) {
  if (s === 'happy') return 1;
  if (s === 'sleep') return 0.9;
  if (s === 'walk') return 0.3;
  if (s === 'wave') return 0.85;
  if (s === 'cheer' || s === 'clap') return 0.8;
  if (s === 'sneeze' || s === 'punch') return 0;
  if (s === 'shop') return 0.8;
  return 0.5;
}

function setStateSay(s) {
  setState(s);
  if (PH[s] && Math.random() < phraseChance(s)) say(pick(PH[s]));
}

function chooseNext() {
  if (encounter) { setState('idle'); return; }
  const table = [
    ['idle', 0.13],
    ['walk', 0.17],
    ['sit', 0.07],
    ['read', 0.08],
    ['coffee', 0.06],
    ['phone', 0.06],
    ['dance', 0.08],
    ['sleep', 0.06],
    ['smoke', 0.06],
    ['breakfast', 0.05],
    ['stretch', 0.05],
    ['sing', 0.05],
    ['game', 0.05],
    ['wave', 0.05],
    ['yawn', 0.04],
    ['shiver', 0.04],
    ['cheer', 0.05],
    ['hop', 0.05],
    ['spin', 0.04],
    ['clap', 0.05],
    ['peek', 0.04]
  ];
  if (modelId === 'saitama') table.push(['punch', 0.07], ['shop', 0.08]);
  let total = 0;
  for (const e of table) total += e[1];
  let r = Math.random() * total;
  let chosen = table[0][0];
  for (const e of table) {
    r -= e[1];
    if (r <= 0) {
      chosen = e[0];
      break;
    }
  }
  if (state === 'sleep' && chosen === 'sleep') chosen = 'walk';
  setStateSay(chosen);
}

function pet() {
  setStateSay('happy');
  spawnHearts(7);
  meow();
}

function jump() {
  if (air) return;
  air = true;
  vy = -560;
  squash = 0;
  spawnSparkles(4);
  meow();
}

function doAction(a) {
  if (a.startsWith('model:') && window.Titans.models.includes(a.slice(6))) { setModel(a.slice(6)); return; }
  if (a.startsWith('battle-energy:')) {
    const [, stage, attack] = a.split(':'), profile = window.EnergyAttacks.get(attack);
    if (stage === 'charge') chargeSound(profile.charge, profile.width > 35);
    else energySound(profile);
    return;
  }
  if (a.startsWith('battle-sound:')) { punchSound(a.endsWith('blast')); return; }
  if (a.startsWith('encounter-start:') && modelId === 'saitama') {
    encounter = true;
    setState('idle');
    dir = Number(a.split(':')[1]);
    say('¿Otra vez? Bueno...');
    return;
  }
  if (a.startsWith('encounter-punch:') && modelId === 'saitama' && encounter) {
    dir = Number(a.split(':')[1]);
    setState('punch');
    punchKind = 'normal';
    dur = 1.35;
    say('Un golpe.');
    return;
  }
  if (a === 'encounter-end') { encounter = false; return; }
  switch (a) {
    case 'pet': pet(); break;
    case 'pause-on': paused = true; break;
    case 'pause-off': paused = false; break;
    case 'sound-on': soundOn = true; break;
    case 'sound-off': soundOn = false; break;
    case 'model:waifu': setModel('waifu'); break;
    case 'model:webillo': setModel('webillo'); break;
    case 'model:saitama': setModel('saitama'); break;
    case 'model:dragonball': setModel('dragonball'); break;
    case 'model:naruto': setModel('naruto'); break;
    case 'punch':
    case 'shop':
      if (modelId === 'saitama') setStateSay(a);
      break;
    case 'punch-big':
      startBigPunch();
      break;
    case 'fx-ready':
      onFxReady();
      break;
    case 'size:small': setSize('small'); break;
    case 'size:normal': setSize('normal'); break;
    case 'size:big': setSize('big'); break;
    case 'wake':
      setStateSay('idle');
      say(pick(PH.wake));
      break;
    default:
      if (DUR[a]) setStateSay(a);
  }
}

let ac = null;
function getAudio() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      ac = null;
    }
  }
  if (ac && ac.state === 'suspended') ac.resume();
  return ac;
}

function meow() {
  if (!soundOn) return;
  const a = getAudio();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(640, t);
  o.frequency.exponentialRampToValueAtTime(1150, t + 0.09);
  o.frequency.exponentialRampToValueAtTime(520, t + 0.42);
  f.type = 'lowpass';
  f.frequency.value = 2100;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.14, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  const lfo = a.createOscillator();
  const lg = a.createGain();
  lfo.frequency.value = 15;
  lg.gain.value = 28;
  lfo.connect(lg);
  lg.connect(o.frequency);
  lfo.start(t);
  lfo.stop(t + 0.52);
  o.connect(f);
  f.connect(g);
  g.connect(a.destination);
  o.start(t);
  o.stop(t + 0.52);
}

function punchSound(big) {
  if (!soundOn) return;
  const a = getAudio();
  if (!a) return;
  const t = a.currentTime;
  const len = big ? 0.9 : 0.45;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  const noise = a.createBufferSource();
  noise.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(big ? 2600 : 1800, t);
  f.frequency.exponentialRampToValueAtTime(220, t + len);
  const g = a.createGain();
  g.gain.setValueAtTime(big ? 0.5 : 0.32, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  noise.connect(f);
  f.connect(g);
  g.connect(a.destination);
  noise.start(t);
  const o = a.createOscillator();
  const og = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(big ? 120 : 160, t);
  o.frequency.exponentialRampToValueAtTime(40, t + len * 0.8);
  og.gain.setValueAtTime(big ? 0.45 : 0.3, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + len * 0.8);
  o.connect(og);
  og.connect(a.destination);
  o.start(t);
  o.stop(t + len);
}

function energySound(profile) {
  if (!soundOn) return;
  const a = getAudio(); if (!a) return;
  const t = a.currentTime, duration = .65 + profile.hold + (profile.count - 1) * profile.interval;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * duration), a.sampleRate), data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = a.createBufferSource(), filter = a.createBiquadFilter(), gain = a.createGain();
  noise.buffer = buffer; filter.type = 'bandpass'; filter.Q.value = .6;
  filter.frequency.setValueAtTime(profile.style === 'spiral' ? 1200 : 650, t);
  filter.frequency.exponentialRampToValueAtTime(180, t + duration);
  gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(.22, t + .045);
  if (profile.count > 1) {
    for (let i = 1; i < profile.count; i++) {
      gain.gain.setValueAtTime(.08, t + i * profile.interval);
      gain.gain.linearRampToValueAtTime(.28, t + i * profile.interval + .03);
    }
  }
  gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
  noise.connect(filter); filter.connect(gain); gain.connect(a.destination); noise.start(t); noise.stop(t + duration);
  const tone = a.createOscillator(), bass = a.createGain();
  tone.type = 'sawtooth'; tone.frequency.setValueAtTime(profile.width > 40 ? 80 : 140, t);
  tone.frequency.exponentialRampToValueAtTime(38, t + duration);
  bass.gain.setValueAtTime(.07, t); bass.gain.exponentialRampToValueAtTime(.0001, t + duration);
  tone.connect(bass); bass.connect(a.destination); tone.start(t); tone.stop(t + duration);
}

function chargeSound(sec, big) {
  if (!soundOn) return;
  const a = getAudio();
  if (!a) return;
  const t = a.currentTime;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * sec), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = a.createBufferSource();
  noise.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.8;
  f.frequency.setValueAtTime(180, t);
  f.frequency.exponentialRampToValueAtTime(big ? 1400 : 900, t + sec);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(big ? 0.28 : 0.16, t + sec * 0.95);
  g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
  noise.connect(f);
  f.connect(g);
  g.connect(a.destination);
  noise.start(t);
  const o = a.createOscillator();
  const og = a.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(45, t);
  o.frequency.exponentialRampToValueAtTime(big ? 110 : 80, t + sec);
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 260;
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(big ? 0.22 : 0.12, t + sec * 0.95);
  og.gain.exponentialRampToValueAtTime(0.0001, t + sec);
  o.connect(lp);
  lp.connect(og);
  og.connect(a.destination);
  o.start(t);
  o.stop(t + sec);
}

function hit(x, y) {
  if (modelId === 'webillo') return Math.abs(x - W / 2) <= 150 && y >= GROUND - 272 && y <= GROUND;
  if (modelId === 'saitama') return Math.abs(x - W / 2) <= 42 && y >= GROUND - 256 && y <= GROUND;
  return Math.abs(x - W / 2) <= 76 && y >= GROUND - 246 && y <= GROUND;
}

canvas.addEventListener('mousedown', (e) => {
  getAudio();
  if (e.button !== 0) return;
  const ux = cssToUnit(e.clientX);
  const uy = e.clientY / Fh();
  if (!ready || !hit(ux, uy)) return;
  drag = { sx: ux, sy: uy, moved: false, lastMove: performance.now(), grab: null };
  dbg('down css=' + Math.round(e.clientX) + ',' + Math.round(e.clientY) + ' u=' + ux.toFixed(1) + ',' + uy.toFixed(1) +
    ' pos=' + Math.round(pos.x) + ',' + Math.round(pos.y) + ' A=' + (lay ? lay.AL.toFixed(3) : '-'));
  api.info().then((r) => {
    if (!r || !r.win) return;
    dbg('realwin ' + JSON.stringify(r.win) + ' model=' + Math.round(pos.x) + ',' + Math.round(pos.y));
  }).catch(() => {});
});

window.addEventListener('mousemove', (e) => {
  mouse.x = cssToUnit(e.clientX);
  mouse.y = e.clientY / Fh();
  mouse.in = true;
  if (!ready) return;
  if (drag) {
    drag.lastMove = performance.now();
    const dx = mouse.x - drag.sx;
    const dy = mouse.y - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) > 7) {
      drag.moved = true;
      if (state === 'sleep') setState('idle');
      document.body.style.cursor = 'grabbing';
      drag.grab = { x: unitToPhysX(drag.sx), y: drag.sy * ((lay && lay.AL) || 1) };
      cursorN = 0;
      dbg('grab sx=' + drag.sx.toFixed(1) + ' grab=' + drag.grab.x.toFixed(1) +
        ' ctxScale=' + (lay ? lay.ctxScale : '-') + ' A=' + (lay ? lay.AL.toFixed(3) : '-') +
        ' physL=' + (lay ? Math.round(lay.physL) : '-'));
      api.dragState(true);
    }
  } else {
    const o = hit(mouse.x, mouse.y);
    canvas.style.cursor = o ? 'pointer' : 'default';
    if (o !== over) {
      over = o;
      api.ignoreMouse(!o);
    }
  }
});

window.addEventListener('mouseleave', () => {
  mouse.in = false;
  if (!drag && over) {
    over = false;
    api.ignoreMouse(true);
  }
});

function finishDrag(cx, cy) {
  drag = null;
  api.dragState(false);
  document.body.style.cursor = 'default';
  pos.x = clampX(pos.x);
  refreshWA();
  if (pos.y > groundY()) pos.y = groundY();
  if (pos.y < groundY() - 0.6) {
    air = true;
    vy = 0;
  }
  applyMove();
  const o = hit(cx, cy);
  over = o;
  api.ignoreMouse(!o);
}

window.addEventListener('mouseup', (e) => {
  if (!drag || e.button !== 0) return;
  const ux = cssToUnit(e.clientX);
  const uy = e.clientY / Fh();
  const moved = drag.moved;
  if (moved) {
    finishDrag(ux, uy);
    return;
  }
  drag = null;
  const now = performance.now();
  if (now - lastClick < 320) jump();
  else pet();
  lastClick = now;
  const o = hit(ux, uy);
  over = o;
  api.ignoreMouse(!o);
});

api.onCursor((c) => {
  if (!ready || !drag || !drag.moved || !drag.grab) return;
  drag.lastMove = performance.now();
  lastCursor.x = c.x;
  lastCursor.y = c.y;
  // screen.getCursorScreenPoint() devuelve DIP del escritorio virtual.
  const d0 = dipDisplay(c) || displays[0];
  if (!d0) return;
  const grabDip = unitToPhysX(drag.sx) / ((lay && lay.ctxScale) || d0.scale || 1);
  const ox = c.x - grabDip;
  const d = dipDisplay({ x: ox, y: c.y }) || d0;
  const prevX = pos.x;
  pos.x = clampX(ox);
  const prevY = pos.y;
  if (drag.offY === undefined) drag.offY = c.y - pos.y;
  pos.y = c.y - drag.offY;
  if (cursorN < 8 || cursorN % 40 === 0) {
    dbg('cur c=' + Math.round(c.x) + ',' + Math.round(c.y) + ' grabDip=' + grabDip.toFixed(1) +
      ' ox=' + Math.round(ox) + ' x ' + Math.round(prevX) + '->' + Math.round(pos.x) +
      ' y ' + Math.round(prevY) + '->' + Math.round(pos.y) + ' d=' + d.id + ' d0=' + d0.id);
  }
  cursorN++;
  refreshWA();
  if (wa) pos.y = clamp(pos.y, wa.y, Math.max(wa.y, groundY()));
  vy = 0;
  air = false;
  applyMove();
});

// Al cruzar de DPI Chromium puede reescalar la ventana por su cuenta (test
// dd9: setBounds 200 → asentado 160). Si el viewport no encaja con el modelo,
// fuerza el reenvío de la geometría para volver al tamaño correcto.
let lastResizeFix = 0;
window.addEventListener('resize', () => {
  if (!ready || !displays.length) return;
  const iw = window.innerWidth;
  const ih = window.innerHeight;
  if (Math.abs(iw - winDipW) > 4 || Math.abs(ih - winDipH) > 4) {
    const now = performance.now();
    if (now - lastResizeFix < 200) return;
    lastResizeFix = now;
    dbg('resize drift iw=' + Math.round(iw) + 'x' + Math.round(ih) +
      ' model=' + Math.round(winDipW) + 'x' + Math.round(winDipH) + ' dpr=' + devicePixelRatio);
    sent.w = -1;
    sent.h = -1;
    applyMove();
  }
});

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (ready && hit(cssToUnit(e.clientX), e.clientY / Fh())) api.menu();
});

// ---------- particles ----------

function spawnHearts(n) {
  for (let i = 0; i < n; i++) {
    parts.push({
      t: 'heart',
      x: W / 2 + rand(-38, 38),
      y: GROUND - rand(140, 200),
      vx: rand(-18, 18),
      vy: rand(-72, -40),
      g: 16,
      life: 0,
      max: rand(1.3, 1.9),
      s: rand(9, 15),
      rot: rand(-0.5, 0.5),
      vr: rand(-2, 2),
      col: Math.random() < 0.5 ? '#ff6fae' : '#ff9ec4'
    });
  }
}

function spawnNotes(n) {
  for (let i = 0; i < n; i++) {
    parts.push({
      t: 'note',
      x: W / 2 + dir * rand(26, 50),
      y: GROUND - rand(140, 190),
      vx: rand(-8, 8) + dir * 6,
      vy: rand(-56, -34),
      g: 8,
      life: 0,
      max: rand(1.6, 2.3),
      s: rand(15, 21),
      rot: rand(-0.3, 0.3),
      vr: rand(-1, 1),
      col: '#8d7be8',
      ch: Math.random() < 0.5 ? '♪' : '♫'
    });
  }
}

function spawnZ() {
  parts.push({
    t: 'z',
    x: W / 2 + rand(14, 30),
    y: GROUND - 200,
    vx: 16,
    vy: -26,
    g: -4,
    life: 0,
    max: 2.4,
    s: rand(12, 16),
    rot: 0,
    vr: 0.4,
    col: '#8d7be8',
    ch: Math.random() < 0.5 ? 'z' : 'Z'
  });
}

function spawnDust(n = 5) {
  for (let i = 0; i < n; i++) {
    parts.push({
      t: 'dust',
      x: W / 2 + rand(-34, 34),
      y: GROUND - 2,
      vx: rand(-50, 50),
      vy: rand(-70, -30),
      g: 260,
      life: 0,
      max: rand(0.4, 0.6),
      s: rand(3, 6),
      rot: 0,
      vr: 0,
      col: '#9c92c9'
    });
  }
}

function spawnCold() {
  parts.push({
    t: 'smoke',
    x: W / 2 + rand(-22, 22),
    y: GROUND - rand(195, 225),
    vx: rand(-5, 5),
    vy: rand(-18, -8),
    g: -4,
    life: 0,
    max: rand(0.5, 0.8),
    s: rand(2.2, 3.4),
    rot: 0,
    vr: 0,
    col: '#e8f4ff'
  });
}

const CONF_COLS = ['#ff6fae', '#ffd76a', '#8d7be8', '#6ee7c7', '#9be8ff', '#ff9e7a'];

function spawnConfetti(n) {
  for (let i = 0; i < n; i++) {
    parts.push({
      t: 'conf',
      x: W / 2 + rand(-60, 60),
      y: GROUND - rand(150, 235),
      vx: rand(-42, 42),
      vy: rand(-60, -16),
      g: 210,
      life: 0,
      max: rand(1.1, 1.8),
      s: rand(4, 7),
      rot: rand(0, TAU),
      vr: rand(-7, 7),
      col: CONF_COLS[i % CONF_COLS.length]
    });
  }
}

function spawnButterfly() {
  let n = 0;
  for (const p of parts) if (p.t === 'bfly') n++;
  if (n >= 2) return;
  const fromL = Math.random() < 0.5;
  parts.push({
    t: 'bfly',
    x: fromL ? -8 : W + 8,
    y: rand(110, 250),
    vx: (fromL ? 1 : -1) * rand(24, 38),
    vy: 0,
    g: 0,
    life: 0,
    max: rand(7, 11),
    s: rand(5, 8),
    rot: 0,
    vr: 0,
    ph: rand(0, TAU),
    col: Math.random() < 0.5 ? '#ffb3d1' : '#b3e0ff'
  });
}

function spawnBang() {
  parts.push({
    t: 'bang',
    x: W / 2 + rand(-26, 26),
    y: GROUND - rand(205, 235),
    vx: rand(-6, 6),
    vy: -74,
    g: 50,
    life: 0,
    max: 0.75,
    s: rand(18, 24),
    rot: rand(-0.3, 0.3),
    vr: 0.7,
    col: '#ff6fae',
    ch: Math.random() < 0.5 ? '!' : '!!'
  });
}

function spawnRing() {
  parts.push({
    t: 'ring',
    x: W / 2,
    y: GROUND - 2,
    vx: 0,
    vy: 0,
    g: 0,
    life: 0,
    max: 0.5,
    s: rand(16, 22),
    rot: 0,
    vr: 0,
    col: modelId === 'webillo' ? '#6ee7c7' : '#cfc6ff'
  });
}

function spawnSparkles(n) {
  for (let i = 0; i < n; i++) {
    parts.push({
      t: 'spark',
      x: W / 2 + rand(-40, 40),
      y: GROUND - rand(120, 220),
      vx: rand(-14, 14),
      vy: rand(-30, -6),
      g: 10,
      life: 0,
      max: rand(0.6, 1),
      s: rand(7, 12),
      rot: rand(0, TAU),
      vr: rand(-3, 3),
      col: '#ffd76a'
    });
  }
}

// Scene-space position of the lit cigarette tip (model dependent).
function cigTip() {
  if (modelId === 'saitama') return { x: 17 * dir, y: -222 };
  return modelId === 'webillo' ? { x: 43, y: -146 } : { x: 10, y: -137 };
}

function spawnSmoke() {
  const tip = cigTip();
  parts.push({
    t: 'smoke',
    x: W / 2 + tip.x + rand(-1.5, 1.5),
    y: GROUND + tip.y,
    vx: rand(-7, 9),
    vy: rand(-36, -22),
    g: -6,
    life: 0,
    max: rand(1.2, 1.9),
    s: rand(3.4, 5.2),
    rot: rand(0, TAU),
    vr: rand(-0.7, 0.7),
    col: '#d3dbd8'
  });
}

// Punch effects, emitted from the extended fist (scene x mirrored by dir).
function fistPoint(dx = 0, dy = 0) {
  return { x: W / 2 + dir * (SAI_FIST.x + dx), y: GROUND + SAI_FIST.y + dy };
}

function spawnShock(big) {
  const f = fistPoint(6);
  const n = big ? 4 : 2;
  for (let i = 0; i < n; i++) {
    parts.push({
      t: 'shock',
      x: f.x + dir * i * 14,
      y: f.y,
      vx: dir * (big ? 150 : 90),
      vy: 0,
      g: 0,
      life: -i * 0.07,
      max: big ? 0.75 : 0.5,
      s: big ? 30 : 18,
      rot: 0,
      vr: 0,
      col: big ? '#fff3b0' : '#ffffff'
    });
  }
}

function spawnStreaks(n, big) {
  for (let i = 0; i < n; i++) {
    const f = fistPoint(rand(-30, 10), rand(-26, 26) * (big ? 1.8 : 1));
    parts.push({
      t: 'streak',
      x: f.x,
      y: f.y,
      vx: dir * rand(260, 420) * (big ? 1.3 : 1),
      vy: 0,
      g: 0,
      life: 0,
      max: rand(0.18, 0.32),
      s: rand(14, 30) * (big ? 1.5 : 1),
      rot: dir,
      vr: 0,
      col: 'rgba(255,255,255,0.95)'
    });
  }
}

function spawnRise(big) {
  const rock = Math.random() < (big ? 0.55 : 0.3);
  parts.push({
    t: rock ? 'conf' : 'dust',
    x: W / 2 + rand(-70, 70),
    y: GROUND - rand(0, 6),
    vx: rand(-6, 6),
    vy: rand(-60, -25) * (big ? 1.4 : 1),
    g: rock ? -10 : -6,
    life: 0,
    max: rand(0.9, 1.6),
    s: rock ? rand(2.5, 5) : rand(3, 6),
    rot: rand(0, TAU),
    vr: rand(-4, 4),
    col: rock ? '#8b8072' : '#c9bea8'
  });
}

function spawnAuraSpark(big) {
  parts.push({
    t: 'spark',
    x: W / 2 + rand(-34, 34),
    y: GROUND - rand(30, 250),
    vx: rand(-8, 8),
    vy: rand(-90, -40),
    g: 0,
    life: 0,
    max: rand(0.3, 0.6),
    s: rand(4, 8) * (big ? 1.3 : 1),
    rot: rand(0, TAU),
    vr: rand(-6, 6),
    col: big ? '#fff2a8' : '#ffffff'
  });
}

function spawnFistGhost() {
  const f = fistPoint(rand(-14, 6), rand(-22, 22));
  parts.push({
    t: 'fist',
    x: f.x,
    y: f.y,
    vx: dir * 40,
    vy: 0,
    g: 0,
    life: 0,
    max: 0.22,
    s: rand(6, 8),
    rot: 0,
    vr: 0,
    col: '#c8322b'
  });
}

function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    if (p.life >= p.max) {
      parts.splice(i, 1);
      continue;
    }
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.t === 'bfly') {
      p.y += Math.sin(p.life * 2.2 + p.ph) * 28 * dt;
      p.rot = Math.sin(p.life * 2 + p.ph) * 0.3;
    }
    p.rot += (p.vr || 0) * dt;
  }
}

function heartPath(s) {
  const k = s / 10;
  ctx.beginPath();
  ctx.moveTo(0, 3 * k);
  ctx.bezierCurveTo(-1 * k, -1 * k, -5 * k, -4 * k, -5 * k, -7 * k);
  ctx.bezierCurveTo(-5 * k, -10 * k, -2 * k, -11 * k, 0, -8 * k);
  ctx.bezierCurveTo(2 * k, -11 * k, 5 * k, -10 * k, 5 * k, -7 * k);
  ctx.bezierCurveTo(5 * k, -4 * k, 1 * k, -1 * k, 0, 3 * k);
  ctx.closePath();
}

function drawParts() {
  for (const p of parts) {
    if (p.life < 0) continue;
    const raw = 1 - p.life / p.max;
    const a = raw * raw;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(p.x, p.y);
    if (p.t === 'heart') {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.4;
      heartPath(p.s);
      ctx.fill();
      ctx.stroke();
    } else if (p.t === 'note' || p.t === 'z' || p.t === 'bang') {
      ctx.fillStyle = p.col;
      ctx.font = `700 ${p.s}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.ch, 0, 0);
    } else if (p.t === 'conf') {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.s / 2, -p.s * 0.65, p.s, p.s * 1.3);
    } else if (p.t === 'bfly') {
      ctx.rotate(p.rot);
      const fl = Math.abs(Math.sin(p.life * 26));
      ctx.fillStyle = p.col;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(sd * p.s * 0.5, 0, p.s * 0.6, p.s * (0.32 + fl * 0.5), sd * 0.55, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(60,50,110,0.75)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, -p.s * 0.45);
      ctx.lineTo(0, p.s * 0.45);
      ctx.stroke();
    } else if (p.t === 'ring') {
      const rr = p.s * (1 + (p.life / p.max) * 2.3);
      ctx.globalAlpha = a * 0.7;
      ctx.strokeStyle = p.col;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, rr, rr * 0.32, 0, 0, TAU);
      ctx.stroke();
    } else if (p.t === 'dust') {
      ctx.fillStyle = p.col;
      ctx.globalAlpha = a * 0.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.s, p.s * 0.6, 0, 0, TAU);
      ctx.fill();
    } else if (p.t === 'smoke') {
      ctx.fillStyle = p.col;
      ctx.globalAlpha = a * 0.45;
      ctx.beginPath();
      ctx.arc(0, 0, p.s * (1 + p.life * 1.5), 0, TAU);
      ctx.fill();
    } else if (p.t === 'spark') {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      const s = p.s;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.18, -s * 0.18, s, 0);
      ctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s);
      ctx.quadraticCurveTo(-s * 0.18, s * 0.18, -s, 0);
      ctx.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s);
      ctx.closePath();
      ctx.fill();
    } else if (p.t === 'shock') {
      const k = p.life / p.max;
      const rr = p.s * (0.4 + k * 1.8);
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = 'rgba(120,110,160,0.55)';
      ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, rr * 0.38, rr, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = p.col;
      ctx.lineWidth = 3.5 * (1 - k) + 0.8;
      ctx.stroke();
    } else if (p.t === 'streak') {
      ctx.globalAlpha = raw;
      ctx.strokeStyle = 'rgba(110,100,150,0.5)';
      ctx.lineCap = 'round';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(-p.rot * p.s, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.strokeStyle = p.col;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    } else if (p.t === 'fist') {
      ctx.globalAlpha = raw * 0.75;
      ell(0, 0, p.s, p.s * 0.9, p.col, 1.4, '#5a1612');
    }
    ctx.restore();
  }
}

// ---------- update ----------

function pose() {
  if (drag) {
    return { shift: 0, legs: 'dangle', arms: 'up', prop: null, headDY: 0, tilt: -0.05, irisDy: 0, bob: 0 };
  }
  switch (state) {
    case 'walk':
      return { shift: 0, legs: 'walk', arms: 'swing', prop: null, headDY: 0, tilt: 0.03, irisDy: 0, bob: Math.abs(Math.sin(phase)) * 3 };
    case 'dance':
      return { shift: 0, legs: 'dance', arms: 'dance', prop: null, headDY: 0, tilt: 0, irisDy: 0, bob: Math.abs(Math.sin(phase)) * 7 };
    case 'sit':
      return { shift: 32, legs: 'sit', arms: 'rest', prop: null, headDY: 0, tilt: 0.05, irisDy: 0, bob: 0 };
    case 'read':
      return { shift: 32, legs: 'sit', arms: 'hold', prop: 'book', headDY: 4, tilt: 0.16, irisDy: 3, bob: 0 };
    case 'coffee':
      return { shift: 32, legs: 'sit', arms: 'hold', prop: 'cup', headDY: 0, tilt: 0.03, irisDy: 1, bob: 0 };
    case 'phone':
      return { shift: 0, legs: 'stand', arms: 'hold', prop: 'phone', headDY: 6, tilt: 0.1, irisDy: 3, bob: 0 };
    case 'smoke':
      return { shift: 0, legs: 'stand', arms: 'face', prop: 'cig', headDY: 1, tilt: 0.03, irisDy: 2, bob: 0 };
    case 'breakfast':
      return { shift: 32, legs: 'sit', arms: 'hold', prop: 'toast', headDY: 3, tilt: 0.11, irisDy: 3, bob: 0 };
    case 'stretch':
      return { shift: 0, legs: 'stand', arms: 'up', prop: null, headDY: -5, tilt: -0.06, irisDy: -3, bob: 0 };
    case 'sing':
      return { shift: 0, legs: 'stand', arms: 'dance', prop: null, headDY: 2, tilt: -0.03, irisDy: 0, bob: Math.abs(Math.sin(time * 5)) * 3 };
    case 'game':
      return { shift: 0, legs: 'stand', arms: 'hold', prop: 'pad', headDY: 7, tilt: 0.13, irisDy: 5, bob: 0 };
    case 'sleep':
      return { shift: 34, legs: 'curl', arms: 'curl', prop: null, headDY: 24, tilt: 0.32, irisDy: 0, bob: Math.abs(Math.sin(time * 1.6)) * 1.5 };
    case 'happy':
      return { shift: 0, legs: 'stand', arms: 'up', prop: null, headDY: 0, tilt: -0.07, irisDy: 0, bob: Math.abs(Math.sin(time * 6)) * 2 };
    case 'wave':
      return { shift: 0, legs: 'stand', arms: 'wave', prop: null, headDY: -2, tilt: -0.04, irisDy: 0, bob: Math.abs(Math.sin(time * 4)) * 2 };
    case 'yawn':
      return { shift: 0, legs: 'stand', arms: 'up', prop: null, headDY: -6, tilt: -0.06, irisDy: -4, bob: 0 };
    case 'shiver':
      return { shift: 8, legs: 'stand', arms: 'cross', prop: null, headDY: 4, tilt: 0, irisDy: 2, bob: 0 };
    case 'sneeze':
      return { shift: 10, legs: 'stand', arms: 'face', prop: null, headDY: 8, tilt: 0.12, irisDy: 4, bob: 0 };
    case 'cheer':
      return { shift: 0, legs: 'stand', arms: 'cheer', prop: null, headDY: 0, tilt: -0.05, irisDy: 0, bob: Math.abs(Math.sin(time * 8)) * 5 };
    case 'hop':
      return { shift: 0, legs: 'hop', arms: 'up', prop: null, headDY: -2, tilt: -0.03, irisDy: 0, bob: Math.abs(Math.sin(phase)) * 12 };
    case 'spin':
      return { shift: 0, legs: 'stand', arms: 'up', prop: null, headDY: 0, tilt: 0, irisDy: 0, bob: 2 };
    case 'clap':
      return { shift: 0, legs: 'stand', arms: 'clap', prop: null, headDY: 0, tilt: 0.02, irisDy: 0, bob: Math.abs(Math.sin(phase)) * 2 };
    case 'peek':
      return { shift: 4, legs: 'stand', arms: 'peek', prop: null, headDY: 3, tilt: 0.06, irisDy: 2, bob: 0 };
    case 'punch': {
      const ph = modelId === 'saitama' ? saiPunchPhase() : { charge: 0, hold: 0 };
      const crouch = ph.charge > 0 ? ease(Math.min(1, ph.charge * 2)) * 9 : ph.hold * 5;
      return { shift: crouch, legs: 'brace', arms: 'punch', prop: null, headDY: crouch * 0.6, tilt: ph.charge * 0.08 - ph.hold * 0.05, irisDy: 0, bob: 0 };
    }
    case 'shop':
      return { shift: 0, legs: 'walk', arms: 'bag', prop: null, headDY: 0, tilt: 0.03, irisDy: 0, bob: Math.abs(Math.sin(phase)) * 3 };
    default:
      return { shift: 0, legs: 'stand', arms: 'rest', prop: null, headDY: 0, tilt: 0, irisDy: 0, bob: Math.sin(time * 1.8) * 1.2 };
  }
}

function update(dt) {
  if (!paused && encounterHitStop > 0) { encounterHitStop = Math.max(0, encounterHitStop - dt); return; }
  if (!paused) time += dt;
  if (!ready || modelId === 'dragonball' || modelId === 'naruto' || window.Titans.models.includes(modelId)) return;
  computeLayout();
  refreshWA();
  const dc = pickDisplay();
  if (dc && dc.id !== curDispId) syncGeometry();

  if (drag && drag.moved && performance.now() - drag.lastMove > 2500) {
    finishDrag(mouse.x, mouse.y);
  }

  if (blinkClose > 0) blinkClose = Math.max(0, blinkClose - dt);
  blinkAmt = blinkClose > 0 ? Math.sin(Math.PI * (1 - blinkClose / 0.15)) : 0;
  if (winkT > 0) winkT = Math.max(0, winkT - dt);

  if (!paused) {
    blinkT -= dt;
    if (blinkT <= 0) {
      blinkClose = 0.15;
      blinkT = rand(2, 5.4);
    }

      if (air) {
        vy += 2500 * dt;
        pos.y += vy * dt;
        if (pos.y >= groundY()) {
          const impact = vy;
          pos.y = groundY();
          vy = 0;
          air = false;
          squash = clamp(impact / 1000, 0.25, 1);
          if (impact > 400) spawnRing();
          if (impact > 700) spawnDust();
          if (impact > 1150) {
            say(pick(PH.surprise));
            spawnBang();
          }
        }
        applyMove();
      }

      if (drag && drag.moved) {
        trailT -= dt;
        if (trailT <= 0) {
          spawnSparkles(1);
          trailT = 0.1;
        }
      }

      if (!drag) {
      st += dt;

      switch (state) {
        case 'punch': {
          if (punchBig && !fxReady) {
            fxWaitT += dt;
            const holdAt = punchChargeEnd() - 0.3;
            if (st > holdAt && fxWaitT < 4) st = holdAt;
          }
          const p = st / dur;
          const h = punchHitAt();
          const serious = punchKind === 'serious';
          const heavy = serious || punchBig;
          const flurry = punchKind === 'combo' && p >= COMBO_FROM && p < COMBO_TO;
          if (!stateFired && !flurry && (punchKind !== 'combo' || p >= COMBO_TO || p < COMBO_FROM)) {
            const k = punchKind === 'combo' ? 1 : clamp(p / h, 0, 1);
            chargeFxT -= dt;
            if (chargeFxT <= 0) {
              spawnRise(serious);
              if (heavy || Math.random() < 0.5) spawnAuraSpark(serious);
              chargeFxT = heavy ? 0.035 : 0.09;
            }
            if (heavy) {
              shakeT = Math.max(shakeT, 0.06);
              shakeAmp = (serious ? 2.6 : 1.4) * k * (punchBig ? 2 : 1);
            }
          }
          if (!stateFired && p >= h) {
            stateFired = true;
            impactT = 0.1;
            spawnShock(heavy);
            spawnStreaks(heavy ? 18 : 7, heavy);
            spawnDust(heavy ? 10 : 5);
            if (heavy) spawnSparkles(6);
            shakeT = heavy ? 1.1 : 0.3;
            shakeAmp = punchBig ? (serious ? 16 : 11) : serious ? 5 : 2.5;
            punchSound(heavy);
            if (encounter && api.monsterHit) { api.monsterHit(); encounterHitStop = .075; }
            squash = heavy ? 0.55 : 0.2;
            if (punchBig && api.fx) api.fx('impact', { kind: punchKind, dir, fist: fistGlobal() });
          }
          if (flurry) {
            phase += dt * 26;
            comboT -= dt;
            if (comboT <= 0) {
              spawnFistGhost();
              spawnFistGhost();
              spawnStreaks(1);
              shakeT = Math.max(shakeT, 0.08);
              shakeAmp = Math.max(shakeAmp, punchBig ? 4 : 1.5);
              comboT = 0.045;
            }
            if (punchBig) {
              joltT -= dt;
              if (joltT <= 0) {
                punchSound(false);
                if (api.fx) api.fx('jolt', { dir, fist: fistGlobal() });
                joltT = 0.11;
              }
            }
          }
          break;
        }
        case 'shop':
        case 'walk': {
          phase += dt * 7.5;
          pos.x += dir * 62 * dt;
          const d = pickDisplay();
          const b = d.bounds;
          const fw = winDipW;
          if (dir > 0 && pos.x >= b.x + b.width - fw && !neighbor(d, 1)) {
            pos.x = b.x + b.width - fw;
            dir = -1;
          } else if (dir < 0 && pos.x <= b.x && !neighbor(d, -1)) {
            pos.x = b.x;
            dir = 1;
          }
          refreshWA();
          applyMove();
          break;
        }
        case 'dance':
          phase += dt * 9;
          noteT -= dt;
          if (noteT <= 0) {
            spawnNotes(1);
            noteT = rand(0.6, 1.3);
          }
          break;
        case 'sleep':
          zzzT -= dt;
          if (zzzT <= 0) {
            spawnZ();
            zzzT = 1.5;
          }
          break;
        case 'idle':
          if (Math.random() < dt * 0.28) dir *= -1;
          if (Math.random() < dt * 0.1) say(pick(PH.idle));
          break;
        case 'read':
          if (Math.random() < dt * 0.05) say(pick(PH.read));
          break;
        case 'coffee':
          if (Math.random() < dt * 0.05) say(pick(PH.coffee));
          break;
        case 'phone':
          if (Math.random() < dt * 0.06) say(pick(PH.phone));
          break;
        case 'sit':
          if (Math.random() < dt * 0.05) say(pick(PH.sit));
          break;
        case 'smoke':
          if (Math.random() < dt * 0.04) say(pick(PH.smoke));
          break;
        case 'breakfast':
          if (Math.random() < dt * 0.05) say(pick(PH.breakfast));
          break;
        case 'stretch':
          if (Math.random() < dt * 0.06) say(pick(PH.stretch));
          break;
        case 'sing':
          phase += dt * 7;
          if (Math.random() < dt * 0.06) say(pick(PH.sing));
          break;
        case 'game':
          if (Math.random() < dt * 0.06) say(pick(PH.game));
          break;
        case 'wave':
          phase += dt * 10;
          break;
        case 'yawn':
          if (Math.random() < dt * 0.05) say(pick(PH.yawn));
          break;
        case 'shiver': {
          coldT -= dt;
          if (coldT <= 0) {
            spawnCold();
            coldT = 0.32;
          }
          if (st > dur * 0.7 && Math.random() < dt * 0.9) setState('sneeze');
          break;
        }
        case 'sneeze':
          if (!stateFired) {
            stateFired = true;
            squash = 0.85;
            spawnBang();
            spawnRing();
            spawnDust(3);
            say(pick(PH.sneeze));
          }
          break;
        case 'cheer':
          phase += dt * 8;
          if (!stateFired) {
            stateFired = true;
            spawnConfetti(12);
          }
          confT -= dt;
          if (confT <= 0) {
            spawnConfetti(3);
            confT = 0.9;
          }
          break;
        case 'hop': {
          phase += dt * 4.2;
          const h = Math.sin(phase);
          if (lastHopS !== null && lastHopS > 0 && h <= 0) spawnDust(2);
          lastHopS = h;
          break;
        }
        case 'spin':
          if (!stateFired) {
            stateFired = true;
            spawnSparkles(6);
          }
          spinT -= dt;
          if (spinT <= 0) {
            spawnSparkles(1);
            spinT = 0.3;
          }
          break;
        case 'clap':
          phase += dt * 9;
          if (Math.random() < dt * 1.4) spawnSparkles(1);
          break;
        case 'peek':
          if (Math.random() < dt * 0.04) say(pick(PH.peek));
          break;
      }

      if (state === 'smoke') {
        smokeT -= dt;
        if (smokeT <= 0) {
          spawnSmoke();
          smokeT = rand(0.3, 0.5);
        }
      } else if (state === 'sing') {
        noteT -= dt;
        if (noteT <= 0) {
          spawnNotes(1);
          noteT = rand(0.55, 1.1);
        }
      }

      if (state === 'idle' || state === 'sit' || state === 'read' ||
          state === 'coffee' || state === 'stretch') {
        if (Math.random() < dt * 0.07) spawnButterfly();
      }
      if (state === 'idle' && winkT === 0 && eyeMode() === 'open' &&
          Math.random() < dt * 0.13) {
        winkT = 0.34;
      }

      if (st > dur) chooseNext();
    }

    squash = Math.max(0, squash - dt * 4.5);
    shakeT = Math.max(0, shakeT - dt);
    impactT = Math.max(0, impactT - dt);
  }

  if (!encounter && mouse.in && state !== 'sleep' && state !== 'walk' && state !== 'shop' && state !== 'punch') {
    dir = mouse.x >= W / 2 ? 1 : -1;
  }

  const tz = mouse.in
    ? clamp((mouse.x - W / 2) / 38, -1, 1) * 4 * (modelId === 'webillo' ? 1 : dir)
    : 0;
  const ty = mouse.in ? clamp((mouse.y - (GROUND + faceY())) / 55, -1, 1) * 3 : 0;
  const k = Math.min(1, dt * 8);
  look.x += (tz - look.x) * k;
  look.y += (ty - look.y) * k;

  if (bubble) {
    bubble.age += dt;
    if (bubble.age >= bubble.max) bubble = null;
  }

  if (!air && !drag) {
    const g = groundY();
    if (pos.y !== g) {
      pos.y = g;
      applyMove();
    }
  }

  updateParts(dt);
  if (!drag) {
    const nx = clampX(pos.x);
    if (nx !== pos.x) {
      pos.x = nx;
      curDisp = null;
      refreshWA();
      if (!air) pos.y = groundY();
    }
  }
  computeLayout();
  applyMove();
  if (modelId === 'saitama') {
    if (!paused) {
      const speed = (pos.x - previousPos.x) / Math.max(dt, .001);
      const falling = (pos.y - previousPos.y) / Math.max(dt, .001);
      const ph = state === 'punch' ? saiPunchPhase() : null;
      const wind = clamp(-speed * dir * .18 + falling * .025 - (ph ? ph.hold * 48 + ph.charge * 22 : 0), -65, 65);
      capeWind += (wind - capeWind) * Math.min(1, dt * 7);
      window.HeroArt.stepCape(physicalCape, dt, capeWind, time);
    }
    previousPos = { ...pos };
    heroReportT -= dt;
    if (heroReportT <= 0 && api.hero) {
      api.hero({ x: pos.x + W / 2 * F(), ground: pos.y + GROUND * Fh(), scale: Fh(), dir, state, drag: !!drag, air });
      heroReportT = .1;
    }
  }
}

// ---------- drawing helpers ----------

function fillStroke(fill, lw, strokeCol) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (lw !== 0) {
    ctx.strokeStyle = strokeCol || COL.line;
    ctx.lineWidth = lw === undefined ? 2.4 : lw;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

function ell(x, y, rx, ry, fill, lw, strokeCol) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  fillStroke(fill, lw, strokeCol);
}

function limb(x1, y1, x2, y2, cx, cy, col, outLw, inLw, lineCol) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.lineCap = 'round';
  ctx.strokeStyle = lineCol || COL.line;
  ctx.lineWidth = outLw;
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = inLw;
  ctx.stroke();
}

function rrect(x, y, w, h, r, fill, lw, strokeCol) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  fillStroke(fill, lw, strokeCol);
}

// ---------- body parts ----------

function drawShadow(a) {
  const up = Math.max(0, a);
  const k = clamp(1 - up / 180, 0.35, 1);
  ctx.save();
  ctx.globalAlpha = (modelId === 'webillo' ? 0.24 : 0.2) * k;
  ctx.fillStyle = modelId === 'webillo' ? '#17383b' : '#3a2c66';
  ctx.beginPath();
  ctx.ellipse(W / 2 - (modelId === 'webillo' ? 15 : 0), GROUND + up - 1, (modelId === 'webillo' ? 66 : 40) * k, (modelId === 'webillo' ? 8 : 6.5) * k, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawTail(t) {
  const fast = drag ? 13 : state === 'walk' || state === 'dance' ? 8 : state === 'shiver' ? 10 : 2.4;
  const puff = state === 'shiver' ? 1.35 : 1;
  const sw = Math.sin(t * fast);
  const curled = pose().legs === 'curl';
  ctx.lineCap = 'round';
  let ex, ey;
  ctx.beginPath();
  ctx.moveTo(-8, -50);
  if (curled) {
    ctx.bezierCurveTo(-44, -44, -20, -4, 24, -16);
    ex = 24;
    ey = -16;
  } else {
    ctx.quadraticCurveTo(-48 + sw * 10, -76 + sw * 6, -64 + sw * 15, -108 + Math.cos(t * fast * 0.7) * 10);
    ex = -64 + sw * 15;
    ey = -108 + Math.cos(t * fast * 0.7) * 10;
  }
  ctx.strokeStyle = COL.line;
  ctx.lineWidth = 17 * puff;
  ctx.stroke();
  ctx.strokeStyle = COL.hair;
  ctx.lineWidth = 13 * puff;
  ctx.stroke();
  ell(ex, ey, 10 * puff, 10 * puff, COL.hair, 2.2);
  ell(ex, ey, 5, 5, COL.hairLight, 0);
}

function drawBackHair() {
  ctx.beginPath();
  ctx.moveTo(-40, -168);
  ctx.quadraticCurveTo(-66, -110, -50, -64);
  ctx.quadraticCurveTo(-42, -50, -30, -56);
  ctx.quadraticCurveTo(0, -42, 30, -56);
  ctx.quadraticCurveTo(42, -50, 50, -64);
  ctx.quadraticCurveTo(66, -110, 40, -168);
  ctx.quadraticCurveTo(0, -184, -40, -168);
  ctx.closePath();
  fillStroke(COL.hairDark, 2.4);
}

function drawLegs(t, mode) {
  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? -1 : 1;
    const hipx = 9 * s;
    let fx = 10 * s;
    let fy = 0;
    let kx = null;
    let ky = null;

    if (mode === 'walk' || mode === 'dance') {
      const ph = phase + (i ? Math.PI : 0);
      fx = 10 * s + Math.sin(ph) * 15;
      fy = -Math.max(0, Math.sin(ph)) * 11;
    } else if (mode === 'sit') {
      fx = 40 * s + (i ? 3 : 0);
      fy = -32;
    } else if (mode === 'curl') {
      kx = 24 * s;
      ky = -58;
      fx = 27 * s;
      fy = -34;
    } else if (mode === 'dangle') {
      fx = 11 * s + Math.sin(t * 6 + i * 2) * 3;
      fy = -16;
    } else if (mode === 'hop') {
      fx = 6 * s;
      fy = -Math.max(0, Math.sin(phase)) * 9;
    }

    if (mode === 'curl') {
      limb(hipx, -46, kx, ky, (hipx + kx) / 2 + 4 * s, -56, COL.skin, 14, 10.5);
      limb(kx, ky, fx, fy, kx + 2 * s, (ky + fy) / 2 + 3, COL.skin, 13, 9.5);
    } else {
      const cx = (hipx + fx) / 2 + (mode === 'sit' || mode === 'curl' ? 5 * s : 0);
      const cy = (-46 + fy) / 2 + (mode === 'sit' ? 6 : 0);
      limb(hipx, -46, fx, fy, cx, cy, COL.skin, 13, 9.5);
    }

    // sock
    const sockY = mode === 'sit' ? -32 : mode === 'curl' ? -34 : mode === 'dangle' ? -16 : -18;
    if (mode !== 'curl') {
      const mx = hipx + (fx - hipx) * 0.55;
      const my = -46 + (fy + 46) * 0.55;
      limb(mx, my, fx, fy, cx2(mx, fx), my + (fy - my) * 0.5, COL.sock, 11.6, 9);
    }
    // shoe
    ell(fx + 2.5 * s, fy - 2.5, 9.5, 6, COL.shoe, 2.2);
  }
}

function cx2(a, b) {
  return (a + b) / 2;
}

function drawDress(t) {
  const sway = state === 'dance' ? Math.sin(phase) * 3
    : state === 'spin' ? Math.sin((st / dur) * TAU) * 7
      : Math.sin(t * 2) * 1;
  ctx.beginPath();
  ctx.moveTo(-16, -118);
  ctx.quadraticCurveTo(-19, -96, -14, -80);
  ctx.lineTo(-31 + sway, -50);
  ctx.quadraticCurveTo(0, -41, 31 + sway, -50);
  ctx.lineTo(14, -80);
  ctx.quadraticCurveTo(19, -96, 16, -118);
  ctx.quadraticCurveTo(0, -126, -16, -118);
  ctx.closePath();
  fillStroke(COL.dress, 2.4);

  // hem trim
  ctx.beginPath();
  ctx.moveTo(-31 + sway, -50);
  ctx.quadraticCurveTo(0, -41, 31 + sway, -50);
  ctx.strokeStyle = COL.trim;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();

  // frills
  for (let i = -2; i <= 2; i++) {
    const x = i * 12;
    const y = -50 + (1 - (x / 31) * (x / 31)) * 9;
    ell(x + sway * (1 - Math.abs(x) / 40), y + 1, 4.2, 4.2, COL.trim, 1.6);
  }

  // collar + bell
  ctx.beginPath();
  ctx.moveTo(-9, -119);
  ctx.lineTo(0, -111);
  ctx.lineTo(9, -119);
  ctx.strokeStyle = COL.trim;
  ctx.lineWidth = 3;
  ctx.stroke();
  ell(0, -116, 4.5, 4.5, '#ffd76a', 1.8);

  // shading
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = COL.dressSh;
  ctx.beginPath();
  ctx.ellipse(15, -78, 8, 24, 0.1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function armConfig(pz, t) {
  const rest = (s) => ({ sign: s, hx: 25 * s, hy: -72 });
  switch (pz.arms) {
    case 'swing':
      return [
        { sign: -1, hx: -25 + Math.sin(phase) * 7, hy: -72 },
        { sign: 1, hx: 25 - Math.sin(phase) * 7, hy: -72 }
      ];
    case 'up':
      return [
        { sign: -1, hx: -36, hy: -146 - Math.sin(t * 7) * 3 },
        { sign: 1, hx: 36, hy: -146 + Math.sin(t * 7) * 3 }
      ];
    case 'dance': {
      const a = Math.sin(phase);
      return [
        { sign: -1, hx: -33, hy: a > 0 ? -150 : -70 },
        { sign: 1, hx: 33, hy: a > 0 ? -70 : -150 }
      ];
    }
    case 'face':
      // Smoking: hand up beside the mouth, elbow out.
      return [rest(-1), { sign: 1, hx: 34, hy: -134 }];
    case 'wave':
      return [
        rest(-1),
        { sign: 1, hx: 42 + Math.sin(t * 11) * 6, hy: -150 + Math.cos(t * 11) * 7 }
      ];
    case 'cross':
      // Brazos abrazándose (frío).
      return [
        { sign: -1, hx: 14, hy: -98 },
        { sign: 1, hx: -14, hy: -88 }
      ];
    case 'cheer': {
      const a = Math.sin(t * 8);
      return [
        { sign: -1, hx: -36, hy: a > 0 ? -152 : -74 },
        { sign: 1, hx: 36, hy: a > 0 ? -74 : -152 }
      ];
    }
    case 'clap': {
      const o = Math.sin(phase) * 4;
      return [
        { sign: -1, hx: 2 + o, hy: -104 },
        { sign: 1, hx: -2 + o, hy: -104 }
      ];
    }
    case 'peek': {
      const ey = HEAD_Y + (pz.headDY || 0) + 14;
      return [
        { sign: -1, hx: -15, hy: ey },
        { sign: 1, hx: 15, hy: ey }
      ];
    }
    case 'hold':
      if (pz.prop === 'book') return [{ sign: -1, hx: 6, hy: -92 }, { sign: 1, hx: 27, hy: -94 }];
      if (pz.prop === 'toast' || pz.prop === 'pad') return [{ sign: -1, hx: 6, hy: -92 }, { sign: 1, hx: 27, hy: -94 }];
      if (pz.prop === 'cup') return [rest(-1), { sign: 1, hx: 28, hy: -104 }];
      return [rest(-1), { sign: 1, hx: 26, hy: -106 }];
    case 'curl':
      return [{ sign: -1, hx: -17, hy: -60 }, { sign: 1, hx: 17, hy: -60 }];
    default:
      return [rest(-1), rest(1)];
  }
}

function drawArm(a) {
  const s = a.sign;
  const sx = 17 * s;
  const sy = -112;
  const ex = (sx + a.hx) / 2 + 8 * s;
  const ey = (sy + a.hy) / 2 + 4;
  limb(sx, sy, a.hx, a.hy, ex, ey, COL.skin, 12.6, 9);
  ell(a.hx, a.hy, 6.5, 6.5, COL.skin, 2);
  ell(sx, sy + 2, 9, 9, COL.dress, 2.2);
}

function drawNeck() {
  ell(0, -124, 6.5, 8, COL.skin, 2);
}

function drawEar(mirror) {
  ctx.save();
  if (mirror) ctx.scale(-1, 1);
  ctx.beginPath();
  ctx.moveTo(-40, -16);
  ctx.quadraticCurveTo(-47, -52, -28, -76);
  ctx.quadraticCurveTo(-18, -52, -8, -40);
  ctx.closePath();
  fillStroke(COL.hair, 2.4);
  ctx.beginPath();
  ctx.moveTo(-33, -27);
  ctx.quadraticCurveTo(-38, -50, -28, -62);
  ctx.quadraticCurveTo(-22, -48, -16, -41);
  ctx.closePath();
  ctx.fillStyle = COL.inner;
  ctx.fill();
  ctx.restore();
}

function drawSideLock(mirror) {
  ctx.save();
  if (mirror) ctx.scale(-1, 1);
  ctx.beginPath();
  ctx.moveTo(-34, -36);
  ctx.quadraticCurveTo(-51, -6, -44, 16);
  ctx.quadraticCurveTo(-40, 30, -31, 21);
  ctx.quadraticCurveTo(-38, 4, -29, -25);
  ctx.closePath();
  fillStroke(COL.hair, 2.2);
  ctx.restore();
}

function drawBangs() {
  ctx.beginPath();
  ctx.moveTo(-44, -10);
  ctx.quadraticCurveTo(0, -56, 44, -10);
  ctx.lineTo(40, 5);
  ctx.quadraticCurveTo(33, 17, 26, -2);
  ctx.quadraticCurveTo(18, 17, 10, 0);
  ctx.quadraticCurveTo(2, 19, -6, 2);
  ctx.quadraticCurveTo(-14, 17, -22, -2);
  ctx.quadraticCurveTo(-30, 17, -38, 2);
  ctx.lineTo(-44, -10);
  ctx.closePath();
  fillStroke(COL.hair, 2.4);

  // shine
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = COL.hairLight;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-26, -30);
  ctx.quadraticCurveTo(-8, -42, 14, -36);
  ctx.stroke();
  ctx.restore();
}

function drawAhoge() {
  ctx.beginPath();
  ctx.moveTo(-4, -46);
  ctx.quadraticCurveTo(-12, -72, 8, -78);
  ctx.quadraticCurveTo(2, -64, 4, -46);
  ctx.closePath();
  fillStroke(COL.hair, 2.2);
}

function eyeMode() {
  if (drag) return 'surprise';
  if (state === 'sleep') return 'sleep';
  if (state === 'yawn' || state === 'sneeze') return 'sleep';
  if (state === 'happy' || state === 'cheer' || state === 'spin' || state === 'clap') return 'happy';
  return 'open';
}

function mouthMode() {
  if (drag) return 'o';
  switch (state) {
    case 'happy':
    case 'dance':
    case 'sing':
    case 'stretch':
    case 'sneeze':
    case 'cheer':
    case 'spin':
    case 'clap':
    case 'hop':
      return 'open';
    case 'yawn':
      return 'yawn';
    case 'shiver':
      return 'chatter';
    case 'sleep':
      return 'small';
    case 'coffee':
      return 'sip';
    case 'walk':
      return 'cat';
    default:
      return 'smile';
  }
}

function drawEye(sx) {
  const x = 15 * sx;
  const mode = eyeMode();
  const y = mode === 'surprise' ? 10 : 12;
  ctx.lineCap = 'round';

  if (mode === 'happy') {
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 4);
    ctx.quadraticCurveTo(x, y - 8, x + 10, y + 4);
    ctx.strokeStyle = COL.dark;
    ctx.lineWidth = 3.6;
    ctx.stroke();
    return;
  }
  if (mode === 'sleep') {
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 1);
    ctx.quadraticCurveTo(x, y + 7, x + 10, y - 1);
    ctx.strokeStyle = COL.dark;
    ctx.lineWidth = 3.2;
    ctx.stroke();
    return;
  }

  if (blinkAmt > 0.55) {
    ctx.beginPath();
    ctx.moveTo(x - 10.5, y);
    ctx.quadraticCurveTo(x, y + 6, x + 10.5, y);
    ctx.strokeStyle = COL.dark;
    ctx.lineWidth = 3.4;
    ctx.stroke();
    return;
  }

  if (winkT > 0 && sx === -1) {
    ctx.beginPath();
    ctx.moveTo(x - 10.5, y + 1);
    ctx.quadraticCurveTo(x, y + 7, x + 10.5, y + 1);
    ctx.strokeStyle = COL.dark;
    ctx.lineWidth = 3.4;
    ctx.stroke();
    return;
  }

  const ry = (mode === 'surprise' ? 14.5 : 13) * (1 - blinkAmt * 0.85);
  const ir = mode === 'surprise' ? 8 : 9.5;
  const ix = x + look.x;
  const iy = y + look.y + irisDY;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, 11, ry, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 12, y - 16, 24, 32);
  ctx.beginPath();
  ctx.ellipse(ix, iy + 1.5, ir, ir + 1.5, 0, 0, TAU);
  ctx.fillStyle = COL.eyeSh;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(ix, iy, ir, ir, 0, 0, TAU);
  ctx.fillStyle = COL.eye;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(ix, iy + ir * 0.45, ir * 0.75, ir * 0.4, 0, 0, TAU);
  ctx.fillStyle = 'rgba(160,255,238,0.9)';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(ix, iy, mode === 'surprise' ? 3 : 4.2, mode === 'surprise' ? 3.4 : 5, 0, 0, TAU);
  ctx.fillStyle = '#241d4a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ix - 3.5, iy - 4, 3.4, 0, TAU);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ix + 3.2, iy + 4, 1.7, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(x, y + 1.5, 11.5, (mode === 'surprise' ? 15 : 14.5), 0, Math.PI * 1.12, Math.PI * 1.88);
  ctx.strokeStyle = COL.dark;
  ctx.lineWidth = 3.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 10.5 * sx, y - 3);
  ctx.lineTo(x + 16 * sx, y - 8);
  ctx.lineWidth = 3;
  ctx.stroke();
}

let irisDY = 0;

function drawMouth() {
  const m = mouthMode();
  ctx.lineCap = 'round';
  if (m === 'smile') {
    ctx.beginPath();
    ctx.moveTo(-5, 30);
    ctx.quadraticCurveTo(0, 36, 5, 30);
    ctx.strokeStyle = COL.dark;
    ctx.lineWidth = 2.6;
    ctx.stroke();
  } else if (m === 'cat') {
    ctx.beginPath();
    ctx.moveTo(-7, 31);
    ctx.quadraticCurveTo(-3.5, 36, 0, 31);
    ctx.quadraticCurveTo(3.5, 36, 7, 31);
    ctx.strokeStyle = COL.dark;
    ctx.lineWidth = 2.6;
    ctx.stroke();
  } else if (m === 'open') {
    ctx.beginPath();
    ctx.moveTo(-7, 29);
    ctx.quadraticCurveTo(0, 29, 7, 29);
    ctx.quadraticCurveTo(3, 45, -7, 29);
    ctx.closePath();
    ctx.fillStyle = '#6e3050';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ff8fb0';
    ctx.beginPath();
    ctx.ellipse(0, 43, 5, 4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = COL.dark;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (m === 'yawn') {
    ctx.beginPath();
    ctx.ellipse(0, 35, 7, 9.5, 0, 0, TAU);
    ctx.fillStyle = '#6e3050';
    ctx.fill();
    ctx.strokeStyle = COL.dark;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ff8fb0';
    ctx.beginPath();
    ctx.ellipse(0, 42, 4.5, 3.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else if (m === 'chatter') {
    // Dientes apretados temblando.
    const w = 7 + Math.sin(time * 30) * 1.6;
    rrect(-w, 30, w * 2, 7.5, 2, '#ffffff', 1.6, COL.dark);
    ctx.beginPath();
    ctx.moveTo(-w + 1.5, 33.7);
    ctx.lineTo(w - 1.5, 33.7);
    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (m === 'small' || m === 'sip') {
    ell(0, 33, 3.4, 2.8, '#6e3050', 1.8);
  } else {
    ell(0, 33, 4.5, 5.5, '#6e3050', 2);
  }
}

function drawHead(t, pz) {
  const hy = HEAD_Y + pz.headDY + Math.sin(t * 2) * 0.8;
  headYCanvas = GROUND + pz.shift - pz.bob + hy;
  ctx.save();
  ctx.translate(0, hy);
  if (pz.tilt) ctx.rotate(pz.tilt);

  drawSideLock(false);
  drawSideLock(true);

  ell(0, -2, 46, 46, COL.hair, 2.4);

  drawEar(false);
  drawEar(true);

  ell(0, 7, 40, 41, COL.skin, 2.4);

  drawBangs();
  drawAhoge();

  // blush
  const bAlpha = state === 'happy' || drag ? 0.85 : 0.5;
  ctx.save();
  ctx.globalAlpha = bAlpha;
  ctx.fillStyle = '#ff8fae';
  ctx.beginPath();
  ctx.ellipse(-26, 24, 8.5, 5, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(26, 24, 8.5, 5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  drawEye(-1);
  drawEye(1);
  drawMouth();

  ctx.restore();
}

// Manos tapando los ojos (dibujadas tras la cabeza para quedar encima).
function drawPeekHands(t, pz) {
  const hy = HEAD_Y + pz.headDY + Math.sin(t * 2) * 0.8;
  for (const s of [-1, 1]) {
    const x = 15 * s;
    const y = hy + 13;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 4.5, y - 4);
      ctx.quadraticCurveTo(x + i * 5.2, y - 11, x + i * 3.4, y - 13);
      ctx.strokeStyle = COL.line;
      ctx.lineWidth = 1.7;
      ctx.stroke();
    }
    ell(x, y, 9, 8.5, COL.skin, 2);
  }
}

function drawProp(prop, t) {
  if (prop === 'book') {
    ctx.save();
    ctx.translate(17, -97);
    ctx.rotate(-0.1);
    rrect(-17, -11, 34, 22, 2, COL.trim, 2);
    rrect(-14, -9, 28, 18, 1, '#ffffff', 1.6);
    ctx.strokeStyle = '#b9b3d8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 8);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-11, -4 + i * 5);
      ctx.lineTo(-3, -4 + i * 5);
      ctx.moveTo(3, -4 + i * 5);
      ctx.lineTo(11, -4 + i * 5);
      ctx.stroke();
    }
    ctx.restore();
  } else if (prop === 'cup') {
    ctx.save();
    ctx.translate(28, -103);
    ctx.beginPath();
    ctx.moveTo(-7, -8);
    ctx.lineTo(7, -8);
    ctx.lineTo(5, 7);
    ctx.lineTo(-5, 7);
    ctx.closePath();
    fillStroke('#ffffff', 2);
    ctx.fillStyle = COL.trim;
    ctx.fillRect(-6.6, -3, 13.2, 3.5);
    ctx.beginPath();
    ctx.ellipse(9, -1, 4, 5, 0, -1.2, 1.2);
    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150,150,185,0.8)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 2) {
      const o = Math.sin(t * 3 + i) * 2;
      ctx.beginPath();
      ctx.moveTo(i * 3 + o, -12);
      ctx.quadraticCurveTo(i * 3 - 3 + o, -17, i * 3 + o, -22);
      ctx.stroke();
    }
    ctx.restore();
  } else if (prop === 'phone') {
    ctx.save();
    ctx.translate(26, -106);
    ctx.rotate(0.14);
    rrect(-6.5, -11.5, 13, 23, 3.5, '#2f2a55', 2);
    rrect(-4.5, -8.5, 9, 15, 1.5, '#9be8ff', 0);
    ctx.fillStyle = '#cfd6ff';
    ctx.beginPath();
    ctx.arc(0, 9.5, 1.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else if (prop === 'cig') {
    // Held between the fingers, lit end pointing up towards the mouth.
    const g = modelId === 'webillo'
      ? { x: 58, y: -90, rot: -1.7, len: 20 }   // + drawWebilloProp offset => scene (46, -126)
      : modelId === 'saitama'
        ? { x: 2, y: -163, rot: -0.27, len: 14 } // + drawSaitamaProp offset => scene (2, -218)
        : { x: 34, y: -134, rot: -3, len: 24 };
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.rot);
    rrect(0, -2.3, g.len, 4.6, 2, '#f6f2e7', 1.2, '#c9c2ae');
    ctx.fillStyle = '#e6c48d';
    ctx.fillRect(0, -2.3, 6, 4.6);
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath();
    ctx.ellipse(g.len + 1.6, 0, 3.1, 2.7, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffe1a6';
    ctx.beginPath();
    ctx.ellipse(g.len + 1.6, 0, 1.4, 1.2, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else if (prop === 'toast') {
    ctx.save();
    ctx.translate(17, -97);
    ctx.rotate(-0.12);
    ctx.beginPath();
    ctx.moveTo(-12, 13);
    ctx.lineTo(-12, -3);
    ctx.quadraticCurveTo(-12, -15, 0, -15);
    ctx.quadraticCurveTo(12, -15, 12, -3);
    ctx.lineTo(12, 13);
    ctx.closePath();
    fillStroke('#e8b06a', 2.2, '#b97e3f');
    ctx.beginPath();
    ctx.moveTo(-9, 11);
    ctx.lineTo(-9, -2);
    ctx.quadraticCurveTo(-9, -11.5, 0, -11.5);
    ctx.quadraticCurveTo(9, -11.5, 9, -2);
    ctx.lineTo(9, 11);
    ctx.closePath();
    fillStroke('#f9e3b3', 1.2, '#d8ab6a');
    rrect(-5, -3, 10, 9, 1.5, '#ffd969', 1, '#e0b046');
    ctx.restore();
  } else if (prop === 'pad') {
    ctx.save();
    ctx.translate(16, -97);
    ctx.rotate(-0.05);
    rrect(-21, 1, 12, 17, 6, '#39326a', 2);
    rrect(9, 1, 12, 17, 6, '#39326a', 2);
    rrect(-15, -9, 30, 17, 8, '#4a418a', 2);
    ctx.fillStyle = '#2a2550';
    ctx.fillRect(-10, -4.6, 10, 3.6);
    ctx.fillRect(-7.7, -7, 3.6, 9);
    ell(7, -6, 2.6, 2.6, '#ff8fbe', 0);
    ell(12, -2.4, 2.6, 2.6, '#8d7be8', 0);
    ell(2.4, -2.4, 2.6, 2.6, '#6ee7c7', 0);
    ell(7, 1.2, 2.6, 2.6, '#ffd76a', 0);
    ctx.restore();
  }
}

function drawBubble(dt) {
  if (!bubble) return;
  const raw = Math.min(bubble.age / 0.25, (bubble.max - bubble.age) / 0.5, 1);
  const a = clamp(raw, 0, 1);
  if (a <= 0) return;

  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
  const tw = ctx.measureText(bubble.t).width;
  const bw = Math.min(tw + 28, W - 20);
  const bh = 34;
  const bx = clamp(W / 2 - bw / 2, 8, W - bw - 8);
  const headTop = headYCanvas - 74;
  const by = clamp(headTop - bh - 12, 8, H - 60);

  rrect(bx, by, bw, bh, 13, 'rgba(255,255,255,0.95)', 2, 'rgba(90,74,150,0.35)');

  ctx.beginPath();
  ctx.moveTo(W / 2 - 9, by + bh - 2);
  ctx.lineTo(W / 2 + 7, by + bh - 2);
  ctx.lineTo(W / 2 + 2, by + bh + 11);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();

  ctx.fillStyle = COL.dark;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bubble.t, bx + bw / 2, by + bh / 2 + 1);
  ctx.restore();
}

function draw(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!ready || !lay) return;
  const l = lay;
  const sx = clamp(l.us * l.AL, 0, l.physW);
  // Draw from the top of the window: pos.y is the window top, so the pet
  // follows vertical drags/jumps instead of staying pinned to the floor.
  region(0, sx, l.AL, 0, 0);
  if (l.physW - sx > 0.5) {
    region(sx, l.physW - sx, l.AR, l.us * (l.AL - l.AR), 0);
  }
  function region(x0, wpx, A, tx, ty) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.rect(x0, 0, wpx, l.physH);
    ctx.clip();
    ctx.setTransform(A, 0, 0, A, tx, ty);
    drawScene(dt);
    ctx.restore();
  }
}

function drawScene(dt) {
  const a = Math.max(0, groundY() - pos.y);
  const pz = pose();
  irisDY = pz.irisDy || 0;

  drawShadow(a);

  ctx.save();
  ctx.translate(W / 2, GROUND);
  if (squash > 0) {
    ctx.scale(1 + squash * 0.16, 1 - squash * 0.12);
  }
  if (modelId !== 'webillo') ctx.scale(dir, 1);
  ctx.translate(0, pz.shift - pz.bob);
  if (state === 'dance' && !drag && modelId !== 'webillo') ctx.rotate(Math.sin(phase) * 0.05);
  if (state === 'shiver' && !drag) {
    ctx.translate(Math.sin(time * 62) * 2.6, Math.sin(time * 47) * 1.3);
  }
  if (shakeT > 0 && !drag) {
    const k = Math.min(1, shakeT * 1.6) * shakeAmp;
    ctx.translate((Math.sin(time * 91) * 0.7 + Math.sin(time * 57) * 0.3) * k, (Math.sin(time * 73) * 0.7 + Math.cos(time * 49) * 0.3) * k * 0.7);
  }
  if (state === 'spin' && !drag) {
    ctx.translate(0, -110);
    ctx.rotate((st / dur) * TAU);
    ctx.translate(0, 110);
  }

  if (modelId === 'webillo') {
    drawWebillo(time, pz);
  } else if (modelId === 'saitama') {
    if (impactT > 0) ctx.filter = 'grayscale(1) contrast(6) invert(1)';
    drawSaitama(time, pz);
    ctx.filter = 'none';
  } else {
    drawTail(time);
    drawBackHair();
    drawLegs(time, pz.legs);
    drawDress(time);
    for (const ar of armConfig(pz, time)) drawArm(ar);
    drawNeck();
    drawHead(time, pz);
    if (state === 'peek' && !drag) drawPeekHands(time, pz);
    if (pz.prop && !drag) drawProp(pz.prop, time);
  }

  ctx.restore();

  if (impactT > 0 && modelId === 'saitama') drawFocusLines();
  drawParts();
  drawBubble(dt);
}

function drawFocusLines() {
  const f = fistPoint();
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,14,0.85)';
  const n = 46;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + Math.sin(i * 12.9898) * 0.05;
    const w = 0.012 + Math.abs(Math.sin(i * 78.233)) * 0.02;
    const r0 = 26 + Math.abs(Math.sin(i * 3.7)) * 30;
    ctx.beginPath();
    ctx.moveTo(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0);
    ctx.lineTo(f.x + Math.cos(a - w) * 600, f.y + Math.sin(a - w) * 600);
    ctx.lineTo(f.x + Math.cos(a + w) * 600, f.y + Math.sin(a + w) * 600);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ---------- webillo model ----------

const WDATA = {
  hood:"154,446,447;154,448,483;154,484,485;156,433,434;156,435,498;156,499,499;158,425,425;158,426,508;158,509,509;160,418,418;160,419,515;160,516,517;162,412,412;162,413,523;164,407,529;164,530,530;166,402,402;166,403,535;168,398,398;168,399,536;168,538,540;168,541,541;170,394,545;170,546,546;172,390,390;172,391,550;172,551,551;174,387,555;176,384,559;176,560,560;178,381,564;180,378,560;180,562,568;180,569,569;182,375,375;182,376,572;182,573,573;184,373,573;184,575,576;184,577,577;186,370,370;186,371,580;186,581,581;188,368,580;188,582,584;188,585,585;190,366,588;190,589,589;192,363,363;192,364,587;192,589,589;192,591,592;194,361,361;194,362,596;196,359,359;196,360,596;196,598,599;196,600,600;198,358,603;200,356,595;200,597,597;200,599,602;200,606,607;202,354,592;202,594,601;202,604,605;202,607,607;202,609,610;202,611,611;204,352,352;204,353,601;204,603,604;204,606,607;204,609,609;204,613,614;206,351,603;206,605,607;206,611,611;206,613,618;208,349,349;208,350,607;208,613,613;208,615,615;208,618,618;208,621,621;208,622,622;210,348,612;210,614,617;210,619,622;210,624,625;212,346,346;212,347,611;212,613,613;212,615,618;212,620,620;212,622,623;214,345,610;214,616,616;214,619,619;214,622,624;216,344,607;216,609,611;216,614,615;216,617,621;218,342,614;218,619,621;220,341,611;220,613,614;220,621,621;222,340,609;222,611,615;222,619,619;222,622,622;224,339,597;224,599,616;224,623,623;226,337,337;226,338,612;226,614,617;226,621,621;228,336,336;228,337,600;228,602,612;228,614,615;228,618,619;228,621,625;230,335,601;230,603,611;230,613,619;230,622,623;232,334,599;232,601,614;232,616,619;232,621,621;234,333,611;234,613,619;236,332,606;236,608,609;236,611,614;236,617,619;236,621,621;238,331,331;238,332,615;238,617,619;238,621,621;238,626,626;240,330,330;240,331,615;240,617,621;240,624,625;240,627,631;240,634,634;242,330,620;242,622,624;242,630,630;242,634,638;244,329,601;244,603,615;244,617,624;244,628,628;244,631,634;246,328,607;246,609,609;246,611,615;246,617,625;246,629,629;246,637,637;248,327,613;248,615,616;248,618,624;248,626,627;248,633,635;250,326,326;250,327,615;250,617,625;250,627,630;250,633,633;250,637,637;250,641,641;252,326,606;252,608,625;252,630,630;252,635,635;252,639,639;252,641,641;252,643,645;254,325,621;254,623,624;254,628,628;254,632,632;254,637,637;254,640,641;256,324,622;256,624,636;256,640,641;258,324,600;258,602,609;258,611,611;258,613,619;258,621,627;258,629,633;258,637,637;260,323,608;260,610,616;260,619,623;260,630,635;260,637,637;260,640,640;262,323,615;262,617,623;262,631,636;262,638,638;264,322,627;264,631,631;264,633,636;266,322,619;266,621,621;266,624,625;266,629,629;266,638,638;268,321,622;268,624,626;270,321,600;270,603,620;270,625,625;272,320,603;272,605,609;272,611,621;272,624,624;272,626,626;274,320,615;274,617,618;274,621,624;276,319,596;276,598,606;276,608,609;276,611,612;276,619,619;278,319,608;278,610,616;278,621,621;280,318,318;280,319,604;280,606,616;280,623,624;282,318,602;282,604,609;282,613,617;282,619,621;282,623,624;284,318,621;284,623,624;286,318,597;288,317,578;290,317,567;292,317,554;294,316,316;294,317,544;296,316,534;298,316,527;300,316,517;302,316,510;304,316,502;306,315,315;306,316,495;308,315,315;308,316,487;310,315,315;310,316,482;312,315,315;312,316,475;314,315,315;314,316,469;316,315,315;316,316,463;318,315,315;318,316,458;320,315,315;320,316,452;322,316,446;324,316,441;326,316,436;328,316,430;330,316,427;332,316,422;334,316,417;336,316,316;336,317,413;338,317,409;340,317,404;342,317,399;344,317,317;344,318,395;346,318,392;348,318,387;350,318,383;352,318,318;352,319,379;354,319,376;356,319,371;358,319,368;360,320,364;362,320,361;364,320,357;366,321,354;368,321,350;370,321,321;370,322,348;372,322,344;374,322,341;376,323,338;378,323,335;380,323,323;380,324,332;382,324,330;384,324,328;386,322,322",
  cape:"788,298,298;788,299,301;790,298,298;790,299,304;792,298,307;794,298,309;796,298,312;798,298,315;800,298,317;802,298,320;804,298,323;806,297,297;806,298,325;808,297,328;810,297,331;812,297,334;814,297,337;816,297,340;818,297,343;820,297,347;822,297,350;824,297,353;826,297,357;828,297,360;830,297,363;832,297,366;834,297,371;836,297,374;838,297,297;838,298,378;840,297,297;840,298,382;842,298,386;844,298,391;846,298,395;848,298,398;850,298,403;850,659,659;852,298,298;852,299,408;852,654,658;854,299,412;854,649,654;854,655,655;856,299,417;856,644,648;856,650,651;856,652,652;858,299,422;858,637,645;858,647,648;860,299,299;860,300,428;860,631,644;860,645,645;862,300,434;862,624,641;862,642,642;864,300,439;864,618,638;866,300,300;866,301,446;866,610,635;868,301,453;868,603,629;868,631,632;870,301,461;870,594,626;870,629,629;872,302,470;872,585,626;874,302,480;874,573,623;876,303,494;876,561,620;878,303,617;880,304,614;880,615,615;882,304,611;882,612,612;884,305,608;884,609,609;886,305,606;888,306,601;888,603,603;888,604,604;890,306,306;890,307,600;890,601,601;892,307,598;894,308,595;894,596,596;896,308,308;896,309,593;898,309,590;900,310,587;900,588,588;902,311,585;904,312,582;904,583,583;906,312,312;906,313,580;908,313,313;908,314,577;908,578,578;910,314,575;912,315,572;912,573,573;914,316,570;916,317,567;918,318,565;920,319,563;920,564,564;922,320,563;922,564,564;924,321,321;924,322,563;924,564,564;926,323,563;928,324,563;930,325,563;932,326,326;932,327,562;932,563,563;934,328,562;934,563,563;936,329,329;936,330,562;936,563,563;938,331,562;940,332,332;940,333,562;942,334,562;944,336,562;946,337,337;946,338,562;948,339,339;948,340,562;950,341,561;950,562,562;952,343,561;952,562,562;954,345,345;954,346,561;954,562,562;956,347,347;956,348,561;956,562,562;958,350,505;960,352,352;960,353,501;960,502,502;962,355,355;962,356,497;962,498,498;964,358,493;964,494,494;966,361,361;966,362,489;966,490,490;968,364,364;968,365,485;970,368,480;970,481,481;972,372,475;972,476,476;974,376,376;974,377,469;974,470,470;976,381,381;976,382,463;976,464,465;978,387,387;978,388,456;978,457,458;980,394,395;980,396,447;980,448,449;982,404,407;982,408,435;982,436,438",
  ll:"938,506,562;940,506,562;942,506,562;944,506,562;946,506,562;948,506,562;950,506,561;950,562,562;952,506,561;952,562,562;954,506,561;954,562,562;956,506,561;956,562,562;958,508,561;960,508,561;962,508,561;964,507,507;964,508,561;966,507,507;966,508,561;968,507,561;970,507,561;972,507,561;974,507,561;976,507,561;978,494,494;978,495,495;978,497,502;978,503,504;978,507,561;980,489,489;980,490,492;980,494,504;980,505,505;980,506,506;980,507,508;980,509,509;980,510,511;980,512,561;982,487,487;982,488,501;982,502,502;982,503,504;982,505,526;982,527,561;984,486,496;984,497,497;984,498,499;984,500,502;984,503,503;984,504,532;984,533,560;984,561,561;986,485,492;986,494,498;986,499,504;986,505,505;986,506,534;986,535,562;986,563,563;986,564,564;988,484,484;988,485,492;988,494,499;988,500,536;988,537,564;988,565,567;990,484,497;990,498,537;990,538,567;990,568,569;990,570,570;992,483,483;992,484,493;992,495,498;992,499,538;992,539,561;992,562,562;992,563,563;992,564,564;992,565,565;992,566,571;994,483,483;994,484,501;994,502,539;994,540,560;994,561,562;994,563,563;994,564,571;996,483,483;996,484,488;996,490,500;996,501,501;996,502,505;996,506,539;996,540,560;996,561,561;996,562,562;996,563,572;998,481,482;998,483,483;998,485,500;998,501,501;998,502,506;998,507,508;998,510,540;998,541,560;998,561,572;1000,471,486;1000,489,489;1000,490,505;1000,506,506;1000,507,508;1000,510,510;1000,512,541;1000,542,554;1000,555,573;1002,464,464;1002,465,467;1002,468,474;1002,475,477;1002,478,493;1002,498,516;1002,518,518;1002,520,572;1002,573,573;1004,459,459;1004,460,461;1004,466,470;1004,471,501;1004,502,573;1006,456,457;1006,460,478;1006,479,505;1006,506,574;1008,453,453;1008,454,454;1008,456,459;1008,460,460;1008,461,462;1008,463,471;1008,472,473;1008,474,474;1008,475,475;1008,476,476;1008,477,486;1008,487,509;1008,510,575;1010,451,451;1010,452,453;1010,454,482;1010,483,486;1010,487,487;1010,488,491;1010,492,512;1010,514,575;1012,445,445;1012,448,491;1012,492,495;1012,496,515;1012,516,576;1014,440,440;1014,442,495;1014,496,499;1014,500,517;1014,518,577;1014,578,578;1016,438,499;1016,500,502;1016,503,519;1016,521,578;1018,434,503;1018,504,504;1018,505,521;1018,522,579;1020,432,506;1020,507,522;1020,523,579;1022,429,507;1022,509,523;1022,524,580;1024,427,508;1024,510,510;1024,511,522;1024,523,581;1026,425,512;1026,514,521;1026,522,581;1028,422,422;1028,423,427;1028,430,581;1028,582,582;1030,421,421;1030,422,581;1032,420,422;1032,423,423;1032,424,426;1032,427,427;1032,428,582;1034,418,418;1034,419,420;1034,421,421;1034,422,423;1034,424,424;1034,425,425;1034,426,582;1034,583,583;1036,417,424;1036,425,426;1036,427,427;1036,428,582;1038,416,422;1038,423,583;1040,415,415;1040,416,422;1040,423,423;1040,424,424;1040,425,583;1042,414,414;1042,415,416;1042,417,423;1042,424,583;1044,414,415;1044,416,421;1044,422,424;1044,425,425;1044,426,583;1044,584,584;1046,414,414;1046,415,417;1046,418,418;1046,419,419;1046,420,423;1046,424,424;1046,425,582;1046,583,586;1048,413,415;1048,416,416;1048,417,417;1048,418,418;1048,419,421;1048,422,423;1048,424,579;1048,580,586;1050,412,412;1050,413,413;1050,414,414;1050,415,416;1050,417,417;1050,418,418;1050,419,419;1050,420,421;1050,422,422;1050,423,423;1050,424,424;1050,425,573;1050,574,586;1052,411,411;1052,412,413;1052,414,414;1052,415,422;1052,423,423;1052,424,566;1052,567,586;1054,410,411;1054,412,413;1054,414,415;1054,416,419;1054,420,421;1054,422,423;1054,424,556;1054,557,586;1056,409,411;1056,412,417;1056,418,546;1056,547,586;1058,407,407;1058,408,417;1058,418,420;1058,421,535;1058,536,586;1060,408,428;1060,431,521;1060,522,586;1062,408,451;1062,457,500;1062,501,586;1064,408,585;1066,408,584;1068,408,582;1070,408,580;1070,582,582;1072,407,407;1072,408,575;1074,408,408;1074,409,415;1074,416,421;1074,422,567;1074,573,573;1076,409,409;1076,410,413;1076,414,423;1076,424,559;1076,566,566;1078,410,410;1078,411,412;1078,413,428;1078,429,548;1080,412,434;1080,435,538;1080,546,546;1082,416,440;1082,441,528;1082,536,536;1084,422,422;1084,423,450;1084,451,514;1084,525,525;1086,434,434;1086,435,475;1086,476,488;1086,510,510;1088,460,465;1088,466,481;1088,482,484",
  rl:"820,751,756;822,741,757;824,733,734;824,735,738;824,739,757;826,726,727;826,728,729;826,730,758;828,718,758;830,711,714;830,715,715;830,716,759;832,706,759;834,706,706;834,707,760;836,707,760;836,761,761;838,708,761;840,708,761;840,762,762;842,709,762;844,709,709;844,710,763;846,710,763;848,710,710;848,711,764;850,711,764;852,711,711;852,712,765;854,712,765;856,712,712;856,713,765;856,766,766;858,713,766;860,713,713;860,714,766;862,714,767;864,714,767;866,715,768;868,715,768;870,716,768;870,769,769;872,716,769;874,716,716;874,717,769;876,717,770;878,717,770;880,718,770;882,718,771;884,718,771;886,719,771;888,719,772;890,719,772;892,719,719;892,720,772;894,720,772;894,773,773;896,720,773;898,720,773;900,720,720;900,721,773;902,721,773;902,774,774;904,721,774;906,721,774;908,721,721;908,722,774;910,722,774;912,722,774;914,722,775;916,722,775;918,722,722;918,723,775;920,722,722;920,723,775;922,723,775;924,723,775;926,723,775;928,723,775;930,723,775;932,723,775;932,776,776;934,723,776;936,723,776;938,723,776;940,723,776;942,723,776;944,723,776;946,723,776;948,723,776;950,723,776;952,723,776;954,723,776;956,723,776;958,723,776;960,722,722;960,723,776;962,722,722;962,723,775;962,776,776;964,722,775;964,776,776;966,722,775;966,776,776;968,722,775;968,776,776;970,722,775;970,776,776;972,722,775;972,776,776;974,722,775;976,722,777;976,778,782;976,784,784;978,722,773;978,774,790;978,791,791;980,721,721;980,722,762;980,763,792;982,721,721;982,722,752;982,753,794;984,717,718;984,719,749;984,750,795;986,714,719;986,720,720;986,721,747;986,748,796;988,711,711;988,712,712;988,713,713;988,714,718;988,719,720;988,721,745;988,746,796;990,710,712;990,713,714;990,715,715;990,716,719;990,720,720;990,721,744;990,745,797;992,709,709;992,710,710;992,711,712;992,713,714;992,715,715;992,716,716;992,717,719;992,720,721;992,722,743;992,744,797;994,708,708;994,709,710;994,711,713;994,714,718;994,719,719;994,720,720;994,722,722;994,723,743;994,744,797;996,707,707;996,708,709;996,710,710;996,711,712;996,713,720;996,721,722;996,723,728;996,729,740;996,741,741;996,742,742;996,743,797;998,707,712;998,713,724;998,725,728;998,729,741;998,742,742;998,743,799;998,803,804;1000,707,712;1000,713,733;1000,734,741;1000,742,742;1000,743,743;1000,744,790;1000,791,811;1002,707,709;1002,711,713;1002,714,714;1002,715,715;1002,716,736;1002,737,742;1002,743,782;1002,783,817;1004,706,706;1004,707,707;1004,708,709;1004,711,713;1004,714,742;1004,743,743;1004,744,777;1004,778,821;1006,705,705;1006,706,707;1006,708,713;1006,714,714;1006,715,715;1006,716,773;1006,774,825;1008,704,704;1008,705,706;1008,707,708;1008,709,710;1008,711,712;1008,713,769;1008,771,797;1008,799,824;1008,826,827;1010,703,703;1010,704,704;1010,705,706;1010,707,707;1010,708,709;1010,710,710;1010,711,711;1010,712,767;1010,768,791;1010,792,833;1012,703,703;1012,704,708;1012,709,765;1012,766,786;1012,789,838;1012,839,839;1014,702,702;1014,703,703;1014,704,704;1014,705,705;1014,706,706;1014,707,709;1014,710,710;1014,711,763;1014,764,782;1014,784,842;1014,843,843;1016,701,704;1016,705,711;1016,712,712;1016,713,761;1016,762,779;1016,780,845;1018,700,700;1018,702,705;1018,706,706;1018,707,707;1018,708,714;1018,716,760;1018,761,777;1018,779,848;1018,849,849;1020,700,709;1020,710,759;1020,760,774;1020,775,851;1022,699,699;1022,700,705;1022,706,706;1022,707,709;1022,710,711;1022,713,713;1022,715,757;1022,760,772;1022,773,853;1022,854,854;1024,699,705;1024,706,759;1024,763,770;1024,773,855;1026,698,698;1026,699,706;1026,707,759;1026,761,762;1026,768,857;1028,698,698;1028,700,707;1028,708,708;1028,709,710;1028,711,858;1030,698,698;1030,700,708;1030,709,860;1030,861,861;1032,697,697;1032,699,709;1032,710,861;1034,697,697;1034,699,700;1034,703,706;1034,707,709;1034,710,710;1034,711,863;1036,697,697;1036,699,706;1036,707,707;1036,708,708;1036,709,864;1038,697,697;1038,699,700;1038,702,707;1038,708,864;1038,865,865;1040,697,697;1040,699,706;1040,707,865;1040,866,866;1042,695,695;1042,696,702;1042,704,707;1042,708,866;1044,693,693;1044,694,701;1044,703,706;1044,707,866;1046,693,693;1046,695,702;1046,704,704;1046,705,867;1048,692,692;1048,693,695;1048,697,708;1048,709,867;1048,868,868;1050,692,692;1050,693,705;1050,709,711;1050,712,868;1050,869,869;1052,692,692;1052,694,711;1052,719,720;1052,721,721;1052,722,725;1052,726,867;1052,868,869;1052,871,871;1054,692,692;1054,694,722;1054,730,731;1054,732,733;1054,734,734;1054,735,735;1054,737,865;1054,866,871;1056,692,732;1056,733,741;1056,742,743;1056,744,860;1056,861,871;1058,692,692;1058,693,741;1058,742,754;1058,757,760;1058,763,849;1058,850,871;1060,692,692;1060,693,746;1060,747,774;1060,775,828;1060,829,871;1062,693,693;1062,695,759;1062,760,871;1064,694,764;1064,765,871;1066,695,763;1066,764,871;1068,697,765;1068,766,871;1070,700,765;1070,766,871;1072,705,767;1072,768,870;1074,711,711;1074,712,769;1074,770,869;1076,721,721;1076,722,772;1076,773,867;1078,733,733;1078,734,775;1078,776,864;1080,744,780;1080,781,858;1082,755,755;1082,756,791;1082,792,848;1084,770,770;1084,771,842;1084,843,843",
  body:"200,603,605;202,602,603;202,606,606;202,608,608;204,602,602;204,605,605;204,608,608;204,610,612;206,604,604;206,608,610;206,612,612;208,608,612;208,614,614;208,616,617;208,619,620;210,613,613;210,618,618;210,623,623;212,612,612;212,614,614;212,619,619;212,621,621;212,624,627;212,629,629;214,611,615;214,617,618;214,620,621;214,625,630;216,612,613;216,616,616;216,622,628;216,630,630;216,633,634;218,615,618;218,622,638;218,640,640;220,615,620;220,622,630;220,632,636;220,638,642;220,644,644;222,616,618;222,620,621;222,623,628;222,630,635;222,637,637;222,639,640;222,642,646;224,617,622;224,624,636;224,638,639;224,641,641;224,643,646;224,648,650;226,618,620;226,622,634;226,636,646;226,648,653;226,655,655;228,616,617;228,620,620;228,626,626;228,628,629;228,633,633;228,635,647;228,649,653;228,656,656;228,659,659;230,620,621;230,624,627;230,629,634;230,636,654;230,657,660;230,663,663;232,620,620;232,622,628;232,630,630;232,632,661;232,663,665;234,620,630;234,632,632;234,635,668;236,620,620;236,622,628;236,630,633;236,636,637;236,639,672;236,675,675;238,620,620;238,622,625;238,627,642;238,644,647;238,649,677;238,679,679;240,622,623;240,626,626;240,632,633;240,635,642;240,644,644;240,647,682;242,621,621;242,625,629;242,631,633;242,639,686;244,625,627;244,629,630;244,635,640;244,642,648;244,651,690;244,692,692;246,626,628;246,630,636;246,638,646;246,648,695;248,625,625;248,628,632;248,636,645;248,647,699;248,701,701;250,626,626;250,631,632;250,634,636;250,638,640;250,642,703;250,706,706;252,626,629;252,631,634;252,636,638;252,640,640;252,642,642;252,646,646;252,648,709;252,711,711;254,622,622;254,625,627;254,629,631;254,633,636;254,638,639;254,642,647;254,649,714;254,716,716;256,623,623;256,637,639;256,642,643;256,645,720;256,722,722;258,628,628;258,634,636;258,638,727;258,729,729;260,624,629;260,636,636;260,638,639;260,641,733;260,735,735;262,624,630;262,637,637;262,639,644;262,646,740;262,742,743;264,628,630;264,632,632;264,637,642;264,644,644;264,646,748;264,751,751;264,896,899;264,907,997;264,1000,1001;266,622,623;266,626,628;266,630,637;266,639,642;266,644,648;266,650,758;266,761,761;266,871,872;266,878,1017;266,1020,1021;268,623,623;268,627,769;268,773,775;268,848,850;268,855,1031;268,1033,1034;270,621,624;270,626,629;270,631,643;270,645,789;270,794,799;270,817,823;270,830,1043;270,1044,1045;272,622,623;272,625,625;272,627,628;272,630,1053;272,1054,1055;274,616,616;274,619,620;274,625,1061;274,1063,1063;276,613,618;276,620,1069;276,1070,1070;278,617,620;278,622,1075;278,1076,1076;280,617,622;280,625,1081;280,1082,1082;282,618,618;282,622,622;282,625,628;282,632,633;282,636,636;282,638,640;282,642,647;282,649,651;282,653,655;282,657,1086;282,1087,1087;284,622,622;284,625,1091;286,598,1095;286,1096,1096;288,579,1099;288,1100,1100;290,568,1103;290,1104,1104;292,555,1107;294,545,1110;296,535,1113;298,528,1116;300,518,1118;300,1119,1119;302,511,1121;304,503,1123;306,496,1125;306,1126,1126;308,488,706;308,707,707;308,724,724;308,725,1127;310,483,702;310,731,731;310,732,1129;310,1130,1130;312,476,540;312,541,541;312,550,550;312,551,699;312,702,716;312,717,732;312,733,733;312,736,1131;312,1132,1132;314,470,530;314,557,698;314,699,699;314,701,720;314,721,736;314,737,737;314,740,1133;316,464,525;316,526,526;316,559,698;316,718,726;316,727,740;316,741,741;316,743,743;316,744,1135;318,459,521;318,533,552;318,559,560;318,561,698;318,721,733;318,734,743;318,744,744;318,746,1136;318,1137,1137;320,453,517;320,518,518;320,562,698;320,727,738;320,739,746;320,747,747;320,749,1138;322,447,514;322,515,515;322,561,561;322,562,699;322,733,743;322,744,748;322,749,749;322,751,751;322,752,1139;324,442,511;324,561,702;324,703,703;324,743,746;324,747,751;324,753,753;324,754,1140;326,437,509;326,560,725;326,726,727;326,747,749;326,750,752;326,753,753;326,755,755;326,756,1142;328,431,507;328,556,556;328,557,732;328,748,751;328,752,755;328,757,1143;330,428,505;330,538,538;330,539,736;330,737,737;330,749,753;330,754,756;330,757,757;330,759,1144;332,423,503;332,530,530;332,531,741;332,749,756;332,757,758;332,760,1145;334,418,501;334,502,502;334,525,744;334,745,745;334,749,758;334,759,759;334,760,761;334,762,1146;336,414,500;336,520,520;336,521,747;336,748,748;336,763,1147;338,410,498;338,499,499;338,517,750;338,751,751;338,764,1148;340,405,497;340,514,753;340,765,1148;342,400,496;342,511,755;342,765,765;342,766,1149;342,1150,1150;344,396,495;344,508,508;344,509,757;344,758,758;344,766,1150;346,393,494;346,506,760;346,765,1150;348,388,493;348,494,494;348,504,1151;348,1152,1152;350,384,493;350,502,1152;352,380,494;352,500,1152;354,377,1153;356,372,1153;358,369,1153;358,1154,1154;360,365,1153;362,362,709;362,725,1154;364,358,702;364,731,1154;366,355,540;366,545,551;366,556,699;366,733,733;366,734,734;366,735,1154;368,351,531;368,534,535;368,562,696;368,739,1154;370,349,527;370,530,530;370,566,692;370,741,1154;370,1155,1155;372,345,524;372,570,690;372,745,1154;372,1155,1155;374,342,523;374,573,687;374,747,1154;374,1155,1155;376,339,519;376,576,686;376,749,1154;376,1155,1155;378,336,518;378,577,684;378,751,1154;380,333,516;380,579,683;380,752,1154;382,331,514;382,581,682;382,754,1154;384,329,513;384,583,680;384,755,1154;386,323,511;386,584,679;386,756,1154;388,320,510;388,585,678;388,757,1153;388,1154,1154;390,316,316;390,317,509;390,586,677;390,758,1153;392,314,507;392,587,676;392,759,1153;394,311,507;394,588,675;394,759,1152;394,1153,1153;396,308,308;396,309,506;396,589,674;396,760,1152;398,306,505;398,589,673;398,762,1152;400,303,303;400,304,504;400,590,673;400,763,1151;400,1152,1152;402,302,503;402,591,672;402,763,1151;404,299,502;404,592,672;404,763,1150;404,1151,1151;406,296,502;406,592,671;406,764,1130;406,1145,1150;408,294,502;408,593,671;408,764,1126;408,1148,1148;410,291,291;410,292,501;410,593,670;410,764,1124;412,290,501;412,594,670;412,765,1122;414,287,500;414,594,670;414,765,1121;416,285,500;416,594,670;416,765,1120;418,282,282;418,283,500;418,594,670;418,765,1120;420,281,500;420,595,670;420,765,1119;422,279,500;422,595,670;422,765,1119;424,276,500;424,595,670;424,765,1119;426,275,500;426,595,670;426,765,1119;428,273,500;428,595,670;428,765,1120;430,271,500;430,595,670;430,765,1120;432,268,500;432,595,670;432,764,1121;434,267,500;434,594,671;434,764,1122;436,265,501;436,594,671;436,764,1122;438,262,262;438,263,501;438,594,671;438,764,1123;440,261,501;440,593,672;440,763,1123;442,259,502;442,593,672;442,763,1124;444,258,503;444,592,673;444,762,1125;446,255,255;446,256,503;446,592,674;446,761,1126;448,254,504;448,591,675;448,761,1126;450,253,505;450,590,676;450,760,1127;452,250,250;452,251,506;452,589,677;452,759,1128;454,250,507;454,588,678;454,757,1128;456,248,507;456,587,679;456,757,1129;458,246,509;458,586,680;458,756,1129;460,245,509;460,585,682;460,755,1127;462,243,511;462,583,683;462,753,1126;464,241,241;464,242,513;464,582,685;464,751,1124;464,1125,1125;466,241,514;466,580,687;466,749,1123;468,239,517;468,578,689;468,747,1122;470,237,237;470,238,519;470,576,692;470,745,1120;472,236,521;472,573,695;472,741,1119;472,1120,1120;474,235,524;474,571,698;474,738,1118;476,234,528;476,567,703;476,733,1117;478,232,532;478,563,711;478,726,1115;480,232,540;480,555,1114;482,230,1112;484,229,1111;486,228,1109;488,226,226;488,227,1108;490,225,225;490,226,1106;492,224,224;492,225,576;492,591,1105;494,223,223;494,224,575;494,596,597;494,598,667;494,668,668;494,680,680;494,681,1103;496,222,222;496,223,574;496,575,575;496,604,604;496,606,659;496,660,661;496,682,1101;496,1102,1102;498,221,221;498,222,574;498,615,616;498,617,649;498,650,650;498,683,1100;500,220,220;500,221,575;500,682,682;500,683,1098;502,219,219;502,220,575;502,682,1096;502,1097,1097;504,218,218;504,219,576;504,681,681;504,682,1095;506,218,576;506,577,577;506,681,1093;508,217,577;508,680,741;508,742,784;508,785,1091;508,1092,1092;510,216,578;510,679,738;510,739,788;510,789,1090;512,216,579;512,678,678;512,679,736;512,737,790;512,791,1088;514,215,580;514,677,735;514,736,790;514,791,1086;516,214,581;516,676,735;516,736,791;516,792,1084;518,213,582;518,583,583;518,675,735;518,736,791;518,792,1082;518,1083,1083;520,212,584;520,604,604;520,605,616;520,617,618;520,673,673;520,674,735;520,736,791;520,792,1081;522,212,585;522,597,597;522,599,623;522,627,627;522,628,646;522,672,735;522,736,791;522,792,1079;524,210,210;524,211,587;524,594,594;524,595,650;524,651,651;524,652,652;524,670,735;524,736,791;524,792,1077;526,210,589;526,592,592;526,593,651;526,652,654;526,655,655;526,668,668;526,669,735;526,736,791;526,792,1075;528,209,591;528,593,644;528,645,657;528,666,666;528,667,735;528,736,791;528,792,1073;528,1074,1074;530,208,208;530,209,593;530,595,637;530,638,658;530,659,659;530,664,664;530,665,735;530,736,791;530,792,1071;530,1072,1072;532,208,595;532,596,597;532,598,633;532,634,656;532,657,659;532,662,735;532,736,791;532,792,1069;532,1070,1070;534,208,598;534,599,600;534,601,626;534,627,654;534,655,655;534,656,656;534,657,657;534,659,659;534,660,735;534,736,791;534,792,1067;536,207,602;536,603,603;536,604,618;536,619,654;536,655,655;536,656,735;536,736,791;536,792,1066;538,206,605;538,606,607;538,609,614;538,615,649;538,650,652;538,653,735;538,736,791;538,792,1064;540,206,610;540,611,613;540,614,614;540,615,643;540,644,645;540,648,648;540,649,735;540,736,791;540,792,1062;542,205,616;542,617,618;542,620,622;542,623,636;542,637,637;542,642,642;542,643,735;542,736,791;542,792,1060;544,204,204;544,205,735;544,736,791;544,792,1058;544,1059,1059;546,204,735;546,736,791;546,792,1056;546,1057,1057;548,203,203;548,204,735;548,736,791;548,792,1054;548,1055,1055;550,204,735;550,736,791;550,792,1052;552,203,735;552,736,791;552,792,1051;554,202,735;554,736,791;554,792,1049;556,202,735;556,736,791;556,792,1047;558,201,201;558,202,735;558,736,791;558,792,1045;560,201,735;560,736,791;560,792,1043;560,1044,1044;562,201,735;562,736,791;562,792,1044;564,200,200;564,201,735;564,736,791;564,792,1045;566,201,498;566,499,518;566,519,678;566,679,690;566,691,735;566,736,791;566,792,1046;568,200,483;568,484,532;568,533,666;568,667,703;568,704,735;568,736,791;568,792,1047;570,200,476;570,477,541;570,542,659;570,660,709;570,710,735;570,736,791;570,792,1047;570,1048,1048;572,200,470;572,471,547;572,548,654;572,655,714;572,715,735;572,736,791;572,792,1048;572,1049,1049;574,200,465;574,466,552;574,553,650;574,651,718;574,719,735;574,736,791;574,792,1049;576,200,461;576,462,557;576,558,646;576,647,721;576,722,735;576,736,791;576,792,1050;578,199,457;578,458,561;578,562,643;578,644,724;578,725,735;578,736,791;578,792,1050;578,1051,1051;580,199,454;580,455,564;580,565,640;580,641,727;580,728,735;580,736,791;580,792,1051;582,199,451;582,452,567;582,568,638;582,639,729;582,730,735;582,736,791;582,792,1052;584,199,449;584,450,569;584,570,635;584,636,731;584,732,735;584,736,791;584,792,1052;584,1053,1053;586,199,447;586,448,572;586,573,633;586,634,733;586,734,735;586,736,791;586,792,1053;588,199,445;588,446,574;588,575,632;588,633,791;588,792,1054;590,199,443;590,444,576;590,577,630;590,631,791;590,792,1054;592,199,441;592,443,578;592,579,628;592,629,791;592,792,1055;592,1056,1056;594,199,440;594,441,579;594,580,627;594,628,791;594,792,1056;596,199,439;596,440,581;596,582,625;596,626,791;596,792,1057;596,1058,1069;598,199,438;598,439,582;598,583,624;598,625,791;598,792,1057;600,199,437;600,438,583;600,584,623;600,624,791;600,792,1057;602,199,436;602,437,584;602,585,622;602,623,791;602,792,1058;604,199,435;604,436,585;604,586,621;604,622,791;604,792,1058;606,199,434;606,435,498;606,499,519;606,520,585;606,586,620;606,621,791;606,792,1059;608,199,433;608,434,493;608,495,524;608,525,586;608,587,619;608,620,791;608,792,1059;610,199,433;610,434,491;610,492,528;610,529,586;610,587,618;610,619,791;610,792,1060;612,199,432;612,433,489;612,490,530;612,531,587;612,588,617;612,618,695;612,696,707;612,708,791;612,792,1060;614,200,432;614,433,488;614,489,532;614,533,586;614,587,617;614,618,688;614,689,714;614,715,791;614,792,1061;616,200,432;616,433,487;616,488,534;616,535,586;616,587,616;616,617,684;616,685,718;616,719,791;616,792,1061;618,200,431;618,432,487;618,488,536;618,537,585;618,586,615;618,616,682;618,683,721;618,722,791;618,792,1062;620,201,431;620,432,487;620,488,538;620,539,583;620,584,615;620,616,680;620,681,723;620,724,791;620,792,1062;622,201,431;622,432,487;622,488,614;622,615,678;622,679,725;622,726,791;622,792,1063;624,201,431;624,432,487;624,488,614;624,615,676;624,677,727;624,728,791;624,792,1063;626,201,431;626,432,488;626,489,613;626,614,675;626,676,728;626,729,791;626,792,1063;628,202,431;628,432,489;628,490,613;628,614,674;628,675,729;628,730,791;628,792,1064;630,201,201;630,202,431;630,432,491;630,492,612;630,613,673;630,674,730;630,731,791;630,792,1064;632,202,431;632,432,493;632,494,612;632,613,672;632,673,731;632,732,791;632,792,1065;634,202,432;634,433,497;634,498,612;634,613,672;634,673,732;634,733,791;634,792,1065;636,203,432;636,433,501;636,503,611;636,612,671;636,672,732;636,733,791;636,792,1065;638,204,432;638,434,508;638,509,611;638,612,671;638,672,733;638,734,791;638,792,1066;640,203,203;640,204,433;640,434,516;640,517,611;640,612,670;640,671,733;640,734,791;640,792,1066;642,204,434;642,435,524;642,525,611;642,612,670;642,671,734;642,735,791;642,792,1066;644,204,204;644,205,434;644,435,533;644,534,610;644,611,669;644,670,734;644,735,791;644,792,1066;646,205,435;646,436,540;646,541,610;646,611,669;646,670,734;646,735,791;646,792,1067;648,205,205;648,206,436;648,437,547;648,548,610;648,611,669;648,670,734;648,735,791;648,792,1067;648,1068,1068;650,206,437;650,438,554;650,555,610;650,611,669;650,670,734;650,735,791;650,792,1067;652,207,439;652,440,559;652,560,610;652,611,669;652,670,735;652,736,791;652,792,1068;654,207,440;654,441,563;654,564,610;654,611,668;654,669,735;654,736,791;654,792,1068;656,208,442;656,443,567;656,568,610;656,611,668;656,669,735;656,736,791;656,792,1068;658,208,208;658,209,444;658,445,570;658,571,610;658,611,668;658,669,735;658,736,791;658,792,1068;660,209,446;660,447,573;660,574,610;660,611,668;660,669,735;660,736,791;660,792,1068;660,1069,1069;662,210,448;662,449,576;662,577,610;662,611,668;662,669,735;662,736,791;662,792,1068;662,1069,1069;664,210,210;664,211,451;664,452,578;664,579,610;664,611,668;664,669,735;664,736,791;664,792,1069;666,212,453;666,454,580;666,581,610;666,611,668;666,669,735;666,736,791;666,792,1068;668,213,457;668,458,582;668,583,610;668,611,668;668,669,735;668,736,791;668,792,1069;670,213,460;670,461,583;670,584,610;670,611,668;670,669,735;670,736,791;670,792,1069;672,213,213;672,214,465;672,466,585;672,586,610;672,611,669;672,670,735;672,736,791;672,792,1069;674,215,470;674,471,586;674,587,610;674,611,669;674,670,735;674,736,791;674,792,1069;676,215,475;676,476,587;676,588,610;676,611,669;676,670,734;676,735,791;676,792,1069;678,216,482;678,483,588;678,589,610;678,611,669;678,670,734;678,735,791;678,792,1069;680,217,489;680,490,589;680,590,610;680,611,669;680,670,734;680,735,791;680,792,1068;682,217,217;682,218,497;682,498,590;682,591,610;682,611,670;682,671,734;682,735,791;682,792,1069;684,218,218;684,219,505;684,506,591;684,592,611;684,612,670;684,671,733;684,734,791;684,792,1068;686,220,513;686,514,591;686,592,611;686,612,670;686,671,733;686,734,791;686,792,1068;686,1069,1069;688,221,519;688,520,592;688,593,611;688,612,671;688,672,733;688,734,791;688,792,1068;690,222,524;690,525,592;690,593,611;690,612,671;690,672,732;690,733,791;690,792,1068;692,223,527;692,528,592;692,593,612;692,613,672;692,673,731;692,732,791;692,792,1068;694,223,315;694,317,530;694,531,593;694,594,612;694,613,673;694,674,731;694,732,791;694,792,1068;696,224,314;696,316,531;696,532,593;696,594,613;696,614,673;696,674,730;696,731,791;696,792,1067;696,1068,1068;698,226,533;698,534,593;698,594,613;698,614,675;698,676,729;698,730,791;698,792,1067;700,226,533;700,534,593;700,594,613;700,614,676;700,677,727;700,728,791;700,792,1067;702,228,534;702,535,593;702,594,614;702,615,677;702,678,726;702,727,791;702,792,1066;702,1067,1067;704,229,430;704,432,477;704,478,534;704,535,593;704,594,614;704,615,679;704,680,724;704,725,791;704,792,1066;706,229,229;706,230,428;706,429,479;706,480,534;706,535,593;706,594,615;706,616,681;706,682,723;706,724,791;706,792,1066;708,231,427;708,428,481;708,482,534;708,535,593;708,594,616;708,617,683;708,684,720;708,721,791;708,792,1065;710,232,427;710,428,483;710,484,533;710,534,592;710,593,616;710,617,686;710,687,717;710,718,791;710,792,1065;712,233,427;712,428,485;712,486,532;712,533,592;712,593,617;712,618,691;712,692,712;712,713,791;712,792,1064;712,1065,1065;714,235,427;714,428,487;714,488,530;714,531,592;714,593,618;714,619,791;714,792,1064;716,236,427;716,428,490;716,492,528;716,529,591;716,592,619;716,620,791;716,792,1063;716,1064,1064;718,237,428;718,429,494;718,496,525;718,526,590;718,591,619;718,620,791;718,792,1063;720,239,428;720,429,501;720,502,520;720,521,590;720,591,620;720,621,791;720,792,1062;722,240,429;722,430,589;722,590,621;722,622,791;722,792,1061;722,1062,1062;724,242,430;724,431,588;724,589,622;724,623,791;724,792,1061;726,243,431;726,432,587;726,588,623;726,624,791;726,792,1060;728,244,432;728,433,586;728,587,625;728,626,791;728,792,1059;730,246,433;730,434,585;730,586,626;730,627,791;730,792,1058;730,1059,1059;732,247,435;732,436,583;732,585,627;732,628,791;732,792,1057;734,249,436;734,437,582;734,583,629;734,630,791;734,792,1057;736,250,438;736,439,580;736,581,630;736,631,735;736,736,736;736,737,791;736,792,1056;738,252,440;738,441,578;738,579,632;738,633,733;738,734,736;738,737,791;738,792,1055;740,254,442;740,443,576;740,578,634;740,635,732;740,733,737;740,738,791;740,792,1054;742,255,445;742,446,574;742,575,636;742,637,730;742,731,737;742,738,791;742,792,1053;744,257,448;744,449,571;744,572,639;744,640,728;744,729,737;744,738,791;744,792,1052;746,259,451;746,452,568;746,569,641;746,642,725;746,726,737;746,738,791;746,792,1050;746,1051,1051;748,260,454;748,455,565;748,566,644;748,645,723;748,724,737;748,738,791;748,792,1049;748,1050,1050;750,262,458;750,459,561;750,562,648;750,649,720;750,721,738;750,739,790;750,791,1048;752,264,463;752,464,556;752,557,652;752,653,716;752,717,739;752,740,789;752,790,1047;754,265,469;754,470,551;754,552,656;754,657,712;754,713,740;754,741,787;754,788,1045;754,1046,1046;756,267,476;756,477,544;756,545,662;756,663,707;756,708,1044;758,269,488;758,489,533;758,534,672;758,673,698;758,699,1043;760,270,270;760,271,1041;762,272,272;762,273,1040;764,274,274;764,275,1038;766,276,1036;766,1037,1037;768,278,1034;768,1035,1035;770,280,280;770,281,1033;772,282,282;772,283,1031;774,285,1029;776,287,1026;778,289,1024;778,1025,1025;780,291,291;780,292,1022;782,293,293;782,294,1020;784,296,1017;786,298,298;786,299,1014;786,1015,1015;788,302,1011;788,1012,1012;790,305,1008;790,1009,1009;792,308,1005;794,310,1002;796,313,998;798,316,994;800,318,989;800,990,990;802,321,984;804,324,979;804,980,980;806,326,972;808,329,966;808,967,967;810,332,956;810,957,957;812,335,820;812,821,824;812,842,848;812,851,943;812,944,945;814,338,788;814,789,790;816,341,773;816,774,774;818,344,761;818,762,762;820,348,750;822,351,740;824,354,732;826,358,725;828,361,717;830,364,710;832,367,705;834,372,700;834,701,701;836,375,695;838,379,689;838,690,690;840,383,684;842,387,679;844,392,674;846,396,669;846,670,670;848,399,665;848,666,666;850,404,658;850,660,660;850,662,662;852,409,653;854,413,648;856,418,643;856,649,649;858,423,636;860,429,630;862,435,623;864,440,617;866,447,609;868,454,602;870,462,593;872,471,584;874,481,572;876,495,560",
  la:"574,196,199;576,191,191;576,192,199;578,187,187;578,188,198;580,183,198;582,179,179;582,180,198;584,175,175;584,176,198;586,172,198;588,168,168;588,169,198;590,165,198;592,162,198;594,159,198;596,156,196;596,197,197;596,198,198;598,153,196;598,197,197;598,198,198;600,150,196;600,197,197;600,198,198;602,147,147;602,148,196;602,197,197;602,198,198;604,145,197;604,198,198;606,142,142;606,143,197;606,198,198;608,140,197;608,198,198;610,138,197;610,198,198;612,136,197;612,198,198;614,134,197;614,198,198;614,199,199;616,132,198;616,199,199;618,130,198;618,199,199;620,129,198;620,199,199;620,200,200;622,127,198;622,199,199;622,200,200;624,126,200;626,124,199;626,200,200;628,123,195;628,196,196;628,201,201;630,122,191;630,192,192;632,121,188;634,120,184;634,185,185;636,119,181;636,182,182;638,118,178;638,179,179;640,117,176;642,116,116;642,117,173;644,116,171;646,115,168;646,169,169;648,115,167;650,114,114;650,115,165;650,166,166;652,114,164;654,114,163;654,164,164;656,114,163;658,114,162;658,163,163;660,114,163;662,114,163;664,114,164;666,114,165;668,114,114;668,115,166;670,115,167;672,115,169;674,116,170;674,171,171;676,116,116;676,117,172;678,117,174;680,118,176;682,119,178;682,179,179;684,119,119;684,120,180;684,181,181;686,120,120;686,121,183;686,184,184;688,121,121;688,122,186;690,123,189;692,124,192;694,125,195;696,126,198;696,199,199;698,128,202;700,129,205;700,206,206;702,131,209;702,210,210;704,132,132;704,133,213;706,134,216;706,217,217;708,136,220;708,221,221;710,138,224;710,225,225;712,140,227;712,228,228;714,142,231;714,232,232;714,234,234;716,144,235;718,146,146;718,147,236;720,149,236;720,237,237;720,238,238;722,151,151;722,152,239;724,154,239;724,240,240;724,241,241;726,157,240;726,241,241;726,242,242;728,160,243;730,162,162;730,163,243;730,244,244;730,245,245;732,165,165;732,166,244;732,245,246;734,169,246;734,247,247;734,248,248;736,172,247;736,248,249;738,175,175;738,176,249;738,250,250;738,251,251;740,179,251;740,252,252;740,253,253;742,182,182;742,183,252;742,253,254;744,186,254;744,255,255;744,256,256;746,189,189;746,190,255;746,256,257;746,258,258;748,193,257;748,258,259;750,196,257;750,258,258;750,259,259;750,260,260;750,261,261;752,198,261;752,262,262;752,263,263;754,197,264;756,196,196;756,197,254;756,255,255;756,256,266;758,196,267;758,268,268;760,195,268;762,194,194;762,195,268;762,269,269;764,194,269;766,194,270;768,193,270;770,193,270;770,271,271;772,193,271;774,193,271;776,193,261;776,262,263;776,264,271;776,272,272;778,193,256;778,257,258;778,259,259;778,260,261;778,262,271;778,272,272;780,193,257;780,258,259;780,260,271;780,272,272;782,193,272;784,193,272;786,191,191;786,192,192;786,193,193;786,194,271;786,272,272;788,184,264;788,265,265;788,266,271;788,272,272;790,180,193;790,194,194;790,195,271;790,272,272;792,178,193;792,194,194;792,195,271;794,176,176;794,177,193;794,194,195;794,196,271;796,175,192;796,193,195;796,197,270;796,271,271;798,174,174;798,175,193;798,194,196;798,198,270;800,174,194;800,195,196;800,198,198;800,199,269;800,270,270;802,173,196;802,197,199;802,200,269;804,173,196;804,197,200;804,201,268;804,269,269;806,173,196;806,197,197;806,198,200;806,201,201;806,202,267;806,268,268;808,173,173;808,174,267;810,174,266;812,174,174;812,175,264;812,265,265;814,175,263;816,176,262;818,177,260;820,178,178;820,179,258;820,259,259;822,180,256;822,257,257;824,181,181;824,182,254;826,183,183;826,184,251;826,252,252;828,186,248;830,189,242;830,243,243;832,192,192;832,193,239;832,240,240;834,197,197;834,198,235;834,236,236;836,212,212;836,213,229;836,230,230",
  ra:"376,1214,1214;376,1215,1218;376,1219,1220;378,1208,1225;378,1226,1226;380,1205,1228;380,1229,1229;382,1203,1231;384,1201,1232;384,1233,1233;386,1199,1232;386,1234,1234;388,1198,1235;390,1196,1196;390,1197,1235;392,1195,1235;392,1236,1236;394,1194,1235;394,1236,1236;396,1193,1235;396,1236,1236;398,1191,1191;398,1192,1235;400,1190,1190;400,1191,1235;402,1189,1234;404,1188,1233;406,1131,1144;406,1187,1232;408,1127,1147;408,1149,1150;408,1186,1231;410,1125,1152;410,1185,1230;410,1247,1247;410,1249,1261;412,1123,1154;412,1184,1229;412,1243,1264;412,1265,1265;414,1122,1155;414,1183,1227;414,1228,1228;414,1240,1267;416,1121,1156;416,1157,1157;416,1182,1226;416,1238,1269;418,1121,1157;418,1158,1158;418,1180,1180;418,1181,1225;418,1235,1270;420,1120,1158;420,1159,1159;420,1179,1223;420,1224,1224;420,1233,1271;422,1120,1159;422,1178,1222;422,1231,1272;424,1120,1160;424,1177,1221;424,1229,1272;424,1273,1273;426,1120,1160;426,1161,1161;426,1176,1219;426,1227,1273;428,1121,1161;428,1175,1218;428,1225,1273;430,1121,1162;430,1174,1217;430,1223,1273;432,1122,1162;432,1172,1172;432,1173,1215;432,1216,1216;432,1221,1272;434,1123,1162;434,1163,1163;434,1171,1214;434,1218,1218;434,1219,1271;434,1272,1272;436,1123,1163;436,1169,1213;436,1216,1216;436,1217,1271;438,1124,1163;438,1164,1164;438,1167,1212;438,1214,1214;438,1215,1269;438,1270,1270;440,1124,1163;440,1164,1165;440,1166,1210;440,1211,1211;440,1213,1268;442,1125,1266;442,1267,1267;444,1126,1264;444,1265,1265;446,1127,1262;448,1127,1260;450,1128,1257;450,1258,1258;452,1129,1255;454,1129,1252;454,1260,1270;456,1130,1249;456,1250,1250;456,1255,1255;456,1256,1274;458,1130,1246;458,1247,1247;458,1251,1251;458,1252,1277;460,1130,1244;460,1247,1247;460,1248,1278;460,1279,1279;462,1130,1241;462,1243,1243;462,1244,1280;464,1130,1130;464,1131,1238;464,1239,1239;464,1240,1281;466,1131,1232;466,1233,1233;466,1234,1235;466,1236,1236;466,1237,1281;468,1131,1229;468,1230,1231;468,1232,1282;470,1131,1282;472,1131,1282;474,1131,1282;476,1131,1281;478,1131,1280;478,1281,1281;480,1131,1279;482,1131,1278;484,1131,1131;484,1132,1276;486,1132,1274;488,1132,1271;488,1272,1272;490,1132,1132;490,1133,1267;490,1268,1268;492,1133,1263;492,1264,1264;494,1133,1133;494,1134,1259;496,1134,1254;496,1255,1255;498,1135,1249;498,1250,1250;500,1136,1244;500,1245,1245;502,1137,1240;502,1241,1241;504,1138,1236;504,1237,1237;506,1139,1235;508,1140,1233;510,1141,1231;510,1232,1232;512,1142,1230;514,1143,1228;516,1142,1142;516,1143,1226;518,1142,1224;520,1141,1222;522,1140,1220;524,1139,1217;524,1218,1218;526,1138,1138;526,1139,1215;528,1137,1137;528,1138,1212;530,1137,1209;532,1136,1205;532,1206,1206;534,1135,1200;534,1201,1201;536,1134,1194;536,1195,1196;538,1133,1184;538,1185,1185;540,1132,1183;540,1184,1184;542,1131,1183;544,1130,1182;546,1129,1181;548,1128,1180;550,1127,1179;552,1125,1125;552,1126,1178;554,1124,1177;556,1123,1176;556,1177,1177;558,1122,1175;558,1176,1176;560,1120,1120;560,1121,1174;560,1175,1175;562,1119,1174;564,1118,1173;566,1116,1172;568,1115,1171;570,1113,1169;570,1170,1170;572,1112,1168;572,1169,1169;574,1110,1167;574,1168,1168;576,1108,1166;578,1106,1165;580,1104,1164;582,1102,1163;584,1099,1099;584,1100,1162;586,1097,1160;586,1161,1161;588,1093,1093;588,1094,1159;590,1090,1158;592,1085,1085;592,1086,1156;592,1157,1157;594,1079,1079;594,1080,1155;596,1070,1154;598,1058,1152;598,1153,1153;600,1058,1151;602,1059,1149;602,1150,1150;604,1059,1148;606,1060,1146;608,1060,1144;608,1145,1145;610,1061,1143;612,1061,1141;614,1062,1139;616,1062,1137;616,1138,1138;618,1063,1135;620,1063,1133;622,1064,1131;624,1064,1129;626,1064,1126;626,1127,1127;628,1065,1124;630,1065,1121;632,1066,1118;634,1066,1115;636,1066,1111;636,1112,1112;638,1067,1107;638,1108,1108;640,1067,1103;642,1067,1097;642,1098,1098;644,1067,1091;644,1092,1092;646,1068,1083;646,1084,1084",
  eL:"368,540,553;370,533,561;370,564,564;372,528,565;374,525,568;374,571,571;376,522,571;376,574,574;378,520,574;378,576,576;380,518,576;380,578,578;382,516,578;382,580,580;384,514,579;386,513,581;386,583,583;388,511,582;388,584,584;390,510,583;392,509,584;394,508,585;396,507,558;396,562,587;398,507,550;398,570,588;400,506,546;400,574,588;402,505,543;402,576,589;404,504,541;404,579,590;406,504,539;406,581,591;408,503,538;408,582,591;410,503,536;410,538,538;410,583,591;412,503,535;412,585,592;414,502,534;414,536,538;414,543,552;414,586,592;416,503,534;416,535,535;416,585,585;416,586,593;418,503,533;418,587,593;420,503,532;420,588,593;422,503,532;422,587,587;422,588,593;424,503,531;424,533,533;424,589,593;426,503,531;426,589,593;428,503,531;428,589,593;430,503,531;430,588,588;430,589,593;432,502,531;432,588,588;432,590,593;434,504,531;434,588,588;434,589,593;436,504,531;436,589,593;438,505,531;438,589,592;440,505,531;440,533,544;440,589,592;442,506,532;442,587,587;442,588,592;444,506,532;444,588,591;446,507,533;446,586,586;446,587,590;448,508,534;448,535,536;448,587,590;450,509,534;450,586,589;452,510,535;452,585,588;454,511,536;454,584,587;456,513,537;456,583,586;458,514,539;458,580,580;458,581,585;460,516,541;460,580,583;462,518,543;462,578,582;464,520,545;464,576,580;466,522,548;466,572,576;468,525,553;468,568,574;470,530,571;472,537,568;474,541,566;476,550,550",
  eR:"364,709,724;364,729,729;366,703,731;368,698,735;370,695,739;372,692,741;374,690,744;374,746,746;376,688,746;376,748,748;378,686,748;378,750,750;380,684,750;382,683,751;382,753,753;384,682,753;386,680,754;388,679,755;390,678,756;392,677,757;394,677,698;394,701,701;394,715,758;396,676,694;396,717,717;396,719,759;398,675,691;398,722,760;400,675,688;400,724,760;402,674,686;402,726,761;404,674,685;404,686,686;404,728,762;406,673,683;406,729,762;408,673,682;408,730,762;410,673,681;410,731,763;412,673,680;412,732,763;414,673,679;414,733,763;416,673,678;416,734,764;418,673,678;418,733,733;418,734,764;420,673,677;420,735,764;422,673,677;422,735,764;424,673,677;424,734,734;424,735,764;426,673,677;426,735,764;428,673,677;428,678,678;428,735,764;430,674,677;430,678,678;430,735,763;432,674,677;432,735,763;434,676,677;434,722,731;434,733,734;434,735,763;436,676,677;436,735,763;438,677,677;438,735,762;440,677,678;440,734,762;442,678,678;442,734,761;444,678,679;444,732,732;444,733,760;446,679,680;446,732,760;448,680,680;448,732,759;450,681,681;450,731,758;452,682,682;452,729,757;454,683,684;454,727,727;454,728,756;456,685,685;456,727,755;458,686,687;458,725,754;460,688,689;460,723,752;462,691,691;462,720,751;464,693,695;464,717,749;466,696,700;466,712,747;468,698,745;470,700,743;472,704,739;474,714,732;474,734,735",
  iL:"398,551,552;398,568,569;400,550,550;400,551,557;400,558,561;400,562,569;400,570,570;400,572,573;402,547,549;402,550,572;402,573,573;402,575,575;404,545,556;404,557,575;404,576,576;404,578,578;406,544,557;406,558,571;406,572,575;406,576,577;406,578,579;406,580,580;408,541,558;408,559,566;408,567,567;408,568,569;408,570,576;408,577,577;408,579,579;408,581,581;410,502,502;410,540,560;410,561,564;410,565,565;410,566,566;410,567,578;410,579,579;410,581,581;410,582,582;412,502,502;412,538,539;412,542,562;412,563,563;412,565,565;412,566,580;412,581,583;412,584,584;414,501,501;414,564,564;414,565,565;414,566,580;414,585,585;416,501,502;416,564,564;416,565,581;418,501,502;418,564,564;418,565,565;418,566,581;420,501,502;420,565,565;420,566,581;420,582,582;422,501,502;422,566,566;422,567,580;424,501,502;424,567,567;424,568,579;426,501,502;426,571,576;428,501,502;430,501,502;432,501,501;434,501,503;436,502,503;438,502,504;440,502,504;442,503,505;444,504,505;444,535,537;444,538,542;444,543,544;444,545,545;444,546,546;446,504,506;446,536,536;446,537,547;446,572,573;446,574,580;446,581,584;448,505,507;448,537,548;448,549,549;448,571,572;448,573,581;448,582,584;448,586,586;450,506,508;450,535,535;450,536,537;450,538,551;450,569,571;450,572,582;450,583,583;450,585,585;452,507,509;452,536,536;452,538,538;452,539,554;452,555,556;452,565,570;452,571,581;452,582,582;452,584,584;454,508,510;454,537,537;454,539,539;454,540,579;454,580,581;454,583,583;456,508,512;456,538,538;456,539,539;456,541,577;456,578,580;456,582,582;458,510,513;458,540,540;458,542,543;458,544,575;458,576,578;460,510,515;460,542,542;460,544,545;460,546,573;460,574,577;460,579,579;462,512,517;462,544,544;462,546,546;462,547,571;462,572,575;462,577,577;464,514,519;464,546,546;464,549,549;464,550,550;464,551,555;464,556,567;464,568,572;464,574,575;464,581,581;466,515,521;466,549,550;466,553,561;466,562,566;466,567,567;466,577,579;468,518,524;468,563,563;468,564,567;468,575,577;470,520,529;470,572,575;472,522,536;472,569,572;474,525,540;474,567,570;476,529,549;476,551,566;478,533,562;480,541,554",
  iR:"394,676,676;396,675,675;398,674,674;400,674,674;402,673,673;404,673,673;404,718,720;404,723,724;406,672,672;406,684,684;406,714,724;406,726,727;408,672,672;408,683,683;408,713,726;408,727,728;410,671,672;410,682,682;410,684,685;410,686,689;410,690,699;410,712,726;410,728,729;412,671,672;412,681,681;412,683,689;412,690,696;412,710,710;412,711,727;414,671,672;414,680,680;414,682,690;414,691,694;414,711,727;416,671,672;416,679,679;416,681,681;416,682,690;416,691,693;416,712,727;418,671,672;418,679,679;418,681,681;418,682,682;418,683,690;418,691,692;418,713,727;418,728,728;420,671,672;420,678,678;420,681,682;420,683,689;420,690,691;420,714,725;422,671,672;422,678,678;422,716,723;424,671,672;424,678,678;426,671,672;426,678,678;428,671,672;430,671,673;432,671,673;432,678,678;434,672,675;434,678,678;436,672,675;436,678,678;436,680,688;436,689,689;436,690,690;438,672,676;438,678,678;438,681,683;438,684,690;438,691,691;440,673,676;440,679,679;440,681,682;440,683,691;440,692,692;442,673,677;442,679,679;442,681,681;442,682,692;442,693,693;444,674,677;444,680,680;444,682,693;444,694,694;444,717,718;444,719,724;444,725,730;446,675,678;446,681,681;446,682,682;446,683,695;446,715,716;446,717,726;446,727,730;448,676,679;448,681,681;448,683,683;448,684,697;448,698,698;448,711,713;448,714,725;448,726,729;450,677,680;450,682,682;450,684,684;450,685,701;450,702,708;450,709,724;450,725,728;452,678,681;452,683,683;452,685,685;452,686,724;452,725,727;454,679,682;454,685,685;454,687,687;454,688,688;454,689,723;454,724,725;456,680,684;456,686,686;456,688,691;456,692,723;456,724,724;456,726,726;458,681,685;458,688,688;458,690,693;458,694,722;458,724,724;460,683,687;460,690,690;460,693,697;460,698,719;460,720,720;460,722,722;462,684,690;462,692,693;462,696,700;462,701,706;462,707,717;462,719,719;464,686,692;464,696,697;464,700,701;464,702,706;464,707,711;466,688,695;466,701,711;468,690,697;470,693,699;472,696,703;474,699,713;474,733,733;476,704,732;478,712,725",
};
const WBOX = {eL:[502,368,593,476],eR:[673,364,764,474],iL:[535,436,582,476],iR:[681,436,726,466]};

const WS = 0.285;
const _wx = (v) => W / 2 + (v - 693) * WS;
const _wy = (v) => GROUND + (v - 1095) * WS;

let wImg = null;
let wLay = null;

function wParse(s) {
  const out = [];
  if (!s) return out;
  const p = s.split(';');
  for (let i = 0; i < p.length; i++) {
    const q = p[i].split(',');
    out.push(+q[0], +q[1], +q[2]);
  }
  return out;
}

function wPath(runs) {
  const p = new Path2D();
  for (let i = 0; i < runs.length; i += 3) {
    p.rect(_wx(runs[i + 1]), _wy(runs[i]), (runs[i + 2] - runs[i + 1] + 1) * WS + 0.5, 2 * WS + 0.5);
  }
  return p;
}

function wBlit(runs) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  if (!runs.length) return c;
  const g = c.getContext('2d');
  g.save();
  g.clip(wPath(runs));
  g.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high';
  g.drawImage(wImg, _wx(0), _wy(0), 1325 * WS, 1187 * WS);
  g.restore();
  return c;
}

function wBodyGrad(g) {
  const grd = g.createLinearGradient(_wx(330), 0, _wx(1150), 0);
  grd.addColorStop(0, '#41968d');
  grd.addColorStop(0.11, '#509c8d');
  grd.addColorStop(0.354, '#5baa96');
  grd.addColorStop(0.573, '#6ebaa2');
  grd.addColorStop(0.817, '#6bc2a8');
  grd.addColorStop(1, '#6dc4ab');
  return grd;
}

function wPatch(c) {
  const g = c.getContext('2d');
  const grd = wBodyGrad(g);
  const pairs = [['eL', 'iL'], ['eR', 'iR']];
  for (let k = 0; k < pairs.length; k++) {
    const runs = wParse(WDATA[pairs[k][0]]).concat(wParse(WDATA[pairs[k][1]]));
    if (!runs.length) continue;
    g.save();
    g.clip(wPath(runs));
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    g.restore();
  }
}

function wDip(c) {
  const runs = wParse(WDATA.body);
  const rowMax = {};
  for (let i = 0; i < runs.length; i += 3) {
    const y = runs[i];
    const x1 = runs[i + 2];
    if (rowMax[y] === undefined || x1 > rowMax[y]) rowMax[y] = x1;
  }
  const ya = 404;
  const yb = 646;
  if (rowMax[ya] === undefined || rowMax[yb] === undefined) return;
  const a = rowMax[ya];
  const b = rowMax[yb];
  let last = a;
  const left = [];
  const right = [];
  for (let y = ya; y <= yb; y += 2) {
    const m = rowMax[y];
    if (m !== undefined) last = m;
    left.push([last, y]);
    const t = a + ((b - a) * (y - ya)) / (yb - ya);
    right.push([Math.max(last, t), y]);
  }
  const p = new Path2D();
  p.moveTo(_wx(left[0][0]), _wy(left[0][1]));
  for (let i = 1; i < left.length; i++) p.lineTo(_wx(left[i][0]), _wy(left[i][1]));
  for (let i = right.length - 1; i >= 0; i--) p.lineTo(_wx(right[i][0]), _wy(right[i][1]));
  p.closePath();
  const g = c.getContext('2d');
  g.fillStyle = wBodyGrad(g);
  g.fill(p);
}

function wBuild() {
  if (!wImg || !wImg.naturalWidth) return;
  wLay = {};
  for (const k in WDATA) wLay[k] = wBlit(wParse(WDATA[k]));
  wPatch(wLay.body);
  wDip(wLay.body);
  wEyeBase();
}

// Solid white eyes baked into the body layer so no traced leftovers show
// through behind the animated pupils. Also cover the brow/mouth areas with
// body green so nothing behind shows through those hollow features.
function wEyeBase() {
  const g = wLay.body.getContext('2d');
  g.save();
  // Green covers for brows and mouth, using the same body gradient so they
  // blend invisibly. Generous so the baked-in features are fully erased.
  g.fillStyle = wBodyGrad(g);
  const covers = [
    [-45, -215, 26, 12], [8, -215, 26, 12],   // brows
    [-13, -170, 30, 18]                        // mouth (moved up, covers the baked one)
  ];
  for (const c of covers) {
    g.beginPath();
    g.ellipse(c[0] + W / 2, c[1] + GROUND, c[2], c[3], 0, 0, TAU);
    g.fill();
  }
  // White eyes.
  const eyes = [
    [-41.5, -192, 13.5, 15.5],
    [7.2, -192.6, 13.5, 15.5]
  ];
  for (const e of eyes) {
    const cx = e[0] + W / 2;
    const cy = e[1] + GROUND;
    g.beginPath();
    g.ellipse(cx, cy, e[2], e[3], 0, 0, TAU);
    g.fillStyle = '#ffffff';
    g.fill();
    g.strokeStyle = 'rgba(18,45,48,0.55)';
    g.lineWidth = 1.6;
    g.stroke();
  }
  g.restore();
}

// The supplied render has eyes, mouth and "sd" baked in. Cover them with the
// body gradient so the animated face and lettering can be drawn cleanly on top.
function wEraseFeatures() {
  const g = wLay.body.getContext('2d');
  g.save();
  g.clip(wPath(wParse(WDATA.body)));
  g.beginPath();
  g.ellipse(_wx(610), _wy(560), 250 * WS, 300 * WS, 0, 0, TAU);
  g.fillStyle = wBodyGrad(g);
  g.fill();
  g.restore();
}

function wKeyBackground(c) {
  const g = c.getContext('2d');
  const image = g.getImageData(0, 0, c.width, c.height);
  const data = image.data;
  const count = c.width * c.height;
  const visited = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  const nearBlack = (i) => Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) <= 10;
  const add = (i) => {
    if (!visited[i] && nearBlack(i)) {
      visited[i] = 1;
      queue[tail++] = i;
    }
  };

  for (let x = 0; x < c.width; x++) {
    add(x);
    add((c.height - 1) * c.width + x);
  }
  for (let y = 1; y < c.height - 1; y++) {
    add(y * c.width);
    add(y * c.width + c.width - 1);
  }

  while (head < tail) {
    const i = queue[head++];
    data[i * 4 + 3] = 0;
    const x = i % c.width;
    if (x > 0) add(i - 1);
    if (x + 1 < c.width) add(i + 1);
    if (i >= c.width) add(i - c.width);
    if (i + c.width < count) add(i + c.width);
  }

  g.putImageData(image, 0, 0);
}

(function wLoad() {
  wImg = new Image();
  wImg.onload = wBuild;
  wImg.onerror = function () {
    wLay = null;
    console.error('webillo: no se pudo cargar assets/webillo.png');
  };
  wImg.src = 'assets/webillo.png';
})();

const WARMC = '#33585b';
const WARML = '#16343a';

function wArmPose(pz, t) {
  const w = Math.sin(t * 5);
  const breathe = Math.sin(t * 2.1);
  const sw = Math.sin(phase);
  const ph = Math.sin(phase * 0.9);
  const L = { s: { x: -125, y: -129 }, e: { x: -161 + breathe * 2, y: -120 }, h: { x: -152 + breathe * 2, y: -84 } };
  const R = { s: { x: 100, y: -132 }, e: { x: 127 + w * 5, y: -161 + w * 3 }, h: { x: 144 + w * 9, y: -176 + w * 12 } };
  const downL = { s: { x: -125, y: -129 }, e: { x: -156, y: -106 }, h: { x: -150 + sw * 9, y: -78 } };
  const downR = { s: { x: 100, y: -132 }, e: { x: 136, y: -110 }, h: { x: 142 - sw * 9, y: -78 } };
  const upL = { s: { x: -125, y: -129 }, e: { x: -158, y: -163 }, h: { x: -147, y: -192 } };
  const upR = { s: { x: 100, y: -132 }, e: { x: 152, y: -170 }, h: { x: 146, y: -198 } };
  switch (pz.arms) {
    case 'swing': return [downL, downR];
    case 'up': return [upL, upR];
    case 'dance':
      return ph > 0 ? [upL, downR] : [downL, upR];
    case 'hold':
      return [L, { s: { x: 100, y: -132 }, e: { x: 158, y: -124 }, h: { x: 152, y: -98 } }];
    case 'curl':
      return [
        { s: { x: -125, y: -129 }, e: { x: -152, y: -112 }, h: { x: -143, y: -88 } },
        { s: { x: 100, y: -132 }, e: { x: 140, y: -114 }, h: { x: 130, y: -92 } }
      ];
    default: return [L, R];
  }
}

function wDrawArm(a, open) {
  const s = a.s;
  const e = a.e;
  const h = a.h;
  const cx = 2 * e.x - (s.x + h.x) / 2;
  const cy = 2 * e.y - (s.y + h.y) / 2;
  limb(s.x, s.y, h.x, h.y, cx, cy, WARMC, 6.4, 5, WARML);
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(Math.atan2(h.y - cy, h.x - cx));
  ell(0, 0, 5.6, 5.4, WARMC, 1.5, WARML);
  if (open) {
    for (let i = -1.5; i <= 1.5; i += 1) {
      const fa = i * 0.46;
      ell(Math.cos(fa) * 7.8, Math.sin(fa) * 7.8, 3.9, 2.8, WARMC, 1.4, WARML);
    }
  }
  ctx.restore();
}

// Silhouette traced from the company logo (source pixel measurements converted
// to the drawing space used by the waifu: origin at center, y = 0 on the floor).
function webilloBodyPath() {
  const pts = [
    [-69, -221], [-58, -268], [-46, -265], [-35, -260], [-24, -254], [-12, -248],
    [-1, -243], [11, -238], [22, -235], [33, -235], [45, -235], [56, -236],
    [68, -237], [79, -237], [90, -236], [102, -235], [113, -231], [124, -223],
    [122, -204], [122, -192], [113, -181], [109, -170], [107, -158], [105, -147],
    [106, -135], [107, -124], [106, -113], [103, -101], [94, -90], [53, -81],
    [36, -81], [19, -79], [11, -77], [2, -75], [-7, -71], [-15, -66], [-24, -61],
    [-32, -56], [-41, -56], [-49, -62], [-58, -63], [-66, -64], [-75, -67],
    [-99, -78], [-114, -90], [-125, -101], [-133, -113], [-138, -124], [-140, -135],
    [-140, -147], [-139, -158], [-134, -170], [-128, -181], [-117, -192],
    [-103, -204], [-82, -215], [-52, -227]
  ];
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const n = pts[(i + 1) % pts.length];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + n[0]) / 2, (p[1] + n[1]) / 2);
  }
  ctx.closePath();
}

function drawWebilloShell() {
  ctx.save();
  ctx.translate(-12, -14);
  ctx.scale(1.05, 1.06);
  webilloBodyPath();
  const g = ctx.createLinearGradient(-140, -268, 120, -60);
  g.addColorStop(0, '#1c464b');
  g.addColorStop(0.55, '#28545a');
  g.addColorStop(1, '#173a3f');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

function drawWebilloBody() {
  webilloBodyPath();
  const g = ctx.createLinearGradient(-132, -258, 128, -66);
  g.addColorStop(0, '#3f9a88');
  g.addColorStop(0.42, '#54b098');
  g.addColorStop(1, '#6ec5a9');
  ctx.fillStyle = g;
  ctx.fill();

  // Soft inner sheen like the logo's glossy front.
  const sheen = ctx.createLinearGradient(-80, -250, 90, -80);
  sheen.addColorStop(0, 'rgba(150, 232, 198, 0.34)');
  sheen.addColorStop(0.55, 'rgba(128, 218, 186, 0.2)');
  sheen.addColorStop(1, 'rgba(110, 197, 169, 0.05)');
  ctx.save();
  webilloBodyPath();
  ctx.clip();
  ctx.fillStyle = sheen;
  ctx.fillRect(-150, -280, 300, 240);
  ctx.restore();
}

function webilloLegPose(t, pz, i) {
  const baseX = i ? 26 : -56;
  const hipX = i ? 16 : -30;
  if (pz.legs === 'walk' || pz.legs === 'dance') {
    const swing = Math.sin(phase + i * Math.PI);
    return { hipX, x: baseX + swing * (pz.legs === 'dance' ? 15 : 12), lift: Math.max(0, swing) * (pz.legs === 'dance' ? 11 : 8) };
  }
  if (pz.legs === 'dangle') return { hipX, x: baseX + Math.sin(t * 2.2 + i) * 3, lift: 8 };
  if (pz.legs === 'sit') return { hipX, x: baseX + (i ? 22 : -18), lift: 18 };
  if (pz.legs === 'curl') return { hipX, x: baseX + (i ? 6 : -6), lift: 14 };
  return { hipX, x: baseX, lift: 0 };
}

function drawWebilloShoe(x, lift, t) {
  const y = -20 - lift;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 3 + x) * 0.025);
  ctx.beginPath();
  ctx.ellipse(0, 5, 24, 8, 0, 0, TAU);
  ctx.fillStyle = '#f4f5ed';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-22, 1);
  ctx.quadraticCurveTo(-21, -15, -4, -17);
  ctx.quadraticCurveTo(17, -20, 23, -2);
  ctx.quadraticCurveTo(24, 3, 18, 4);
  ctx.lineTo(-17, 4);
  ctx.closePath();
  const shoe = ctx.createLinearGradient(0, -18, 0, 5);
  shoe.addColorStop(0, '#31a99a');
  shoe.addColorStop(1, '#08766f');
  ctx.fillStyle = shoe;
  ctx.fill();
  ctx.strokeStyle = 'rgba(7, 62, 62, 0.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, -11);
  ctx.quadraticCurveTo(-3, -18, 7, -12);
  ctx.strokeStyle = '#f8fff6';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawWebilloLegs(t, pz) {
  for (let i = 0; i < 2; i++) {
    const foot = webilloLegPose(t, pz, i);
    const hipY = -62;
    const ankleY = -18 - foot.lift;
    const kneeX = (foot.hipX + foot.x) / 2 + (i ? 3 : -3);
    const kneeY = -38 - foot.lift * 0.45;
    limb(foot.hipX, hipY, kneeX, kneeY, kneeX, -52, WARMC, 13, 9.5, WARML);
    limb(kneeX, kneeY, foot.x, ankleY, kneeX, (kneeY + ankleY) / 2, WARMC, 11.5, 8.5, WARML);
    drawWebilloShoe(foot.x, foot.lift, t);
  }
}

function drawWebilloArm(shoulder, elbow, hand, opts) {
  const bendX = (shoulder.x + elbow.x) / 2 + (hand.x > shoulder.x ? 6 : -6);
  limb(shoulder.x, shoulder.y, elbow.x, elbow.y, bendX, shoulder.y - 2, WARMC, 12, 9, WARML);
  limb(elbow.x, elbow.y, hand.x, hand.y, elbow.x, (elbow.y + hand.y) / 2, WARMC, 10, 7.5, WARML);
  const handGrad = ctx.createRadialGradient(hand.x - 2, hand.y - 3, 1, hand.x, hand.y, 12);
  handGrad.addColorStop(0, '#3f6f72');
  handGrad.addColorStop(1, '#22474c');
  if (opts && opts.open) {
    ell(hand.x, hand.y, 8, 8, handGrad, 1.3, WARML);
    for (let i = -1.5; i <= 1.5; i += 1) {
      const a = -0.5 + i * 0.42;
      ell(hand.x + Math.cos(a) * 9, hand.y + Math.sin(a) * 9 - 2, 2.6, 5.2, handGrad, 1, WARML);
    }
  } else {
    ell(hand.x, hand.y, 7, 6.2, handGrad, 1.3, WARML);
    ell(hand.x - (hand.x > shoulder.x ? 4 : -4), hand.y + 3, 3.2, 2.4, '#2c565b', 0, WARML);
  }
}

function drawWebilloArms(pz, t) {
  const sw = Math.sin(phase);
  const breathe = Math.sin(t * 1.6) * 1.2;
  // Shoulders attach at the sides of the wide body silhouette.
  const Ls = { x: -132, y: -152 };
  const Rs = { x: 106, y: -154 };

  let L;
  let R;
  switch (pz.arms) {
    case 'swing':
      L = { s: Ls, e: { x: -144, y: -116 + sw * 8 }, h: { x: -142, y: -82 + sw * 12 } };
      R = { s: Rs, e: { x: 118, y: -118 - sw * 8 }, h: { x: 116, y: -84 - sw * 12 } };
      break;
    case 'up':
      L = { s: Ls, e: { x: -150, y: -182 }, h: { x: -140, y: -220 + breathe } };
      R = { s: Rs, e: { x: 134, y: -184 }, h: { x: 126, y: -224 - breathe } };
      break;
    case 'dance': {
      const up = sw;
      L = { s: Ls, e: { x: -146, y: -150 - up * 24 }, h: { x: -138, y: -118 - up * 62 } };
      R = { s: Rs, e: { x: 122, y: -152 + up * 24 }, h: { x: 116, y: -118 + up * 62 } };
      break;
    }
    case 'hold':
      // Hands come to the front to carry the prop.
      L = { s: Ls, e: { x: -88, y: -150 }, h: { x: -18, y: -132 } };
      R = { s: Rs, e: { x: 66, y: -152 }, h: { x: 26, y: -132 } };
      break;
    case 'face':
      // Right arm up in front of the chest, holding the cigarette.
      L = { s: Ls, e: { x: -142, y: -118 + breathe }, h: { x: -140, y: -84 + breathe } };
      R = { s: Rs, e: { x: 80, y: -118 }, h: { x: 46, y: -126 } };
      break;
    case 'curl':
      L = { s: Ls, e: { x: -128, y: -124 }, h: { x: -96, y: -134 } };
      R = { s: Rs, e: { x: 112, y: -126 }, h: { x: 82, y: -134 } };
      break;
    case 'wave':
      L = { s: Ls, e: { x: -142, y: -118 + breathe }, h: { x: -140, y: -84 + breathe } };
      R = { s: Rs, e: { x: 130, y: -196 }, h: { x: 122 + Math.sin(t * 11) * 7, y: -238 + Math.cos(t * 11) * 8 } };
      break;
    case 'cross':
      L = { s: Ls, e: { x: -96, y: -146 }, h: { x: -14, y: -140 } };
      R = { s: Rs, e: { x: 70, y: -148 }, h: { x: -6, y: -152 } };
      break;
    case 'cheer': {
      const up = Math.sin(t * 8);
      L = { s: Ls, e: { x: -146, y: -150 - up * 26 }, h: { x: -140, y: -120 - up * 66 } };
      R = { s: Rs, e: { x: 122, y: -152 + up * 26 }, h: { x: 116, y: -120 + up * 66 } };
      break;
    }
    case 'clap': {
      const o = Math.sin(phase) * 5;
      L = { s: Ls, e: { x: -90, y: -158 }, h: { x: -8 + o, y: -158 } };
      R = { s: Rs, e: { x: 66, y: -158 }, h: { x: 4 + o, y: -158 } };
      break;
    }
    case 'peek':
      L = { s: Ls, e: { x: -110, y: -176 }, h: { x: -54, y: -196 } };
      R = { s: Rs, e: { x: 76, y: -176 }, h: { x: 22, y: -196 } };
      break;
    default:
      L = { s: Ls, e: { x: -142, y: -118 + breathe }, h: { x: -140, y: -82 + breathe } };
      R = { s: Rs, e: { x: 116, y: -120 - breathe }, h: { x: 114, y: -84 - breathe } };
  }

  drawWebilloArm(L.s, L.e, L.h, { open: false });
  drawWebilloArm(R.s, R.e, R.h, { open: false });

  // Shoulder caps blend the arms into the green body.
  ell(Ls.x + 4, Ls.y + 2, 11, 10, '#4fa892', 0);
  ell(Rs.x - 4, Rs.y + 2, 11, 10, '#4fa892', 0);
}

function drawWebilloFace(t) {
  const eyeY = -192;
  const eyes = [-41, 8];
  const happy = state === 'happy' || state === 'cheer' || state === 'clap' ||
    state === 'spin' || state === 'wave';
  const closed = state === 'sleep' || happy || state === 'yawn' ||
    state === 'sneeze' || blinkAmt > 0.84;
  ctx.save();
  ctx.lineCap = 'round';
  for (const x of eyes) {
    // Brows.
    ctx.beginPath();
    ctx.moveTo(x - 12, eyeY - 22);
    ctx.quadraticCurveTo(x, eyeY - 31, x + 11, eyeY - 23);
    ctx.strokeStyle = '#12292c';
    ctx.lineWidth = 4;
    ctx.stroke();

    if (closed) {
      ctx.beginPath();
      ctx.moveTo(x - 11, eyeY + (happy ? 2 : 0));
      ctx.quadraticCurveTo(x, eyeY + (happy ? -6 : 6), x + 11, eyeY + (happy ? 2 : 0));
      ctx.strokeStyle = '#12292c';
      ctx.lineWidth = 3;
      ctx.stroke();
      continue;
    }

    const blink = Math.max(0.1, 1 - blinkAmt * 0.85);
    const gx = clamp(look.x, -3, 3) * 0.35;
    const gy = clamp(look.y, -3, 3) * 0.35;
    ctx.save();
    ctx.translate(x, eyeY);
    ctx.scale(1, blink);
    const sclera = ctx.createLinearGradient(0, -15, 0, 16);
    sclera.addColorStop(0, '#ffffff');
    sclera.addColorStop(1, '#e6f0ea');
    ell(0, 0, 12, 14.5, sclera, 1.5, 'rgba(18, 45, 48, 0.55)');
    ell(gx, 1 + gy, 6, 7.6, '#12272a', 0);
    ell(gx - 1.8, -2.6 + gy, 2.3, 2.7, '#ffffff', 0);
    ell(gx + 2, 2.6 + gy, 1, 1.2, 'rgba(255,255,255,0.92)', 0);
    ctx.restore();
  }
  ctx.restore();

  // Open smiling mouth (the logo's happy grin).
  const mx = -18;
  const my = -156;
  if (state === 'sleep') {
    ctx.beginPath();
    ctx.moveTo(mx - 5, my);
    ctx.quadraticCurveTo(mx, my + 5, mx + 5, my);
    ctx.strokeStyle = '#12272a';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  } else {
    const mh = state === 'happy' || state === 'dance' ? 15 : 12;
    ctx.beginPath();
    ctx.moveTo(mx - 16, my - 2);
    ctx.quadraticCurveTo(mx, my + 3, mx + 16, my - 2);
    ctx.quadraticCurveTo(mx + 12, my + mh, mx, my + mh);
    ctx.quadraticCurveTo(mx - 12, my + mh, mx - 16, my - 2);
    ctx.closePath();
    ctx.fillStyle = '#102225';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(mx, my + mh - 2, 7.5, 3.2, 0, Math.PI, TAU);
    ctx.fillStyle = '#8fd6c1';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(mx - 12, my + 1);
    ctx.quadraticCurveTo(mx, my + 5, mx + 12, my + 1);
    ctx.strokeStyle = '#102225';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

function rotateLayer(name, px, py, angle) {
  if (!angle) {
    ctx.drawImage(wLay[name], -W / 2, -GROUND);
    return;
  }
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  ctx.translate(-px, -py);
  ctx.drawImage(wLay[name], -W / 2, -GROUND);
  ctx.restore();
}

function drawWebilloLid(ecx, ecy, rx, ry, amount) {
  if (amount <= 0) return;
  const top = ecy - ry - 2;
  const h = (2 * ry + 4) * clamp(amount, 0, 1);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ecx - rx - 2, top);
  ctx.lineTo(ecx + rx + 2, top);
  ctx.lineTo(ecx + rx + 2, top + h - 3);
  ctx.quadraticCurveTo(ecx, top + h + 5, ecx - rx - 2, top + h - 3);
  ctx.closePath();
  ctx.fillStyle = '#59a994';
  ctx.fill();
  ctx.restore();
}

function drawWebilloEyePair(ecx, ecy, blink, gx, gy, closed, happy) {
  const rx = 13.5;
  const ry = 15.5;
  if (closed) {
    drawWebilloLid(ecx, ecy, rx, ry, 1);
    ctx.save();
    ctx.strokeStyle = '#14343b';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ecx - rx, ecy + (happy ? 3 : -2));
    ctx.quadraticCurveTo(ecx, ecy + (happy ? -8 : 8), ecx + rx, ecy + (happy ? 3 : -2));
    ctx.stroke();
    ctx.restore();
    return;
  }
  // Solid pupil + highlights over the baked white base.
  ell(ecx + gx, ecy + gy + 1, 7, 8.6, '#12272a', 0);
  ell(ecx + gx - 2, ecy + gy - 2.5, 2.7, 3.1, '#ffffff', 0);
  ell(ecx + gx + 2.2, ecy + gy + 3, 1.1, 1.3, 'rgba(255,255,255,0.9)', 0);
  if (blink < 0.98) drawWebilloLid(ecx, ecy, rx, ry, 1 - blink);
}

function drawWebilloEyes(t) {
  const happy = state === 'happy';
  const closed = state === 'sleep' || happy || blinkAmt > 0.86;
  const blink = Math.max(0.08, 1 - blinkAmt * 0.9);
  const gx = clamp(look.x, -3, 3) * 1.6;
  const gy = clamp(look.y, -3, 3) * 1.6;
  drawWebilloEyePair(-41.5, -192, blink, gx, gy, closed, happy);
  drawWebilloEyePair(7.2, -192.6, blink, gx, gy, closed, happy);
}

function drawWebilloBrows() {
  ctx.save();
  ctx.strokeStyle = '#0c1f22';
  ctx.lineCap = 'round';
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(-53, -214);
  ctx.quadraticCurveTo(-41, -223, -27, -215);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4, -215);
  ctx.quadraticCurveTo(9, -224, 22, -214);
  ctx.stroke();
  ctx.restore();
}

function drawWebilloMouth() {
  const mx = -13;
  const my = -170;
  ctx.save();
  if (state === 'sleep') {
    ctx.strokeStyle = '#0c1f22';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mx - 7, my);
    ctx.quadraticCurveTo(mx, my + 6, mx + 7, my);
    ctx.stroke();
  } else {
    const mh = state === 'happy' || state === 'dance' || state === 'cheer' ||
      state === 'spin' || state === 'clap' || state === 'hop' || state === 'sneeze'
      ? 15
      : state === 'sing' || state === 'stretch' || state === 'yawn'
        ? 19
        : state === 'shiver'
          ? 13 + Math.sin(time * 30) * 3
          : 11;
    ctx.beginPath();
    ctx.moveTo(mx - 18, my - 3);
    ctx.quadraticCurveTo(mx, my + 5, mx + 18, my - 3);
    ctx.quadraticCurveTo(mx + 12, my + mh, mx, my + mh);
    ctx.quadraticCurveTo(mx - 12, my + mh, mx - 18, my - 3);
    ctx.closePath();
    ctx.fillStyle = '#0c1f22';
    ctx.fill();
  }
  ctx.restore();
}

function drawWebilloProp(prop, t) {
  if (!prop) return;
  ctx.save();
  // Reuse the waifu's props, shifted into the webillo's front area.
  ctx.translate(-12, -36);
  drawProp(prop, t);
  ctx.restore();
}

function drawWebillo(t, pz) {
  if (!wLay || !wLay.body) return;
  headYCanvas = GROUND + pz.shift - pz.bob - 192;
  const put = (name) => ctx.drawImage(wLay[name], -W / 2, -GROUND);

  put('cape');
  put('hood');

  // Legs rotate at the hips; the pose is baked into the PNG layers.
  const legs = pz.legs;
  let legL = 0;
  let legR = 0;
  if (legs === 'walk' || legs === 'dance') {
    const a = legs === 'dance' ? 0.32 : 0.24;
    legL = Math.sin(phase) * a;
    legR = -Math.sin(phase) * a;
  } else if (legs === 'dangle') {
    legL = Math.sin(t * 2.2) * 0.12;
    legR = -Math.sin(t * 2.2) * 0.12;
  }
  rotateLayer('ll', -55, -52, legL);
  rotateLayer('rl', 25, -58, legR);

  put('body');

  // Canvas arms (like the waifu) so the held props line up with the pose.
  drawWebilloArms(pz, t);
  drawWebilloProp(pz.prop, t);

  drawWebilloEyes(t);
  drawWebilloBrows();
  drawWebilloMouth();
}

// ---------- saitama model ----------

const SAI_FIST = window.AnimationGeometry.saitama;
const SAI_SHOULDER = 21;
const SAI_SEG = 42;
const SCOL = { capeLine: '#55566a' };

const lerp = (a, b, k) => a + (b - a) * k;
const lerpP = (p, q, k) => ({ x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k) });
const ease = (k) => k * k * (3 - 2 * k);

function saiPunchHands(t) {
  const p = st / dur;
  const restL = { x: -26, y: -106 };
  const restR = { x: 26, y: -106 };
  const guardL = { x: -4, y: -184 };
  const cocked = { x: -2, y: -152 };
  const out = { x: SAI_FIST.x, y: SAI_FIST.y };
  const h = punchHitAt();
  const tremble = (k) => (punchKind === 'serious' || punchBig ? Math.sin(t * 70) * 1.8 * k : 0);
  if (punchKind === 'combo' && p < COMBO_TO) {
    if (p < COMBO_FROM) {
      const k = ease(p / COMBO_FROM);
      return [lerpP(restL, guardL, k), lerpP(restR, { x: 6, y: -172 }, k)];
    }
    const s = Math.sin(phase);
    const jit = Math.sin(t * 57) * 6;
    const outL = { x: out.x - 30, y: out.y + 6 + jit };
    const outR = { x: out.x, y: out.y - jit };
    return s > 0 ? [guardL, outR] : [outL, { x: 6, y: -172 }];
  }
  const from = punchKind === 'combo' ? COMBO_TO : 0;
  if (p < h) {
    const k = ease(clamp((p - from) / ((h - from) * 0.55), 0, 1));
    const tr = tremble(k);
    return [lerpP(restL, guardL, k), { x: lerp(restR.x, cocked.x, k) + tr, y: lerp(restR.y, cocked.y, k) + tr * 0.5 }];
  }
  const strike = 0.022;
  if (p < h + strike) {
    const k = (p - h) / strike;
    return [guardL, lerpP(cocked, { x: out.x + 6, y: out.y }, k * k)];
  }
  const holdTo = Math.min(0.9, h + (punchKind === 'serious' ? 0.3 : 0.32));
  if (p < holdTo) {
    const k = clamp((p - h - strike) / 0.05, 0, 1);
    return [guardL, { x: out.x + 6 * (1 - k), y: out.y + Math.sin(t * 40) * (1 - k) * 2 }];
  }
  const k = ease(clamp((p - holdTo) / 0.08, 0, 1));
  return [lerpP(guardL, restL, k), lerpP(out, restR, k)];
}

function saiPunchPhase() {
  const p = st / dur;
  const h = punchHitAt();
  if (punchKind === 'combo' && p < COMBO_TO) return { charge: p < COMBO_FROM ? p / COMBO_FROM : 0, hold: 0 };
  const from = punchKind === 'combo' ? COMBO_TO : 0;
  if (p < h) return { charge: clamp((p - from) / (h - from), 0, 1), hold: 0 };
  return { charge: 0, hold: p < Math.min(0.9, h + 0.32) ? 1 : 0 };
}

function saiHands(pz, t) {
  const sw = Math.sin(phase);
  const b = Math.sin(t * 1.8) * 1.2;
  const rest = [{ x: -26, y: -106 + b }, { x: 26, y: -106 - b }];
  switch (pz.arms) {
    case 'swing':
      return [{ x: -24 + sw * 7, y: -107 }, { x: 24 - sw * 7, y: -107 }];
    case 'bag':
      return [{ x: -27, y: -108 }, { x: 24 - sw * 7, y: -107 }];
    case 'up': {
      const w = Math.sin(t * 7) * 3;
      return [{ x: -24, y: -262 - w }, { x: 24, y: -262 + w }];
    }
    case 'dance': {
      const up = sw > 0;
      return [{ x: -26, y: up ? -258 : -108 }, { x: 26, y: up ? -108 : -258 }];
    }
    case 'cheer': {
      const up = Math.sin(t * 8) > 0;
      return [{ x: -28, y: up ? -260 : -110 }, { x: 28, y: up ? -110 : -260 }];
    }
    case 'face':
      return [rest[0], { x: 10, y: -212 }];
    case 'wave':
      return [rest[0], { x: 40 + Math.sin(t * 11) * 6, y: -250 + Math.cos(t * 11) * 7 }];
    case 'cross':
      return [{ x: 12, y: -165 }, { x: -12, y: -158 }];
    case 'clap': {
      const o = Math.sin(phase) * 3;
      return [{ x: -3 + o, y: -168 }, { x: 3 + o, y: -168 }];
    }
    case 'peek': {
      const ey = -228 + (pz.headDY || 0) * 0.35;
      return [{ x: -9, y: ey }, { x: 5, y: ey }];
    }
    case 'curl':
      return [{ x: -14, y: -138 }, { x: 14, y: -138 }];
    case 'hold':
      if (pz.prop === 'cup') return [rest[0], { x: 28, y: -159 }];
      if (pz.prop === 'phone') return [rest[0], { x: 26, y: -161 }];
      return [{ x: 6, y: -147 }, { x: 27, y: -149 }];
    case 'punch':
      return saiPunchHands(t);
    default:
      return rest;
  }
}

// Two-bone IK with the elbow bent away from the body's centre line.
function saiElbow(s, h, side) {
  let dx = h.x - s.x;
  let dy = h.y - s.y;
  let d = Math.hypot(dx, dy) || 1;
  const max = SAI_SEG * 2 - 0.5;
  if (d > max) {
    h = { x: s.x + (dx / d) * max, y: s.y + (dy / d) * max };
    dx = h.x - s.x;
    dy = h.y - s.y;
    d = max;
  }
  const off = Math.sqrt(Math.max(0, SAI_SEG * SAI_SEG - (d / 2) * (d / 2)));
  const mx = (s.x + h.x) / 2;
  const my = (s.y + h.y) / 2;
  let px = -dy / d;
  let py = dx / d;
  if (px * side < 0 || (Math.abs(px) < 0.2 && py < 0)) {
    px = -px;
    py = -py;
  }
  return { e: { x: mx + px * off, y: my + py * off }, h };
}

function drawSaitamaBag(hand, t) {
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(Math.sin(phase + 0.6) * 0.22);
  ctx.save();
  ctx.translate(5, 16);
  ctx.rotate(0.38);
  rrect(-2.4, -34, 4.8, 30, 2, '#f4f8e8', 1.1, '#7d8a63');
  ctx.fillStyle = '#9ec86a';
  ctx.fillRect(-2.4, -26, 4.8, 8);
  for (const a of [-0.35, 0, 0.32]) {
    ctx.save();
    ctx.translate(0, -33);
    ctx.rotate(a);
    rrect(-1.8, -14, 3.6, 15, 1.6, '#4f9a3a', 1, '#2f6324');
    ctx.restore();
  }
  ctx.restore();
  ell(-6, 13, 4.2, 4, '#e2483a', 1, '#8a2a20');
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.quadraticCurveTo(-10, 4, -10, 10);
  ctx.moveTo(4, 0);
  ctx.quadraticCurveTo(10, 4, 10, 10);
  ctx.strokeStyle = SCOL.capeLine;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, 9);
  ctx.lineTo(12, 9);
  ctx.quadraticCurveTo(16, 26, 14, 40);
  ctx.quadraticCurveTo(0, 45, -14, 40);
  ctx.quadraticCurveTo(-16, 26, -12, 9);
  ctx.closePath();
  fillStroke('rgba(250,250,246,0.97)', 1.5, SCOL.capeLine);
  ctx.strokeStyle = 'rgba(85,86,106,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-5, 14);
  ctx.quadraticCurveTo(-7, 26, -4, 38);
  ctx.moveTo(6, 14);
  ctx.quadraticCurveTo(8, 25, 5, 37);
  ctx.stroke();
  ctx.restore();
}

function drawSaitamaProp(prop, t) {
  if (!prop) return;
  ctx.save();
  ctx.translate(0, -55);
  drawProp(prop, t);
  ctx.restore();
}

function drawSaitama(t, pz) {
  headYCanvas = GROUND + pz.shift - pz.bob - 221;
  const hands = saiHands(pz, t);
  const ph = state === 'punch' && !drag ? saiPunchPhase() : null;
  const heavy = punchKind === 'serious' || punchBig;
  const serious = ph && (ph.charge > .35 || ph.hold > 0);
  const animated = window.HeroArt.saitama(ctx, { time: t, phase, walk: pz.legs === 'walk' || pz.legs === 'dance',
    crouch: pz.shift, sit: pz.legs === 'sit' || pz.legs === 'curl', air: air || !!drag,
    hands, cape: physicalCape, serious, blink: blinkAmt, look: look.x,
    punch: ph ? st / dur : null, hitAt: punchHitAt(), landing: squash > .3, shop: state === 'shop',
    headDY: pz.headDY, tilt: pz.tilt });
  if (pz.arms === 'bag' && !drag && !animated) drawSaitamaBag(saiElbow({ x: -SAI_SHOULDER, y: -189 }, hands[0], -1).h, t);
  if (pz.prop && !drag) drawSaitamaProp(pz.prop, t);
  if (ph && (ph.charge > 0 || ph.hold > 0)) {
    const fist = animated ? SAI_FIST : saiElbow({ x: SAI_SHOULDER, y: -189 }, hands[1], 1).h;
    drawSaitamaFistGlow(fist, ph, t, heavy);
  }
}

function drawSaitamaFistGlow(f, ph, t, heavy) {
  const flick = 0.75 + Math.abs(Math.sin(t * 37)) * 0.25;
  const r = ph.charge > 0 ? (5 + ph.charge * (heavy ? 22 : 11)) * flick : (heavy ? 18 : 10) * flick;
  const a = ph.charge > 0 ? Math.min(1, ph.charge * 1.4) : 0.8;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
  g.addColorStop(0, `rgba(255,255,255,${0.95 * a})`);
  g.addColorStop(0.35, `rgba(255,236,150,${0.7 * a})`);
  g.addColorStop(1, 'rgba(255,190,60,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(f.x, f.y, r, 0, TAU);
  ctx.fill();
  if (ph.charge > 0.4 && heavy) {
    ctx.strokeStyle = `rgba(255,250,210,${0.8 * a})`;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      const an = t * 9 + i * 1.257;
      const r0 = r * 0.35;
      const r1 = r * (0.9 + Math.sin(t * 23 + i) * 0.25);
      ctx.beginPath();
      ctx.moveTo(f.x + Math.cos(an) * r0, f.y + Math.sin(an) * r0);
      ctx.lineTo(f.x + Math.cos(an + 0.3) * r1, f.y + Math.sin(an + 0.3) * r1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------- boot ----------

async function init() {
  try {
    if (window.AnimeArt) await window.AnimeArt.ready;
    const i = await api.info();
    displays = i.displays || [];
    logDisplays('info', displays);
    pos = { x: i.win.x, y: i.win.y };
    sent = { x: Math.round(pos.x), y: Math.round(pos.y) };
    if (api.model) api.model(modelId);
    if (api.sizeMul) api.sizeMul(sizeId);
    syncGeometry();
    refreshWA();
    ready = true;
    dir = 1;
    setState('walk');
    say('~ ¡Hola! ~');
  } catch (e) {
    console.error(e);
  }
}
init();

api.onAction(doAction);

api.onDisplays((d) => {
  displays = d;
  logDisplays('changed', displays);
  syncGeometry();
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
