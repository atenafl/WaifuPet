'use strict';

window.HeroArt = (() => {
  const TAU = Math.PI * 2;
  const ink = '#171b30';
  function path(g, points, fill, width = 2, stroke = ink) {
    g.beginPath();
    g.moveTo(...points[0]);
    for (const p of points.slice(1)) {
      if (p.length === 4) g.quadraticCurveTo(...p);
      else if (p.length === 6) g.bezierCurveTo(...p);
      else g.lineTo(...p);
    }
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (width) { g.lineWidth = width; g.strokeStyle = stroke; g.lineJoin = 'round'; g.stroke(); }
  }
  function ellipse(g, x, y, rx, ry, fill, width = 2) {
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU);
    g.fillStyle = fill; g.fill();
    if (width) { g.lineWidth = width; g.strokeStyle = ink; g.stroke(); }
  }
  function line(g, points, color = ink, width = 2) {
    g.beginPath(); g.moveTo(...points[0]);
    for (const p of points.slice(1)) g.lineTo(...p);
    g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
  }
  function gradient(g, x, y, x2, y2, colors) {
    const v = g.createLinearGradient(x, y, x2, y2);
    colors.forEach((c, i) => v.addColorStop(i / (colors.length - 1), c));
    return v;
  }
  function bone(g, a, b, width, color, shadow) {
    const an = Math.atan2(b.y - a.y, b.x - a.x);
    g.save(); g.translate(a.x, a.y); g.rotate(an);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    path(g, [[0, -width / 2], [len * .5, -width * .65, len, -width * .38],
      [len + width * .18, 0, len, width * .38], [len * .4, width * .6, 0, width / 2]],
    gradient(g, 0, -width / 2, 0, width / 2, [color, color, shadow]));
    line(g, [[len * .25, -width * .24], [len * .72, -width * .24]], '#ffffff40', 1.2);
    g.restore();
  }
  function ik(a, b, length, bend) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.max(.001, Math.hypot(dx, dy));
    const reach = Math.min(d, length * 2 - .1);
    const end = { x: a.x + dx / d * reach, y: a.y + dy / d * reach };
    const off = Math.sqrt(Math.max(0, length * length - reach * reach / 4));
    return { elbow: { x: (a.x + end.x) / 2 - dy / d * off * bend,
      y: (a.y + end.y) / 2 + dx / d * off * bend }, end };
  }
  function arm(g, shoulder, hand, suit, cuff, length, bend, bare = false) {
    const { elbow, end } = ik(shoulder, hand, length, bend);
    bone(g, shoulder, elbow, bare ? 16 : 19, suit, bare ? '#b96748' : '#5a4265');
    bone(g, elbow, end, 16, bare ? '#efb082' : cuff, bare ? '#a9654b' : '#70484e');
    ellipse(g, end.x, end.y, 10, 8, cuff);
    line(g, [[end.x - 4, end.y - 4], [end.x - 3, end.y + 2]], '#21203180', 1);
    line(g, [[end.x + 1, end.y - 4], [end.x + 2, end.y + 2]], '#21203180', 1);
    return end;
  }
  function capeState() { return Array.from({ length: 8 }, () => ({ x: 0, v: 0 })); }
  function stepCape(nodes, dt, wind, t) {
    for (let i = 0; i < nodes.length; i++) {
      const target = wind * i / nodes.length + Math.sin(t * 5 - i * .65) * (i + 1) * .65;
      const parent = i ? nodes[i - 1].x : 0;
      nodes[i].v += ((target - nodes[i].x) * 48 + (parent - nodes[i].x) * 20 - nodes[i].v * 10) * dt;
      nodes[i].x += nodes[i].v * dt;
    }
  }
  function cape(g, nodes) {
    const left = [], right = [];
    for (let i = 0; i < nodes.length; i++) {
      const y = -197 + i * 23;
      const width = 22 + i * 3.5;
      left.push([-width + nodes[i].x, y]); right.push([width + nodes[i].x, y]);
    }
    path(g, [...left, ...right.reverse()], gradient(g, -55, -180, 45, -20, ['#ffffff', '#dce4f2', '#9aaac5']), 1.7);
    for (const fraction of [-.55, -.15, .4]) {
      line(g, nodes.map((n, i) => [n.x + (22 + i * 3.5) * fraction, -195 + i * 23]), '#677e9d65', 1.2);
    }
  }
  function saitama(g, p) {
    if (window.AnimeArt && window.AnimeArt.saitama(g, p)) return true;
    const t = p.time, walk = p.walk ? Math.sin(p.phase) : 0;
    const crouch = p.crouch || 0;
    const suit = gradient(g, -26, -185, 30, -100, ['#ffe585', '#efba34', '#bc7b19']);
    cape(g, p.cape);
    for (const side of [-1, 1]) {
      const hip = { x: side * 14, y: -108 };
      const foot = { x: side * 20 + walk * side * 19, y: -7 - Math.max(0, walk * side) * 13 };
      if (p.air) { foot.x += side * 10; foot.y -= side > 0 ? 28 : 12; }
      if (p.sit) { foot.x += side * 22; foot.y -= 18; }
      const knee = ik(hip, foot, 53 - crouch * .15, -side).elbow;
      bone(g, hip, knee, 22, '#f3c448', '#bd7e22');
      const ankle = { x: foot.x, y: foot.y - 8 };
      bone(g, knee, ankle, 19, '#b93235', '#702531');
      path(g, [[foot.x - 10, foot.y - 17], [foot.x + 8, foot.y - 17],
        [foot.x + 11, foot.y - 4], [foot.x + 21, foot.y + 2, foot.x + 19, foot.y + 5],
        [foot.x - 12, foot.y + 5]], '#b83136');
      line(g, [[foot.x - 10, foot.y + 5], [foot.x + 19, foot.y + 5]], '#411e30', 3);
    }
    path(g, [[-25, -193], [-32, -163, -23, -108], [-8, -101, 23, -108],
      [31, -165, 25, -193], [0, -207, -25, -193]], suit);
    path(g, [[-20, -180], [-7, -169], [-10, -128], [-20, -114]], '#fff0a34a', 0);
    line(g, [[0, -194], [0, -116]], '#765529', 2);
    ellipse(g, 0, -181, 2, 4, '#dce7f2', 1);
    path(g, [[-25, -116], [25, -116], [24, -105], [-24, -105]], '#343447');
    ellipse(g, 0, -110, 9, 9, '#ffe17c'); ellipse(g, 0, -110, 5, 5, '#9d6630', 1);
    const hands = p.hands;
    arm(g, { x: -21, y: -189 }, hands[0], '#f4ca51', '#c83c40', 42, 1);
    arm(g, { x: 21, y: -189 }, hands[1], '#f4ca51', '#c83c40', 42, -1);
    for (const side of [-1, 1]) {
      ellipse(g, side * 22, -194, 12, 6, '#eef3fa'); ellipse(g, side * 22, -194, 4, 4, '#354156', 1);
    }
    g.save(); g.translate(0, -221 + (p.headDY || 0) * .35); g.rotate(p.tilt || 0);
    ellipse(g, -24, 3, 4, 7, '#e9ad88', 1.5); ellipse(g, 24, 3, 4, 7, '#e9ad88', 1.5);
    path(g, [[-23, 3], [-27, -34, 0, -36], [27, -34, 23, 6], [20, 22, 0, 25], [-20, 22, -23, 3]],
      gradient(g, -22, -22, 24, 15, ['#ffe3bf', '#efbd96', '#c98167']));
    path(g, [[-17, -16], [-16, -29, -3, -29], [4, -27, 5, -22], [-10, -20]], '#fff3df80', 0);
    const serious = p.serious;
    for (const s of [-1, 1]) {
      const x = s * 10;
      if (p.blink > .45) line(g, [[x - 6, 1], [x + 6, 1]], ink, 1.4);
      else {
        path(g, [[x - 6, serious ? -2 : -3], [x + 6, serious ? -5 : -3], [x + 5, 4], [x - 5, 4]], '#fffdf4', 1.2);
        ellipse(g, x + (p.look || 0) * .25, 1, serious ? 1.4 : 1.1, 2.1, ink, 0);
      }
      if (serious) line(g, [[x - 7, -9 + s * 2], [x + 6, -9 - s * 2]], ink, 2.3);
    }
    line(g, [[1, 3], [-1, 9], [3, 10]], '#9e6558', 1.2);
    line(g, [[-5, 17], [5, 17]], ink, 1.3);
    g.restore();
  }
  function fighter(g, p) {
    if (window.AnimeArt && window.AnimeArt.fighter(g, p)) return;
    const vegeta = p.kind === 'vegeta', t = p.time;
    const strike = p.pose === 'strike', kick = p.pose === 'kick', charge = p.pose === 'charge';
    const recoil = p.pose === 'recoil';
    const motion = p.motion || { strike: strike ? 1 : 0, kick: kick ? 1 : 0, charge: charge ? 1 : 0, recoil: recoil ? 1 : 0 };
    const mix = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
    g.save(); g.rotate(p.tilt || 0);
    const cloth = vegeta ? '#304fab' : '#f78124', shadow = vegeta ? '#152450' : '#ab3b22';
    const hips = [{ x: -13, y: -104 }, { x: 14, y: -104 }];
    const feet = [mix({ x: -34, y: -19 + Math.sin(t * 6) * 5 }, { x: -44, y: -27 }, motion.kick),
      mix({ x: 28, y: -34 - Math.sin(t * 6) * 5 }, { x: 99, y: -123 }, motion.kick)];
    for (let i = 0; i < 2; i++) {
      const knee = ik(hips[i], feet[i], 53, i ? -1 : 1).elbow;
      bone(g, hips[i], knee, 25, cloth, shadow);
      bone(g, knee, feet[i], 21, cloth, shadow);
      const f = feet[i];
      path(g, [[f.x - 11, f.y - 16], [f.x + 9, f.y - 14], [f.x + 17, f.y + 8],
        [f.x - 9, f.y + 9]], vegeta ? '#eff4ff' : '#233d75');
      line(g, [[f.x - 9, f.y + 9], [f.x + 17, f.y + 8]], vegeta ? '#c4a257' : '#a52e2e', 3);
    }
    const back = mix({ x: -17, y: -157 }, { x: -7, y: -174 }, motion.charge);
    arm(g, { x: -27, y: -184 }, back, vegeta ? cloth : '#efb082', vegeta ? '#eff4ff' : '#253d72', 39, 1, !vegeta);
    path(g, [[-31, -189], [-39, -166, -26, -148], [-23, -126, -25, -109], [0, -103, 25, -109], [23, -126, 26, -148], [39, -166, 31, -189],
      [0, -203, -31, -189]], gradient(g, -30, -190, 32, -110, [cloth, cloth, shadow]));
    if (vegeta) {
      path(g, [[-30, -190], [-31, -162], [-22, -136], [22, -136], [31, -162], [30, -190],
        [19, -175], [-19, -175]], '#f0f4fc');
      path(g, [[-22, -135], [22, -135], [25, -110], [-25, -110]], '#d4af69');
      for (let y = -129; y < -110; y += 5) line(g, [[-22, y], [22, y]], '#866a47', 1);
      line(g, [[-29, -182], [-21, -172]], '#d4af69', 6); line(g, [[29, -182], [21, -172]], '#d4af69', 6);
    } else {
      path(g, [[-28, -190], [0, -163], [28, -190], [20, -195], [0, -180], [-20, -195]], '#253b74');
      path(g, [[-25, -121], [25, -121], [24, -106], [-24, -106]], '#243c79');
      path(g, [[-8, -111], [-24, -88], [-5, -95], [5, -112]], '#243c79');
      ellipse(g, 18, -155, 10, 10, '#ffefcf', 1.4);
      g.font = 'bold 14px sans-serif'; g.fillStyle = ink; g.textAlign = 'center'; g.fillText('悟', 18, -150);
      line(g, [[-22, -153], [-13, -143], [-19, -129]], '#9e3928', 1.3);
      path(g, [[-23, -177], [-15, -158], [-4, -148], [-8, -168]], '#ffc27170', 0);
      path(g, [[6, -156], [23, -173], [26, -155], [11, -145]], '#b94d2445', 0);
      line(g, [[-7, -141], [-1, -130], [-7, -126]], '#9e3928', 1.3);
    }
    let hand = mix({ x: 45, y: -171 }, { x: 112, y: -183 }, motion.strike);
    hand = mix(hand, { x: 8, y: -164 }, motion.charge);
    hand = mix(hand, { x: 48, y: -212 }, motion.recoil);
    arm(g, { x: 27, y: -184 }, hand, vegeta ? cloth : '#efb082', vegeta ? '#eff4ff' : '#253d72', strike ? 44 : 39, -1, !vegeta);
    g.save(); g.translate(0, -221); g.rotate(recoil ? -.18 : .05);
    ellipse(g, -25, 3, 5, 8, '#e8aa80'); ellipse(g, 25, 3, 5, 8, '#e8aa80');
    path(g, [[-25, -18], [25, -18], [24, 10], [12, 26], [-5, 27], [-23, 13]],
      gradient(g, -23, -15, 24, 19, ['#ffdab0', '#edb183', '#bc7154']));
    const hair = p.super ? '#ffe77a' : '#111526';
    const spikes = vegeta ? [[-27, 0], [-36, -33], [-23, -26], [-23, -55], [-9, -42], [0, -72],
      [10, -44], [25, -61], [23, -28], [35, -35], [27, 0], [13, -20], [0, -6], [-13, -20]] :
      [[-27, 0], [-48, -17], [-30, -22], [-51, -41], [-23, -34], [-25, -65], [-8, -49],
        [6, -77], [14, -45], [39, -57], [29, -29], [48, -28], [25, 2], [13, -18], [3, -6], [-4, -23], [-17, -4]];
    path(g, spikes, gradient(g, -30, -60, 30, 0, [p.super ? '#fff6bb' : '#36425a', hair, hair]));
    for (const s of [-1, 1]) {
      path(g, [[s * 4, 3], [s * 20, -1], [s * 18, 7], [s * 6, 7]], '#ffffff', 1.2);
      ellipse(g, s * 10 + 1, 4, 2, 2.4, p.super ? '#248c84' : ink, 0);
      line(g, [[s * 3, -1], [s * 21, -6]], hair, 3);
    }
    line(g, [[3, 6], [0, 13], [5, 13]], '#9c5e47', 1.2);
    line(g, [[-5, 20], [8, 18]], ink, 1.5);
    line(g, [[-20, 12], [-15, 14]], '#aa6956', 1); g.restore(); g.restore();
  }
  function monster(g, p) {
    if (window.AnimeArt && window.AnimeArt.monster(g, p)) return;
    const t = p.time, variant = p.variant || 0;
    const colors = [['#9fd571', '#385e48'], ['#cf8ddf', '#493554'], ['#71c5d5', '#29425e']][variant % 3];
    g.save(); g.rotate(p.rotation || 0);
    for (const s of [-1, 1]) {
      bone(g, { x: s * 21, y: -70 }, { x: s * 35, y: -15 }, 28, colors[0], colors[1]);
      path(g, [[s * 35 - 15, -21], [s * 35 + 17, -21], [s * 35 + 24, 1], [s * 35 - 20, 1]], colors[1]);
      const hand = { x: s * (65 + Math.sin(t * 5) * 6), y: -88 + Math.cos(t * 5) * 9 };
      arm(g, { x: s * 38, y: -152 }, hand, colors[0], colors[0], 38, -s);
      for (let i = -1; i < 2; i++) path(g, [[hand.x + i * 7, hand.y], [hand.x + i * 7 + 4, hand.y + 16],
        [hand.x + i * 7 + 7, hand.y + 2]], '#eee4c0', 1);
    }
    path(g, [[-38, -166], [-64, -119, -36, -65], [0, -45, 36, -65], [64, -119, 38, -166]],
      gradient(g, -45, -155, 45, -60, [colors[0], colors[1]]));
    for (const s of [-1, 1]) {
      path(g, [[s * 28, -156], [s * 65, -179], [s * 44, -133]], '#e1dbbf');
      path(g, [[s * 28, -190], [s * 39, -233], [s * 13, -196]], '#e1dbbf');
    }
    ellipse(g, 0, -173, 37, 36, colors[0]);
    for (const s of [-1, 1]) {
      path(g, [[s * 4, -181], [s * 27, -190], [s * 24, -174], [s * 7, -173]], '#fff4ac');
      ellipse(g, s * 15, -179, 2.5, 5, '#d12950', 0);
    }
    path(g, [[-22, -156], [0, -148, 22, -156], [13, -139], [-13, -139]], '#281b31');
    for (let x = -14; x < 18; x += 8) path(g, [[x, -153], [x + 5, -151], [x + 2, -145]], '#fffce5', 0);
    for (let i = 0; i < 3; i++) line(g, [[-23, -111 + i * 13], [0, -104 + i * 13], [23, -111 + i * 13]], colors[1], 3);
    g.restore();
  }
  return { saitama, fighter, monster, capeState, stepCape };
})();
