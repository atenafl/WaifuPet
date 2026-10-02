'use strict';
(() => {
  const levels = [
  {
    "id": "base",
    "label": "Forma base",
    "colors": [
      "#56d9ff",
      "#c992ff"
    ]
  },
  {
    "id": "ss1",
    "label": "SS1 — ambos",
    "colors": [
      "#ffe986",
      "#ffe986"
    ]
  },
  {
    "id": "ss2",
    "label": "SS2 — ambos",
    "colors": [
      "#ffe065",
      "#ffe065"
    ]
  },
  {
    "id": "ss3-majin",
    "label": "SS3 / Majin Vegeta",
    "colors": [
      "#ffdd58",
      "#ffc44f"
    ]
  },
  {
    "id": "ss4",
    "label": "SS4 — ambos",
    "colors": [
      "#ff515e",
      "#ff6570"
    ]
  },
  {
    "id": "god",
    "label": "SS God — ambos",
    "colors": [
      "#ff5c46",
      "#ff4848"
    ]
  },
  {
    "id": "blue",
    "label": "SS Blue — ambos",
    "colors": [
      "#42dfff",
      "#40caff"
    ]
  },
  {
    "id": "omen-evolved",
    "label": "UI sin perfeccionar / Blue Plus",
    "colors": [
      "#b5d6ff",
      "#4777ff"
    ]
  },
  {
    "id": "ui-ego",
    "label": "UI perfeccionado / Ultra Ego",
    "colors": [
      "#eefaff",
      "#bf61ff"
    ]
  }
];
  const get = (id) => levels.find((level) => level.id === id) || levels[0];
  const next = (id) => levels[Math.min(levels.length - 1, levels.indexOf(get(id)) + 1)].id;
  const color = (id, kind) => get(id).colors[kind === 'vegeta' ? 1 : 0];
  const catalog = { levels, get, next, color };
  if (typeof module !== 'undefined' && module.exports) module.exports = catalog;
  else window.Transformations = catalog;
})();
