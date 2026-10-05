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
      if (['goku', 'vegeta', 'beam'].every((kind) => c.windows.get(kind)?.combatReady) && c.engine.initialized) break;
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
    assert.equal(c.windows.size, 3); assert.ok(c.windows.has('eren') && c.windows.has('armin') && c.windows.has('reiner'));
    await win.webContents.executeJavaScript("doAction('model:naruto')");
    for (let n = 0; n < 100 && !['naruto', 'sasuke', 'ninja-effects'].every(id => c.windows.get(id)?.combatReady); n++) await wait(100);
    clearInterval(c.timer);
    assert.equal(c.windows.size, 3);
    for (const form of require('../ninjas').forms) {
      await c.transformNinja(form.id); assert.equal(c.ninja.form, form.id);
      c.tick(.03); await wait(60);
      for (const kind of ['naruto', 'sasuke']) {
        const actual = await c.windows.get(kind).webContents.executeJavaScript('({form:frame.form,kind:frame.kind,pixels:canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0)})');
        assert.equal(actual.form, form.id); assert.equal(actual.kind, 'ninja-pet'); assert.ok(actual.pixels);
      }
    }
    await c.transformNinja('shippuden');
    const projectiles = new Set(), charged = new Set(); let clash = false;
    for (let n = 0; n < 16000 && (projectiles.size < 3 || charged.size < 2 || !clash); n++) {
      c.tick(1/30);
      if (c.ninja.phase === 'charge' && !charged.has(c.ninja.actors[c.ninja.attacker].character)) {
        const actor=c.ninja.actors[c.ninja.attacker]; await wait(30);
        assert.ok(await c.windows.get(actor.character).webContents.executeJavaScript('Number.isFinite(AnimeArt.ninjaPoint(frame.form,frame.character,frame.pose).x)'));
        charged.add(actor.character);
      }
      if (c.ninja.phase === 'clash' && c.ninja.landed) clash = true;
      if (c.ninja.projectile && !projectiles.has(c.ninja.projectile.attack)) {
        await wait(30);
        const actual=await c.windows.get('ninja-effects').webContents.executeJavaScript('({attack:frame.shots[0]?.attack,pixels:canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0)})');
        assert.ok(actual.pixels); projectiles.add(actual.attack);
      }
    }
    assert.equal(charged.size, 2); assert.equal(projectiles.size, 3); assert.ok(clash);
    await c.transformNinja('sixpaths-rinnegan');
    for(const [character,attack] of [['sasuke','amaterasu'],['sasuke','amenotejikara'],['sasuke','susanoo'],['naruto','kyubi']]){
      c.ninja.requestAttack(character,attack);let visible=false;
      for(let i=0;i<140;i++){
        c.tick(1/30);
        if(attack==='amaterasu'&&c.ninja.blackFire||attack==='amenotejikara'&&c.ninja.actors.some(a=>a.swapFlash>0)||c.ninja.actors.some(a=>a.avatar===attack)){
          for(let step=0;step<4;step++)c.tick(1/30);
          await wait(50);
          const w=c.windows.get(attack==='amaterasu'?'ninja-effects':character);
          assert.ok(await w.webContents.executeJavaScript('canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0)'));
          visible=true;break;
        }
      }
      assert.ok(visible,attack);
    }
    const ninjaPositions=c.ninja.actors.map(a=>a.x); c.paused=true; c.tick(.04);
    assert.deepEqual(c.ninja.actors.map(a=>a.x),ninjaPositions); c.paused=false;
    c.ninja.setMode('roam'); c.tick(.03); assert.equal(c.ninja.projectile,null); assert.equal(c.windows.get('ninja-effects').isVisible(),false);
    await win.webContents.executeJavaScript("doAction('model:sololeveling')");
    for(let i=0;i<100&&!Array.from(c.windows.values()).every(w=>w.combatReady);i++)await wait(100);
    clearInterval(c.timer);assert.equal(c.windows.size,4);await c.selectCompanion('monarch');
    c.tick(.03);c.companions.summon();for(let i=0;i<100;i++)c.tick(1/30);await wait(70);
    assert.ok(c.companions.actors.every(a=>a.active));
    for(const w of c.windows.values())assert.ok(await w.webContents.executeJavaScript('canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0)'));
    let companionMenus=0;const mouseStates=[];
    const heroWindow=c.windows.get('companion-hero');
    const menuHandler=event=>{if(event.sender===heroWindow.webContents)companionMenus++;};
    const ignoreHandler=(event,ignored)=>{if(event.sender===heroWindow.webContents)mouseStates.push(ignored);};
    ipcMain.on('pet-menu',menuHandler);ipcMain.on('battle-ignore',ignoreHandler);
    const clicked=await heroWindow.webContents.executeJavaScript(`(()=>{
      const ratio=devicePixelRatio||1,pixels=g.getImageData(0,0,canvas.width,canvas.height).data;
      let point=null;
      for(let y=Math.floor((frame.foot-frame.height*.8)*ratio);y<(frame.foot-frame.height*.3)*ratio&&!point;y++){
        for(let x=Math.floor((frame.originX-frame.height*.12)*ratio);x<(frame.originX+frame.height*.12)*ratio;x++){
          if(x>=0&&y>=0&&pixels[(y*canvas.width+x)*4+3]>200){point={clientX:x/ratio,clientY:y/ratio};break;}
        }
      }
      if(!point)return false;
      const inside=hit(point),outside=hit({clientX:1,clientY:1});
      window.dispatchEvent(new MouseEvent('mousemove',point));
      document.dispatchEvent(new MouseEvent('contextmenu',{...point,button:2,bubbles:true,cancelable:true}));
      window.dispatchEvent(new MouseEvent('mousemove',{clientX:1,clientY:1}));
      return inside&&!outside;
    })()`);
    await wait(50);assert.ok(clicked);assert.equal(companionMenus,1);assert.deepEqual(mouseStates,[false,true]);
    ipcMain.removeListener('pet-menu',menuHandler);ipcMain.removeListener('battle-ignore',ignoreHandler);
    const companionPositions=c.companions.actors.map(a=>a.x);c.paused=true;c.tick(.04);
    assert.deepEqual(c.companions.actors.map(a=>a.x),companionPositions);c.paused=false;
    const shadowWindows=[...c.windows.values()];
    await win.webContents.executeJavaScript("doAction('model:jojo')");
    for(let i=0;i<100&&!Array.from(c.windows.values()).every(w=>w.combatReady);i++)await wait(100);
    clearInterval(c.timer);assert.equal(c.windows.size,2);assert.ok(shadowWindows.every(w=>w.isDestroyed()));
    for(const character of [...require('../companions').jojo,require('../companions').olderJoseph]){
      await c.selectCompanion(character.id);c.tick(.03);c.companions.summon();for(let i=0;i<100;i++)c.tick(1/30);await wait(70);
      const data=await c.windows.get('companion-hero').webContents.executeJavaScript('({selection:frame.selection,pixels:canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0)})');
      assert.equal(data.selection,character.id);assert.ok(data.pixels);
      if(require('../companions').stands.some(s=>s.id===character.stand)){
        assert.equal(c.companions.actors[1].character,character.stand);assert.ok(c.companions.actors[1].active,JSON.stringify({character:character.id,phase:c.companions.phase,age:c.companions.age,summonRequested:c.companions.summonRequested,companionAge:c.companions.companionAge,stand:c.companions.actors[1]}));
        assert.ok(await c.windows.get('companion-stand').webContents.executeJavaScript('canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0)'));
      }else assert.equal(c.companions.actors[1].active,false);
    }
    await win.webContents.executeJavaScript("doAction('model:webillo')"); await wait(200);
    assert.equal(c.windows.size, 0);
    assert.equal(errors.length, 0, errors.join('\n'));
    process.stdout.write('PASS: Saitama, Dragon Ball, combined Attack on Titan, seven Naruto/Sasuke pairs and techniques, Solo Leveling with three shadows, all eight JoJo protagonists and stands, pause and cleanup; no renderer errors.\n');
  } catch (e) { process.stderr.write(e.stack + '\n'); resultCode = 1; }
  if (c) c.close(); if (win) win.destroy(); app.exit(resultCode);
});
