(function(){
  const CB = window.CB;
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
  function vec(v){if(typeof v==="string"){try{v=JSON.parse(v);}catch(e){v={};}}v=v||{};return {x:num(v.x),y:num(v.y)};}
  function parseColor(value){
    let s=String(value||"#ffffff").trim(),m;
    if((m=s.match(/^#([0-9a-f]{3,8})$/i))){
      let h=m[1];if(h.length===3||h.length===4)h=h.split("").map(function(c){return c+c;}).join("");
      if(h.length===6||h.length===8)return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16),a:h.length===8?parseInt(h.slice(6,8),16)/255:1};
    }
    if((m=s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i)))return {r:num(m[1]),g:num(m[2]),b:num(m[3]),a:m[4]===undefined?1:num(m[4])};
    return {r:255,g:255,b:255,a:1};
  }
  function toHex(c){return "#"+[c.r,c.g,c.b].map(function(v){return Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0");}).join("")+(c.a<1?Math.round(c.a*255).toString(16).padStart(2,"0"):"");}
  function clean(v){return v===undefined?null:v;}
  function propPath(obj,path){return String(path||"").split(".").reduce(function(o,k){return o==null?undefined:o[k];},obj);}
  function setPath(obj,path,value){const parts=String(path||"").split(".").filter(Boolean);if(!parts.length)return obj;let out=CB.clone(obj||{}),cur=out;for(let i=0;i<parts.length-1;i++){if(!cur[parts[i]]||typeof cur[parts[i]]!=="object")cur[parts[i]]={};cur=cur[parts[i]];}cur[parts[parts.length-1]]=value;return out;}
  CB.coerce = function(value,type){
    if(value===undefined)return null;
    if(type==="number"||type==="integer"){const n=Number(value);return Number.isNaN(n)?0:(type==="integer"?Math.trunc(n):n);}
    if(type==="string")return value===null?"null":typeof value==="object"?JSON.stringify(value):String(value);
    if(type==="boolean")return !!value;
    if(type==="array"){if(Array.isArray(value))return value;if(typeof value==="string"){try{const p=JSON.parse(value);return Array.isArray(p)?p:[p];}catch(e){return value?[value]:[];}}return value==null?[]:[value];}
    if(type==="object"){if(value&&typeof value==="object"&&!Array.isArray(value))return value;if(typeof value==="string"){try{const p=JSON.parse(value);return p&&typeof p==="object"&&!Array.isArray(p)?p:{};}catch(e){return {};}}return {};}
    if(type==="vec2")return vec(value);
    if(type==="color")return String(value||"#ffffff");
    if(type==="any"||type==="sprite"||type==="exec")return value;
    return value;
  };
  CB.evalOperation = function(def,args,node,ctx){
    const op=def.op||"",f=def.family||"";
    const a=args.a,b=args.b,c=args.c,x=args.x!==undefined?args.x:args.value;
    if(f==="constant"){
      if(op==="number")return num(node.data.value);
      if(op==="string")return String(node.data.value==null?"":node.data.value);
      if(op==="boolean")return !!node.data.value;
      if(op==="array")return CB.coerce(node.data.value,"array");
      if(op==="object")return CB.coerce(node.data.value,"object");
      if(op==="vector")return vec(node.data.value);
      if(op==="color")return String(node.data.value||"#ffffff");
      if(op==="pi")return Math.PI;if(op==="e")return Math.E;if(op==="tau")return Math.PI*2;
      if(op==="infinity")return Infinity;if(op==="zero")return 0;if(op==="one")return 1;
      if(op==="true")return true;if(op==="false")return false;if(op==="empty-string")return "";
      if(op==="null")return null;
    }
    if(f==="variable")return ctx.variables[String(args.name||"")]===undefined?null:ctx.variables[String(args.name||"")];
    if(f==="math"){
      const unary={
        abs:Math.abs,sqrt:Math.sqrt,cbrt:Math.cbrt,round:Math.round,floor:Math.floor,ceil:Math.ceil,trunc:Math.trunc,sign:Math.sign,
        negate:function(v){return -v;},reciprocal:function(v){return v===0?Infinity:1/v;},exp:Math.exp,log:Math.log,log10:Math.log10,log2:Math.log2,
        sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,
        "degrees-to-radians":function(v){return v*Math.PI/180;},"radians-to-degrees":function(v){return v*180/Math.PI;},
        "is-finite":Number.isFinite,"is-integer":Number.isInteger,"random-sign":function(){return Math.random()<.5?-1:1;}
      };
      if(unary[op])return unary[op](num(x));
      switch(op){
        case "add":return num(a)+num(b);case "subtract":return num(a)-num(b);case "multiply":return num(a)*num(b);
        case "divide":if(num(b)===0)throw new Error("Divide by zero.");return num(a)/num(b);
        case "modulo":if(num(b)===0)throw new Error("Modulo by zero.");return num(a)%num(b);
        case "power":return Math.pow(num(a),num(b));case "min":return Math.min(num(a),num(b));case "max":return Math.max(num(a),num(b));
        case "average":return (num(a)+num(b))/2;case "hypot":return Math.hypot(num(a),num(b));case "atan2":return Math.atan2(num(a),num(b));
        case "clamp":return Math.min(Math.max(num(args.value),Math.min(num(args.min),num(args.max))),Math.max(num(args.min),num(args.max)));
        case "lerp":return num(a)+(num(b)-num(a))*num(args.t);
        case "inverse-lerp":return num(a)===num(b)?0:(num(args.value)-num(a))/(num(b)-num(a));
        case "remap":{const span=num(args.inMax)-num(args.inMin),t=span===0?0:(num(args.value)-num(args.inMin))/span;return num(args.outMin)+(num(args.outMax)-num(args.outMin))*t;}
        case "smoothstep":{const span=num(args.edge1)-num(args.edge0),raw=span===0?0:(num(args.value)-num(args.edge0))/span,t=Math.max(0,Math.min(1,raw));return t*t*(3-2*t);}
        case "move-towards":return num(args.current)+(Math.sign(num(args.target)-num(args.current))*Math.min(Math.abs(num(args.target)-num(args.current)),Math.abs(num(args.maxDelta))));
        case "ping-pong":{const length=Math.abs(num(args.length))||1,t=((num(args.time)%(2*length))+2*length)%(2*length);return length-Math.abs(t-length);}
        case "random":return num(a)+Math.random()*(num(b)-num(a));
        case "random-int":return Math.floor(num(a)+Math.random()*(num(b)-num(a)+1));
        case "factorial":{const n=Math.max(0,Math.min(170,Math.floor(num(x))));let result=1;for(let i=2;i<=n;i++)result*=i;return result;}
      }
    }
    if(f==="compare"){
      switch(op){case "equals":return a==b;case "not-equals":return a!=b;case "strict-equals":return a===b;case "greater":return a>b;case "greater-equal":return a>=b;case "less":return a<b;case "less-equal":return a<=b;}
    }
    if(f==="logic"){
      switch(op){
        case "and":return !!a&&!!b;case "or":return !!a||!!b;case "xor":return !!a!==!!b;
        case "nand":return !(!!a&&!!b);case "nor":return !(!!a||!!b);case "xnor":return !!a===!!b;
        case "not":return !x;case "truthy":return !!x;case "falsy":return !x;
        case "coalesce":return a==null||a===""?b:a;case "is-null":return x===null||x===undefined;
        case "is-empty":return x==null||x===""||(Array.isArray(x)&&x.length===0)||(typeof x==="object"&&Object.keys(x).length===0);
        case "type-of":return Array.isArray(x)?"array":x===null?"null":typeof x;
        case "select":return args.condition?args.whenTrue:args.whenFalse;
      }
    }
    if(f==="string"){
      const s=String(args.text!==undefined?args.text:(args.a===undefined?"":args.a));
      switch(op){
        case "concat":return String(a==null?"":a)+String(b==null?"":b);
        case "join-pair":return String(a==null?"":a)+" "+String(b==null?"":b);
        case "contains":return String(a).includes(String(b));case "starts-with":return String(a).startsWith(String(b));case "ends-with":return String(a).endsWith(String(b));
        case "replace":return String(args.text).split(String(args.search)).join(String(args.replacement));
        case "index-of":return String(a).indexOf(String(b));case "includes-ignore-case":return String(a).toLowerCase().includes(String(b).toLowerCase());
        case "compare":return String(a).localeCompare(String(b));case "count-matches":return String(a).split(String(b)||"\u0000").length-1;
        case "length":return s.length;case "upper":return s.toUpperCase();case "lower":return s.toLowerCase();case "trim":return s.trim();
        case "trim-start":return s.trimStart();case "trim-end":return s.trimEnd();case "reverse":return Array.from(s).reverse().join("");
        case "remove-whitespace":return s.replace(/\s+/g,"");case "capitalize":return s? s.charAt(0).toUpperCase()+s.slice(1):s;
        case "title-case":return s.toLowerCase().replace(/\b\p{L}/gu,function(v){return v.toUpperCase();});
        case "slugify":return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
        case "escape-html":return CB.escapeHTML(s);case "decode-uri":return decodeURIComponent(s);case "encode-uri":return encodeURIComponent(s);
        case "to-lines":return s.replace(/\r\n?/g,"\n");case "first-word":return (s.trim().split(/\s+/)[0]||"");
        case "last-word":{const q=s.trim().split(/\s+/);return q[q.length-1]||"";}case "word-count":return s.trim()?s.trim().split(/\s+/).length:0;
        case "trim-to-length":return s.slice(0,Math.max(0,num(args.length)));
        case "format":{let out=String(args.template||"");[args.a,args.b,args.c].forEach(function(v,i){out=out.split("{"+i+"}").join(String(v));});return out;}
        case "substring":return String(args.text).slice(Math.max(0,num(args.start)),Math.max(0,num(args.start))+Math.max(0,num(args.length)));
        case "char-at":return Array.from(String(args.text))[Math.max(0,num(args.index))]||"";
        case "split":return String(args.text).split(String(args.separator));
        case "join-array":return CB.coerce(args.array,"array").join(String(args.separator));
        case "repeat":return s.repeat(Math.min(10000,Math.max(0,Math.floor(num(args.count)))));
        case "pad-start":return s.padStart(Math.min(10000,Math.max(0,num(args.length))),String(args.pad||" ")).slice(0,Math.max(0,num(args.length)));
        case "pad-end":return s.padEnd(Math.min(10000,Math.max(0,num(args.length))),String(args.pad||" ")).slice(0,Math.max(0,num(args.length)));
        case "words":return s.trim()?s.trim().split(/\s+/):[];
      }
    }
    if(f==="convert"){
      switch(op){
        case "to-number":case "to-float":{const n=Number(args.value);return Number.isFinite(n)?n:0;}
        case "to-integer":{const n=Number(args.value);return Number.isFinite(n)?Math.trunc(n):0;}
        case "to-string":return args.value===null?"null":typeof args.value==="object"?JSON.stringify(args.value):String(args.value);
        case "to-boolean":return args.value===true||args.value==="true"||args.value===1||args.value==="1";
        case "json-parse":return JSON.parse(String(args.value));
        case "json-stringify":return JSON.stringify(args.value);
        case "to-array":return CB.coerce(args.value,"array");
        case "to-object":return CB.coerce(args.value,"object");
        case "to-vector":return vec(args.value);
        case "vector-to-string":return JSON.stringify(vec(args.value));
        case "to-color":return String(args.value||"#ffffff");
        case "color-to-hex":return toHex(parseColor(args.value));
        case "number-to-hex":return "0x"+Math.max(0,Math.floor(num(args.value))).toString(16);
        case "char-code":return String(args.value||"").charCodeAt(0)||0;
        case "from-char-code":return String.fromCharCode(Math.max(0,Math.min(65535,num(args.value))));
        case "base64-encode":return btoa(unescape(encodeURIComponent(String(args.value))));
        case "base64-decode":return decodeURIComponent(escape(atob(String(args.value))));
        case "url-encode":return encodeURIComponent(String(args.value));case "url-decode":return decodeURIComponent(String(args.value));
        case "type-name":return Array.isArray(args.value)?"array":args.value===null?"null":typeof args.value;
        case "safe-number":{const n=Number(args.value);return Number.isFinite(n)?n:num(args.fallback);}
      }
    }
    if(f==="array"){
      const arr=CB.coerce(args.array,"array"),other=CB.coerce(args.other!==undefined?args.other:args.second,"array"),i=Math.max(0,Math.floor(num(args.index)));
      switch(op){
        case "length":return arr.length;case "first":return arr.length?arr[0]:null;case "last":return arr.length?arr[arr.length-1]:null;
        case "reverse":return arr.slice().reverse();case "unique":return Array.from(new Set(arr));case "sort-ascending":return arr.slice().sort(function(p,q){return typeof p==="number"&&typeof q==="number"?p-q:String(p).localeCompare(String(q));});
        case "sort-descending":return arr.slice().sort(function(p,q){return typeof p==="number"&&typeof q==="number"?q-p:String(q).localeCompare(String(p));});
        case "append":return arr.concat([args.item]);case "prepend":return [args.item].concat(arr);case "concat":return arr.concat(other);
        case "slice":return arr.slice(Math.max(0,num(args.start)),Math.max(0,num(args.end)));
        case "remove-at":return arr.filter(function(v,j){return j!==i;});case "filter-empty":return arr.filter(function(v){return v!==null&&v!==undefined&&v!=="";});
        case "flatten":return arr.reduce(function(out,v){return out.concat(Array.isArray(v)?v:[v]);},[]);
        case "includes":return arr.includes(args.item);case "index-of":return arr.indexOf(args.item);case "sum":return arr.reduce(function(s,v){return s+num(v);},0);
        case "average":return arr.length?arr.reduce(function(s,v){return s+num(v);},0)/arr.length:0;case "minimum":return arr.length?Math.min.apply(null,arr.map(num)):0;
        case "maximum":return arr.length?Math.max.apply(null,arr.map(num)):0;case "shuffle":{let out=arr.slice();for(let j=out.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[out[j],out[k]]=[out[k],out[j]];}return out;}
        case "range":{const start=num(args.start),count=Math.max(0,Math.min(10000,Math.floor(num(args.count)))),step=num(args.step)||1;return Array.from({length:count},function(_,j){return start+j*step;});}
        case "zip":{const right=CB.coerce(args.other!==undefined?args.other:args.second,"array");return arr.slice(0,Math.max(arr.length,right.length)).map(function(v,j){return [v,right[j]===undefined?null:right[j]];});}
        case "enumerate":return arr.map(function(v,j){return [j,v];});case "chunk":{const n=Math.max(1,Math.min(1000,Math.floor(num(args.count))));const out=[];for(let j=0;j<arr.length;j+=n)out.push(arr.slice(j,j+n));return out;}
        case "take":return arr.slice(0,Math.max(0,num(args.count)));case "drop":return arr.slice(Math.max(0,num(args.count)));case "compact":return arr.filter(Boolean);
        case "join":return arr.join(String(args.separator));case "get":return arr[i]===undefined?null:arr[i];
        case "includes-all":return arr.every(function(v){return other.includes(v);});case "includes-any":return arr.some(function(v){return other.includes(v);});
      }
    }
    if(f==="object"){
      const obj=CB.coerce(args.object,"object"),other=CB.coerce(args.other,"object"),key=String(args.key===undefined?args.path:args.key);
      switch(op){
        case "get":return obj[key]===undefined?null:obj[key];case "has":return Object.prototype.hasOwnProperty.call(obj,key);
        case "keys":return Object.keys(obj);case "values":return Object.keys(obj).map(function(k){return obj[k];});
        case "entries":return Object.entries(obj);case "merge":return Object.assign({},obj,other);case "set":{const out=Object.assign({},obj);out[key]=args.value;return out;}
        case "remove":{const out=Object.assign({},obj);delete out[key];return out;}case "pick":return Object.fromEntries(CB.coerce(args.keys,"array").filter(function(k){return Object.prototype.hasOwnProperty.call(obj,k);}).map(function(k){return [k,obj[k]];}));
        case "omit":{const ignored=CB.coerce(args.keys,"array");return Object.fromEntries(Object.entries(obj).filter(function(pair){return !ignored.includes(pair[0]);}));}
        case "size":return Object.keys(obj).length;case "is-empty":return Object.keys(obj).length===0;case "get-path":return clean(propPath(obj,args.path));
        case "set-path":return setPath(obj,args.path,args.value);case "invert":return Object.fromEntries(Object.entries(obj).map(function(pair){return [String(pair[1]),pair[0]];}));
        case "defaults":return Object.assign({},other,obj);case "from-entries":return Object.fromEntries(CB.coerce(args.entries,"array"));case "to-pairs":return Object.entries(obj);
        case "clone":return CB.clone(obj);
      }
    }
    if(f==="vector"){
      const p=vec(args.value!==undefined?args.value:args.a),q=vec(args.b),t=num(args.t);
      switch(op){
        case "make":return {x:num(args.x),y:num(args.y)};case "add":return {x:vec(a).x+q.x,y:vec(a).y+q.y};
        case "subtract":return {x:vec(a).x-q.x,y:vec(a).y-q.y};case "multiply":return {x:vec(a).x*q.x,y:vec(a).y*q.y};case "divide":return {x:q.x?vec(a).x/q.x:0,y:q.y?vec(a).y/q.y:0};
        case "min":return {x:Math.min(vec(a).x,q.x),y:Math.min(vec(a).y,q.y)};case "max":return {x:Math.max(vec(a).x,q.x),y:Math.max(vec(a).y,q.y)};
        case "reflect":{const u=vec(a),n=vec(b),d=u.x*n.x+u.y*n.y;return {x:u.x-2*d*n.x,y:u.y-2*d*n.y};}
        case "project":{const u=vec(a),n=vec(b),d=n.x*n.x+n.y*n.y,k=d?(u.x*n.x+u.y*n.y)/d:0;return {x:n.x*k,y:n.y*k};}
        case "perpendicular":return {x:-p.y,y:p.x};case "normalize":{const l=Math.hypot(p.x,p.y)||1;return {x:p.x/l,y:p.y/l};}
        case "abs":return {x:Math.abs(p.x),y:Math.abs(p.y)};case "round":return {x:Math.round(p.x),y:Math.round(p.y)};
        case "floor":return {x:Math.floor(p.x),y:Math.floor(p.y)};case "ceil":return {x:Math.ceil(p.x),y:Math.ceil(p.y)};
        case "negate":return {x:-p.x,y:-p.y};case "perpendicular-left":return {x:p.y,y:-p.x};
        case "scale":return {x:vec(args.value).x*num(args.scale),y:vec(args.value).y*num(args.scale)};
        case "dot":return vec(a).x*q.x+vec(a).y*q.y;case "cross":return vec(a).x*q.y-vec(a).y*q.x;
        case "length":return Math.hypot(p.x,p.y);case "distance":return Math.hypot(vec(a).x-q.x,vec(a).y-q.y);
        case "distance-squared":return Math.pow(vec(a).x-q.x,2)+Math.pow(vec(a).y-q.y,2);
        case "angle":return Math.atan2(p.y,p.x)*180/Math.PI;case "rotate":{const r=num(args.degrees)*Math.PI/180;return {x:p.x*Math.cos(r)-p.y*Math.sin(r),y:p.x*Math.sin(r)+p.y*Math.cos(r)};}
        case "lerp":return {x:vec(args.a).x+(q.x-vec(args.a).x)*t,y:vec(args.a).y+(q.y-vec(args.a).y)*t};
        case "clamp":return {x:Math.min(num(args.max),Math.max(num(args.min),p.x)),y:Math.min(num(args.max),Math.max(num(args.min),p.y))};
        case "split":return {x:p.x,y:p.y};
      }
    }
    if(f==="color"){
      let pcol=parseColor(args.color!==undefined?args.color:args.a),qcol=parseColor(args.b),amount=Math.max(0,Math.min(1,num(args.amount)));
      switch(op){
        case "rgb":return toHex({r:num(args.r),g:num(args.g),b:num(args.b),a:1});
        case "rgba":return toHex({r:num(args.r),g:num(args.g),b:num(args.b),a:Math.max(0,Math.min(1,num(args.a)))});
        case "from-hex":return toHex(parseColor(args.hex));
        case "lighten":return toHex({r:pcol.r+(255-pcol.r)*num(args.amount),g:pcol.g+(255-pcol.g)*num(args.amount),b:pcol.b+(255-pcol.b)*num(args.amount),a:pcol.a});
        case "darken":return toHex({r:pcol.r*(1-num(args.amount)),g:pcol.g*(1-num(args.amount)),b:pcol.b*(1-num(args.amount)),a:pcol.a});
        case "mix":return toHex({r:pcol.r+(qcol.r-pcol.r)*amount,g:pcol.g+(qcol.g-pcol.g)*amount,b:pcol.b+(qcol.b-pcol.b)*amount,a:pcol.a+(qcol.a-pcol.a)*amount});
        case "complement":return toHex({r:255-pcol.r,g:255-pcol.g,b:255-pcol.b,a:pcol.a});
        case "set-alpha":return toHex({r:pcol.r,g:pcol.g,b:pcol.b,a:Math.max(0,Math.min(1,num(args.alpha)))});
        case "grayscale":{const gray=.299*pcol.r+.587*pcol.g+.114*pcol.b;return toHex({r:gray,g:gray,b:gray,a:pcol.a});}
        case "hue-rotate":{const hsv=rgbToHsv(pcol);hsv.h=(hsv.h+num(args.degrees)/360+1)%1;return toHex(hsvToRgb(hsv));}
        case "red":return pcol.r/255;case "green":return pcol.g/255;case "blue":return pcol.b/255;case "alpha":return pcol.a;
        case "to-hex":return toHex(pcol);case "to-css":return pcol.a<1?"rgba("+Math.round(pcol.r)+", "+Math.round(pcol.g)+", "+Math.round(pcol.b)+", "+pcol.a+")":toHex(pcol);
      }
    }
    if(f==="utility"){
      const rt=ctx.runtime||CB.state.runtime,proj=CB.state.project||{};
      switch(op){
        case "random-boolean":return Math.random()<.5;case "random-item":{const ar=CB.coerce(args.array,"array");return ar.length?ar[Math.floor(Math.random()*ar.length)]:null;}
        case "uuid":return CB.uniqueId("uuid");
        case "now-milliseconds":return Date.now();case "now-seconds":return Date.now()/1000;case "iso-date":return new Date().toISOString();
        case "format-date":{const d=new Date(args.date);if(Number.isNaN(d.getTime()))return "Invalid date";return String(args.format)==="iso"?d.toISOString():d.toLocaleString();}
        case "date-part":{const d=new Date(args.date);const parts={year:d.getFullYear(),month:d.getMonth()+1,day:d.getDate(),hour:d.getHours(),minute:d.getMinutes(),second:d.getSeconds(),weekday:d.getDay()};return parts[String(args.part)]===undefined?0:parts[String(args.part)];}
        case "seconds-to-time":{const s=Math.max(0,Math.floor(num(args.seconds)));return String(Math.floor(s/3600)).padStart(2,"0")+":"+String(Math.floor(s/60)%60).padStart(2,"0")+":"+String(s%60).padStart(2,"0");}
        case "time-to-seconds":{const v=String(args.time||"").split(":").map(Number);return v.reduce(function(sum,n){return sum*60+(Number.isFinite(n)?n:0);},0);}
        case "stopwatch":return rt.elapsed||0;case "frame-delta":return ctx.delta||0;
        case "scene-width":return Number(proj.scene.width)||640;case "scene-height":return Number(proj.scene.height)||400;
        case "pointer-position":return Object.assign({},rt.pointer||{x:0,y:0});case "pointer-x":return num((rt.pointer||{}).x);case "pointer-y":return num((rt.pointer||{}).y);
        case "key-down":return !!CB.state.keys[String(args.key||"").toLowerCase()];case "key-just-pressed":return !!(ctx.pressedKeys||{})[String(args.key||"").toLowerCase()];
        case "sprite-count":return (rt.sprites||[]).length;case "score":return num(rt.score);case "sprite-position":{const sp=(rt.sprites||[]).find(function(s){return s.name===args.name;});return sp?{x:sp.x,y:sp.y}:{x:0,y:0};}
        case "sprite-x":{const sp=(rt.sprites||[]).find(function(s){return s.name===args.name;});return sp?sp.x:0;}
        case "sprite-y":{const sp=(rt.sprites||[]).find(function(s){return s.name===args.name;});return sp?sp.y:0;}
        case "message":return rt.message||"";case "clamp-percent":return Math.max(0,Math.min(100,num(args.value)));
        case "degrees":return num(args.value)+"°";
      }
    }
    if(f==="game"){
      const rt=ctx.runtime||CB.state.runtime,proj=CB.state.project||{},sprites=rt.sprites||[],name=String(args.name||"");
      const sp=sprites.find(function(s){return s.name===name;});
      switch(op){
        case "key-down":return !!CB.state.keys[String(args.key||"").toLowerCase()];
        case "key-pressed":return !!(ctx.pressedKeys||{})[String(args.key||"").toLowerCase()];
        case "scene-width":return num(proj.scene.width)||640;case "scene-height":return num(proj.scene.height)||400;case "sprite-count":return sprites.length;
        case "score":return num(rt.score);case "pointer":return Object.assign({},rt.pointer||{x:0,y:0});case "pointer-x":return num((rt.pointer||{}).x);case "pointer-y":return num((rt.pointer||{}).y);
        case "sprite-position":return sp?{x:sp.x,y:sp.y}:{x:0,y:0};case "sprite-x":return sp?num(sp.x):0;case "sprite-y":return sp?num(sp.y):0;
        case "sprite-exists":return !!sp;case "sprite-visible":return !!(sp&&sp.visible!==false);case "sprite-size":return sp?num(sp.size):0;
        case "elapsed":return num(rt.elapsed);case "delta-time":return num(ctx.delta);case "random-scene-point":return {x:Math.random()*(num(proj.scene.width)||640),y:Math.random()*(num(proj.scene.height)||400)};
        case "background":return rt.background||proj.scene.background||"#111827";case "message":return rt.message||"";
        case "collides":{const aa=sprites.find(function(s){return s.name===args.a;}),bb=sprites.find(function(s){return s.name===args.b;});return !!(aa&&bb&&Math.hypot(aa.x-bb.x,aa.y-bb.y)<((aa.size||34)+(bb.size||34))*.45);}
        case "distance":{const aa=sprites.find(function(s){return s.name===args.a;}),bb=sprites.find(function(s){return s.name===args.b;});return aa&&bb?Math.hypot(aa.x-bb.x,aa.y-bb.y):0;}
        case "screen-to-world":return Object.assign({},rt.pointer||{x:0,y:0});case "score-string":return String(rt.score||0);case "key-name":return ctx.lastKey||"";
      }
    }
    if(f==="debug"){
      if(op==="inspect"){CB.diagnostics.write("debug","Inspect: "+formatValue(args.value));return args.value;}
    }
    return null;
  };
  function formatValue(value){try{return typeof value==="string"?value:JSON.stringify(value);}catch(e){return String(value);}}
  function rgbToHsv(c){
    let r=c.r/255,g=c.g/255,b=c.b/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,h=0,s=max===0?0:d/max;
    if(d){if(max===r)h=((g-b)/d+(g<b?6:0))/6;else if(max===g)h=((b-r)/d+2)/6;else h=((r-g)/d+4)/6;}
    return {h:h,s:s,v:max};
  }
  function hsvToRgb(c){
    const i=Math.floor(c.h*6),f=c.h*6-i,p=c.v*(1-c.s),q=c.v*(1-f*c.s),t=c.v*(1-(1-f)*c.s);let r,g,b;
    switch(i%6){case 0:r=c.v;g=t;b=p;break;case 1:r=q;g=c.v;b=p;break;case 2:r=p;g=c.v;b=t;break;case 3:r=p;g=q;b=c.v;break;case 4:r=t;g=p;b=c.v;break;default:r=c.v;g=p;b=q;}
    return {r:r*255,g:g*255,b:b*255,a:1};
  }
})();