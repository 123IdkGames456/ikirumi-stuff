(function(){
  const CB=window.CB;
  const baseGetDef=CB.getDef;
  function circuitInputs(circuit){return circuit?circuit.graph.nodes.filter(function(n){return n.type==="circuit.input";}).sort(function(a,b){return a.y-b.y||a.x-b.x;}):[];}
  function circuitOutputs(circuit){return circuit?circuit.graph.nodes.filter(function(n){return n.type==="circuit.output";}).sort(function(a,b){return a.y-b.y||a.x-b.x;}):[];}
  CB.getDef=function(node,graph){
    if(!node)return null;
    if(node.type==="circuit.input"){
      const t=node.data.pinType||"number";
      return Object.assign({},baseGetDef(node,graph),{label:"Input · "+(node.data.pinName||"Value"),outputs:[{id:"value",label:node.data.pinName||"Value",type:t}],inputs:[]});
    }
    if(node.type==="circuit.output"){
      const t=node.data.pinType||"number";
      return Object.assign({},baseGetDef(node,graph),{label:"Output · "+(node.data.pinName||"Result"),inputs:[{id:"value",label:node.data.pinName||"Result",type:t,default:node.values.value===undefined?0:node.values.value}],outputs:[]});
    }
    if(node.type==="circuit.call"){
      const circuit=CB.getCircuit(node.data.circuitId);
      if(!circuit)return Object.assign({},baseGetDef(node,graph),{label:"Circuit Call · Missing board",inputs:[{id:"arg",label:"Input",type:"any",default:null}],outputs:[{id:"result",label:"Result",type:"any"}]});
      const inputs=circuitInputs(circuit),outputs=circuitOutputs(circuit);
      return Object.assign({},baseGetDef(node,graph),{
        label:"Call · "+circuit.name,
        inputs:inputs.map(function(n){return {id:"arg_"+n.id,label:n.data.pinName||"Value",type:n.data.pinType||"number",default:n.values.value===undefined?0:n.values.value};}),
        outputs:outputs.map(function(n){return {id:"result_"+n.id,label:n.data.pinName||"Result",type:n.data.pinType||"number"};}),
        description:"Reusable board: "+circuit.name+". Double-click the board in the left panel to edit its internals."
      });
    }
    return baseGetDef(node,graph);
  };
  function create(name,activate){
    if(!CB.state.project)return null;
    const project=CB.state.project,circuit={
      id:CB.uniqueId("circuit"),
      name:String(name||"New circuit board").trim().slice(0,64)||"New circuit board",
      createdAt:new Date().toISOString(),
      graph:{nextId:5,nodes:[
        {id:"n1",type:"circuit.input",x:90,y:160,values:{},data:{pinName:"A",pinType:"number"}},
        {id:"n2",type:"number.constant",x:110,y:380,values:{},data:{value:1}},
        {id:"n3",type:"math.add",x:430,y:190,values:{a:0,b:0},data:{}},
        {id:"n4",type:"circuit.output",x:760,y:190,values:{value:0},data:{pinName:"Result",pinType:"number"}}
      ],links:[
        {id:"l1",from:"n1",out:"value",to:"n3",in:"a"},
        {id:"l2",from:"n2",out:"value",to:"n3",in:"b"},
        {id:"l3",from:"n3",out:"value",to:"n4",in:"value"}
      ]}
    };
    project.circuits.push(circuit);
    if(activate!==false){CB.state.activeGraphKey=circuit.id;CB.state.selectedNodeId=null;CB.state.mode="code";if(CB.ui)CB.ui.setMode("code");}
    CB.touch("Created circuit board");if(CB.graph)CB.graph.render();if(CB.ui){CB.ui.renderAll();CB.ui.renderInspector();}
    if(CB.diagnostics)CB.diagnostics.write("info","Created circuit board: "+circuit.name,circuit.id);
    return circuit;
  }
  function open(id){
    const c=CB.getCircuit(id);if(!c)return;
    CB.engine&&CB.engine.stop("Switched circuit board");
    CB.state.activeGraphKey=c.id;CB.state.selectedNodeId=null;CB.state.pendingConnection=null;
    CB.state.mode="code";if(CB.ui)CB.ui.setMode("code");
    CB.graph.render();if(CB.ui){CB.ui.renderCircuits();CB.ui.renderInspector();CB.ui.updateCode();}
  }
  function rename(id,name){
    const c=CB.getCircuit(id);if(!c)return;
    const next=String(name||"").trim();if(!next)return;
    c.name=next.slice(0,64);CB.touch("Renamed circuit board");CB.graph.render();if(CB.ui)CB.ui.renderAll();
  }
  function remove(id){
    const c=CB.getCircuit(id);if(!c)return;
    if(!confirm("Delete circuit board '"+c.name+"'? Circuit Call nodes that reference it will become invalid."))return;
    CB.state.project.circuits=CB.state.project.circuits.filter(function(item){return item.id!==id;});
    if(CB.state.activeGraphKey===id)CB.state.activeGraphKey="main";
    CB.state.selectedNodeId=null;CB.touch("Deleted circuit board");CB.graph.render();if(CB.ui)CB.ui.renderAll();
  }
  CB.circuits={create:create,open:open,rename:rename,remove:remove,getInputs:circuitInputs,getOutputs:circuitOutputs};
})();