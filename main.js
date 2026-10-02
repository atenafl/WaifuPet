const { app, BrowserWindow, ipcMain, screen, Menu, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const W = 340;
const H = 380;

let win = null;
let paused = false;
let sound = true;
let model = 'waifu';
let sizeId = 'normal';
const SIZES = ['small', 'normal', 'big'];
const MODELS = ['waifu', 'webillo', 'saitama'];
let disabled = new Set();

function setModel(m) {
  if (MODELS.indexOf(m) < 0) return;
  model = m;
  send('model:' + m);
}

function setSize(id) {
  if (SIZES.indexOf(id) < 0) return;
  sizeId = id;
  send('size:' + id);
}

function toggleDisplay(id) {
  const list = screen.getAllDisplays();
  if (disabled.has(id)) {
    disabled.delete(id);
  } else {
    const on = list.filter((d) => !disabled.has(d.id)).length;
    if (on <= 1) return;
    disabled.add(id);
  }
  notifyDisplays();
}

function displayLabel(d, i) {
  const b = d.bounds;
  let s = `${i + 1}. ${b.width}x${b.height}`;
  const sf = d.scaleFactor || 1;
  if (Math.abs(sf - 1) > 0.01) s += ` @${Math.round(sf * 100)}%`;
  if (d.diag > 0) s += ` ~${Math.round(d.diag / 2.54)}"`;
  return s;
}

// Monitor activos con su posición física (px) y diagonal (cm) vía EDID.
let monList = null;
let sizesPromise = null;

function monitorSizes() {
  if (sizesPromise) return sizesPromise;
  sizesPromise = new Promise((resolve) => {
    execFile('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'mon-sizes.ps1')],
      { timeout: 5000, windowsHide: true }, (err, stdout) => {
        if (err) return resolve(null);
        const list = [];
        for (const line of String(stdout).split(/\r?\n/)) {
          const m = line.trim().match(/^(-?\d+)\s*,\s*(-?\d+)\s*,\s*(\d+(?:\.\d+)?)$/);
          if (m) list.push({ x: +m[1], y: +m[2], diag: parseFloat(m[3]) });
        }
        resolve(list.length ? list : null);
      });
  });
  return sizesPromise;
}

// Diagonal (cm) del monitor que ocupa la posición física dada.
function diagFor(primary, phys) {
  if (!monList || !monList.length || !phys) return undefined;
  let best = null;
  let bd = Infinity;
  for (const m of monList) {
    const dist = Math.abs(m.x - phys.x) + Math.abs(m.y - phys.y);
    if (dist < bd) {
      bd = dist;
      best = m;
    }
  }
  if (!best) return undefined;
  if (bd <= 16 && best.diag > 0) return best.diag;
  const all = monList.filter((m) => m.diag > 0).map((m) => m.diag);
  if (!all.length) return undefined;
  const min = Math.min.apply(null, all);
  const max = Math.max.apply(null, all);
  return primary ? min : max;
}

function displayList() {
  const pd = screen.getPrimaryDisplay();
  const all = screen.getAllDisplays();
  const ids = new Set(all.map((d) => d.id));
  for (const id of Array.from(disabled)) if (!ids.has(id)) disabled.delete(id);
  return all.map((d) => {
    const b = d.bounds;
    const p1 = screen.dipToScreenPoint({ x: b.x, y: b.y });
    const primary = d.id === pd.id;
    return {
      id: d.id,
      diag: diagFor(primary, p1),
      enabled: !disabled.has(d.id),
      bounds: b,
      workArea: d.workArea,
      scale: d.scaleFactor,
      primary,
      phys: {
        x: p1.x,
        y: p1.y,
        width: Math.round(b.width * d.scaleFactor),
        height: Math.round(b.height * d.scaleFactor)
      }
    };
  });
}

const LOGFILE = path.join(__dirname, 'debug.log');
function logdbg(s) {
  try {
    fs.appendFileSync(LOGFILE, new Date().toISOString().slice(11, 23) + ' ' + s + '\n');
  } catch (e) { /* ignore */ }
}

function notifyDisplays() {
  const list = displayList();
  logdbg('displays: ' + JSON.stringify(list.map((d) => ({ id: d.id, primary: d.primary, scale: d.scale, diag: d.diag, bounds: d.bounds, workArea: d.workArea, phys: d.phys, enabled: d.enabled }))));
  if (win && !win.isDestroyed()) win.webContents.send('pet-displays', list);
}

function send(action) {
  if (win && !win.isDestroyed()) win.webContents.send('pet-action', action);
}

function createWindow() {
  const wa = screen.getPrimaryDisplay().workArea;

  win = new BrowserWindow({
    width: W,
    height: H,
    x: Math.round(wa.x + (wa.width - W) / 2),
    y: Math.round(wa.y + wa.height - H),
    transparent: true,
    frame: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile('index.html');
}

let overlay = null;
let overlayReady = null;
let overlayTimer = null;
let fxBusy = false;
let restoreTop = false;

function createOverlay() {
  overlay = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  overlay.setIgnoreMouseEvents(true);
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.on('closed', () => {
    overlay = null;
    overlayReady = null;
  });
  overlayReady = overlay.loadFile('overlay.html').catch((e) => logdbg('overlay load failed: ' + e.message));
  return overlayReady;
}

function closeOverlay() {
  if (overlayTimer) {
    clearTimeout(overlayTimer);
    overlayTimer = null;
  }
  if (overlay && !overlay.isDestroyed()) overlay.hide();
  if (restoreTop && win && !win.isDestroyed()) win.setAlwaysOnTop(false);
  restoreTop = false;
  fxBusy = false;
}

async function captureDisplay(d) {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(d.bounds.width * d.scaleFactor),
        height: Math.round(d.bounds.height * d.scaleFactor)
      }
    });
    const src = sources.find((s) => String(s.display_id) === String(d.id)) ||
      (sources.length === 1 ? sources[0] : null);
    if (!src || src.thumbnail.isEmpty()) return null;
    return 'data:image/jpeg;base64,' + src.thumbnail.toJPEG(92).toString('base64');
  } catch (e) {
    logdbg('capture failed: ' + e.message);
    return null;
  }
}

async function bigPunch() {
  if (!win || win.isDestroyed()) return;
  if (fxBusy) {
    send('punch');
    return;
  }
  fxBusy = true;
  const d = screen.getDisplayMatching(win.getBounds());
  const ready = overlay ? overlayReady : createOverlay();
  send('punch-big');
  win.setContentProtection(true);
  const shot = await captureDisplay(d);
  if (win && !win.isDestroyed()) win.setContentProtection(false);
  try {
    await ready;
  } catch (e) {
    logdbg('overlay load failed: ' + e.message);
  }
  if (!overlay || overlay.isDestroyed()) {
    fxBusy = false;
    return;
  }

  const b = d.bounds;
  overlay.setBounds(b);
  overlay.webContents.send('fx', 'init', { shot, bounds: b });
  overlay.showInactive();
  restoreTop = !win.isAlwaysOnTop();
  win.setAlwaysOnTop(true, 'screen-saver');
  win.moveTop();
  overlayTimer = setTimeout(closeOverlay, 14000);
  send('fx-ready');
}

function showMenu() {
  const template = [
    {
      label: 'Hacer cosas',
      submenu: [
        { label: 'Leer un libro', click: () => send('read') },
        { label: 'Tomar café', click: () => send('coffee') },
        { label: 'Desayunar', click: () => send('breakfast') },
        { label: 'Mirar el móvil', click: () => send('phone') },
        { label: 'Fumar un cigarro', click: () => send('smoke') },
        { label: 'Estirarse', click: () => send('stretch') },
        { label: 'Cantar', click: () => send('sing') },
        { label: 'Jugar', click: () => send('game') },
        { label: 'Bailar', click: () => send('dance') },
        { label: 'Pasear', click: () => send('walk') },
        { label: 'Sentarse', click: () => send('sit') },
        { label: 'Dormir', click: () => send('sleep') },
        { label: 'Saludar', click: () => send('wave') },
        { label: 'Bostezar', click: () => send('yawn') },
        { label: 'Tiritar', click: () => send('shiver') },
        { label: 'Estornudar', click: () => send('sneeze') },
        { label: 'Animarse', click: () => send('cheer') },
        { label: 'Saltar como conejo', click: () => send('hop') },
        { label: 'Girar sobre sí misma', click: () => send('spin') },
        { label: 'Aplaudir', click: () => send('clap') },
        { label: 'Taparse los ojos', click: () => send('peek') },
        ...(model === 'saitama'
          ? [
              { label: 'Dar un puñetazo', click: () => bigPunch() },
              { label: 'Ir a la compra', click: () => send('shop') }
            ]
          : []),
        { label: 'Despertar', click: () => send('wake') }
      ]
    },
    { label: 'Acariciar', click: () => send('pet') },
    {
      label: 'Modelo',
      submenu: [
        { label: 'Waifu', type: 'radio', checked: model === 'waifu', click: () => setModel('waifu') },
        { label: 'Webillo', type: 'radio', checked: model === 'webillo', click: () => setModel('webillo') },
        { label: 'Saitama', type: 'radio', checked: model === 'saitama', click: () => setModel('saitama') }
      ]
    },
    {
      label: 'Tamaño',
      submenu: [
        { label: 'Pequeño', type: 'radio', checked: sizeId === 'small', click: () => setSize('small') },
        { label: 'Normal', type: 'radio', checked: sizeId === 'normal', click: () => setSize('normal') },
        { label: 'Grande', type: 'radio', checked: sizeId === 'big', click: () => setSize('big') }
      ]
    },
    {
      label: 'Pantallas',
      submenu: displayList().map((d, i) => ({
        label: displayLabel(d, i),
        type: 'checkbox',
        checked: d.enabled,
        click: () => toggleDisplay(d.id)
      }))
    },
    { type: 'separator' },
    {
      label: 'Pausar',
      type: 'checkbox',
      checked: paused,
      click: (item) => {
        paused = !paused;
        item.checked = paused;
        send(paused ? 'pause-on' : 'pause-off');
      }
    },
    {
      label: 'Sonido',
      type: 'checkbox',
      checked: sound,
      click: (item) => {
        sound = !sound;
        item.checked = sound;
        send(sound ? 'sound-on' : 'sound-off');
      }
    },
    {
      label: 'Siempre visible',
      type: 'checkbox',
      checked: true,
      click: (item) => {
        const on = !item.checked;
        item.checked = on;
        if (win && !win.isDestroyed()) win.setAlwaysOnTop(on, 'screen-saver');
      }
    },
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() }
  ];

  const menu = Menu.buildFromTemplate(template);
  if (win && !win.isDestroyed()) menu.popup({ window: win });
}

let winW = W;
let winH = H;
ipcMain.on('pet-move', (_e, x, y, w, h) => {
  if (win && !win.isDestroyed()) {
    if (w > 0 && h > 0) {
      winW = Math.round(w);
      winH = Math.round(h);
    }
    win.setBounds({ x: Math.round(x), y: Math.round(y), width: winW, height: winH });
    const b = win.getBounds();
    if (Math.abs(b.width - winW) > 4 || Math.abs(b.height - winH) > 4) {
      logdbg('move mismatch: got ' + JSON.stringify(b) + ' want ' + winW + 'x' + winH + ' at ' + Math.round(x) + ',' + Math.round(y));
    }
  }
});

ipcMain.on('pet-size', (_e, w, h) => {
  winW = Math.round(w);
  winH = Math.round(h);
  if (win && !win.isDestroyed()) {
    win.setContentSize(winW, winH);
    logdbg('pet-size ' + winW + 'x' + winH + ' -> bounds ' + JSON.stringify(win.getBounds()) + ' dpr-display ' + JSON.stringify(screen.getDisplayMatching(win.getBounds()).scaleFactor));
  }
});

ipcMain.on('pet-log', (_e, s) => {
  logdbg(String(s));
});

ipcMain.handle('pet-info', async () => {
  const s = await Promise.race([
    monitorSizes(),
    new Promise((r) => setTimeout(() => r(null), 2500))
  ]);
  if (s && !monList) monList = s;
  return { win: win.getBounds(), displays: displayList() };
});

ipcMain.on('pet-menu', showMenu);

ipcMain.on('pet-fx', (_e, type, data) => {
  if (fxBusy && overlay && !overlay.isDestroyed()) overlay.webContents.send('fx', type, data);
});

ipcMain.on('overlay-done', closeOverlay);

ipcMain.on('pet-model', (_e, m) => {
  if (MODELS.indexOf(m) >= 0) model = m;
  if (model === 'saitama' && !overlay) createOverlay();
});

ipcMain.on('pet-sizemul', (_e, id) => {
  if (SIZES.indexOf(id) >= 0) sizeId = id;
});

ipcMain.on('pet-ignore', (_e, v) => {
  if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(!!v, { forward: true });
});

let cursorPoll = null;

ipcMain.on('pet-dragstate', (_e, on) => {
  if (on && !cursorPoll) {
    cursorPoll = setInterval(() => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('pet-cursor', screen.getCursorScreenPoint());
      }
    }, 16);
  } else if (!on && cursorPoll) {
    clearInterval(cursorPoll);
    cursorPoll = null;
  }
});

app.whenReady().then(() => {
  createWindow();
  screen.on('display-added', notifyDisplays);
  screen.on('display-removed', notifyDisplays);
  screen.on('display-metrics-changed', notifyDisplays);
  monitorSizes().then((s) => {
    if (s && !monList) {
      monList = s;
      notifyDisplays();
    }
  });
});

app.on('window-all-closed', () => app.quit());
