const test = require('node:test');
const assert = require('node:assert/strict');
const { BattleEngine } = require('../battle-engine');
const geometry = require('../animation-geometry');
const frames = require('../animation-frames');
const displays = [{ id: 1, enabled: true, workArea: { x: 0, y: 0, width: 1920, height: 1080 } }];
const advance = (engine, until, limit = 5000) => {
  for (let i = 0; i < limit; i++) { const events = engine.update(1 / 60, displays); if (until(events)) return; }
  assert.fail('Choreography did not reach expected state: ' + engine.phase);
};

test('Melee contacts follow windup and strike, alternate fighters and stay in physical reach', () => {
  const engine = new BattleEngine(() => .5), hits = [], phases = new Set();
  advance(engine, (events) => {
    phases.add(engine.phase);
    if (events.includes('hit') && engine.action !== 'energy') {
      const contact = engine.lastContact;
      assert.equal(contact.phase, 'strike');
      assert.equal(contact.displayId, contact.victimDisplayId);
      assert.ok(Math.hypot(contact.point.x - contact.body.x, contact.point.y - contact.body.y) < 45);
      hits.push(contact.attacker);
      assert.equal(engine.fighters[1 - contact.attacker].pose, 'recoil');
    }
    return hits.length === 3;
  });
  assert.deepEqual(hits, [0, 1, 0]);
  for (const phase of ['travel', 'approach', 'windup', 'strike', 'recover']) assert.ok(phases.has(phase));
});
test('Missing a distant opponent creates no impact or recoil', () => {
  const engine = new BattleEngine(() => .5);
  advance(engine, () => engine.phase === 'windup');
  engine.changePhase('strike');
  const victim = engine.fighters[1 - engine.attacker]; victim.x += 700; victim.vx = 0;
  for (let i = 0; i < 12; i++) {
    const events = engine.update(1 / 60, displays);
    assert.ok(!events.includes('hit')); assert.equal(victim.impact, 0);
  }
});
test('Beam starts at the hands, travels first and hits only after reaching its target', () => {
  const engine = new BattleEngine(() => .5);
  advance(engine, () => engine.phase === 'blast');
  assert.ok(engine.beam); assert.equal(engine.beam.progress, 0);
  assert.deepEqual(engine.beam.start, geometry.world(engine.fighters[engine.attacker], geometry.hand(engine.fighters[engine.attacker].kind, 'energy'), 1));
  advance(engine, (events) => {
    if (engine.beam.progress < 1) {
      assert.ok(!events.includes('hit'));
      assert.equal(engine.fighters[1 - engine.attacker].impact, 0);
    }
    return events.includes('hit');
  });
  assert.equal(engine.beam.progress, 1); assert.equal(engine.beam.landed, true);
});
test('Contact holds both poses briefly and attack artwork never cycles back into windup', () => {
  const engine = new BattleEngine(() => .5);
  advance(engine, (events) => events.includes('hit'));
  const positions = engine.fighters.map((f) => [f.x, f.y]); const age = engine.age;
  engine.update(.03, displays);
  assert.deepEqual(engine.fighters.map((f) => [f.x, f.y]), positions); assert.equal(engine.age, age);
  for (const poseAge of [.07, .15, .23, 1]) assert.equal(frames.fighter({ kind: 'goku', pose: 'strike', poseAge }).column, 2);
  assert.equal(frames.fighter({ kind: 'goku', pose: 'windup', poseAge: .25 }).column, 1);
  assert.equal(frames.fighter({ kind: 'goku', pose: 'recover', poseAge: .1 }).column, 3);
  assert.equal(frames.fighter({ kind: 'goku', pose: 'recover', poseAge: .4 }).column, 0);
});
