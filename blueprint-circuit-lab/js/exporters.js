(function(){
  const CB=window.CB;
  function safeName(name){return String(name||"blueprint-project").toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-|-$/g,"")||"blueprint-project";}
  function base64Text(text){return btoa(unescape(encodeURIComponent(text)));}
  function fromBase64(text){return decodeURIComponent(escape(atob(text)));}
  function download(blob,name){
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},2000);
  }
  function jsonSafe(project){return JSON.stringify(project,null,2).replace(/</g,"\\u003c");}
  function exportJSON(){const p=CB.state.project;download(new Blob([JSON.stringify(p,null,2)],{type:"application/json"}),safeName(p.name)+".cbx.json");CB.diagnostics.write("info","Exported portable project JSON. The file keeps nodes, links, circuit boards, scene data and settings.","Export");}
  function toJS(){
    const project=CB.state.project;
    const encoded=base64Text(JSON.stringify(project));
    const lines=[
      "// Blueprint Circuit Lab — generated project representation",
      "// Load this file back into the editor with Import to restore the complete project.",
      "// CBPROJECT_BASE64:"+encoded,
      "const blueprintProject = "+jsonSafe(project)+";",
      "",
      "function listGraph(graph) {",
      "  return graph.nodes.map(node => ({ id: node.id, type: node.type, x: node.x, y: node.y }));",
      "}",
      "function inspectBlueprint() {",
      "  console.table(listGraph(blueprintProject.mainGraph));",
      "  console.info('Connections:', blueprintProject.mainGraph.links.length);",
      "  console.info('Circuit boards:', blueprintProject.circuits.map(board => board.name));",
      "}",
      "",
      "// The graph data above is lossless. Import this file into Blueprint Circuit Lab to edit/run it.",
      "if (typeof window !== 'undefined') window.blueprintProject = blueprintProject;"
    ];
    return lines.join("\n");
  }
  function exportJS(){download(new Blob([toJS()],{type:"text/javascript;charset=utf-8"}),safeName(CB.state.project.name)+".js");CB.diagnostics.write("info","Exported JavaScript representation with lossless embedded project data.","Export");}
  function exportPython(){
    const project=CB.state.project,encoded=base64Text(JSON.stringify(project));
    const nodes=project.mainGraph.nodes.map(function(n){return "# - "+n.id+": "+n.type+" at ("+n.x+", "+n.y+")";}).join("\n");
    const code=[
      "# Blueprint Circuit Lab project export",
      "# Import this .py file into the editor to restore every graph and circuit.",
      "# CBPROJECT_BASE64:"+encoded,
      "import base64",
      "import json",
      "",
      "PROJECT = json.loads(base64.b64decode("+JSON.stringify(encoded)+").decode('utf-8'))",
      "",
      "def inspect_project():",
      "    print('Project:', PROJECT.get('name', 'Untitled project'))",
      "    graph = PROJECT.get('mainGraph', {})",
      "    print('Main graph blocks:', len(graph.get('nodes', [])))",
      "    print('Main graph connections:', len(graph.get('links', [])))",
      "    print('Circuit boards:', [board.get('name', 'Circuit') for board in PROJECT.get('circuits', [])])",
      "",
      "def main():",
      "    inspect_project()",
      "",
      "if __name__ == '__main__':",
      "    main()",
      "",
      "# Main graph nodes:",
      nodes
    ];
    download(new Blob([code.join("\n")],{type:"text/x-python;charset=utf-8"}),safeName(project.name)+".py");
    CB.diagnostics.write("info","Exported Python file with a lossless base64 project payload and a runnable inspection helper.","Export");
  }
  async function exportHTML(){
    const project=CB.state.project;
    const htmlDoc="<!DOCTYPE html>"+document.documentElement.outerHTML;
    let html=htmlDoc;
    const styles=Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    for(const link of styles){
      let text="";
      try{const response=await fetch(link.href);if(!response.ok)throw new Error("CSS fetch failed");text=await response.text();}
      catch(e){throw new Error("Could not package stylesheet "+link.href+". Try downloading the project JSON instead.");}
      html=html.replace(link.outerHTML,"<style>\n"+text.replace(/<\/style/gi,"<\\/style")+"\n</style>");
    }
    const scripts=Array.from(document.querySelectorAll("script[data-cbl-module]"));
    for(const script of scripts){
      let text="";
      try{const response=await fetch(script.src);if(!response.ok)throw new Error("Script fetch failed");text=await response.text();}
      catch(e){throw new Error("Could not package module "+script.getAttribute("data-cbl-module")+". This browser did not allow access to a loaded module.");}
      const inline="<script data-cbl-module=\""+script.getAttribute("data-cbl-module")+"\">\n"+text.replace(/<\/script/gi,"<\\/script")+"\n<\/script>";
      html=html.replace(script.outerHTML,inline);
    }
    const payload=JSON.stringify(project).replace(/</g,"\\u003c");
    const bootstrap='<script id="cb-project-data" type="application/json">'+payload+'</script><script>window.__CB_EMBEDDED_PROJECT=JSON.parse(document.getElementById("cb-project-data").textContent);<\/script>';
    html=html.replace('<script data-cbl-module="core"',bootstrap+'<script data-cbl-module="core"');
    html=html.replace(/<title>[^<]*<\/title>/i,"<title>"+CB.escapeHTML(project.name)+" · Blueprint Circuit Lab</title>");
    download(new Blob([html],{type:"text/html;charset=utf-8"}),safeName(project.name)+".html");
    CB.diagnostics.write("info","Exported a self-contained HTML copy of the editor with the current project embedded.","Export");
  }
  async function exportAs(format){
    try{
      if(format==="json")exportJSON();
      else if(format==="js")exportJS();
      else if(format==="py")exportPython();
      else if(format==="html")await exportHTML();
      else throw new Error("Unknown export format.");
      CB.toast("Export prepared for download.","success");
    }catch(e){CB.diagnostics.write("error",e.message,"Export");CB.toast("Export failed: "+e.message,"error");}
  }
  async function importFile(file){
    if(!file) return null;
    const text=await file.text();let project;
    const ext=(file.name.split(".").pop()||"").toLowerCase();
    if(ext==="html"||ext==="htm"){
      const doc=new DOMParser().parseFromString(text,"text/html"),data=doc.getElementById("cb-project-data");
      if(!data)throw new Error("This HTML file has no embedded Blueprint Circuit Lab project data.");
      project=JSON.parse(data.textContent);
    }else if(ext==="py"){
      const match=text.match(/^# CBPROJECT_BASE64:([A-Za-z0-9+/=]+)$/m);
      if(!match)throw new Error("This Python file has no Blueprint project payload comment.");
      project=JSON.parse(fromBase64(match[1]));
    }else if(ext==="js"){
      const match=text.match(/^\/\/ CBPROJECT_BASE64:([A-Za-z0-9+/=]+)$/m);
      if(!match)throw new Error("This JavaScript file has no Blueprint project payload comment.");
      project=JSON.parse(fromBase64(match[1]));
    }else{
      project=JSON.parse(text);
    }
    const result=CB.normalizeProject(project);
    CB.setProject(result);
    if(CB.ui){CB.ui.setMode("code");CB.ui.renderAll();}
    if(CB.storage){try{await CB.storage.save(CB.state.project);}catch(e){CB.diagnostics.write("warning","Imported successfully, but the browser database could not save it: "+e.message,"Storage");}}
    CB.diagnostics.write("info","Imported project: "+CB.state.project.name,"Import");
    CB.toast("Project imported: "+CB.state.project.name,"success");
    return CB.state.project;
  }
  CB.exporters={exportAs:exportAs,importFile:importFile,toJS:toJS,base64Text:base64Text};
})();