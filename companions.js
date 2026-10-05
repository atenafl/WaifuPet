'use strict';
(() => {
  const levels = [
    {id:'e-rank',label:'Nivel 1 · Cazador E',level:1,height:225},
    {id:'hunter',label:'Nivel 25 · Entrenamiento',level:25,height:245},
    {id:'necromancer',label:'Nivel 50 · Nigromante',level:50,height:255},
    {id:'s-rank',label:'Nivel 75 · Cazador S',level:75,height:260},
    {id:'monarch',label:'Nivel 100 · Monarca de las sombras',level:100,height:270}
  ];
  const shadows = [
    {id:'igris',label:'Igris',unlock:50,height:285,color:'#a783ff'},
    {id:'beru',label:'Beru',unlock:75,height:295,color:'#8254f3'},
    {id:'bellion',label:'Bellion',unlock:100,height:320,color:'#b075ff'}
  ];
  const jojo = [
    {id:'jonathan',label:'Jonathan Joestar',part:1,stand:null,color:'#ffd16f'},
    {id:'joseph',label:'Joseph Joestar',part:2,stand:null,color:'#ffd16f'},
    {id:'jotaro',label:'Jotaro Kujo',part:3,stand:'star-platinum',color:'#a87aff'},
    {id:'josuke',label:'Josuke Higashikata · Parte 4',part:4,stand:'crazy-diamond',color:'#ff94d6'},
    {id:'giorno',label:'Giorno Giovanna',part:5,stand:'gold-experience',color:'#f6d069'},
    {id:'jolyne',label:'Jolyne Cujoh',part:6,stand:'stone-free',color:'#6ddafa'},
    {id:'johnny',label:'Johnny Joestar',part:7,stand:'tusk',color:'#ffc3de'},
    {id:'gappy',label:'Josuke Higashikata · JoJolion',part:8,stand:'soft-wet',color:'#c5aeff'}
  ];
  const olderJoseph={id:'joseph-old',label:'Joseph · Stardust Crusaders',part:3,stand:'hermit-purple',color:'#b97aff'};
  const stands=[
    {id:'star-platinum',label:'Star Platinum'},{id:'crazy-diamond',label:'Crazy Diamond'},
    {id:'gold-experience',label:'Gold Experience'},{id:'stone-free',label:'Stone Free'},
    {id:'tusk',label:'Tusk ACT4'},{id:'soft-wet',label:'Soft & Wet'}
  ];
  const models=['sololeveling','jojo'];
  const character=id=>jojo.find(c=>c.id===id)||(id==='joseph-old'?olderJoseph:jojo[0]);
  const level=id=>levels.find(l=>l.id===id)||levels[0];
  const assets=(model,id)=>model==='sololeveling'?
    ['solo-'+level(id).id+'-motion','solo-'+level(id).id+'-gesture',...shadows.flatMap(s=>['solo-'+s.id,'solo-'+s.id+'-motion'])]:
    ['jojo-'+character(id).id,...(stands.some(s=>s.id===character(id).stand)?['jojo-'+character(id).stand]:[])];
  const frame=a=>{
    const age=Math.max(0,a.poseAge||0);
    if(a.role==='shadow'&&['walk','run'].includes(a.pose)){
      const key=Math.floor(a.gait||0)%8;
      return {atlas:'solo-'+a.character+'-motion',row:(a.pose==='run'?2:0)+Math.floor(key/4),column:key%4};
    }
    if(a.role==='stand'&&a.pose==='hover')return {atlas:'jojo-'+a.character,row:2,column:[0,1,2,1][Math.floor((a.time||0)*1.2)%4]};
    if(a.role==='hero'&&a.model==='sololeveling'){
      const moving=['walk','run'].includes(a.pose);
      const column=moving?Math.floor(a.gait||0)%8:Math.min(3,Math.floor(age/.95*4));
      const row=moving?(a.pose==='run'?2:0)+Math.floor(column/4):
        a.pose==='summon'?2:a.pose==='dismiss'?3:a.pose==='pose'?1:0;
      return {atlas:'solo-'+a.selection+(moving?'-motion':'-gesture'),row,column:column%4};
    }
    const row=a.pose==='walk'?0:a.pose==='run'||a.pose==='ability'?1:
      ['emerge','summon','dismiss'].includes(a.pose)?3:2;
    const column=row===3?Math.min(3,Math.floor(age/.95*4)):
      ['walk','run'].includes(a.pose)?Math.floor(a.gait||0)%4:Math.floor((a.time||0)*(a.pose==='ability'?9:2))%4;
    return {atlas:(a.model==='sololeveling'?'solo-':'jojo-')+(a.role==='hero'?a.selection:a.character),row,
      column:a.pose==='dismiss'?3-column:column};
  };
  const catalog={levels,shadows,jojo,olderJoseph,stands,models,character,level,assets,frame};
  if(typeof module!=='undefined'&&module.exports)module.exports=catalog;else window.Companions=catalog;
})();

