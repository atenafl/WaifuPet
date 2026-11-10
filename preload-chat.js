const { contextBridge, ipcRenderer } = require('electron');

function on(channel, cb) {
  ipcRenderer.on(channel, (_e, payload) => cb(payload));
}

contextBridge.exposeInMainWorld('chatAPI', {
  getState: () => ipcRenderer.invoke('ai:state'),
  send: (text) => ipcRenderer.invoke('ai:send', text),
  stop: () => ipcRenderer.invoke('ai:stop'),
  confirm: (id, allow, always) => ipcRenderer.invoke('ai:confirm-reply', { id, allow, always }),
  saveConfig: (patch) => ipcRenderer.invoke('ai:save-config', patch),
  test: () => ipcRenderer.invoke('ai:test'),
  clear: () => ipcRenderer.invoke('ai:clear'),
  close: () => ipcRenderer.send('chat:close'),
  minimize: () => ipcRenderer.send('chat:minimize'),
  hide: () => ipcRenderer.send('chat:hide'),
  onState: (cb) => on('ai:state', cb),
  onMessage: (cb) => on('ai:message', cb),
  onStatus: (cb) => on('ai:status', cb),
  onConfirm: (cb) => on('ai:confirm', cb),
  onConfirmClose: (cb) => on('ai:confirm-close', cb),
  onSpeak: (cb) => on('ai:speak', cb),
  onCleared: (cb) => on('ai:cleared', cb),
  onOpenSettings: (cb) => on('chat:open-settings', cb),
  onFocusInput: (cb) => on('chat:focus-input', cb),
  onStartMic: (cb) => on('chat:start-mic', cb)
});
