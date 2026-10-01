const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  move: (x, y, w, h) => ipcRenderer.send('pet-move', x, y, w, h),
  size: (w, h) => ipcRenderer.send('pet-size', w, h),
  info: () => ipcRenderer.invoke('pet-info'),
  menu: () => ipcRenderer.send('pet-menu'),
  model: (id) => ipcRenderer.send('pet-model', id),
  sizeMul: (id) => ipcRenderer.send('pet-sizemul', id),
  log: (s) => ipcRenderer.send('pet-log', s),
  ignoreMouse: (v) => ipcRenderer.send('pet-ignore', v),
  onAction: (cb) => ipcRenderer.on('pet-action', (_e, a) => cb(a)),
  onDisplays: (cb) => ipcRenderer.on('pet-displays', (_e, d) => cb(d)),
  dragState: (on) => ipcRenderer.send('pet-dragstate', !!on),
  onCursor: (cb) => ipcRenderer.on('pet-cursor', (_e, c) => cb(c))
});
