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
  models.find((item) => item.label === 'Attack on Titan · Los tres').click(); assert.ok(calls.includes('attackontitan'));
  assert.equal(models.filter(item => /Attack on Titan|Eren|Armin|Reiner/.test(item.label)).length, 1);
  models.find(item => item.label === 'Naruto y Sasuke').click(); assert.ok(calls.includes('naruto'));
  vm.runInContext(`combat.titans = new (require('./titan-engine').TitanEngine)('attackontitan', () => .5);
    model = 'attackontitan'; showMenu({sender:{}});`, ctx);
  assert.equal(template[0].label, 'Titanes y movimiento');
  const titanControls = template[0].submenu;
  titanControls[0].submenu[2].click(); assert.equal(vm.runInContext('combat.titans.motion', ctx), 'run');
  titanControls[1].click(); assert.ok(vm.runInContext('combat.titans.actors.every(a=>a.transition.to)', ctx));
  titanControls[4].submenu[1].click(); assert.equal(vm.runInContext('combat.titans.actors[1].transition.to', ctx), false);
  titanControls.at(-1).click({checked:true}); assert.equal(vm.runInContext('combat.titans.automatic', ctx), true);
  assert.ok(!template.some(item=>item.label === 'Acariciar'));
  vm.runInContext(`combat.ninja = new (require('./ninja-engine').NinjaEngine)(() => .5);
    combat.transformNinja = id => { combat.ninja.setForm(id); };
    model = 'naruto'; showMenu({sender:{}});`, ctx);
  assert.equal(template[0].label, 'Combate ninja');
  const ninjaControls = template[0].submenu;
  ninjaControls[1].click(); assert.equal(vm.runInContext('combat.ninja.mode', ctx), 'roam');
  assert.equal(ninjaControls[2].submenu.length, 7);
  ninjaControls[2].submenu[6].click(); assert.equal(vm.runInContext('combat.ninja.form', ctx), 'sixpaths-rinnegan');
  ninjaControls[3].click({checked:true}); assert.equal(vm.runInContext('combat.ninja.automatic', ctx), true);
  assert.equal(vm.runInContext('combat.ninja.form', ctx), 'child');
  assert.ok(!ninjaControls[5].submenu.some(item=>item.label.includes('Amenotejikara')));
  vm.runInContext("combat.ninja.setForm('sixpaths-rinnegan');showMenu({sender:{}});",ctx);
  const finalControls=template[0].submenu;
  finalControls[5].submenu.find(item=>item.label.includes('Amenotejikara')).click();
  assert.equal(vm.runInContext('combat.ninja.forcedAttack.attack',ctx),'amenotejikara');
  finalControls[4].submenu.find(item=>item.label==='Forma Kyubi').click();
  assert.equal(vm.runInContext('combat.ninja.forcedAttack.attack',ctx),'kyubi');
});
