'use strict';
const geometry = require('./animation-geometry');
const transformations = require('./transformations');
const fusions = require('./fusions');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const aSameDisplay = (fighters) => fighters[0].displayId === fighters[1].displayId;

class BattleEngine {
  constructor(random = Math.random) {
    this.random = random; this.mode = 'fight'; this.form = 'base'; this.automatic = false;
    this.levelRounds = 0; this.requestedForm = null; this.moveCount = 0; this.willDodge = false;
    this.time = 0; this.phase = 'travel'; this.age = 0; this.targetAge = 99;
    this.attacker = 0; this.attackCount = 0; this.action = 'punch';
    this.attackHit = false; this.hitStop = 0; this.beam = null;
    this.displayIndex = -1; this.initialized = false;
    this.fusion = null; this.fusionPlan = null; this.opponent = 'buu'; this.enemyHealth = 8; this.defeated = false;
    this.fighters = ['goku', 'vegeta'].map((kind, i) => ({ kind, x: 0, y: 0, vx: 0, vy: 0,
      dir: i ? -1 : 1, pose: 'fly', poseAge: 0, impact: 0, hitAge: 0, trail: [], tilt: 0, opacity: 1 }));
  }
  get super() { return this.form !== 'base'; }
  set super(value) { this.form = value ? 'ss1' : 'base'; }
  setForm(id, landmarks = null) {
    if (!transformations.levels.some((level) => level.id === id)) return false;
    this.form = id; this.landmarks = landmarks; this.requestedForm = null; this.levelRounds = 0; this.beam = null;
    this.fusion = null; this.fusionPlan = null; this.defeated = false;
    this.hitStop = 0; this.attackHit = false; this.willDodge = false; this.action = 'punch';
    this.changePhase('transform');
    for (const f of this.fighters) {
      f.impact = 0; f.trail = []; f.pose = 'transform'; f.poseAge = 0; f.opacity = 1;
      delete f.artAtlas; delete f.artOffset; delete f.character; delete f.color; delete f.ritual; delete f.fusionProgress;
    }
    return true;
  }
  startFusion(id, opponent = this.opponent, landmarks = null) {
    const mode = fusions.get(id);
    if (!mode || !fusions.enemy(opponent)) return false;
    this.setForm('base'); this.automatic = false; this.opponent = opponent;
    this.fusionPlan = { mode, landmarks }; this.attackCount = 0; this.attacker = 0;
    this.changePhase('fusion-travel'); return true;
  }
  activateFusion(scale) {
    const plan = this.fusionPlan;
    this.fusion = plan.mode; this.form = plan.mode.form; this.landmarks = plan.landmarks;
    this.fusionPlan = null; this.enemyHealth = 8; this.defeated = false;
    this.fighters.forEach((f, i) => {
      const appearance = i ? fusions.enemy(this.opponent) : this.fusion;
      f.x = this.target.x + i * 235 * scale; f.y = this.target.y; f.vx = 0; f.vy = 0;
      f.trail = []; f.opacity = i ? 0 : .1; f.impact = 0; delete f.ritual;
      f.artAtlas = appearance.atlas; f.artOffset = appearance.offset; f.color = appearance.color;
      f.character = i ? this.opponent : this.fusion.hero; f.pose = i ? 'guard' : 'transform';
      f.form = this.form; f.super = true; f.poseAge = 0; f.fusionProgress = 0;
    });
    this.changePhase('fusion-reveal');
  }
  setOpponent(id, landmarks = null) {
    if (!fusions.enemy(id)) return false;
    this.opponent = id;
    if (this.fusionPlan) {
      if (landmarks) this.fusionPlan.landmarks.vegeta = landmarks;
    } else if (this.fusion) {
      if (landmarks) this.landmarks.vegeta = landmarks;
      this.enemyHealth = 8; this.defeated = false; this.beam = null; this.hitStop = 0;
      this.fighters[1].opacity = 0; this.fighters[1].impact = 0; this.fighters[1].trail = [];
      this.changePhase('fusion-reveal');
    }
    return true;
  }
  setMode(mode) {
    if (!['fight', 'roam'].includes(mode)) return;
    this.mode = mode;
    if (!this.fusionPlan) this.changePhase('travel');
    this.targetAge = 99; this.beam = null; this.hitStop = 0;
    if (this.defeated) { this.defeated = false; this.enemyHealth = 8; }
    for (const f of this.fighters) { f.pose = 'fly'; f.poseAge = 0; f.impact = 0; f.trail = []; }
  }
  changePhase(phase) {
    this.phase = phase; this.age = 0;
    if (phase === 'windup' || phase === 'charge') this.attackHit = false;
    if (phase === 'windup') {
      this.moveCount++;
      const instinct = ['omen-evolved', 'ui-ego'].includes(this.form) && this.attacker === 1;
      this.willDodge = this.form !== 'base' && (instinct ? this.moveCount % 3 !== 0 : this.moveCount % 4 === 2);
      this.dodgeEmitted = false;
    }
  }
  selectTarget(displays, scale) {
    this.displayIndex = (this.displayIndex + 1) % displays.length;
    const d = displays[this.displayIndex], b = d.workArea;
    this.targetDisplay = d.id;
    this.target = { x: b.x + b.width * (.42 + this.random() * .16),
      y: b.y + clamp(b.height * (.32 + this.random() * .2), Math.min(210 * scale, b.height / 2), b.height - Math.min(140 * scale, b.height / 2)) };
    this.targetAge = 0;
  }
  hand(kind) { return this.landmarks?.[kind]?.[this.action] || geometry.hand(kind, this.action, this.form); }
  actionPoint(f, scale) { return geometry.world(f, this.hand(f.kind), scale); }
  bodyPoint(f, scale) { return geometry.world(f, geometry.body, scale); }
  readyForAttack(scale) {
    const a = this.fighters[this.attacker], b = this.fighters[1 - this.attacker];
    return a.displayId === b.displayId && distance(this.actionPoint(a, scale), this.bodyPoint(b, scale)) < 45 * scale &&
      Math.max(Math.abs(a.vy), Math.abs(b.vy)) < 210 * scale;
  }
  hit(point, scale, events, energy = false) {
    if (this.attackHit) return;
    const a = this.fighters[this.attacker], victim = this.fighters[1 - this.attacker];
    this.attackHit = true; this.hitStop = energy ? .09 : .065;
    victim.impact = energy ? .45 : .32; victim.hitAge = 0;
    victim.contact = { x: (point.x - victim.x) / scale * victim.dir, y: (point.y - victim.y) / scale - 92 };
    victim.vx += a.dir * (energy ? 540 : this.action === 'kick' ? 310 : 250) * scale;
    victim.vy -= (energy ? 55 : 18) * scale;
    victim.pose = 'recoil'; victim.poseAge = 0;
    this.lastContact = { phase: this.phase, attacker: this.attacker, point: { ...point },
      body: this.bodyPoint(victim, scale), displayId: a.displayId, victimDisplayId: victim.displayId, action: this.action };
    events.push('hit');
    if (this.fusion && victim.kind === 'vegeta') {
      this.enemyHealth = Math.max(0, this.enemyHealth - (energy ? 2 : 1));
      if (!this.enemyHealth) { this.defeated = true; victim.vx = a.dir * 700 * scale; victim.vy = -220 * scale; events.push('defeated'); }
    }
  }
  targetFor(index, scale) {
    if (this.fusionPlan) {
      const ritual = this.phase === 'fusion-ritual', dance = this.fusionPlan.mode.ritual === 'dance';
      const duration = dance ? 2.8 : 1.65, progress = clamp(this.age / duration, 0, 1);
      const contacts = this.fusionPlan.landmarks?.ritual;
      const contactGap = contacts ? contacts.goku.x + contacts.vegeta.x : 245;
      const gap = ritual ? dance ? 245 + Math.max(0, progress - .65) / .35 * (contactGap - 245) : 220 * (1 - progress) : 245;
      const dy = ritual && dance && index && contacts ? (contacts.goku.y - contacts.vegeta.y) * Math.min(1, progress / .65) : 0;
      return { x: this.target.x + (index ? 1 : -1) * gap * scale / 2, y: this.target.y + dy * scale };
    }
    const attacking = index === this.attacker;
    const hand = this.hand(this.fighters[this.attacker].kind);
    const energy = ['separate', 'charge', 'blast', 'retreat', 'transform'].includes(this.phase);
    const travel = this.mode === 'roam' || this.phase === 'travel';
    const gap = (travel ? 245 : energy ? 365 : hand.x + 2) * scale;
    let x = this.target.x + (index ? 1 : -1) * gap / 2, y = this.target.y;
    if (travel) y += Math.sin(this.time * 1.3 + index * .8) * 12 * scale;
    else if (!attacking) y += (hand.y - geometry.body.y) * scale;
    if (this.phase === 'windup' && attacking) x -= this.fighters[index].dir * Math.sin(Math.PI * clamp(this.age / .38, 0, 1)) * 12 * scale;
    if (this.phase === 'strike' && attacking) x += this.fighters[index].dir * Math.min(1, this.age / .07) * 16 * scale;
    if (!attacking && this.willDodge && ((this.phase === 'windup' && this.age > .18) || this.phase === 'strike')) {
      y -= 94 * scale; x += (index ? 1 : -1) * 30 * scale;
    }
    return { x, y };
  }
  contain(f, displays, scale) {
    let d = displays.find((d) => f.x >= d.workArea.x && f.x <= d.workArea.x + d.workArea.width &&
      f.y >= d.workArea.y && f.y <= d.workArea.y + d.workArea.height);
    if (!d) d = displays.reduce((best, candidate) => {
      const b = candidate.workArea;
      const dist = Math.hypot(f.x - clamp(f.x, b.x, b.x + b.width), f.y - clamp(f.y, b.y, b.y + b.height));
      return !best || dist < best.distance ? { display: candidate, distance: dist } : best;
    }, null).display;
    const b = d.workArea;
    const insets = { left: Math.min(95 * scale, b.width / 2), right: Math.min(95 * scale, b.width / 2),
      top: Math.min(195 * scale, b.height / 2), bottom: Math.min(95 * scale, b.height / 2) };
    for (const other of displays) {
      if (other.id === d.id) continue;
      const o = other.workArea;
      if (o.y < b.y + b.height && o.y + o.height > b.y) {
        if (Math.abs(o.x + o.width - b.x) < 2) insets.left = 0;
        if (Math.abs(o.x - b.x - b.width) < 2) insets.right = 0;
      }
      if (o.x < b.x + b.width && o.x + o.width > b.x) {
        if (Math.abs(o.y + o.height - b.y) < 2) insets.top = 0;
        if (Math.abs(o.y - b.y - b.height) < 2) insets.bottom = 0;
      }
    }
    const outside = f.x < b.x + insets.left || f.x > b.x + b.width - insets.right ||
      f.y < b.y + insets.top || f.y > b.y + b.height - insets.bottom;
    if (outside && d.id !== this.targetDisplay && ['travel', 'fusion-travel'].includes(this.phase)) {
      const destination = displays.find((d) => d.id === this.targetDisplay);
      if (destination) {
        const next = destination.workArea;
        const separated = next.x > b.x + b.width + 2 || next.x + next.width < b.x - 2 ||
          next.y > b.y + b.height + 2 || next.y + next.height < b.y - 2;
        if (separated) {
          f.x = clamp(f.x, next.x + Math.min(95 * scale, next.width / 2), next.x + next.width - Math.min(95 * scale, next.width / 2));
          f.y = clamp(f.y, next.y + Math.min(195 * scale, next.height / 2), next.y + next.height - Math.min(95 * scale, next.height / 2));
          f.opacity = 0; f.trail = []; f.displayId = destination.id; return;
        }
      }
    }
    f.x = clamp(f.x, b.x + insets.left, b.x + b.width - insets.right);
    f.y = clamp(f.y, b.y + insets.top, b.y + b.height - insets.bottom); f.displayId = d.id;
  }
  update(dt, displays, scale = 1) {
    displays = displays.filter((d) => d.enabled !== false);
    if (!displays.length) return [];
    if (this.requestedForm) return [];
    dt = clamp(dt, 0, .05);
    if (this.hitStop > 0) { this.hitStop = Math.max(0, this.hitStop - dt); return []; }
    this.time += dt; this.age += dt; this.targetAge += dt;
    if (!this.target || !displays.some((d) => d.id === this.targetDisplay)) {
      this.selectTarget(displays, scale); this.changePhase(this.fusionPlan ? 'fusion-travel' : 'travel'); this.beam = null;
    } else if (this.mode === 'roam' && !this.fusionPlan && this.phase !== 'fusion-reveal' && this.targetAge > 5) this.selectTarget(displays, scale);
    if (!this.initialized) {
      this.fighters.forEach((f, i) => { const t = this.targetFor(i, scale); f.x = t.x; f.y = t.y; });
      this.initialized = true;
    }
    const events = [];
    for (let i = 0; i < 2; i++) {
      const f = this.fighters[i], other = this.fighters[1 - i], previousPose = f.pose;
      const target = this.targetFor(i, scale), hurt = f.impact > 0;
      const flying = ['travel', 'fusion-travel'].includes(this.phase) || (this.mode === 'roam' && !this.fusionPlan);
      const stiffness = flying ? 3.5 : hurt ? 3 : 28, damping = flying ? 3.3 : hurt ? 2.6 : 9;
      if (this.phase === 'victory' && i === 1) { f.vy += 650 * scale * dt; }
      else {
        f.vx += ((target.x - f.x) * stiffness - f.vx * damping) * dt;
        f.vy += ((target.y - f.y) * stiffness - f.vy * damping) * dt;
      }
      f.vx = clamp(f.vx, -850 * scale, 850 * scale); f.vy = clamp(f.vy, -650 * scale, 650 * scale);
      f.x += f.vx * dt; f.y += f.vy * dt; this.contain(f, displays, scale);
      f.dir = flying ? (Math.abs(f.vx) > 35 * scale ? Math.sign(f.vx) : f.dir) : (other.x >= f.x ? 1 : -1);
      f.impact = Math.max(0, f.impact - dt); f.hitAge += dt; f.opacity = Math.min(1, f.opacity + dt * 5);
      const dodging = i !== this.attacker && this.willDodge && ((this.phase === 'windup' && this.age > .18) || this.phase === 'strike');
      f.pose = this.phase === 'transform' ? 'transform' : flying ? 'fly' : hurt ? 'recoil' : dodging ? 'dodge' : i !== this.attacker ? 'guard' :
        this.phase === 'windup' ? 'windup' : this.phase === 'strike' ? (this.action === 'kick' ? 'kick' : 'strike') :
          this.phase === 'recover' ? 'recover' : this.phase === 'charge' ? 'charge' : this.phase === 'blast' ? 'blast' : 'guard';
      f.action = this.action; f.progress = this.age; f.super = this.super; f.form = this.form;
      if (this.fusionPlan) {
        const ritual = this.fusionPlan.mode.ritual;
        f.ritual = this.phase === 'fusion-ritual' ? ritual : null;
        f.ritualProgress = clamp(this.age / (ritual === 'dance' ? 2.8 : 1.65), 0, 1);
        f.fusionProgress = f.ritual ? f.ritualProgress : 0;
        if (f.ritual) { f.pose = 'fusion'; f.opacity = 1 - Math.max(0, f.ritualProgress - .88) / .12; }
      }
      if (this.fusion) {
        const appearance = i ? fusions.enemy(this.opponent) : this.fusion;
        f.artAtlas = appearance.atlas; f.artOffset = appearance.offset; f.color = appearance.color;
        f.character = i ? this.opponent : this.fusion.hero; f.fusionProgress = 0;
        if (this.phase === 'fusion-reveal') f.pose = i ? 'guard' : 'transform';
        if (this.phase === 'victory') {
          f.pose = i ? 'recoil' : 'guard';
          if (i) { f.opacity = Math.max(0, 1 - this.age / 1.45); f.tilt = -Math.min(1.5, this.age * 1.5); }
        }
      }
      f.poseAge = f.pose === previousPose ? f.poseAge + dt : 0;
      const tilt = flying ? clamp(f.vx / (1500 * scale), -.23, .23) * f.dir : hurt ? -.1 : 0;
      f.tilt += (tilt - f.tilt) * Math.min(1, dt * 10);
      f.trail.unshift({ x: f.x, y: f.y }); f.trail.length = Math.min(f.trail.length, 6);
    }
    if (this.fusionPlan) {
      if (this.phase === 'fusion-travel' && this.age > 1 && aSameDisplay(this.fighters) &&
        this.fighters.every((f, i) => distance(f, this.targetFor(i, scale)) < 40 * scale)) this.changePhase('fusion-ritual');
      else if (this.phase === 'fusion-ritual' && this.age >= (this.fusionPlan.mode.ritual === 'dance' ? 2.8 : 1.65)) {
        this.activateFusion(scale); events.push('fused');
      }
      return events;
    }
    if (this.phase === 'fusion-reveal') {
      if (this.age > 1.1) this.changePhase('travel');
      return events;
    }
    if (this.phase === 'victory') {
      if (this.age > 4.5) {
        this.enemyHealth = 8; this.defeated = false; this.attacker = 0; this.attackCount = 0; this.action = 'punch';
        this.fighters[1].opacity = 0; this.fighters[1].vx = 0; this.fighters[1].vy = 0;
        this.fighters[1].x = this.fighters[0].x + this.fighters[0].dir * 235 * scale;
        this.fighters[1].y = this.fighters[0].y;
        this.changePhase('fusion-reveal');
      }
      return events;
    }
    if (this.phase === 'transform') {
      if (this.age >= 1.15) { this.changePhase('travel'); events.push('transform'); }
      return events;
    }
    if (this.mode === 'roam') return events;
    const a = this.fighters[this.attacker], victim = this.fighters[1 - this.attacker];
    if (this.phase === 'travel') {
      if (this.age > 1.6 && this.fighters.every((f, i) => distance(f, this.targetFor(i, scale)) < 65 * scale) &&
        a.displayId === victim.displayId) this.changePhase('approach');
    } else if (this.phase === 'approach') {
      if (this.age > .3 && this.readyForAttack(scale)) this.changePhase('windup');
      else if (this.age > 5) { this.selectTarget(displays, scale); this.changePhase('travel'); }
    } else if (this.phase === 'windup') {
      if (this.age >= (this.action === 'kick' ? .46 : .38)) this.changePhase('strike');
    } else if (this.phase === 'strike') {
      if (this.age >= .07 && this.willDodge && !this.dodgeEmitted) { this.dodgeEmitted = true; events.push('dodge'); }
      if (this.age >= .07 && !this.willDodge && this.readyForAttack(scale)) this.hit(this.actionPoint(a, scale), scale, events);
      if (this.age >= .25) this.changePhase('recover');
    } else if (this.phase === 'recover') {
      if (this.age >= .55) {
        this.attacker = 1 - this.attacker; this.attackCount++;
        this.action = this.attackCount % 3 === 1 ? 'kick' : 'punch';
        if (this.attackCount % 3 === 0) { this.action = 'energy'; this.changePhase('separate'); }
        else this.changePhase('approach');
      }
    } else if (this.phase === 'separate') {
      if (this.age > .65 && this.fighters.every((f, i) => distance(f, this.targetFor(i, scale)) < 30 * scale)) this.changePhase('charge');
    } else if (this.phase === 'charge') {
      if (this.age >= 1.2) {
        const start = this.actionPoint(a, scale), end = this.bodyPoint(victim, scale);
        this.beam = { start, end, length: distance(start, end), progress: 0, age: 0, landed: false };
        this.changePhase('blast'); events.push('blast');
      }
    } else if (this.phase === 'blast') {
      if (this.beam) {
        this.beam.age = this.age;
        const travel = .14 + this.beam.length / (1600 * scale);
        this.beam.progress = clamp(this.age / travel, 0, 1);
        if (this.beam.progress >= 1 && !this.attackHit && a.displayId === victim.displayId &&
          distance(this.beam.end, this.bodyPoint(victim, scale)) < 60 * scale) {
          this.hit(this.beam.end, scale, events, true); this.beam.landed = true;
        }
        if (this.age >= travel + .38) { this.beam = null; this.changePhase('retreat'); }
      }
    } else if (this.phase === 'retreat' && this.age >= .8) {
      this.levelRounds++;
      if (this.automatic && this.levelRounds >= 2 && transformations.next(this.form) !== this.form) {
        this.requestedForm = transformations.next(this.form); events.push('next-form'); return events;
      }
      this.action = 'punch'; this.selectTarget(displays, scale); this.changePhase('travel');
    }
    if (this.defeated && this.phase !== 'victory') { this.beam = null; this.changePhase('victory'); }
    return events;
  }
}
module.exports = { BattleEngine };
