(function (root) {
  'use strict';
  const tau = Math.PI * 2;
  function sphere(g, x, y, r, p, time) {
    const light = g.createRadialGradient(x, y, 0, x, y, r * 2.2);
    light.addColorStop(0, p.core); light.addColorStop(.2, p.core); light.addColorStop(.42, p.color + 'dc');
    light.addColorStop(1, p.color + '00'); g.fillStyle = light;
    g.beginPath(); g.arc(x, y, r * 2.2, 0, tau); g.fill();
    g.strokeStyle = p.color; g.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.ellipse(x, y, r * (1.1 + i * .16), r * .48, time * 2 + i, 0, tau); g.stroke();
    }
  }
  function charge(g, point, attack, progress, time, dir) {
    const p = root.EnergyAttacks.get(attack), q = Math.max(.02, Math.min(1, progress));
    g.save(); g.translate(point.x, point.y); g.globalCompositeOperation = 'lighter';
    const r = (9 + p.width * .65 * q) * (1 + Math.sin(time * 31) * .06);
    for (let i = 0; i < 22; i++) {
      const angle = i * 2.399 + time * .8, cycle = (time * 1.9 + i * .137) % 1;
      const d = r + (1 - cycle) * (55 + 30 * q);
      g.globalAlpha = cycle * q; g.strokeStyle = p.color; g.lineWidth = 1 + q;
      g.beginPath(); g.moveTo(Math.cos(angle) * d, Math.sin(angle) * d);
      g.lineTo(Math.cos(angle) * (d + 11), Math.sin(angle) * (d + 11)); g.stroke();
    }
    g.globalAlpha = .5 + .5 * q; sphere(g, 0, 0, r, p, time);
    if (p.style === 'flash' || p.style === 'eruption') {
      g.strokeStyle = p.color; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const angle = i * 1.256 + time * 2, d = r + 35 * q;
        g.beginPath(); g.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        g.lineTo(Math.cos(angle + .2) * d, Math.sin(angle + .2) * d);
        g.lineTo(Math.cos(angle) * (d + 12), Math.sin(angle) * (d + 12)); g.stroke();
      }
    }
    g.restore();
  }
  function explosion(g, end, p, age, time, scale) {
    if (age < 0) return;
    const q = Math.min(1, age / p.hold), r = (20 + Math.sqrt(q) * p.impact) * scale;
    g.save(); g.globalAlpha *= Math.max(0, 1 - q);
    sphere(g, end.x, end.y, r * .43, p, time);
    g.strokeStyle = p.color; g.lineWidth = (4 - q * 3) * scale;
    for (let i = 0; i < 2; i++) {
      g.beginPath(); g.ellipse(end.x, end.y, r * (1 + i * .25), r * (.65 + i * .13), -.3, 0, tau); g.stroke();
    }
    for (let i = 0; i < 24; i++) {
      const angle = i * 2.399, d = r * (.6 + (i % 5) * .13);
      g.lineWidth = (i % 3 + 1) * scale; g.strokeStyle = i % 3 ? p.color : p.core;
      g.beginPath(); g.moveTo(end.x + Math.cos(angle) * d, end.y + Math.sin(angle) * d);
      g.lineTo(end.x + Math.cos(angle) * (d + (12 + i % 7 * 4) * scale), end.y + Math.sin(angle) * (d + (12 + i % 7 * 4) * scale)); g.stroke();
    }
    g.restore();
  }
  function beam(g, f) {
    const p = root.EnergyAttacks.get(f.attack), s = f.scale, time = f.time;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const shot of f.shots) {
      const start = f.start, target = shot.target || f.target;
      const end = { x: start.x + (target.x - start.x) * shot.progress,
        y: start.y + (target.y - start.y) * shot.progress + shot.arc };
      g.save(); g.globalAlpha = shot.alpha;
      if (p.style === 'barrage') {
        const dx = target.x - start.x, dy = target.y - start.y, len = Math.hypot(dx, dy) || 1;
        const tail = (45 + p.width) * s;
        g.strokeStyle = p.color + '88'; g.lineWidth = p.width * s; g.lineCap = 'round';
        g.beginPath(); g.moveTo(end.x - dx / len * tail, end.y - dy / len * tail); g.lineTo(end.x, end.y); g.stroke();
        sphere(g, end.x, end.y, p.width * .7 * s, p, time + shot.index);
      } else {
        const dx = end.x - start.x, dy = end.y - start.y, len = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
        const radius = p.width * s * (.8 + Math.sin(time * 27) * .06);
        g.save(); g.translate(start.x, start.y); g.rotate(angle);
        const gradient = g.createLinearGradient(0, -radius * 1.8, 0, radius * 1.8);
        gradient.addColorStop(0, p.color + '00'); gradient.addColorStop(.25, p.color + '95');
        gradient.addColorStop(.44, p.color); gradient.addColorStop(.5, p.core);
        gradient.addColorStop(.56, p.color); gradient.addColorStop(.75, p.color + '95'); gradient.addColorStop(1, p.color + '00');
        g.fillStyle = gradient; g.beginPath(); g.moveTo(0, -radius * .55);
        g.bezierCurveTo(len * .15, -radius * 1.7, len * .7, -radius * 1.65, len, -radius);
        g.quadraticCurveTo(len + radius * .75, 0, len, radius);
        g.bezierCurveTo(len * .7, radius * 1.65, len * .15, radius * 1.7, 0, radius * .55); g.closePath(); g.fill();
        for (let i = 0; i < 7; i++) {
          g.strokeStyle = i % 2 ? p.core + 'b0' : p.color; g.lineWidth = (i % 3 + 1) * s;
          g.beginPath();
          for (let x = 0; x <= len; x += 6 * s) {
            const y = Math.sin(x / (p.style === 'spiral' ? 19 : 48) / s - time * (p.style === 'spiral' ? 17 : 11) + i) * radius * (p.style === 'spiral' ? .72 : .17) + (i - 3) * radius * .18;
            if (!x) g.moveTo(x, y); else g.lineTo(x, y);
          }
          g.stroke();
        }
        for (let i = 0; i < 8; i++) {
          const x = ((time * (p.style === 'flash' ? 850 : 500) * s + i * len / 8) % Math.max(1, len));
          g.strokeStyle = p.core + 'aa'; g.lineWidth = 1.3 * s;
          g.beginPath(); g.ellipse(x, 0, 5 * s, radius * 1.1, 0, 0, tau); g.stroke();
        }
        g.restore();
        sphere(g, start.x, start.y, radius * .8, p, time);
        sphere(g, end.x, end.y, radius, p, time + 1);
      }
      if (shot.landed) explosion(g, target, p, shot.impactAge, time, s);
      g.restore();
    }
    g.restore();
  }
  root.EnergyArt = { charge, beam };
})(window);
