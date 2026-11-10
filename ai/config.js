'use strict';

// ConfiguraciÃ³n persistente de la mascota IA.
// La clave de API se guarda cifrada con el almacÃ©n seguro del sistema
// (DPAPI en Windows). Si no hay almacÃ©n disponible se guarda ofuscada en
// base64, nunca en claro.

const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

const PROVIDERS = ['gemini', 'openai', 'ollama'];

const DEFAULT_MODELS = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  ollama: 'llama3.2'
};

const DEFAULTS = {
  provider: 'gemini',
  model: '',
  models: {},
  baseUrl: 'https://api.openai.com/v1',
  ollamaUrl: 'http://localhost:11434/v1',
  allowComputer: false,
  voice: true,
  idleMinutes: 10,
  userName: '',
  shortcuts: true,
  hideFullscreen: true,
  petName: 'Tigresa'
};

let cache = null;

function file() {
  return path.join(app.getPath('userData'), 'config.json');
}

function encrypt(s) {
  if (!s) return '';
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return 'enc:' + safeStorage.encryptString(s).toString('base64');
    }
  } catch (e) { /* sin cifrado disponible */ }
  return 'raw:' + Buffer.from(s, 'utf8').toString('base64');
}

function decrypt(v) {
  if (!v || typeof v !== 'string') return '';
  try {
    if (v.startsWith('enc:')) return safeStorage.decryptString(Buffer.from(v.slice(4), 'base64'));
    if (v.startsWith('raw:')) return Buffer.from(v.slice(4), 'base64').toString('utf8');
  } catch (e) { /* clave ilegible (otro usuario/sesiÃ³n) */ }
  return '';
}

function bool(v, def) {
  return typeof v === 'boolean' ? v : def;
}

function str(v, def, max) {
  if (typeof v !== 'string') return def;
  const t = v.trim();
  if (!t) return def;
  return t.slice(0, max || 500);
}

function load() {
  if (cache) return cache;
  let disk = {};
  try {
    disk = JSON.parse(fs.readFileSync(file(), 'utf8')) || {};
  } catch (e) { /* primera ejecuciÃ³n */ }

  const models = (disk.models && typeof disk.models === 'object' && !Array.isArray(disk.models))
    ? Object.assign({}, disk.models) : {};
  // MigraciÃ³n desde la versiÃ³n de un solo modelo.
  if (!Object.keys(models).length && typeof disk.model === 'string' && disk.model.trim()) {
    const prov = PROVIDERS.indexOf(disk.provider) >= 0 ? disk.provider : DEFAULTS.provider;
    models[prov] = disk.model.trim();
  }

  cache = {
    provider: PROVIDERS.indexOf(disk.provider) >= 0 ? disk.provider : DEFAULTS.provider,
    model: str(disk.model, ''),
    models: models,
    baseUrl: str(disk.baseUrl, DEFAULTS.baseUrl, 400),
    ollamaUrl: str(disk.ollamaUrl, DEFAULTS.ollamaUrl, 400),
    allowComputer: bool(disk.allowComputer, DEFAULTS.allowComputer),
    voice: bool(disk.voice, DEFAULTS.voice),
    idleMinutes: Math.max(2, Math.min(180, Number(disk.idleMinutes) || DEFAULTS.idleMinutes)),
    userName: str(disk.userName, '', 60),
    shortcuts: bool(disk.shortcuts, DEFAULTS.shortcuts),
    hideFullscreen: bool(disk.hideFullscreen, DEFAULTS.hideFullscreen),
    petName: str(disk.petName, DEFAULTS.petName, 40),
    keys: (disk.keys && typeof disk.keys === 'object') ? disk.keys : {},
    // Preferencias de la ventana de chat.
    chat: (disk.chat && typeof disk.chat === 'object') ? disk.chat : {}
  };
  return cache;
}

function save(patch) {
  const c = load();
  if (patch && typeof patch === 'object') {
    if (PROVIDERS.indexOf(patch.provider) >= 0) c.provider = patch.provider;
    if (typeof patch.model === 'string') {
      const m = patch.model.trim().slice(0, 120);
      c.model = m;
      if (m) c.models[c.provider] = m;
      else delete c.models[c.provider];
    }
    if (typeof patch.baseUrl === 'string') c.baseUrl = patch.baseUrl.trim().slice(0, 400) || DEFAULTS.baseUrl;
    if (typeof patch.ollamaUrl === 'string') c.ollamaUrl = patch.ollamaUrl.trim().slice(0, 400) || DEFAULTS.ollamaUrl;
    if (typeof patch.allowComputer === 'boolean') c.allowComputer = patch.allowComputer;
    if (typeof patch.voice === 'boolean') c.voice = patch.voice;
    if (patch.idleMinutes !== undefined) c.idleMinutes = Math.max(2, Math.min(180, Number(patch.idleMinutes) || 10));
    if (typeof patch.userName === 'string') c.userName = patch.userName.trim().slice(0, 60);
    if (typeof patch.shortcuts === 'boolean') c.shortcuts = patch.shortcuts;
    if (typeof patch.hideFullscreen === 'boolean') c.hideFullscreen = patch.hideFullscreen;
    if (typeof patch.petName === 'string') c.petName = patch.petName.trim().slice(0, 40) || DEFAULTS.petName;
    if (patch.chat && typeof patch.chat === 'object') c.chat = Object.assign({}, c.chat, patch.chat);
    if (patch.apiKey !== undefined && typeof patch.apiKey === 'string') {
      if (patch.apiKey.trim()) c.keys[c.provider] = encrypt(patch.apiKey.trim());
      else delete c.keys[c.provider];
    }
    if (patch.clearKey && PROVIDERS.indexOf(patch.clearKey) >= 0) delete c.keys[patch.clearKey];
  }
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify(c, null, 2), { mode: 0o600 });
  } catch (e) { /* disco lleno o permisos */ }
  return c;
}

function provider() {
  return load().provider;
}

function apiKey(p) {
  const c = load();
  return decrypt(c.keys[p || c.provider]);
}

function hasKey(p) {
  return !!apiKey(p);
}

function model(p) {
  const c = load();
  const prov = p || c.provider;
  return (c.models && c.models[prov]) || DEFAULT_MODELS[prov] || DEFAULT_MODELS.gemini;
}

function endpoint() {
  const c = load();
  if (c.provider === 'ollama') return c.ollamaUrl.replace(/\/+$/, '');
  if (c.provider === 'openai') return c.baseUrl.replace(/\/+$/, '');
  return 'https://generativelanguage.googleapis.com/v1beta';
}

// Gemini siempre necesita clave. Los servidores OpenAI-compatibles locales
// (LM Studio, text-generation-webui, etc.) suelen no pedir ninguna.
function needsKey() {
  const c = load();
  if (c.provider === 'ollama') return false;
  if (c.provider === 'gemini') return true;
  try {
    const u = new URL(c.baseUrl);
    const local = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].indexOf(u.hostname) >= 0 ||
      /\.local$/i.test(u.hostname) || /^192\.168\./.test(u.hostname) || /^10\./.test(u.hostname);
    return !local;
  } catch (e) {
    return true;
  }
}

function publicConfig() {
  const c = load();
  return {
    provider: c.provider,
    model: model(),
    models: c.models || {},
    baseUrl: c.baseUrl,
    ollamaUrl: c.ollamaUrl,
    allowComputer: c.allowComputer,
    voice: c.voice,
    idleMinutes: c.idleMinutes,
    userName: c.userName,
    shortcuts: c.shortcuts,
    hideFullscreen: c.hideFullscreen,
    petName: c.petName,
    chat: c.chat,
    hasKey: hasKey(),
    providerKeys: PROVIDERS.reduce((o, p) => { o[p] = hasKey(p); return o; }, {}),
    defaultModels: DEFAULT_MODELS
  };
}

module.exports = {
  PROVIDERS,
  DEFAULT_MODELS,
  load,
  save,
  provider,
  apiKey,
  hasKey,
  model,
  endpoint,
  needsKey,
  publicConfig
};
