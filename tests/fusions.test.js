const test = require('node:test');
const assert = require('node:assert/strict');
const { BattleEngine } = require('../battle-engine');
const fusions = require('../fusions');
const frames = require('../animation-frames');
const displays = [{ id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1080 } }];
function until(engine, predicate, limit = 15000) {
  for (let n = 0; n < limit; n++) { const events = engine.update(1 / 60, displays); if (predicate(events)) return; }
  assert.fail('Fusion sequence did not complete: ' + engine.phase);
}

test('Vegito uses Potara and Gogeta uses the dance, both have SS1 and Blue', () => {
  assert.equal(fusions.modes.length, 4);
  for (const mode of fusions.modes) {
    const engine = new BattleEngine(() => .5);
    assert.equal(engine.startFusion(mode.id), true);
    const phases = new Set(); let ritualTime = 0;
    until(engine, (events) => {
      phases.add(engine.phase);
      assert.ok(!events.includes('hit'));
      if (engine.phase === 'fusion-ritual') ritualTime += 1 / 60;
      return events.includes('fused');
    });
    assert.ok(phases.has('fusion-travel') && phases.has('fusion-ritual'));
    assert.ok(ritualTime > (mode.ritual === 'dance' ? 2.6 : 1.4));
    assert.equal(engine.fighters[0].character, mode.hero);
    assert.equal(engine.fighters[1].character, 'buu');
    assert.equal(engine.fighters[0].artOffset, mode.offset);
    assert.equal(engine.automatic, false);
  }
});

test('Fusion heroes and opponents have distinct action poses and the rituals keep the requested frame order', () => {
  for (const mode of fusions.modes) {
    const slots = ['guard', 'fly', 'windup', 'strike', 'kick', 'dodge', 'charge', 'blast'].map((pose) =>
      frames.fighter({ artAtlas: mode.atlas, artOffset: mode.offset, pose }));
    assert.equal(new Set(slots.map((s) => s.row * 4 + s.column)).size, 8);
    assert.ok(slots.every((s) => s.atlas === mode.atlas));
  }
  for (const kind of ['goku', 'vegeta']) for (const ritual of ['dance', 'potara']) {
    const slots = [0, .26, .51, .76].map((ritualProgress) => frames.fighter({ kind, ritual, ritualProgress }));
    assert.deepEqual(slots.map((s) => s.column), [0, 1, 2, 3]);
    assert.ok(slots.every((s) => s.row === (kind === 'vegeta' ? 2 : 0) + (ritual === 'dance' ? 1 : 0)));
  }
});

test('Fused battles alternate energy attacks, defeat the enemy on contact and start a clean next round', () => {
  const engine = new BattleEngine(() => .5), beamAttackers = new Set();
  engine.startFusion('gogeta-blue', 'broly');
  until(engine, (events) => {
    if (events.includes('blast')) beamAttackers.add(engine.attacker);
    if (events.includes('defeated')) {
      assert.ok(events.includes('hit')); assert.equal(engine.enemyHealth, 0);
      assert.equal(engine.phase, 'victory'); assert.equal(engine.beam, null); return true;
    }
    return false;
  });
  assert.equal(beamAttackers.size, 2);
  for (let n = 0; n < 150; n++) assert.ok(!engine.update(1 / 60, displays).includes('hit'));
  assert.equal(engine.fighters[1].opacity, 0);
  until(engine, () => engine.phase === 'fusion-reveal');
  assert.equal(engine.enemyHealth, 8); assert.equal(engine.defeated, false);
});

test('Unfusing or selecting a normal form removes opponents, ritual poses and pending attacks', () => {
  const engine = new BattleEngine(() => .5);
  engine.startFusion('vegito-ss1'); until(engine, () => !!engine.fusion);
  engine.setForm('ui-ego');
  assert.equal(engine.fusion, null); assert.equal(engine.fusionPlan, null);
  assert.equal(engine.beam, null);
  assert.ok(engine.fighters.every((f) => !f.artAtlas && !f.character && !f.ritual));
  engine.startFusion('gogeta-blue'); engine.update(.03, displays); engine.setForm('base');
  for (let n = 0; n < 400; n++) assert.ok(!engine.update(1 / 60, displays).includes('fused'));
});

test('Roaming preserves the fusion but never attacks, pause is stable and opponent changes reset the encounter', () => {
  const engine = new BattleEngine(() => .5);
  engine.startFusion('vegito-blue'); until(engine, () => !!engine.fusion);
  engine.setOpponent('broly'); engine.setMode('roam');
  for (let n = 0; n < 900; n++) assert.equal(engine.update(1 / 60, displays).length, 0);
  assert.equal(engine.fusion.id, 'vegito-blue'); assert.equal(engine.opponent, 'broly');
  assert.equal(engine.fighters[1].character, 'broly');
  assert.ok(engine.fighters.every((f) => f.pose === 'fly'));
});
