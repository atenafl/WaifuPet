const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('battleAPI', {
  onFrame: (cb) => ipcRenderer.on('battle-frame', (_e, data) => cb(data)),
  menu: () => ipcRenderer.send('pet-menu'),
  ignore: (value) => ipcRenderer.send('battle-ignore', value)
});
