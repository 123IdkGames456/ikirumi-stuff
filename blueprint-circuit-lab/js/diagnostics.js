(function(){
  const CB=window.CB;
  const entries=[];
  let validationResults=[];
  function time(){return new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});}
  function write(level,message,source){
    const entry={id:Date.now()+Math.random(),time:time(),level:level||"info",message:String(message),source:source||""};
    entries.push(entry);if(entries.length>400)entries.shift();
    const badge=document.getElementById("consoleBadge");if(badge)badge.textContent=String(entries.filter(function(e){return e.level==="warning"||e.level==="error";}).length);
    renderConsole();return entry;
  }
  function renderConsole(){
    const root=document.getElementById("consoleMessages");if(!root)return;
    root.innerHTML="";
    if(!entries.length){const e=document.createElement("div");e.className="console-empty";e.textContent="No messages yet. Run the graph or validate connections to see activity here.";root.appendChild(e);return;}
    entries.slice(-160).forEach(function(entry){
      const row=document.createElement("div");row.className="console-line "+entry.level;
      const t=document.createElement("span");t.className="console-time";t.textContent=entry.time;
      const l=document.createElement("span");l.className="console-level";l.textContent=entry.level;
      const m=document.createElement("span");m.className="console-message";m.textContent=(entry.source?"["+entry.source+"] ":"")+entry.message;
      row.append(t,l,m);root.appendChild(row);
    });
    root.scrollTop=root.scrollHeight;
  }
  function findCycles(graph){
    const byId=new Map(graph.nodes.map(function(n){return [n.id,n];}));
    const next=new Map();
    graph.nodes.forEach(function(n){next.set(n.id,[]);});
    graph.links.forEach(function(l){
      const src=byId.get(l.from),dst=byId.get(l.to);if(!src||!dst)return;
      const sd=CB.getDef(src,graph),dd=CB.getDef(dst,graph),op=sd&&sd.outputs.find(function(p){return p.id===l.out;}),ip=dd&&dd.inputs.find(function(p){return p.id===l.in;});
      if(op&&ip&&op.type!=="exec"&&ip.type!=="exec")next.get(src.id).push(dst.id);
    });
    const visited=new Set(),active=new Set(),cycles=[];
    function visit(id,path){
      if(active.has(id)){cycles.push(path.concat([id]));return;}
      if(visited.has(id))return;
      visited.add(id);active.add(id);
      (next.get(id)||[]).forEach(function(n){visit(n,path.concat([id]));});
      active.delete(id);
    }
    graph.nodes.forEach(function(n){visit(n.id,[]);});
    return cycles;
  }
  function validateGraph(graph,label){
    const result=[],known=new Map(graph.nodes.map(function(n){return [n.id,n];}));
    graph.nodes.forEach(function(node){
      const def=CB.getDef(node,graph);
      if(!def){result.push({level:"error",message:"Unknown block type: "+node.type,source:label+"/"+node.id});return;}
      if(node.type==="circuit.call"&&(!node.data.circuitId||!CB.getCircuit(node.data.circuitId)))result.push({level:"warning",message:"Circuit Call points to a missing board.",source:label+"/"+node.id});
    });
    graph.links.forEach(function(link){
      const source=known.get(link.from),target=known.get(link.to);
      if(!source||!target){result.push({level:"error",message:"A connection points to a node that does not exist.",source:label+"/"+link.id});return;}
      const sd=CB.getDef(source,graph),td=CB.getDef(target,graph),out=sd&&sd.outputs.find(function(p){return p.id===link.out;}),inp=td&&td.inputs.find(function(p){return p.id===link.in;});
      if(!out||!inp){result.push({level:"error",message:"A connection points to a missing pin.",source:label+"/"+link.id});return;}
      if(out.type!==inp.type&&out.type!=="any"&&inp.type!=="any")result.push({level:"error",message:"Pin types do not match ("+out.type+" → "+inp.type+").",source:label+"/"+link.id});
    });
    findCycles(graph).forEach(function(path){result.push({level:"warning",message:"Possible value cycle: "+path.join(" → ")+". Reading this cycle will stop with an error.",source:label});});
    return result;
  }
  function validate(){
    const p=CB.state.project;if(!p)return [];
    let result=validateGraph(p.mainGraph,"Main graph");
    p.circuits.forEach(function(c){if(c.graph)result=result.concat(validateGraph(c.graph,"Circuit: "+c.name));});
    p.circuits.forEach(function(c){const inputNames=new Set(),outputNames=new Set();(c.graph.nodes||[]).forEach(function(n){
      if(n.type==="circuit.input"){const k=String(n.data.pinName||"Value").trim().toLowerCase();if(inputNames.has(k))result.push({level:"warning",message:"Duplicate circuit input name: "+n.data.pinName,source:c.name});inputNames.add(k);}
      if(n.type==="circuit.output"){const k=String(n.data.pinName||"Result").trim().toLowerCase();if(outputNames.has(k))result.push({level:"warning",message:"Duplicate circuit output name: "+n.data.pinName,source:c.name});outputNames.add(k);}
    });});
    validationResults=result;
    result.forEach(function(r){write(r.level,r.message,r.source);});
    const root=document.getElementById("diagnosticsContent");
    if(root){root.innerHTML="";if(!result.length){const item=document.createElement("div");item.className="diagnostic-item";item.textContent="✓ No structural errors found. All recorded links point to real nodes and matching pins.";root.appendChild(item);}else result.forEach(function(r){const item=document.createElement("div");item.className="diagnostic-item";const strong=document.createElement("strong");strong.textContent=r.level.toUpperCase();item.append(strong,document.createTextNode((r.source?r.source+" — ":"")+r.message));root.appendChild(item);});}
    if(CB.ui&&CB.ui.setDock)CB.ui.setDock("diagnostics");
    if(CB.toast)CB.toast(result.length?result.length+" diagnostic item(s) found.":"Validation passed — no structural errors.",""+(result.some(function(r){return r.level==="error";})?"error":"success"));
    return result;
  }
  function clear(){entries.length=0;renderConsole();const badge=document.getElementById("consoleBadge");if(badge)badge.textContent="0";}
  CB.diagnostics={write:write,validate:validate,clear:clear,getEntries:function(){return entries.slice();},getValidation:function(){return validationResults.slice();},render:renderConsole};
})();