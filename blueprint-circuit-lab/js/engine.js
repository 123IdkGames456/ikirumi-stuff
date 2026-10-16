(function(){
  const CB=window.CB;
  let running=false,lastKey="",pressedThisFrame=Object.create(null),startContext=null,updateNodeIds=[];
  function makeContext(graph,parent){
    const rt=CB.state.runtime;
    return {
      graph:graph,variables:CB.state.project.variables,runtime:rt,keys:CB.state.keys,pressedKeys:parent?parent.pressedKeys:Object.assign({},pressedThisFrame),
      lastKey:parent?parent.lastKey:lastKey,delta:parent?parent.delta:1/60,memo:new Map(),evaluating:new Set(),
      nodeResults:{},loopIndices:{},steps:parent?parent.steps:0,circuitInputs:{},circuitDepth:parent?parent.circuitDepth||0:0,
      once:rt.onceNodes||(rt.onceNodes={})
    };
  }
  function inputValue(node,pinId,ctx,graph){
    const def=CB.getDef(node,graph),pin=def&&def.inputs.find(function(p){return p.id===pinId;});
    if(!pin)return null;
    if(pin.type==="exec")return null;
    const link=graph.links.find(function(l){return l.to===node.id&&l.in===pinId;});
    if(link)return evalValue(link.from,link.out,ctx,graph);
    const value=node.values[pinId]===undefined?pin.default:node.values[pinId];
    return CB.coerce(value,pin.type);
  }
  function circuitValue(node,ctx,graph,def){
    const board=CB.getCircuit(node.data.circuitId);
    if(!board){
      const input=def.inputs[0];return {[def.outputs[0]?def.outputs[0].id:"result"]:input?inputValue(node,input.id,ctx,graph):null};
    }
    if(ctx.circuitDepth>=12)throw new Error("Circuit call depth exceeded 12 boards (possible recursive circuit).");
    const inputs=CB.circuits.getInputs(board),outputs=CB.circuits.getOutputs(board),inner=makeContext(board.graph,ctx);
    inner.circuitDepth=ctx.circuitDepth+1;inner.circuitInputs={};
    inputs.forEach(function(pinNode){
      const port="arg_"+pinNode.id;
      inner.circuitInputs[pinNode.id]=inputValue(node,port,ctx,graph);
    });
    const result={};
    outputs.forEach(function(outputNode){
      result["result_"+outputNode.id]=inputValue(outputNode,"value",inner,board.graph);
    });
    return result;
  }
  function evalValue(nodeId,outputId,ctx,graph){
    graph=graph||ctx.graph;
    const node=CB.graph.nodeById(graph,nodeId);if(!node)throw new Error("Missing source node "+nodeId+".");
    const def=CB.getDef(node,graph);if(!def)throw new Error("Unknown block "+node.type+".");
    if(outputId==="index"&&def.family==="flow"&&def.op==="repeat")return ctx.loopIndices[node.id]||0;
    const key=node.id+"::"+outputId;
    if(ctx.memo.has(key))return ctx.memo.get(key);
    if(ctx.evaluating.has(key))throw new Error("Value cycle detected at "+def.label+".");
    ctx.evaluating.add(key);
    let value;
    try{
      if(def.family==="circuit-input"){
        value=Object.prototype.hasOwnProperty.call(ctx.circuitInputs,node.id)?ctx.circuitInputs[node.id]:CB.coerce(node.values.value, node.data.pinType||"number");
      }else if(def.family==="circuit-call"){
        const result=circuitValue(node,ctx,graph,def);value=result[outputId];
      }else if(def.family==="runtime-result"){
        value=ctx.nodeResults[node.id]?ctx.nodeResults[node.id][outputId]:null;
      }else if(def.family==="flow"||def.family==="event"){
        value=null;
      }else{
        const args={};
        def.inputs.forEach(function(pin){if(pin.type!=="exec")args[pin.id]=inputValue(node,pin.id,ctx,graph);});
        const result=CB.evalOperation(def,args,node,ctx);
        if(def.outputs.length>1)value=result&&Object.prototype.hasOwnProperty.call(result,outputId)?result[outputId]:null;
        else value=result;
      }
      ctx.memo.set(key,value);return value;
    }finally{ctx.evaluating.delete(key);}
  }
  function delay(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}
  async function pace(ctx){
    const ms=Math.max(0,Number(CB.state.settings.messageDelay)||0);
    if(ms)await delay(ms);
    if(!running)throw new Error("Execution stopped.");
  }
  async function dispatch(graph,fromId,outPin,ctx){
    const links=graph.links.filter(function(l){return l.from===fromId&&l.out===outPin;});
    for(const link of links){
      if(!running)return;
      const target=CB.graph.nodeById(graph,link.to);if(!target)throw new Error("Execution connection points to a missing node.");
      await executeNode(graph,target,link.in,ctx);
    }
  }
  async function executeNode(graph,node,inputPin,ctx){
    if(!running)return;
    ctx.steps+=1;if(ctx.steps>5000)throw new Error("Execution safety limit reached (5,000 node steps in one event). Check loops and On Update chains.");
    const def=CB.getDef(node,graph);if(!def)throw new Error("Unknown block type: "+node.type);
    await pace(ctx);
    const args={};
    def.inputs.forEach(function(pin){if(pin.type!=="exec")args[pin.id]=inputValue(node,pin.id,ctx,graph);});
    let next=[];
    if(def.family==="event")return;
    if(def.family==="flow"){
      switch(def.op){
        case "sequence":next=["then1","then2","then3"];break;
        case "branch":next=[args.condition?"true":"false"];break;
        case "repeat":{
          const count=Math.max(0,Math.min(1000,Math.floor(Number(args.count)||0)));
          for(let i=0;i<count&&running;i++){ctx.loopIndices[node.id]=i;await dispatch(graph,node.id,"body",ctx);}
          next=["completed"];break;
        }
        case "wait":await delay(Math.max(0,Math.min(5,Number(args.seconds)||0))*1000);next=["execOut"];break;
        case "print":CB.diagnostics.write("info",String(args.text==null?"":args.text),node.id);next=["execOut"];break;
        case "set-variable":CB.state.project.variables[String(args.name||"value")]=args.value;CB.touch("Updated variable");CB.state.runtime.lastVariable=String(args.name||"value");next=["execOut"];break;
        case "trace":CB.diagnostics.write("debug",safeString(args.value),node.id);next=["execOut"];break;
        case "assert":if(!args.condition)CB.diagnostics.write("warning",String(args.message||"Assertion failed"),node.id);next=["execOut"];break;
        case "signal":CB.diagnostics.write("info","Signal: "+String(args.name||"unnamed"),node.id);next=["execOut"];break;
        case "stop":stop("Stopped by Stop Execution block");return;
        case "comment":CB.diagnostics.write("debug",String(args.note||""),node.id);next=["execOut"];break;
        case "noop":next=["execOut"];break;
        case "once":{
          const onceKey=graph===CB.state.project.mainGraph?node.id:(CB.activeCircuit()?CB.activeCircuit().id+":"+node.id:node.id);
          if(ctx.once[onceKey])next=["skipped"];else{ctx.once[onceKey]=true;next=["execOut"];}break;
        }
        case "throw":throw new Error(String(args.message||"Blueprint error"));
        case "set-background":CB.state.runtime.background=String(args.color||"#111827");next=["execOut"];break;
        case "breakpoint":CB.diagnostics.write("debug","Breakpoint reached (execution continues).",node.id);next=["execOut"];break;
        default:next=executeGameAction(def.op,args,node,ctx);
      }
    }else if(def.family==="game-action")next=executeGameAction(def.op,args,node,ctx);
    else return;
    for(const output of next){if(!running)return;await dispatch(graph,node.id,output,ctx);}
  }
  function safeString(value){try{return typeof value==="string"?value:JSON.stringify(value);}catch(e){return String(value);}}
  function executeGameAction(op,args,node,ctx){
    const runtime=CB.state.runtime,sprites=runtime.sprites||[],name=String(args.name||"Player");
    let sprite=sprites.find(function(s){return s.name===name;});
    switch(op){
      case "create-sprite":{const created=CB.game.createRuntimeSprite(args.name,args.emoji,args.x,args.y);ctx.nodeResults[node.id]={sprite:created};break;}
      case "move-sprite":CB.game.moveByInput(name,Number(args.speed)||180,ctx.keys,ctx.delta);break;
      case "set-position":if(sprite){sprite.x=Number(args.x)||0;sprite.y=Number(args.y)||0;}else CB.diagnostics.write("warning","Sprite not found: "+name,node.id);break;
      case "set-sprite":if(sprite)sprite.emoji=String(args.emoji||"⭐");else CB.diagnostics.write("warning","Sprite not found: "+name,node.id);break;
      case "set-size":if(sprite)sprite.size=Math.max(8,Math.min(160,Number(args.size)||38));else CB.diagnostics.write("warning","Sprite not found: "+name,node.id);break;
      case "set-velocity":if(sprite){sprite.vx=Number(args.vx)||0;sprite.vy=Number(args.vy)||0;}else CB.diagnostics.write("warning","Sprite not found: "+name,node.id);break;
      case "add-score":runtime.score=(Number(runtime.score)||0)+(Number(args.amount)||0);break;
      case "set-score":runtime.score=Number(args.value)||0;break;
      case "show-message":runtime.message=String(args.text||"");break;
      case "destroy-sprite":runtime.sprites=sprites.filter(function(s){return s.name!==name;});break;
      case "clone-sprite":if(sprite){const copy=CB.clone(sprite);copy.id=CB.uniqueId("runtime-sprite");copy.name=sprite.name+" copy";copy.x+=Number(args.x)||35;copy.y+=Number(args.y)||0;runtime.sprites.push(copy);}else CB.diagnostics.write("warning","Sprite not found: "+name,node.id);break;
      case "spawn-at-pointer":{const p=runtime.pointer||{x:0,y:0};CB.game.createRuntimeSprite(args.name,args.emoji,p.x,p.y);break;}
      case "set-visible":if(sprite)sprite.visible=!!args.visible;else CB.diagnostics.write("warning","Sprite not found: "+name,node.id);break;
      case "clear-sprites":runtime.sprites=[];break;
      case "bounce":if(sprite)sprite.bounce=true;else CB.diagnostics.write("warning","Sprite not found: "+name,node.id);break;
      case "reset-position":if(sprite){sprite.x=Number(args.x)||0;sprite.y=Number(args.y)||0;sprite.vx=0;sprite.vy=0;}else CB.diagnostics.write("warning","Sprite not found: "+name,node.id);break;
    }
    if(CB.game&&CB.game.render)CB.game.render();
    return ["execOut"];
  }
  async function runEventNode(node,event,delta){
    const ctx=makeContext(CB.state.project.mainGraph);
    ctx.delta=delta===undefined?1/60:delta;ctx.lastKey=lastKey;ctx.pressedKeys=Object.assign({},pressedThisFrame);
    try{await dispatch(CB.state.project.mainGraph,node.id,"execOut",ctx);}
    catch(e){if(e.message!=="Execution stopped."){CB.diagnostics.write("error",e.message,node.id);CB.toast("Blueprint execution error: "+e.message,"error");}}
  }
  function start(){
    if(!CB.state.project)return;
    if(running)return;
    running=true;CB.state.updateBusy=false;
    CB.state.runtime={sprites:CB.clone(CB.state.project.sprites||[]),score:0,message:"",background:CB.state.project.scene.background||"#111827",pointer:{x:320,y:200},elapsed:0,onceNodes:{}};
    updateNodeIds=CB.state.project.mainGraph.nodes.filter(function(n){return n.type==="event.update";}).map(function(n){return n.id;});
    CB.ui&&CB.ui.updateRunState(true);CB.diagnostics.write("info","Execution started. Max FPS: "+(CB.state.settings.maxFps||"uncapped")+", message delay: "+CB.state.settings.messageDelay+" ms.","Runtime");
    const events=CB.state.project.mainGraph.nodes.filter(function(n){return n.type==="event.start";});
    if(!events.length)CB.diagnostics.write("warning","No On Start block is present. The graph will still respond to On Update and key events.","Runtime");
    Promise.all(events.map(function(n){return runEventNode(n,"start",1/60);})).catch(function(e){CB.diagnostics.write("error",e.message,"Runtime");});
    CB.game&&CB.game.render();
    CB.touch("Runtime started",{noAutosave:true});
  }
  function stop(reason){
    if(!running)return;
    running=false;CB.state.updateBusy=false;CB.state.keys=Object.create(null);
    CB.ui&&CB.ui.updateRunState(false);
    CB.diagnostics.write("info",reason||"Execution stopped.","Runtime");
    CB.game&&CB.game.render();
  }
  function frame(delta){
    if(!running||!CB.state.project)return;
    CB.state.runtime.elapsed=(CB.state.runtime.elapsed||0)+delta;
    CB.game&&CB.game.tickPhysics(delta);
    if(CB.state.updateBusy)return;
    if(updateNodeIds.length){
      CB.state.updateBusy=true;
      Promise.all(updateNodeIds.map(function(id){
        const node=CB.graph.nodeById(CB.state.project.mainGraph,id);return node?runEventNode(node,"update",delta):Promise.resolve();
      })).finally(function(){CB.state.updateBusy=false;});
    }
    pressedThisFrame=Object.create(null);
  }
  function normalizeKey(key){
    const value=String(key||"").toLowerCase();
    if(value===" ")return "space";if(value==="esc")return "escape";return value;
  }
  function onKeyDown(event){
    const key=normalizeKey(event.key);lastKey=key;const already=!!CB.state.keys[key];CB.state.keys[key]=true;
    if(!running)return;
    if(["arrowup","arrowdown","arrowleft","arrowright"," ","space","w","a","s","d"].includes(key))event.preventDefault();
    if(!already)pressedThisFrame[key]=true;
    const graph=CB.state.project.mainGraph;
    graph.nodes.filter(function(n){return n.type==="event.key-pressed";}).forEach(function(node){
      const target=normalizeKey(node.values.key===undefined?"space":node.values.key);
      if(target!==key&&!(target==="space"&&key===" "))return;
      const ctx=makeContext(graph);ctx.lastKey=key;ctx.pressedKeys=Object.assign({},pressedThisFrame);ctx.delta=1/60;
      dispatch(graph,node.id,"execOut",ctx).catch(function(err){if(err.message!=="Execution stopped.")CB.diagnostics.write("error",err.message,node.id);});
    });
  }
  function onKeyUp(event){CB.state.keys[normalizeKey(event.key)]=false;}
  window.addEventListener("keydown",onKeyDown);
  window.addEventListener("keyup",onKeyUp);
  window.addEventListener("blur",function(){CB.state.keys=Object.create(null);});
  CB.engine={start:start,stop:stop,frame:frame,evalValue:evalValue,isRunning:function(){return running;},makeContext:makeContext};
})();