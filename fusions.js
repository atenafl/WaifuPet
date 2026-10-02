'use strict';
(() => {
  const modes = [
    { id: 'vegito-ss1', label: 'Vegito SS1 · Potara', hero: 'vegito', form: 'ss1', atlas: 'fusion-ss1', offset: 0, color: '#ffe986', ritual: 'potara' },
    { id: 'vegito-blue', label: 'Vegito Blue · Potara', hero: 'vegito', form: 'blue', atlas: 'fusion-blue', offset: 0, color: '#49dfff', ritual: 'potara' },
    { id: 'gogeta-ss1', label: 'Gogeta SS1 · Danza', hero: 'gogeta', form: 'ss1', atlas: 'fusion-ss1', offset: 8, color: '#ffe986', ritual: 'dance' },
    { id: 'gogeta-blue', label: 'Gogeta Blue · Danza', hero: 'gogeta', form: 'blue', atlas: 'fusion-blue', offset: 8, color: '#49dfff', ritual: 'dance' }
  ];
  const opponents = [
    { id: 'buu', label: 'Majin Buu (Super Buu)', atlas: 'fusion-enemies', offset: 0, color: '#ff85c4' },
    { id: 'broly', label: 'Broly · Poder máximo', atlas: 'fusion-enemies', offset: 8, color: '#80ff58' }
  ];
  const get = (id) => modes.find((mode) => mode.id === id);
  const enemy = (id) => opponents.find((opponent) => opponent.id === id);
  const size = (character) => character === 'broly' ? 1.2 : 1;
  const catalog = { modes, opponents, get, enemy, size };
  if (typeof module !== 'undefined' && module.exports) module.exports = catalog;
  else window.Fusions = catalog;
})();
