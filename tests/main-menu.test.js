const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

test('Right-click menu offers independent combat controls and synchronizes pause, size and visibility', () => {
  let template;
  const calls = [];
  const screen = { getAllDisplays: () => [{ id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1080 }, scaleFactor: 1 }],
    getPrimaryDisplay: () => ({ id: 1 }), dipToScreenPoint: (p) => p };
  const electron = { screen, ipcMain: { on() {}, handle() {} },
    app: { whenReady: () => new Promise(() => {}), on() {} },
    BrowserWindow: { fromWebContents: () => ({ isDestroyed: () => false }) },
    Menu: { buildFromTemplate: (items) => { template = items; return { popup() {} }; } } };
  const ctx = vm.createContext({ __dirname: path.dirname(__dirname), calls, setTimeout, clearTimeout, setInterval, clearInterval,
    require: (name) => name === 'electron' ? electron : name === './combat-controller' ? { CombatController: class {} } :
      name.startsWith('./') ? require(path.join(__dirname, '..', name)) : require(name) });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8'), ctx);
  vm.runInContext(`combat = { engine: { mode: 'fight', form: 'base', automatic: false, setMode(mode) { this.mode = mode; } },
    transform(id) { this.engine.form = id; },
    fuse(id) { calls.push(id); }, unfuse() { calls.push('unfuse'); }, setOpponent(id) { this.engine.opponent = id; },
    setModel(id) { calls.push(id); }, setTop(top) { calls.push(top); } }; model = 'dragonball';
    showMenu({ sender: {} });`, ctx);
  const controls = template[0].submenu;
  assert.equal(template[0].label, 'Combate y vuelo');
  assert.equal(controls.length, 6);
  controls[1].click(); assert.equal(vm.runInContext('combat.engine.mode', ctx), 'roam');
  controls[0].click(); assert.equal(vm.runInContext('combat.engine.mode', ctx), 'fight');
  assert.equal(controls[2].submenu.length, 9);
  controls[2].submenu[8].click(); assert.equal(vm.runInContext('combat.engine.form', ctx), 'ui-ego');
  controls[3].click({ checked: true }); assert.equal(vm.runInContext('combat.engine.automatic', ctx), true);
  assert.equal(vm.runInContext('combat.engine.form', ctx), 'ss1');
  controls[2].submenu[4].click(); assert.equal(vm.runInContext('combat.engine.automatic', ctx), false);
  assert.equal(controls[4].submenu.length, 6);
  controls[4].submenu[5].click(); assert.ok(calls.includes('gogeta-blue'));
  controls[4].submenu[0].click(); assert.ok(calls.includes('unfuse'));
  controls[5].submenu[1].click(); assert.equal(vm.runInContext('combat.engine.opponent', ctx), 'broly');
  assert.ok(!template.some((item) => item.label === 'Acariciar'));
  template.find((item) => item.label === 'Pausar').click({ checked: true });
  assert.equal(vm.runInContext('combat.paused', ctx), true);
  template.find((item) => item.label === 'Tamaño').submenu[2].click();
  assert.equal(vm.runInContext('combat.scale', ctx), 1.3);
  template.find((item) => item.label === 'Siempre visible').click({ checked: false });
  assert.ok(calls.includes(false));
  const models = template.find((item) => item.label === 'Modelo').submenu;
  models.find((item) => item.label === 'Saitama').click(); assert.ok(calls.includes('saitama'));
});
