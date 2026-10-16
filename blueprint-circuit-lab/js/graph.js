(function(){
  const CB=window.CB;
  const svgNS="http://www.w3.org/2000/svg";
  function active(){return CB.activeGraph();}
  function nodeById(graph,id){return graph&&graph.nodes.find(function(n){return n.id===id;})||null;}
  function cloneDefault(value){return value===undefined?null:CB.clone(value);}
  function createNode(type,x,y,graph){
    graph=graph||active();if(!graph)throw new Error("No graph is active.");
    const sample={id:"",type:type,x:Number(x)||100,y:Number(y)||100,values:{},data:{}};
    const def=CB.getDef(sample,graph);if(!def)throw new Error("Unknown block type: "+type);
    sample.id="n"+(graph.nextId++);sample.data=CB.clone(def.defaults||{});
    if(type==="circuit.call"&&CB.state.project&&CB.state.project.circuits.length)sample.data.circuitId=CB.state.project.circuits[0].id;
    def.inputs.forEach(function(p){if(p.type!=="exec"&&sample.values[p.id]===undefined)sample.values[p.id]=cloneDefault(p.default);});
    graph.nodes.push(sample);CB.state.selectedNodeId=sample.id;CB.state.pendingConnection=null;
    render();if(CB.ui&&CB.ui.renderInspector)CB.ui.renderInspector();CB.touch("Added "+def.label);
    if(CB.diagnostics)CB.diagnostics.write("info","Added block: "+def.label,sample.id);
    return sample;
  }
  function removeNode(id,graph){
    graph=graph||active();if(!graph)return;
    graph.nodes=graph.nodes.filter(function(n){return n.id!==id;});
    graph.links=graph.links.filter(function(l){return l.from!==id&&l.to!==id;});
    if(CB.state.selectedNodeId===id)CB.state.selectedNodeId=null;
    CB.state.pendingConnection=null;render();if(CB.ui)CB.ui.renderInspector();CB.touch("Removed block");
  }
  function getPin(graph,nodeId,pinId,direction){
    const node=nodeById(graph,nodeId);if(!node)return null;const def=CB.getDef(node,graph);if(!def)return null;
    return (direction==="out"?def.outputs:def.inputs).find(function(p){return p.id===pinId;})||null;
  }
  function connect(from,out,to,input,graph){
    graph=graph||active();const a=nodeById(graph,from),b=nodeById(graph,to);if(!a||!b)return false;
    const output=getPin(graph,from,out,"out"),target=getPin(graph,to,input,"in");
    if(!output||!target){CB.toast("That pin no longer exists. Refresh the graph and try again.","error");return false;}
    const match=output.type===target.type||output.type==="any"||target.type==="any";
    if(!match){CB.diagnostics.write("error","Cannot connect "+output.type+" to "+target.type+". Add a conversion block or choose matching types.",from+" → "+to);CB.toast("Pin types do not match: "+output.type+" → "+target.type,"error");return false;}
    if(target.type!=="exec")graph.links=graph.links.filter(function(l){return !(l.to===to&&l.in===input);});
    if(graph.links.some(function(l){return l.from===from&&l.out===out&&l.to===to&&l.in===input;})){CB.state.pendingConnection=null;render();return true;}
    graph.links.push({id:"l"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),from:from,out:out,to:to,in:input});
    CB.state.pendingConnection=null;render();if(CB.ui)CB.ui.renderInspector();CB.touch("Connected pins");
    CB.diagnostics.write("info","Connected "+output.label+" → "+target.label,from+" → "+to);
    return true;
  }
  function isCompatible(a,b){return a.type===b.type||a.type==="any"||b.type==="any";}
  function handlePin(pin){
    const dir=pin.dataset.dir,nodeId=pin.dataset.nodeId,pinId=pin.dataset.pinId,graph=active();
    if(!CB.state.pendingConnection){
      if(dir!=="out"){CB.toast("Start from an output pin.","");return;}
      CB.state.pendingConnection={nodeId:nodeId,pinId:pinId};
      document.querySelectorAll(".pin.pending").forEach(function(p){p.classList.remove("pending");});
      pin.classList.add("pending");CB.toast("Now choose a compatible input pin.");return;
    }
    const start=CB.state.pendingConnection;
    if(dir==="out"){
      CB.state.pendingConnection={nodeId:nodeId,pinId:pinId};
      document.querySelectorAll(".pin.pending").forEach(function(p){p.classList.remove("pending");});pin.classList.add("pending");return;
    }
    const output=getPin(graph,start.nodeId,start.pinId,"out"),input=getPin(graph,nodeId,pinId,"in");
    if(!output||!input){CB.state.pendingConnection=null;render();return;}
    if(!isCompatible(output,input)){CB.diagnostics.write("warning","That connection is not type-compatible.",start.nodeId+" → "+nodeId);CB.toast("These pin types do not match. Use a conversion block.","error");CB.state.pendingConnection=null;render();return;}
    connect(start.nodeId,start.pinId,nodeId,pinId,graph);
  }
  function control(type,value,callback,opts){
    opts=opts||{};let el;
    if(type==="select"){
      el=document.createElement("select");(opts.options||[]).forEach(function(choice){const o=document.createElement("option");if(choice&&typeof choice==="object"){o.value=String(choice.value);o.textContent=String(choice.label===undefined?choice.value:choice.label);}else{o.value=String(choice);o.textContent=String(choice);}el.appendChild(o);});
      el.value=String(value==null?"":value);
    }else if(type==="boolean"){
      el=document.createElement("input");el.type="checkbox";el.checked=!!value;
    }else if(type==="color"){
      el=document.createElement("input");el.type="color";el.value=/^#[0-9a-f]{6}$/i.test(String(value))?String(value):"#ffffff";
    }else{
      el=document.createElement(opts.multiline?"textarea":"input");
      if(!opts.multiline)el.type=type==="number"||type==="integer"?"number":"text";
      if(type==="array"||type==="object"||type==="vec2")el.value=JSON.stringify(value===undefined?(type==="array"?[]:type==="vec2"?{x:0,y:0}:{ }):value);
      else el.value=value===undefined||value===null?"":String(value);
      if(type==="number"||type==="integer"){el.step=type==="integer"?"1":"any";el.inputMode="decimal";}
      if(opts.placeholder)el.placeholder=opts.placeholder;
      if(opts.multiline){el.rows=3;el.spellcheck=false;}
    }
    el.className="field-control"+(opts.compact?" compact":"");
    const update=function(){
      let val;
      if(type==="boolean")val=el.checked;
      else if(type==="number"||type==="integer")val=CB.parseFieldValue(el.value,type);
      else if(type==="array"||type==="object"||type==="vec2")val=CB.parseFieldValue(el.value,type);
      else val=el.value;
      callback(val);
    };
    el.addEventListener(opts.live?"input":"change",update);
    el.addEventListener("pointerdown",function(e){e.stopPropagation();});
    el.addEventListener("click",function(e){e.stopPropagation();});
    return el;
  }
  function renderFieldRow(parent,label,type,value,callback,opts){
    const row=document.createElement("div");row.className="node-field-row";
    const text=document.createElement("label");text.textContent=label;row.appendChild(text);
    const input=control(type,value,callback,Object.assign({compact:true},opts||{}));row.appendChild(input);parent.appendChild(row);
  }
  function createPinRow(node,def,pin,direction,graph){
    const row=document.createElement("div");row.className="pin-row "+(direction==="out"?"output":"input");
    const data=document.createElement("span");data.className="pin "+(pin.type==="exec"?"exec":"")+(graph.links.some(function(l){return direction==="out"?l.from===node.id&&l.out===pin.id:l.to===node.id&&l.in===pin.id;})?" connected":"");
    data.dataset.nodeId=node.id;data.dataset.pinId=pin.id;data.dataset.dir=direction;data.dataset.type=pin.type;data.title=(direction==="out"?"Output":"Input")+": "+pin.label+" ("+pin.type+")";
    data.addEventListener("click",function(e){e.stopPropagation();handlePin(data);});
    const label=document.createElement("span");label.className="pin-name";label.textContent=pin.label;
    const type=document.createElement("span");type.className="pin-type";type.textContent=pin.type==="exec"?"EXEC":pin.type;
    if(direction==="in"){
      row.append(data,label);
      if(pin.type!=="exec"){
        const linked=graph.links.some(function(l){return l.to===node.id&&l.in===pin.id;});
        const edit=control(pin.type,node.values[pin.id]===undefined?pin.default:node.values[pin.id],function(v){node.values[pin.id]=v;CB.touch("Changed input value");},{compact:true,placeholder:pin.type==="array"||pin.type==="object"?"JSON":"Value"});
        edit.classList.add("pin-default");if(pin.type==="boolean")edit.classList.add("bool");if(pin.type==="array"||pin.type==="object"||pin.type==="vec2")edit.classList.add("json");
        if(linked)row.classList.add("node-input-connected");
        row.appendChild(edit);
      }else row.appendChild(type);
    }else{
      row.append(label,type,data);
    }
    return row;
  }
  function renderNode(node,graph){
    const def=CB.getDef(node,graph);if(!def)return null;
    const card=document.createElement("article");card.className="node"+(CB.state.selectedNodeId===node.id?" selected":"");card.style.left=node.x+"px";card.style.top=node.y+"px";card.dataset.nodeId=node.id;
    const head=document.createElement("div");head.className="node-head";
    const swatch=document.createElement("span");swatch.className="node-swatch";swatch.style.background=CB.categoryColors[def.category]||"#9ca9c0";
    const title=document.createElement("span");title.className="node-title";title.textContent=def.label;
    const kind=document.createElement("span");kind.className="node-kind";kind.textContent=def.category;
    const del=document.createElement("button");del.className="node-delete";del.type="button";del.textContent="×";del.title="Delete node";del.addEventListener("pointerdown",function(e){e.stopPropagation();});del.addEventListener("click",function(e){e.stopPropagation();removeNode(node.id,graph);});
    head.append(swatch,title,kind,del);head.addEventListener("pointerdown",function(e){startDrag(e,node,graph,card);});
    head.addEventListener("click",function(e){if(!e.target.closest("button"))selectNode(node.id);});
    card.appendChild(head);
    const body=document.createElement("div");body.className="node-body";
    if(def.description){const desc=document.createElement("div");desc.className="node-description";desc.textContent=def.description;body.appendChild(desc);}
    def.inputs.forEach(function(p){body.appendChild(createPinRow(node,def,p,"in",graph));});
    def.outputs.forEach(function(p){body.appendChild(createPinRow(node,def,p,"out",graph));});
    if(def.fields&&def.fields.length){
      const fields=document.createElement("div");fields.className="node-fields";
      def.fields.forEach(function(f){
        const boardField=f.id==="circuitId"&&node.type==="circuit.call";
        const fieldType=boardField?"select":f.type;
        const fieldOptions=boardField?(CB.state.project.circuits||[]).map(function(c){return {value:c.id,label:c.name};}):f.options;
        renderFieldRow(fields,f.label,fieldType,node.data[f.id]===undefined?cloneDefault(f.default):node.data[f.id],function(v){
          node.data[f.id]=v;CB.touch("Changed "+f.label);
          if(node.type==="circuit.input"||node.type==="circuit.output"||node.type==="circuit.call"){render();if(CB.ui)CB.ui.renderInspector();}
        },{options:fieldOptions,multiline:false});
      });
      body.appendChild(fields);
    }
    card.appendChild(body);
    card.addEventListener("click",function(e){if(!e.target.closest("input,select,textarea,.pin,button"))selectNode(node.id);});
    return card;
  }
  function selectNode(id){
    CB.state.selectedNodeId=id;CB.state.pendingConnection=null;
    document.querySelectorAll(".pin.pending").forEach(function(p){p.classList.remove("pending");});
    document.querySelectorAll(".node.selected").forEach(function(n){n.classList.remove("selected");});
    const node=document.querySelector('.node[data-node-id="'+id+'"]');if(node)node.classList.add("selected");
    if(CB.ui)CB.ui.renderInspector();
  }
  let drag=null;
  function startDrag(e,node,graph,card){
    if(e.button!==0||e.target.closest("button"))return;
    e.preventDefault();selectNode(node.id);
    drag={id:node.id,graph:graph,startX:e.clientX,startY:e.clientY,originX:node.x,originY:node.y,moved:false};
    CB.state.draggingNodeId=node.id;
    document.addEventListener("pointermove",moveDrag);
    document.addEventListener("pointerup",endDrag,{once:true});
  }
  function moveDrag(e){
    if(!drag)return;const dx=(e.clientX-drag.startX)/CB.state.zoom,dy=(e.clientY-drag.startY)/CB.state.zoom;
    if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;
    const node=nodeById(drag.graph,drag.id);if(!node)return;
    node.x=Math.max(0,Math.round((drag.originX+dx)/5)*5);node.y=Math.max(0,Math.round((drag.originY+dy)/5)*5);
    const element=document.querySelector('.node[data-node-id="'+drag.id+'"]');if(element){element.style.left=node.x+"px";element.style.top=node.y+"px";}
    drawWires(drag.graph);
  }
  function endDrag(){
    document.removeEventListener("pointermove",moveDrag);
    if(drag&&drag.moved)CB.touch("Moved block");
    drag=null;CB.state.draggingNodeId=null;
  }
  function drawWires(graph){
    graph=graph||active();const svg=document.getElementById("wireLayer"),stage=document.getElementById("graphStage");if(!svg||!stage||!graph)return;
    svg.setAttribute("viewBox","0 0 3200 2100");svg.setAttribute("width","3200");svg.setAttribute("height","2100");svg.innerHTML="";
    graph.links.forEach(function(link){
      const from=document.querySelector('.pin[data-node-id="'+link.from+'"][data-pin-id="'+link.out+'"][data-dir="out"]');
      const to=document.querySelector('.pin[data-node-id="'+link.to+'"][data-pin-id="'+link.in+'"][data-dir="in"]');
      if(!from||!to)return;
      const fr=from.getBoundingClientRect(),tr=to.getBoundingClientRect(),sr=stage.getBoundingClientRect(),z=CB.state.zoom||1;
      const sx=(fr.left+fr.width/2-sr.left)/z,sy=(fr.top+fr.height/2-sr.top)/z,tx=(tr.left+tr.width/2-sr.left)/z,ty=(tr.top+tr.height/2-sr.top)/z;
      const bend=Math.max(50,Math.abs(tx-sx)*.48),d="M "+sx+" "+sy+" C "+(sx+bend)+" "+sy+", "+(tx-bend)+" "+ty+", "+tx+" "+ty;
      const out=getPin(graph,link.from,link.out,"out"),isExec=out&&out.type==="exec";
      const path=document.createElementNS(svgNS,"path");path.setAttribute("d",d);path.setAttribute("class","wire"+(isExec?" exec-wire":""));svg.appendChild(path);
      const end=document.createElementNS(svgNS,"circle");end.setAttribute("cx",tx);end.setAttribute("cy",ty);end.setAttribute("r",isExec?"3.1":"3.8");end.setAttribute("fill",isExec?"#e7b75f":"#8098ff");svg.appendChild(end);
    });
  }
  function render(){
    const graph=active(),layer=document.getElementById("nodeLayer"),empty=document.getElementById("emptyGraph"),stage=document.getElementById("graphStage"),sizer=document.getElementById("graphSizer");if(!graph||!layer)return;
    layer.innerHTML="";graph.nodes.forEach(function(node){const card=renderNode(node,graph);if(card)layer.appendChild(card);});
    if(empty)empty.classList.toggle("hidden",graph.nodes.length>0);
    const zoom=CB.state.zoom||1;stage.style.transform="scale("+zoom+")";sizer.style.width=(3200*zoom)+"px";sizer.style.height=(2100*zoom)+"px";
    const title=document.getElementById("graphTitle"),subtitle=document.getElementById("graphSubtitle");
    const circuit=CB.activeCircuit();if(title)title.textContent=circuit?circuit.name:"Main graph";if(subtitle)subtitle.textContent=circuit?"Reusable circuit · "+circuit.graph.nodes.length+" blocks":"Typed visual program · "+graph.nodes.length+" blocks";
    const zlabel=document.getElementById("zoomLabel");if(zlabel)zlabel.textContent=Math.round(zoom*100)+"%";
    requestAnimationFrame(function(){drawWires(graph);});
  }
  function setZoom(value){
    CB.state.zoom=Math.min(1.6,Math.max(.35,Number(value)||1));
    const stage=document.getElementById("graphStage"),sizer=document.getElementById("graphSizer");
    if(stage&&sizer){stage.style.transform="scale("+CB.state.zoom+")";sizer.style.width=(3200*CB.state.zoom)+"px";sizer.style.height=(2100*CB.state.zoom)+"px";}
    const zlabel=document.getElementById("zoomLabel");if(zlabel)zlabel.textContent=Math.round(CB.state.zoom*100)+"%";
    drawWires(active());
  }
  function fitView(){
    const graph=active(),viewport=document.getElementById("graphViewport");if(!graph||!viewport)return;
    if(!graph.nodes.length){setZoom(1);viewport.scrollTo({left:0,top:0,behavior:"smooth"});return;}
    const xs=graph.nodes.map(function(n){return n.x;}),ys=graph.nodes.map(function(n){return n.y;});
    const minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs)+260,minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys)+180;
    const z=Math.min(1,Math.max(.38,Math.min((viewport.clientWidth-90)/(maxX-minX+80),(viewport.clientHeight-90)/(maxY-minY+80))));
    setZoom(z);viewport.scrollTo({left:Math.max(0,(minX-35)*z),top:Math.max(0,(minY-35)*z),behavior:"smooth"});
  }
  function clearGraph(graph){
    graph=graph||active();if(!graph)return;
    graph.nodes=[];graph.links=[];graph.nextId=1;CB.state.selectedNodeId=null;CB.state.pendingConnection=null;render();if(CB.ui)CB.ui.renderInspector();CB.touch("Cleared graph");
  }
  document.addEventListener("keydown",function(e){
    if(e.key!=="Delete"&&e.key!=="Backspace")return;
    if(/input|textarea|select/i.test(document.activeElement&&document.activeElement.tagName||""))return;
    if(CB.state.mode!=="code"||!CB.state.selectedNodeId)return;
    removeNode(CB.state.selectedNodeId);
  });
  window.addEventListener("resize",function(){drawWires(active());});
  CB.graph={addNode:createNode,removeNode:removeNode,connect:connect,render:render,drawWires:drawWires,selectNode:selectNode,setZoom:setZoom,fitView:fitView,clear:clearGraph,nodeById:nodeById,getPin:getPin};
})();