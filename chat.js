'use strict';

const api = window.chatAPI;

const $ = (id) => document.getElementById(id);
const messagesEl = $('messages');
const emptyEl = $('empty');
const inputEl = $('input');
const btnSend = $('btnSend');
const btnStop = $('btnStop');
const btnMic = $('btnMic');
const statusText = $('statusText');
const statusDot = $('statusDot');

let busy = false;
let confirmItem = null;
let rec = null;
let settingsOpen = false;

const TOOL_LABELS = {
  move_pet: 'moviéndome',
  pet_action: 'haciendo una monería',
  say: 'hablando',
  open_app: 'abriendo una app',
  open_url: 'abriendo una web',
  set_timer: 'poniendo un temporizador',
  set_reminder: 'creando un recordatorio',
  save_note: 'guardando una nota',
  list_notes: 'leyendo mis notas',
  search_files: 'buscando archivos',
  system_action: 'ajustando el sistema',
  get_time: 'mirando la hora',
  wait: 'esperando',
  look_at_screen: 'mirando tu pantalla',
  mouse_move: 'moviendo el ratón',
  mouse_click: 'haciendo clic',
  mouse_drag: 'arrastrando',
  scroll: 'haciendo scroll',
  keyboard_type: 'escribiendo',
  keyboard_key: 'pulsando una tecla'
};

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function timeText(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function atBottom() {
  return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 90;
}

function scrollDown(force) {
  if (force || atBottom()) messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addMessage(role, text, opt) {
  opt = opt || {};
  if (emptyEl) emptyEl.style.display = 'none';
  const wrap = el('div', 'msg ' + role + (opt.error ? ' error' : ''));
  const bubble = el('div', 'bubble');
  bubble.textContent = text;
  wrap.appendChild(bubble);
  wrap.appendChild(el('div', 'meta', timeText(opt.at)));
  const stick = atBottom();
  messagesEl.appendChild(wrap);
  scrollDown(stick || role === 'user');
  return wrap;
}

function showTyping() {
  if ($('typing')) return;
  const wrap = el('div', 'msg assistant');
  wrap.id = 'typing';
  const b = el('div', 'bubble');
  const t = el('span', 'typing');
  t.appendChild(el('i')); t.appendChild(el('i')); t.appendChild(el('i'));
  b.appendChild(t);
  wrap.appendChild(b);
  messagesEl.appendChild(wrap);
  scrollDown(true);
}

function hideTyping() {
  const t = $('typing');
  if (t) t.remove();
}

function setStatus(state, detail) {
  statusDot.className = 'dot' + (state === 'thinking' || state === 'working' ? ' working' : state === 'error' ? ' error' : '');
  if (state === 'thinking') statusText.textContent = 'Pensando…';
  else if (state === 'working') statusText.textContent = TOOL_LABELS[detail] || 'Trabajando…';
  else if (state === 'error') statusText.textContent = 'Algo falló';
  else statusText.textContent = 'En línea';
  busy = state === 'thinking' || state === 'working';
  btnStop.hidden = !busy;
  btnSend.style.display = busy ? 'none' : '';
  if (busy) showTyping(); else hideTyping();
}

function resizeInput() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(110, inputEl.scrollHeight) + 'px';
}

async function send() {
  const text = inputEl.value.trim();
  if (!text || busy) return;
  inputEl.value = '';
  resizeInput();
  try {
    const r = await api.send(text);
    if (r && r.ok === false && r.error && r.error !== 'missing-key') {
      // El agente ya muestra el error; evitamos duplicarlo.
    }
  } catch (e) {
    addMessage('assistant', 'No pude enviar el mensaje: ' + e.message, { error: true });
  }
}

function setConfirm(item) {
  confirmItem = item;
  $('confirmRisk').textContent = item.risk === 'high' ? 'Acción delicada' : 'Permiso';
  $('confirmRisk').classList.toggle('high', item.risk === 'high');
  $('confirmTitle').textContent = item.title || '¿Me dejas?';
  $('confirmDetail').textContent = item.detail || '';
  $('confirmAlways').checked = false;
  $('confirmAlwaysWrap').style.display = item.always ? '' : 'none';
  $('confirm').hidden = false;
  $('btnAllow').focus();
}

function answerConfirm(allow) {
  if (!confirmItem) return;
  const always = $('confirmAlways').checked;
  api.confirm(confirmItem.id, allow, always);
  confirmItem = null;
  $('confirm').hidden = true;
}

function closeSettings() {
  settingsOpen = false;
  $('settings').hidden = true;
}

function openSettings() {
  settingsOpen = true;
  $('settings').hidden = false;
  loadConfigIntoForm();
}

let currentConfig = null;

function providerChanged() {
  const p = $('provider').value;
  $('keyField').style.display = p === 'ollama' ? 'none' : '';
  $('baseField').style.display = p === 'openai' ? '' : 'none';
  $('ollamaField').style.display = p === 'ollama' ? '' : 'none';
  const dm = currentConfig && currentConfig.defaultModels ? currentConfig.defaultModels[p] : '';
  $('model').placeholder = dm || '';
  if (currentConfig) {
    const stored = currentConfig.models && currentConfig.models[p];
    $('model').value = stored || '';
    const has = currentConfig.providerKeys && currentConfig.providerKeys[p];
    $('keyHint').textContent = has
      ? 'Ya hay una clave guardada. Deja el campo vacío para conservarla.'
      : 'Se guarda cifrada con el sistema.';
  }
}

function loadConfigIntoForm() {
  const c = currentConfig;
  if (!c) return;
  $('provider').value = c.provider;
  $('apiKey').value = '';
  $('model').value = c.model || '';
  $('baseUrl').value = c.baseUrl || '';
  $('ollamaUrl').value = c.ollamaUrl || '';
  $('userName').value = c.userName || '';
  $('allowComputer').checked = !!c.allowComputer;
  $('voice').checked = !!c.voice;
  $('shortcuts').checked = c.shortcuts !== false;
  $('hideFullscreen').checked = c.hideFullscreen !== false;
  $('idleMinutes').value = c.idleMinutes || 10;
  $('testResult').textContent = '';
  $('testResult').className = 'test-result';
  providerChanged();
}

function collectPatch() {
  const patch = {
    provider: $('provider').value,
    model: $('model').value,
    baseUrl: $('baseUrl').value,
    ollamaUrl: $('ollamaUrl').value,
    userName: $('userName').value,
    allowComputer: $('allowComputer').checked,
    voice: $('voice').checked,
    shortcuts: $('shortcuts').checked,
    hideFullscreen: $('hideFullscreen').checked,
    idleMinutes: Number($('idleMinutes').value) || 10
  };
  const key = $('apiKey').value.trim();
  if (key) patch.apiKey = key;
  return patch;
}

async function saveConfig() {
  const patch = collectPatch();
  try {
    const next = await api.saveConfig(patch);
    currentConfig = next;
    $('apiKey').value = '';
    const r = $('testResult');
    r.textContent = 'Guardado ✓';
    r.className = 'test-result ok';
    setTimeout(() => { if (r.textContent === 'Guardado ✓') { r.textContent = ''; r.className = 'test-result'; } }, 2200);
    providerChanged();
  } catch (e) {
    const r = $('testResult');
    r.textContent = 'No se pudo guardar: ' + e.message;
    r.className = 'test-result bad';
  }
}

async function testConnection() {
  const btn = $('btnTest');
  const r = $('testResult');
  btn.disabled = true;
  r.textContent = 'Guardando y probando…';
  r.className = 'test-result';
  try {
    currentConfig = await api.saveConfig(collectPatch());
    $('apiKey').value = '';
    providerChanged();
    const out = await api.test();
    r.textContent = 'Conexión correcta: ' + String(out).slice(0, 80);
    r.className = 'test-result ok';
  } catch (e) {
    r.textContent = 'Error: ' + (e.message || e);
    r.className = 'test-result bad';
  } finally {
    btn.disabled = false;
  }
}

// ---------- voz ----------

let voices = [];
function loadVoices() {
  try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; }
}
if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function speak(text) {
  if (!text || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/[*_`#>~]/g, ' ').slice(0, 500));
    u.lang = 'es-ES';
    u.rate = 1.04;
    u.pitch = 1.18;
    const v = voices.find((x) => /es[-_]ES/i.test(x.lang)) || voices.find((x) => /^es/i.test(x.lang));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch (e) { /* sin voz */ }
}

function toggleMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    addMessage('assistant', 'Tu sistema no tiene reconocimiento de voz disponible. Puedes escribirme igualmente.', { error: true });
    return;
  }
  if (rec) {
    try { rec.stop(); } catch (e) { /* ya parado */ }
    return;
  }
  try {
    rec = new SR();
    rec.lang = 'es-ES';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      inputEl.value = t;
      resizeInput();
    };
    rec.onerror = () => {
      btnMic.classList.remove('rec');
      rec = null;
    };
    rec.onend = () => {
      btnMic.classList.remove('rec');
      rec = null;
      const t = inputEl.value.trim();
      if (t) send();
    };
    rec.start();
    btnMic.classList.add('rec');
  } catch (e) {
    rec = null;
    btnMic.classList.remove('rec');
  }
}

// ---------- eventos ----------

btnSend.addEventListener('click', send);
btnStop.addEventListener('click', () => { api.stop(); setStatus('idle'); });
btnMic.addEventListener('click', toggleMic);

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
inputEl.addEventListener('input', resizeInput);

document.querySelectorAll('.chip').forEach((c) => {
  c.addEventListener('click', () => {
    inputEl.value = c.dataset.say || c.textContent;
    resizeInput();
    send();
  });
});

$('btnSettings').addEventListener('click', () => settingsOpen ? closeSettings() : openSettings());
$('btnSettingsClose').addEventListener('click', closeSettings);
$('btnSave').addEventListener('click', saveConfig);
$('btnTest').addEventListener('click', testConnection);
$('provider').addEventListener('change', providerChanged);
$('btnClose').addEventListener('click', () => api.hide());
$('btnMin').addEventListener('click', () => api.minimize());

$('btnClear').addEventListener('click', () => {
  api.clear();
  messagesEl.innerHTML = '';
  messagesEl.appendChild(emptyEl);
  emptyEl.style.display = '';
  closeSettings();
});

$('btnAllow').addEventListener('click', () => answerConfirm(true));
$('btnDeny').addEventListener('click', () => answerConfirm(false));

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (confirmItem) { answerConfirm(false); return; }
  if (settingsOpen) { closeSettings(); return; }
  if (busy) { api.stop(); setStatus('idle'); }
});

api.onMessage((m) => {
  hideTyping();
  addMessage(m.role === 'user' ? 'user' : 'assistant', m.text, m);
});
api.onStatus((s) => {
  setStatus(s.state, s.detail);
  if (s.state === 'idle') {
    hideTyping();
    if (messagesEl.children.length) emptyEl.style.display = 'none';
  }
});
api.onConfirm((item) => setConfirm(item));
api.onConfirmClose(() => {
  if (!confirmItem) return;
  confirmItem = null;
  $('confirm').hidden = true;
});
api.onSpeak((p) => speak(p && p.text));

api.onCleared(() => {
  messagesEl.innerHTML = '';
  messagesEl.appendChild(emptyEl);
  emptyEl.style.display = '';
});

api.onOpenSettings(() => openSettings());
api.onFocusInput(() => {
  closeSettings();
  inputEl.focus();
});
api.onStartMic(() => {
  closeSettings();
  if (!rec) toggleMic();
});

api.onState((s) => {
  if (!s) return;
  currentConfig = s.config || currentConfig;
  if (s.config) {
    $('petName').textContent = s.config.petName || 'Tigresa';
    loadConfigIntoForm();
  }
  if (Array.isArray(s.history) && s.history.length) {
    messagesEl.innerHTML = '';
    messagesEl.appendChild(emptyEl);
    for (const m of s.history) addMessage(m.role, m.text);
  }
  if (s.busy) setStatus('thinking');
});

async function init() {
  try {
    const s = await api.getState();
    if (s) {
      currentConfig = s.config;
      $('petName').textContent = (s.config && s.config.petName) || 'Tigresa';
      loadConfigIntoForm();
      if (Array.isArray(s.history) && s.history.length) {
        messagesEl.innerHTML = '';
        messagesEl.appendChild(emptyEl);
        for (const m of s.history) addMessage(m.role, m.text);
      }
      if (s.busy) setStatus('thinking');
    }
  } catch (e) { /* ventana recién abierta */ }
  inputEl.focus();
}

init();
