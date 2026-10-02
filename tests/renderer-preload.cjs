const { contextBridge, ipcRenderer } = require('electron');
const bounds = { x: 0, y: 0, width: 1920, height: 1080 };
contextBridge.exposeInMainWorld('petAPI', {
  info: async () => ({ win: { x: 500, y: 700, width: 340, height: 380 }, displays: [
    { id: 1, primary: true, enabled: true, bounds, workArea: bounds, phys: bounds, scale: 1 }
  ] }),
  model: (id) => ipcRenderer.send('qa-model', id), sizeMul: () => {},
  move: () => {}, size: () => {}, menu: () => {}, log: () => {}, ignoreMouse: () => {}, dragState: () => {}, fx: () => {},
  hero: (data) => ipcRenderer.send('qa-hero', data),
  monsterHit: () => ipcRenderer.send('qa-hit'),
  onAction: (cb) => ipcRenderer.on('qa-action', (_e, a) => cb(a)),
  onDisplays: () => {}, onCursor: () => {}
});
