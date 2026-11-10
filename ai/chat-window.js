'use strict';

// Ventana de chat. Es independiente de la mascota para poder escribir con
// teclado sin quitarle el foco al escritorio hasta que el usuario la abre.

const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

const CW = 420;
const CH = 650;

class ChatWindow {
  constructor(opts) {
    this.petWin = opts.petWin;
    this.onShown = opts.onShown || (() => {});
    this.win = null;
    this.ready = false;
    this.pending = [];
    this.wantSettings = false;
  }

  create() {
    if (this.win && !this.win.isDestroyed()) return this.win;
    this.ready = false;
    this.win = new BrowserWindow({
      width: CW,
      height: CH,
      show: false,
      frame: false,
      transparent: true,
      resizable: true,
      minimizable: true,
      maximizable: false,
      fullscreenable: false,
      alwaysOnTop: true,
      skipTaskbar: false,
      hasShadow: false,
      title: 'Tigresa',
      minWidth: 360,
      minHeight: 480,
      maxWidth: 560,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload-chat.js'),
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false
      }
    });

    this.win.setAlwaysOnTop(true, 'screen-saver');
    this.win.loadFile(path.join(__dirname, '..', 'chat.html'));

    this.win.once('ready-to-show', () => {
      this.ready = true;
      this._flush();
    });

    this.win.webContents.on('did-finish-load', () => {
      this.ready = true;
      this._flush();
    });

    // Cerrar con la X o Alt+F4 solo la esconde.
    this.win.on('close', (e) => {
      if (!this.quitting) {
        e.preventDefault();
        this.hide();
      }
    });

    return this.win;
  }

  place() {
    if (!this.win || this.win.isDestroyed()) return;
    const pb = this.petWin && !this.petWin.isDestroyed() ? this.petWin.getBounds() : null;
    const display = pb ? screen.getDisplayMatching(pb) : screen.getPrimaryDisplay();
    const wa = display.workArea;
    const w = Math.min(CW, wa.width - 16);
    const h = Math.min(CH, wa.height - 16);
    let x;
    if (pb) {
      const petCenter = pb.x + pb.width / 2;
      const spaceRight = wa.x + wa.width - (pb.x + pb.width);
      const spaceLeft = pb.x - wa.x;
      x = spaceRight >= w + 8 || spaceRight >= spaceLeft ? pb.x + pb.width + 8 : pb.x - w - 8;
    } else {
      x = wa.x + wa.width - w - 12;
    }
    x = Math.max(wa.x + 8, Math.min(wa.x + wa.width - w - 8, x));
    let y = pb ? pb.y + pb.height - h : wa.y + wa.height - h - 12;
    y = Math.max(wa.y + 8, Math.min(wa.y + wa.height - h - 8, y));
    this.win.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) });
  }

  open(settings) {
    const win = this.create();
    if (settings) this.wantSettings = true;
    this.place();
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    if (this.wantSettings) {
      this.wantSettings = false;
      this.send('chat:open-settings', {});
    } else {
      this.send('chat:focus-input', {});
    }
    this.onShown();
    return win;
  }

  openSettings() {
    return this.open(true);
  }

  hide() {
    if (this.win && !this.win.isDestroyed()) this.win.hide();
  }

  minimize() {
    if (this.win && !this.win.isDestroyed()) this.win.minimize();
  }

  isOpen() {
    return !!(this.win && !this.win.isDestroyed() && this.win.isVisible());
  }

  _rawSend(channel, payload) {
    if (!this.win || this.win.isDestroyed()) return false;
    this.win.webContents.send(channel, payload);
    return true;
  }

  _flush() {
    const list = this.pending;
    this.pending = [];
    for (const [ch, payload] of list) this._rawSend(ch, payload);
  }

  send(channel, payload) {
    if (!this.win || this.win.isDestroyed()) return false;
    if (!this.ready) {
      this.pending.push([channel, payload]);
      return false;
    }
    return this._rawSend(channel, payload);
  }

  quit() {
    this.quitting = true;
    if (this.win && !this.win.isDestroyed()) this.win.destroy();
  }
}

function registerIpc(chat) {
  ipcMain.on('chat:close', () => chat.hide());
  ipcMain.on('chat:hide', () => chat.hide());
  ipcMain.on('chat:minimize', () => chat.minimize());
}

module.exports = { ChatWindow, registerIpc };
