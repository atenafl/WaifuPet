const {app,BrowserWindow,nativeImage}=require('electron'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const catalog=require('../companions');
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let win,code=0;
 try{
  win=new BrowserWindow({show:false,webPreferences:{offscreen:true,contextIsolation:true,preload:path.join(__dirname,'renderer-preload.cjs')}});
  win.webContents.on('console-message',(_e,_l,message)=>{if(message.startsWith('La animación'))console.error(message);});
  await win.loadFile(path.join(__dirname,'..','index.html'));await win.webContents.executeJavaScript('AnimeArt.ready');
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','assets','companions-prompts.json')));
  const gait=JSON.parse(fs.readFileSync(path.join(__dirname,'..','assets','companion-gait-prompts.json')));
  const names=[...manifest.assets.filter(q=>/^(solo|jojo)-/.test(q.file)),...gait.assets].map(q=>q.file.replace('-anime.png',''));
  for(const name of names){
   const bitmap=nativeImage.createFromPath(path.join(__dirname,'..','assets',name+'-anime.png')).toBitmap();
   let alpha=0;for(let i=3;i<bitmap.length;i+=4)if(bitmap[i]<24)alpha++;
   assert.ok(alpha/(bitmap.length/4)>.2,name+' transparent background');
   assert.equal(await win.webContents.executeJavaScript('AnimeArt.load('+JSON.stringify(name)+')'),true,name);
  }
  const scenes=[
   ['solo-levels-preview.png',catalog.levels.map(l=>({label:l.label,cards:[0,2,4,6].map(i=>({atlas:'solo-'+l.id+'-motion',index:i})).concat([8,9,10,11].map(i=>({atlas:'solo-'+l.id+'-gesture',index:i})))}))],
   ['solo-shadows-preview.png',catalog.shadows.map(s=>({label:s.label,cards:[0,6,8,15].map(i=>({atlas:'solo-'+s.id,index:i}))}))],
   ['solo-shadow-motion-preview.png',catalog.shadows.flatMap(s=>['Caminar','Correr'].map((label,row)=>({label:s.label+' · '+label,cards:Array.from({length:8},(_,i)=>({atlas:'solo-'+s.id+'-motion',index:row*8+i}))})))],
   ['jojo-preview.png',[...catalog.jojo,catalog.olderJoseph].map(c=>({label:c.label+(c.stand?' · '+c.stand:' · Hamon'),cards:[2,6,9,14].map(i=>({atlas:'jojo-'+c.id,index:i}))}))],
   ['jojo-stands-preview.png',catalog.stands.map(s=>({label:s.label,cards:[4,5,6,15].map(i=>({atlas:'jojo-'+s.id,index:i}))}))]
  ];
  for(const [file,rows]of scenes){
   const png=await win.webContents.executeJavaScript(`(()=>{
    const rows=${JSON.stringify(rows)},count=rows[0].cards.length,c=document.createElement('canvas');
    c.width=count*260;c.height=rows.length*320;const g=c.getContext('2d');g.fillStyle='#102035';g.fillRect(0,0,c.width,c.height);
    rows.forEach((row,r)=>{g.fillStyle='#e8f3ff';g.font='18px sans-serif';g.fillText(row.label,15,r*320+25);
     row.cards.forEach((card,j)=>{const m=AnimeArt.companionLandmarks([card.atlas]).frames[card.atlas+':'+card.index];
      const size=Math.min(235/(-m.top),238/(m.right-m.left));
      g.save();g.translate(j*260+130-(m.left+m.right)*size/2,r*320+298);
      AnimeArt.draw(g,{atlas:card.atlas,row:Math.floor(card.index/4),column:card.index%4},size);g.restore();});
    });return c.toDataURL('image/png').split(',')[1];})()`);
   fs.writeFileSync(path.join(__dirname,'..',file),Buffer.from(png,'base64'));
  }
  console.log('PASS: '+names.length+' companion atlases, '+names.length*16+' complete transparent keys, five levels, nine JoJo appearances and six humanoid stands.');
 }catch(e){console.error(e);code=1;}if(win)win.destroy();app.exit(code);
});

