'use strict';

window.AnimeArt = (() => {
  const atlases = new Map();
  const kind = new URLSearchParams(window.location.search).get('kind');
  const files = ['naruto', 'sasuke'].includes(kind) ? [...window.Ninjas.groups.map(group => 'ninja-child-' + group), 'ninja-avatars', 'ninja-techniques'] : kind === 'ninja-effects' ? [] : ['eren', 'armin', 'reiner'].includes(kind) ? ['aot-' + kind + '-human', 'aot-' + kind + '-titan'] : kind === 'beam' ? [] : kind === 'monster' ? ['monsters'] : ['goku', 'vegeta'].includes(kind) ?
    [kind, 'super-saiyan'] : ['goku', 'vegeta', 'saitama', 'super-saiyan', 'monsters'];
  const anchors = { saitama: [[.72, .72, .72, .72], [.70, .70, .70, .70], [.71, .71, .64, .74], [.59, .69, .71, .74]],
    monsters: [[.39, .40, .53, .48], [.48, .48, .52, .70], [.52, .52, .57, .69], [.52, .52, .54, .69]] };
  function components(pixels, width, height, threshold = 24) {
    const labels = new Int32Array(width * height);
    const queue = new Int32Array(width * height);
    const result = [];
    let id = 0;
    for (let start = 0; start < labels.length; start++) {
      if (labels[start] || pixels[start * 4 + 3] < threshold) continue;
      id++;
      let head = 0, tail = 1, minX = width, minY = height, maxX = 0, maxY = 0;
      queue[0] = start; labels[start] = id;
      while (head < tail) {
        const index = queue[head++], x = index % width, y = Math.floor(index / width);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const px = x + dx, py = y + dy;
            if ((!dx && !dy) || px < 0 || py < 0 || px >= width || py >= height) continue;
            const neighbor = py * width + px;
            if (!labels[neighbor] && pixels[neighbor * 4 + 3] >= threshold) {
              labels[neighbor] = id; queue[tail++] = neighbor;
            }
          }
        }
      }
      if (tail > 1000) result.push({ id, size: tail, minX, minY, maxX, maxY });
    }
    const figures = result.sort((a, b) => b.size - a.size).slice(0, 16)
      .sort((a, b) => (a.minY + a.maxY) - (b.minY + b.maxY));
    const ordered = [];
    for (let row = 0; row < 4; row++) ordered.push(...figures.slice(row * 4, row * 4 + 4)
      .sort((a, b) => (a.minX + a.maxX) - (b.minX + b.maxX)));
    return { figures: ordered, labels, count: result.length };
  }
  const pending = new Map();
  function load(name) {
    if (atlases.has(name)) return Promise.resolve(true);
    if (pending.has(name)) return pending.get(name);
    const task = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const cw = image.naturalWidth / 4;
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let extracted = components(pixels, canvas.width, canvas.height);
      if(name.startsWith('ninja-') && extracted.count!==16) {
        for(const threshold of [80,128,180,220]) {
          extracted=components(pixels,canvas.width,canvas.height,threshold);

          if(extracted.count===16)break;
        }
      }
      const { figures, labels, count } = extracted;
      const cells = [];
      if (figures.length !== 16 || ((name.startsWith('fusion-') || name.startsWith('aot-') || name.startsWith('ninja-')) && count !== 16)) {
        console.error('La animación no contiene 16 personajes completos: ' + name); resolve(false); return;
      }
      for (let index = 0; index < 16; index++) {
        const row = Math.floor(index / 4), column = index % 4, figure = figures[index];
        const padding = 3;
        const frame = document.createElement('canvas');
        frame.width = figure.maxX - figure.minX + 1 + padding * 2;
        frame.height = figure.maxY - figure.minY + 1 + padding * 2;
        const fc = frame.getContext('2d'), output = fc.createImageData(frame.width, frame.height);
        for (let y = figure.minY; y <= figure.maxY; y++) {
          for (let x = figure.minX; x <= figure.maxX; x++) {
            const source = y * canvas.width + x;
            if (labels[source] !== figure.id) continue;
            const dest = ((y - figure.minY + padding) * frame.width + x - figure.minX + padding) * 4;
            output.data[dest] = pixels[source * 4]; output.data[dest + 1] = pixels[source * 4 + 1];
            output.data[dest + 2] = pixels[source * 4 + 2]; output.data[dest + 3] = pixels[source * 4 + 3];
          }
        }
        fc.putImageData(output, 0, 0);
        const anchor = anchors[name] ? anchors[name][row][column] : .5;
        let footCenter = 0, footSamples = 0;
        if (name.startsWith('ninja-')) {
          for (let y = Math.floor(frame.height * .88); y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
            if (output.data[(y * frame.width + x) * 4 + 3] > 180) { footCenter += x; footSamples++; }
          }
        }
        const slot = index % 8, band = slot === 4 ? [.1, .5] : [.2, .65];
        let tipX = 0, tipY = 0, samples = 0;
        for (let y = Math.floor(frame.height * band[0]); y < frame.height * band[1]; y++) {
          for (let x = 0; x < frame.width; x++) {
            if (output.data[(y * frame.width + x) * 4 + 3] < 180) continue;
            if (x > tipX) { tipX = x; tipY = y; samples = 1; }
            else if (x === tipX) { tipY += y; samples++; }
          }
        }
        cells.push({ image: frame, foot: frame.height - padding,
          anchor: footSamples ? footCenter / footSamples : column * cw + cw * anchor - figure.minX + padding,
          tip: { x: tipX, y: tipY / Math.max(1, samples) } });
      }
      const transformed = (window.Transformations.get(name).id === name && name !== 'base') || name.startsWith('fusion-');
      const heights = cells.map((cell) => cell.image.height).sort((a, b) => a - b);
      const ninjaReference = name === 'ninja-avatars' ? 3 : name.endsWith('-motion') ? 4 : 0;
      const characterHeights = name.startsWith('ninja-') ? [cells[ninjaReference].image.height, cells[ninjaReference + 8].image.height] : name.startsWith('fusion-') && name !== 'fusion-ritual' ? [0, 8].map(offset =>
        cells.slice(offset, offset + 8).map(cell => cell.image.height).sort((a, b) => a - b)[4]) : null;
      const titanHeight = name.startsWith('aot-') ? cells.slice(8, 12).map(c => c.image.height).sort((a, b) => a - b)[2] : null;
      atlases.set(name, { cells, height: titanHeight || (transformed ? heights[8] : image.naturalHeight / 4), characterHeights });
      resolve(true);
    };
    image.onerror = () => { console.error('No se pudo cargar la animación: ' + name); resolve(false); };
    image.src = 'assets/' + name + '-anime.png';
    });
    pending.set(name, task);
    return task;
  }
  const ready = Promise.all(files.map(load));
  function landmarks(name, kind) {
    const atlas = atlases.get(name);
    if (!atlas) return null;
    const offset = typeof kind === 'number' ? kind : kind === 'vegeta' ? 8 : 0,
      scale = 278 / (atlas.characterHeights?.[Math.floor(offset / 8)] || atlas.height);
    const result = {};
    for (const [action, slot] of [['punch', 3], ['kick', 4], ['energy', 7]]) {
      const cell = atlas.cells[offset + slot];
      result[action] = { x: (cell.tip.x - cell.anchor - (action === 'energy' ? 38 : 0)) * scale,
        y: (cell.tip.y - cell.foot) * scale };
    }
    return result;
  }
  function ritualContact(kind) {
    const atlas = atlases.get('fusion-ritual');
    if (!atlas) return null;
    const cell = atlas.cells[kind === 'vegeta' ? 15 : 7], scale = 278 / atlas.height;
    return { x: (cell.tip.x - cell.anchor) * scale, y: (cell.tip.y - cell.foot) * scale };
  }
  function chargePoint(p) {
    const frame = window.AnimationFrames.fighter(p), atlas = atlases.get(frame.atlas);
    if (!atlas) return { x: -32, y: -155 };
    const cell = atlas.cells[frame.row * 4 + frame.column],
      scale = 278 / (atlas.characterHeights?.[Math.floor(frame.row / 2)] || atlas.height);
    if (!cell.chargePoint) {
      const w = cell.image.width, h = cell.image.height, pixels = cell.image.getContext('2d').getImageData(0, 0, w, h).data;
      const stride = w + 1, sums = new Int32Array(stride * (h + 1));
      for (let y = 0; y < h; y++) {
        let line = 0;
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          line += pixels[i + 3] > 180 && Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 215 ? 1 : 0;
          sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + line;
        }
      }
      const r = Math.max(4, Math.round(h * .035));
      let best = -1, point = { x: w * .35, y: h * .58 };
      for (let y = Math.floor(h * .38); y < h * .76; y += 2) {
        for (let x = Math.max(r, Math.floor(w * .08)); x < Math.min(w - r, w * .7); x += 2) {
          const left = x - r, right = x + r, top = y - r, bottom = Math.min(h, y + r);
          const score = sums[bottom * stride + right] - sums[top * stride + right] - sums[bottom * stride + left] + sums[top * stride + left];
          if (score > best) { best = score; point = { x, y }; }
        }
      }
      cell.chargePoint = point;
    }
    return { x: (cell.chargePoint.x - cell.anchor) * scale, y: (cell.chargePoint.y - cell.foot) * scale };
  }
  function draw(g, frame, height) {
    const atlas = atlases.get(frame.atlas);
    if (!atlas) return false;
    const cell = atlas.cells[frame.row * 4 + frame.column];
    const scale = height / (atlas.characterHeights?.[Math.floor(frame.row / 2)] || atlas.height);
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(cell.image, -cell.anchor * scale, -cell.foot * scale,
      cell.image.width * scale, cell.image.height * scale);
    g.restore(); return true;
  }
  function fighter(g, p) {
    g.save();
    g.translate(0, -135); g.rotate((p.tilt || 0) + (p.pose === 'dodge' ? -.18 * Math.sin(Math.min(1, (p.poseAge || 0) / .34) * Math.PI) : 0));
    const breathing = 1 + Math.sin((p.time || 0) * 3) * .006 +
      (p.pose === 'transform' ? .045 * Math.sin(Math.min(1, (p.poseAge || 0) / 1.15) * Math.PI) : 0);
    g.scale(breathing, 1 / breathing); g.translate(0, 135);
    if (p.pose === 'recoil') { g.translate(0, -135); g.rotate(-.12); g.translate(0, 135); }
    if (p.super && p.pose === 'windup') {
      g.translate(-10 * Math.sin(Math.min(1, (p.poseAge || 0) / .38) * Math.PI), 0);
    }
    const success = draw(g, window.AnimationFrames.fighter(p), 278);
    g.restore(); return success;
  }
  function saitama(g, p) {
    g.save();
    const bend = p.cape ? p.cape[p.cape.length - 1].x : 0;
    g.translate(0, -120); g.rotate(Math.max(-.025, Math.min(.025, bend * .0004))); g.translate(0, 120);
    const success = draw(g, window.AnimationFrames.saitama(p), 256);
    g.restore(); return success;
  }
  function monster(g, p) {
    g.save(); g.rotate(p.rotation || 0); g.scale(-(p.dir || -1), 1);
    const success = draw(g, window.AnimationFrames.monster(p), 320);
    g.restore(); return success;
  }
  function titan(g, p) {
    return draw(g, window.Titans.frame(p), p.height);
  }
  function ninja(g, p) { return draw(g, window.Ninjas.frame(p), p.height); }
  async function loadNinjaForm(form) {
    const results = await Promise.all([...window.Ninjas.groups.map(group => load('ninja-' + form + '-' + group)), load('ninja-avatars'),load('ninja-techniques')]);
    return results.every(Boolean);
  }
  function ninjaMeta(name, index) {
    const atlas = atlases.get(name), cell = atlas?.cells[index];
    if (!cell) return { left:-1, right:1, top:-1.3, hand:{x:.46,y:-.56} };
    if (cell.ninjaMeta) return cell.ninjaMeta;
    const height = atlas.characterHeights[Math.floor(index / 8)], canvas = cell.image;
    const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let tip = cell.tip, sx=0, sy=0, count=0;
    const low = name.endsWith('-melee') && Math.floor(index / 4) % 2 === 1;
    const fire = name.endsWith('-ranged') && index >= 12;
    const blue = name.endsWith('-chakra') || name.endsWith('-ranged') && index < 8 && index >= 4;
    if (low) {
      let maxX=0, ySum=0, samples=0;
      for(let y=Math.floor(canvas.height*.55);y<canvas.height*.95;y++) for(let x=0;x<canvas.width;x++) {
        if(pixels[(y*canvas.width+x)*4+3]<180)continue;
        if(x>maxX){maxX=x;ySum=y;samples=1;}else if(x===maxX){ySum+=y;samples++;}
      }
      tip={x:maxX,y:ySum/Math.max(1,samples)};
    }
    if(blue || fire)for(let y=0;y<canvas.height*.8;y++)for(let x=0;x<canvas.width;x++){
      const i=(y*canvas.width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
      if(pixels[i+3]>150 && (fire ? y<canvas.height*.45&&r>180&&r>b+60&&g>70&&g<220&&r/g>1.25 : y>canvas.height*.25&&b>185&&g>140&&b>r+35)){sx+=x;sy+=y;count++;}
    }
    if(count>10)tip={x:sx/count,y:sy/count};
    return cell.ninjaMeta={left:-cell.anchor/height,right:(canvas.width-cell.anchor)/height,top:-cell.foot/height,
      hand:{x:(tip.x-cell.anchor)/height,y:(tip.y-cell.foot)/height}};
  }
  function ninjaPoint(form, character, pose, poseAge=0, actor={}) {
    const frame=window.Ninjas.frame({...actor,form,character,pose,poseAge});
    return ninjaMeta(frame.atlas,frame.row*4+frame.column).hand;
  }
  function ninjaLandmarks(form, character) {
    const frames={}, offset=character==='sasuke'?8:0;
    for(const group of window.Ninjas.groups){const name='ninja-'+form+'-'+group;
      for(let i=offset;i<offset+8;i++)frames[name+':'+i]=ninjaMeta(name,i);}
    for(let i=offset;i<offset+8;i++)frames['ninja-avatars:'+i]=ninjaMeta('ninja-avatars',i);
    for(let i=offset;i<offset+8;i++)frames['ninja-techniques:'+i]=ninjaMeta('ninja-techniques',i);
    return {frames,punch:ninjaPoint(form,character,'punch',.5),kick:ninjaPoint(form,character,'low-kick',.5),energy:ninjaPoint(form,character,'jutsu',.5)};
  }
  return { ready, load, landmarks, ritualContact, chargePoint, draw, fighter, saitama, monster, titan, ninja, loadNinjaForm, ninjaLandmarks, ninjaPoint };
})();

