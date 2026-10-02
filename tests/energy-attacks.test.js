const test = require('node:test');
const assert = require('node:assert/strict');
const attacks = require('../energy-attacks');
const { BattleEngine } = require('../battle-engine');
const displays = [{ id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1080 } }];
function advance(engine, until, limit = 20000) {
  for (let i = 0; i < limit; i++) {
    const events = engine.update(1 / 60, displays);
    if (until(events)) return;
  }
  assert.fail('Expected energy state was not reached: ' + engine.phase);
}
test('Energy attacks follow character identity and Vegeta alternates Galick and Final Flash', () => {
  const e = new BattleEngine(() => .5), selected = [];
  advance(e, events => {
    if (events.includes('blast')) selected.push([e.fighters[e.attacker].kind, e.energyAttack]);
    return selected.length === 4;
  });
  assert.deepEqual(selected, [['vegeta', 'galick'], ['goku', 'kamehameha'], ['vegeta', 'final-flash'], ['goku', 'kamehameha']]);
  assert.equal(attacks.select('vegito'), 'final-kamehameha');
  assert.equal(attacks.select('gogeta'), 'kamehameha');
  assert.equal(attacks.select('buu'), 'buu-wave');
  assert.ok(attacks.get('final-flash').charge > attacks.get('galick').charge);
  assert.ok(attacks.get('broly-cannon').width > attacks.get('final-flash').width);
});
test('Broly fires five staggered projectiles, each hits once after travel, then alternates to his cannon', () => {
  const e = new BattleEngine(() => .5);
  e.startFusion('gogeta-blue', 'broly');
  advance(e, events => events.includes('blast') && e.attacker === 1);
  assert.equal(e.energyAttack, 'broly-barrage');
  const contacts = new Set(), ages = [], points = [];
  advance(e, events => {
    if (events.includes('hit')) {
      assert.ok(e.beam);
      const index = e.beam.contacts.at(-1);
      assert.ok(!contacts.has(index)); contacts.add(index); ages.push(e.age);
      assert.ok(e.beam.shots.find(s => s.index === index).progress >= 1);
      assert.equal(e.lastContact.displayId, e.lastContact.victimDisplayId);
      points.push({ index, point: { ...e.beam.impactPoints[index] } });
    }
    if (e.beam) for (const contact of points) assert.deepEqual(e.beam.impactPoints[contact.index], contact.point);
    return e.phase === 'retreat';
  });
  assert.equal(contacts.size, 5);
  for (let i = 1; i < ages.length; i++) assert.ok(ages[i] - ages[i - 1] > .1);
  advance(e, events => events.includes('blast') && e.attacker === 1);
  assert.equal(e.energyAttack, 'broly-cannon');
});
test('Changing mode, form or opponent cancels every projectile and prevents lingering damage', () => {
  for (const cancel of [e => e.setMode('roam'), e => e.setForm('ss2'), e => e.setOpponent('buu')]) {
    const e = new BattleEngine(() => .5); e.startFusion('vegito-blue', 'broly');
    advance(e, events => events.includes('blast') && e.attacker === 1);
    cancel(e); assert.equal(e.beam, null);
    for (let i = 0; i < 30; i++) assert.ok(!e.update(1 / 60, displays).includes('hit'));
  }
});
test('A beam misses an opponent that leaves the target and generates no fake explosion or damage', () => {
  const e = new BattleEngine(() => .5);
  advance(e, events => events.includes('blast'));
  while (e.phase === 'blast') {
    const f = e.fighters[1 - e.attacker]; f.y = 850; f.vy = 0;
    const events = e.update(1 / 60, displays);
    assert.ok(!events.includes('hit'));
    if (e.beam) assert.equal(e.beam.landed, false);
  }
});
