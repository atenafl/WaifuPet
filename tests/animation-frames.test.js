const test = require('node:test');
const assert = require('node:assert/strict');
const frames = require('../animation-frames');

test('Normal fighters use distinct flight, strike, kick, charge and blast sequences', () => {
  for (const kind of ['goku', 'vegeta']) {
    assert.equal(frames.fighter({ kind, pose: 'fly', time: 1 }).row, 0);
    assert.equal(frames.fighter({ kind, pose: 'strike', poseAge: .12 }).column, 2);
    assert.equal(frames.fighter({ kind, pose: 'kick', poseAge: .12 }).row, 2);
    assert.equal(frames.fighter({ kind, pose: 'charge' }).row, 3);
    assert.ok(frames.fighter({ kind, pose: 'strike', phase: 'blast', poseAge: .15 }).column >= 2);
  }
});
test('Super Saiyan selects separate complete golden-haired artwork for each fighter', () => {
  for (const kind of ['goku', 'vegeta']) {
    const p = { kind, super: true, time: 1, pose: 'fly' };
    const base = kind === 'goku' ? 0 : 2;
    assert.equal(frames.fighter(p).atlas, 'super-saiyan');
    assert.equal(frames.fighter(p).row, base);
    assert.equal(frames.fighter({ ...p, pose: 'strike' }).row, base + 1);
    assert.equal(frames.fighter({ ...p, pose: 'strike', phase: 'blast' }).column, 3);
  }
});
test('Saitama strike artwork coincides with the actual one-punch impact', () => {
  assert.equal(frames.saitama({ punch: .1, hitAt: .38 }).column, 0);
  assert.equal(frames.saitama({ punch: .3, hitAt: .38 }).column, 1);
  assert.equal(frames.saitama({ punch: .38, hitAt: .38 }).column, 2);
  assert.equal(frames.saitama({ punch: .9, hitAt: .38 }).column, 3);
  assert.equal(frames.saitama({ air: true }).column, 0);
  assert.equal(frames.saitama({ landing: true }).column, 1);
  assert.equal(frames.saitama({ sit: true }).column, 2);
  assert.equal(frames.saitama({ shop: true }).column, 3);
});
test('Each monster has walking, threat and punched animation frames', () => {
  for (let variant = 0; variant < 4; variant++) {
    assert.equal(frames.monster({ variant, time: 0 }).row, variant);
    assert.equal(frames.monster({ variant, time: .25 }).column, 1);
    assert.equal(frames.monster({ variant, requested: true }).column, 2);
    assert.equal(frames.monster({ variant, hitAge: .2 }).column, 3);
  }
});
