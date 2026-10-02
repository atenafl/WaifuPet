const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  let win, result = 0;
  try {
    win = new BrowserWindow({ width: 1600, height: 1480, show: false,
      webPreferences: { contextIsolation: true, offscreen: true, preload: path.join(__dirname, 'renderer-preload.cjs') } });
    const errors = [];
    win.webContents.on('console-message', (_, level, message) => { if (level >= 3) errors.push(message); });
    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    await win.webContents.executeJavaScript('AnimeArt.ready');
    const data = await win.webContents.executeJavaScript(`(async()=>{
      await Promise.all(['blue','fusion-enemies','fusion-blue'].map(AnimeArt.load));
      const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1480;
      const g=canvas.getContext('2d');g.fillStyle='#0c1425';g.fillRect(0,0,1600,1480);
      g.fillStyle='#f3f7ff';g.font='bold 28px sans-serif';g.fillText('WaifuPet · Energía: carga, trayectoria e impacto',32,42);
      const ids=['kamehameha','galick','final-flash','broly-barrage','broly-cannon'];
      ids.forEach((id,row)=>{
        const p=EnergyAttacks.get(id), y=65+row*280;
        for(let col=0;col<3;col++){
          const x=20+col*525;g.fillStyle='#18263b';g.beginPath();g.roundRect(x,y,510,265,14);g.fill();
          g.fillStyle=p.color;g.font='bold 17px sans-serif';g.fillText(p.label+' · '+['Carga','Disparo','Impacto'][col],x+16,y+25);
          const broly=id.startsWith('broly'),kind=id==='kamehameha'?'goku':'vegeta';
          const f={kind,pose:col===0?'charge':'blast',poseAge:.8,time:2,form:'blue',super:true,dir:1};
          if(broly){f.artAtlas='fusion-enemies';f.artOffset=8;f.character='broly';}
          const hand=AnimeArt.landmarks(broly?'fusion-enemies':'blue',broly?8:kind).energy;
          const actorScale=.69*Fusions.size(broly?'broly':kind);
          g.save();g.translate(x+82,y+250);g.scale(actorScale,actorScale);HeroArt.fighter(g,f);
          if(col===0)EnergyArt.charge(g,AnimeArt.chargePoint(f),id,.85,2,1);g.restore();
          if(col>0){
            const start={x:x+82+hand.x*actorScale,y:y+250+hand.y*actorScale},target={x:x+428,y:start.y};
            const shot={attack:id,length:target.x-start.x};
            const travel=.14+shot.length/(p.speed*.69),age=col===1?travel*.72+(p.count-1)*p.interval*.4:travel+(p.count-1)*p.interval+.1;
            const shots=EnergyAttacks.sample(shot,age,.69).map(s=>({...s,landed:s.progress===1}));
            g.save();g.beginPath();g.rect(x,y+30,510,235);g.clip();
            EnergyArt.beam(g,{attack:id,start,target,shots,time:2+age,scale:.69});g.restore();
          }
        }
      });
      return canvas.toDataURL('image/png').split(',')[1];
    })()`);
    if (errors.length) throw new Error(errors.join('\n'));
    fs.writeFileSync(path.join(__dirname, '..', 'energy-preview.png'), Buffer.from(data, 'base64'));
    console.log('PASS: five energy attacks rendered through the actual Canvas effects and anime poses.');
  } catch (error) { console.error(error); result = 1; }
  if (win) win.destroy(); app.exit(result);
});
