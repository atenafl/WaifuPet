'use strict';

window.AnimeArt = (() => {
  const atlases = new Map();
  const kind = new URLSearchParams(window.location.search).get('kind');
  const files = kind === 'beam' ? [] : kind === 'monster' ? ['monsters'] : ['goku', 'vegeta'].includes(kind) ?
    [kind, 'super-saiyan'] : ['goku', 'vegeta', 'saitama', 'super-saiyan', 'monsters'];
  const anchors = { saitama: [[.72, .72, .72, .72], [.70, .70, .70, .70], [.71, .71, .64, .74], [.59, .69, .71, .74]],
    monsters: [[.39, .40, .53, .48], [.48, .48, .52, .70], [.52, .52, .57, .69], [.52, .52, .54, .69]] };
  function components(pixels, width, height) {
    const labels = new Int32Array(width * height);
    const queue = new Int32Array(width * height);
    const result = [];
    let id = 0;
    for (let start = 0; start < labels.length; start++) {
      if (labels[start] || pixels[start * 4 + 3] < 24) continue;
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
            if (!labels[neighbor] && pixels[neighbor * 4 + 3] >= 24) {
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
      const { figures, labels, count } = components(pixels, canvas.width, canvas.height);
      const cells = [];
      if (figures.length !== 16 || (name.startsWith('fusion-') && count !== 16)) {
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
          anchor: column * cw + cw * anchor - figure.minX + padding, tip: { x: tipX, y: tipY / Math.max(1, samples) } });
      }
      const transformed = (window.Transformations.get(name).id === name && name !== 'base') || name.startsWith('fusion-');
      const heights = cells.map((cell) => cell.image.height).sort((a, b) => a - b);
      atlases.set(name, { cells, height: transformed ? heights[8] : image.naturalHeight / 4 });
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
    const offset = typeof kind === 'number' ? kind : kind === 'vegeta' ? 8 : 0, scale = 278 / atlas.height;
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
  function draw(g, frame, height) {
    const atlas = atlases.get(frame.atlas);
    if (!atlas) return false;
    const cell = atlas.cells[frame.row * 4 + frame.column];
    const scale = height / atlas.height;
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
  return { ready, load, landmarks, ritualContact, draw, fighter, saitama, monster };
})();
