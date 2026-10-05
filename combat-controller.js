'use strict';
const { BrowserWindow } = require('electron');
const path = require('path');
const energyAttacks = require('./energy-attacks');
const { BattleEngine } = require('./battle-engine');
const geometry = require('./animation-geometry');
const transformations = require('./transformations');
const fusions = require('./fusions');
const titans = require('./titans');
const { TitanEngine } = require('./titan-engine');
const ninjas = require('./ninjas');
const { NinjaEngine } = require('./ninja-engine');

class CombatController {
  constructor({ displays, send, sound }) {
    this.displays = displays; this.send = send; this.sound = sound;
    this.windows = new Map(); this.model = 'webillo'; this.paused = false;
    this.scale = 1; this.top = true; this.hero = null; this.monster = null;
    this.countdown = 22; this.pendingMonster = false;
    this.engine = new BattleEngine();
    this.last = Date.now();
    this.timer = setInterval(() => {
      const now = Date.now(), dt = Math.min(.05, (now - this.last) / 1000);
      this.last = now; this.tick(dt);
    }, 1000 / 30);
  }
  create(kind) {
    if (this.windows.has(kind)) return this.windows.get(kind);
    const w = new BrowserWindow({ width: 420, height: 420, transparent: true, frame: false,
      show: false, resizable: false, movable: false, focusable: false, skipTaskbar: true,
      hasShadow: false, alwaysOnTop: this.top,
      webPreferences: { preload: path.join(__dirname, 'combat-preload.js'), contextIsolation: true, nodeIntegration: false } });
    w.setIgnoreMouseEvents(true, { forward: true }); w.setAlwaysOnTop(this.top, 'screen-saver');
    w.combatReady = false;
    w.loadFile(path.join(__dirname, 'combat.html'), { query: { kind } }).then(async () => {
      if (!w.isDestroyed() && w.webContents.executeJavaScript) {
        const loaded = await w.webContents.executeJavaScript('AnimeArt.ready');
        if (titans.characters.some(c => c.id === kind) && !loaded.every(Boolean)) throw new Error('Titan animation assets are incomplete');
        if (ninjas.characters.includes(kind) && !loaded.every(Boolean)) throw new Error('Ninja animation assets are incomplete');
      }
      if (!w.isDestroyed()) w.combatReady = true;
    }).catch(() => {});
    w.on('closed', () => this.windows.delete(kind)); this.windows.set(kind, w); return w;
  }
  setModel(model) {
    if (titans.characters.some(c => c.id === model)) model = 'attackontitan';
    if (this.model === model) return;
    this.model = model; this.monster = null; this.hero = null; this.countdown = 22; this.pendingMonster = false;
    this.transformRevision = (this.transformRevision || 0) + 1; this.loadingForm = false; this.pendingFusion = null;
    for (const w of this.windows.values()) if (!w.isDestroyed()) w.destroy();
    this.windows.clear();
    if (model === 'dragonball') {
      this.engine = new BattleEngine(); this.create('goku'); this.create('vegeta'); this.create('beam');
    }
    if (model === 'naruto') {
      this.ninja = new NinjaEngine(); this.create('naruto'); this.create('sasuke'); this.create('ninja-effects');
    }
    if (titans.models.includes(model)) {
      this.titans = new TitanEngine(model);
      for (const actor of this.titans.actors) if (actor.active) this.create(actor.character);
    }
  }
  setTop(top) {
    this.top = top;
    for (const w of this.windows.values()) w.setAlwaysOnTop(top, 'screen-saver');
  }
  async transformNinja(id) {
    if (this.model !== 'naruto' || !ninjas.forms.some(f => f.id === id)) return;
    const revision = this.transformRevision = (this.transformRevision || 0) + 1, engine = this.ninja;
    this.loadingForm = true;
    try {
      const loaded = await Promise.all(ninjas.characters.map(async character => {
        const w = this.windows.get(character);
        if (!w || !w.combatReady || w.isDestroyed()) return null;
        if (!w.webContents.executeJavaScript) return { punch: { x: .46, y: -.56 }, kick: { x: .55, y: -.6 }, energy: { x: .5, y: -.56 } };
        return w.webContents.executeJavaScript('AnimeArt.loadNinjaForm(' + JSON.stringify(id) +
          ').then(ok=>ok?AnimeArt.ninjaLandmarks(' + JSON.stringify(id) + ',' + JSON.stringify(character) + '):null)');
      }));
      if (revision !== this.transformRevision || engine !== this.ninja || this.model !== 'naruto') return;
      if (loaded.every(Boolean)) engine.setForm(id, { naruto: loaded[0], sasuke: loaded[1] });
      else { engine.automatic = false; engine.requestedForm = null; }
    } catch (error) {
      if (engine === this.ninja) { engine.automatic = false; engine.requestedForm = null; }
      console.error('Could not load ninja form:', error.message);
    } finally { if (revision === this.transformRevision) this.loadingForm = false; }
  }
  async transform(id) {
    if (!transformations.levels.some((level) => level.id === id) || this.model !== 'dragonball') return;
    const revision = this.transformRevision = (this.transformRevision || 0) + 1;
    this.pendingFusion = null;
    const engine = this.engine;
    this.loadingForm = true;
    try {
      const loaded = await Promise.all(['goku', 'vegeta'].map(async (kind) => {
        const w = this.windows.get(kind);
        if (!w || !w.combatReady || w.isDestroyed()) return false;
        return id === 'base' || await w.webContents.executeJavaScript('AnimeArt.load(' + JSON.stringify(id) +
          ').then(ok => ok ? AnimeArt.landmarks(' + JSON.stringify(id) + ', ' + JSON.stringify(kind) + ') : null)');
      }));
      if (revision !== this.transformRevision || engine !== this.engine || this.model !== 'dragonball') return;
      if (loaded.every(Boolean)) this.engine.setForm(id, id === 'base' ? null : { goku: loaded[0], vegeta: loaded[1] });
      else { this.engine.requestedForm = null; this.engine.automatic = false; }
    } catch (error) {
      if (engine === this.engine) { engine.requestedForm = null; engine.automatic = false; }
      console.error('Could not load transformation:', error.message);
    } finally { if (revision === this.transformRevision) this.loadingForm = false; }
  }
  async fuse(id) {
    const mode = fusions.get(id), opponent = fusions.enemy(this.engine.opponent);
    if (!mode || !opponent || this.model !== 'dragonball') return;
    const revision = this.transformRevision = (this.transformRevision || 0) + 1, engine = this.engine;
    this.pendingFusion = id;
    this.loadingForm = true;
    try {
      const loaded = await Promise.all(['goku', 'vegeta'].map(async (kind) => {
        const w = this.windows.get(kind);
        if (!w || !w.combatReady || w.isDestroyed()) return null;
        const atlas = kind === 'goku' ? mode.atlas : opponent.atlas, offset = kind === 'goku' ? mode.offset : opponent.offset;
        return w.webContents.executeJavaScript('Promise.all([AnimeArt.load("fusion-ritual"),AnimeArt.load(' +
          JSON.stringify(atlas) + ')]).then(ok=>ok.every(Boolean)?({combat:AnimeArt.landmarks(' + JSON.stringify(atlas) + ',' + offset +
          '),ritual:AnimeArt.ritualContact(' + JSON.stringify(kind) + ')}):null)');
      }));
      if (revision === this.transformRevision && this.model === 'dragonball' && engine === this.engine && loaded.every(Boolean)) {
        engine.startFusion(id, opponent.id, { goku: loaded[0].combat, vegeta: loaded[1].combat,
          ritual: { goku: loaded[0].ritual, vegeta: loaded[1].ritual } });
      }
    } catch (error) { console.error('Could not load fusion:', error.message); }
    finally { if (revision === this.transformRevision) { this.loadingForm = false; this.pendingFusion = null; } }
  }
  unfuse() { this.engine.automatic = false; return this.transform('base'); }
  async setOpponent(id) {
    const opponent = fusions.enemy(id);
    if (!opponent || this.model !== 'dragonball') return;
    if (this.loadingForm && this.pendingFusion) { this.engine.opponent = id; return this.fuse(this.pendingFusion); }
    if (!this.engine.fusion && !this.engine.fusionPlan && !this.loadingForm) { this.engine.setOpponent(id); return; }
    const mode = this.engine.fusion || this.engine.fusionPlan?.mode;
    if (!mode) { this.engine.opponent = id; return; }
    const revision = this.transformRevision = (this.transformRevision || 0) + 1, engine = this.engine;
    this.loadingForm = true;
    try {
      const w = this.windows.get('vegeta');
      if (!w || !w.combatReady || w.isDestroyed()) return;
      const landmarks = await w.webContents.executeJavaScript('AnimeArt.load(' + JSON.stringify(opponent.atlas) +
        ').then(ok=>ok?AnimeArt.landmarks(' + JSON.stringify(opponent.atlas) + ',' + opponent.offset + '):null)');
      if (revision === this.transformRevision && engine === this.engine && this.model === 'dragonball' && landmarks) engine.setOpponent(id, landmarks);
    } catch (error) { console.error('Could not load opponent:', error.message); }
    finally { if (revision === this.transformRevision) this.loadingForm = false; }
  }
  ignore(sender, value) {
    for (const w of this.windows.values()) if (w.webContents === sender) w.setIgnoreMouseEvents(!!value, { forward: true });
  }
  draw(kind, data, x, y, scale) {
    const w = this.create(kind);
    if (!w.combatReady || w.isDestroyed()) return;
    const size = Math.round(420 * scale);
    w.setBounds({ x: Math.round(x - size / 2), y: Math.round(y - size / 2), width: size, height: size });
    w.webContents.send('battle-frame', { ...data, scale });
    if (!w.isVisible()) w.showInactive();
  }
  drawBeam(scale) {
    const w = this.windows.get('beam');
    if (this.engine.mode !== 'fight' || this.engine.phase !== 'blast' || !this.engine.beam) {
      if (w && !w.isDestroyed()) w.hide();
      return;
    }
    const from = this.engine.fighters[this.engine.attacker];
    const shot = this.engine.beam;
    const start = this.engine.actionPoint(from, scale);
    const end = shot.end;
    const pad = (energyAttacks.get(shot.attack).impact * 1.4 + 55) * scale;
    const points = [start, end, ...Object.values(shot.impactPoints)];
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const b = { x: Math.floor(Math.min(...xs) - pad), y: Math.floor(Math.min(...ys) - pad),
      width: Math.ceil(Math.max(...xs) - Math.min(...xs) + pad * 2), height: Math.ceil(Math.max(...ys) - Math.min(...ys) + pad * 2) };
    const beam = this.create('beam');
    if (!beam.combatReady) return;
    beam.setBounds(b);
    beam.webContents.send('battle-frame', { kind: 'beam', scale, time: this.engine.time,
      start: { x: start.x - b.x, y: start.y - b.y }, target: { x: end.x - b.x, y: end.y - b.y },
      attack: shot.attack, shots: shot.shots.map(s => ({ ...s,
        target: s.target ? { x: s.target.x - b.x, y: s.target.y - b.y } : null })),
      landed: shot.landed, color: from.color || transformations.color(this.engine.form, from.kind) });
    if (!beam.isVisible()) beam.showInactive();
  }
  spawnMonster() { this.pendingMonster = true; }
  hitMonster() {
    if (!this.monster || this.monster.hitAge !== undefined || !this.monster.requested || !this.hero ||
      Math.abs(this.monster.x - this.hero.x) > (geometry.monsterReach + 35) * this.monster.scale) return;
    const m = this.monster;
    m.hitAge = 0; m.hitStop = .075; m.vx = this.hero.dir * 900 * m.scale; m.vy = -440 * m.scale;
  }
  cancelMonster() {
    this.monster = null; this.pendingMonster = false;
    const w = this.windows.get('monster'); if (w && !w.isDestroyed()) w.hide();
    this.send('encounter-end');
  }
  tick(dt) {
    if (this.paused) return;
    if (this.model === 'naruto') {
      if (this.loadingForm || !['naruto', 'sasuke', 'ninja-effects'].every(kind => this.windows.get(kind)?.combatReady)) return;
      if (!this.ninja.landmarks) { this.transformNinja(this.ninja.form); return; }
      const events = this.ninja.update(dt, this.displays(), this.scale);
      for (const a of this.ninja.actors) {
        if (a.displayId === null) continue;
        const w = this.windows.get(a.character), pad = Math.round(35 * this.scale);
        const frame = ninjas.frame(a);
        const bounds = this.ninja.landmarks[a.character].frames?.[frame.atlas+':'+(frame.row*4+frame.column)] || {left:-1,right:1,top:-1.3};
        const left = Math.min(a.dir > 0 ? bounds.left : -bounds.right, -.85) * a.height - pad;
        const right = Math.max(a.dir > 0 ? bounds.right : -bounds.left, .85) * a.height + pad;
        const width = Math.ceil(right - left), height = Math.ceil(Math.max(1.35, -bounds.top) * a.height + pad * 2);
        w.setBounds({ x: Math.round(a.x + left), y: Math.round(a.y - height + pad), width, height });
        w.webContents.send('battle-frame', { ...a, originX: -left, foot: height - pad, phase: this.ninja.phase });
        if (!w.isVisible()) w.showInactive();
      }
      const effect = this.windows.get('ninja-effects'), shots = this.ninja.projectiles.filter(p=>!p.hit&&p.age>=0), fire=this.ninja.blackFire;
      const points=fire?[...shots,fire]:shots;
      if (points.length) {
        const radius = Math.round(110 * this.scale), x=Math.floor(Math.min(...points.map(p=>p.x))-radius), y=Math.floor(Math.min(...points.map(p=>p.y))-radius);
        effect.setBounds({ x, y, width:Math.ceil(Math.max(...points.map(p=>p.x))-x+radius), height:Math.ceil(Math.max(...points.map(p=>p.y))-y+radius) });
        effect.webContents.send('battle-frame', { kind: 'ninja-effects', shots:shots.map(p=>({...p,x:p.x-x,y:p.y-y})),fire:fire?{...fire,x:fire.x-x,y:fire.y-y}:null,time:this.ninja.time, scale: this.scale });
        if (!effect.isVisible()) effect.showInactive();
      } else effect.hide();
      if (events.includes('next-form')) this.transformNinja(this.ninja.requestedForm);
      if (this.sound() && events.includes('hit')) this.send('battle-sound:hit');
      if (this.sound() && events.includes('clash')) this.send('battle-sound:hit');
      if (this.sound() && events.includes('jutsu')) this.send('battle-sound:blast');
      return;
    }
    if (titans.models.includes(this.model)) {
      const actors = this.titans.actors.filter(a => a.active);
      if (!actors.every(a => this.windows.get(a.character)?.combatReady)) return;
      const events = this.titans.update(dt, this.displays(), this.scale);
      for (const a of actors) {
        if (a.displayId === null) continue;
        const w = this.windows.get(a.character), pad = Math.round(30 * this.scale);
        const width = Math.ceil(a.height * 1.7), height = Math.ceil(a.height * 1.25 + pad * 2);
        w.setBounds({ x: Math.round(a.x - width / 2), y: Math.round(a.y - height + pad), width, height });
        w.webContents.send('battle-frame', { ...a, foot: height - pad });
        if (!w.isVisible()) w.showInactive();
      }
      if (events.includes('transform') && this.sound()) this.send('battle-sound:blast');
      return;
    }
    if (this.model === 'dragonball') {
      if (this.loadingForm) return;
      if (!['goku', 'vegeta', 'beam'].every((kind) => this.windows.get(kind)?.combatReady)) return;
      const scale = .88 * this.scale;
      const events = this.engine.update(dt, this.displays(), scale);
      for (const f of this.engine.fighters) {
        if (!this.engine.initialized) continue;
        this.draw(f.kind, { ...f, phase: this.engine.phase, time: this.engine.time, super: this.engine.super }, f.x, f.y, scale * (f.size || 1));
      }
      this.drawBeam(scale);
      if (events.includes('next-form')) this.transform(this.engine.requestedForm);
      if (this.sound()) {
        if (events.includes('charge')) this.send('battle-energy:charge:' + this.engine.energyAttack);
        if (events.includes('blast')) this.send('battle-energy:blast:' + this.engine.energyAttack);
        if (events.includes('hit')) this.send('battle-sound:hit');
      }
      return;
    }
    if (this.model !== 'saitama' || !this.hero) return;
    const h = this.hero;
    if (h.drag || h.air) { if (this.monster) this.cancelMonster(); return; }
    if (!this.monster) {
      this.countdown -= dt;
      if ((this.countdown <= 0 || this.pendingMonster) && h.state !== 'punch') {
        const pool = this.displays().filter((d) => d.enabled !== false);
        const d = pool.find((d) => h.x >= d.workArea.x && h.x <= d.workArea.x + d.workArea.width) || pool[0];
        if (!d) return;
        const b = d.workArea, side = h.x < b.x + b.width / 2 ? 1 : -1;
        this.monster = { x: Math.max(b.x + 75 * h.scale, Math.min(b.x + b.width - 75 * h.scale, h.x + side * 290 * h.scale)),
          y: h.ground, scale: h.scale, dir: -side, variant: Math.floor(Math.random() * 4), time: 0, requested: false };
        this.pendingMonster = false; this.send('encounter-start:' + side);
        this.countdown = 45 + Math.random() * 45;
      }
      return;
    }
    const m = this.monster;
    const frozen = m.hitStop > 0;
    m.hitStop = Math.max(0, (m.hitStop || 0) - dt);
    if (frozen) dt = 0;
    m.time += dt;
    if (m.hitAge !== undefined) {
      m.hitAge += dt; m.vy += 1250 * m.scale * dt;
      m.x += m.vx * dt; m.y += m.vy * dt;
      m.rotation = Math.max(0, m.hitAge - .12) * 5 * Math.sign(m.vx); m.opacity = Math.max(0, 1 - Math.max(0, m.hitAge - .55) / .55);
      if (m.hitAge > 1.1) { this.cancelMonster(); return; }
    } else {
      m.y = h.ground;
      const side = Math.sign(m.x - h.x) || 1;
      m.x -= side * 92 * m.scale * dt;
      if (Math.abs(m.x - h.x) <= geometry.monsterReach * m.scale && !m.requested) {
        m.requested = true; m.strikeWait = 0; this.send('encounter-punch:' + side);
      }
      if (m.requested) {
        m.strikeWait += dt;
        if (m.strikeWait > 5) { this.cancelMonster(); return; }
        m.x = h.x + side * geometry.monsterReach * m.scale;
      }
    }
    this.draw('monster', { ...m, kind: 'monster' }, m.x, m.y - 92 * m.scale, m.scale);
  }
  close() {
    clearInterval(this.timer);
    for (const w of this.windows.values()) if (!w.isDestroyed()) w.destroy();
    this.windows.clear();
  }
}

module.exports = { CombatController };
