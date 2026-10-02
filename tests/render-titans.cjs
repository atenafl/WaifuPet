const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { characters } = require('../titans');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  let win, result = 0;
  try {
    win = new BrowserWindow({ width: 1600, height: 1920, show: false,
      webPreferences: { offscreen: true, contextIsolation: true, preload: path.join(__dirname, 'renderer-preload.cjs') } });
    const errors = [];
    win.webContents.on('console-message', (_, level, message) => { if (level >= 3) errors.push(message); });
    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    await win.webContents.executeJavaScript('AnimeArt.ready');
    for (const form of ['human', 'titan']) for (const c of characters) {
      const name = 'aot-' + c.id + '-' + form;
      const file = path.join(__dirname, '..', 'assets', name + '-anime.png');
      if (!fs.existsSync(file)) throw new Error('Missing generated asset: ' + name);
      const pixels = nativeImage.createFromPath(file).toBitmap();
      const histogram = [0, 0, 0];
      for (let i = 3; i < pixels.length; i += 4) histogram[pixels[i] < 24 ? 0 : pixels[i] < 180 ? 1 : 2]++;
      console.log(name + ' alpha proportions: ' + histogram.map(n => (n / (pixels.length / 4)).toFixed(3)).join(', '));
      assert.equal(await win.webContents.executeJavaScript('AnimeArt.load(' + JSON.stringify(name) + ')'), true, name + ' must contain sixteen independent complete silhouettes');
    }
    const png = await win.webContents.executeJavaScript(`(()=>{
      const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1920;
      const g=canvas.getContext('2d');g.fillStyle='#101c27';g.fillRect(0,0,1600,1920);
      g.fillStyle='#eef6fb';g.font='bold 28px sans-serif';g.fillText('WaifuPet · Attack on Titan: humanos y transformaciones',30,44);
      Titans.characters.forEach((c,index)=>[false,true].forEach((titan,form)=>{
        const row=index*2+form,y=65+row*307;
        ['walk','run',titan?'emerge':'transform','idle'].forEach((pose,col)=>{
          const x=20+col*395;g.fillStyle='#233140';g.beginPath();g.roundRect(x,y,377,289,12);g.fill();
          g.fillStyle=titan?c.color:'#9ecada';g.font='16px sans-serif';g.fillText((titan?c.titan:c.label)+' · '+pose,x+12,y+24);
          g.save();g.translate(x+185,y+277);g.scale(1,1);
          AnimeArt.titan(g,{character:c.id,titan,pose,time:2,gait:2,transformProgress:.7,height:titan?245:215});g.restore();
        });
      }));
      return canvas.toDataURL('image/png').split(',')[1];
    })()`);
    fs.writeFileSync(path.join(__dirname, '..', 'titans-preview.png'), Buffer.from(png, 'base64'));
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: six transparent atlases and twenty-four human/titan animation poses rendered.');
  } catch (error) { console.error(error); result = 1; }
  if (win) win.destroy(); app.exit(result);
});
