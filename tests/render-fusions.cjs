const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const assert = require('assert/strict');
const { modes, opponents } = require('../fusions');
const { BattleEngine } = require('../battle-engine');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  let win, status = 0;
  const errors = [], scenes = [];
  const displays = [{id:1,workArea:{x:0,y:0,width:1920,height:1080}}];
  try {
    win = new BrowserWindow({ width: 1600, height: 1100, show: false,
      webPreferences: { offscreen: true, contextIsolation: true, preload: path.join(__dirname, 'renderer-preload.cjs') } });
    win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    await win.webContents.executeJavaScript('AnimeArt.ready');
    for (const name of ['fusion-ss1','fusion-blue','fusion-enemies','fusion-ritual'])
      assert.equal(await win.webContents.executeJavaScript('AnimeArt.load(' + JSON.stringify(name) + ')'), true, name + ' has sixteen complete figures');
    for (const mode of modes) for (const opponent of opponents) {
      const landmarks = await win.webContents.executeJavaScript('({goku:AnimeArt.landmarks(' + JSON.stringify(mode.atlas) + ',' +
        mode.offset + '),vegeta:AnimeArt.landmarks(' + JSON.stringify(opponent.atlas) + ',' + opponent.offset +
        '),ritual:{goku:AnimeArt.ritualContact("goku"),vegeta:AnimeArt.ritualContact("vegeta")}})');
      const engine = new BattleEngine(() => .5); engine.startFusion(mode.id, opponent.id, landmarks);
      let hits = 0, dodges = 0, defeated = false; const beams = new Set(); let capturedRitual = false, capturedHit = false;
      for (let n = 0; n < 9000 && !defeated; n++) {
        const events = engine.update(1 / 60, displays);
        if (events.includes('hit')) hits++;
        if (events.includes('dodge')) dodges++;
        if (events.includes('blast')) beams.add(engine.attacker);
        if (events.includes('defeated')) defeated = true;
        const snapshot = () => JSON.parse(JSON.stringify({target:engine.target,phase:engine.phase,fighters:engine.fighters,time:engine.time}));
        if (opponent.id === 'buu' && !capturedRitual && engine.phase === 'fusion-ritual' && engine.age > (mode.ritual === 'dance' ? 2.34 : .85)) {
          capturedRitual = true; scenes.push({title:mode.label+' · Fusión',...snapshot()});
        }
        if (opponent.id === (mode.form === 'blue' ? 'broly' : 'buu') && !capturedHit && events.includes('hit') && engine.attacker === 0) {
          capturedHit = true; scenes.push({title:mode.label+' vs '+opponent.label,...snapshot()});
        }
      }
      assert.ok(hits > 2 && dodges > 0 && beams.size === 2 && defeated, mode.id + ' vs ' + opponent.id);
      console.log('PASS: '+mode.id+' vs '+opponent.id+', both energy attacks, dodges and defeat.');
    }
    scenes.sort((a,b)=>modes.findIndex(m=>a.title.startsWith(m.label))-modes.findIndex(m=>b.title.startsWith(m.label)));
    assert.equal(scenes.length,8);
    await win.webContents.executeJavaScript(`
      document.body.innerHTML='<canvas id="fusions" width="1600" height="1100"></canvas>';
      const g=document.getElementById('fusions').getContext('2d');
      g.fillStyle='#11182b';g.fillRect(0,0,1600,1100);
      g.fillStyle='#eef5ff';g.font='bold 28px sans-serif';g.fillText('WaifuPet · Potara, danza y combate contra Buu y Broly',30,42);
      const scenes=${JSON.stringify(scenes)};
      scenes.forEach((s,i)=>{
        const x=22+(i%2)*790,y=70+Math.floor(i/2)*255,cx=x+380,cy=y+178,scale=.57;
        g.fillStyle='#1c2740';g.beginPath();g.roundRect(x,y,767,238,16);g.fill();
        g.fillStyle='#cbd9f4';g.font='18px sans-serif';g.fillText(s.title,x+18,y+28);
        for(const f of s.fighters){
          g.save();g.translate(cx+(f.x-s.target.x)*scale,cy+(f.y-s.target.y+92)*scale);g.scale(f.dir*scale,scale);
          HeroArt.fighter(g,{...f,phase:s.phase,time:s.time});
          if(f.impact>0){g.strokeStyle='#fff0a3';g.lineWidth=3;g.beginPath();g.arc(f.contact.x,f.contact.y,18,0,Math.PI*2);g.stroke();}
          g.restore();
        }
      });
    `);
    const png = await win.webContents.executeJavaScript("document.getElementById('fusions').toDataURL('image/png').split(',')[1]");
    fs.writeFileSync(path.join(__dirname, '..', 'fusions-preview.png'), Buffer.from(png,'base64'));
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: all fusion rituals and eight enemy matchups render without errors.');
  } catch (error) { console.error(error); status = 1; }
  if (win) win.destroy(); app.exit(status);
});
