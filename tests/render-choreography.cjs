const { app, BrowserWindow } = require('electron');
const { BattleEngine } = require('../battle-engine');
const fs = require('fs');
const path = require('path');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  let win; let result = 0;
  try {
    const engine = new BattleEngine(() => .5);
    const displays = [{ id: 1, enabled: true, workArea: { x: 0, y: 0, width: 1920, height: 1080 } }];
    const scenes = [], captured = new Set();
    for (let n = 0; n < 5000 && scenes.length < 8; n++) {
      const events = engine.update(1 / 60, displays);
      let title;
      if (engine.phase === 'approach' && engine.attackCount === 0) title = '1 · Se acercan';
      if (engine.phase === 'windup' && engine.age > .22 && engine.attackCount === 0) title = '2 · Prepara el golpe';
      if (events.includes('hit') && engine.attackCount === 0) title = '3 · Contacto y reacción';
      if (engine.phase === 'recover' && engine.age > .27 && engine.attackCount === 0) title = '4 · Recuperación';
      if (events.includes('hit') && engine.action === 'kick') title = '5 · Contraataque de Vegeta';
      if (engine.phase === 'charge' && engine.age > .8) title = '6 · Se separan y cargan';
      if (engine.phase === 'blast' && engine.beam?.progress > .35 && engine.beam.progress < .8) title = '7 · El rayo viaja';
      if (events.includes('hit') && engine.action === 'energy') title = '8 · Impacto de energía';
      if (title && !captured.has(title)) {
        captured.add(title); scenes.push(JSON.parse(JSON.stringify({ title, target: engine.target, phase: engine.phase,
          fighters: engine.fighters, beam: engine.beam, attacker: engine.attacker, time: engine.time })));
      }
    }
    if (scenes.length !== 8) throw new Error('Incomplete storyboard');
    win = new BrowserWindow({ width: 1920, height: 840, show: false,
      webPreferences: { offscreen: true, contextIsolation: true, preload: path.join(__dirname, 'renderer-preload.cjs') } });
    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    await win.webContents.executeJavaScript('AnimeArt.ready');
    await win.webContents.executeJavaScript(`
      document.body.innerHTML='<canvas id="story" width="1920" height="840"></canvas>';
      const g=document.getElementById('story').getContext('2d');
      g.fillStyle='#11182b';g.fillRect(0,0,1920,840);
      g.fillStyle='#eef5ff';g.font='bold 28px sans-serif';g.fillText('WaifuPet · Combate con preparación, contacto y recuperación',35,45);
      const scenes=${JSON.stringify(scenes)};
      scenes.forEach((s,i)=>{
        const x=25+(i%4)*475,y=80+Math.floor(i/4)*375,cx=x+226,cy=y+250,scale=.68;
        g.fillStyle='#1c2740';g.beginPath();g.roundRect(x,y,452,355,14);g.fill();
        g.fillStyle='#aebfdb';g.font='17px sans-serif';g.fillText(s.title,x+17,y+30);
        for(const f of s.fighters){
          g.save();g.translate(cx+(f.x-s.target.x)*scale,cy+(f.y-s.target.y+92)*scale);g.scale(f.dir*scale,scale);
          HeroArt.fighter(g,{...f,phase:s.phase,time:s.time});
          if(f.impact>0){g.strokeStyle='#fff0a3';g.lineWidth=3;g.beginPath();g.arc(f.contact.x,f.contact.y,22,0,Math.PI*2);g.stroke();}
          g.restore();
        }
        if(s.beam){
          const b=s.beam,f=s.fighters[s.attacker],start=AnimationGeometry.world(f,AnimationGeometry.hand(f.kind,'energy',f.super)),end={x:start.x+(b.end.x-start.x)*b.progress,y:start.y+(b.end.y-start.y)*b.progress};
          g.strokeStyle='#bd86ff';g.lineWidth=12;g.lineCap='round';g.beginPath();g.moveTo(cx+(start.x-s.target.x)*scale,cy+(start.y-s.target.y)*scale);
          g.lineTo(cx+(end.x-s.target.x)*scale,cy+(end.y-s.target.y)*scale);g.stroke();
          g.strokeStyle='#f2ffff';g.lineWidth=4;g.stroke();
        }
      });
    `);
    await new Promise((resolve) => setTimeout(resolve, 350));
    fs.writeFileSync(path.join(__dirname, '..', 'choreography-preview.png'), (await win.webContents.capturePage()).toPNG());
    console.log('PASS: eight-step choreography rendered.');
  } catch (error) { console.error(error); result = 1; }
  if (win) win.destroy(); app.exit(result);
});
