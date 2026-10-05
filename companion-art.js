'use strict';
window.CompanionArt=(()=>{
  function render(g,a,width,height){
    g.save();g.translate(a.originX??width/2,a.foot);g.globalAlpha=a.opacity;
    if(['emerge','dismiss'].includes(a.pose)){
      const progress=Math.min(1,a.poseAge/.95);
      const pulse=Math.sin(progress*Math.PI);
      g.save();g.scale(1,.22);const glow=g.createRadialGradient(0,0,0,0,0,a.height*.65);
      glow.addColorStop(0,a.color+'c0');glow.addColorStop(1,a.color+'00');g.fillStyle=glow;
      g.beginPath();g.arc(0,0,a.height*(.25+pulse*.35),0,Math.PI*2);g.fill();g.restore();
    }
    g.save();g.scale(a.dir,1);
    window.AnimeArt.companion(g,a);
    if(a.effect==='hamon'){
      g.strokeStyle='#ffed9b';g.lineWidth=2;
      for(let i=0;i<6;i++){const phase=a.time*9+i;g.beginPath();g.arc(a.height*.15,-a.height*.55,a.height*(.09+i*.025),phase,phase+.8);g.stroke();}
    }else if(a.effect==='hermit-purple'){
      g.strokeStyle='#ac68e5';g.lineWidth=a.height*.015;g.lineCap='round';
      for(let i=0;i<3;i++){
        g.beginPath();g.moveTo(-a.height*.12,-a.height*.55);
        g.bezierCurveTo(-a.height*.5,-a.height*.8,a.height*(.6+.04*Math.sin(a.time*3+i)),-a.height*.65,a.height*.35,-a.height*.24);g.stroke();
        for(let t=0;t<6;t++){const x=a.height*(t*.09-.12),y=-a.height*(.56+.12*Math.sin(t+i+a.time));g.beginPath();g.moveTo(x,y);g.lineTo(x+a.height*.035,y-a.height*.06);g.stroke();}
      }
    }
    g.restore();g.restore();
  }
  return {render};
})();

