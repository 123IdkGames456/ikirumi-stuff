(() => {
const $ = id => document.getElementById(id);
const defs = BlueprintBlocks.defs;
let nodes = [], links = [], variables = [], nextNode = 1, nextVariable = 1;
let selectedNode = null, pendingPin = null, activeCategory = "All", codeVisible = true;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const getDef = id => defs.find(d => d.id === id);
const getNode = id => nodes.find(n => n.id === id);
const getVar = id => variables.find(v => v.id === id);
const allCategories = ["All", ...BlueprintBlocks.categories];
function status(s){$("graphStatus").textContent=" · "+s}
function addNode(type,x,y,values={}) {
 const d=getDef(type); if(!d)return;
 const n={id:nextNode++,type,x:x??(90+(nodes.length%4)*250),y:y??(70+(nodes.length%4)*170),values:{}};
 (d.fields||[]).forEach(f=>n.values[f.id]=values[f.id]??f.default??(f.options?f.options[0][0]:""));
 if(type==="getvar"||type==="setvar") n.values.variable=values.variable??variables[0]?.id??"";
 nodes.push(n);selectedNode=n.id;renderAll();return n;
}
function addVariable(v={}) {
 const name=(v.name||"Variable"+nextVariable).trim();
 if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)){alert("Use a C# variable name: letters, numbers and underscores, starting with a letter or underscore.");return}
 if(variables.some(x=>x.name===name)){alert("A variable with that name already exists.");return}
 const type=v.type||"int";
 const item={id:v.id||"v"+nextVariable++,name,type,access:v.access||"private-inspector",initial:v.initial??BlueprintTypes.defaultValue(type)};
 variables.push(item);
 nodes.filter(n=>["getvar","setvar"].includes(n.type)&&!n.values.variable).forEach(n=>n.values.variable=item.id);
 renderAll();return item;
}
function openVariableModal(existing=null) {
 $("modalTitle").textContent=existing?"Edit variable":"Create variable";
 $("modalConfirm").textContent=existing?"Save":"Create";
 $("modalBody").innerHTML='<div class="form-row"><label>Variable name</label><input id="varName" value="'+esc(existing?.name||"")+'" placeholder="MoveSpeed"></div><div class="form-row"><label>Data type</label><select id="varType">'+BlueprintTypes.all.map(t=>'<option '+(t===(existing?.type||"float")?"selected":"")+'>'+esc(t)+'</option>').join("")+'<option value="Vector2">Vector2</option><option value="Vector3">Vector3</option><option value="Vector4">Vector4</option><option value="List<int>">List&lt;int&gt;</option><option value="List<float>">List&lt;float&gt;</option><option value="List<string>">List&lt;string&gt;</option><option value="List<GameObject>">List&lt;GameObject&gt;</option><option value="List<Vector3>">List&lt;Vector3&gt;</option><option value="GameObject[]">GameObject[]</option></select></div><div class="form-row"><label>Inspector and access</label><select id="varAccess"><option value="private-inspector">Private, visible in Inspector</option><option value="private">Private, hidden in Inspector</option><option value="public">Public</option></select></div><div class="form-row"><label>Initial C# value</label><input id="varInitial" value="'+esc(existing?.initial??"")+'" placeholder="Leave empty for the type default"></div><div class="subtle">Use a valid C# expression. Examples: 100, 5f, true, "Player", Vector3.zero, new List&lt;int&gt;().</div>';
 $("varAccess").value=existing?.access||"private-inspector";
 $("modal").hidden=false;
 $("modalConfirm").onclick=()=>{const data={name:$("varName").value,type:$("varType").value,access:$("varAccess").value,initial:$("varInitial").value.trim()||BlueprintTypes.defaultValue($("varType").value)};if(existing){if(variables.some(v=>v.id!==existing.id&&v.name===data.name)){alert("That variable name already exists.");return}Object.assign(existing,data)}else{const made=addVariable(data);if(!made)return} $("modal").hidden=true;renderAll()};
}
function renderCategories(){ $("categories").innerHTML=allCategories.map(c=>'<button class="category '+(c===activeCategory?"active":"")+'" data-category="'+esc(c)+'">'+esc(c)+'</button>').join("");$("categories").querySelectorAll("button").forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;renderCategories();renderBlocks()})}
function renderBlocks(){
 const q=$("blockSearch").value.toLowerCase().trim();
 const filtered=defs.filter(d=>(activeCategory==="All"||d.category===activeCategory)&&(!q||[d.name,d.category,d.desc,...(d.aliases||[]),...(d.fields||[]).flatMap(f=>[f.label,...(f.options||[]).map(o=>o[1])])].join(" ").toLowerCase().includes(q)));
 $("blockList").innerHTML=filtered.map(d=>'<button class="block-item" data-type="'+d.id+'" style="--accent:'+d.color+'"><span class="block-dot"></span><span class="block-text"><strong>'+esc(d.name)+'</strong><small>'+esc(d.desc)+'</small></span></button>').join("")||'<div class="subtle">No blocks found. Try a synonym, symbol, or operation name.</div>';
 $("blockList").querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>addNode(b.dataset.type));
 $("blockTotal").textContent=filtered.length;
}
function fieldHtml(n,f){
 let val=n.values[f.id]??f.default??"";
 if(f.type==="variable"){
  const list=variables.filter(v=>f.allowAll||!f.expected||BlueprintTypes.compatible(v.type,f.expected));
  return '<label class="node-field"><span>'+esc(f.label)+'</span><select data-field="'+f.id+'"><option value="">Choose variable…</option>'+list.map(v=>'<option value="'+v.id+'" '+(val===v.id?"selected":"")+'>'+esc(v.name)+' · '+esc(v.type)+'</option>').join("")+'</select></label>';
 }
 if(f.type==="select")return '<label class="node-field"><span>'+esc(f.label)+'</span><select data-field="'+f.id+'">'+f.options.map(o=>'<option value="'+esc(o[0])+'" '+(String(val)===String(o[0])?"selected":"")+'>'+esc(o[1])+'</option>').join("")+'</select></label>';
 const type=f.type==="number"?"number":"text";
 return '<label class="node-field"><span>'+esc(f.label)+'</span><input data-field="'+f.id+'" type="'+type+'" value="'+esc(val)+'"></label>';
}
function renderNodes(){
 document.querySelectorAll(".node").forEach(e=>e.remove());
 nodes.forEach(n=>{
  const d=getDef(n.type);if(!d)return;
  const el=document.createElement("div");el.className="node"+(selectedNode===n.id?" selected":"");el.dataset.id=n.id;el.style.left=n.x+"px";el.style.top=n.y+"px";el.style.setProperty("--accent",d.color);
  let html='<div class="node-head"><span class="node-accent"></span>'+esc(d.name)+'</div><div class="node-body"><div class="node-description">'+esc(d.desc)+'</div>';
  (d.fields||[]).forEach(f=>html+=fieldHtml(n,f));
  (d.dataIn||[]).forEach(p=>html+='<div class="pin-row"><span class="pin-label"><button class="pin in" data-kind="data" data-pin="'+p.id+'" title="Connect value input"></button>'+esc(p.label)+(p.type!=="dynamic"?" · "+esc(p.type):"")+'</span><span></span></div>');
  if(d.flowIn) d.flowIn.forEach(p=>html+='<div class="pin-row"><span class="pin-label"><button class="pin in" data-kind="flow" data-pin="'+p+'" title="Connect execution input"></button>'+esc(p)+'</span><span></span></div>');
  if(d.valueOut)html+='<div class="pin-row"><span>Value · '+esc(d.valueOut==="dynamic"?"any":d.valueOut)+'</span><button class="pin out" data-kind="data" data-pin="value" title="Connect value output"></button></div>';
  if(d.flowOut)d.flowOut.forEach(p=>html+='<div class="pin-row"><span>'+esc(p)+'</span><button class="pin out" data-kind="flow" data-pin="'+p+'" title="Connect execution output"></button></div>');
  html+='</div>';el.innerHTML=html;
  el.addEventListener("click",e=>{if(e.target.classList.contains("pin"))return;selectedNode=n.id;renderNodes();renderInspector()});
  const head=el.querySelector(".node-head");
  head.addEventListener("pointerdown",e=>{if(e.target.closest("button,input,select"))return;selectedNode=n.id;const sx=e.clientX,sy=e.clientY,ox=n.x,oy=n.y;head.setPointerCapture?.(e.pointerId);function move(ev){n.x=Math.max(0,ox+ev.clientX-sx);n.y=Math.max(0,oy+ev.clientY-sy);el.style.left=n.x+"px";el.style.top=n.y+"px";drawWires()}function end(){window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",end);renderInspector()}window.addEventListener("pointermove",move);window.addEventListener("pointerup",end);e.preventDefault()});
  el.querySelectorAll("[data-field]").forEach(input=>input.addEventListener("change",()=>{n.values[input.dataset.field]=input.value;renderAll()}));
  el.querySelectorAll(".pin").forEach(pin=>pin.onclick=e=>{e.stopPropagation();pinClick(n,pin.dataset.kind,pin.classList.contains("out"),pin.dataset.pin)});
  $("canvas").appendChild(el);
 });
 $("emptyState").style.display=nodes.length?"none":"flex";
 $("nodeCount")?.remove();
 drawWires();
}
function pinClick(n,kind,isOut,pin){
 if(!pendingPin){if(!isOut){status("Choose an output pin first");return}pendingPin={node:n.id,kind,pin};renderNodes();document.querySelectorAll(".pin.out").forEach(p=>p.classList.add("pending"));status("Now choose a compatible input");return}
 const a=pendingPin;pendingPin=null;
 if(a.node===n.id){status("Choose a different node");renderNodes();return}
 if(kind!==a.kind||isOut){status("Pin types do not match");renderNodes();return}
 const from=getNode(a.node),to=n,fd=getDef(from.type),td=getDef(to.type);
 if(kind==="data"){
  const outType=fd.valueOut||"exec", input=(td.dataIn||[]).find(p=>p.id===pin);
  if(!input||!BlueprintTypes.compatible(outType,input.type)&&outType!=="dynamic"&&input.type!=="dynamic"){status("Incompatible data types");renderNodes();return}
 }
 links=links.filter(l=>!(l.to===n.id&&l.toPin===pin&&l.kind===kind));
 links.push({from:a.node,fromPin:a.pin,to:n.id,toPin:pin,kind});
 status("Connected");renderAll();
}
function pinPos(nodeId,kind,isOut,pin){
 const el=document.querySelector('.node[data-id="'+nodeId+'"]');if(!el)return null;
 const btn=[...el.querySelectorAll(".pin")].find(p=>p.dataset.kind===kind&&p.dataset.pin===pin&&(p.classList.contains("out")===isOut));if(!btn)return null;
 const r=btn.getBoundingClientRect(),c=$("canvas").getBoundingClientRect();
 return {x:r.left+r.width/2-c.left+$("workspace").scrollLeft,y:r.top+r.height/2-c.top+$("workspace").scrollTop};
}
function drawWires(){
 const svg=$("wires");svg.innerHTML="";
 links.forEach(l=>{const a=pinPos(l.from,l.kind,true,l.fromPin),b=pinPos(l.to,l.kind,false,l.toPin);if(!a||!b)return;const dx=Math.max(45,Math.abs(b.x-a.x)*.45);const path=document.createElementNS("http://www.w3.org/2000/svg","path");path.setAttribute("d","M "+a.x+" "+a.y+" C "+(a.x+dx)+" "+a.y+" "+(b.x-dx)+" "+b.y+" "+b.x+" "+b.y);path.setAttribute("class","wire");if(l.kind==="data")path.style.stroke="#8fb3ff";svg.appendChild(path)});
}
function renderVariables(){
 $("variableList").innerHTML=variables.map(v=>'<div class="variable-card"><div class="variable-top"><strong>'+esc(v.name)+'</strong><span class="type-pill">'+esc(v.type)+'</span></div><div class="variable-meta">'+esc(v.access==="public"?"Public":v.access==="private"?"Private · hidden":"Private · Inspector")+' · '+esc(v.initial)+'</div><div class="variable-buttons"><button data-edit-var="'+v.id+'">Edit</button><button data-delete-var="'+v.id+'">Delete</button></div></div>').join("")||'<div class="subtle">No variables yet. Create one to use it in Get Variable or Set Variable blocks.</div>';
 $("variableList").querySelectorAll("[data-edit-var]").forEach(b=>b.onclick=()=>openVariableModal(getVar(b.dataset.editVar)));
 $("variableList").querySelectorAll("[data-delete-var]").forEach(b=>b.onclick=()=>{const id=b.dataset.deleteVar;variables=variables.filter(v=>v.id!==id);nodes.forEach(n=>{if(n.values.variable===id)n.values.variable=""});links=links.filter(l=>!((getNode(l.from)?.type==="getvar"||getNode(l.to)?.type==="setvar")&&l.kind==="data"));renderAll()});
}
function renderInspector(){
 const n=getNode(selectedNode);if(!n){$("nodeInspector").innerHTML='<p class="subtle">Select a node to edit its settings.</p>';return}
 const d=getDef(n.type);
 let html='<div class="subtle">'+esc(d.name)+' · '+esc(d.category)+'</div>';
 (d.fields||[]).forEach(f=>{let val=n.values[f.id]??"";if(f.type==="select")html+='<label>'+esc(f.label)+'</label><select data-inspect="'+f.id+'">'+f.options.map(o=>'<option value="'+esc(o[0])+'" '+(String(val)===String(o[0])?"selected":"")+'>'+esc(o[1])+'</option>').join("")+'</select>';else if(f.type==="variable")html+='<label>'+esc(f.label)+'</label><select data-inspect="'+f.id+'"><option value="">Choose variable…</option>'+variables.map(v=>'<option value="'+v.id+'" '+(v.id===val?"selected":"")+'>'+esc(v.name)+' · '+esc(v.type)+'</option>').join("")+'</select>';else html+='<label>'+esc(f.label)+'</label><input data-inspect="'+f.id+'" value="'+esc(val)+'">'});
 html+='<div style="margin-top:15px"><button id="deleteNode" style="width:100%">Delete node</button></div>';
 $("nodeInspector").innerHTML=html;
 $("nodeInspector").querySelectorAll("[data-inspect]").forEach(el=>el.onchange=()=>{n.values[el.dataset.inspect]=el.value;renderAll()});
 $("deleteNode").onclick=()=>{nodes=nodes.filter(x=>x.id!==n.id);links=links.filter(l=>l.from!==n.id&&l.to!==n.id);selectedNode=null;renderAll()};
}
function renderCode(){
 const result=BlueprintCompiler.compile(nodes,links,variables,$("projectName").value||"BlueprintScript");
 $("codeOutput").textContent=result.code;
 $("diagnostics").innerHTML=result.diagnostics.length?result.diagnostics.map(x=>'<div class="warning">⚠ '+esc(x)+'</div>').join(""):'<span class="status-good">✓ No basic graph issues detected.</span>';
 $("compileStatus").textContent=result.diagnostics.length?" · "+result.diagnostics.length+" issue(s)":" · Live preview";
}
function renderAll(){renderCategories();renderBlocks();renderVariables();renderNodes();renderInspector();renderCode()}
function snapshot(){return {projectName:$("projectName").value,nodes,links,variables,nextNode,nextVariable}}
function loadState(s){if(!s||!Array.isArray(s.nodes))return;nodes=s.nodes;links=s.links||[];variables=s.variables||[];nextNode=s.nextNode||Math.max(0,...nodes.map(n=>n.id))+1;nextVariable=s.nextVariable||variables.length+1;$("projectName").value=s.projectName||"My Blueprint Project";selectedNode=nodes[0]?.id??null;renderAll()}
function example(){
 nodes=[];links=[];variables=[];nextNode=1;nextVariable=1;
 const speed=addVariable({name:"MoveSpeed",type:"float",access:"private-inspector",initial:"5f"});
 const start=addNode("start",80,90),set=addNode("debug",360,90,{message:"Blueprint Studio is connected!"}),math=addNode("math",370,330,{operation:"multiply"}),a=addNode("literal",80,380,{type:"float",value:"2"}),b=addNode("literal",80,560,{type:"float",value:"3"});
 links.push({from:start.id,fromPin:"Then",to:set.id,toPin:"Exec",kind:"flow"},{from:a.id,fromPin:"value",to:math.id,toPin:"a",kind:"data"},{from:b.id,fromPin:"value",to:math.id,toPin:"b",kind:"data"});
 status("Starter example loaded");renderAll();
}
$("blockSearch").addEventListener("input",renderBlocks);
$("addVariable").onclick=$("addVariableSide").onclick=()=>openVariableModal();
$("modalClose").onclick=$("modalCancel").onclick=()=>{$("modal").hidden=true};
$("starterExample").onclick=example;
$("newProject").onclick=()=>{if(confirm("Create a new project? Unsaved changes in the current graph will be replaced.")){nodes=[];links=[];variables=[];nextNode=1;nextVariable=1;selectedNode=null;$("projectName").value="My Blueprint Project";renderAll();status("New project")}};
$("saveProject").onclick=()=>{try{BlueprintStorage.save(snapshot());status("Saved locally")}catch(e){alert("Could not save locally: "+e.message)}};
$("loadProject").onclick=()=>{const s=BlueprintStorage.load();if(s)loadState(s);else $("fileInput").click()};
$("fileInput").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{loadState(JSON.parse(await f.text()));status("Project loaded")}catch(err){alert("Invalid project JSON.")}e.target.value=""};
$("downloadProject").onclick=()=>BlueprintStorage.download(BlueprintStorage.safeName($("projectName").value)+".json",BlueprintStorage.snapshot(snapshot()),"application/json");
$("exportProject").onclick=()=>BlueprintStorage.download(BlueprintStorage.safeName($("projectName").value)+".cs",$("codeOutput").textContent,"text/plain");
$("copyCode").onclick=async()=>{try{await navigator.clipboard.writeText($("codeOutput").textContent);status("C# copied")}catch(e){const r=document.createRange();r.selectNodeContents($("codeOutput"));const s=getSelection();s.removeAllRanges();s.addRange(r);status("Select and copy the code")}};
$("toggleCode").onclick=()=>{codeVisible=!codeVisible;document.querySelector(".code-panel").classList.toggle("collapsed",!codeVisible);$("codeOutput").hidden=!codeVisible;$("toggleCode").textContent=codeVisible?"Hide code":"Show code"};
$("clearGraph").onclick=()=>{nodes=[];links=[];selectedNode=null;renderAll();status("Graph cleared")};
$("fitGraph").onclick=()=>{$("workspace").scrollTo({left:0,top:0,behavior:"smooth"});status("Graph reset to origin")};
$("projectName").addEventListener("input",renderCode);
$("workspace").addEventListener("scroll",drawWires);
window.addEventListener("keydown",e=>{if(e.key==="Escape"){pendingPin=null;renderNodes()}if((e.key==="Delete"||e.key==="Backspace")&&selectedNode&&!["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName)){nodes=nodes.filter(n=>n.id!==selectedNode);links=links.filter(l=>l.from!==selectedNode&&l.to!==selectedNode);selectedNode=null;renderAll()}});
renderAll();
const saved=BlueprintStorage.load();if(saved)loadState(saved);
})();