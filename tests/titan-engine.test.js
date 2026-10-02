const test = require('node:test');
const assert = require('node:assert/strict');
const { TitanEngine } = require('../titan-engine');
const catalog = require('../titans');
const displays = [
  { id: 1, workArea: { x: 0, y: 0, width: 1280, height: 720 } },
  { id: 2, workArea: { x: 1280, y: 0, width: 1280, height: 720 } },
  { id: 3, workArea: { x: 0, y: -1080, width: 1920, height: 1080 } }
];
test('Eren, Armin and Reiner have their own titan forms and chronological walking, running and emergence poses', () => {
  assert.deepEqual(catalog.characters.map(c => c.titan), ['Titán de Ataque', 'Titán Colosal', 'Titán Acorazado']);
  for (const character of ['eren', 'armin', 'reiner']) for (const titan of [false, true]) {
    for (const [pose, row] of [['walk', 0], ['run', 1], ['idle', 2], ['emerge', 3]]) {
      const frames = [0, 1, 2, 3].map(i => catalog.frame({ character, titan, pose, gait: i, time: (i + .1) / 1.4, transformProgress: i / 4 }));
      assert.ok(frames.every(f => f.row === row && f.atlas === 'aot-' + character + (titan ? '-titan' : '-human')));
      assert.deepEqual(frames.map(f => f.column), [0, 1, 2, 3]);
    }
  }
});
test('Manual transformations hold motion, grow into the correct titan and can return to human individually', () => {
  const e = new TitanEngine('attackontitan', () => .5); e.update(.03, displays);
  e.transform('armin', true); let transformed = 0;
  for (let n = 0; n < 180; n++) transformed += e.update(1 / 60, displays).filter(v => v === 'transform').length;
  assert.equal(transformed, 1); assert.equal(e.automatic, false);
  assert.deepEqual(e.actors.map(a => a.titan), [false, true, false]);
  assert.ok(e.actors[1].height > e.actors[0].height);
  e.transform('armin', false); for (let n = 0; n < 180; n++) e.update(1 / 60, displays);
  assert.ok(e.actors.every(a => !a.titan && !a.transition));
  e.transform('all', true); for (let n = 0; n < 180; n++) e.update(1 / 60, displays);
  assert.ok(e.actors.every(a => a.titan));
  assert.ok(e.actors[1].height > e.actors[2].height && e.actors[2].height > e.actors[0].height);
});
test('Walking and running stay on screen floors, visit horizontal and vertical monitors and avoid disabled displays', () => {
  const e = new TitanEngine('attackontitan', () => .5), seen = e.actors.map(() => new Set());
  for (let n = 0; n < 14000; n++) {
    e.update(1 / 30, displays);
    e.actors.forEach((a, i) => {
      seen[i].add(a.displayId); const b = displays.find(d => d.id === a.displayId).workArea;
      assert.ok(a.x >= b.x && a.x <= b.x + b.width);
      assert.ok(Math.abs(a.y - (b.y + b.height - 8)) < 51); assert.ok(a.height <= b.height * .72);
    });
  }
  assert.ok(seen.every(s => s.size === 3));
  e.update(.03, displays.map(d => ({ ...d, enabled: d.id === 3 })));
  assert.ok(e.actors.every(a => a.displayId === 3));
});
test('Running accelerates faster than walking, idle stops, and single-character models exclude the other two', () => {
  const walk = new TitanEngine('eren', () => .5), run = new TitanEngine('eren', () => .5);
  walk.automatic = false; run.automatic = false; walk.setMotion('walk'); run.setMotion('run');
  for (let n = 0; n < 60; n++) { walk.update(1 / 60, displays); run.update(1 / 60, displays); }
  assert.ok(Math.abs(run.actors[0].vx) > Math.abs(walk.actors[0].vx) * 2);
  assert.equal(run.actors.filter(a => a.active).length, 1);
  run.setMotion('idle'); for (let n = 0; n < 180; n++) run.update(1 / 60, displays);
  assert.ok(Math.abs(run.actors[0].vx) < .01); assert.equal(run.actors[0].pose, 'idle');
});
