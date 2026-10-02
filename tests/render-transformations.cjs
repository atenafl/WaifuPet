const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const assert = require('assert/strict');
const { levels } = require('../transformations');
const { BattleEngine } = require('../battle-engine');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  let win, status = 0;
  const errors = [];
  try {
    win = new BrowserWindow({ width: 1600, height: 1600, show: false,
      webPreferences: { offscreen: true, contextIsolation: true, preload: path.join(__dirname, 'renderer-preload.cjs') } });
    win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    await win.webContents.executeJavaScript('AnimeArt.ready');
    const forms = levels.slice(1).filter((f) => fs.existsSync(path.join(__dirname, '..', 'assets', f.id + '-anime.png')));
    for (const form of forms) {
      assert.equal(await win.webContents.executeJavaScript('AnimeArt.load(' + JSON.stringify(form.id) + ')'), true, form.id);
      const landmarks = await win.webContents.executeJavaScript('({goku:AnimeArt.landmarks(' + JSON.stringify(form.id) +
        ',"goku"),vegeta:AnimeArt.landmarks(' + JSON.stringify(form.id) + ',"vegeta")})');
      const engine = new BattleEngine(() => .5); engine.setForm(form.id, landmarks);
      let hits = 0, dodges = 0, blasts = 0;
      for (let n = 0; n < 3600; n++) {
        const events = engine.update(1 / 60, [{id:1,workArea:{x:0,y:0,width:1920,height:1080}}]);
        if (events.includes('hit')) hits++;
        if (events.includes('dodge')) dodges++;
        if (events.includes('blast')) blasts++;
      }
      assert.ok(hits > 0 && dodges > 0 && blasts > 0, form.id + ' combat with real artwork geometry');
      console.log(form.id, { hits, dodges, blasts, landmarks });
    }
    await win.webContents.executeJavaScript(`
      document.body.innerHTML='<canvas id="forms" width="1600" height="1600"></canvas>';
      const g=document.getElementById('forms').getContext('2d');
      g.fillStyle='#11182b';g.fillRect(0,0,1600,1600);
      g.fillStyle='#eef5ff';g.font='bold 28px sans-serif';g.fillText('WaifuPet · Ocho parejas de transformaciones',30,43);
      const forms=${JSON.stringify(forms)};
      forms.forEach((form,i)=>{
        const x=22+(i%2)*790,y=75+Math.floor(i/2)*375;
        g.fillStyle='#1c2740';g.beginPath();g.roundRect(x,y,767,356,16);g.fill();
        g.fillStyle='#cbd9f4';g.font='20px sans-serif';g.fillText(form.label,x+18,y+30);
        for(let a=0;a<4;a++) {
          const kind=a<2?'goku':'vegeta',pose=a%2?'dodge':'strike';
          g.save();g.translate(x+85+a*190,y+315);g.scale(.72,.72);
          HeroArt.fighter(g,{kind,form:form.id,super:true,pose,poseAge:.18,time:1,tilt:0});
          g.restore();
          g.fillStyle='#8fa7ce';g.font='14px sans-serif';g.fillText(kind+' · '+(pose==='strike'?'golpe':'esquiva'),x+24+a*190,y+341);
        }
      });
    `);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const png = await win.webContents.executeJavaScript("document.getElementById('forms').toDataURL('image/png').split(',')[1]");
    fs.writeFileSync(path.join(__dirname, '..', 'transformations-preview.png'), Buffer.from(png, 'base64'));
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: ' + forms.length + ' transformation atlases render full characters without errors.');
  } catch (error) { console.error(error); status = 1; }
  if (win) win.destroy(); app.exit(status);
});
