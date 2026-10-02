(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EnergyAttacks = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const profiles = {
    kamehameha: { label: 'Kamehameha', color: '#36cfff', core: '#efffff', width: 28, charge: 1.55, speed: 1550, hold: .68, impact: 82, style: 'wave', count: 1, interval: 0 },
    galick: { label: 'Cañón Galick', color: '#bc59ff', core: '#fff1ff', width: 25, charge: 1.35, speed: 1750, hold: .58, impact: 76, style: 'spiral', count: 1, interval: 0 },
    'final-flash': { label: 'Final Flash', color: '#ffd337', core: '#ffffe8', width: 45, charge: 2.05, speed: 2100, hold: .85, impact: 108, style: 'flash', count: 1, interval: 0 },
    'final-kamehameha': { label: 'Final Kamehameha', color: '#42d9ff', core: '#fff7c7', width: 39, charge: 1.8, speed: 1850, hold: .8, impact: 98, style: 'wave', count: 1, interval: 0 },
    'buu-wave': { label: 'Onda de Buu', color: '#ff72ba', core: '#fff1fa', width: 31, charge: 1.25, speed: 1500, hold: .6, impact: 84, style: 'spiral', count: 1, interval: 0 },
    'broly-cannon': { label: 'Cañón de Broly', color: '#86ff35', core: '#f4ffb0', width: 62, charge: 1.85, speed: 1350, hold: .95, impact: 136, style: 'eruption', count: 1, interval: 0 },
    'broly-barrage': { label: 'Ráfaga de Broly', color: '#61ff47', core: '#edffc9', width: 24, charge: 1.3, speed: 1120, hold: .38, impact: 70, style: 'barrage', count: 5, interval: .16 }
  };
  function get(id) { return profiles[id] || profiles.kamehameha; }
  function select(character, round = 0) {
    if (character === 'vegeta') return round % 2 ? 'final-flash' : 'galick';
    if (character === 'broly') return round % 2 ? 'broly-cannon' : 'broly-barrage';
    if (character === 'buu') return 'buu-wave';
    if (character === 'vegito') return 'final-kamehameha';
    return 'kamehameha';
  }
  function sample(shot, age, scale = 1) {
    const p = get(shot.attack), out = [];
    for (let i = 0; i < p.count; i++) {
      const launch = i * p.interval, elapsed = age - launch;
      if (elapsed < 0) continue;
      const travel = .14 + shot.length / (p.speed * scale), progress = Math.min(1, elapsed / travel);
      const impactAge = elapsed - travel;
      if (impactAge > p.hold) continue;
      const arc = p.count > 1 ? Math.sin(progress * Math.PI) * (i - 2) * 38 * scale : 0;
      out.push({ index: i, launch, travel, progress, impactAge, arc,
        alpha: impactAge < 0 ? 1 : Math.min(1, Math.max(0, (p.hold - impactAge) / .2)) });
    }
    return out;
  }
  return { profiles, get, select, sample };
});
