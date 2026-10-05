const {app,BrowserWindow,nativeImage}=require('electron');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const catalog=require('../ninjas'),{NinjaEngine}=require('../ninja-engine');
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
let win,result=0;
try{
 win=new BrowserWindow({show:false,webPreferences:{offscreen:true,contextIsolation:true,preload:path.join(__dirname,'renderer-preload.cjs')}});
 win.webContents.on('console-message',(_e,_level,message)=>console.log(message));
 await win.loadFile(path.join(__dirname,'..','index.html'));await win.webContents.executeJavaScript('AnimeArt.ready');
 for(const form of catalog.forms){
  assert.equal(await win.webContents.executeJavaScript('AnimeArt.loadNinjaForm('+JSON.stringify(form.id)+')'),true,form.id);
  for(const group of catalog.groups){
   const pixels=nativeImage.createFromPath(path.join(__dirname,'..','assets','ninja-'+form.id+'-'+group+'-anime.png')).toBitmap();
   let transparent=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]<24)transparent++;
   assert.ok(transparent/(pixels.length/4)>.2);
  }
  const landmarks=await win.webContents.executeJavaScript('({naruto:AnimeArt.ninjaLandmarks('+JSON.stringify(form.id)+',"naruto"),sasuke:AnimeArt.ninjaLandmarks('+JSON.stringify(form.id)+',"sasuke")})');
  for(const character of catalog.characters){
   assert.equal(Object.keys(landmarks[character].frames).length,form.id==='sixpaths-rinnegan'?56:48);
   for(const attack of catalog.skills(character,form.id)){
    const e=new NinjaEngine(()=>.5);e.setForm(form.id,landmarks);
    const screens=[{id:1,workArea:{x:0,y:0,width:1920,height:1080}}];
    for(let i=0;i<45;i++)e.update(1/30,screens);
    e.requestAttack(character,attack);let launched=false,avatar=false,swapped=false,hits=0;
    for(let i=0;i<230;i++){
     const events=e.update(1/30,screens);
     if(events.includes('jutsu'))launched=true;
     if(events.includes('swap'))swapped=true;
     if(e.actors.some(a=>a.avatar===attack))avatar=true;
     if(events.includes('hit')&&e.lastContact.attacker===character)hits++;
     if(e.turn>0)break;
    }
    if(!hits)console.log(JSON.stringify({form:form.id,character,attack,phase:e.phase,point:e.point(e.actors[catalog.characters.indexOf(character)],attack,.5),actors:e.actors.map(a=>({x:a.x,y:a.y,h:a.height,pose:a.pose})),landmark:landmarks[character].kick}));
    assert.ok(hits>0,form.id+' '+character+' '+attack+' must make physical contact');
    if(['kyubi','susanoo'].includes(attack))assert.ok(avatar);
    if(attack==='amenotejikara')assert.ok(swapped);
    if(!['punch','low-kick'].includes(attack))assert.ok(launched);
   }
  }
  console.log('PASS '+form.id+': 64 transparent keys; all eligible attacks make physical contact.');
 }
 for(const group of [...catalog.groups,'avatars','techniques']){
  const png=await win.webContents.executeJavaScript(`(()=>{
   const group=${JSON.stringify(group)},c=document.createElement('canvas');c.width=2048;c.height=['avatars','techniques'].includes(group)?1024:2300;
   const g=c.getContext('2d');g.fillStyle='#102034';g.fillRect(0,0,c.width,c.height);
   const rows=['avatars','techniques'].includes(group)?(group==='techniques'?['Kurama invocación','Rasenshuriken','Amaterasu','Amenotejikara']:['Kurama carga','Kurama garra','Susanoo carga','Susanoo espada']):Ninjas.forms.map(f=>f.label);
   rows.forEach((label,r)=>{
    const name=['avatars','techniques'].includes(group)?'ninja-'+group:'ninja-'+Ninjas.forms[r].id+'-'+group;
    g.fillStyle='#eff6ff';g.font='20px sans-serif';g.fillText(label,20,r*(['avatars','techniques'].includes(group)?256:320)+25);
    const count=['avatars','techniques'].includes(group)?4:16;
    for(let i=0;i<count;i++){
     const row=['avatars','techniques'].includes(group)?r:Math.floor(i/4),column=i%4;
     const x=15+i*(2000/count),y=r*(['avatars','techniques'].includes(group)?256:320)+45;
     g.save();g.translate(x+(2000/count)/2,y+(['avatars','techniques'].includes(group)?195:235));
     AnimeArt.draw(g,{atlas:name,row,column},['avatars','techniques'].includes(group)?170:110);g.restore();
    }
   });return c.toDataURL('image/png').split(',')[1];})()`);
  fs.writeFileSync(path.join(__dirname,'..','ninja-'+group+'-preview.png'),Buffer.from(png,'base64'));
 }
 const correction=await win.webContents.executeJavaScript(`(()=>{
  const c=document.createElement('canvas');c.width=1560;c.height=720;const g=c.getContext('2d');g.fillStyle='#102034';g.fillRect(0,0,c.width,c.height);
  const rows=[['Kurama: Naruto humano, Sasuke, avatar Kurama','ninja-kurama-eternal-motion','ninja-techniques'],['Seis Caminos: Naruto humano, Sasuke, técnicas propias','ninja-sixpaths-rinnegan-motion','ninja-sixpaths-techniques']];
  rows.forEach(([label,atlas,tech],r)=>{
   g.fillStyle='#eff6ff';g.font='22px sans-serif';g.fillText(label,20,r*360+30);
   const cards=[{atlas,row:0,column:0},{atlas,row:2,column:0},{atlas:tech,row:0,column:2},{atlas:'ninja-avatars',row:0,column:0}];
   cards.forEach((frame,j)=>{g.save();g.translate(j*390+195,r*360+330);AnimeArt.draw(g,frame,240);g.restore();});
  });return c.toDataURL('image/png').split(',')[1];})()`);
 fs.writeFileSync(path.join(__dirname,'..','naruto-corrected-preview.png'),Buffer.from(correction,'base64'));
 console.log('PASS: 496 generated keyframes; full seven-phase physical combat and corrected Naruto previews.');
}catch(error){console.error(error);result=1;}if(win)win.destroy();app.exit(result);
});


