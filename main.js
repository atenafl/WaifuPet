const { app, BrowserWindow, ipcMain, screen, Menu, Tray, globalShortcut, dialog, powerMonitor, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const aiConfig = require('./ai/config');
const { ChatWindow, registerIpc } = require('./ai/chat-window');
const { Agent } = require('./ai/agent');

// Al arrancar con la tarea, Windows reenumera pantallas y Chromium decide
// (mal) que la ventana está "oculta": deja de dibujarla aunque esté arriba del
// todo y con contenido -> la mascota invisible. Sin cálculo de oclusión nativa
// sigue presentando frames siempre.
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

if (process.platform === 'win32') app.setAppUserModelId('com.atenafl.waifupet');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win && !win.isDestroyed()) win.showInactive();
    openChat(false);
  });
}

const W = 240;
const H = 190;

let win = null;
let alwaysTop = true;
let paused = false;
let sound = true;
let model = 'tigresa';
let sizeId = 'normal';
const SIZES = ['small', 'normal', 'big'];
let disabled = new Set();

// ---------- IA ----------
let chat = null;
let agent = null;
let tray = null;
let petHidden = false;
let idleAsleep = false;
let fullscreenHidden = false;
let fullscreenBusy = false;

function setModel(m) {
  if (m !== 'webillo' && m !== 'tigresa') return;
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
// En el .exe empaquetado el script vive en resources/ (extraResources), porque
// no se puede ejecutar un fichero metido dentro del asar.
let monList = null;
let sizesPromise = null;
let sizesTries = 0;
let sizesTimer = null;

function monSizesPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'mon-sizes.ps1')
    : path.join(__dirname, 'mon-sizes.ps1');
}

// Al arrancar con la sesión, PowerShell/WMI todavía no están listos y el
// script de diagonales falla. Antes se rendía tras dos intentos y la mascota
// se quedaba sin diagonales: mismo tamaño en todos los monitores (no
// reescalaba). Guardamos la última lectura buena para arrancar ya con ella y
// reintentamos con espera creciente hasta que el sistema despierte.
function monSizesCachePath() {
  return path.join(app.getPath('userData'), 'mon-sizes.json');
}

function loadSizesCache() {
  try {
    const list = JSON.parse(fs.readFileSync(monSizesCachePath(), 'utf8'));
    if (Array.isArray(list)) {
      const ok = list.filter((m) => m && isFinite(m.x) && isFinite(m.y) && m.diag > 0);
      if (ok.length) return ok;
    }
  } catch (e) { /* sin caché todavía */ }
  return null;
}

function saveSizesCache(list) {
  try {
    fs.mkdirSync(path.dirname(monSizesCachePath()), { recursive: true });
    fs.writeFileSync(monSizesCachePath(), JSON.stringify(list));
  } catch (e) { /* ignorar */ }
}

function monitorSizes() {
  if (sizesPromise) return sizesPromise;
  sizesPromise = new Promise((resolve) => {
    execFile('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', monSizesPath()],
      { timeout: 15000, windowsHide: true }, (err, stdout) => {
        sizesPromise = null;
        const list = [];
        if (!err) {
          for (const line of String(stdout).split(/\r?\n/)) {
            const m = line.trim().match(/^(-?\d+)\s*,\s*(-?\d+)\s*,\s*(\d+(?:\.\d+)?)$/);
            if (m) list.push({ x: +m[1], y: +m[2], diag: parseFloat(m[3]) });
          }
        }
        if (list.length) {
          sizesTries = 0;
          monList = list;
          saveSizesCache(list);
          notifyDisplays();
          resolve(list);
          return;
        }
        sizesTries++;
        logdbg('mon-sizes intento ' + sizesTries + ': ' + (err ? (err.message || err) : 'sin datos'));
        if (sizesTries <= 10 && !sizesTimer) {
          const delay = Math.min(30000, 2000 * Math.pow(1.7, sizesTries - 1));
          sizesTimer = setTimeout(() => {
            sizesTimer = null;
            monitorSizes();
          }, delay);
        }
        resolve(monList);
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

// ---------- puente con la mascota ----------

function sendAI(payload) {
  if (win && !win.isDestroyed()) win.webContents.send('pet-ai', payload);
}

function petInfo() {
  if (!win || win.isDestroyed()) return null;
  const b = win.getBounds();
  return {
    width: b.width,
    height: b.height,
    bounds: b,
    cursor: screen.getCursorScreenPoint(),
    displays: displayList()
  };
}

function openChat(settings) {
  if (!chat) return;
  chat.open(!!settings);
}

function togglePet() {
  if (!win || win.isDestroyed()) return;
  petHidden = !petHidden;
  if (petHidden) win.hide();
  else {
    win.showInactive();
    win.setAlwaysOnTop(true, 'screen-saver');
  }
  updateTrayMenu();
}

async function nativeConfirm(item) {
  if (!win || win.isDestroyed()) return { allow: false };
  const r = await dialog.showMessageBox(win, {
    type: item.risk === 'high' ? 'warning' : 'question',
    buttons: ['Permitir', 'Ahora no'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
    title: item.title || 'Permiso',
    message: item.title || '¿Me dejas?',
    detail: item.detail || ''
  });
  return { allow: r.response === 0 };
}

function initAI() {
  chat = new ChatWindow({ petWin: win, onShown: () => updateTrayMenu() });
  registerIpc(chat);

  agent = new Agent({
    chat: {
      send: (ch, p) => chat.send(ch, p),
      isOpen: () => chat.isOpen(),
      ensureOpen: () => chat.open()
    },
    pet: { send: sendAI, info: petInfo, show: () => { if (petHidden && !fullscreenHidden) togglePet(); } },
    askNative: nativeConfirm
  });

  // Recordatorios que quedaron pendientes de la sesión anterior.
  agent.restoreReminders();
  setInterval(() => { if (agent) agent.checkReminders(); }, 60000);

  ipcMain.handle('ai:state', () => ({
    config: aiConfig.publicConfig(),
    history: agent.displayHistory(),
    busy: agent.isBusy()
  }));
  ipcMain.handle('ai:send', (_e, text) => agent.send(text));
  ipcMain.handle('ai:stop', () => { agent.stop(); return { ok: true }; });
  ipcMain.handle('ai:confirm-reply', (_e, r) => {
    if (!r) return { ok: false };
    return { ok: agent.confirmReply(r.id, r.allow, r.always) };
  });
  ipcMain.handle('ai:save-config', (_e, patch) => {
    aiConfig.save(patch || {});
    registerShortcuts();
    return aiConfig.publicConfig();
  });
  ipcMain.handle('ai:test', () => agent.testConnection());
  ipcMain.handle('ai:clear', () => { agent.reset(); return { ok: true }; });

  ipcMain.on('pet-chat', () => openChat(false));
  ipcMain.on('pet-chat-settings', () => openChat(true));

  createTray();
  registerShortcuts();
  startIdleWatch();
  startCursorWatch();
  setInterval(checkFullscreen, 8000);
}

// ---------- atajos ----------

function bindShortcut(list, fn) {
  for (const acc of list) {
    try {
      if (globalShortcut.register(acc, fn)) return acc;
    } catch (e) { /* acelerador ocupado */ }
  }
  return null;
}

function registerShortcuts() {
  try { globalShortcut.unregisterAll(); } catch (e) { /* nada registrado */ }
  if (!aiConfig.load().shortcuts) return;
  const a = bindShortcut(['CommandOrControl+Alt+Space', 'CommandOrControl+Alt+K'], () => openChat(false));
  const b = bindShortcut(['CommandOrControl+Alt+T', 'CommandOrControl+Alt+Y'], () => {
    openChat(false);
    if (chat) chat.send('chat:start-mic', {});
  });
  const c = bindShortcut(['CommandOrControl+Alt+P', 'CommandOrControl+Alt+O'], () => sendAI({ type: 'teleport' }));
  const d = bindShortcut(['CommandOrControl+Alt+H', 'CommandOrControl+Alt+J'], () => togglePet());
  bindShortcut(['CommandOrControl+Alt+X'], () => { if (agent) agent.stop(); });
  logdbg('shortcuts: chat=' + a + ' voz=' + b + ' teletransporte=' + c + ' ocultar=' + d);
}

// ---------- bandeja ----------

function trayTemplate() {
  return [
    { label: 'Hablar con ella…', click: () => openChat(false) },
    { label: 'Ajustes de IA…', click: () => openChat(true) },
    { type: 'separator' },
    {
      label: petHidden ? 'Mostrar mascota' : 'Ocultar mascota',
      click: () => togglePet()
    },
    {
      label: 'Pausar',
      type: 'checkbox',
      checked: paused,
      click: (item) => {
        paused = item.checked;
        send(paused ? 'pause-on' : 'pause-off');
      }
    },
    {
      label: 'Sonido',
      type: 'checkbox',
      checked: sound,
      click: (item) => {
        sound = item.checked;
        send(sound ? 'sound-on' : 'sound-off');
      }
    },
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() }
  ];
}

function updateTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  tray.setContextMenu(Menu.buildFromTemplate(trayTemplate()));
}

function createTray() {
  try {
    let img = nativeImage.createFromPath(path.join(__dirname, 'assets', 'webillo.png'));
    if (img.isEmpty()) return;
    img = img.resize({ width: 16, height: 16 });
    tray = new Tray(img);
    tray.setToolTip('Tigresa · WaifuPet');
    updateTrayMenu();
    tray.on('double-click', () => openChat(false));
  } catch (e) {
    logdbg('tray: ' + (e.message || e));
  }
}

// ---------- reposo e inactividad ----------

function startIdleWatch() {
  setInterval(() => {
    if (!win || win.isDestroyed() || !agent) return;
    let idle = 0;
    try { idle = powerMonitor.getSystemIdleTime(); } catch (e) { return; }
    const limit = aiConfig.load().idleMinutes * 60;
    if (!idleAsleep && idle >= limit) {
      idleAsleep = true;
      if (!agent.isBusy() && !petHidden) sendAI({ type: 'pose', name: 'sleep' });
    } else if (idleAsleep && idle < Math.min(30, limit)) {
      idleAsleep = false;
      if (!agent.isBusy() && !petHidden) sendAI({ type: 'pose', name: 'wake' });
    }
  }, 15000);
}

// Seguimiento global del cursor para que los ojos miren al ratón aunque esté
// fuera de la ventanita de la mascota.
function startCursorWatch() {
  setInterval(() => {
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    if (win.isMinimized()) return;
    win.webContents.send('pet-cursor-global', screen.getCursorScreenPoint());
  }, 180);
}

function resourcePath(name) {
  return app.isPackaged ? path.join(process.resourcesPath, name) : path.join(__dirname, name);
}

// Si una app está en pantalla completa (juego, vídeo), la mascota se aparta.
function checkFullscreen() {
  if (fullscreenBusy || !win || win.isDestroyed() || petHidden) return;
  if (!aiConfig.load().hideFullscreen) {
    if (fullscreenHidden) {
      fullscreenHidden = false;
      win.showInactive();
      win.setAlwaysOnTop(true, 'screen-saver');
    }
    return;
  }
  fullscreenBusy = true;
  execFile('powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', resourcePath('wins.ps1')],
    { timeout: 8000, windowsHide: true }, (err, stdout) => {
      fullscreenBusy = false;
      if (err) return;
      const nums = String(stdout).trim().split(',').map(Number);
      if (nums.length !== 4 || nums.some((n) => !isFinite(n))) return;
      const [l, t, r, b] = nums;
      let full = false;
      try {
        // Solo importa la pantalla donde está la mascota: si el juego está en
        // otro monitor, puede seguir acompañándote en el suyo.
        const d = screen.getDisplayMatching(win.getBounds());
        const pr = screen.dipToScreenRect(null, d.bounds);
        full = l <= pr.x + 2 && t <= pr.y + 2 && r >= pr.x + pr.width - 2 && b >= pr.y + pr.height - 2;
      } catch (e) { return; }
      if (full && !fullscreenHidden) {
        fullscreenHidden = true;
        logdbg('fullscreen: ocultar mascota');
        win.hide();
      } else if (!full && fullscreenHidden) {
        fullscreenHidden = false;
        logdbg('fullscreen: mostrar mascota');
        if (!petHidden) {
          win.showInactive();
          win.setAlwaysOnTop(true, 'screen-saver');
        }
      }
    });
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

function showMenu() {
  const template = [
    { label: 'Hablar con ella…', click: () => openChat(false) },
    { label: 'Ajustes de IA…', click: () => openChat(true) },
    { type: 'separator' },
    {
      label: 'Hacer cosas',
      submenu: [
        { label: 'Leer un libro', click: () => send('read') },
        { label: 'Tomar café', click: () => send('coffee') },
        { label: 'Desayunar', click: () => send('breakfast') },
        { label: 'Mirar el móvil', click: () => send('phone') },
        { label: model === 'tigresa' ? 'Vapear' : 'Fumar un cigarro', click: () => send('smoke') },
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
        { label: 'Caerse', click: () => send('fall') },
        { label: 'Saltar a la comba', click: () => send('rope') },
        { label: 'Girar el aro', click: () => send('hoop') },
        { label: 'Barrer', click: () => send('broom') },
        { label: 'Salir con paraguas', click: () => send('umbrella') },
        { label: 'El globo', click: () => send('balloon') },
        { label: 'Tocar la guitarra', click: () => send('guitar') },
        { label: 'Abanico', click: () => send('fan') },
        { label: 'Peinarse', click: () => send('brush') },
        { label: 'Jugar al yoyo', click: () => send('yoyo') },
        { label: 'Hacer una foto', click: () => send('camera') },
        { label: 'Boxear', click: () => send('box') },
        { label: 'Meditar', click: () => send('meditate') },
        { label: 'Saltar en el sitio', click: () => send('jump') },
        { label: 'Ponerse feliz', click: () => send('happy') },
        { label: 'No hacer nada', click: () => send('idle') },
        ...(model === 'tigresa'
          ? [{ label: 'Sacar la katana', click: () => send('katana') }]
          : []),
        { label: 'Despertar', click: () => send('wake') }
      ]
    },
    { label: 'Acariciar', click: () => send('pet') },
    {
      label: 'Modelo',
      submenu: [
        { label: 'Webillo', type: 'radio', checked: model === 'webillo', click: () => setModel('webillo') },
        { label: 'Tigresa', type: 'radio', checked: model === 'tigresa', click: () => setModel('tigresa') }
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
      checked: alwaysTop,
      click: (item) => {
        alwaysTop = !alwaysTop;
        item.checked = alwaysTop;
        if (win && !win.isDestroyed()) win.setAlwaysOnTop(alwaysTop, 'screen-saver');
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
  // No bloquear el primer pintado esperando a PowerShell/EDID: al arrancar con
  // la sesión puede tardar segundos y la mascota se quedaba con geometría
  // provisional (ventana a pantalla completa / fuera de sitio). Se responde ya
  // con las pantallas (monitorSizes ya va lanzado desde whenReady y avisará
  // cuando tenga las diagonales).
  return { win: win.getBounds(), displays: displayList() };
});

ipcMain.on('pet-menu', showMenu);

ipcMain.on('pet-model', (_e, m) => {
  if (m === 'webillo' || m === 'tigresa') model = m;
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
  // Antes de crear la ventana: si hay diagonales guardadas de la última vez,
  // el primer layout ya sale con el tamaño correcto aunque PowerShell falle.
  monList = loadSizesCache();
  createWindow();
  initAI();
  screen.on('display-added', notifyDisplays);
  screen.on('display-removed', notifyDisplays);
  screen.on('display-metrics-changed', notifyDisplays);
  // Recoloca en la banda "topmost" por si algo (arranque de sesión, cambio de
  // pantallas, otras apps) nos baja de la pila Z.
  setInterval(() => {
    if (win && !win.isDestroyed() && alwaysTop) win.setAlwaysOnTop(true, 'screen-saver');
  }, 5000);
  // Refresca diagonales en segundo plano (y reintenta si el sistema aún no
  // responde). monitorSizes() avisa al renderer cuando consigue datos.
  monitorSizes();
});

app.on('window-all-closed', () => app.quit());

app.on('will-quit', () => {
  try { globalShortcut.unregisterAll(); } catch (e) { /* nada */ }
  if (chat) chat.quit();
});
