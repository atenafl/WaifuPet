const { app, nativeImage } = require('electron');
const path = require('path');
app.whenReady().then(() => {
  for (const name of ['goku', 'vegeta', 'saitama', 'super-saiyan', 'monsters']) {
    const img = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', name + '-anime.png'));
    const size = img.getSize(), data = img.toBitmap();
    let transparent = 0, red = 0, semitransparent = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) transparent++;
      else if (data[i + 3] < 255) semitransparent++;
      if (data[i + 2] > 240 && data[i + 1] < 20 && data[i] < 20 && data[i + 3] > 100) red++;
    }
    console.log(name, size, { transparent, semitransparent, red });
  }
  app.quit();
});
