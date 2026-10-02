'use strict';
(() => {
  const hand = (kind, action, superSaiyan = false) => {
    if (superSaiyan === 'base') superSaiyan = false;
    if (typeof superSaiyan === 'string' && superSaiyan !== 'base') {
      if (action === 'energy') return { x: kind === 'vegeta' ? 110 : 115, y: -160 };
      if (action === 'kick') return { x: 150, y: -205 };
      return { x: 145, y: -155 };
    }
    if (action === 'energy') return superSaiyan ? { x: kind === 'vegeta' ? 139 : 133, y: -165 } :
      { x: kind === 'vegeta' ? 96 : 105, y: kind === 'vegeta' ? -150 : -175 };
    if (action === 'kick') return { x: superSaiyan ? 172 : 165, y: -215 };
    return { x: kind === 'vegeta' ? 169 : 164, y: superSaiyan ? -163 : -166 };
  };
  const body = { x: 0, y: -135 };
  const world = (f, p, scale = 1) => ({ x: f.x + f.dir * p.x * scale, y: f.y + (92 + p.y) * scale });
  const geometry = { hand, body, world, saitama: { x: 158, y: -169 }, monsterReach: 162 };
  if (typeof module !== 'undefined' && module.exports) module.exports = geometry;
  else window.AnimationGeometry = geometry;
})();
