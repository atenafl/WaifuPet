const test = require('node:test');
const assert = require('node:assert/strict');
const { BattleEngine } = require('../battle-engine');
const forms = require('../transformations');
const frames = require('../animation-frames');
const displays = [{ id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1080 } }];

test('Eight paired transformations keep the requested order and every action has distinct complete artwork', () => {
  assert.deepEqual(forms.levels.slice(1).map((f) => f.id), ['ss1', 'ss2', 'ss3-majin', 'ss4', 'god', 'blue', 'omen-evolved', 'ui-ego']);
  for (const form of forms.levels.slice(1)) for (const kind of ['goku', 'vegeta']) {
    const actions = ['guard', 'fly', 'windup', 'strike', 'kick', 'dodge', 'charge', 'blast'];
    const slots = actions.map((pose) => frames.fighter({ kind, pose, form: form.id }));
    assert.ok(slots.every((f) => f.atlas === form.id));
    assert.equal(new Set(slots.map((f) => f.row * 4 + f.column)).size, 8);
    assert.ok(slots.every((f) => kind === 'goku' ? f.row < 2 : f.row >= 2));
  }
});

test('Transforming cancels active attacks and holds a charging pose before combat resumes', () => {
  const engine = new BattleEngine(() => .5);
  engine.update(.02, displays);
  engine.beam = { progress: .5 }; engine.hitStop = .08;
  assert.equal(engine.setForm('ss3-majin'), true);
  assert.equal(engine.beam, null); assert.equal(engine.hitStop, 0);
  assert.equal(engine.setForm('invalid'), false);
  for (let i = 0; i < 40; i++) {
    assert.ok(!engine.update(.02, displays).includes('hit'));
    assert.ok(engine.fighters.every((f) => f.pose === 'transform'));
  }
  for (let i = 0; i < 20; i++) engine.update(.02, displays);
  assert.equal(engine.phase, 'travel');
});

test('Successful dodges move out of reach and do not generate fake impacts', () => {
  const engine = new BattleEngine(() => .5);
  engine.setForm('ui-ego');
  let dodges = 0, hits = 0;
  for (let i = 0; i < 8000; i++) {
    const events = engine.update(1 / 60, displays);
    if (events.includes('dodge')) {
      dodges++;
      assert.equal(engine.attackHit, false);
      assert.equal(engine.fighters[1 - engine.attacker].pose, 'dodge');
      assert.ok(!events.includes('hit'));
    }
    if (events.includes('hit')) hits++;
  }
  assert.ok(dodges > 2); assert.ok(hits > 2);
});

test('Automatic progression visits every level at safe boundaries and stays at Ultra Instinct and Ego', () => {
  const engine = new BattleEngine(() => .5), visited = ['ss1'];
  engine.automatic = true; engine.setForm('ss1');
  for (let i = 0; i < 60000 && visited.length < 8; i++) {
    engine.update(1 / 60, displays);
    if (engine.requestedForm) {
      assert.equal(engine.phase, 'retreat'); assert.equal(engine.beam, null);
      visited.push(engine.requestedForm); engine.setForm(engine.requestedForm);
    }
  }
  assert.deepEqual(visited, forms.levels.slice(1).map((f) => f.id));
  for (let i = 0; i < 3000; i++) engine.update(1 / 60, displays);
  assert.equal(engine.form, 'ui-ego'); assert.equal(engine.requestedForm, null);
  engine.setMode('roam');
  for (let i = 0; i < 600; i++) assert.equal(engine.update(1 / 60, displays).length, 0);
});
