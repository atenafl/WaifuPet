const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { BattleEngine } = require('../battle-engine');

function harness() {
  const actions = [];
  class Window {
    constructor() { this.visible = false; this.destroyed = false; this.events = {}; this.frames = [];
      this.webContents = { send: (_name, data) => this.frames.push(data) }; }
    setIgnoreMouseEvents(value) { this.ignore = value; }
    setAlwaysOnTop() {}
    loadFile() { return Promise.resolve(); }
    on(name, fn) { this.events[name] = fn; }
    isDestroyed() { return this.destroyed; }
    destroy() { this.destroyed = true; this.events.closed(); }
    isVisible() { return this.visible; }
    showInactive() { this.visible = true; }
    hide() { this.visible = false; }
    setBounds(b) { this.bounds = b; }
  }
  const ctx = { module: { exports: {} }, __dirname: path.dirname(__dirname), Date,
    setInterval: () => 1, clearInterval: () => {},
    require: (name) => name === 'electron' ? { BrowserWindow: Window } : name.startsWith('./') ? require(path.join(__dirname, '..', name)) : require(name) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'combat-controller.js'), 'utf8'), ctx);
  const controller = new ctx.module.exports.CombatController({
    displays: () => [{ id: 1, enabled: true, workArea: { x: 0, y: 0, width: 1920, height: 1080 } }],
    send: (action) => actions.push(action), sound: () => true });
  return { controller, actions };
}
test('Pause freezes flight; switching models destroys fighter and beam windows', async () => {
  const { controller: c } = harness();
  c.setModel('dragonball'); await Promise.resolve(); c.tick(.03);
  assert.equal(c.windows.size, 3);
  const x = c.engine.fighters[0].x;
  c.paused = true; c.tick(.03); assert.equal(c.engine.fighters[0].x, x);
  c.paused = false; c.engine.phase = 'blast'; c.engine.age = 0; c.tick(.03);
  assert.ok(c.windows.has('beam'));
  const old = [...c.windows.values()]; c.setModel('saitama');
  assert.equal(c.windows.size, 0); assert.ok(old.every((w) => w.destroyed));
});
test('Titan characters use independent grounded windows, freeze on pause and clean up when switching models', async () => {
  const { controller: c } = harness(); c.setModel('attackontitan'); await Promise.resolve(); c.tick(.03);
  assert.equal(c.windows.size, 3);
  assert.ok(c.titans.actors.every(a => a.displayId === 1));
  const positions = c.titans.actors.map(a => a.x);
  c.paused = true; c.tick(.03); assert.deepEqual(c.titans.actors.map(a => a.x), positions);
  const old = [...c.windows.values()]; c.setModel('eren');
  assert.ok(old.every(w => w.destroyed)); assert.equal(c.windows.size, 1);
  c.setModel('webillo'); assert.equal(c.windows.size, 0);
});

test('Monster approaches, requests one punch and is defeated by one impact', async () => {
  const { controller: c, actions } = harness();
  c.setModel('saitama');
  c.hero = { x: 500, ground: 1050, scale: 1, dir: 1, state: 'idle', drag: false, air: false };
  c.spawnMonster(); c.tick(.03); await Promise.resolve();
  assert.ok(c.monster);
  for (let i = 0; i < 100; i++) c.tick(.03);
  assert.equal(actions.filter((a) => a.startsWith('encounter-punch:')).length, 1);
  c.hitMonster(); const vx = c.monster.vx; c.hitMonster(); assert.equal(c.monster.vx, vx);
  for (let i = 0; i < 50; i++) c.tick(.03);
  assert.equal(c.monster, null); assert.ok(actions.includes('encounter-end'));
});
test('Dragging cancels encounters and cannot leave an orphan monster', () => {
  const { controller: c, actions } = harness(); c.setModel('saitama');
  c.hero = { x: 500, ground: 1050, scale: 1, dir: 1, state: 'idle' };
  c.spawnMonster(); c.tick(.03); c.hero.drag = true; c.tick(.03);
  assert.equal(c.monster, null); assert.ok(actions.includes('encounter-end'));
});

test('Transformations wait for both atlases before changing form and only the latest selection wins', async () => {
  const { controller: c } = harness();
  c.setModel('dragonball'); await Promise.resolve(); c.tick(.03);
  const pending = [];
  for (const kind of ['goku', 'vegeta']) c.windows.get(kind).webContents.executeJavaScript = () => new Promise((resolve) => pending.push(resolve));
  const first = c.transform('ss2');
  const second = c.transform('ui-ego');
  const time = c.engine.time; c.tick(.05);
  assert.equal(c.engine.time, time); assert.equal(c.engine.form, 'base');
  const landmarks = { punch: { x: 145, y: -155 }, kick: { x: 150, y: -205 }, energy: { x: 110, y: -160 } };
  pending[0](landmarks); pending[1](landmarks); await first;
  assert.equal(c.engine.form, 'base'); assert.equal(c.loadingForm, true);
  pending[2](landmarks); pending[3](landmarks); await second;
  assert.equal(c.engine.form, 'ui-ego'); assert.equal(c.loadingForm, false);
  assert.equal(c.engine.landmarks.goku, landmarks);
});

test('Changing models while an atlas loads cannot revive a fighter or change the new engine', async () => {
  const { controller: c } = harness();
  c.setModel('dragonball'); await Promise.resolve(); c.tick(.03);
  const pending = [];
  for (const kind of ['goku', 'vegeta']) c.windows.get(kind).webContents.executeJavaScript = () => new Promise((resolve) => pending.push(resolve));
  const loading = c.transform('god'); c.setModel('saitama');
  pending.forEach((resolve) => resolve(true)); await loading;
  assert.equal(c.windows.size, 0); assert.equal(c.model, 'saitama');
  assert.equal(c.engine.form, 'base'); assert.equal(c.loadingForm, false);
});

test('Changing the enemy during fusion loading uses the latest opponent and unfusing cancels the ritual', async () => {
  const { controller: c } = harness();
  c.setModel('dragonball'); await Promise.resolve(); c.tick(.03);
  const pending = [];
  for (const kind of ['goku', 'vegeta']) c.windows.get(kind).webContents.executeJavaScript = () => new Promise((resolve) => pending.push(resolve));
  const first = c.fuse('gogeta-blue'), second = c.setOpponent('broly');
  const packet = { combat: { punch: { x: 145, y: -155 }, kick: { x: 150, y: -205 }, energy: { x: 110, y: -160 } },
    ritual: {x:125,y:-140} };
  pending[0](packet); pending[1](packet); await first;
  assert.equal(c.engine.fusionPlan, null);
  pending[2](packet); pending[3](packet); await second;
  assert.equal(c.engine.opponent, 'broly'); assert.equal(c.engine.fusionPlan.mode.id, 'gogeta-blue');
  await c.unfuse(); assert.equal(c.engine.fusionPlan, null); assert.equal(c.engine.fusion, null);
});
