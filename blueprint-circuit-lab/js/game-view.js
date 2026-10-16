(function(){
  const CB=window.CB;
  let canvas=null,ctx=null,raf=0,lastFrame=0,lastAccepted=0,mouseDown=false;
  const palette=["🧑","🤖","👾","🐱","🐸","🦊","🐼","🚀","⭐","🟡","💎","❤️","🌳","🏠","🔥","✨","🧱","🎯","🍄","⚡","🪙","🛡️","🚗","🪐","👻","🐉","🐟","🎁","🔑","🚪","☁️","🌙"];
  function spritesForDraw(){return CB.engine&&CB.engine.running?CB.state.runtime.sprites:(CB.state.project?CB.state.project.sprites:[]);}
  function getScene(){return CB.state.project&&CB.state.project.scene||{width:640,height:400,background:"#111827"};}
  function scenePos(event){
    const r=canvas.getBoundingClientRect(),scene=getScene();
    return {x:Math.max(0,Math.min(scene.width,(event.clientX-r.left)/r.width*scene.width)),y:Math.max(0,Math.min(scene.height,(event.clientY-r.top)/r.height*scene.height))};
  }
  function render(){
    if(!canvas||!ctx)return;
    const scene=getScene(),width=Number(scene.width)||640,height=Number(scene.height)||400;
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    ctx.clearRect(0,0,width,height);ctx.fillStyle=CB.engine&&CB.engine.running?(CB.state.runtime.background||scene.background):scene.background||"#111827";ctx.fillRect(0,0,width,height);
    ctx.save();ctx.globalAlpha=.17;ctx.strokeStyle="#8597b9";ctx.lineWidth=1;
    for(let x=0;x<=width;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
    for(let y=0;y<=height;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    ctx.restore();
    ctx.strokeStyle="#ffffff18";ctx.strokeRect(.5,.5,width-1,height-1);
    const sprites=spritesForDraw(),editing=!(CB.engine&&CB.engine.running);
    sprites.forEach(function(sprite){
      if(sprite.visible===false)return;
      const size=Math.max(8,Math.min(140,Number(sprite.size)||38)),x=Number(sprite.x)||0,y=Number(sprite.y)||0;
      ctx.save();ctx.globalAlpha=sprite.opacity===undefined?1:Math.max(0,Math.min(1,Number(sprite.opacity)));
      ctx.shadowColor="#0009";ctx.shadowBlur=10;ctx.shadowOffsetY=3;
      if(sprite.shape==="circle"){ctx.fillStyle=sprite.color||"#91a7ff";ctx.beginPath();ctx.arc(x,y,size/2,0,Math.PI*2);ctx.fill();}
      else if(sprite.shape==="square"){ctx.fillStyle=sprite.color||"#91a7ff";ctx.fillRect(x-size/2,y-size/2,size,size);}
      else if(sprite.shape==="triangle"){ctx.fillStyle=sprite.color||"#91a7ff";ctx.beginPath();ctx.moveTo(x,y-size/2);ctx.lineTo(x+size/2,y+size/2);ctx.lineTo(x-size/2,y+size/2);ctx.closePath();ctx.fill();}
      else{
        ctx.fillStyle=sprite.color||"#ffffff";ctx.beginPath();ctx.arc(x,y,size*.49,0,Math.PI*2);ctx.fill();
      }
      ctx.shadowBlur=0;ctx.shadowOffsetY=0;
      ctx.font=Math.round(size*.72)+"px system-ui, Apple Color Emoji, Segoe UI Emoji";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(sprite.emoji||"⭐",x,y+1);
      if(editing&&CB.state.selectedSpriteId===sprite.id){
        ctx.strokeStyle="#adbbff";ctx.lineWidth=2;ctx.setLineDash([5,3]);ctx.beginPath();ctx.arc(x,y,size*.72,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle="#dce4ff";ctx.font="10px system-ui";ctx.textAlign="center";ctx.textBaseline="bottom";ctx.fillText(sprite.name||"Sprite",x,y-size*.65-5);
      }
      ctx.restore();
    });
    if(CB.engine&&CB.engine.running){
      ctx.fillStyle="#ffffffd9";ctx.fillRect(10,10,88,25);ctx.fillStyle="#182130";ctx.font="bold 12px system-ui";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText("SCORE  "+(CB.state.runtime.score||0),17,23);
      const message=CB.state.runtime.message;if(message){ctx.font="bold 16px system-ui";ctx.textAlign="center";ctx.textBaseline="top";ctx.fillStyle="#08101caa";ctx.fillRect(width*.15,height-49,width*.7,35);ctx.fillStyle="#ffffff";ctx.fillText(String(message).slice(0,55),width/2,height-42);}
    }
    const stateLabel=document.getElementById("gameStateLabel");if(stateLabel)stateLabel.textContent=CB.engine&&CB.engine.running?"RUNNING":"EDIT MODE";
    const sizeLabel=document.getElementById("sceneSizeLabel");if(sizeLabel)sizeLabel.textContent=width+" × "+height;
  }
  function loop(now){
    raf=requestAnimationFrame(loop);
    const target=Number(CB.state.settings.maxFps)||0;
    const minInterval=target>0?1000/target:0;
    if(now-lastAccepted<minInterval-0.5)return;
    const delta=lastFrame?Math.min(.1,(now-lastFrame)/1000):1/60;
    lastFrame=now;lastAccepted=now;
    if(CB.engine&&CB.engine.frame)CB.engine.frame(delta,now);
    render();
  }
  function addSprite(emoji,x,y){
    if(!CB.state.project)return null;
    const n=CB.state.project.sprites.length+1;
    const sprite={id:CB.uniqueId("sprite"),name:"Sprite "+n,emoji:emoji||"⭐",x:x===undefined?160+(n%5)*45:x,y:y===undefined?120+(n%4)*40:y,size:38,color:"#ffffff",speed:180,visible:true,opacity:1,shape:"emoji",vx:0,vy:0};
    CB.state.project.sprites.push(sprite);CB.state.selectedSpriteId=sprite.id;
    CB.touch("Added sprite");if(CB.ui){CB.ui.renderSpriteInspector();CB.ui.renderInspector();}
    render();return sprite;
  }
  function createRuntimeSprite(name,emoji,x,y){
    const runtime=CB.state.runtime;runtime.sprites=runtime.sprites||[];
    let finalName=String(name||"Sprite"),count=1;while(runtime.sprites.some(function(s){return s.name===finalName;})){finalName=String(name||"Sprite")+" "+(++count);}
    const scene=getScene();
    const sprite={id:CB.uniqueId("runtime-sprite"),name:finalName,emoji:emoji||"⭐",x:Math.max(0,Math.min(scene.width,Number(x)||0)),y:Math.max(0,Math.min(scene.height,Number(y)||0)),size:38,color:"#ffffff",speed:180,visible:true,opacity:1,shape:"emoji",vx:0,vy:0};
    runtime.sprites.push(sprite);return sprite;
  }
  function findRuntimeSprite(name){return (CB.state.runtime.sprites||[]).find(function(s){return s.name===name;})||null;}
  function findSprite(name,list){return (list||spritesForDraw()).find(function(s){return s.name===name;})||null;}
  function moveByInput(name,speed,keys,delta){
    const sprite=findRuntimeSprite(name);if(!sprite)return;
    keys=keys||CB.state.keys;let x=0,y=0;
    if(keys.w||keys.arrowup)y-=1;if(keys.s||keys.arrowdown)y+=1;if(keys.a||keys.arrowleft)x-=1;if(keys.d||keys.arrowright)x+=1;
    if(x&&y){x*=.70710678;y*=.70710678;}
    const scene=getScene();sprite.x=Math.max(0,Math.min(scene.width,sprite.x+x*Number(speed||180)*Number(delta||1/60)));
    sprite.y=Math.max(0,Math.min(scene.height,sprite.y+y*Number(speed||180)*Number(delta||1/60)));
  }
  function tickPhysics(delta){
    const scene=getScene();
    (CB.state.runtime.sprites||[]).forEach(function(sprite){
      if(!sprite.vx&&!sprite.vy)return;
      sprite.x+=Number(sprite.vx||0)*delta;sprite.y+=Number(sprite.vy||0)*delta;
      if(sprite.bounce){
        const r=(Number(sprite.size)||38)/2;
        if(sprite.x<r||sprite.x>scene.width-r)sprite.vx=-Number(sprite.vx||0);
        if(sprite.y<r||sprite.y>scene.height-r)sprite.vy=-Number(sprite.vy||0);
      }
      sprite.x=Math.max(0,Math.min(scene.width,sprite.x));sprite.y=Math.max(0,Math.min(scene.height,sprite.y));
    });
  }
  function pickSprite(event){
    const pos=scenePos(event),list=spritesForDraw();let found=null,best=Infinity;
    list.forEach(function(s){const d=Math.hypot(s.x-pos.x,s.y-pos.y);if(d<(Number(s.size)||38)*.65&&d<best){found=s;best=d;}});
    if(found&&!CB.engine.running){CB.state.selectedSpriteId=found.id;if(CB.ui)CB.ui.renderSpriteInspector();render();}
  }
  function init(){
    canvas=document.getElementById("gameCanvas");if(!canvas)return;ctx=canvas.getContext("2d");
    canvas.addEventListener("pointermove",function(e){const p=scenePos(e);CB.state.runtime.pointer=p;if(CB.engine&&CB.engine.running)CB.state.runtime.pointer=p;});
    canvas.addEventListener("click",pickSprite);
    requestAnimationFrame(loop);
  }
  CB.game={init:init,render:render,addSprite:addSprite,createRuntimeSprite:createRuntimeSprite,findRuntimeSprite:findRuntimeSprite,findSprite:findSprite,moveByInput:moveByInput,tickPhysics:tickPhysics,palette:palette};
})();