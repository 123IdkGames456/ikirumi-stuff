(function(){
  const CB=window.CB;
  async function init(){
    try{
      await CB.storage.init();
      CB.state.settings=CB.storage.getSettings();
      let project=null;
      if(window.__CB_EMBEDDED_PROJECT){
        try{project=CB.normalizeProject(window.__CB_EMBEDDED_PROJECT);}catch(e){CB.diagnostics.write("warning","Embedded project could not be loaded: "+e.message,"Startup");}
      }
      if(!project)project=await CB.storage.loadLatest();
      if(!project)project=CB.createDefaultProject();
      CB.setProject(project);
      CB.ui.init();
      CB.game.init();
      CB.ui.renderAll();
      CB.diagnostics.write("info","Blueprint Circuit Lab ready. "+CB.blockCount+" typed blocks loaded. Projects stay in this browser unless you export them.","Startup");
      if(CB.state.project.circuits.length)CB.diagnostics.write("info",CB.state.project.circuits.length+" saved circuit board(s) restored.","Startup");
      if(CB.engine&&CB.engine.frame)CB.game.render();
      if(!window.__CB_EMBEDDED_PROJECT&&CB.state.project&&CB.state.project.createdAt===CB.state.project.updatedAt){
        try{await CB.storage.save(CB.state.project);}catch(e){}
      }
      window.addEventListener("beforeunload",function(){if(CB.state.dirty&&CB.state.settings.autoSave)CB.storage.scheduleAutosave();});
    }catch(e){
      const message="The editor could not initialize: "+e.message;
      if(CB.diagnostics)CB.diagnostics.write("error",message,"Startup");
      if(CB.toast)CB.toast(message,"error");
    }
  }
  init();
})();