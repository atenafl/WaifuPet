const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
app.disableHardwareAcceleration();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  let win, c;
  let resultCode = 0;
  const errors = [], hits = [];
  class HiddenWindow extends BrowserWindow {
    constructor(opts) {
      super({ ...opts, show: false, webPreferences: { ...opts.webPreferences, offscreen: true, backgroundThrottling: false } });
      this.qaVisible = false;
      this.webContents.on('console-message', (_e, level, msg) => { if (level >= 3) errors.push(msg); });
    }
    showInactive() { this.qaVisible = true; }
    isVisible() { return this.qaVisible; }
    hide() { this.qaVisible = false; }
  }
  try {
    win = new HiddenWindow({ width: 340, height: 380,
      webPreferences: { preload: path.join(__dirname, 'renderer-preload.cjs'), contextIsolation: true } });
    const screens = [{ id: 1, enabled: true, workArea: { x: 0, y: 0, width: 1920, height: 1080 } }];
    const moduleCtx = { module: { exports: {} }, __dirname: path.dirname(__dirname), Date, setInterval, clearInterval,
      require: (name) => name === 'electron' ? { BrowserWindow: HiddenWindow } :
        name.startsWith('./') ? require(path.join(__dirname, '..', name)) : require(name) };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'combat-controller.js'), 'utf8'), moduleCtx);
    c = new moduleCtx.module.exports.CombatController({ displays: () => screens,
      send: (action) => win.webContents.send('qa-action', action), sound: () => false });
    ipcMain.on('qa-model', (_e, id) => c.setModel(id));
    ipcMain.on('qa-hero', (_e, hero) => { c.hero = hero; });
    ipcMain.on('qa-hit', () => { hits.push(Date.now()); c.hitMonster(); });
    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    const loaded = await win.webContents.executeJavaScript('AnimeArt.ready');
    assert.ok(loaded.every(Boolean), 'all generated atlases load: ' + JSON.stringify(loaded) + '\n' + errors.join('\n'));
    await wait(400);
    await win.webContents.executeJavaScript("doAction('model:saitama')");
    await wait(400);
    assert.ok(c.hero && c.hero.scale > 0, 'Saitama reports actual renderer geometry');
    c.spawnMonster();
    for (let i = 0; i < 60 && !hits.length; i++) await wait(100);
    assert.equal(hits.length, 1, 'actual renderer emits exactly one monster impact');
    await wait(1400); assert.equal(c.monster, null);
    await win.webContents.executeJavaScript("doAction('model:dragonball')");
    for (let i = 0; i < 60; i++) {
      if (['goku', 'vegeta'].every((kind) => c.windows.get(kind)?.combatReady)) break;
      await wait(100);
    }
    assert.ok(c.engine.initialized);
    for (const kind of ['goku', 'vegeta']) {
      const fighter = c.windows.get(kind);
      assert.ok(fighter && fighter.combatReady);
      assert.ok((await fighter.webContents.executeJavaScript('AnimeArt.ready')).every(Boolean));
      assert.ok(await fighter.webContents.executeJavaScript('frame !== null && canvas.width > 0'));
    }
    for (const form of require('../transformations').levels.slice(1)) {
      await c.transform(form.id);
      assert.equal(c.engine.form, form.id);
      assert.ok(c.engine.landmarks.goku.punch.x > 0 && c.engine.landmarks.vegeta.kick.x > 0);
      await wait(100);
      for (const kind of ['goku', 'vegeta']) assert.equal(await c.windows.get(kind).webContents.executeJavaScript('frame.form'), form.id);
    }
    const energySeen = new Set();
    for (let n = 0; n < 12000 && energySeen.size < 3; n++) {
      const events = c.engine.update(1 / 30, screens, .88 * c.scale);
      if (events.includes('charge')) {
        c.tick(1 / 30); await wait(30);
        const actor = c.windows.get(c.engine.fighters[c.engine.attacker].kind);
        assert.ok(await actor.webContents.executeJavaScript('Number.isFinite(AnimeArt.chargePoint(frame).x)'));
      }
      if (c.engine.phase === 'blast' && c.engine.beam?.progress > .2 && !energySeen.has(c.engine.energyAttack)) {
        c.drawBeam(.88 * c.scale); await wait(30);
        const actual = await c.windows.get('beam').webContents.executeJavaScript('({attack:frame.attack,shots:frame.shots.length,pixels:canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0)})');
        assert.equal(actual.attack, c.engine.energyAttack); assert.ok(actual.shots > 0 && actual.pixels);
        energySeen.add(actual.attack);
      }
    }
    assert.deepEqual([...energySeen].sort(), ['final-flash', 'galick', 'kamehameha']);
    c.engine.setMode('roam'); await wait(150);
    for (const kind of ['goku', 'vegeta']) assert.equal(await c.windows.get(kind).webContents.executeJavaScript('frame.pose'), 'fly');
    c.engine.setMode('fight');
    for (const mode of require('../fusions').modes) {
      await c.fuse(mode.id);
      assert.ok(c.engine.fusionPlan);
      for (let n = 0; n < 1000 && !c.engine.fusion; n++) c.tick(1 / 30);
      assert.equal(c.engine.fusion?.id, mode.id);
      c.tick(1 / 30); await wait(100);
      assert.equal(await c.windows.get('goku').webContents.executeJavaScript('frame.character'), mode.hero);
      assert.equal(await c.windows.get('vegeta').webContents.executeJavaScript('frame.character'), 'buu');
      await c.setOpponent('broly'); c.tick(1 / 30); await wait(80);
      assert.equal(await c.windows.get('vegeta').webContents.executeJavaScript('frame.character'), 'broly');
      if (mode.id === require('../fusions').modes[0].id) {
        const brolySeen = new Set();
        for (let n = 0; n < 12000 && brolySeen.size < 2; n++) {
          c.engine.update(1 / 30, screens, .88 * c.scale);
          if (c.engine.phase === 'blast' && c.engine.attacker === 1 && c.engine.age > .35 && !brolySeen.has(c.engine.energyAttack)) {
            c.drawBeam(.88 * c.scale); await wait(30);
            const actual = await c.windows.get('beam').webContents.executeJavaScript('({attack:frame.attack,count:frame.shots.length,valid:frame.shots.every(s=>!s.target||Number.isFinite(s.target.x))})');
            assert.equal(actual.attack, c.engine.energyAttack); assert.ok(actual.valid);
            if (actual.attack === 'broly-barrage') assert.ok(actual.count > 1);
            brolySeen.add(actual.attack);
          }
        }
        assert.deepEqual([...brolySeen].sort(), ['broly-barrage', 'broly-cannon']);
      }
      c.engine.setMode('roam'); c.tick(1 / 30); await wait(80);
      assert.equal(await c.windows.get('goku').webContents.executeJavaScript('frame.pose'), 'fly');
      await c.unfuse(); c.tick(1 / 30); await wait(80);
      assert.equal(c.engine.fusion, null);
      assert.ok(!await c.windows.get('goku').webContents.executeJavaScript('frame.character'));
      c.engine.setMode('fight'); await c.setOpponent('buu');
    }
    await win.webContents.executeJavaScript("doAction('model:attackontitan')");
    for (let n = 0; n < 100 && !['eren', 'armin', 'reiner'].every(id => c.windows.get(id)?.combatReady); n++) await wait(100);
    assert.equal(c.windows.size, 3);
    assert.ok(['eren', 'armin', 'reiner'].every(id => c.windows.get(id)?.combatReady));
    c.titans.setMotion('run'); c.titans.transform('all', true);
    for (let n = 0; n < 100; n++) c.tick(1 / 30);
    await wait(100);
    for (const a of c.titans.actors) {
      assert.ok(a.titan && a.height > 300);
      const actual = await c.windows.get(a.character).webContents.executeJavaScript('({kind:frame.kind,titan:frame.titan,pose:frame.pose,pixels:canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0)})');
      assert.equal(actual.kind, 'titan-pet'); assert.ok(actual.titan && actual.pixels);
    }
    assert.ok(c.titans.actors[1].height > c.titans.actors[2].height);
    const positions = c.titans.actors.map(a => a.x); c.paused = true; c.tick(.04);
    assert.deepEqual(c.titans.actors.map(a => a.x), positions); c.paused = false;
    c.titans.transform('armin', false); for (let n = 0; n < 100; n++) c.tick(1 / 30);
    assert.equal(c.titans.actors[1].titan, false); assert.equal(c.titans.actors[0].titan, true);
    await win.webContents.executeJavaScript("doAction('model:eren')"); await wait(150);
    assert.equal(c.windows.size, 1); assert.ok(c.windows.has('eren'));
    await win.webContents.executeJavaScript("doAction('model:webillo')"); await wait(200);
    assert.equal(c.windows.size, 0);
    assert.equal(errors.length, 0, errors.join('\n'));
    process.stdout.write('PASS: Saitama, eight transformation pairs, four fusion rituals, five energy attacks, three Attack on Titan characters, individual/combined transformations, grounded running, pause and cleanup; no renderer errors.\n');
  } catch (e) { process.stderr.write(e.stack + '\n'); resultCode = 1; }
  if (c) c.close(); if (win) win.destroy(); app.exit(resultCode);
});
