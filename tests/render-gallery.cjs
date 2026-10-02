const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 860, show: false,
    webPreferences: { offscreen: true, contextIsolation: true, preload: path.join(__dirname, 'renderer-preload.cjs') } });
  try {
    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    await win.webContents.executeJavaScript('AnimeArt.ready');
    await win.webContents.executeJavaScript(`
      document.body.innerHTML = '<canvas id="preview" width="1440" height="860"></canvas>';
      const g = document.getElementById('preview').getContext('2d');
      g.fillStyle = '#11182b'; g.fillRect(0,0,1440,860);
      g.fillStyle = '#e9f2ff'; g.font = 'bold 32px sans-serif'; g.fillText('WaifuPet · Animación anime', 55,55);
      g.font = '18px sans-serif'; g.fillStyle = '#91a6c8'; g.fillText('Fotogramas completos generados · vuelo, combate y Super Saiyan',55,90);
      const cards = [
        ['Goku · Guardia','goku','guard',false], ['Goku · Golpe','goku','strike',false],
        ['Vegeta · Vuelo','vegeta','fly',false], ['Vegeta · Super Saiyan','vegeta','charge',true],
        ['Saitama · Paseo','saitama','walk',false], ['Saitama · Un golpe','saitama','strike',false],
        ['Monstruo · Cuernos','monster','',false], ['Monstruo · Mutante','monster','',false]
      ];
      cards.forEach(([label,kind,pose,superSaiyan],i)=>{
        const x=55+(i%4)*350,y=125+Math.floor(i/4)*355;
        g.fillStyle='#1c2740';g.beginPath();g.roundRect(x,y,325,330,16);g.fill();
        g.fillStyle='#aebfdb';g.font='16px sans-serif';g.textAlign='left';g.fillText(label,x+18,y+29);
        g.save();g.translate(x+155,y+302);g.scale(.85,.85);
        if(kind==='saitama') HeroArt.saitama(g,{time:1,phase:1,walk:pose==='walk',crouch:0,
          cape:HeroArt.capeState(),punch:pose==='strike'?.55:null,hands:pose==='strike'?[{x:-4,y:-184},{x:104,y:-189}]:[{x:-26,y:-106},{x:26,y:-106}],serious:pose==='strike'});
        else if(kind==='monster') HeroArt.monster(g,{time:1,variant:i===6?0:1});
        else HeroArt.fighter(g,{kind,time:1,pose,poseAge:.13,super:superSaiyan});
        g.restore();
      });
    `);
    await new Promise((resolve) => setTimeout(resolve, 350));
    const img = await win.webContents.capturePage();
    const output = path.join(__dirname, '..', 'art-preview.png');
    fs.writeFileSync(output, img.toPNG());
    process.stdout.write(output + '\n');
  } catch (e) { process.stderr.write(e.stack + '\n'); process.exitCode = 1; }
  win.destroy(); app.quit();
});
