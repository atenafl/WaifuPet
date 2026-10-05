const test = require('node:test');
const assert = require('node:assert/strict');
const { NinjaEngine } = require('../ninja-engine');
const catalog = require('../ninjas');
const displays = [
  { id: 1, workArea: { x: 0, y: 0, width: 1280, height: 720 } },
  { id: 2, workArea: { x: 1280, y: 0, width: 1280, height: 720 } },
  { id: 3, workArea: { x: 0, y: -900, width: 1600, height: 900 } }
];
test('Ninja forms have distinct character frames and the agreed progression', () => {
  assert.equal(catalog.forms.length, 7); assert.equal(catalog.next('sixpaths-rinnegan'), 'sixpaths-rinnegan');
  for (const form of catalog.forms) for (const character of catalog.characters) {
    const frames = ['guard', 'run', 'windup', 'punch', 'kick', 'dodge', 'charge', 'jutsu'].map(pose => catalog.frame({form:form.id, character, pose}));
    assert.ok(new Set(frames.map(f => f.atlas+':'+f.row*4+':'+f.column)).size >= 6);
    assert.ok(frames.every(f => f.atlas.startsWith('ninja-' + form.id + '-') && (character === 'naruto' ? f.row < 2 : f.row >= 2)));
    for(const pose of ['run','dodge','charge','jutsu','throw','seal']) {
      const samples=(pose==='run'?[0,.1,.2,.3]:pose==='dodge'?[0,.12,.24,.36]:[0,.23,.46,.69]).map(age=>catalog.frame({form:form.id,character,pose,time:age,poseAge:age}));
      assert.equal(new Set(samples.map(f=>f.column)).size,4,pose);
    }
  }
});
test('Both ninjas attack, dodge and clash; hits require physical contact', () => {
  const e = new NinjaEngine(() => .5), attackers = new Set(), attacks = new Set(); let hits = 0, clashes = 0, dodges = 0;
  e.setForm('shippuden');
  for (let n = 0; n < 16000; n++) {
    const events = e.update(1 / 30, displays);
    if (events.includes('jutsu')) attacks.add(e.jutsu);
    if (events.includes('clash')) clashes++;
    if (e.actors.some(a => a.pose === 'dodge')) dodges++;
    if (events.includes('hit')) {
      hits++; attackers.add(e.lastContact.attacker);
      assert.ok(Math.hypot(e.lastContact.point.x - e.lastContact.body.x, e.lastContact.point.y - e.lastContact.body.y) <= 65);
    }
  }
  assert.ok(hits > 10 && clashes > 0 && dodges > 0);
  assert.equal(attackers.size, 2); assert.ok(['rasengan', 'chidori', 'rasenshuriken', 'katon'].every(a => attacks.has(a)));
});
test('Roaming cancels attacks and visits enabled monitors with grounded runs and jumps', () => {
  const e = new NinjaEngine(() => .5), seen = new Set(); e.setMode('roam');
  for (let n = 0; n < 3000; n++) {
    assert.deepEqual(e.update(1 / 30, displays), []);
    for (const a of e.actors) {
      seen.add(a.displayId); const b = displays.find(d => d.id === a.displayId).workArea;
      assert.ok(a.x >= b.x && a.x <= b.x + b.width && a.y <= b.y + b.height);
      assert.ok(['run', 'guard', 'jump'].includes(a.pose)); assert.equal(a.jutsu, null);
    }
  }
  assert.equal(seen.size, 3);
  e.update(.03, displays.map(d => ({...d, enabled:d.id === 3}))); assert.ok(e.actors.every(a => a.displayId === 3));
});
test('Automatic escalation waits for rounds and stops at the final pair', () => {
  const e = new NinjaEngine(() => .5), seen = new Set([e.form]); e.automatic = true;
  for (let n = 0; n < 22000; n++) {
    const events = e.update(1 / 30, displays);
    if (events.includes('next-form')) { e.setForm(e.requestedForm); seen.add(e.form); }
  }
  assert.equal(seen.size, 7); assert.equal(e.form, 'sixpaths-rinnegan'); assert.equal(e.requestedForm, null);
  e.projectile = {x:1}; e.setMode('roam'); assert.equal(e.projectile, null);
});

test('Advanced techniques unlock at their corresponding forms and swaps change actual positions',()=>{
 assert.ok(!catalog.skills('sasuke','child').includes('amaterasu'));
 assert.ok(catalog.skills('sasuke','sage-mangekyo').includes('susanoo'));
 assert.ok(!catalog.skills('sasuke','kurama-eternal').includes('amenotejikara'));
 const e=new NinjaEngine(()=>.5);e.setForm('sixpaths-rinnegan');
 for(let i=0;i<45;i++)e.update(1/30,displays);
 assert.equal(e.requestAttack('sasuke','kamui'),false);
 assert.equal(e.requestAttack('sasuke','amenotejikara'),true);
 let swapped=false;
 for(let i=0;i<100;i++){
  const before=e.actors.map(a=>a.x),events=e.update(1/30,displays);
  if(events.includes('swap')){assert.deepEqual(e.actors.map(a=>a.x),before.reverse());swapped=true;break;}
 }
 assert.ok(swapped);
});
test('Shuriken volleys are staggered; black flames and avatars clear on form or mode changes',()=>{
 const screens=[displays[0]],e=new NinjaEngine(()=>.5);e.setForm('sixpaths-rinnegan');
 for(let i=0;i<45;i++)e.update(1/30,screens);
 e.requestAttack('naruto','shuriken');
 for(let i=0;i<100&&!e.projectiles.length;i++)e.update(1/30,screens);
 assert.equal(e.projectiles.length,3);assert.deepEqual(e.projectiles.map(p=>p.age),[0,-.1,-.2]);
 e.setMode('roam');assert.equal(e.projectiles.length,0);
 for(const attack of ['amaterasu','susanoo','kyubi']){
  const character=attack==='kyubi'?'naruto':'sasuke';e.requestAttack(character,attack);
  let active=false;
  for(let i=0;i<100;i++){
   e.update(1/30,screens);
   if(e.blackFire||e.actors.some(a=>a.avatar)){active=true;break;}
  }
  assert.ok(active,attack);e.setForm('sixpaths-rinnegan');
  assert.equal(e.blackFire,null);assert.ok(e.actors.every(a=>!a.avatar));
 }
});

