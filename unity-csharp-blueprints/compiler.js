window.BlueprintCompiler = (() => {
const esc=s=>String(s??"").replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n");
function compile(nodes,links,vars,className){
const safeClass=(className||"BlueprintScript").replace(/[^A-Za-z0-9_]/g,"")||"BlueprintScript";
const lines=["using UnityEngine;","using System;","using System.Collections;","using System.Collections.Generic;","","public class "+safeClass+" : MonoBehaviour","{"];
for(const v of vars){const initial=v.initial||BlueprintTypes.defaultValue(v.type);if(v.access==="public-hidden"){lines.push("    public "+v.type+" "+v.name+" { get; set; } = "+initial+";")}else if(v.access==="public-inspector"){lines.push("    public "+v.type+" "+v.name+" = "+initial+";")}else{const prefix=v.access==="private-inspector"?"[SerializeField] private ":"private ";lines.push("    "+prefix+v.type+" "+v.name+" = "+initial+";")}}
if(vars.length)lines.push("");
const events=nodes.filter(n=>["start","update","fixed"].includes(n.type));
const dataLinks=links.filter(l=>l.kind==="data");
const extraMethods=[],generatedWaits=new Set(),diagnostics=[];
function valueExpr(nodeId,seen=new Set()){
 if(seen.has(nodeId))return "default";
 seen.add(nodeId);
 const n=nodes.find(x=>x.id===nodeId);if(!n)return "0";
 if(n.type==="getcomponent"){const ct=n.values.componentType||"Rigidbody";return valueForInput(n,"target",new Set(seen))+".GetComponent<"+ct+">()"}
 if(n.type==="literal"){const t=n.values.type||"int",v=n.values.value??"0";if(t==="string")return '"'+esc(v)+'"';if(t==="bool")return String(v==="true"||v===true);if(t==="null")return "null";if(t==="float"&&!String(v).endsWith("f"))return v+"f";return String(v)}
 if(n.type==="getvar"){const v=vars.find(x=>x.id===n.values.variable);return v?v.name:"default"}
 if(n.type==="input"){const key=n.values.key||"Space",mode=n.values.mode||"down";return "Input.GetKey"+(mode==="held"?"":mode==="up"?"Up":"Down")+"(KeyCode."+key+")"}
 if(["math","compare","logic"].includes(n.type)){
  const a=valueForInput(n,"a",new Set(seen)),b=valueForInput(n,"b",new Set(seen)),op=n.values.operation||"add";
  const ops={add:"+",subtract:"-",multiply:"*",divide:"/",modulo:"%",eq:"==",ne:"!=",gt:">",lt:"<",gte:">=",lte:"<=",and:"&&",or:"||",xor:"^"};
  if(op==="not")return "!("+a+")";
  let expression;
  if(op==="power")expression="Math.Pow("+a+", "+b+")";
  else if(op==="min")expression="Math.Min("+a+", "+b+")";
  else if(op==="max")expression="Math.Max("+a+", "+b+")";
  else expression="("+a+" "+(ops[op]||"+")+" "+b+")";
  const resultType=n.values.outputType||"float";
  return "("+resultType+")("+expression+")";
 }
 return "default";
}
function valueForInput(n,pin,seen=new Set()){
 const link=dataLinks.find(l=>l.to===n.id&&l.toPin===pin);
 if(link)return valueExpr(link.from,seen);
 const fallbacks={a:"0",b:"0",condition:"false",vector:"Vector3.zero",target:"gameObject",value:n.values?.value||"0"};
 return fallbacks[pin]||"0";
}
function connectedNext(id,pin="Then"){return links.find(x=>x.kind==="flow"&&x.from===id&&x.fromPin===pin)?.to}
function emitFlow(id,indent,visited=new Set()){
 const out=[];let current=id,guard=0;
 while(current&&guard++<nodes.length+2){
  if(visited.has(current)){out.push("    ".repeat(indent)+"// Flow loop detected");break}
  visited.add(current);
  const n=nodes.find(x=>x.id===current);if(!n)break;
  const p="    ".repeat(indent);
  if(n.type==="start"||n.type==="update"||n.type==="fixed"||n.type==="comment"){}
  else if(n.type==="setvar"){const v=vars.find(x=>x.id===n.values.variable);if(v)out.push(p+v.name+" = "+valueForInput(n,"value")+";")}
  else if(n.type==="setcomponent"){
   const ct=n.values.componentType||"HingeJoint",prop=n.values.property||"limits";
   const sourceLink=dataLinks.find(l=>l.to===n.id&&l.toPin==="component");
   const selectedVar=vars.find(v=>v.id===n.values.componentVariable);
   const target=sourceLink?valueExpr(sourceLink.from):selectedVar?selectedVar.name:"GetComponent<"+ct+">()";
   if(prop==="limits"&&ct==="HingeJoint"){
    const min=n.values.setMinimum==="true"?Number(n.values.minimum??-45):null;
    const max=n.values.setMaximum==="true"?Number(n.values.maximum??45):null;
    out.push(p+"{",p+"    var __joint = "+target+";",p+"    var __limits = __joint.limits;");
    if(min!==null)out.push(p+"    __limits.min = "+min+"f;");
    if(max!==null)out.push(p+"    __limits.max = "+max+"f;");
    out.push(p+"    __joint.limits = __limits;",p+"}");
   }else if(prop==="limits"&&ct==="HingeJoint2D"){
    out.push(p+"{",p+"    var __joint = "+target+";",p+"    var __limits = __joint.limits;");
    if(n.values.setMinimum==="true")out.push(p+"    __limits.min = "+Number(n.values.minimum??-45)+"f;");
    if(n.values.setMaximum==="true")out.push(p+"    __limits.max = "+Number(n.values.maximum??45)+"f;");
    out.push(p+"    __joint.limits = __limits;",p+"}");
   }else if(["useLimits","enableCollision","enablePreprocessing","useGravity","isKinematic","detectCollisions","simulated","isTrigger","enabled","loop","playOnAwake","mute","orthographic","isStopped"].includes(prop)){
    out.push(p+target+"."+prop+" = "+(n.values.boolValue||"true")+";");
   }else{
    const raw=n.values.propertyValue||"0";
    const value=["position","localPosition","rotation","localRotation","localScale","center","size","offset","color","constraints","bodyType","motor","spring"].includes(prop)?raw:raw+(["mass","drag","angularDrag","gravityScale","linearDamping","angularDamping","volume","pitch","fieldOfView","orthographicSize","nearClipPlane","farClipPlane","intensity","range","speed","angularSpeed","acceleration","stoppingDistance","motorTorque","brakeTorque","steerAngle","breakForce","breakTorque"].includes(prop)&&!String(raw).endsWith("f")?"f":"");
    out.push(p+target+"."+prop+" = "+value+";");
   }
  }
  else if(n.type==="debug"){
   const level=n.values.level||"log",link=dataLinks.find(l=>l.to===n.id&&l.toPin==="value");
   const msg=link?valueExpr(link.from):'"'+esc(n.values.message||"")+'"';
   out.push(p+"Debug.Log"+(level==="warning"?"Warning":level==="error"?"Error":"")+"("+msg+");");
  }
  else if(n.type==="transform"){
   const op=n.values.operation||"setPosition",v=valueForInput(n,"vector");
   const m={getPosition:"var position = transform.position;",setPosition:"transform.position = "+v+";",translate:"transform.Translate("+v+");",getRotation:"var rotation = transform.rotation;",setRotation:"transform.rotation = Quaternion.Euler("+v+");",getScale:"var scale = transform.localScale;",setScale:"transform.localScale = "+v+";"};
   out.push(p+(m[op]||m.setPosition));
  }
  else if(n.type==="gameobject"){
   const target=valueForInput(n,"target"),op=n.values.operation||"setActive";
   out.push(p+(op==="destroy"?"Destroy("+target+");":op==="instantiate"?"Instantiate("+target+");":target+".SetActive("+(n.values.active||"true")+");"));
  }
  else if(n.type==="wait"){
   out.push(p+"StartCoroutine(BlueprintWait_"+n.id+"());");
   if(!generatedWaits.has(n.id)){
    generatedWaits.add(n.id);
    const next=connectedNext(n.id);
    extraMethods.push("    private IEnumerator BlueprintWait_"+n.id+"()","    {","        yield return new WaitForSeconds("+Number(n.values.seconds||1)+"f);");
    if(next)extraMethods.push(...emitFlow(next,2,new Set(visited)));
    extraMethods.push("    }","");
   }
   break;
  }
  else if(n.type==="if"){
   const cond=valueForInput(n,"condition");
   out.push(p+"if ("+cond+")",p+"{");
   const t=connectedNext(n.id,"True");if(t)out.push(...emitFlow(t,indent+1,new Set(visited)));
   out.push(p+"}");
   const f=connectedNext(n.id,"False");if(f)out.push(p+"else",p+"{",...emitFlow(f,indent+1,new Set(visited)),p+"}");
   break;
  }
  current=connectedNext(current,"Then");
 }
 return out;
}
for(const ev of events){
 const method=ev.type==="start"?"Start":ev.type==="update"?"Update":"FixedUpdate";
 lines.push("    private void "+method+"()","    {");
 const next=connectedNext(ev.id);if(next)lines.push(...emitFlow(next,2,new Set([ev.id])));
 lines.push("    }","");
}
if(!events.length)lines.push("    private void Start()","    {","        // Add an event block and connect actions here.","    }","");
if(extraMethods.length)lines.push(...extraMethods);
lines.push("}");
for(const n of nodes){
 if(["getvar","setvar"].includes(n.type)&&!vars.some(v=>v.id===n.values.variable))diagnostics.push("Choose an existing variable in "+getName(n.type)+".");
 if(n.type==="setcomponent"&&!n.values.componentVariable&&!dataLinks.some(l=>l.to===n.id&&l.toPin==="component"))diagnostics.push(n.values.source==="connected"?"Connect a Get Component From Object block to the component input.":"Choose a component variable or connect a Get Component From Object block.");
 if(n.type==="wait"&&!events.length)diagnostics.push("Wait needs an event block to run.");
 if(n.type==="wait"&&links.some(l=>l.to===n.id&&["update","fixed"].includes(nodes.find(x=>x.id===l.from)?.type)))diagnostics.push("A Wait block connected directly to Update or Fixed Update may start a new coroutine every frame.");
}
function getName(id){return id==="getvar"?"Get Variable":"Set Variable"}
return {code:lines.join("\n"),diagnostics:[...new Set(diagnostics)]};
}
return {compile};
})();