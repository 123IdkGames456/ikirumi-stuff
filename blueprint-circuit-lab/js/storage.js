(function(){
  const CB=window.CB;
  const DB_NAME="blueprint-circuit-lab-device-projects";
  const DB_VERSION=1;
  const STORE="projects";
  const LAST_KEY="cbl:lastProjectId";
  const SETTINGS_KEY="cbl:settings";
  let db=null,timer=null,opening=null;
  function openDB(){
    if(db)return Promise.resolve(db);
    if(opening)return opening;
    opening=new Promise(function(resolve,reject){
      if(!window.indexedDB){reject(new Error("IndexedDB is unavailable in this browser."));return;}
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=function(){const d=req.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id"});};
      req.onsuccess=function(){db=req.result;db.onversionchange=function(){db.close();db=null;};resolve(db);};
      req.onerror=function(){reject(req.error||new Error("Could not open local project storage."));};
    }).finally(function(){opening=null;});
    return opening;
  }
  function request(mode,action){
    return openDB().then(function(database){return new Promise(function(resolve,reject){
      const tx=database.transaction(STORE,mode),store=tx.objectStore(STORE);let req;
      try{req=action(store);}catch(e){reject(e);return;}
      if(req){req.onsuccess=function(){resolve(req.result);};req.onerror=function(){reject(req.error||new Error("Local database request failed."));};}
      else{tx.oncomplete=function(){resolve(true);};tx.onerror=function(){reject(tx.error||new Error("Local database transaction failed."));};}
    });});
  }
  async function save(project){
    if(!project)throw new Error("No project is open.");
    project.updatedAt=new Date().toISOString();
    const record=CB.clone(project);
    await request("readwrite",function(store){return store.put(record);});
    try{localStorage.setItem(LAST_KEY,project.id);}catch(e){}
    try{
      const json=JSON.stringify(project);
      if(json.length<1600000)localStorage.setItem("cbl:quick:"+project.id,json);
      else localStorage.removeItem("cbl:quick:"+project.id);
    }catch(e){}
    CB.state.dirty=false;
    if(CB.ui&&CB.ui.updateSaveStatus)CB.ui.updateSaveStatus("Saved on this device");
    return record;
  }
  function scheduleAutosave(){
    if(!CB.state.settings.autoSave)return;
    clearTimeout(timer);
    timer=setTimeout(function(){
      if(CB.state.project)save(CB.state.project).catch(function(err){
        if(CB.diagnostics)CB.diagnostics.write("warning","Automatic save failed: "+err.message,"Storage");
        if(CB.ui&&CB.ui.updateSaveStatus)CB.ui.updateSaveStatus("Autosave failed");
      });
    },900);
  }
  async function list(){
    try{
      const all=await request("readonly",function(store){return store.getAll();});
      return (all||[]).sort(function(a,b){return Date.parse(b.updatedAt||0)-Date.parse(a.updatedAt||0);});
    }catch(e){
      const out=[];try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&key.startsWith("cbl:quick:")){try{out.push(JSON.parse(localStorage.getItem(key)));}catch(err){}}}}catch(err){}
      return out.sort(function(a,b){return Date.parse(b.updatedAt||0)-Date.parse(a.updatedAt||0);});
    }
  }
  async function load(id){
    try{const data=await request("readonly",function(store){return store.get(id);});if(data)return data;}catch(e){}
    try{const raw=localStorage.getItem("cbl:quick:"+id);if(raw)return JSON.parse(raw);}catch(e){}
    return null;
  }
  async function loadLatest(){
    let id=null;try{id=localStorage.getItem(LAST_KEY);}catch(e){}
    if(id){const latest=await load(id);if(latest)return latest;}
    const all=await list();return all.length?all[0]:null;
  }
  async function remove(id){
    await request("readwrite",function(store){return store.delete(id);});
    try{localStorage.removeItem("cbl:quick:"+id);if(localStorage.getItem(LAST_KEY)===id)localStorage.removeItem(LAST_KEY);}catch(e){}
  }
  function getSettings(){
    try{return Object.assign({},CB.state.settings,JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}"));}catch(e){return Object.assign({},CB.state.settings);}
  }
  function saveSettings(settings){
    CB.state.settings=Object.assign({},CB.state.settings,settings);
    try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(CB.state.settings));}catch(e){}
  }
  async function init(){
    try{await openDB();return true;}catch(e){
      if(CB.diagnostics)CB.diagnostics.write("warning","Device storage fallback enabled: "+e.message,"Storage");
      return false;
    }
  }
  CB.storage={init: init,save:save,scheduleAutosave:scheduleAutosave,list:list,load:load,loadLatest:loadLatest,remove:remove,getSettings:getSettings,saveSettings:saveSettings};
})();