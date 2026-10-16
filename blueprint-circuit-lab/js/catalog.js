(function(){
  const CB = window.CB;
  function pin(id,label,type,value){return {id:id,label:label,type:type,default:value};}
  function field(id,label,type,value,options){return {id:id,label:label,type:type,default:value,options:options||null};}
  function addValue(type,label,category,family,op,inputs,outputType,options){
    options = options || {};
    const def = {
      type:type,label:label,category:category,family:family,op:op,
      inputs:inputs || [],
      outputs:options.outputs || [{id:"value",label:"Value",type:outputType || "any"}],
      fields:options.fields || [],
      defaults:options.defaults || {},
      description:options.description || label + " — typed value operation."
    };
    return CB.addDef(def);
  }
  function addFlow(type,label,category,op,inputs,outputs,options){
    options = options || {};
    return CB.addDef({type:type,label:label,category:category,family:options.family || "flow",op:op,
      inputs:inputs || [],outputs:outputs || [],fields:options.fields || [],defaults:options.defaults || {},
      description:options.description || label + " — execution block."});
  }
  const N=function(id,label,def){return pin(id,label,"number",def===undefined?0:def);};
  const S=function(id,label,def){return pin(id,label,"string",def===undefined?"":def);};
  const B=function(id,label,def){return pin(id,label,"boolean",def===undefined?false:def);};
  const A=function(id,label,def){return pin(id,label,"any",def===undefined?null:def);};
  const AR=function(id,label,def){return pin(id,label,"array",def===undefined?[]:def);};
  const O=function(id,label,def){return pin(id,label,"object",def===undefined?{}:def);};
  const V=function(id,label,def){return pin(id,label,"vec2",def===undefined?{x:0,y:0}:def);};
  const C=function(id,label,def){return pin(id,label,"color",def===undefined?"#ffffff":def);};
  const E=function(id,label){return pin(id,label,"exec",null);};
  const EO=function(id,label){return {id:id,label:label,type:"exec"};};
  addValue("number.constant","Number","Numbers","constant","number",[],"number",{fields:[field("value","Value","number",0)],description:"A numeric literal. Change the number in the node or inspector."});
  addValue("string.constant","String","Strings","constant","string",[],"string",{fields:[field("value","Text","string","Hello world")],description:"A string literal."});
  addValue("boolean.constant","Boolean","Logic","constant","boolean",[],"boolean",{fields:[field("value","Value","boolean",true)],description:"A true/false literal."});
  addValue("array.constant","Array","Arrays","constant","array",[],"array",{fields:[field("value","JSON array","array",[1,2,3])],description:"An array literal entered as JSON."});
  addValue("object.constant","Object","Objects","constant","object",[],"object",{fields:[field("value","JSON object","object",{name:"Example"})],description:"An object literal entered as JSON."});
  addValue("vector.constant","Vector 2D","Vectors","constant","vector",[],"vec2",{fields:[field("value","Vector {x,y}","vec2",{x:0,y:0})],description:"A two-dimensional vector."});
  addValue("color.constant","Color","Colors","constant","color",[],"color",{fields:[field("value","Color","color","#8fa8ff")],description:"A color literal."});
  addValue("variable.get","Get variable","Variables","variable","get",[S("name","Name","score")],"any",{description:"Read a project variable by name."});
  addValue("circuit.input","Circuit input","Circuits","circuit-input","input",[],"any",{fields:[field("pinName","Pin name","string","Value"),field("pinType","Pin type","select","number",["number","string","boolean","any","array","object","vec2","color"])],description:"Expose a typed input on this circuit board."});
  addValue("circuit.output","Circuit output","Circuits","circuit-output","output",[A("value","Value",0)],"any",{fields:[field("pinName","Pin name","string","Result"),field("pinType","Pin type","select","number",["number","string","boolean","any","array","object","vec2","color"])],description:"Expose a typed result from this circuit board."});
  addValue("circuit.call","Circuit call","Circuits","circuit-call","call",[A("arg","Input",0)],"any",{fields:[field("circuitId","Board ID","string","")],description:"Call a reusable circuit board from the main graph."});

  const mathBinary = [
    ["add","Add"],["subtract","Subtract"],["multiply","Multiply"],["divide","Divide"],["modulo","Modulo"],["power","Power"],
    ["min","Minimum"],["max","Maximum"],["average","Average"],["hypot","Hypotenuse"],["atan2","Atan2"]
  ];
  mathBinary.forEach(function(s){addValue("math."+s[0],s[1],"Math","math",s[0],[N("a","A",0),N("b","B",1)],"number");});
  const mathUnary = [
    ["abs","Absolute"],["sqrt","Square root"],["cbrt","Cube root"],["round","Round"],["floor","Floor"],["ceil","Ceiling"],
    ["trunc","Truncate"],["sign","Sign"],["negate","Negate"],["reciprocal","Reciprocal"],["exp","Exponential"],["log","Natural log"],
    ["log10","Log base 10"],["log2","Log base 2"],["sin","Sine"],["cos","Cosine"],["tan","Tangent"],["asin","Arc sine"],
    ["acos","Arc cosine"],["atan","Arc tangent"],["degrees-to-radians","Degrees to radians"],["radians-to-degrees","Radians to degrees"],
    ["factorial","Factorial"],["random-sign","Random sign"]
  ];
  mathUnary.forEach(function(s){addValue("math."+s[0],s[1],"Math","math",s[0],[N("x","X",1)],"number");});
  addValue("math.clamp","Clamp","Math","math","clamp",[N("value","Value",5),N("min","Minimum",0),N("max","Maximum",10)],"number");
  addValue("math.lerp","Linear interpolate","Math","math","lerp",[N("a","A",0),N("b","B",1),N("t","T",0.5)],"number");
  addValue("math.inverse-lerp","Inverse lerp","Math","math","inverse-lerp",[N("a","A",0),N("b","B",1),N("value","Value",0.5)],"number");
  addValue("math.remap","Remap","Math","math","remap",[N("value","Value",5),N("inMin","Input min",0),N("inMax","Input max",10),N("outMin","Output min",0),N("outMax","Output max",100)],"number");
  addValue("math.smoothstep","Smooth step","Math","math","smoothstep",[N("edge0","Edge 0",0),N("edge1","Edge 1",1),N("value","Value",0.5)],"number");
  addValue("math.move-towards","Move towards","Math","math","move-towards",[N("current","Current",0),N("target","Target",10),N("maxDelta","Max delta",1)],"number");
  addValue("math.ping-pong","Ping-pong","Math","math","ping-pong",[N("time","Time",3),N("length","Length",1)],"number");
  addValue("math.random","Random float","Math","math","random",[N("a","Min",0),N("b","Max",1)],"number");
  addValue("math.random-int","Random integer","Math","math","random-int",[N("a","Min",0),N("b","Max",10)],"number");
  addValue("math.is-finite","Is finite","Math","math","is-finite",[N("x","X",1)],"boolean");
  addValue("math.is-integer","Is integer","Math","math","is-integer",[N("x","X",1)],"boolean");
  addValue("math.constant-pi","Pi","Math","constant","pi",[],"number");
  addValue("math.constant-e","Euler's number","Math","constant","e",[],"number");
  addValue("math.constant-tau","Tau","Math","constant","tau",[],"number");
  addValue("math.constant-infinity","Infinity","Math","constant","infinity",[],"number");

  const comparisons = [
    ["equals","Equals"],["not-equals","Not equal"],["strict-equals","Strict equals"],["greater","Greater than"],
    ["greater-equal","Greater or equal"],["less","Less than"],["less-equal","Less or equal"]
  ];
  comparisons.forEach(function(s){
    addValue("compare."+s[0],s[1],"Compare","compare",s[0],[A("a","A",0),A("b","B",0)],"boolean");
  });
  const logic = [
    ["and","AND"],["or","OR"],["xor","XOR"],["nand","NAND"],["nor","NOR"],["xnor","XNOR"]
  ];
  logic.forEach(function(s){addValue("logic."+s[0],s[1],"Logic","logic",s[0],[B("a","A",false),B("b","B",true)],"boolean");});
  [["not","NOT"],["truthy","Truthy"],["falsy","Falsy"],["is-null","Is null"],["is-empty","Is empty"]].forEach(function(s){
    addValue("logic."+s[0],s[1],"Logic","logic",s[0],[A("x","Value",null)],"boolean");
  });
  addValue("logic.coalesce","Coalesce","Logic","logic","coalesce",[A("a","First value",null),A("b","Fallback",0)],"any");
  addValue("logic.type-of","Type of","Logic","logic","type-of",[A("x","Value",null)],"string");
  addValue("logic.select","Select value","Logic","logic","select",[B("condition","Condition",true),A("whenTrue","If true",1),A("whenFalse","If false",0)],"any");

  const stringBinary = [
    ["concat","Concatenate"],["join-pair","Join with space"],["contains","Contains"],["starts-with","Starts with"],["ends-with","Ends with"],
    ["replace","Replace"],["index-of","Index of"],["includes-ignore-case","Contains (ignore case)"],["compare","Compare strings"],["count-matches","Count matches"]
  ];
  stringBinary.forEach(function(s){
    const inputs = s[0] === "replace" ? [S("text","Text","hello world"),S("search","Find","world"),S("replacement","Replace with","there")] : [S("a","Text","hello"),S("b","Search","ell")];
    addValue("string."+s[0],s[1],"Strings","string",s[0],inputs,s[0]==="contains"||s[0]==="starts-with"||s[0]==="ends-with"||s[0]==="includes-ignore-case"?"boolean":s[0]==="index-of"||s[0]==="compare"||s[0]==="count-matches"?"number":"string");
  });
  const stringUnary = [
    ["length","Length","number"],["upper","Uppercase","string"],["lower","Lowercase","string"],["trim","Trim","string"],
    ["trim-start","Trim start","string"],["trim-end","Trim end","string"],["reverse","Reverse","string"],["remove-whitespace","Remove whitespace","string"],
    ["capitalize","Capitalize","string"],["title-case","Title case","string"],["slugify","Slugify","string"],["escape-html","Escape HTML","string"],
    ["decode-uri","Decode URI","string"],["encode-uri","Encode URI","string"],["to-lines","Normalize line breaks","string"],["first-word","First word","string"],
    ["last-word","Last word","string"],["word-count","Word count","number"],["trim-to-length","Trim to length","string"]
  ];
  stringUnary.forEach(function(s){
    const ins = s[0] === "trim-to-length" ? [S("text","Text","Blueprint"),N("length","Max chars",10)] : [S("text","Text","Blueprint Lab")];
    addValue("string."+s[0],s[1],"Strings","string",s[0],ins,s[2]);
  });
  addValue("string.format","Format text","Strings","string","format",[S("template","Template","Score: {0} / {1}"),A("a","Value 1",0),A("b","Value 2",1),A("c","Value 3","")],"string");
  addValue("string.substring","Substring","Strings","string","substring",[S("text","Text","Blueprint"),N("start","Start",0),N("length","Length",4)],"string");
  addValue("string.char-at","Character at","Strings","string","char-at",[S("text","Text","Blueprint"),N("index","Index",0)],"string");
  addValue("string.split","Split","Strings","string","split",[S("text","Text","one,two,three"),S("separator","Separator",",")],"array");
  addValue("string.join-array","Join array","Strings","string","join-array",[AR("array","Array",["one","two","three"]),S("separator","Separator",", ")],"string");
  addValue("string.repeat","Repeat text","Strings","string","repeat",[S("text","Text","ha"),N("count","Count",3)],"string");
  addValue("string.pad-start","Pad start","Strings","string","pad-start",[S("text","Text","7"),N("length","Length",3),S("pad","Pad","0")],"string");
  addValue("string.pad-end","Pad end","Strings","string","pad-end",[S("text","Text","7"),N("length","Length",3),S("pad","Pad","0")],"string");
  addValue("string.words","Words","Strings","string","words",[S("text","Text","one two three")],"array");

  const conversions = [
    ["to-number","To number","number"],["to-integer","To integer","integer"],["to-float","To float","number"],["to-string","To string","string"],
    ["to-boolean","To boolean","boolean"],["json-parse","JSON parse","object"],["json-stringify","JSON stringify","string"],["to-array","To array","array"],
    ["to-object","To object","object"],["to-vector","To vector 2D","vec2"],["vector-to-string","Vector to string","string"],["to-color","To color","color"],
    ["color-to-hex","Color to hex","string"],["number-to-hex","Number to hex","string"],["char-code","Character code","number"],["from-char-code","From character code","string"],
    ["base64-encode","Base64 encode","string"],["base64-decode","Base64 decode","string"],["url-encode","URL encode","string"],["url-decode","URL decode","string"],
    ["type-name","Type name","string"],["safe-number","Safe number","number"]
  ];
  conversions.forEach(function(s){
    addValue("convert."+s[0],s[1],"Conversions","convert",s[0],[A("value","Value","")],s[2]);
  });

  const arrays = [
    ["length","Length","number"],["first","First","any"],["last","Last","any"],["reverse","Reverse","array"],["unique","Unique","array"],
    ["sort-ascending","Sort ascending","array"],["sort-descending","Sort descending","array"],["append","Append","array"],["prepend","Prepend","array"],
    ["concat","Concatenate arrays","array"],["slice","Slice","array"],["remove-at","Remove at index","array"],["filter-empty","Remove empty items","array"],
    ["flatten","Flatten one level","array"],["includes","Contains item","boolean"],["index-of","Index of item","number"],["sum","Sum numbers","number"],
    ["average","Average numbers","number"],["minimum","Minimum item","number"],["maximum","Maximum item","number"],["shuffle","Shuffle","array"],
    ["range","Create range","array"],["zip","Zip arrays","array"],["enumerate","Enumerate","array"],["chunk","Chunk array","array"],
    ["take","Take first N","array"],["drop","Drop first N","array"],["compact","Compact","array"],["join","Join to text","string"],
    ["get","Get at index","any"],["includes-all","Contains all","boolean"],["includes-any","Contains any","boolean"]
  ];
  arrays.forEach(function(s){
    let inputs;
    if (["append","prepend"].includes(s[0])) inputs=[AR("array","Array",[1,2,3]),A("item","Item",4)];
    else if (["concat","zip","includes-all","includes-any"].includes(s[0])) inputs=[AR("array","Array",[1,2,3]),AR("other","Other array",[3,4,5])];
    else if (["slice"].includes(s[0])) inputs=[AR("array","Array",[1,2,3,4]),N("start","Start",1),N("end","End",3)];
    else if (["remove-at","get","index-of"].includes(s[0])) inputs=[AR("array","Array",[10,20,30]),s[0]==="index-of"?A("item","Item",20):N("index","Index",1)];
    else if (["range","chunk","take","drop"].includes(s[0])) inputs=[AR("array","Array",[1,2,3,4,5]),N("count","Count",3)];
    else if (s[0]==="enumerate") inputs=[AR("array","Array",["a","b","c"])];
    else if (s[0]==="join") inputs=[AR("array","Array",["a","b","c"]),S("separator","Separator",", ")];
    else if (s[0]==="includes") inputs=[AR("array","Array",[1,2,3]),A("item","Item",2)];
    else inputs=[AR("array","Array",[1,2,3])];
    if (s[0]==="range") inputs=[N("start","Start",0),N("count","Count",10),N("step","Step",1)];
    addValue("array."+s[0],s[1],"Arrays","array",s[0],inputs,s[2]);
  });

  const objectOps = [
    ["get","Get property","any"],["has","Has property","boolean"],["keys","Keys","array"],["values","Values","array"],
    ["entries","Entries","array"],["merge","Merge objects","object"],["set","Set property","object"],["remove","Remove property","object"],
    ["pick","Pick properties","object"],["omit","Omit properties","object"],["size","Property count","number"],["is-empty","Is empty","boolean"],
    ["get-path","Get nested path","any"],["set-path","Set nested path","object"],["invert","Invert keys and values","object"],
    ["defaults","Apply defaults","object"],["from-entries","From entries","object"],["to-pairs","To key/value pairs","array"],["clone","Clone object","object"]
  ];
  objectOps.forEach(function(s){
    let inputs;
    if (["merge","defaults"].includes(s[0])) inputs=[O("object","Object",{a:1}),O("other","Other",{b:2})];
    else if (["set","set-path"].includes(s[0])) inputs=[O("object","Object",{a:1}),S(s[0]==="set-path"?"path":"key",s[0]==="set-path"?"Path":"Key",s[0]==="set-path"?"user.name":"b"),A("value","Value",2)];
    else if (["pick","omit"].includes(s[0])) inputs=[O("object","Object",{a:1,b:2,c:3}),AR("keys","Keys",["a","c"])];
    else if (["from-entries"].includes(s[0])) inputs=[AR("entries","Entries",[["a",1],["b",2]])];
    else if (["get-path"].includes(s[0])) inputs=[O("object","Object",{user:{name:"Ada"}}),S("path","Path","user.name")];
    else if (["get","has","remove"].includes(s[0])) inputs=[O("object","Object",{name:"Ada",score:42}),S("key","Key","name")];
    else inputs=[O("object","Object",{a:1,b:2})];
    addValue("object."+s[0],s[1],"Objects","object",s[0],inputs,s[2]);
  });

  const vectorBinary = [
    ["add","Add vectors"],["subtract","Subtract vectors"],["multiply","Multiply vectors"],["divide","Divide vectors"],["min","Minimum"],["max","Maximum"],
    ["reflect","Reflect"],["project","Project"],["perpendicular","Perpendicular"]
  ];
  vectorBinary.forEach(function(s){
    addValue("vector."+s[0],s[1],"Vectors","vector",s[0],[V("a","A",{x:1,y:2}),V("b","B",{x:3,y:4})],"vec2");
  });
  const vectorUnary = [
    ["normalize","Normalize"],["abs","Absolute"],["round","Round"],["floor","Floor"],["ceil","Ceiling"],["negate","Negate"],["perpendicular","Perpendicular"],["perpendicular-left","Perpendicular left"]
  ];
  vectorUnary.forEach(function(s){addValue("vector."+s[0],s[1],"Vectors","vector",s[0],[V("value","Vector",{x:3,y:4})],"vec2");});
  [["scale","Scale", [V("value","Vector",{x:1,y:2}),N("scale","Scale",2)],"vec2"],
   ["dot","Dot product",[V("a","A",{x:1,y:0}),V("b","B",{x:0,y:1})],"number"],
   ["cross","2D cross product",[V("a","A",{x:1,y:0}),V("b","B",{x:0,y:1})],"number"],
   ["length","Length",[V("value","Vector",{x:3,y:4})],"number"],
   ["distance","Distance",[V("a","A",{x:0,y:0}),V("b","B",{x:3,y:4})],"number"],
   ["angle","Angle (degrees)",[V("value","Vector",{x:1,y:0})],"number"],
   ["rotate","Rotate",[V("value","Vector",{x:1,y:0}),N("degrees","Degrees",90)],"vec2"],
   ["lerp","Lerp",[V("a","A",{x:0,y:0}),V("b","B",{x:10,y:10}),N("t","T",0.5)],"vec2"],
   ["clamp","Clamp vector",[V("value","Vector",{x:8,y:-2}),N("min","Min",0),N("max","Max",5)],"vec2"],
   ["split","Split X / Y",[V("value","Vector",{x:3,y:4})],"vec2"]
  ].forEach(function(s){
    const outs=s[0]==="split"?[{id:"x",label:"X",type:"number"},{id:"y",label:"Y",type:"number"}]:undefined;
    addValue("vector."+s[0],s[1],"Vectors","vector",s[0],s[2],s[3],{outputs:outs});
  });
  addValue("vector.make","Make vector 2D","Vectors","vector","make",[N("x","X",0),N("y","Y",0)],"vec2");
  addValue("vector.distance-squared","Distance squared","Vectors","vector","distance-squared",[V("a","A",{x:0,y:0}),V("b","B",{x:3,y:4})],"number");

  const colorOps=[
    ["rgb","RGB"],["rgba","RGBA"],["from-hex","From hex"],["lighten","Lighten"],["darken","Darken"],["mix","Mix colors"],
    ["complement","Complement"],["set-alpha","Set alpha"],["grayscale","Grayscale"],["hue-rotate","Rotate hue"],["red","Red channel"],
    ["green","Green channel"],["blue","Blue channel"],["alpha","Alpha channel"],["to-hex","To hex"],["to-css","CSS color"]
  ];
  colorOps.forEach(function(s){
    let ins,out="color";
    if(s[0]==="rgb") ins=[N("r","Red",120),N("g","Green",170),N("b","Blue",255)];
    else if(s[0]==="rgba") ins=[N("r","Red",120),N("g","Green",170),N("b","Blue",255),N("a","Alpha",1)];
    else if(s[0]==="from-hex") ins=[S("hex","Hex","#78a2ff")];
    else if(s[0]==="lighten"||s[0]==="darken") ins=[C("color","Color","#648cff"),N("amount","Amount",0.2)];
    else if(s[0]==="mix") ins=[C("a","A","#648cff"),C("b","B","#f4a3be"),N("amount","Amount",0.5)];
    else if(s[0]==="set-alpha") ins=[C("color","Color","#648cff"),N("alpha","Alpha",0.5)];
    else if(s[0]==="hue-rotate") ins=[C("color","Color","#648cff"),N("degrees","Degrees",90)];
    else ins=[C("color","Color","#648cff")];
    if(["red","green","blue","alpha"].includes(s[0])) out="number";
    if(["to-hex","to-css"].includes(s[0])) out="string";
    addValue("color."+s[0],s[1],"Colors","color",s[0],ins,out);
  });

  const utility = [
    ["random-boolean","Random boolean","boolean"],["random-item","Random array item","any"],["uuid","New UUID","string"],
    ["now-milliseconds","Now (milliseconds)","number"],["now-seconds","Now (seconds)","number"],["iso-date","Current ISO date","string"],
    ["format-date","Format date","string"],["date-part","Date part","number"],["seconds-to-time","Seconds to time","string"],
    ["time-to-seconds","Time to seconds","number"],["stopwatch","Elapsed seconds","number"],["frame-delta","Frame delta","number"],
    ["scene-width","Scene width","number"],["scene-height","Scene height","number"],["pointer-position","Pointer position","vec2"],
    ["pointer-x","Pointer X","number"],["pointer-y","Pointer Y","number"],["key-down","Key is down","boolean"],
    ["key-just-pressed","Key just pressed","boolean"],["sprite-count","Sprite count","number"],["score","Current score","number"],
    ["sprite-position","Sprite position","vec2"],["sprite-x","Sprite X","number"],["sprite-y","Sprite Y","number"],
    ["message","Current message","string"],["clamp-percent","Clamp percent","number"],["degrees","Degrees label","string"]
  ];
  utility.forEach(function(s){
    let ins=[];
    if(s[0]==="random-item") ins=[AR("array","Array",[1,2,3])];
    if(s[0]==="format-date") ins=[S("date","Date ISO",new Date().toISOString()),S("format","Format","short")];
    if(s[0]==="date-part") ins=[S("date","Date ISO",new Date().toISOString()),S("part","Part","year")];
    if(s[0]==="seconds-to-time") ins=[N("seconds","Seconds",90)];
    if(s[0]==="time-to-seconds") ins=[S("time","Time","01:30")];
    if(s[0]==="key-down"||s[0]==="key-just-pressed") ins=[S("key","Key","space")];
    if(s[0]==="sprite-position"||s[0]==="sprite-x"||s[0]==="sprite-y") ins=[S("name","Sprite name","Player")];
    if(s[0]==="clamp-percent") ins=[N("value","Value",120)];
    if(s[0]==="degrees") ins=[N("value","Degrees",90)];
    addValue("utility."+s[0],s[1],s[0].includes("date")||s[0].includes("time")||s[0].includes("stopwatch")?"Time":"Utility","utility",s[0],ins,s[2]);
  });

  addFlow("event.start","On Start","Events","start",[],[EO("execOut","Then")],{family:"event",description:"Executes once when the game or program starts."});
  addFlow("event.update","On Update","Events","update",[],[EO("execOut","Every frame")],{family:"event",description:"Executes once per accepted frame while the game is running."});
  addFlow("event.key-pressed","On Key Pressed","Events","key-pressed",[S("key","Key","space")],[EO("execOut","Pressed")],{family:"event",description:"Executes when the selected key is pressed while the game is running."});
  addFlow("flow.sequence","Sequence","Flow","sequence",[E("execIn","In")],[EO("then1","Then 1"),EO("then2","Then 2"),EO("then3","Then 3")]);
  addFlow("flow.branch","Branch","Flow","branch",[E("execIn","In"),B("condition","Condition",true)],[EO("true","True"),EO("false","False")],{description:"Choose one execution path using a Boolean input."});
  addFlow("flow.repeat","Repeat","Flow","repeat",[E("execIn","In"),N("count","Count",5)],[EO("body","Loop body"),EO("completed","Completed"),{id:"index",label:"Index",type:"number"}],{description:"Repeat the body a bounded number of times; exposes the current index."});
  addFlow("flow.wait","Wait","Flow","wait",[E("execIn","In"),N("seconds","Seconds",0.5)],[EO("execOut","Then")],{description:"Pause the execution chain for up to five seconds."});
  addFlow("flow.print","Print / log","Debug","print",[E("execIn","In"),S("text","Text","Hello from Blueprint Circuit Lab.")],[EO("execOut","Then")],{description:"Write a message to the console. Values can be connected to Text."});
  addFlow("flow.set-variable","Set variable","Variables","set-variable",[E("execIn","In"),S("name","Name","score"),A("value","Value",0)],[EO("execOut","Then")]);
  addFlow("flow.trace","Trace","Debug","trace",[E("execIn","In"),A("value","Value","trace")],[EO("execOut","Then")]);
  addFlow("flow.assert","Assert","Debug","assert",[E("execIn","In"),B("condition","Condition",true),S("message","Warning text","Assertion failed")],[EO("execOut","Then")]);
  addFlow("flow.signal","Signal","Flow","signal",[E("execIn","In"),S("name","Signal","ready")],[EO("execOut","Then")]);
  addFlow("flow.stop","Stop execution","Flow","stop",[E("execIn","In")],[]);
  addFlow("flow.comment","Comment","Debug","comment",[E("execIn","In"),S("note","Note","Explain what this section does.")],[EO("execOut","Then")]);
  addFlow("flow.noop","Do nothing","Flow","noop",[E("execIn","In")],[EO("execOut","Then")]);
  addFlow("flow.once","Run once","Flow","once",[E("execIn","In")],[EO("execOut","First time"),EO("skipped","Already ran")]);
  addFlow("flow.throw","Throw error","Debug","throw",[E("execIn","In"),S("message","Error message","Intentional test error")],[]);
  addFlow("flow.set-background","Set scene background","Game","set-background",[E("execIn","In"),C("color","Color","#18253b")],[EO("execOut","Then")]);

  const gameValues = [
    ["key-down","Key down","boolean"],["key-pressed","Key pressed this frame","boolean"],["scene-width","Scene width","number"],
    ["scene-height","Scene height","number"],["sprite-count","Sprite count","number"],["score","Score","number"],["pointer","Pointer position","vec2"],
    ["pointer-x","Pointer X","number"],["pointer-y","Pointer Y","number"],["sprite-position","Sprite position","vec2"],
    ["sprite-x","Sprite X","number"],["sprite-y","Sprite Y","number"],["sprite-exists","Sprite exists","boolean"],
    ["sprite-visible","Sprite visible","boolean"],["sprite-size","Sprite size","number"],["elapsed","Elapsed seconds","number"],
    ["delta-time","Delta time","number"],["collides","Sprite collision","boolean"],["distance","Sprite distance","number"],
    ["random-scene-point","Random scene point","vec2"],["background","Background color","color"],["message","Message text","string"],
    ["screen-to-world","Screen to scene position","vec2"],["score-string","Score as text","string"],["key-name","Last key","string"]
  ];
  gameValues.forEach(function(s){
    let ins=[];
    if(s[0]==="key-down"||s[0]==="key-pressed") ins=[S("key","Key","space")];
    if(s[0].startsWith("sprite-")&&s[0]!=="sprite-count"&&s[0]!=="sprite-position") ins=[S("name","Sprite name","Player")];
    if(s[0]==="sprite-position"||s[0]==="sprite-x"||s[0]==="sprite-y"||s[0]==="sprite-visible"||s[0]==="sprite-size") ins=[S("name","Sprite name","Player")];
    if(s[0]==="collides"||s[0]==="distance") ins=[S("a","Sprite A","Player"),S("b","Sprite B","Coin")];
    addValue("game."+s[0],s[1],"Game","game",s[0],ins,s[2]);
  });

  function gameAction(type,label,op,inputs,extra){
    addFlow(type,label,"Game",op,[E("execIn","In")].concat(inputs||[]),[EO("execOut","Then")].concat(extra&&extra.outputs?extra.outputs:[]),{description:extra&&extra.description||label+" — modifies the running scene."});
  }
  gameAction("game.create-sprite","Create sprite","create-sprite",[S("name","Name","Player"),S("emoji","Sprite","🧑"),N("x","X",160),N("y","Y",200)]);
  gameAction("game.move-sprite","Move sprite with keys","move-sprite",[S("name","Sprite name","Player"),N("speed","Speed",180)],{description:"Move a named sprite with WASD or arrow keys. Best used from On Update."});
  gameAction("game.set-position","Set sprite position","set-position",[S("name","Sprite name","Player"),N("x","X",160),N("y","Y",200)]);
  gameAction("game.set-sprite","Set sprite look","set-sprite",[S("name","Sprite name","Player"),S("emoji","Emoji","🚀")]);
  gameAction("game.set-size","Set sprite size","set-size",[S("name","Sprite name","Player"),N("size","Size",38)]);
  gameAction("game.set-velocity","Set sprite velocity","set-velocity",[S("name","Sprite name","Player"),N("vx","Velocity X",70),N("vy","Velocity Y",0)]);
  gameAction("game.add-score","Add score","add-score",[N("amount","Amount",1)]);
  gameAction("game.set-score","Set score","set-score",[N("value","Score",0)]);
  gameAction("game.show-message","Show message","show-message",[S("text","Message","Nice work!")]);
  gameAction("game.destroy-sprite","Destroy sprite","destroy-sprite",[S("name","Sprite name","Coin")]);
  gameAction("game.clone-sprite","Clone sprite","clone-sprite",[S("name","Sprite name","Player"),N("x","X offset",35),N("y","Y offset",0)]);
  gameAction("game.spawn-at-pointer","Spawn at pointer","spawn-at-pointer",[S("name","Name","Marker"),S("emoji","Emoji","✨")]);
  gameAction("game.set-visible","Set sprite visibility","set-visible",[S("name","Sprite name","Player"),B("visible","Visible",true)]);
  gameAction("game.clear-sprites","Clear sprites","clear-sprites",[]);
  gameAction("game.bounce","Bounce off edges","bounce",[S("name","Sprite name","Player")]);
  gameAction("game.reset-position","Reset sprite position","reset-position",[S("name","Sprite name","Player"),N("x","Start X",160),N("y","Start Y",200)]);

  addFlow("debug.breakpoint","Breakpoint","Debug","breakpoint",[E("execIn","In")],[EO("execOut","Continue")],{description:"Writes a trace entry and continues. Use slow message speed to inspect flow."});
  addValue("debug.inspect","Inspect value","Debug","debug","inspect",[A("value","Value",null)],"any",{description:"Pass a value through unchanged and record it in the console when evaluated."});
  addValue("debug.stringify","Debug stringify","Debug","convert","json-stringify",[A("value","Value",null)],"string");
  addValue("utility.constant-zero","Zero","Utility","constant","zero",[],"number");
  addValue("utility.constant-one","One","Utility","constant","one",[],"number");
  addValue("utility.constant-true","True","Logic","constant","true",[],"boolean");
  addValue("utility.constant-false","False","Logic","constant","false",[],"boolean");
  addValue("utility.constant-empty-string","Empty string","Strings","constant","empty-string",[],"string");
  addValue("utility.constant-null","Null","Utility","constant","null",[],"any");

  CB.blockCount = Object.keys(CB.defs).length;
})();