'use strict';
(() => {
  const characters = [
    { id: 'eren', label: 'Eren', titan: 'Titán de Ataque', humanHeight: 210, titanHeight: 315, color: '#ffd16b' },
    { id: 'armin', label: 'Armin', titan: 'Titán Colosal', humanHeight: 205, titanHeight: 560, color: '#ffac68' },
    { id: 'reiner', label: 'Reiner', titan: 'Titán Acorazado', humanHeight: 225, titanHeight: 335, color: '#ffe1a1' }
  ];
  const models = ['attackontitan', ...characters.map(c => c.id)];
  const frame = (actor) => {
    const pose = actor.pose;
    const row = pose === 'walk' ? 0 : pose === 'run' ? 1 : ['transform', 'emerge'].includes(pose) ? 3 : 2;
    let column = row === 3 ? Math.min(3, Math.floor((actor.transformProgress || 0) * 4)) :
      row === 2 ? Math.floor((actor.time || 0) * 1.4) % 4 : Math.floor(actor.gait || 0) % 4;
    if (actor.reverting && actor.titan && row === 3) column = 3 - column;
    return { atlas: 'aot-' + actor.character + (actor.titan ? '-titan' : '-human'), row, column };
  };
  const catalog = { characters, models, frame };
  if (typeof module !== 'undefined' && module.exports) module.exports = catalog;
  else window.Titans = catalog;
})();
