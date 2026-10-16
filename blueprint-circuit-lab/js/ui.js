(function(){
  const CB=window.CB;
  const $=function(id){return document.getElementById(id);};
  function option(value,label){const el=document.createElement("option");el.value=value;el.textContent=label;return el;}
  function updateSaveStatus(text){
    const el=$("saveStatus");if(el)el.textContent=text|| (CB.state.dirty?"Unsaved changes":"Saved locally");
    const status=$("runtimeStatus");if(status&&CB.engine)status.textContent=CB.engine.isRunning()?"Running":"Ready";
  }
  function setMode(mode){
    CB.state.mode=mode==="game"?"game":"code";
    $("codeModeButton").classList.toggle("active",CB.state.mode==="code");
    $("gameModeButton").classList.toggle("active",CB.state.mode==="game");
    $("codeWorkspace").classList.toggle("hidden",CB.state.mode!=="code");
    $("gameWorkspace").classList.toggle("hidden",CB.state.mode!=="game");
    if(CB.state.mode==="game")CB.state.pendingConnection=null;
    CB.game&&CB.game.render();
  }
  function setDock(name){
    CB.state.activeDock=name;
    document.querySelectorAll(".dock-tab").forEach(function(btn){btn.classList.toggle("active",btn.dataset.dock===name);});
    $("consolePanel").classList.toggle("hidden",name!=="console");
    $("codePanel").classList.toggle("hidden",name!=="code");
    $("diagnosticsPanel").classList.toggle("hidden",name!=="diagnostics");
    if(name==="console")CB.diagnostics.render();
    if(name==="code")updateCode();
  }
  function updateCode(){
    const root=$("generatedCode");if(root&&CB.exporters)root.value=CB.exporters.toJS();
  }
  function renderLibrary(){
    const root=$("blockList");if(!root)return;
    const query=$("librarySearch").value.trim().toLowerCase(),category=$("categorySelect").value||"All";
    const blocks=Object.values(CB.defs).filter(function(def){
      return (category==="All"||def.category===category)&&(!query||(def.label+" "+def.type+" "+def.category+" "+def.description).toLowerCase().includes(query));
    }).sort(function(a,b){return a.category.localeCompare(b.category)||a.label.localeCompare(b.label);});
    $("catalogCount").textContent=String(CB.blockCount||Object.keys(CB.defs).length);
    root.innerHTML="";
    if(!blocks.length){const p=document.createElement("p");p.className="subtle";p.textContent="No blocks match that search.";root.appendChild(p);return;}
    blocks.forEach(function(def){
      const btn=document.createElement("button");btn.type="button";btn.className="block-card";btn.title=def.description;
      const swatch=document.createElement("span");swatch.className="block-swatch";swatch.style.background=CB.categoryColors[def.category]||"#9ba8be";
      const copy=document.createElement("span");copy.className="block-card-copy";
      const title=document.createElement("span");title.className="block-card-name";title.textContent=def.label;
      const meta=document.createElement("span");meta.className="block-card-meta";meta.textContent=def.category+" · "+def.type;
      copy.append(title,meta);const plus=document.createElement("span");plus.className="block-card-plus";plus.textContent="+";
      btn.append(swatch,copy,plus);btn.addEventListener("click",function(){
        if(CB.state.mode!=="code")setMode("code");
        const viewport=$("graphViewport"),z=CB.state.zoom||1;
        const x=Math.max(20,(viewport.scrollLeft+viewport.clientWidth/2)/z-120),y=Math.max(20,(viewport.scrollTop+viewport.clientHeight/2)/z-70);
        try{CB.graph.addNode(def.type,x,y);}catch(e){CB.diagnostics.write("error",e.message,"Block library");CB.toast(e.message,"error");}
      });root.appendChild(btn);
    });
  }
  function renderCategories(){
    const select=$("categorySelect"),previous=select.value||"All";
    const categories=Array.from(new Set(Object.values(CB.defs).map(function(d){return d.category;}))).sort();
    select.innerHTML="";select.appendChild(option("All","All categories"));
    categories.forEach(function(c){select.appendChild(option(c,c));});
    select.value=categories.includes(previous)?previous:"All";
  }
  function renderCircuits(){
    const root=$("circuitList");if(!root)return;root.innerHTML="";
    const items=CB.state.project?CB.state.project.circuits:[];
    if(!items.length){const p=document.createElement("p");p.className="subtle";p.textContent="No boards yet. Create one to expose reusable typed inputs and outputs.";root.appendChild(p);return;}
    items.forEach(function(c){
      const row=document.createElement("div");row.className="circuit-item"+(CB.state.activeGraphKey===c.id?" active":"");
      const open=document.createElement("button");open.className="circuit-open";open.textContent="⟁ "+c.name;open.title="Open board";open.addEventListener("click",function(){CB.circuits.open(c.id);});
      open.addEventListener("dblclick",function(){renameCircuit(c);});
      const rename=document.createElement("button");rename.className="circuit-small-btn";rename.textContent="✎";rename.title="Rename board";rename.addEventListener("click",function(){renameCircuit(c);});
      const del=document.createElement("button");del.className="circuit-small-btn";del.textContent="×";del.title="Delete board";del.addEventListener("click",function(){CB.circuits.remove(c.id);});
      row.append(open,rename,del);root.appendChild(row);
    });
  }
  function renameCircuit(c){
    const next=prompt("Rename circuit board",c.name);if(next!==null&&next.trim())CB.circuits.rename(c.id,next);
  }
  function makeField(parent,label,type,value,callback,opts){
    const row=document.createElement("label");row.className="inspector-field";
    const text=document.createElement("span");text.textContent=label;row.appendChild(text);
    const control=CB.graph.control(type,value,callback,Object.assign({multiline:["array","object","vec2"].includes(type)},opts||{}));
    row.appendChild(control);parent.appendChild(row);return control;
  }
  function renderInspector(){
    const root=$("inspectorContent");if(!root)return;root.innerHTML="";
    const graph=CB.activeGraph(),node=graph&&CB.graph.nodeById(graph,CB.state.selectedNodeId);
    if(!node){
      const box=document.createElement("div");box.className="inspector-empty";box.innerHTML='<div class="empty-icon">◎</div><strong>Nothing selected</strong><p>Select a node to edit its input values, exposed circuit pins, and properties.</p>';
      root.appendChild(box);
      if(CB.state.mode==="game")renderSpriteInspector();
      return;
    }
    const def=CB.getDef(node,graph);
    const card=document.createElement("div");card.className="inspector-card";
    const head=document.createElement("div");head.className="inspector-card-head";
    const swatch=document.createElement("span");swatch.className="inspector-swatch";swatch.style.background=CB.categoryColors[def.category]||"#9ba8be";
    const title=document.createElement("div");const strong=document.createElement("strong");strong.textContent=def.label;
    const meta=document.createElement("small");meta.textContent=def.type+" · "+node.id;title.append(strong,meta);head.append(swatch,title);card.appendChild(head);
    const fields=document.createElement("div");fields.className="inspector-fields";
    const desc=document.createElement("p");desc.className="subtle";desc.textContent=def.description;fields.appendChild(desc);
    if(def.inputs.some(function(p){return p.type!=="exec";})){
      const sub=document.createElement("div");sub.className="small-heading";sub.textContent="Inputs and defaults";fields.appendChild(sub);
      def.inputs.filter(function(p){return p.type!=="exec";}).forEach(function(pin){
        makeField(fields,pin.label,pin.type,node.values[pin.id]===undefined?pin.default:node.values[pin.id],function(value){
          node.values[pin.id]=value;CB.touch("Changed "+pin.label);CB.graph.drawWires(graph);updateCode();
        },{options:pin.options});
      });
    }
    if(def.fields&&def.fields.length){
      const sub=document.createElement("div");sub.className="small-heading";sub.textContent="Block properties";fields.appendChild(sub);
      def.fields.forEach(function(f){
        makeField(fields,f.label,f.type,node.data[f.id]===undefined?CB.clone(f.default):node.data[f.id],function(value){
          node.data[f.id]=value;CB.touch("Changed "+f.label);
          if(node.type==="circuit.input"||node.type==="circuit.output"||node.type==="circuit.call"){CB.graph.render();renderCircuits();renderInspector();}
          else updateCode();
        },{options:f.options});
      });
    }
    const note=document.createElement("div");note.className="inspector-note";note.textContent="A connected data pin overrides its saved default value. Use explicit conversion blocks when the input and output types differ.";card.append(fields,note);
    const actions=document.createElement("div");actions.className="inspector-actions";
    const dup=document.createElement("button");dup.className="soft-btn";dup.textContent="Duplicate";dup.addEventListener("click",function(){
      const copy=CB.clone(node);copy.id="n"+(graph.nextId++);copy.x+=35;copy.y+=35;graph.nodes.push(copy);CB.state.selectedNodeId=copy.id;CB.graph.render();renderInspector();CB.touch("Duplicated block");
    });
    const remove=document.createElement("button");remove.className="soft-btn";remove.textContent="Delete node";remove.addEventListener("click",function(){CB.graph.removeNode(node.id,graph);});
    actions.append(dup,remove);root.append(card,actions);
  }
  function renderSpriteInspector(){
    const root=$("spriteInspector");if(!root)return;root.innerHTML="";
    const p=CB.state.project;const sprite=p&&p.sprites.find(function(s){return s.id===CB.state.selectedSpriteId;});
    if(!sprite){const note=document.createElement("p");note.className="subtle";note.textContent="Choose a sprite in the scene, or add one from Quick sprites.";root.appendChild(note);return;}
    const fields=document.createElement("div");fields.className="inspector-fields";
    makeField(fields,"Name","string",sprite.name,function(v){sprite.name=String(v);CB.touch("Renamed sprite");CB.game.render();updateCode();});
    makeField(fields,"Emoji","string",sprite.emoji,function(v){sprite.emoji=String(v);CB.touch("Changed sprite");CB.game.render();});
    makeField(fields,"X","number",sprite.x,function(v){sprite.x=v;CB.touch("Moved sprite");CB.game.render();});
    makeField(fields,"Y","number",sprite.y,function(v){sprite.y=v;CB.touch("Moved sprite");CB.game.render();});
    makeField(fields,"Size","number",sprite.size,function(v){sprite.size=Math.max(8,Math.min(160,v));CB.touch("Resized sprite");CB.game.render();});
    makeField(fields,"Speed","number",sprite.speed,function(v){sprite.speed=Math.max(0,v);CB.touch("Changed sprite speed");});
    makeField(fields,"Tint","color",sprite.color,function(v){sprite.color=v;CB.touch("Changed sprite tint");CB.game.render();});
    makeField(fields,"Shape","select",sprite.shape||"emoji",function(v){sprite.shape=v;CB.touch("Changed sprite shape");CB.game.render();},{options:["emoji","circle","square","triangle"]});
    makeField(fields,"Visible","boolean",sprite.visible!==false,function(v){sprite.visible=v;CB.touch("Changed sprite visibility");CB.game.render();});
    root.appendChild(fields);
    const actions=document.createElement("div");actions.className="sprite-row-actions";
    const center=document.createElement("button");center.className="soft-btn";center.textContent="Center";center.addEventListener("click",function(){sprite.x=Number(p.scene.width)/2;sprite.y=Number(p.scene.height)/2;CB.touch("Centered sprite");renderSpriteInspector();CB.game.render();});
    const remove=document.createElement("button");remove.className="soft-btn";remove.textContent="Remove";remove.addEventListener("click",function(){p.sprites=p.sprites.filter(function(s){return s.id!==sprite.id;});CB.state.selectedSpriteId=null;CB.touch("Removed sprite");renderSpriteInspector();CB.game.render();});
    actions.append(center,remove);root.appendChild(actions);
  }
  function renderPalette(){
    const root=$("spritePalette");if(!root)return;root.innerHTML="";
    (CB.game.palette||[]).forEach(function(emoji){
      const btn=document.createElement("button");btn.className="sprite-choice";btn.type="button";btn.textContent=emoji;btn.title="Add "+emoji+" to scene";btn.addEventListener("click",function(){CB.game.addSprite(emoji);renderSpriteInspector();});
      root.appendChild(btn);
    });
  }
  function renderScene(){
    if(!$("sceneBackground"))return;
    const scene=CB.state.project&&CB.state.project.scene;if(scene)$("sceneBackground").value=/^#[0-9a-f]{6}$/i.test(scene.background)?scene.background:"#111827";
    if(CB.game)CB.game.render();
  }
  function renderAll(){
    renderCategories();renderLibrary();renderCircuits();CB.graph.render();renderInspector();renderSpriteInspector();renderScene();updateCode();updateSaveStatus();
  }
  async function openSavedProjects(){
    $("projectsModal").classList.remove("hidden");
    const root=$("savedProjectsList");root.innerHTML='<div class="saved-empty">Reading projects from this device…</div>';
    let projects=[];
    try{projects=await CB.storage.list();}catch(e){}
    root.innerHTML="";
    if(!projects.length){const empty=document.createElement("div");empty.className="saved-empty";empty.textContent="No saved projects yet. Press Save to store the current project in this browser.";root.appendChild(empty);return;}
    projects.forEach(function(project){
      const row=document.createElement("div");row.className="saved-project";
      const icon=document.createElement("span");icon.className="brand-mark";icon.textContent="⟁";
      const copy=document.createElement("div");copy.className="saved-project-copy";const title=document.createElement("strong");title.textContent=project.name||"Untitled project";
      const meta=document.createElement("small");meta.textContent=(project.mainGraph&&project.mainGraph.nodes?project.mainGraph.nodes.length:0)+" main blocks · "+(project.circuits||[]).length+" boards · saved "+CB.formatDate(project.updatedAt);copy.append(title,meta);
      const load=document.createElement("button");load.className="primary-btn";load.textContent="Open";load.addEventListener("click",async function(){try{const full=await CB.storage.load(project.id);if(!full)throw new Error("Project record was not found.");CB.setProject(full);$("projectsModal").classList.add("hidden");setMode("code");renderAll();CB.diagnostics.write("info","Opened local project: "+full.name,"Storage");CB.toast("Project opened from this device.","success");}catch(e){CB.toast("Could not open project: "+e.message,"error");}});
      const del=document.createElement("button");del.className="soft-btn";del.textContent="Delete";del.addEventListener("click",async function(){if(!confirm("Delete saved project '"+project.name+"' from this browser?"))return;try{await CB.storage.remove(project.id);await openSavedProjects();CB.toast("Saved project deleted.");}catch(e){CB.toast("Could not delete project: "+e.message,"error");}});
      row.append(icon,copy,load,del);root.appendChild(row);
    });
  }
  function loadStarterGraph(gameExample){
    const p=CB.state.project;if(!p)return;
    const example=CB.createDefaultProject();
    if(!gameExample){
      p.mainGraph=CB.clone(example.mainGraph);p.sprites=[];CB.state.activeGraphKey="main";CB.state.selectedNodeId=null;CB.state.selectedSpriteId=null;setMode("code");
      CB.touch("Loaded graph example");renderAll();CB.diagnostics.write("info","Graph example loaded. Run it to print a message to the console.","Example");
      return;
    }
    p.mainGraph={nextId:7,nodes:[
      {id:"n1",type:"event.start",x:90,y:120,values:{},data:{}},
      {id:"n2",type:"game.show-message",x:370,y:120,values:{text:"WASD / arrows move the player. Press Space to score."},data:{}},
      {id:"n3",type:"event.update",x:90,y:390,values:{},data:{}},
      {id:"n4",type:"game.move-sprite",x:390,y:390,values:{name:"Player",speed:180},data:{}},
      {id:"n5",type:"event.key-pressed",x:90,y:650,values:{key:"space"},data:{}},
      {id:"n6",type:"game.add-score",x:390,y:650,values:{amount:1},data:{}}
    ],links:[
      {id:"l1",from:"n1",out:"execOut",to:"n2",in:"execIn"},
      {id:"l2",from:"n3",out:"execOut",to:"n4",in:"execIn"},
      {id:"l3",from:"n5",out:"execOut",to:"n6",in:"execIn"}
    ]};
    p.sprites=[
      {id:"player-sprite",name:"Player",emoji:"🧑",x:160,y:200,size:42,color:"#ffffff",speed:180,visible:true,opacity:1,shape:"emoji",vx:0,vy:0},
      {id:"coin-sprite",name:"Coin",emoji:"🟡",x:390,y:170,size:34,color:"#ffe28a",speed:180,visible:true,opacity:1,shape:"emoji",vx:0,vy:0}
    ];
    CB.state.activeGraphKey="main";CB.state.selectedNodeId=null;CB.state.selectedSpriteId="player-sprite";setMode("code");
    CB.touch("Loaded game example");renderAll();CB.diagnostics.write("info","Game example loaded. Run it, switch to Game Mode, and move the Player with WASD or the arrow keys.","Example");CB.toast("Starter game graph loaded.","success");
  }
  function init(){
    renderCategories();
    $("librarySearch").addEventListener("input",renderLibrary);$("categorySelect").addEventListener("change",renderLibrary);
    $("codeModeButton").addEventListener("click",function(){setMode("code");});
    $("gameModeButton").addEventListener("click",function(){setMode("game");});
    $("newProjectButton").addEventListener("click",newProject);
    $("newProjectFromModal").addEventListener("click",function(){$("projectsModal").classList.add("hidden");newProject();});
    $("loadProjectButton").addEventListener("click",openSavedProjects);
    $("importProjectButton").addEventListener("click",function(){$("projectFileInput").click();});
    $("projectFileInput").addEventListener("change",async function(e){const file=e.target.files&&e.target.files[0];if(!file)return;try{await CB.exporters.importFile(file);}catch(err){CB.diagnostics.write("error",err.message,"Import");CB.toast("Import failed: "+err.message,"error");}finally{e.target.value="";}});
    $("saveProjectButton").addEventListener("click",async function(){try{await CB.storage.save(CB.state.project);CB.toast("Project saved in this browser.","success");CB.diagnostics.write("info","Saved project to local browser storage.","Storage");}catch(e){CB.diagnostics.write("error",e.message,"Storage");CB.toast("Local save failed: "+e.message,"error");}});
    $("projectNameButton").addEventListener("click",function(){const name=prompt("Project name",CB.state.project.name);if(name&&name.trim()){CB.state.project.name=name.trim().slice(0,120);CB.touch("Renamed project");renderAll();}});
    $("exportButton").addEventListener("click",function(){const menu=$("exportMenu");menu.classList.toggle("hidden");$("exportButton").setAttribute("aria-expanded",String(!menu.classList.contains("hidden")));});
    $("exportMenu").querySelectorAll("button[data-export]").forEach(function(btn){btn.addEventListener("click",function(){const format=btn.dataset.export;$("exportMenu").classList.add("hidden");$("exportButton").setAttribute("aria-expanded","false");CB.exporters.exportAs(format);});});
    document.addEventListener("click",function(e){if(!e.target.closest(".export-wrap")){$("exportMenu").classList.add("hidden");$("exportButton").setAttribute("aria-expanded","false");}});
    $("settingsButton").addEventListener("click",openSettings);
    $("saveSettingsButton").addEventListener("click",function(){
      const s={maxFps:Number($("maxFpsSetting").value),messageDelay:Number($("messageDelaySetting").value),autoSave:$("autoSaveSetting").checked};
      CB.storage.saveSettings(s);$("settingsModal").classList.add("hidden");CB.toast("Settings applied.","success");CB.diagnostics.write("info","Settings updated: "+(s.maxFps||"uncapped")+" FPS, "+s.messageDelay+" ms execution delay.","Settings");
    });
    document.querySelectorAll("[data-close]").forEach(function(btn){btn.addEventListener("click",function(){$(btn.dataset.close).classList.add("hidden");});});
    document.querySelectorAll(".modal-backdrop").forEach(function(modal){modal.addEventListener("click",function(e){if(e.target===modal)modal.classList.add("hidden");});});
    $("newCircuitButton").addEventListener("click",function(){$("circuitNameInput").value="Math circuit "+(CB.state.project.circuits.length+1);$("circuitModal").classList.remove("hidden");$("circuitNameInput").focus();$("circuitNameInput").select();});
    $("circuitForm").addEventListener("submit",function(e){e.preventDefault();const name=$("circuitNameInput").value;const board=CB.circuits.create(name,true);if(board){$("circuitModal").classList.add("hidden");renderAll();CB.toast("Circuit board created. Its default graph adds 1 to the input.","success");}});
    $("starterGraphButton").addEventListener("click",function(){if(confirm("Replace the main graph with the starter Start → Print example? Other circuit boards will remain."))loadStarterGraph(false);});
    $("starterGameButton").addEventListener("click",function(){if(confirm("Replace the main graph and scene with the starter movement game?"))loadStarterGraph(true);});
    $("zoomInButton").addEventListener("click",function(){CB.graph.setZoom(CB.state.zoom+.1);});
    $("zoomOutButton").addEventListener("click",function(){CB.graph.setZoom(CB.state.zoom-.1);});
    $("fitGraphButton").addEventListener("click",function(){CB.graph.fitView();});
    $("validateButton").addEventListener("click",function(){CB.diagnostics.validate();});
    $("runButton").addEventListener("click",function(){CB.engine.start();});
    $("stopButton").addEventListener("click",function(){CB.engine.stop("Stopped by user.");});
    $("clearConsoleButton").addEventListener("click",function(){CB.diagnostics.clear();});
    $("copyCodeButton").addEventListener("click",async function(){
      const text=$("generatedCode").value;try{await navigator.clipboard.writeText(text);CB.toast("Generated code copied.","success");}catch(e){$("generatedCode").focus();$("generatedCode").select();CB.toast("Select the text and copy it with Ctrl+C.");}
    });
    document.querySelectorAll(".dock-tab").forEach(function(btn){btn.addEventListener("click",function(){setDock(btn.dataset.dock);});});
    $("collapseDockButton").addEventListener("click",function(){CB.state.dockCollapsed=!CB.state.dockCollapsed;$("bottomDock").classList.toggle("collapsed",CB.state.dockCollapsed);document.querySelectorAll(".dock-content").forEach(function(el){el.classList.toggle("hidden",CB.state.dockCollapsed||!(el.id===CB.state.activeDock+"Panel"));});$("collapseDockButton").textContent=CB.state.dockCollapsed?"⌃":"⌄";});
    $("addSpriteButton").addEventListener("click",function(){CB.game.addSprite("⭐");});
    $("sceneBackground").addEventListener("change",function(){CB.state.project.scene.background=this.value;CB.touch("Changed scene background");CB.game.render();});
    $("resetSceneButton").addEventListener("click",function(){if(!confirm("Remove all sprites from the scene?"))return;CB.state.project.sprites=[];CB.state.selectedSpriteId=null;CB.touch("Reset scene");renderAll();});
    renderPalette();
    const originalRender=CB.ui&&CB.ui.renderAll;
    renderAll();
  }
  async function newProject(){
    if(CB.state.dirty&&!confirm("Start a new project? The current project is saved locally when autosave is enabled."))return;
    if(CB.engine&&CB.engine.isRunning())CB.engine.stop("New project");
    const project=CB.createDefaultProject();project.name="Untitled project";
    CB.setProject(project);setMode("code");renderAll();
    try{await CB.storage.save(CB.state.project);}catch(e){}
    CB.diagnostics.write("info","Created a new local-first project.","Project");CB.toast("New project ready.");
  }
  function openSettings(){
    const s=CB.state.settings;
    $("maxFpsSetting").value=String(s.maxFps===undefined?60:s.maxFps);
    $("messageDelaySetting").value=String(s.messageDelay||0);
    $("autoSaveSetting").checked=s.autoSave!==false;
    $("settingsModal").classList.remove("hidden");
  }
  function updateRunState(isRunning){
    $("runButton").disabled=!!isRunning;$("stopButton").disabled=!isRunning;
    $("runButton").textContent=isRunning?"Running":"▶ Run";
    $("gameStateLabel").textContent=isRunning?"RUNNING":"EDIT MODE";
    $("runtimeStatus").textContent=isRunning?"Running":"Ready";
  }
  CB.ui={init:init,renderAll:renderAll,renderLibrary:renderLibrary,renderCircuits:renderCircuits,renderInspector:renderInspector,renderSpriteInspector:renderSpriteInspector,updateSaveStatus:updateSaveStatus,updateCode:updateCode,setMode:setMode,setDock:setDock,updateRunState:updateRunState,renderPalette:renderPalette};
})();