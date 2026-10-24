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
 $("modalBody").innerHTML='<div class="form-row"><label>Variable name</label><input id="varName" value="'+esc(existing?.name||"")+'" placeholder="MoveSpeed"></div><div class="form-row"><label>Data type</label><select id="varType">'+BlueprintTypes.all.map(t=>'<option '+(t===(existing?.type||"float")?"selected":"")+'>'+esc(t)+'</option>').join("")+'<option value="Vector2">Vector2</option><option value="Vector3">Vector3</option><option value="Vector4">Vector4</option><option value="List<int>">List&lt;int&gt;</option><option value="List<float>">List&lt;float&gt;</option><option value="List<string>">List&lt;string&gt;</option><option value="List<GameObject>">List&lt;GameObject&gt;</option><option value="List<Transform>">List&lt;Transform&gt;</option><option value="List<MonoBehaviour>">List&lt;MonoBehaviour&gt;</option><option value="List<Vector2>">List&lt;Vector2&gt;</option><option value="List<Vector3>">List&lt;Vector3&gt;</option><option value="List<Vector4>">List&lt;Vector4&gt;</option><option value="Dictionary<string, GameObject>">Dictionary&lt;string, GameObject&gt;</option><option value="GameObject[]">GameObject[]</option><option value="Transform[]">Transform[]</option><option value="Vector3[]">Vector3[]</option></select></div><div class="form-row"><label>Inspector and access</label><select id="varAccess"><option value="private-inspector">Private, visible in Inspector</option><option value="public-inspector">Public, visible in Inspector</option><option value="private">Private, hidden in Inspector</option><option value="public-hidden">Public, hidden from Inspector</option></select></div><div class="form-row"><label>Initial C# value</label><input id="varInitial" value="'+esc(existing?.initial??"")+'" placeholder="Leave empty for the type default"></div><div class="subtle">Use a valid C# expression. Examples: 100, 5f, true, "Player", Vector3.zero, new List&lt;int&gt;().</div>';
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
const componentProperties={
HingeJoint:[["limits","Limits (Minimum / Maximum)"],["useLimits","Use Limits"],["motor","Motor"],["spring","Spring"],["breakForce","Break Force"],["breakTorque","Break Torque"],["enableCollision","Enable Collision"],["enablePreprocessing","Enable Preprocessing"]],
HingeJoint2D:[["limits","Limits (Minimum / Maximum)"],["useLimits","Use Limits"],["motor","Motor"],["breakForce","Break Force"],["breakTorque","Break Torque"],["enableCollision","Enable Collision"]],
Rigidbody:[["mass","Mass"],["drag","Drag"],["angularDrag","Angular Drag"],["useGravity","Use Gravity"],["isKinematic","Is Kinematic"],["detectCollisions","Detect Collisions"],["constraints","Constraints"]],
Rigidbody2D:[["mass","Mass"],["gravityScale","Gravity Scale"],["linearDamping","Linear Damping"],["angularDamping","Angular Damping"],["simulated","Simulated"],["bodyType","Body Type"],["constraints","Constraints"]],
Transform:[["position","Position"],["localPosition","Local Position"],["rotation","Rotation"],["localRotation","Local Rotation"],["localScale","Local Scale"]],
Collider:[["enabled","Enabled"],["isTrigger","Is Trigger"]],
Collider2D:[["enabled","Enabled"],["isTrigger","Is Trigger"]],
BoxCollider:[["enabled","Enabled"],["isTrigger","Is Trigger"],["center","Center"],["size","Size"]],
BoxCollider2D:[["enabled","Enabled"],["isTrigger","Is Trigger"],["offset","Offset"],["size","Size"]],
AudioSource:[["volume","Volume"],["pitch","Pitch"],["loop","Loop"],["playOnAwake","Play On Awake"],["mute","Mute"]],
Camera:[["fieldOfView","Field Of View"],["orthographic","Orthographic"],["orthographicSize","Orthographic Size"],["nearClipPlane","Near Clip Plane"],["farClipPlane","Far Clip Plane"]],
Light:[["intensity","Intensity"],["range","Range"],["color","Color"],["enabled","Enabled"]],
NavMeshAgent:[["speed","Speed"],["angularSpeed","Angular Speed"],["acceleration","Acceleration"],["stoppingDistance","Stopping Distance"],["isStopped","Is Stopped"]],
WheelCollider:[["motorTorque","Motor Torque"],["brakeTorque","Brake Torque"],["steerAngle","Steer Angle"]]
};
const boolProperties=new Set(["useLimits","enableCollision","enablePreprocessing","useGravity","isKinematic","detectCollisions","simulated","isTrigger","enabled","loop","playOnAwake","mute","orthographic","isStopped"]);
function fieldHtml(n,f){
 let val=n.values[f.id]??f.default??"";
 if(n.type==="setcomponent"){
  const ct=n.values.componentType||"HingeJoint",prop=n.values.property||"limits";
  if(["minimum","maximum","setMinimum","setMaximum"].includes(f.id)&&prop!=="limits")return "";
  if(f.id==="boolValue"&&!boolProperties.has(prop))return "";
  if(f.id==="componentVariable"&&n.values.source==="connected")return "";
  if(f.id==="propertyValue"&&boolProperties.has(prop))return "";
  if(f.id==="property"){
   const options=componentProperties[ct]||[["enabled","Enabled"]];
   return '<label class="node-field"><span>'+esc(f.label)+'</span><select data-field="property">'+options.map(o=>'<option value="'+o[0]+'" '+(prop===o[0]?"selected":"")+'>'+esc(o[1])+'</option>').join("")+'</select></label>';
  }
 }
 if(f.type==="checkbox")return '<label class="node-field checkbox-field"><span>'+esc(f.label)+'</span><input data-field="'+f.id+'" type="checkbox" '+(val==="true"||val===true?"checked":"")+'></label>';
 if(f.type==="variable"){
  const expected=n.type==="setcomponent"&&f.id==="componentVariable"?(n.values.componentType||"Component"):(f.expected||null);
  const list=variables.filter(v=>f.allowAll&&n.type!=="setcomponent"||!expected||v.type===expected||v.type==="Component");
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
  const el=document.createElement("div");el.className="node"+(selectedNode===n.id?" selected":"");el.dataset.id=n.id;el.style.left=n.x+"px";el.style.top=n.y+"px";el.style.setProperty("--accent",n.color||d.color);
  let html='<div class="node-head"><span class="node-accent"></span>'+esc(d.name)+'</div>';
  if(d.flowIn)d.flowIn.forEach(p=>html+='<div class="pin-row flow-input-row exec-input-top"><span class="pin-label"><button class="pin in exec-pin" data-direction="input" data-kind="flow" data-type="exec" data-pin="'+p+'" title="Execution input"></button>'+esc(p)+'</span></div>');
  html+='<div class="node-body">';
  html+='<div class="node-description">'+esc(d.desc)+'</div>';
  (d.fields||[]).forEach(f=>html+=fieldHtml(n,f));
  (d.dataIn||[]).filter(p=>!(n.type==="setcomponent"&&p.id==="component"&&n.values.source!=="connected")&&!(n.type==="setcomponent"&&((p.id==="minimumValue"&&(n.values.property!=="limits"||n.values.setMinimum!=="true"))||(p.id==="maximumValue"&&(n.values.property!=="limits"||n.values.setMaximum!=="true"))))).forEach(p=>html+='<div class="pin-row"><span class="pin-label"><button class="pin in" data-direction="input" data-kind="data" data-type="'+esc(p.type||"dynamic")+'" data-pin="'+p.id+'" title="Connect value input"></button>'+esc(p.label)+(p.type!=="dynamic"?" · "+esc(p.type):"")+'</span><span></span></div>');
  if(d.valueOut)html+='<div class="pin-row"><span>Value · '+esc(d.valueOut==="dynamic"?"any":d.valueOut)+'</span><button class="pin out" data-direction="output" data-kind="data" data-type="'+esc(d.valueOut||"dynamic")+'" data-pin="value" title="Connect value output"></button></div>';
  if(d.flowOut)d.flowOut.forEach(p=>html+='<div class="pin-row"><span>'+esc(p)+'</span><button class="pin out exec-pin" data-direction="output" data-kind="flow" data-type="exec" data-pin="'+p+'" title="Execution output"></button></div>');
  html+='</div>';el.innerHTML=html;
  el.addEventListener("click",e=>{if(e.target.closest(".pin, input, select, textarea, button, label"))return;selectedNode=n.id;renderNodes();renderInspector()});
  el.addEventListener("contextmenu",e=>{e.preventDefault();e.stopPropagation();selectedNode=n.id;showContextMenu(e.clientX,e.clientY,[{label:"Delete node",action:()=>{nodes=nodes.filter(x=>x.id!==n.id);links=links.filter(l=>l.from!==n.id&&l.to!==n.id);if(selectedNode===n.id)selectedNode=null;renderAll();status("Node deleted")}},{label:"Node color",submenu:[{label:"Default",color:"",action:()=>setNodeColor(n,"")},{label:"Blue",color:"#648cff",action:()=>setNodeColor(n,"#648cff")},{label:"Green",color:"#43b581",action:()=>setNodeColor(n,"#43b581")},{label:"Yellow",color:"#e0b64f",action:()=>setNodeColor(n,"#e0b64f")},{label:"Orange",color:"#e98b45",action:()=>setNodeColor(n,"#e98b45")},{label:"Red",color:"#df626c",action:()=>setNodeColor(n,"#df626c")},{label:"Purple",color:"#ad7ce8",action:()=>setNodeColor(n,"#ad7ce8")},{label:"Pink",color:"#e783b6",action:()=>setNodeColor(n,"#e783b6")},{label:"Gray",color:"#8e99aa",action:()=>setNodeColor(n,"#8e99aa")}]}]);});
  const head=el.querySelector(".node-head");
  head.addEventListener("pointerdown",e=>{if(e.target.closest("button,input,select"))return;selectedNode=n.id;const sx=e.clientX,sy=e.clientY,ox=n.x,oy=n.y;head.setPointerCapture?.(e.pointerId);function move(ev){n.x=Math.max(0,ox+ev.clientX-sx);n.y=Math.max(0,oy+ev.clientY-sy);el.style.left=n.x+"px";el.style.top=n.y+"px";drawWires()}function end(){window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",end);renderInspector()}window.addEventListener("pointermove",move);window.addEventListener("pointerup",end);e.preventDefault()});
  el.querySelectorAll("[data-field]").forEach(input=>{
   input.addEventListener("pointerdown",e=>e.stopPropagation());
   input.addEventListener("click",e=>e.stopPropagation());
   input.addEventListener("change",()=>{
    const field=input.dataset.field;
    n.values[field]=input.type==="checkbox"?String(input.checked):input.value;
    let rebuildNode=false;
    if(n.type==="setcomponent"&&field==="componentType"){
     n.values.property=(componentProperties[input.value]||[["enabled","Enabled"]])[0][0];
     rebuildNode=true;
    }
    if(n.type==="setcomponent"&&["property","source","setMinimum","setMaximum"].includes(field))rebuildNode=true;
    if(rebuildNode){renderNodes();renderInspector()}
    renderCode();
   });
  });
  el.querySelectorAll(".pin").forEach(pin=>{pin.addEventListener("pointerdown",e=>{e.stopPropagation();if(pin.dataset.direction==="output"){e.preventDefault();beginWireDrag(e,n,pin)}});pin.addEventListener("click",e=>{e.preventDefault();e.stopPropagation()})});
  $("canvas").appendChild(el);
 });
 $("emptyState").style.display=nodes.length?"none":"flex";
 $("nodeCount")?.remove();
 drawWires();
}
let wireDrag=null;
function canvasPoint(clientX,clientY){const r=$("canvas").getBoundingClientRect(),w=$("workspace");return{x:clientX-r.left+w.scrollLeft,y:clientY-r.top+w.scrollTop}}
function beginWireDrag(e,node,pin){
 if(e.button!==undefined&&e.button!==0)return;
 if(wireDrag)finishWireDrag(null,true);
 const start=pinPos(node.id,pin.dataset.kind,true,pin.dataset.pin);if(!start)return;
 const path=document.createElementNS("http://www.w3.org/2000/svg","path");path.setAttribute("class","wire wire-preview");path.style.pointerEvents="none";path.style.stroke="#efbd70";path.style.strokeWidth="3";$("wires").appendChild(path);
 wireDrag={node:node.id,kind:pin.dataset.kind,pin:pin.dataset.pin,type:pin.dataset.type||"dynamic",start,path,pointerId:e.pointerId};
 window.addEventListener("pointermove",moveWireDrag);
 window.addEventListener("pointerup",endWireDrag,{once:true});
 window.addEventListener("pointercancel",cancelWireDrag,{once:true});
 moveWireDrag(e);status("Drag to an input pin; it will snap to the nearest compatible input");
}
function moveWireDrag(e){
 if(!wireDrag)return;
 const p=canvasPoint(e.clientX,e.clientY),a=wireDrag.start,dx=Math.max(45,Math.abs(p.x-a.x)*.45);
 wireDrag.path.setAttribute("d","M "+a.x+" "+a.y+" C "+(a.x+dx)+" "+a.y+" "+(p.x-dx)+" "+p.y+" "+p.x+" "+p.y);
 document.querySelectorAll(".pin[data-direction='input']").forEach(pin=>pin.classList.remove("snap-target"));
 const target=findSnapInput(e.clientX,e.clientY,true);if(target)target.pin.classList.add("snap-target");
}
function findSnapInput(x,y,requireNear=true){
 if(!wireDrag)return null;
 let best=null,bestDist=Infinity;
 document.querySelectorAll(".node .pin[data-direction='input']").forEach(pin=>{
  const nodeEl=pin.closest(".node"),nodeId=Number(nodeEl?.dataset.id);if(!nodeEl||nodeId===wireDrag.node)return;
  if(pin.dataset.kind!==wireDrag.kind)return;
  if(wireDrag.kind==="data"){
   const fromDef=getDef(getNode(wireDrag.node)?.type),toDef=getDef(getNode(nodeId)?.type);
   const outType=fromDef?.valueOut||"dynamic",input=(toDef?.dataIn||[]).find(p=>p.id===pin.dataset.pin);
   if(!input||(!BlueprintTypes.compatible(outType,input.type)&&outType!=="dynamic"&&input.type!=="dynamic"))return;
  }
  const r=pin.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,d=Math.hypot(cx-x,cy-y);
  if(d<bestDist){bestDist=d;best={pin,nodeId,distance:d}}
 });
 return best&&(!requireNear||bestDist<=90)?best:null;
}
function endWireDrag(e){
 if(!wireDrag)return;
 const target=e?findSnapInput(e.clientX,e.clientY,true):null;
 finishWireDrag(target,false);
}
function cancelWireDrag(){finishWireDrag(null,true)}
function finishWireDrag(target,cancelled){
 if(!wireDrag)return;
 const drag=wireDrag;wireDrag=null;
 window.removeEventListener("pointermove",moveWireDrag);window.removeEventListener("pointerup",endWireDrag);window.removeEventListener("pointercancel",cancelWireDrag);
 document.querySelectorAll(".pin.snap-target").forEach(p=>p.classList.remove("snap-target"));
 drag.path.remove();
 if(target&&!cancelled){
  links=links.filter(l=>!(l.to===target.nodeId&&l.toPin===target.pin.dataset.pin&&l.kind===drag.kind));
  links.push({from:drag.node,fromPin:drag.pin,to:target.nodeId,toPin:target.pin.dataset.pin,kind:drag.kind});
  status("Connected to nearest input");renderAll();
 }else if(!cancelled)status("No compatible input nearby; release within 90 px of an input pin");
 drawWires();
}
function pinClick(n,kind,isOut,pin){
 if(!pendingPin){if(!isOut){status("Start at an output pin on the right side of a node");return}pendingPin={node:n.id,kind,pin};renderNodes();document.querySelectorAll('.pin[data-direction="output"]').forEach(p=>p.classList.add("pending"));status("Now click a matching input pin on the left side of another node");return}
 const a=pendingPin;pendingPin=null;
 if(a.node===n.id){status("Choose a different node");renderNodes();return}
 if(kind!==a.kind||isOut){status(isOut?"Connections must go from an output to an input":"Pin types do not match");renderNodes();return}
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
 links.forEach((l,index)=>{const a=pinPos(l.from,l.kind,true,l.fromPin),b=pinPos(l.to,l.kind,false,l.toPin);if(!a||!b)return;const dx=Math.max(45,Math.abs(b.x-a.x)*.45);const path=document.createElementNS("http://www.w3.org/2000/svg","path");path.setAttribute("d","M "+a.x+" "+a.y+" C "+(a.x+dx)+" "+a.y+" "+(b.x-dx)+" "+b.y+" "+b.x+" "+b.y);path.setAttribute("class","wire");path.dataset.linkIndex=String(index);path.style.pointerEvents="stroke";if(l.kind==="data")path.style.stroke="#8fb3ff";path.addEventListener("contextmenu",e=>{e.preventDefault();e.stopPropagation();showContextMenu(e.clientX,e.clientY,[{label:"Unconnect",action:()=>{links.splice(index,1);renderAll();status("Connection removed")}}])});svg.appendChild(path)});
}
function setNodeColor(n,color){n.color=color||"";closeContextMenu();renderNodes();renderInspector();status(color?"Node color changed":"Default node color")}
function closeContextMenu(){document.getElementById("blueprintContextMenu")?.remove();document.removeEventListener("pointerdown",outsideContextMenu,true)}
function outsideContextMenu(e){if(!e.target.closest("#blueprintContextMenu"))closeContextMenu()}
function showContextMenu(x,y,items){
 closeContextMenu();const menu=document.createElement("div");menu.id="blueprintContextMenu";menu.className="blueprint-context-menu";menu.style.left=Math.min(x,window.innerWidth-210)+"px";menu.style.top=Math.min(y,window.innerHeight-80)+"px";
 items.forEach(item=>{const row=document.createElement("button");row.type="button";row.className="context-menu-item";row.textContent=item.label;if(item.color!==undefined){const swatch=document.createElement("span");swatch.className="context-color-swatch";swatch.style.background=item.color||"#202531";row.prepend(swatch)}if(item.submenu){row.classList.add("has-submenu");row.textContent=item.label+"  ›";row.onclick=e=>{e.stopPropagation();const r=row.getBoundingClientRect();showContextMenu(r.right,r.top,item.submenu)}}else row.onclick=()=>{closeContextMenu();item.action()};menu.appendChild(row)});
 document.body.appendChild(menu);const r=menu.getBoundingClientRect();if(r.right>window.innerWidth)menu.style.left=Math.max(4,window.innerWidth-r.width-4)+"px";if(r.bottom>window.innerHeight)menu.style.top=Math.max(4,window.innerHeight-r.height-4)+"px";setTimeout(()=>document.addEventListener("pointerdown",outsideContextMenu,true),0);
}
function renderVariables(){
 $("variableList").innerHTML=variables.map(v=>'<div class="variable-card"><div class="variable-top"><strong>'+esc(v.name)+'</strong><span class="type-pill">'+esc(v.type)+'</span></div><div class="variable-meta">'+esc(v.access==="public-hidden"?"Public · hidden from Inspector":v.access==="public-inspector"?"Public · Inspector":v.access==="private"?"Private · hidden":"Private · Inspector")+' · '+esc(v.initial)+'</div><div class="variable-buttons"><button data-edit-var="'+v.id+'">Edit</button><button data-delete-var="'+v.id+'">Delete</button></div></div>').join("")||'<div class="subtle">No variables yet. Create one to use it in Get Variable or Set Variable blocks.</div>';
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