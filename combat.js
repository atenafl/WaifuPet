'use strict';
const canvas = document.getElementById('battle');
const g = canvas.getContext('2d');
let frame = null, hovering = false;
window.battleAPI.onFrame((data) => { frame = data; render(); });
function render() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth, h = window.innerHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  if (!frame) return;
  const f = frame;
  if (f.kind === 'beam') {
    window.EnergyArt.beam(g, f);
    return;
  }
  g.save(); g.translate(w / 2, h / 2 + 92 * f.scale); g.scale(f.scale, f.scale);
  if (f.kind === 'monster') {
    g.globalAlpha = Math.min(1, f.opacity === undefined ? 1 : f.opacity);
    window.HeroArt.monster(g, f);
    if (f.hitAge !== undefined && f.hitAge < .4) impact(g, f.hitAge, '#ffe8a2');
  } else {
    g.globalAlpha = f.opacity === undefined ? 1 : f.opacity;
    const color = f.color || window.Transformations.color(f.form, f.kind);
    const speed = Math.hypot(f.vx || 0, f.vy || 0) / f.scale;
    for (let i = speed > 130 ? f.trail.length - 1 : 0; i > 0; i--) {
      const p = f.trail[i]; g.save();
      g.translate((p.x - f.x) / f.scale, (p.y - f.y) / f.scale);
      g.globalAlpha = (1 - i / f.trail.length) * .12;
      g.scale(f.dir, 1); window.HeroArt.fighter(g, f); g.restore();
    }
    const aura = f.super || f.pose === 'charge' || f.pose === 'blast' || f.pose === 'transform' || f.ritual;
    if (aura) {
      const col = color;
      const radial = g.createRadialGradient(0, -145, 25, 0, -145, 165);
      radial.addColorStop(0, col + '65'); radial.addColorStop(1, col + '00');
      g.fillStyle = radial; g.beginPath(); g.ellipse(0, -145, 100, 164, 0, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 9; i++) {
        const angle = i * .7 + f.time * .5, radius = 66 + Math.sin(f.time * 12 + i) * 8;
        g.strokeStyle = col + '90'; g.lineWidth = 1.3; g.beginPath();
        g.moveTo(Math.cos(angle) * radius, -140 + Math.sin(angle) * radius * 1.6);
        g.lineTo(Math.cos(angle + .08) * (radius + 12), -140 + Math.sin(angle + .08) * (radius + 12) * 1.6); g.stroke();
      }
    }
    g.save(); g.scale(f.dir, 1); window.HeroArt.fighter(g, f);
    if (f.impact > 0) impact(g, f.hitAge || 0, color, f.contact);
    g.restore();
    if (f.energyAttack && ['charge', 'blast'].includes(f.pose)) {
      const hand = f.pose === 'charge' ? window.AnimeArt.chargePoint(f) : f.energyHand;
      window.EnergyArt.charge(g, { x: hand.x * f.dir, y: hand.y }, f.energyAttack,
        f.pose === 'charge' ? f.chargeProgress : 1, f.time, f.dir);
    }
    if (f.pose === 'transform') {
      const pulse = Math.sin(Math.min(1, f.poseAge / 1.15) * Math.PI);
      g.strokeStyle = color; g.globalAlpha = pulse * .8; g.lineWidth = 4;
      g.beginPath(); g.ellipse(0, -135, 105 + f.poseAge * 58, 165 + f.poseAge * 45, 0, 0, Math.PI * 2); g.stroke();
    }
    if (f.fusionProgress > .72) {
      const flash = Math.min(1, (f.fusionProgress - .72) / .28);
      const light = g.createRadialGradient(0, -135, 0, 0, -135, 160);
      light.addColorStop(0, '#ffffff'); light.addColorStop(.35, '#c8faff' + Math.round(flash * 220).toString(16).padStart(2, '0'));
      light.addColorStop(1, '#c8faff00'); g.globalAlpha = flash;
      g.fillStyle = light; g.fillRect(-190, -330, 380, 360);
    }
  }
  g.restore();
}
function impact(g, age, color, point = { x: 0, y: -169 }) {
  g.save(); g.translate(point.x, point.y); g.globalAlpha = Math.max(0, 1 - age * 3);
  g.strokeStyle = color; g.lineWidth = 4 * Math.max(.15, 1 - age * 2);
  g.beginPath(); g.ellipse(0, 0, 20 + age * 130, 35 + age * 190, -.3, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6; g.beginPath(); g.moveTo(Math.cos(a) * 22, Math.sin(a) * 22);
    g.lineTo(Math.cos(a) * (48 + age * 90), Math.sin(a) * (48 + age * 90)); g.stroke();
  }
  g.restore();
}
function hit(e) {
  if (!frame || frame.kind === 'beam' || frame.opacity < .1) return false;
  const x = (e.clientX - innerWidth / 2) / frame.scale;
  const y = (e.clientY - innerHeight / 2 - 92 * frame.scale) / frame.scale;
  return Math.abs(x) < (frame.kind === 'monster' ? 85 : 115) && y > -305 && y < 20;
}
window.addEventListener('mousemove', (e) => {
  const over = hit(e);
  if (over !== hovering) { hovering = over; window.battleAPI.ignore(!over); }
  canvas.style.cursor = over ? 'pointer' : 'default';
});
window.addEventListener('mouseleave', () => { hovering = false; window.battleAPI.ignore(true); });
document.addEventListener('contextmenu', (e) => { e.preventDefault(); if (hit(e)) window.battleAPI.menu(); });
