window.BlueprintCompiler = (() => {
const esc=s=>String(s??"").replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n");
function compile(nodes,links,vars,className){
const lines=["using UnityEngine;","using System;","using System.Collections;","using System.Collections.Generic;","","public class "+(className||"BlueprintScript").replace(/[^A-Za-z0-9_]/g,"")+" : MonoBehaviour","{"];
for(const v of vars){const type=v.type.startsWith("List<")||v.type.endsWith("[]")||v.type.startsWith("Dictionary<")?v.type:v.type;let prefix=v.access==="public"?"public ":v.access==="private-inspector"?"[SerializeField] private ":"private ";lines.push("    "+prefix+type+" "+v.name+" = "+(v.initial??BlueprintTypes.defaultValue(type))+";")}
if(vars.length)lines.push("");
const events=nodes.filter(n=>["start","update","fixed"].includes(n.type));
const dataLinks=links.filter(l=>l.kind==="data");
function valueExpr(nodeId,seen=new Set()){
if(seen.has(nodeId))return "default";seen.add(nodeId);
const n=nodes.find(x=>x.id===nodeId);if(!n)return "0";
const d=BlueprintBlocks.defs.find(x=>x.id===n.type);if(!d)return "0";
if(n.type==="literal"){const t=n.values.type||"int",v=n.values.value??"0";if(t==="string")return '"'+esc(v)+'"';if(t==="bool")return String(v==="true"||v===true);if(t==="null")return "null";if(t==="float"&&!String(v).endsWith("f"))return v+"f";return String(v)}
if(n.type==="getvar"){const v=vars.find(x=>x.id===n.values.variable);return v?v.name:"0"}
if(n.type==="input"){const key=n.values.key||"Space",mode=n.values.mode||"down";return "Input.GetKey"+(mode==="held"?"":mode==="up"?"Up":"Down")+"(KeyCode."+key+")"}
if(n.type==="math"||n.type==="compare"||n.type==="logic"){const a=valueForInput(n,"a",seen),b=valueForInput(n,"b",seen),op=n.values.operation||"add";const ops={add:"+",subtract:"-",multiply:"*",divide:"/",modulo:"%",power:null,min:null,max:null,eq:"==",ne:"!=",gt:">",lt:"<",gte:">=",lte:"<=",and:"&&",or:"||",xor:"^",not:"!"};if(op==="power")return "Mathf.Pow("+a+", "+b+")";if(op==="min")return "Mathf.Min("+a+", "+b+")";if(op==="max")return "Mathf.Max("+a+", "+b+")";if(op==="not")return "!("+a+")";return "("+a+" "+(ops[op]||"+")+" "+b+")"}
return "0";
function valueForInput(n,pin,seen){const link=dataLinks.find(l=>l.to===n.id&&l.toPin===pin);return link?valueExpr(link.from,seen):({a:"0",b:"0",condition:"false",vector:"Vector3.zero",target:"gameObject",value:"0",message:'"Message"'}[pin]||"0")}
}
function connectedNext(id,pin="Then"){const l=links.find(x=>x.kind==="flow"&&x.from===id&&x.fromPin===pin);return l?.to}
function emitFlow(id,indent,visited){const out=[];let current=id,guard=0;while(current&&guard++<nodes.length+2){if(visited.has(current)){out.push("    ".repeat(indent)+"// Flow loop detected");break}visited.add(current);const n=nodes.find(x=>x.id===current);if(!n)break;const p="    ".repeat(indent);if(n.type==="start"||n.type==="update"||n.type==="fixed"||n.type==="comment"){}else if(n.type==="setvar"){const v=vars.find(x=>x.id===n.values.variable);if(v)out.push(p+v.name+" = "+valueExprFromNodeInput(n,"value")+";")}else if(n.type==="debug"){const level=n.values.level||"log",expr=dataLinks.find(l=>l.to===n.id&&l.toPin==="value");const msg=expr?valueExpr(expr.from):'"'+esc(n.values.message||"")+'"';out.push(p+"Debug.Log"+(level==="warning"?"Warning":level==="error"?"Error":"")+"("+msg+");")}else if(n.type==="transform"){const op=n.values.operation||"setPosition",v=valueExprFromNodeInput(n,"vector");const m={getPosition:"var position = transform.position;",setPosition:"transform.position = "+v+";",translate:"transform.Translate("+v+");",getRotation:"var rotation = transform.rotation;",setRotation:"transform.rotation = Quaternion.Euler("+v+");",getScale:"var scale = transform.localScale;",setScale:"transform.localScale = "+v+";"};out.push(p+(m[op]||m.setPosition))}else if(n.type==="gameobject"){const targetLink=dataLinks.find(l=>l.to===n.id&&l.toPin==="target"),target=targetLink?valueExpr(targetLink.from):"gameObject",op=n.values.operation||"setActive";out.push(p+(op==="destroy"?"Destroy("+target+");":op==="instantiate"?"Instantiate("+target+");":target+".SetActive("+(n.values.active||"true")+");"))}else if(n.type==="wait"){out.push(p+"yield return new WaitForSeconds("+Number(n.values.seconds||1)+ "f);")}else if(n.type==="if"){const cond=valueExprFromNodeInput(n,"condition");out.push(p+"if ("+cond+")","    ".repeat(indent)+"{");const t=connectedNext(n.id,"True");if(t)out.push(...emitFlow(t,indent+1,new Set(visited)));out.push(p+"}");const f=connectedNext(n.id,"False");if(f){out.push(p+"else","    ".repeat(indent)+"{",...emitFlow(f,indent+1,new Set(visited)),p+"}")}}current=connectedNext(current,"Then");}
return out;
function valueExprFromNodeInput(n,pin){const l=dataLinks.find(x=>x.to===n.id&&x.toPin===pin);return l?valueExpr(l.from):({value:"0",condition:"false",vector:"Vector3.zero",target:"gameObject",message:'"Message"'}[pin]||"0")}
}
for(const ev of events){const method=ev.type==="start"?"Start":ev.type==="update"?"Update":"FixedUpdate";lines.push("    private "+(ev.type==="start"?"void":"void")+" "+method+"()","    {");const next=connectedNext(ev.id);if(next)lines.push(...emitFlow(next,2,new Set([ev.id])));lines.push("    }","")}
if(!events.length)lines.push("    private void Start()","    {","        // Add an event block and connect actions here.","    }","");
lines.push("}");const code=lines.join("\n");const diagnostics=[];for(const n of nodes){if(n.type==="getvar"||n.type==="setvar"){if(!vars.some(v=>v.id===n.values.variable))diagnostics.push("Choose an existing variable in "+n.type+".")}if(n.type==="wait"&&!events.length)diagnostics.push("Wait needs to be connected to an event to generate runnable code.")}return {code,diagnostics};
}
return {compile};
})();