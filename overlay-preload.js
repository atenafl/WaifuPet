const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fxAPI', {
  onFx: (cb) => ipcRenderer.on('fx', (_e, type, data) => cb(type, data)),
  done: () => ipcRenderer.send('overlay-done')
});
