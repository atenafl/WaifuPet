const test = require('node:test');
const assert = require('node:assert/strict');
const { BattleEngine } = require('../battle-engine');

const display = (id, x, y, width = 1920, height = 1080, enabled = true) =>
  ({ id, enabled, workArea: { x, y, width, height } });
function random() {
  let seed = 72;
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

test('Both fighters visit horizontal, vertical and disconnected monitors', () => {
  for (const screens of [
    [display(1, -1920, 0), display(2, 0, 0)],
    [display(1, 0, -1080), display(2, 0, 0)],
    [display(1, -2200, -500), display(2, 300, 400)]
  ]) {
    const engine = new BattleEngine(random()), seen = [new Set(), new Set()];
    for (let n = 0; n < 6000; n++) {
      engine.update(1 / 30, screens);
      engine.fighters.forEach((f, i) => {
        assert.ok(Number.isFinite(f.x) && Number.isFinite(f.vy));
        const d = screens.find(({ workArea: b }) => f.x >= b.x && f.x <= b.x + b.width && f.y >= b.y && f.y <= b.y + b.height);
        assert.ok(d, 'fighter stays on an enabled screen'); seen[i].add(d.id);
      });
    }
    seen.forEach((s) => assert.equal(s.size, 2));
  }
});
test('Roaming clears combat and never generates attacks', () => {
  const engine = new BattleEngine(random());
  const screens = [display(1, 0, 0)];
  let hits = 0;
  for (let n = 0; n < 1000; n++) hits += engine.update(1 / 30, screens).length;
  assert.ok(hits > 0);
  engine.setMode('roam');
  for (let n = 0; n < 1000; n++) {
    assert.deepEqual(engine.update(1 / 30, screens), []);
    engine.fighters.forEach((f) => assert.equal(f.pose, 'fly'));
  }
  engine.setMode('fight');
  hits = 0;
  for (let n = 0; n < 1000; n++) hits += engine.update(1 / 30, screens).length;
  assert.ok(hits > 0);
});
test('Removing and disabling monitors redirects both fighters', () => {
  const engine = new BattleEngine(random());
  const screens = [display(1, -1920, 0), display(2, 0, 0)];
  engine.update(.03, screens);
  screens[0].enabled = false;
  for (let n = 0; n < 800; n++) {
    engine.update(.03, screens, 1.3);
    engine.fighters.forEach((f) => assert.ok(f.x >= 0 && f.x <= 1920));
  }
  assert.deepEqual(engine.update(.03, []), []);
  engine.update(.03, [display(3, -800, -600, 800, 600)], .6);
  engine.fighters.forEach((f) => assert.ok(f.x >= -800 && f.x <= 0 && f.y <= 0));
});
