'use strict';
const catalog = require('./ninjas');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
class NinjaEngine {
  constructor(random = Math.random) {
    this.random = random; this.form = 'child'; this.mode = 'fight'; this.automatic = false;
    this.phase = 'travel'; this.age = 0; this.time = 0; this.routeAge = 0; this.displayIndex = -1;
    this.turn = 0; this.rounds = 0; this.attacker = 0; this.hitStop = 0; this.requestedForm = null;
    this.projectiles = []; this.projectile = null; this.blackFire = null; this.forcedAttack = null;
    this.actors = catalog.characters.map((character, i) => ({ kind: 'ninja-pet', character, form: this.form,
      x: 0, y: 0, vx: 0, dir: i ? -1 : 1, height: 210, opacity: 0, pose: 'run', poseAge: 0,
      displayId: null, impact: 0, hitAge: 1, trail: [], time: 0, avatar: null, swapFlash: 0 }));
  }
  change(phase) { this.phase = phase; this.age = 0; this.landed = false; }
  cancel() {
    this.projectiles = []; this.projectile = null; this.blackFire = null; this.hitStop = 0;
    for (const a of this.actors) { a.avatar = null; a.jutsu = null; a.impact = 0; a.trail = []; a.swapFlash = 0; }
  }
  setMode(mode) {
    if (!['fight', 'roam'].includes(mode)) return;
    this.mode = mode; this.cancel(); this.forcedAttack = null; this.requestedForm = null; this.change('travel');
  }
  setForm(id, landmarks = null) {
    if (!catalog.forms.some(f => f.id === id)) return false;
    this.form = id; this.landmarks = landmarks; this.rounds = 0; this.requestedForm = null;
    this.cancel(); this.forcedAttack = null; this.change('transform');
    for (const a of this.actors) a.form = id;
    return true;
  }
  requestAttack(character, attack) {
    if (!catalog.characters.includes(character) || !catalog.skills(character, this.form).includes(attack)) return false;
    this.mode = 'fight'; this.forcedAttack = { character, attack }; this.cancel(); this.change('travel'); this.age = 1.3;
    return true;
  }
  relocate(displays, scale) {
    this.displayIndex = (this.displayIndex + 1) % displays.length;
    const d = displays[this.displayIndex], b = d.workArea;
    this.displayId = d.id; this.center = b.x + b.width * (.42 + this.random() * .16);
    this.floor = b.y + b.height - 10 * scale; this.routeAge = 0; this.cancel();
    this.actors.forEach((a, i) => { a.x = this.center + (i ? 1 : -1) * Math.min(170 * scale, b.width * .22);
      a.y = this.floor; a.displayId = d.id; a.opacity = .05; a.vx = 0; });
    this.change('travel');
  }
  point(a, pose = a.pose, age = a.poseAge) {
    const frame = catalog.frame({ ...a, pose, poseAge: age });
    return this.landmarks?.[a.character]?.frames?.[frame.atlas + ':' + (frame.row * 4 + frame.column)]?.hand ||
      this.landmarks?.[a.character]?.[this.action === 'low-kick' ? 'kick' : this.action] ||
      { x: .46, y: this.action === 'low-kick' ? -.2 : -.56 };
  }
  hand(a, action = this.action) {
    const pose = a.avatar ? 'avatar-strike' : action === 'energy' ? 'jutsu' : action === 'low-kick' ? 'low-kick' : a.pose;
    const p = this.point(a, pose, action === 'energy' ? .5 : a.poseAge);
    return { x: a.x + a.dir * p.x * a.height, y: a.y + p.y * a.height };
  }
  body(a, low = false) { return { x: a.x, y: a.y - a.height * (low ? .3 : a.avatar === 'kyubi' ? .43 : .56) }; }
  contact(a, b, events, shot = null) {
    if ((!shot && this.landed) || shot?.hit || a.displayId !== b.displayId || b.swapFlash > .1) return false;
    const p = shot || this.hand(a), body = this.body(b, this.action === 'low-kick'), reach = b.height * (shot ? .17 : .2);
    let collision = {x:p.x,y:p.y}, distance = Math.hypot(p.x - body.x, p.y - body.y);
    if (shot?.previous) {
      const dx = p.x - p.previous.x, dy = p.y - p.previous.y, length = dx * dx + dy * dy;
      const t = length ? clamp(((body.x - p.previous.x) * dx + (body.y - p.previous.y) * dy) / length, 0, 1) : 0;
      collision={x:p.previous.x+t*dx,y:p.previous.y+t*dy};
      distance = Math.hypot(collision.x-body.x,collision.y-body.y);
    }
    if (distance > reach) return false;
    if (shot) shot.hit = true;
    this.landed = true; this.hitStop = shot ? .065 : .055;
    b.impact = 1; b.hitAge = 0; b.contact = { x: collision.x - b.x, y: collision.y - b.y }; b.pose = 'recoil';
    if (!shot) b.x += a.dir * b.height * .06;
    this.lastContact = { point: collision, body, form: this.form, action: this.action, attack: this.jutsu, attacker: a.character };
    events.push('hit'); return true;
  }
  launch(a, victim) {
    const mouth = this.jutsu === 'katon';
    const raw = this.point(a, mouth ? 'breath' : this.jutsu === 'shuriken' ? 'throw' : 'seal', .5);
    const start = { x: a.x + a.dir * raw.x * a.height, y: a.y + raw.y * a.height };
    const end = this.body(victim), count = this.jutsu === 'shuriken' ? 3 : 1;
    this.projectiles = Array.from({length:count}, (_, i) => {
      const dx = end.x - start.x, dy = end.y + (i - (count - 1) / 2) * 12 - start.y, length = Math.max(1, Math.hypot(dx, dy));
      return { ...start, origin:{...start}, dx:dx/length, dy:dy/length, age:i ? -i*.1 : 0, attack:this.jutsu, hit:false };
    });
    this.projectile = this.projectiles[0]; this.change('projectile');
  }
  beginAttack() {
    if (this.forcedAttack) {
      this.attacker = catalog.characters.indexOf(this.forcedAttack.character); this.jutsu = this.forcedAttack.attack; this.forcedAttack = null;
    } else {
      this.attacker = this.turn % 2;
      const moves = catalog.skills(this.actors[this.attacker].character, this.form);
      this.jutsu = moves[Math.floor(this.turn / 2) % moves.length];
    }
    this.action = ['punch', 'low-kick'].includes(this.jutsu) ? this.jutsu : 'energy';
    this.clashing = this.turn % 14 === 13 && ['rasengan', 'chidori'].includes(this.jutsu);
    this.dodging = this.turn % 5 === 2; this.change(this.action === 'energy' ? 'charge' : 'approach');
  }
  recover(a) { a.recoveryPose = a.pose; this.change('recover'); }
  update(dt, displays, scale = 1) {
    displays = displays.filter(d => d.enabled !== false);
    if (!displays.length) return [];
    dt = clamp(dt, 0, .05); const events = [];
    if (this.hitStop > 0) { this.hitStop = Math.max(0, this.hitStop - dt); return events; }
    this.time += dt; this.age += dt; this.routeAge += dt;
    if (!displays.some(d => d.id === this.displayId) || (this.routeAge > 18 && this.phase === 'travel')) this.relocate(displays, scale);
    const b = displays.find(d => d.id === this.displayId).workArea;
    this.floor = b.y + b.height - 10 * scale;
    const a = this.actors[this.attacker], victim = this.actors[1 - this.attacker];
    for (const actor of this.actors) {
      actor.height = Math.min(catalog.get(this.form).height * scale * (actor.avatar ? 1.8 : 1), b.height * .7);
      actor.time = this.time; actor.form = this.form; actor.action = this.action; actor.attack = this.jutsu;
      actor.color = catalog.get(this.form).colors[catalog.characters.indexOf(actor.character)];
      actor.opacity = Math.min(1, actor.opacity + dt * 3); actor.hitAge += dt;
      actor.impact = Math.max(0, actor.impact - dt * 4); actor.swapFlash = Math.max(0, actor.swapFlash - dt);
      actor.dir = actor.character === a.character ? Math.sign(victim.x - a.x) || 1 : -(Math.sign(victim.x - a.x) || 1);
      actor.pose = actor.impact > 0 ? 'recoil' : 'guard'; actor.poseAge = this.age; actor.y = this.floor; actor.jutsu = null;
    }
    if (this.phase === 'transform') {
      for (const actor of this.actors) actor.pose = 'transform';
      if (this.age > 1.3) this.change('travel');
      return events;
    }
    if (this.phase === 'travel') {
      this.actors.forEach((actor, i) => {
        const target = this.center + (i ? 1 : -1) * Math.min(150 * scale, b.width * .2) + Math.sin(this.time * .75) * Math.min(100 * scale, b.width * .15);
        const delta = target - actor.x; actor.dir = Math.sign(delta) || actor.dir;
        actor.vx = clamp(delta * 4, -430 * scale, 430 * scale); actor.x += actor.vx * dt;
        actor.pose = Math.abs(delta) > 10 * scale ? 'run' : 'guard';
        if (this.age < 1.1) { actor.y -= Math.sin(this.age * Math.PI / 1.1) * actor.height * .4; actor.pose = 'jump'; }
      });
      if (this.mode === 'fight' && this.age > 1.3) this.beginAttack();
      else if (this.mode === 'roam' && this.age > 7) { this.relocate(displays, scale); return events; }
    } else if (this.phase === 'approach' || this.phase === 'dash' || this.phase === 'avatar-strike') {
      const avatar = this.phase === 'avatar-strike';
      a.pose = avatar ? 'avatar-strike' : this.phase === 'dash' ? 'jutsu' : 'run';
      a.jutsu = this.phase === 'dash' ? this.jutsu : null;
      const p = this.point(a, avatar ? 'avatar-strike' : this.action === 'energy' ? 'jutsu' : this.action, .5);
      const target = victim.x - a.dir * p.x * a.height;
      a.x += clamp((target - a.x) * 12, -720 * scale, 720 * scale) * dt;
      if (avatar) victim.y = Math.min(this.floor, a.y + p.y * a.height + victim.height * .56);
      else if (this.phase === 'dash') a.y = Math.min(this.floor, victim.y - victim.height * .56 - p.y * a.height);
      if (this.dodging && !avatar) { victim.pose='dodge'; victim.y-=Math.sin(Math.min(1,this.age/.8)*Math.PI)*victim.height*.5; }
      if (this.phase === 'approach') {
        if (Math.abs(target-a.x)<10*scale || this.age>1) this.change('windup');
      } else {
        if (this.age >= .4 && this.age <= .65) this.contact(a, victim, events);
        if (this.age > .8) this.recover(a);
      }
    } else if (this.phase === 'windup' || this.phase === 'strike') {
      a.pose = this.phase === 'windup' ? 'windup' : this.action;
      if (this.dodging) {victim.pose='dodge';victim.y-=victim.height*.42;}
      if (this.phase==='windup' && this.age>.34) this.change('strike');
      else if(this.phase==='strike') {this.contact(a,victim,events);if(this.age>.18)this.recover(a);}
    } else if (this.phase === 'charge') {
      a.pose = this.jutsu==='shuriken' ? 'throw' : ['katon','rasenshuriken'].includes(this.jutsu) ? 'seal' :
        this.jutsu==='amaterasu' ? 'eye' : this.jutsu==='amenotejikara' ? 'swap' : 'charge';
      a.jutsu=this.jutsu;
      if(this.clashing)for(const actor of this.actors){actor.pose='charge';actor.jutsu=actor.character==='naruto'?'rasengan':'chidori';}
      const duration=this.jutsu==='shuriken'?.5:.85;
      if(this.age>duration){
        events.push('jutsu');
        if(this.clashing){this.clashCenter=(a.x+victim.x)/2;this.change('clash');}
        else if(['shuriken','katon','rasenshuriken'].includes(this.jutsu))this.launch(a,victim);
        else if(this.jutsu==='amaterasu'){const p=this.body(victim);this.blackFire={...p,age:0,duration:1.2};this.change('black-fire');}
        else if(this.jutsu==='amenotejikara'){
          const x=a.x;a.x=victim.x;victim.x=x;a.swapFlash=.4;victim.swapFlash=.4;
          this.jutsu='chidori';this.change('dash');events.push('swap');
        }else if(['kyubi','susanoo'].includes(this.jutsu)){a.avatar=this.jutsu;this.change('summon');}
        else this.change('dash');
      }
    } else if(this.phase==='summon'){
      a.pose='avatar-charge';a.jutsu=a.avatar==='kyubi'?'bijuudama':null;
      if(this.age>.85)this.change('avatar-strike');
    } else if(this.phase==='black-fire'){
      a.pose='eye';a.poseAge=.65;const fire=this.blackFire;fire.age+=dt;
      if(this.dodging){victim.pose='dodge';victim.y-=Math.sin(Math.min(1,this.age/.8)*Math.PI)*victim.height*.5;}
      if(fire.age>.2 && fire.age<.6)this.contact(a,victim,events,fire);
      if(fire.age>fire.duration){this.blackFire=null;this.recover(a);}
    } else if(this.phase==='projectile'){
      a.pose=this.jutsu==='shuriken'?'throw':this.jutsu==='katon'?'breath':'seal';a.poseAge=.5+this.age;
      if(this.dodging){victim.pose='dodge';victim.y-=Math.sin(Math.min(1,this.age/.8)*Math.PI)*victim.height*.5;}
      for(const shot of this.projectiles){
        shot.age+=dt;if(shot.age<0||shot.hit)continue;
        shot.previous={x:shot.x,y:shot.y};shot.x+=shot.dx*950*scale*dt;shot.y+=shot.dy*950*scale*dt;
        this.contact(a,victim,events,shot);
      }
      this.projectile=this.projectiles.find(s=>!s.hit)||null;
      if(this.age>1.15||this.projectiles.every(s=>s.hit)){this.projectiles=[];this.projectile=null;this.recover(a);}
    } else if(this.phase==='clash'){
      for(const actor of this.actors){
        actor.pose='jutsu';actor.jutsu=actor.character==='naruto'?'rasengan':'chidori';
        const p=this.point(actor,'jutsu',.5),target=this.clashCenter-actor.dir*p.x*actor.height;
        actor.x+=clamp((target-actor.x)*12,-780*scale,780*scale)*dt;
      }
      const left=this.hand(this.actors[0],'energy'),right=this.hand(this.actors[1],'energy');
      if(!this.landed&&this.age>.4&&Math.hypot(left.x-right.x,left.y-right.y)<a.height*.3){
        this.landed=true;this.hitStop=.1;events.push('clash');
        for(const actor of this.actors){actor.impact=1;actor.hitAge=0;actor.contact={x:this.clashCenter-actor.x,y:-actor.height*.56};}
      }
      if(this.age>.85)this.recover(a);
    } else if(this.phase==='recover'){
      a.pose=a.avatar?'avatar-strike':'recover';if(a.avatar)a.poseAge=.8;
      if(this.age>.45){
        this.cancel();this.turn++;this.rounds++;this.change('travel');
        if(this.automatic&&this.rounds>=Math.max(...catalog.characters.map(c=>catalog.skills(c,this.form).length))*2&&catalog.next(this.form)!==this.form&&!this.requestedForm){
          this.requestedForm=catalog.next(this.form);events.push('next-form');
        }
      }
    }
    for(const actor of this.actors){
      actor.x=clamp(actor.x,b.x+actor.height*.4,b.x+b.width-actor.height*.4);
      actor.y=clamp(actor.y,b.y+actor.height,this.floor);
      if(['run','jump','jutsu','avatar-strike'].includes(actor.pose)){actor.trail.unshift({x:actor.x,y:actor.y});actor.trail.length=Math.min(5,actor.trail.length);}
      else actor.trail=[];
    }
    return events;
  }
}
module.exports = { NinjaEngine };
