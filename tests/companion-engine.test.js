const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../companions'),{CompanionEngine}=require('../companion-engine');
const displays=[{id:1,workArea:{x:0,y:0,width:1280,height:720}},{id:2,workArea:{x:1280,y:0,width:1600,height:720}}];
test('Solo Leveling has five selectable levels, chronological eight-key strides and only shadow companions',()=>{
 assert.equal(c.levels.length,5);assert.equal(c.levels.at(-1).level,100);
 for(const pose of ['walk','run']){
  const keys=Array.from({length:8},(_,gait)=>c.frame({role:'hero',model:'sololeveling',selection:'monarch',pose,gait}));
  assert.equal(new Set(keys.map(f=>f.row*4+f.column)).size,8);
 }
 const e=new CompanionEngine('sololeveling',()=>.5);assert.deepEqual(e.eligible(),[]);
 e.select('necromancer');assert.deepEqual(e.eligible(),['igris']);
 e.select('monarch');assert.deepEqual(e.eligible(),['igris','beru','bellion']);
 assert.equal(e.select('unknown'),false);
 e.setShadow('beru',false);assert.deepEqual(e.eligible(),['igris','bellion']);
});
test('Jinwoo and the shadow army follow enabled monitors, summon and dismiss without combat events',()=>{
 const e=new CompanionEngine('sololeveling',()=>.5);e.select('monarch');e.automatic=false;const seen=new Set();
 for(let n=0;n<3000;n++){
  const events=e.update(1/30,displays);assert.ok(events.every(v=>v==='summon'));
  for(const a of e.actors.filter(a=>a.active)){seen.add(a.displayId);const b=displays.find(d=>d.id===a.displayId).workArea;
   assert.ok(a.x>=b.x&&a.x<=b.x+b.width&&a.y<=b.y+b.height);assert.ok(!a.attack&&!a.damage);}
 }
 assert.equal(seen.size,2);e.summon();for(let i=0;i<70;i++)e.update(1/30,displays);
 assert.ok(e.actors.slice(1).some(a=>a.active));
 e.setSummons(false);for(let i=0;i<40;i++)e.update(1/30,displays);
 assert.ok(e.actors.slice(1).every(a=>!a.active));
 e.update(.03,displays.map(d=>({...d,enabled:d.id===2})));assert.equal(e.displayId,2);
});
test('JoJo rotates eight protagonists, uses their own stands and clears an old stand on selection',()=>{
 assert.equal(c.jojo.length,8);assert.equal(c.character('jonathan').stand,null);
 assert.equal(c.character('joseph').stand,null);assert.equal(c.character('joseph-old').stand,'hermit-purple');
 const e=new CompanionEngine('jojo',()=>.5);const seen=new Set([e.selection]);
 for(let n=0;n<12500;n++){if(e.update(1/30,displays).includes('selection')){e.select(e.requestedSelection);seen.add(e.selection);}}
 assert.equal(seen.size,8);
 e.automatic=false;e.select('jotaro');e.summon();for(let i=0;i<110;i++)e.update(1/30,displays);
 assert.equal(e.actors[1].character,'star-platinum');assert.ok(e.actors[1].active);
 e.select('jonathan');assert.equal(e.actors[1].active,false);assert.deepEqual(e.eligible(),[]);
 e.select('johnny');assert.deepEqual(e.eligible(),['tusk']);
});
test('Automatic Jinwoo progression stops at level 100 and motion choices stay independent',()=>{
 const e=new CompanionEngine('sololeveling',()=>.5),seen=new Set([e.selection]);
 for(let i=0;i<9000;i++){if(e.update(1/30,displays).includes('selection')){e.select(e.requestedSelection);seen.add(e.selection);}}
 assert.equal(seen.size,5);assert.equal(e.selection,'monarch');assert.equal(e.requestedSelection,null);
 e.setSummons(false);e.setMotion('idle');for(let i=0;i<100;i++)e.update(1/30,displays);
 assert.equal(e.actors[0].pose,'idle');e.setMotion('run');assert.equal(e.motion,'run');
});

test('Stand invocations survive successive selections and follow a monitor change',()=>{
 const e=new CompanionEngine('jojo');e.automatic=false;
 for(const c0 of [...c.jojo,c.olderJoseph]){
  e.select(c0.id);e.update(.03,displays.slice(0,1));e.summon();
  for(let i=0;i<100;i++)e.update(1/30,displays.slice(0,1));
  assert.equal(e.actors[1].active,c.stands.some(s=>s.id===c0.stand),c0.id);
 }
 e.select('jolyne');e.summon();for(let i=0;i<100;i++)e.update(1/30,displays.slice(0,1));
 assert.ok(e.actors[1].active);e.actors[0].x=1240;e.actors[0].vx=85;e.actors[0].dir=1;e.actors[1].x=1145;e.phase='travel';e.target=null;
 for(let i=0;i<100;i++)e.update(1/30,displays);
 assert.equal(e.displayId,2);assert.ok(e.actors[1].active);assert.equal(e.actors[1].displayId,2);
});

test('Grounded companions cross adjoining floors continuously and never teleport to disconnected monitors',()=>{
 const disconnected={id:3,workArea:{x:5000,y:-1500,width:1280,height:720}};
 const e=new CompanionEngine('sololeveling');e.select('monarch');e.automatic=false;const seen=new Set();
 e.update(.03,[...displays,disconnected]);
 for(let i=0;i<6000;i++){
  const old=e.actors[0].x;e.update(1/30,[...displays,disconnected]);seen.add(e.displayId);
  assert.ok(Math.abs(e.actors[0].x-old)<=230/30+.001);assert.equal(e.actors[0].y,710);
 }
 assert.deepEqual([...seen].sort(),[1,2]);
 e.setMotion('idle');for(let i=0;i<100;i++)e.update(1/30,[...displays,disconnected]);
 const point=e.actors[0].x;for(let i=0;i<1000;i++)e.update(1/30,[...displays,disconnected]);
 assert.equal(e.actors[0].x,point);
});

test('Stands hover beside their owners rather than walking, and shadow stride keys alternate through eight frames',()=>{
 const e=new CompanionEngine('jojo');e.select('jotaro');e.automatic=false;e.summon();
 for(let i=0;i<300;i++){
  e.update(1/30,displays);const a=e.actors[1];
  if(a.active&&!a.leaving&&a.pose!=='emerge'){
   assert.ok(['hover','ability'].includes(a.pose));assert.ok(a.y<e.actors[0].y-40);
   assert.ok(Math.abs(a.x-e.actors[0].x)<180);
  }
 }
 for(const character of c.shadows.map(s=>s.id))for(const pose of ['walk','run']){
  const keys=Array.from({length:8},(_,gait)=>c.frame({role:'shadow',model:'sololeveling',character,pose,gait}));
  assert.equal(new Set(keys.map(f=>f.row*4+f.column)).size,8);
  assert.ok(keys.every(f=>f.atlas==='solo-'+character+'-motion'));
 }
});

