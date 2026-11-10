'use strict';

// Acciones reales sobre el sistema. Todo pasa por una lista blanca y por
// confirmación del usuario en la capa del agente.

const { app, screen, desktopCapturer, clipboard, shell, Notification } = require('electron');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function resource(name) {
  return app.isPackaged
    ? path.join(process.resourcesPath, name)
    : path.join(__dirname, '..', name);
}

function runPS(script, args, timeout) {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script].concat(args || []),
      { timeout: timeout || 15000, windowsHide: true, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          err.message = String(stderr || err.message || err).trim();
          reject(err);
          return;
        }
        resolve(String(stdout || '').trim());
      });
  });
}

function psArgs(cmd, o) {
  const a = ['-cmd', cmd];
  for (const [k, v] of Object.entries(o || {})) a.push('-' + k, String(v));
  return a;
}

function input(cmd, o) {
  return runPS(resource('input.ps1'), psArgs(cmd, o), 20000);
}

// ---------- pantalla ----------

async function screenCapture() {
  const displays = screen.getAllDisplays();
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor) || screen.getPrimaryDisplay();
  const physW = Math.round(display.size.width * display.scaleFactor);
  const physH = Math.round(display.size.height * display.scaleFactor);
  const max = 1600;
  const k = Math.min(1, max / Math.max(physW, physH));
  const thumb = {
    width: Math.max(320, Math.round(physW * k)),
    height: Math.max(200, Math.round(physH * k))
  };
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: thumb, fetchWindowIcons: false });
  let source = sources.find((s) => String(s.display_id) === String(display.id));
  if (!source && sources.length) source = sources[0];
  if (!source || source.thumbnail.isEmpty()) throw new Error('No se pudo capturar la pantalla');
  return {
    dataUrl: source.thumbnail.toDataURL(),
    width: thumb.width,
    height: thumb.height,
    display: {
      id: display.id,
      bounds: display.bounds,
      size: display.size,
      scaleFactor: display.scaleFactor,
      primary: display.id === screen.getPrimaryDisplay().id
    }
  };
}

function normToPhysical(nx, ny, display) {
  const d = display || screen.getPrimaryDisplay();
  const dipX = d.bounds.x + (Math.max(0, Math.min(1000, nx)) / 1000) * d.size.width;
  const dipY = d.bounds.y + (Math.max(0, Math.min(1000, ny)) / 1000) * d.size.height;
  const p = screen.dipToScreenPoint({ x: Math.round(dipX), y: Math.round(dipY) });
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

async function mouseMove(nx, ny, display) {
  const p = normToPhysical(nx, ny, display);
  await input('move', { x: p.x, y: p.y });
  return p;
}

async function mouseClick(nx, ny, button, double, display) {
  const p = normToPhysical(nx, ny, display);
  await input('click', { x: p.x, y: p.y, button: button || 'left', amount: double ? 2 : 1 });
  return p;
}

async function mouseDrag(x1, y1, x2, y2, button, display) {
  const a = normToPhysical(x1, y1, display);
  const b = normToPhysical(x2, y2, display);
  await input('drag', { x: a.x, y: a.y, x2: b.x, y2: b.y, button: button || 'left' });
  return { from: a, to: b };
}

async function scroll(direction, amount) {
  const n = Math.max(1, Math.min(10, Math.abs(Number(amount) || 3)));
  await input('scroll', { amount: direction === 'down' ? -n : n });
}

const SEND_KEYS = {
  enter: '{ENTER}', tab: '{TAB}', esc: '{ESC}', escape: '{ESC}',
  space: ' ', backspace: '{BACKSPACE}', delete: '{DELETE}',
  up: '{UP}', down: '{DOWN}', left: '{LEFT}', right: '{RIGHT}',
  home: '{HOME}', end: '{END}', pageup: '{PGUP}', pagedown: '{PGDN}',
  f1: '{F1}', f2: '{F2}', f3: '{F3}', f4: '{F4}', f5: '{F5}', f6: '{F6}',
  f7: '{F7}', f8: '{F8}', f9: '{F9}', f10: '{F10}', f11: '{F11}', f12: '{F12}',
  'ctrl+a': '^a', 'ctrl+c': '^c', 'ctrl+v': '^v', 'ctrl+x': '^x', 'ctrl+z': '^z',
  'ctrl+s': '^s', 'ctrl+f': '^f', 'ctrl+p': '^p', 'ctrl+w': '^w', 'ctrl+t': '^t',
  'alt+tab': '%{TAB}', 'alt+f4': '%{F4}', 'shift+tab': '+{TAB}',
  'ctrl+shift+t': '^+t', 'ctrl+shift+n': '^+n', 'ctrl+shift+esc': '^+{ESC}'
};

function sendKeys(seq) {
  return input('sendkeys', { keys: seq });
}

async function pressKey(key) {
  const k = String(key || '').toLowerCase().trim();
  if (SEND_KEYS[k]) return sendKeys(SEND_KEYS[k]);
  if (/^[a-z0-9]$/.test(k)) return sendKeys(k);
  if (/^[+\-*/=.]$/.test(k)) return sendKeys('{' + k + '}');
  throw new Error('Tecla no soportada: ' + key);
}

// Pegar por portapapeles es lo único que respeta tildes y símbolos.
async function typeText(text) {
  const t = String(text || '').slice(0, 4000);
  if (!t) return;
  const prev = clipboard.readText();
  clipboard.writeText(t);
  await sendKeys('^v');
  setTimeout(() => {
    try {
      if (clipboard.readText() === t) clipboard.writeText(prev || '');
    } catch (e) { /* ignorar */ }
  }, 700);
}

// ---------- apps y webs ----------

const APPS = {
  notepad: { win: 'notepad.exe', linux: 'gedit' },
  bloc: { win: 'notepad.exe', linux: 'gedit' },
  calculadora: { win: 'calc.exe', linux: 'gnome-calculator' },
  calc: { win: 'calc.exe', linux: 'gnome-calculator' },
  calculator: { win: 'calc.exe', linux: 'gnome-calculator' },
  paint: { win: 'mspaint.exe', linux: 'gimp' },
  explorer: { win: 'explorer.exe', linux: 'nautilus' },
  archivos: { win: 'explorer.exe', linux: 'nautilus' },
  explorador: { win: 'explorer.exe', linux: 'nautilus' },
  terminal: { win: 'wt.exe', linux: 'gnome-terminal' },
  code: { win: 'code', linux: 'code' },
  vscode: { win: 'code', linux: 'code' },
  chrome: { win: 'chrome', linux: 'google-chrome' },
  edge: { win: 'msedge', linux: 'microsoft-edge' },
  firefox: { win: 'firefox', linux: 'firefox' },
  spotify: { win: 'spotify', linux: 'spotify' },
  discord: { win: 'discord', linux: 'discord' },
  steam: { win: 'steam', linux: 'steam' },
  word: { win: 'winword', linux: '' },
  excel: { win: 'excel', linux: '' },
  powerpoint: { win: 'powerpnt', linux: '' },
  configuracion: { win: 'ms-settings:', linux: 'gnome-control-center' },
  ajustes: { win: 'ms-settings:', linux: 'gnome-control-center' },
  settings: { win: 'ms-settings:', linux: 'gnome-control-center' }
};

const APP_LABEL = {
  notepad: 'Notepad', calculadora: 'la calculadora', paint: 'Paint',
  explorer: 'el Explorador de archivos', terminal: 'la terminal',
  code: 'Visual Studio Code', chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox',
  spotify: 'Spotify', discord: 'Discord', steam: 'Steam', configuracion: 'Configuración'
};

function openApp(raw) {
  const key = String(raw || '').toLowerCase().trim();
  const appDef = APPS[key];
  if (!appDef) {
    throw new Error('Aplicación no permitida: ' + raw + '. Permitidas: ' + Object.keys(APPS).join(', '));
  }
  const target = process.platform === 'win32' ? appDef.win : appDef.linux;
  if (!target) throw new Error('Esa app no está configurada para este sistema');
  if (process.platform === 'win32') {
    spawn('cmd.exe', ['/c', 'start', '', target], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } else {
    spawn(target, [], { detached: true, stdio: 'ignore' }).unref();
  }
  return APP_LABEL[key] || key;
}

async function openUrl(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch (e) { throw new Error('URL no válida'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Solo se permiten enlaces http/https');
  await shell.openExternal(u.toString());
  return u.toString();
}

async function lockScreen() {
  if (process.platform === 'win32') {
    spawn('rundll32.exe', ['user32.dll,LockWorkStation'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } else {
    spawn('loginctl', ['lock-session'], { detached: true, stdio: 'ignore' }).unref();
  }
}

async function volume(direction, amount) {
  const n = Math.max(1, Math.min(20, Number(amount) || 2));
  if (process.platform === 'win32') {
    await input('volume', { button: direction, amount: n });
  } else {
    const arg = direction === 'mute' ? 'mute' : (direction === 'down' ? `${n}%-` : `${n}%+`);
    if (direction === 'mute') spawn('amixer', ['-q', 'set', 'Master', 'toggle'], { stdio: 'ignore' });
    else spawn('amixer', ['-q', 'sset', 'Master', arg], { stdio: 'ignore' });
  }
}

async function showDesktop() {
  if (process.platform === 'win32') await input('showdesktop', {});
  else await sendKeys('^{ESC}d');
}

async function searchFiles(query) {
  const q = String(query || '').replace(/[*?[\]{}<>|"']/g, ' ').trim().slice(0, 80);
  if (!q) throw new Error('Falta el texto a buscar');
  if (process.platform !== 'win32') {
    // En Linux se usa locate si está disponible; si no, se avisa sin romper.
    return new Promise((resolve) => {
      execFile('locate', ['-l', '30', q], { timeout: 8000 }, (err, stdout) => {
        resolve(err ? [] : String(stdout).split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
      });
    });
  }
  const script = [
    '$roots = @("$env:USERPROFILE\\Desktop","$env:USERPROFILE\\Documents","$env:USERPROFILE\\Downloads")',
    '$q = $env:PET_QUERY',
    'Get-ChildItem -Path $roots -Recurse -File -ErrorAction SilentlyContinue |',
    '  Where-Object { $_.Name -like "*$q*" } |',
    '  Select-Object -First 30 -ExpandProperty FullName'
  ].join('\n');
  return new Promise((resolve, reject) => {
    execFile('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 15000, windowsHide: true, maxBuffer: 1024 * 1024, env: Object.assign({}, process.env, { PET_QUERY: q }) },
      (err, stdout) => {
        if (err) return reject(new Error('La búsqueda falló'));
        resolve(String(stdout).split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 30));
      });
  });
}

function systemInfo() {
  const d = screen.getPrimaryDisplay();
  return {
    os: os.type() + ' ' + os.release(),
    platform: process.platform,
    arch: os.arch(),
    host: os.hostname(),
    user: os.userInfo().username,
    display: d.size.width + 'x' + d.size.height + ' @' + d.scaleFactor,
    displays: screen.getAllDisplays().length,
    time: new Date().toLocaleString('es-ES')
  };
}

function notify(title, body) {
  try {
    if (Notification.isSupported()) new Notification({ title, body, silent: false }).show();
  } catch (e) { /* sin notificaciones */ }
}

module.exports = {
  resource,
  input,
  screenCapture,
  normToPhysical,
  mouseMove,
  mouseClick,
  mouseDrag,
  scroll,
  pressKey,
  typeText,
  openApp,
  openUrl,
  lockScreen,
  volume,
  showDesktop,
  searchFiles,
  systemInfo,
  notify,
  APPS
};
