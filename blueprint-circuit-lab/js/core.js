(function(){
  const CB = window.CB = window.CB || {};
  CB.version = "1.0.0";
  CB.defs = Object.create(null);
  CB.state = {
    project: null,
    mode: "code",
    activeGraphKey: "main",
    selectedNodeId: null,
    selectedSpriteId: null,
    pendingConnection: null,
    zoom: 1,
    settings: { maxFps: 60, messageDelay: 0, autoSave: true },
    runtime: { sprites: [], score: 0, message: "", background: "#111827", pointer: {x:320,y:200}, elapsed:0 },
    keys: Object.create(null),
    dirty: false,
    activeDock: "console",
    dockCollapsed: false,
    updateBusy: false,
    draggingNodeId: null
  };
  CB.categoryColors = {
    "Events":"#e9b75f","Flow":"#e9b75f","Math":"#86a6ff","Numbers":"#86a6ff",
    "Logic":"#f2bd65","Compare":"#f2bd65","Strings":"#5cd5b1","Conversions":"#78cfe4",
    "Arrays":"#ed96be","Objects":"#e1bd6b","Vectors":"#c49bff","Colors":"#f48d83",
    "Utility":"#91a8c8","Time":"#91a8c8","Game":"#6dd4e5","Circuits":"#b1a5ff",
    "Debug":"#98a4b9","Variables":"#9aaef8"
  };
  CB.clone = function(value){ return JSON.parse(JSON.stringify(value)); };
  CB.uniqueId = function(prefix){
    let id;
    try { id = prefix + "-" + crypto.randomUUID(); }
    catch(e) { id = prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,10); }
    return id;
  };
  CB.escapeHTML = function(value){
    return String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  };
  CB.activeCircuit = function(){
    if (!CB.state.project || CB.state.activeGraphKey === "main") return null;
    return CB.state.project.circuits.find(function(c){return c.id === CB.state.activeGraphKey;}) || null;
  };
  CB.activeGraph = function(){
    if (!CB.state.project) return null;
    if (CB.state.activeGraphKey === "main") return CB.state.project.mainGraph;
    const circuit = CB.activeCircuit();
    return circuit ? circuit.graph : CB.state.project.mainGraph;
  };
  CB.getCircuit = function(id){
    return CB.state.project && CB.state.project.circuits.find(function(c){return c.id === id;}) || null;
  };
  CB.addDef = function(def){
    def.inputs = def.inputs || [];
    def.outputs = def.outputs || [];
    def.fields = def.fields || [];
    def.defaults = def.defaults || {};
    def.description = def.description || "A typed blueprint block.";
    CB.defs[def.type] = def;
    return def;
  };
  CB.getDef = function(node, graph){
    return node ? CB.defs[node.type] || null : null;
  };
  CB.createDefaultProject = function(){
    return {
      format: "circuit-blueprint-project",
      version: 1,
      id: CB.uniqueId("project"),
      name: "Untitled project",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mainGraph: {
        nextId: 4,
        nodes: [
          {id:"n1",type:"event.start",x:150,y:160,values:{},data:{}},
          {id:"n2",type:"string.constant",x:145,y:390,values:{},data:{value:"Blueprint Circuit Lab is ready."}},
          {id:"n3",type:"flow.print",x:535,y:160,values:{text:"Hello from Blueprint Circuit Lab."},data:{}}
        ],
        links: [
          {id:"l1",from:"n1",out:"execOut",to:"n3",in:"execIn"},
          {id:"l2",from:"n2",out:"value",to:"n3",in:"text"}
        ]
      },
      circuits: [],
      variables: {},
      scene: {width:640,height:400,background:"#111827"},
      sprites: [],
      metadata: {creator:"Blueprint Circuit Lab",notes:""}
    };
  };
  CB.normalizeProject = function(data){
    if (!data || typeof data !== "object") throw new Error("The selected file does not contain a project object.");
    if (data.project && data.format !== "circuit-blueprint-project") data = data.project;
    if (!data.mainGraph || !Array.isArray(data.mainGraph.nodes) || !Array.isArray(data.mainGraph.links)) {
      throw new Error("This file is missing the main graph or its node connections.");
    }
    const project = CB.clone(data);
    project.format = "circuit-blueprint-project";
    project.version = Number(project.version) || 1;
    project.id = project.id || CB.uniqueId("project");
    project.name = String(project.name || "Imported project").slice(0,120);
    project.circuits = Array.isArray(project.circuits) ? project.circuits : [];
    project.variables = project.variables && typeof project.variables === "object" ? project.variables : {};
    project.scene = Object.assign({width:640,height:400,background:"#111827"},project.scene || {});
    project.sprites = Array.isArray(project.sprites) ? project.sprites : [];
    project.metadata = project.metadata || {};
    const graphs = [project.mainGraph].concat(project.circuits.map(function(c){return c.graph;}).filter(Boolean));
    graphs.forEach(function(graph){
      graph.nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
      graph.links = Array.isArray(graph.links) ? graph.links : [];
      graph.nextId = Number(graph.nextId) || graph.nodes.length + 1;
      graph.nodes.forEach(function(node){
        node.id = String(node.id || CB.uniqueId("node"));
        node.type = String(node.type || "unknown.block");
        node.x = Number.isFinite(Number(node.x)) ? Number(node.x) : 100;
        node.y = Number.isFinite(Number(node.y)) ? Number(node.y) : 100;
        node.values = node.values && typeof node.values === "object" ? node.values : {};
        node.data = node.data && typeof node.data === "object" ? node.data : {};
      });
    });
    return project;
  };
  CB.setProject = function(project){
    CB.state.project = CB.normalizeProject(project);
    CB.state.activeGraphKey = "main";
    CB.state.selectedNodeId = null;
    CB.state.selectedSpriteId = null;
    CB.state.pendingConnection = null;
    CB.state.dirty = false;
    CB.state.runtime = {sprites:[],score:0,message:"",background:CB.state.project.scene.background,pointer:{x:320,y:200},elapsed:0};
    CB.state.keys = Object.create(null);
  };
  CB.touch = function(reason, options){
    if (!CB.state.project) return;
    CB.state.project.updatedAt = new Date().toISOString();
    CB.state.dirty = true;
    if (CB.ui && CB.ui.updateSaveStatus) CB.ui.updateSaveStatus(reason || "Unsaved changes");
    if (!(options && options.noAutosave) && CB.storage && CB.storage.scheduleAutosave) CB.storage.scheduleAutosave();
  };
  CB.toast = function(message, type){
    const stack = document.getElementById("toastStack");
    if (!stack) return;
    const item = document.createElement("div");
    item.className = "toast" + (type ? " " + type : "");
    item.textContent = String(message);
    stack.appendChild(item);
    setTimeout(function(){item.remove();},3600);
  };
  CB.parseFieldValue = function(value, type){
    if (type === "number" || type === "integer") {
      const n = Number(value);
      return Number.isFinite(n) ? (type === "integer" ? Math.trunc(n) : n) : 0;
    }
    if (type === "boolean") return value === true || value === "true" || value === 1;
    if (type === "array" || type === "object" || type === "vec2") {
      if (typeof value !== "string") return value;
      try {return JSON.parse(value);} catch(e) {return type === "array" ? [] : type === "vec2" ? {x:0,y:0} : {};}
    }
    return value;
  };
  CB.formatDate = function(value){
    if (!value) return "just now";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "unknown time";
    return date.toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
  };
})();