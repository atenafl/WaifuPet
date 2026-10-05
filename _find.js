(function () {
  if (window.__findOn) { window.__hits.length = 0; return 'reset'; }
  window.__findOn = true;
  window.__hits = [];
  const proto = CanvasRenderingContext2D.prototype;
  const TX = 235, TY = 244, R = 14;
  function xf(ctx, x, y) {
    let m;
    try { m = ctx.getTransform(); } catch (e) { m = { a: ctx.m11, b: ctx.m12, c: ctx.m21, d: ctx.m22, e: ctx.m20, f: ctx.m21 }; }
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, s: Math.hypot(m.a, m.b) };
  }
  function rec(kind, ctx, x, y, rx, ry) {
    const p = xf(ctx, x, y);
    if (Math.hypot(p.x - TX, p.y - TY) > R) return;
    const st = (new Error().stack || '').split('\n').filter((l) => l.indexOf('pet.js') >= 0).slice(0, 4);
    window.__hits.push({ k: kind, cx: +p.x.toFixed(1), cy: +p.y.toFixed(1), rx: +(rx * p.s).toFixed(1), ry: +(ry * p.s).toFixed(1), lw: +ctx.lineWidth.toFixed(2), ss: ctx.strokeStyle, fs: ctx.fillStyle, st: st.map((s) => s.trim().replace(/^at /, '')) });
  }
  const oe = proto.ellipse;
  proto.ellipse = function (x, y, rx, ry) { rec('ellipse', this, x, y, rx, ry); return oe.apply(this, arguments); };
  const oa = proto.arc;
  proto.arc = function (x, y, r) { rec('arc', this, x, y, r, r); return oa.apply(this, arguments); };
  return 'armed';
})()
