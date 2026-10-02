'use strict';
const { characters } = require('./titans');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
class TitanEngine {
  constructor(model = 'attackontitan', random = Math.random) {
    this.random = random; this.motion = 'auto'; this.automatic = true; this.time = 0;
    this.actors = characters.map((c, i) => ({ character: c.id, kind: 'titan-pet', titan: false,
      active: model === 'attackontitan' || model === c.id, x: 0, y: 0, vx: 0, dir: i % 2 ? -1 : 1,
      pose: 'idle', gait: 0, opacity: 0, displayId: null, routeAge: 0, motionAge: 0,
      nextTransform: 8 + i * 6, movement: 'walk', definition: c, transition: null }));
  }
  setMotion(motion) {
    if (!['auto', 'walk', 'run', 'idle'].includes(motion)) return;
    this.motion = motion;
    for (const a of this.actors) { a.motionAge = 0; a.movement = motion === 'auto' ? 'walk' : motion; }
  }
  transform(character, titan) {
    this.automatic = false;
    for (const a of this.actors) {
      if (!a.active || (character !== 'all' && a.character !== character)) continue;
      if (a.titan === titan && !a.transition) continue;
      a.transition = { to: titan, age: 0 }; a.transformProgress = 0;
    }
  }
  relocate(a, displays, scale, next = false) {
    const index = displays.findIndex(d => d.id === a.displayId);
    const d = displays[(Math.max(0, index) + (next ? 1 : 0)) % displays.length], b = d.workArea;
    a.displayId = d.id; a.x = b.x + b.width * (.2 + this.random() * .6);
    a.y = b.y + b.height - 8 * scale; a.vx = 0; a.opacity = 0; a.routeAge = 0;
  }
  update(dt, displays, scale = 1) {
    displays = displays.filter(d => d.enabled !== false);
    if (!displays.length) return [];
    dt = clamp(dt, 0, .05); this.time += dt;
    const events = [];
    for (const a of this.actors) {
      if (!a.active) continue;
      if (!displays.some(d => d.id === a.displayId)) this.relocate(a, displays, scale);
      let d = displays.find(d => d.id === a.displayId), b = d.workArea;
      a.time = this.time; a.routeAge += dt; a.motionAge += dt; a.nextTransform -= dt;
      a.opacity = Math.min(1, a.opacity + dt * 3);
      if (this.automatic && a.nextTransform <= 0 && !a.transition) a.transition = { to: !a.titan, age: 0 };
      if (a.transition) {
        const t = a.transition; t.age += dt;
        const midpoint = 1.15, duration = 2.6;
        if (t.age >= midpoint && a.titan !== t.to) { a.titan = t.to; events.push('transform'); }
        a.transformProgress = clamp(t.age < midpoint ? t.age / midpoint : (t.age - midpoint) / (duration - midpoint), 0, 1);
        a.pose = t.age < midpoint ? 'transform' : t.to ? 'emerge' : 'idle';
        a.reverting = !t.to;
        a.vx *= Math.exp(-dt * 13);
        a.transitionAge = t.age;
        if (t.age >= duration) { a.transition = null; a.nextTransform = 24 + this.random() * 18; a.motionAge = 0; }
      } else {
        a.transitionAge = null;
        if (this.motion === 'auto' && a.motionAge > (a.movement === 'idle' ? 3 : a.movement === 'run' ? 5 : 9)) {
          a.movement = a.movement === 'walk' ? 'run' : a.movement === 'run' ? 'idle' : 'walk'; a.motionAge = 0;
        }
        const motion = this.motion === 'auto' ? a.movement : this.motion;
        const speed = motion === 'idle' ? 0 : (motion === 'run' ? 205 : 72) * scale * (a.titan ? 1.12 : 1);
        a.vx += (speed * a.dir - a.vx) * (1 - Math.exp(-dt * 5));
        a.pose = Math.abs(a.vx) < 12 * scale ? 'idle' : motion === 'run' ? 'run' : 'walk';
        a.gait += Math.abs(a.vx) * dt / ((a.titan ? 38 : 27) * scale);
      }
      a.height = Math.min((a.titan ? a.definition.titanHeight : a.definition.humanHeight) * scale, b.height * .72);
      a.scale = scale; a.color = a.definition.color;
      a.x += a.vx * dt; a.y = b.y + b.height - 8 * scale;
      const margin = Math.min(a.height * .35, b.width / 3);
      if (a.x <= b.x + margin || a.x >= b.x + b.width - margin) {
        const neighbor = displays.find(other => other.id !== d.id &&
          Math.abs((a.dir > 0 ? b.x + b.width - other.workArea.x : b.x - other.workArea.x - other.workArea.width)) < 3 &&
          Math.abs(b.y + b.height - other.workArea.y - other.workArea.height) < 50 * scale);
        if (neighbor && a.routeAge > 1) {
          const next = neighbor.workArea; a.displayId = neighbor.id;
          a.x = a.dir > 0 ? next.x + margin : next.x + next.width - margin; a.routeAge = 0;
        } else {
          a.x = clamp(a.x, b.x + margin, b.x + b.width - margin); a.dir *= -1; a.vx *= .25;
          if (displays.length > 1 && a.routeAge > 7 && !a.transition) this.relocate(a, displays, scale, true);
        }
      }
      if (a.displayId !== d.id) {
        const area = displays.find(display => display.id === a.displayId).workArea;
        a.height = Math.min((a.titan ? a.definition.titanHeight : a.definition.humanHeight) * scale, area.height * .72);
        a.y = area.y + area.height - 8 * scale;
      }
    }
    return events;
  }
}
module.exports = { TitanEngine };
