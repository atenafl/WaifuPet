'use strict';
const catalog=require('./companions');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class CompanionEngine {
  constructor(model,random=Math.random){
    this.model=model;this.random=random;this.selection=model==='sololeveling'?'e-rank':'jonathan';
    this.automatic=true;this.motion='walk';this.summons=true;this.selectedShadows=new Set(catalog.shadows.map(s=>s.id));
    this.phase='travel';this.age=0;this.time=0;this.routeAge=0;this.selectionAge=0;this.summonAge=0;
    this.displayIndex=-1;this.displayId=null;this.requestedSelection=null;this.summonRequested=false;this.companionAge=0;
    this.actors=[this.actor('companion-hero','hero',this.selection),
      ...(model==='sololeveling'?catalog.shadows.map(s=>this.actor('companion-'+s.id,'shadow',s.id)):[this.actor('companion-stand','stand',null)])];
  }
  actor(id,role,character){return {id,kind:'companion-pet',role,character,model:this.model,selection:this.selection,
    x:0,y:0,vx:0,dir:1,height:250,opacity:0,active:role==='hero',pose:'idle',poseAge:0,time:0,gait:0,displayId:null};}
  select(id){
    const valid=this.model==='sololeveling'?catalog.levels.some(l=>l.id===id):[...catalog.jojo,catalog.olderJoseph].some(c=>c.id===id);
    if(!valid)return false;
    this.selection=id;this.selectionAge=0;this.requestedSelection=null;this.summonAge=0;this.phase='pose';this.age=0;
    this.dismiss(true);this.actors[0].selection=id;return true;
  }
  setMotion(id){if(['walk','run','idle'].includes(id))this.motion=id;}
  setSummons(enabled){this.summons=!!enabled;if(!enabled)this.dismiss();}
  setShadow(id,enabled){
    if(!catalog.shadows.some(s=>s.id===id))return;
    if(enabled)this.selectedShadows.add(id);else{
      this.selectedShadows.delete(id);const a=this.actors.find(a=>a.character===id);
      if(a.active){a.pose='dismiss';a.poseAge=0;a.leaving=true;}
    }
  }
  summon(){if(this.summons)this.summonRequested=true;}
  dismiss(immediate=false){
    for(const a of this.actors.slice(1)){
      if(immediate){a.active=false;a.opacity=0;a.leaving=false;}
      else if(a.active){a.pose='dismiss';a.poseAge=0;a.leaving=true;}
    }
    this.summonRequested=false;this.companionAge=0;
  }
  eligible(){
    if(!this.summons)return [];
    if(this.model==='sololeveling')return catalog.shadows.filter(s=>s.unlock<=catalog.level(this.selection).level&&this.selectedShadows.has(s.id)).map(s=>s.id);
    const stand=catalog.character(this.selection).stand;
    return catalog.stands.some(s=>s.id===stand)?[stand]:[];
  }
  walkway(displays){
    const result=displays.filter(d=>d.id===this.displayId);
    for(let i=0;i<result.length;i++){
      const b=result[i].workArea;
      for(const d of displays){
        const next=d.workArea;
        if(!result.includes(d)&&Math.abs(b.y+b.height-next.y-next.height)<3&&
          Math.min(Math.abs(b.x+b.width-next.x),Math.abs(next.x+next.width-b.x))<65)result.push(d);
      }
    }
    return result;
  }
  relocate(displays,scale){
    const h=this.actors[0],d=displays.reduce((best,d)=>Math.abs(d.workArea.x+d.workArea.width*.5-h.x)<Math.abs(best.workArea.x+best.workArea.width*.5-h.x)?d:best,displays[0]);
    const b=d.workArea,requested=this.summonRequested||this.actors.slice(1).some(a=>a.active)||this.companionAge>0;
    this.displayId=d.id;this.routeAge=0;this.dismiss(true);this.summonRequested=requested;
    h.x=b.x+b.width*.3;h.y=b.y+b.height-10*scale;h.vx=0;h.dir=1;h.opacity=.1;
    for(const a of this.actors){a.displayId=d.id;a.x=h.x;a.y=h.y;}
    this.target=null;this.phase='travel';this.age=0;
  }
  update(dt,displays,scale=1){
    const enabled=displays.filter(d=>d.enabled!==false);if(!enabled.length)return [];
    dt=clamp(dt,0,.05);if(!dt)return [];const events=[];this.time+=dt;this.age+=dt;this.routeAge+=dt;this.selectionAge+=dt;this.summonAge+=dt;
    if(!enabled.some(d=>d.id===this.displayId))this.relocate(enabled,scale);
    const b=enabled.find(d=>d.id===this.displayId).workArea,floor=b.y+b.height-10*scale,h=this.actors[0];
    const path=this.walkway(enabled),left=Math.min(...path.map(d=>d.workArea.x)),right=Math.max(...path.map(d=>d.workArea.x+d.workArea.width));
    h.selection=this.selection;h.time=this.time;h.height=Math.min((this.model==='sololeveling'?catalog.level(this.selection).height:250)*scale,Math.min(...path.map(d=>d.workArea.height))*.7);
    const margin=Math.min(h.height*.5+(this.model==='sololeveling'?this.eligible().length*65*scale:65*scale),(right-left)*.25);
    if(this.target===null||this.target<left+margin||this.target>right-margin)this.target=h.dir>0?right-margin:left+margin;
    h.opacity=Math.min(1,h.opacity+dt*3);h.y=floor;h.poseAge=this.age;h.effect=null;
    const info=this.model==='jojo'?catalog.character(this.selection):null;
    h.color=info?.color||'#a278ff';h.effect=info?.stand==='hermit-purple'&&this.companionAge>0?'hermit-purple':null;
    if(this.phase==='travel'){
      const speed=(this.motion==='run'?230:85)*scale;
      const delta=this.target-h.x;
      if(Math.abs(delta)<20*scale){
        this.target=this.target>left+(right-left)*.5?left+margin:right-margin;
        this.phase='pose';this.age=0;
      }
      const desired=this.motion==='idle'?0:Math.sign(delta)*speed;
      h.vx+=clamp(desired-h.vx,-speed*5*dt,speed*5*dt);h.x+=h.vx*dt;
      if(Math.abs(h.vx)>5*scale)h.dir=Math.sign(h.vx);
      h.pose=Math.abs(h.vx)>10*scale?this.motion==='run'?'run':'walk':'idle';
      h.gait+=Math.abs(h.vx)*dt/(h.height*(this.motion==='run'?.8:.48)/(this.model==='sololeveling'?8:4));
      if(this.summonAge>12||this.summonRequested){
        this.summonRequested=false;this.summonAge=0;
        if(this.eligible().length||info?.stand==='hermit-purple'||info&&!info.stand){this.phase='summon';this.age=0;this.companionAge=0;}
      }
    }else if(this.phase==='pose'){
      h.pose='pose';h.vx*=Math.max(0,1-dt*10);
      if(this.age>1.2){this.phase='travel';this.age=0;}
    }else if(this.phase==='summon'){
      h.pose='summon';h.vx=0;
      if(info&&!info.stand)h.effect='hamon';
      if(info?.stand==='hermit-purple')h.effect='hermit-purple';
      const eligible=this.eligible();
      for(let i=0;i<eligible.length;i++){
        const id=eligible[i],a=this.model==='sololeveling'?this.actors.find(a=>a.character===id):this.actors[1];
        if(!a.active&&this.age>.18+i*.2){
          a.character=id;a.active=true;a.leaving=false;a.pose='emerge';a.poseAge=0;a.opacity=0;
          a.x=h.x-h.dir*(i+1)*95*scale;a.y=floor;events.push('summon');
        }
      }
      if(this.age>1.5){this.phase='travel';this.age=0;this.companionAge=.01;}
    }
    if(this.companionAge>0){this.companionAge+=dt;if(this.companionAge>17){this.dismiss();this.companionAge=0;}}
    h.x=clamp(h.x,left+h.height*.35,right-h.height*.35);
    this.displayId=(path.find(d=>h.x>=d.workArea.x&&h.x<d.workArea.x+d.workArea.width)||enabled.find(d=>d.id===this.displayId)).id;
    h.displayId=this.displayId;
    let index=0;
    for(const a of this.actors.slice(1)){
      if(!a.active)continue;
      a.selection=this.selection;a.time=this.time;a.displayId=this.displayId;a.dir=h.dir;a.poseAge+=dt;
      if(a.role==='shadow')a.displayId=(path.find(d=>a.x>=d.workArea.x&&a.x<d.workArea.x+d.workArea.width)||enabled.find(d=>d.id===this.displayId)).id;
      a.height=Math.min((this.model==='sololeveling'?catalog.shadows.find(s=>s.id===a.character).height:280)*scale,Math.min(...path.map(d=>d.workArea.height))*.7);
      a.color=this.model==='sololeveling'?catalog.shadows.find(s=>s.id===a.character).color:info.color;
      a.y=a.role==='stand'?h.y-a.height*.2*(a.pose==='emerge'?Math.min(1,a.poseAge/.95):1)+Math.sin(this.time*2)*6*scale:floor;
      if(a.leaving){
        a.pose='dismiss';a.opacity=Math.max(0,1-a.poseAge/.95);if(a.poseAge>.95){a.active=false;a.leaving=false;}continue;
      }
      a.opacity=Math.min(1,a.opacity+dt*3);
      if(a.pose==='emerge'&&a.poseAge<.95)continue;
      if(a.role==='stand'){
        const target=h.x-h.dir*h.height*.35,previous=a.x;
        a.x+=clamp((target-a.x)*8,-380*scale,380*scale)*dt;a.vx=(a.x-previous)/dt;
        a.y=h.y-a.height*.2+Math.sin(this.time*2)*6*scale;a.pose='hover';
        if(['idle','pose'].includes(h.pose)&&Math.floor(this.companionAge)%6<2&&this.companionAge>2){a.pose='ability';a.poseAge=this.companionAge%2;}
        a.x=clamp(a.x,left+a.height*.25,right-a.height*.25);continue;
      }
      const target=clamp(h.x-h.dir*(++index)*95*scale,left+a.height*.35,right-a.height*.35);
      const delta=target-a.x,desired=clamp(delta*4,-260*scale,260*scale);
      a.vx+=clamp(desired-a.vx,-650*scale*dt,650*scale*dt);a.x+=a.vx*dt;
      a.pose=Math.abs(a.vx)>12*scale?(Math.abs(a.vx)>160*scale?'run':'walk'):'idle';
      if(Math.abs(a.vx)>10*scale)a.dir=Math.sign(a.vx);
      a.gait+=Math.abs(a.vx)*dt/(a.height*(a.pose==='run'?.65:.42)/8);
      a.x=clamp(a.x,left+a.height*.35,right-a.height*.35);
      a.displayId=(path.find(d=>a.x>=d.workArea.x&&a.x<d.workArea.x+d.workArea.width)||enabled.find(d=>d.id===this.displayId)).id;
    }
    if(this.automatic&&this.selectionAge>45&&!this.requestedSelection&&this.phase==='travel'){
      const list=this.model==='sololeveling'?catalog.levels:catalog.jojo;
      const i=list.findIndex(c=>c.id===this.selection),next=this.model==='sololeveling'?list[Math.min(list.length-1,i+1)]:list[(i+1)%list.length];
      if(next.id!==this.selection){this.requestedSelection=next.id;events.push('selection');}
    }
    return events;
  }
}
module.exports={CompanionEngine};

