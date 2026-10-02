'use strict';

(() => {
  const loop = (time, rate = 4) => [0, 1, 2, 3, 2, 1][Math.floor(Math.max(0, time || 0) * rate) % 6];
  function fighter(p) {
    if (p.ritual) {
      const slot = (p.kind === 'vegeta' ? 8 : 0) + (p.ritual === 'dance' ? 4 : 0) +
        Math.min(3, Math.floor(Math.max(0, p.ritualProgress || 0) * 4));
      return { atlas: 'fusion-ritual', row: Math.floor(slot / 4), column: slot % 4 };
    }
    if (p.artAtlas) {
      const slot = p.pose === 'blast' ? 7 : p.pose === 'charge' || p.pose === 'transform' ? 6 :
        p.pose === 'dodge' || p.pose === 'recoil' ? 5 : p.pose === 'kick' ? 4 :
          p.pose === 'strike' ? 3 : p.pose === 'windup' ? 2 : p.pose === 'fly' ? 1 : 0;
      const index = (p.artOffset || 0) + slot;
      return { atlas: p.artAtlas, row: Math.floor(index / 4), column: index % 4 };
    }
    if (p.form && p.form !== 'base') {
      const offset = p.kind === 'vegeta' ? 8 : 0;
      const pose = p.pose === 'transform' ? 'charge' : p.pose;
      const slot = pose === 'blast' ? 7 : pose === 'charge' ? 6 : pose === 'dodge' || pose === 'recoil' ? 5 :
        pose === 'kick' ? 4 : pose === 'strike' ? 3 : pose === 'windup' ? 2 : pose === 'fly' ? ((p.time || 0) > 0 && Math.floor(p.time * 3) % 4 === 3 ? 0 : 1) : 0;
      return { atlas: p.form, row: Math.floor((offset + slot) / 4), column: (offset + slot) % 4 };
    }
    if (p.super) {
      const row = p.kind === 'vegeta' ? 2 : 0;
      const column = p.pose === 'blast' || (p.phase === 'blast' && p.pose === 'strike') ? 3 : p.pose === 'charge' ? 2 :
        p.pose === 'kick' ? 1 : p.pose === 'strike' ? 0 : null;
      return { atlas: 'super-saiyan', row: row + (column === null ? 0 : 1), column: column === null ? loop(p.time) : column };
    }
    if (p.pose === 'blast' || (p.phase === 'blast' && p.pose === 'strike')) return { atlas: p.kind, row: 3, column: (p.poseAge || 0) < .12 ? 2 : 3 };
    if (p.pose === 'charge') return { atlas: p.kind, row: 3, column: (p.poseAge || 0) < .45 ? 0 : 1 };
    if (p.pose === 'windup') return { atlas: p.kind, row: p.action === 'kick' ? 2 : 1, column: (p.poseAge || 0) < .19 ? 0 : 1 };
    if (p.pose === 'strike' || p.pose === 'kick') return { atlas: p.kind, row: p.pose === 'kick' ? 2 : 1, column: 2 };
    if (p.pose === 'recover') return { atlas: p.kind, row: p.action === 'kick' && p.poseAge < .23 ? 2 : 1, column: p.poseAge < .23 ? 3 : 0 };
    if (p.pose === 'recoil') return { atlas: p.kind, row: 1, column: 3 };
    if (p.pose === 'guard') return { atlas: p.kind, row: 1, column: 0 };
    return { atlas: p.kind, row: 0, column: loop(p.time) };
  }
  function saitama(p) {
    if (p.punch !== undefined && p.punch !== null) {
      const hit = p.hitAt || .38, progress = p.punch;
      return { atlas: 'saitama', row: 2, column: progress < hit * .48 ? 0 : progress < hit ? 1 : progress < .84 ? 2 : 3 };
    }
    if (p.air) return { atlas: 'saitama', row: 3, column: 0 };
    if (p.landing) return { atlas: 'saitama', row: 3, column: 1 };
    if (p.sit) return { atlas: 'saitama', row: 3, column: 2 };
    if (p.shop) return { atlas: 'saitama', row: 3, column: 3 };
    if (p.walk) return { atlas: 'saitama', row: 1, column: Math.floor(Math.max(0, p.phase || 0) / (Math.PI * 2) * 4) % 4 };
    return { atlas: 'saitama', row: 0, column: loop(p.time, 3) };
  }
  function monster(p) {
    return { atlas: 'monsters', row: (p.variant || 0) % 4,
      column: p.hitAge !== undefined ? 3 : p.requested ? 2 : Math.floor((p.time || 0) * 5) % 2 };
  }
  const frames = { fighter, saitama, monster };
  if (typeof module !== 'undefined' && module.exports) module.exports = frames;
  else window.AnimationFrames = frames;
})();
