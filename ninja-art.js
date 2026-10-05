'use strict';
window.NinjaArt = (() => {
  const circle = (g, x, y, r, colors) => {
    const gradient = g.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.25, colors[0]); gradient.addColorStop(.6, colors[1]); gradient.addColorStop(1, colors[1] + '00');
    g.fillStyle = gradient; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  };
  function chakra(g, x, y, radius, attack, time) {
    const fire = attack === 'katon';
    circle(g, x, y, radius * 1.7, fire ? ['#fff3a4', '#ff6b22'] : ['#c5fbff', '#3cafff']);
    g.save(); g.translate(x, y); g.rotate(time * (attack === 'rasenshuriken' ? 12 : 4));
    if (attack === 'chidori') {
      g.strokeStyle = '#e5fbff'; g.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4 + Math.sin(time * 30 + i) * .15;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(angle + .3) * radius, Math.sin(angle + .3) * radius);
        g.lineTo(Math.cos(angle) * radius * 1.9, Math.sin(angle) * radius * 1.9); g.stroke();
      }
    } else {
      for (let i = 0; i < 4; i++) {
        g.strokeStyle = fire ? '#ffcf66' : '#edffff'; g.lineWidth = 1.7;
        g.beginPath(); g.ellipse(0, 0, radius * (.4 + i * .13), radius * .3, i * .7, 0, Math.PI * 2); g.stroke();
      }
      if (attack === 'rasenshuriken') {
        g.fillStyle = '#d5fbffb0';
        for (let i = 0; i < 4; i++) {
          g.save(); g.rotate(i * Math.PI / 2); g.beginPath(); g.moveTo(radius * .45, -radius * .25);
          g.lineTo(radius * 2.6, 0); g.lineTo(radius * .45, radius * .25); g.fill(); g.restore();
        }
      }
    }
    g.restore();
  }
  function render(g, f, width, height) {
    if (f.kind === 'ninja-effects') {
      for(const shot of f.shots||[]){
        g.save();g.translate(shot.x,shot.y);
        if(shot.attack==='shuriken'){
          g.rotate(f.time*22);g.fillStyle='#b8c9df';g.strokeStyle='#364355';g.lineWidth=2*f.scale;
          g.beginPath();for(let i=0;i<8;i++){const angle=i*Math.PI/4,r=(i%2?5:19)*f.scale;const x=Math.cos(angle)*r,y=Math.sin(angle)*r;if(i)g.lineTo(x,y);else g.moveTo(x,y);}g.closePath();g.fill();g.stroke();
          g.fillStyle='#152031';g.beginPath();g.arc(0,0,3*f.scale,0,Math.PI*2);g.fill();
        }else if(shot.attack==='katon'){
          const r=(22+Math.min(.35,shot.age)*65)*f.scale;circle(g,0,0,r*1.5,['#ffe97e','#ff4823']);
          for(let i=0;i<7;i++){g.fillStyle=i%2?'#ffe5a5':'#ff792c';g.beginPath();g.ellipse(-shot.dx*r*.8+Math.sin(f.time*25+i)*r*.5,Math.cos(i*2)*r*.5,r*(.45+.12*Math.sin(f.time*16+i)),r*.2,Math.atan2(shot.dy,shot.dx),0,Math.PI*2);g.fill();}
        }else chakra(g,0,0,24*f.scale,shot.attack,f.time);
        g.restore();
      }
      if(f.fire){g.save();g.translate(f.fire.x,f.fire.y);g.globalAlpha=Math.min(1,f.fire.age*5,Math.max(0,(f.fire.duration-f.fire.age)*4));
        circle(g,0,-12*f.scale,55*f.scale,['#bd3564','#692465']);
        for(let i=0;i<9;i++){const x=(i-4)*8*f.scale,h=(35+18*Math.sin(f.time*15+i))*f.scale;g.fillStyle=i%2?'#090813':'#241024';g.beginPath();g.moveTo(x-9*f.scale,15*f.scale);g.quadraticCurveTo(x-14*f.scale,-h*.5,x+Math.sin(f.time*18+i)*9*f.scale,-h);g.quadraticCurveTo(x+18*f.scale,-h*.3,x+9*f.scale,15*f.scale);g.fill();}g.restore();}
      return;
    }
    g.save(); g.translate(f.originX ?? width / 2, f.foot); g.globalAlpha = f.opacity;
    if (f.pose === 'transform' || f.pose === 'charge' || ['red-mark', 'tail-curse', 'kurama-eternal', 'sixpaths-rinnegan'].includes(f.form)) {
      const pulse = f.pose === 'transform' ? Math.sin(Math.min(1, f.poseAge / 1.3) * Math.PI) : .28;
      const aura = g.createRadialGradient(0, -f.height * .55, 0, 0, -f.height * .55, f.height * .65);
      aura.addColorStop(0, f.color + '40'); aura.addColorStop(1, f.color + '00');
      g.fillStyle = aura; g.globalAlpha *= .4 + pulse; g.fillRect(-f.height * .65, -f.height * 1.2, f.height * 1.3, f.height * 1.3); g.globalAlpha = f.opacity;
    }
    for (let i = (f.trail?.length || 0) - 1; i > 1; i--) {
      const p = f.trail[i]; g.save(); g.translate(p.x - f.x, p.y - f.y); g.globalAlpha *= (1 - i / f.trail.length) * .18;
      g.scale(f.dir, 1); window.AnimeArt.ninja(g, f); g.restore();
    }
    g.save(); g.scale(f.dir, 1);
    if (f.pose === 'recoil') { g.translate(0, -f.height * .5); g.rotate(-.1); g.translate(0, f.height * .5); }
    window.AnimeArt.ninja(g, f);
    if(f.jutsu==='amaterasu'&&f.pose==='eye'&&f.poseAge>.3)circle(g,f.height*.13,-f.height*.85,f.height*.035,['#ffb0b6','#d61342']);
    if (['rasengan','chidori','rasenshuriken'].includes(f.jutsu) && ['charge', 'jutsu','seal'].includes(f.pose)) {
      const point = window.AnimeArt.ninjaPoint(f.form, f.character, f.pose, f.poseAge, f);
      const radius = f.height * .075 * (f.pose === 'charge' ? .4 + Math.min(1, f.poseAge / .8) * .6 : 1);
      chakra(g, point.x * f.height, point.y * f.height, radius, f.jutsu, f.time);
    }
    g.restore();
    if(f.swapFlash>0){g.save();g.globalAlpha*=f.swapFlash/.4;circle(g,0,-f.height*.55,f.height*.65,['#ffffff','#af6cff']);g.restore();}
    if (f.impact > 0 && f.contact) {
      const age = f.hitAge; g.save(); g.globalAlpha *= f.impact;
      circle(g, f.contact.x, f.contact.y, f.height * (.08 + age * .4), ['#fff5cd', '#ffc769']);
      g.strokeStyle = '#fff5d4'; g.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const angle = i * Math.PI / 5; g.beginPath(); g.moveTo(f.contact.x, f.contact.y);
        g.lineTo(f.contact.x + Math.cos(angle) * f.height * (.13 + age * .5), f.contact.y + Math.sin(angle) * f.height * (.13 + age * .5)); g.stroke();
      }
      g.restore();
    }
    g.restore();
  }
  return { render };
})();
