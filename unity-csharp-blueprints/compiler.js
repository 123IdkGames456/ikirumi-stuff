window.BlueprintCompiler = (() => {
const keywords=new Set(("abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while").split(" "));
const numericTypes=new Set(["byte","sbyte","short","ushort","int","uint","long","ulong","float","double","decimal"]);
const allNumeric=["byte","sbyte","short","ushort","int","uint","long","ulong","float","double","decimal"];
const boolProperties=new Set(["useLimits","enableCollision","enablePreprocessing","useGravity","isKinematic","detectCollisions","simulated","isTrigger","enabled","loop","playOnAwake","mute","orthographic","isStopped"]);
const properties={
 HingeJoint:{limits:"JointLimits",useLimits:"bool",motor:"JointMotor",spring:"JointSpring",breakForce:"float",breakTorque:"float",enableCollision:"bool",enablePreprocessing:"bool"},
 HingeJoint2D:{limits:"JointAngleLimits2D",useLimits:"bool",motor:"JointMotor2D",breakForce:"float",breakTorque:"float",enableCollision:"bool"},
 Rigidbody:{mass:"float",drag:"float",angularDrag:"float",useGravity:"bool",isKinematic:"bool",detectCollisions:"bool",constraints:"RigidbodyConstraints"},
 Rigidbody2D:{mass:"float",gravityScale:"float",linearDamping:"float",angularDamping:"float",simulated:"bool",bodyType:"RigidbodyType2D",constraints:"RigidbodyConstraints2D"},
 Transform:{position:"Vector3",localPosition:"Vector3",rotation:"Quaternion",localRotation:"Quaternion",localScale:"Vector3"},
 Collider:{enabled:"bool",isTrigger:"bool"},Collider2D:{enabled:"bool",isTrigger:"bool"},
 BoxCollider:{enabled:"bool",isTrigger:"bool",center:"Vector3",size:"Vector3"},
 BoxCollider2D:{enabled:"bool",isTrigger:"bool",offset:"Vector2",size:"Vector2"},
 AudioSource:{volume:"float",pitch:"float",loop:"bool",playOnAwake:"bool",mute:"bool"},
 Camera:{fieldOfView:"float",orthographic:"bool",orthographicSize:"float",nearClipPlane:"float",farClipPlane:"float"},
 Light:{intensity:"float",range:"float",color:"Color",enabled:"bool"},
 NavMeshAgent:{speed:"float",angularSpeed:"float",acceleration:"float",stoppingDistance:"float",isStopped:"bool"},
 WheelCollider:{motorTorque:"float",brakeTorque:"float",steerAngle:"float"}
};
function escString(value){return JSON.stringify(String(value??""))}
function safeIdentifier(value,fallback="BlueprintScript",used=new Set()){
 let name=String(value||fallback).replace(/[^A-Za-z0-9_]/g,"_");
 if(!name)name=fallback;
 if(!/^[A-Za-z_]/.test(name))name="_"+name;
 if(keywords.has(name)||["transform","gameObject","enabled","name","tag","Start","Update","FixedUpdate","Awake","OnEnable","OnDisable","GetComponent","Destroy","Instantiate","Debug","Time","Input"].includes(name))name="blueprint_"+name;
 const base=name;let i=2;
 while(used.has(name)){name=base+"_"+i++}
 used.add(name);return name;
}
function cleanNumber(value,type){
 let raw=String(value??"0").trim();
 const suffix={float:"f",double:"d",decimal:"m",long:"L",ulong:"UL",uint:"U",int:"",byte:"",sbyte:"",short:"",ushort:""}[type]??"";
 if(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[fFdDmMlLuU]*$/.test(raw)){
  raw=raw.replace(/[fFdDmMlLuU]+$/,"");
  if(["byte","sbyte","short","ushort","int","uint","long","ulong"].includes(type)&&/[.eE]/.test(raw))return "("+type+")("+raw+")";
  return raw+suffix;
 }
 return raw||"0";
}
function compile(inputNodes,inputLinks,inputVars,className){
 const nodes=Array.isArray(inputNodes)?inputNodes:[];
 const links=Array.isArray(inputLinks)?inputLinks:[];
 const vars=Array.isArray(inputVars)?inputVars:[];
 const diagnostics=[],classFields=[],methods=[],extraMethods=[],generatedWaits=new Set();
 const report=message=>{if(!diagnostics.includes(message))diagnostics.push(message)};
 const usedNames=new Set(["Start","Update","FixedUpdate"]);
 const safeClass=safeIdentifier(className||"BlueprintScript","BlueprintScript",new Set());
 usedNames.add(safeClass);
 const varsById=new Map();
 for(const v of vars){
  const entry={...v,codeName:safeIdentifier(v.name,"Variable",usedNames),type:String(v.type||"int")};
  if(varsById.has(v.id))report("Duplicate variable id detected: "+v.name);
  varsById.set(v.id,entry);
 }
 const dataLinks=links.filter(l=>l.kind==="data");
 const findNode=id=>nodes.find(n=>n.id===id);
 const findVar=id=>varsById.get(id);
 const connected=(id,pin)=>links.find(l=>l.kind==="flow"&&l.from===id&&l.fromPin===pin)?.to;
 const dataLink=(id,pin)=>dataLinks.find(l=>l.to===id&&l.toPin===pin);
 const outputConnected=id=>dataLinks.some(l=>l.from===id&&l.fromPin==="value");
 const spawnedNames=new Map(),waitFlagNames=new Map(),waitMethodNames=new Map();
 for(const n of nodes){
  if(n.type==="gameobject"&&(n.values?.operation||"setActive")==="instantiate"&&outputConnected(n.id))spawnedNames.set(n.id,safeIdentifier("__blueprintSpawned_"+n.id,"__blueprintSpawned",usedNames));
  if(n.type==="wait"){
   waitFlagNames.set(n.id,safeIdentifier("__blueprintWaitRunning_"+n.id,"__blueprintWaitRunning",usedNames));
   waitMethodNames.set(n.id,safeIdentifier("__blueprintWait_"+n.id,"__blueprintWait",usedNames));
  }
 }
 const propertyType=(component,property)=>properties[component]?.[property]||"object";
 function nodeType(n){
  if(!n)return "dynamic";
  if(n.type==="literal")return n.values?.type==="null"?"null":(n.values?.type||"int");
  if(n.type==="getvar")return findVar(n.values?.variable)?.type||"dynamic";
  if(n.type==="getcomponent")return n.values?.componentType||"Rigidbody";
  if(n.type==="math")return n.values?.outputType||"float";
  if(n.type==="fromto")return n.values?.toType||"string";
  if(n.type==="compare"||n.type==="logic"||n.type==="input")return "bool";
  if(n.type==="transform"){
   const op=n.values?.operation||"setPosition";
   return op==="getPosition"||op==="getScale"?"Vector3":op==="getRotation"?"Quaternion":"none";
  }
  if(n.type==="gameobject")return (n.values?.operation||"setActive")==="instantiate"?"GameObject":"none";
  return "dynamic";
 }
 function typedDefault(type){
  const defaults={bool:"false",byte:"0",sbyte:"0",short:"0",ushort:"0",int:"0",uint:"0U",long:"0L",ulong:"0UL",float:"0f",double:"0d",decimal:"0m",string:'""',char:"'\\0'",Vector2:"Vector2.zero",Vector2Int:"Vector2Int.zero",Vector3:"Vector3.zero",Vector3Int:"Vector3Int.zero",Vector4:"Vector4.zero",Quaternion:"Quaternion.identity",Color:"Color.white",Color32:"new Color32(255,255,255,255)",Rect:"new Rect()",Bounds:"new Bounds()",LayerMask:"0",GameObject:"null",Transform:"null",Rigidbody:"null",Rigidbody2D:"null",Collider:"null",Collider2D:"null",JointMotor:"new JointMotor()",JointMotor2D:"new JointMotor2D()",JointSpring:"new JointSpring()",JointLimits:"new JointLimits()",JointAngleLimits2D:"new JointAngleLimits2D()",RigidbodyConstraints:"RigidbodyConstraints.None",RigidbodyConstraints2D:"RigidbodyConstraints2D.None",RigidbodyType2D:"RigidbodyType2D.Dynamic",object:"null"};
  return defaults[type]??"default("+type+")";
 }
 function typedFallback(raw,type){
  const value=String(raw??"").trim();
  if(!value)return typedDefault(type);
  if(numericTypes.has(type))return cleanNumber(value,type);
  if(type==="string"){
   if(value==="null"||value.startsWith('"')||value.startsWith("string.")||value.startsWith("nameof("))return value;
   return escString(value);
  }
  if(type==="bool")return value==="true"||value==="false"?value:value;
  if(type==="Vector2"&&value==="0")return "Vector2.zero";
  if(type==="Vector3"&&value==="0")return "Vector3.zero";
  if(type==="Vector4"&&value==="0")return "Vector4.zero";
  if(type==="Quaternion"&&value==="0")return "Quaternion.identity";
  if(type==="Color"&&value==="0")return "Color.white";
  const enumDefaults={RigidbodyConstraints:"RigidbodyConstraints.None",RigidbodyConstraints2D:"RigidbodyConstraints2D.None",RigidbodyType2D:"RigidbodyType2D.Dynamic"};
  if(enumDefaults[type]&&value==="0")return enumDefaults[type];
  if(Object.prototype.hasOwnProperty.call(enumDefaults,type)&&/^-?\d+$/.test(value))return "("+type+")"+value;
  return value;
 }
 function convertNumeric(expr,from,to){
  if(from===to||!numericTypes.has(from)||!numericTypes.has(to))return expr;
  return "("+to+")("+expr+")";
 }
 function fromToExpression(n,seen){
  const from=n.values?.fromType||"float",to=n.values?.toType||"string";
  const raw=valueForInput(n,"value",new Set(seen),from);
  if(from===to)return raw;
  const numericFrom=numericTypes.has(from),numericTo=numericTypes.has(to);
  if(to==="string")return "("+raw+").ToString()";
  if(from==="string"){
   const parse={bool:"bool.Parse",byte:"byte.Parse",sbyte:"sbyte.Parse",short:"short.Parse",ushort:"ushort.Parse",int:"int.Parse",uint:"uint.Parse",long:"long.Parse",ulong:"ulong.Parse",float:"float.Parse",double:"double.Parse",decimal:"decimal.Parse"};
   if(parse[to]){
    if(to==="bool")return "bool.Parse("+raw+")";
    return parse[to]+"("+raw+", System.Globalization.CultureInfo.InvariantCulture)";
   }
  }
  if(to==="bool"){
   if(from==="bool")return raw;
   if(numericFrom){const zero={byte:"0",sbyte:"0",short:"0",ushort:"0",int:"0",uint:"0U",long:"0L",ulong:"0UL",float:"0f",double:"0d",decimal:"0m"}[from];return "("+raw+" != "+zero+")"}
  }
  if(from==="bool"&&numericTo){
   const one={byte:"(byte)1",sbyte:"(sbyte)1",short:"(short)1",ushort:"(ushort)1",int:"1",uint:"1U",long:"1L",ulong:"1UL",float:"1f",double:"1d",decimal:"1m"}[to]||"1";
   const zero={byte:"(byte)0",sbyte:"(sbyte)0",short:"(short)0",ushort:"(ushort)0",int:"0",uint:"0U",long:"0L",ulong:"0UL",float:"0f",double:"0d",decimal:"0m"}[to]||"0";
   return "("+raw+" ? "+one+" : "+zero+")";
  }
  if(numericFrom&&numericTo){
   if(to==="int"&&from==="float")return "Mathf.CeilToInt("+raw+")";
   if(to==="int"&&from==="double")return "checked((int)Math.Ceiling("+raw+"))";
   if(to==="int"&&from==="decimal")return "checked((int)decimal.Ceiling("+raw+"))";
   if(to==="long"&&["float","double"].includes(from))return "checked((long)Math.Ceiling((double)("+raw+")))";
   if(to==="long"&&from==="decimal")return "checked((long)decimal.Ceiling("+raw+"))";
   return convertNumeric(raw,from,to);
  }
  report("From To cannot safely convert "+from+" to "+to+".");
  return typedDefault(to);
 }
 function coerceExpression(expr,from,to,n){
  if(!to||to==="dynamic"||to==="any"||to==="number"||to==="object"||from===to||from==="dynamic"||from==="any")return expr;
  if(from==="null"&&(to==="string"||to==="object"||!BlueprintTypes.isValue(to)))return expr;
  if(numericTypes.has(from)&&numericTypes.has(to))return convertNumeric(expr,from,to);
  if(BlueprintTypes.compatible(from,to))return expr;
  if(to==="Component"&&BlueprintTypes.unity.includes(from))return expr;
  report("Type mismatch: "+from+" cannot be used as "+to+(n?" on "+n.type:"")+".");
  return typedDefault(to);
 }
 function valueExpr(nodeId,seen=new Set(),expectedType=null){
  const n=findNode(nodeId);
  if(!n){report("A value input points to a missing node.");return typedDefault(expectedType||"int")}
  if(seen.has(nodeId)){report("A data connection loop was detected at "+n.type+".");return typedDefault(expectedType||nodeType(n))}
  const path=new Set(seen);path.add(nodeId);
  let expression,sourceType=nodeType(n);
  if(n.type==="literal"){
   const type=n.values?.type||"int",raw=n.values?.value??"0";
   if(type==="string")expression=escString(raw);
   else if(type==="null")expression="null";
   else if(type==="bool")expression=raw==="true"||raw===true?"true":"false";
   else if(numericTypes.has(type))expression=cleanNumber(raw,type);
   else expression=typedFallback(raw,type);
  }else if(n.type==="getvar"){
   const v=findVar(n.values?.variable);
   if(!v){report("Choose a variable in Get Variable.");expression=typedDefault(expectedType||"int")}
   else expression=v.codeName;
  }else if(n.type==="input"){
   const key=n.values?.key||"Space",mode=n.values?.mode||"down";
   expression="Input.GetKey"+(mode==="held"?"":mode==="up"?"Up":"Down")+"(KeyCode."+key+")";
  }else if(n.type==="getcomponent"){
   const ct=n.values?.componentType||"Rigidbody";
   const target=valueForInput(n,"target",path,"GameObject");
   expression="((GameObject)("+target+"))?.GetComponent<"+ct+">()";
  }else if(n.type==="fromto"){
   expression=fromToExpression(n,path);
  }else if(n.type==="math"){
   const type=n.values?.outputType||"float",op=n.values?.operation||"add";
   const a=valueForInput(n,"a",path,type),b=valueForInput(n,"b",path,type);
   if(op==="power"){
    if(type==="float")expression="Mathf.Pow("+a+", "+b+")";
    else if(type==="decimal")expression="(decimal)Math.Pow((double)("+a+"), (double)("+b+"))";
    else expression="("+type+")Math.Pow((double)("+a+"), (double)("+b+"))";
   }else if(op==="min"||op==="max"){
    const method=op==="min"?"Min":"Max";
    expression=type==="float"?"Mathf."+method+"("+a+", "+b+")":"Math."+method+"("+a+", "+b+")";
   }else{
    const ops={add:"+",subtract:"-",multiply:"*",divide:"/",modulo:"%"};
    expression="("+a+" "+(ops[op]||"+")+" "+b+")";
   }
  }else if(n.type==="compare"){
   const type=n.values?.operandType||"float",op=n.values?.operation||"eq";
   const a=valueForInput(n,"a",path,type),b=valueForInput(n,"b",path,type);
   const opMap={eq:"==",ne:"!=",gt:">",lt:"<",gte:">=",lte:"<="};
   if(type==="string"&&["gt","lt","gte","lte"].includes(op)){
    expression="(string.CompareOrdinal("+a+", "+b+") "+opMap[op]+" 0)";
   }else if(type==="bool"&&["gt","lt","gte","lte"].includes(op)){
    report("Boolean comparison supports only Equal and Not equal.");
    expression="false";
   }else expression="("+a+" "+(opMap[op]||"==")+" "+b+")";
  }else if(n.type==="logic"){
   const op=n.values?.operation||"and",a=valueForInput(n,"a",path,"bool"),b=valueForInput(n,"b",path,"bool");
   expression=op==="not"?"!("+a+")":"("+a+" "+({and:"&&",or:"||",xor:"^"}[op]||"&&")+" "+b+")";
  }else if(n.type==="transform"){
   const op=n.values?.operation||"setPosition";
   expression=op==="getPosition"?"transform.position":op==="getRotation"?"transform.rotation":op==="getScale"?"transform.localScale":typedDefault("Vector3");
   if(!["getPosition","getRotation","getScale"].includes(op))report("A Transform setter cannot be used as a value output.");
  }else if(n.type==="gameobject"&&(n.values?.operation||"setActive")==="instantiate"){
   expression=spawnedNames.get(n.id)||("__blueprintSpawned_"+n.id);
  }else{
   report("The "+(n.type||"unknown")+" block does not provide a usable value output.");
   expression=typedDefault(expectedType||"int");
  }
  return coerceExpression(expression,sourceType,expectedType,n);
 }
 function valueForInput(n,pin,seen=new Set(),expectedType=null){
  const link=dataLink(n.id,pin);
  if(link)return valueExpr(link.from,seen,expectedType);
  if(pin==="minimumValue")return typedFallback(n.values?.minimum??"-45","float");
  if(pin==="maximumValue")return typedFallback(n.values?.maximum??"45","float");
  if(pin==="propertyValueInput")return propertyFallback(n);
  if(pin==="value"&&n.type==="setvar"){
   const v=findVar(n.values?.variable);
   return typedFallback(n.values?.value??"0",expectedType||v?.type||"int");
  }
  if(pin==="value"&&n.type==="fromto")return typedDefault(expectedType||n.values?.fromType||"float");
  if(pin==="a"||pin==="b")return typedDefault(expectedType||"int");
  const fallbacks={condition:"false",vector:"Vector3.zero",target:"gameObject",component:"null"};
  if(fallbacks[pin])return fallbacks[pin];
  if(expectedType)return typedDefault(expectedType);
  return "0";
 }
 function propertyFallback(n){
  const ct=n.values?.componentType||"HingeJoint",prop=n.values?.property||"limits",type=propertyType(ct,prop),raw=n.values?.propertyValue??"0";
  const value=String(raw).trim();
  if(numericTypes.has(type))return typedFallback(value,type);
  if(type==="string")return typedFallback(value,type);
  if(type==="bool")return value==="true"||value==="false"?value:"false";
  const enumDefaults={RigidbodyConstraints:"RigidbodyConstraints.None",RigidbodyConstraints2D:"RigidbodyConstraints2D.None",RigidbodyType2D:"RigidbodyType2D.Dynamic"};
  if(enumDefaults[type]){
   if(/^-?\d+$/.test(value)&&value!=="0")return "("+type+")"+value;
   return enumDefaults[type];
  }
  if(value==="0")return typedDefault(type);
  return value;
 }
 function variableInitializer(v){
  const raw=String(v.initial??"").trim();
  if(!raw)return BlueprintTypes.defaultValue(v.type);
  return typedFallback(raw,v.type);
 }
 function emitFlow(id,indent,visited=new Set()){
  const out=[];let current=id,guard=0;
  while(current&&guard++<nodes.length+2){
   if(visited.has(current)){report("A flow loop was detected. The repeated action was stopped in generated code.");break}
   visited.add(current);
   const n=findNode(current);if(!n)break;
   const p="    ".repeat(indent);
   if(["start","update","fixed","comment"].includes(n.type)){}
   else if(n.type==="setvar"){
    const v=findVar(n.values?.variable);
    if(!v)report("Choose a variable in Set Variable.");
    else out.push(p+v.codeName+" = "+valueForInput(n,"value",new Set(),v.type)+";");
   }else if(n.type==="setcomponent"){
    const ct=n.values?.componentType||"HingeJoint",prop=n.values?.property||"limits";
    const sourceLink=dataLink(n.id,"component"),selected=findVar(n.values?.componentVariable);
    let target;
    if(sourceLink)target=valueExpr(sourceLink.from,new Set(),ct);
    else if(n.values?.source==="connected"){report("Connect a component to Set Component Property.");target="GetComponent<"+ct+">()"}
    else if(selected)target=selected.codeName;
    else {report("Choose a component variable or connect a component input.");target="GetComponent<"+ct+">()"}
    if(prop==="limits"&&ct==="HingeJoint"){
     const min=n.values?.setMinimum==="true"?valueForInput(n,"minimumValue",new Set(),"float"):null;
     const max=n.values?.setMaximum==="true"?valueForInput(n,"maximumValue",new Set(),"float"):null;
     out.push(p+"{",p+"    var __joint_"+n.id+" = "+target+";",p+"    if (__joint_"+n.id+" != null)",p+"    {",p+"        var __limits_"+n.id+" = __joint_"+n.id+".limits;");
     if(min!==null)out.push(p+"        __limits_"+n.id+".min = "+min+";");
     if(max!==null)out.push(p+"        __limits_"+n.id+".max = "+max+";");
     out.push(p+"        __joint_"+n.id+".limits = __limits_"+n.id+";",p+"        __joint_"+n.id+".useLimits = true;",p+"    }",p+"}");
    }else if(prop==="limits"&&ct==="HingeJoint2D"){
     const min=n.values?.setMinimum==="true"?valueForInput(n,"minimumValue",new Set(visited),"float"):null;
     const max=n.values?.setMaximum==="true"?valueForInput(n,"maximumValue",new Set(visited),"float"):null;
     out.push(p+"{",p+"    var __joint_"+n.id+" = "+target+";",p+"    if (__joint_"+n.id+" != null)",p+"    {",p+"        var __limits_"+n.id+" = __joint_"+n.id+".limits;");
     if(min!==null)out.push(p+"        __limits_"+n.id+".min = "+min+";");
     if(max!==null)out.push(p+"        __limits_"+n.id+".max = "+max+";");
     out.push(p+"        __joint_"+n.id+".limits = __limits_"+n.id+";",p+"        __joint_"+n.id+".useLimits = true;",p+"    }",p+"}");
    }else if(prop==="limits"){
     report("Limits are only implemented for HingeJoint and HingeJoint2D.");
    }else if(boolProperties.has(prop)){
     out.push(p+"if ("+target+" != null) "+target+"."+prop+" = "+(n.values?.boolValue==="false"?"false":"true")+";");
    }else{
     const type=propertyType(ct,prop),link=dataLink(n.id,"propertyValueInput");
     const val=link?valueForInput(n,"propertyValueInput",new Set(),type):propertyFallback(n);
     out.push(p+"{",p+"    var __component_"+n.id+" = "+target+";",p+"    if (__component_"+n.id+" != null)",p+"    {",p+"        __component_"+n.id+"."+prop+" = "+val+";",p+"    }",p+"}");
    }
   }else if(n.type==="debug"){
    const level=n.values?.level||"log",link=dataLink(n.id,"value");
    let msg;
    if(link){
     msg=valueExpr(link.from,new Set());
     const source=findNode(link.from);
     if(source?.type==="math"&&msg.startsWith("(")&&msg.endsWith(")"))msg=msg.slice(1,-1);
    }else msg=escString(n.values?.message||"");
    out.push(p+"Debug.Log"+(level==="warning"?"Warning":level==="error"?"Error":"")+"("+msg+");");
   }else if(n.type==="transform"){
    const op=n.values?.operation||"setPosition",v=valueForInput(n,"vector",new Set(),"Vector3");
    const code={setPosition:"transform.position = "+v+";",translate:"transform.Translate("+v+");",setRotation:"transform.rotation = Quaternion.Euler("+v+");",setScale:"transform.localScale = "+v+";"};
    if(code[op])out.push(p+code[op]);
   }else if(n.type==="gameobject"){
    const target=valueForInput(n,"target",new Set(),"GameObject"),op=n.values?.operation||"setActive";
    if(op==="destroy")out.push(p+"if ("+target+" != null) Destroy("+target+");");
    else if(op==="instantiate"){
     if(outputConnected(n.id))out.push(p+(spawnedNames.get(n.id)||("__blueprintSpawned_"+n.id))+" = Instantiate("+target+");");
     else out.push(p+"Instantiate("+target+");");
    }else out.push(p+"if ("+target+" != null) "+target+".SetActive("+(n.values?.active==="false"?"false":"true")+");");
   }else if(n.type==="wait"){
    const flag=waitFlagNames.get(n.id)||("__blueprintWaitRunning_"+n.id),method=waitMethodNames.get(n.id)||("__blueprintWait_"+n.id);
    if(!generatedWaits.has(n.id)){
     generatedWaits.add(n.id);
     classFields.push("    private bool "+flag+";");
     extraMethods.push("    private IEnumerator "+method+"()","    {","        "+flag+" = true;","        yield return new WaitForSeconds(Mathf.Max(0f, "+cleanNumber(n.values?.seconds??"1","float")+"));");
     const next=connected(n.id,"Then");
     if(next)extraMethods.push(...emitFlow(next,2,new Set(visited)));
     extraMethods.push("        "+flag+" = false;","    }","");
    }
    out.push(p+"if (!"+flag+") StartCoroutine("+method+"());");
    break;
   }else if(n.type==="if"){
    const cond=valueForInput(n,"condition",new Set(),"bool");
    out.push(p+"if ("+cond+")",p+"{");
    const t=connected(n.id,"True");if(t)out.push(...emitFlow(t,indent+1,new Set(visited)));
    out.push(p+"}",p+"else",p+"{");
    const f=connected(n.id,"False");if(f)out.push(...emitFlow(f,indent+1,new Set(visited)));
    out.push(p+"}");
    break;
   }
   current=connected(current,"Then");
  }
  return out;
 }
 for(const n of nodes){
  if(n.type==="gameobject"&&(n.values?.operation||"setActive")==="instantiate"&&outputConnected(n.id))classFields.push("    private GameObject "+(spawnedNames.get(n.id)||("__blueprintSpawned_"+n.id))+";");
  if(n.type==="getvar"&&!findVar(n.values?.variable))report("Choose an existing variable in Get Variable.");
  if(n.type==="setvar"&&!findVar(n.values?.variable))report("Choose an existing variable in Set Variable.");
  if(n.type==="wait"&&(!Number.isFinite(Number(n.values?.seconds??1))||Number(n.values?.seconds??1)<0))report("Wait seconds should be a non-negative number.");
  if(n.type==="input")report("Input Check uses Unity's classic Input API. Set Active Input Handling to Input Manager (Old) or Both.");
  if(n.type==="compare"&&n.values?.operandType==="bool"&&["gt","lt","gte","lte"].includes(n.values?.operation))report("Boolean comparison supports only Equal and Not equal.");
 }
 for(const v of vars){
  const name=varsById.get(v.id)?.codeName||safeIdentifier(v.name,"Variable",usedNames),type=String(v.type||"int"),initial=variableInitializer(v);
  if(v.access==="public-hidden")classFields.push("    public "+type+" "+name+" { get; set; } = "+initial+";");
  else if(v.access==="public-inspector")classFields.push("    public "+type+" "+name+" = "+initial+";");
  else if(v.access==="private-inspector")classFields.push("    [SerializeField] private "+type+" "+name+" = "+initial+";");
  else classFields.push("    private "+type+" "+name+" = "+initial+";");
 }
 const eventKinds=[["start","Start"],["update","Update"],["fixed","FixedUpdate"]];
 for(const [type,method] of eventKinds){
  const events=nodes.filter(n=>n.type===type);
  if(!events.length)continue;
  methods.push("    private void "+method+"()","    {");
  for(const ev of events){
   const next=connected(ev.id,"Then");
   if(next)methods.push(...emitFlow(next,2,new Set([ev.id])));
  }
  methods.push("    }","");
 }
 if(!eventKinds.some(([type])=>nodes.some(n=>n.type===type))){
  report("Add On Start, On Update, or On Fixed Update so the generated script has an entry point.");
  methods.push("    private void Start()","    {","    }","");
 }
 if(extraMethods.length)methods.push(...extraMethods);
 const declaration=["using UnityEngine;","using System;","using System.Collections;","using System.Collections.Generic;","", "public class "+safeClass+" : MonoBehaviour","{"];
 const fields=classFields.length?classFields.concat([""]):[];
 const code=declaration.concat(fields,methods,["}"]).join("\n");
 return {code,diagnostics:[...new Set(diagnostics)]};
}
return {compile};
})();