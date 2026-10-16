export function buildMap(scene,T){
const M=(color,roughness=.95)=>new T.MeshStandardMaterial({color,roughness});
const c={sand:M(0xd4b16f),sandLight:M(0xe5c987),sandDark:M(0xa7834f),rock:M(0x805d48),road:M(0x494640),line:M(0xe6d9b4),red:M(0xb85f45),wood:M(0x79513b),metal:M(0x5b5a52)};
scene.background=new T.Color(0xf0c58b);scene.fog=new T.Fog(0xe8bd83,500,1900);
function terrain(size,segments,height,mat){const g=new T.PlaneGeometry(size,size,segments,segments);g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,height(x,z))}g.computeVertexNormals();const o=new T.Mesh(g,mat);o.position.y=-.4;scene.add(o)}
terrain(2000,180,(x,z)=>Math.sin(x*.011)*3+Math.cos(z*.013)*2+Math.sin((x-z)*.02)*1.5,c.sand);
function box(x,y,z,sx,sy,sz,m,r=0){const o=new T.Mesh(new T.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);o.rotation.y=r;scene.add(o);return o}
function road(points,width,mat,y=.08){const pts=points.map(p=>new T.Vector3(p[0],y,p[1])),curve=new T.CatmullRomCurve3(pts,false,'catmullrom',.12),seg=420,v=[],idx=[];for(let i=0;i<=seg;i++){const t=i/seg,p=curve.getPoint(t),tan=curve.getTangent(t),s=new T.Vector3(-tan.z,0,tan.x).normalize();v.push(p.x+s.x*width/2,p.y,p.z+s.z*width/2,p.x-s.x*width/2,p.y,p.z-s.z*width/2);if(i<seg){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const o=new T.Mesh(g,mat);o.material.side=T.DoubleSide;scene.add(o);return curve}
const path=[[-600,280],[-470,230],[-340,130],[-220,40],[-100,20],[20,90],[140,180],[270,220],[390,160],[430,40],[350,-70],[220,-110],[80,-60],[-40,-140],[-170,-260],[-320,-290],[-470,-210],[-540,-80],[-460,40],[-300,20],[-170,100],[-50,240],[100,300],[280,290],[450,220],[580,120]];
const curve=road(path,26,c.road);road(path,1.1,c.line,.11);
for(let i=0;i<210;i++){const t=i/210,p=curve.getPoint(t),tan=curve.getTangent(t),s=new T.Vector3(-tan.z,0,tan.x).normalize();if(i%2===0){const side=i%4===0?1:-1;box(p.x+s.x*14*side,.35,p.z+s.z*14*side,1.8,.7,2,c.red,Math.atan2(tan.x,tan.z))}}
for(let i=0;i<26;i++){const x=-850+(i*173%1700),z=-820+(i*251%1640),h=18+(i*13%42);box(x,h/2,z,38+(i%4)*13,h,40+(i%3)*10,c.rock,(i%6)*.17);box(x+4,h+1,z-2,24,3,26,c.sandDark,(i%6)*.17)}
for(let i=0;i<25;i++){const x=-700+i*58;box(x,1.3,-430,3,2.6,3,c.wood);if(i%3===0)box(x,3,-430,2,1,2,c.metal)}
box(-420,2,-410,24,4,16,c.red);box(-420,4.5,-410,25,1,17,c.wood);
for(let i=0;i<12;i++){const x=-520+i*92;box(x,.7,410,3,1.4,3,c.wood);box(x,1.5,410,2,.4,2,c.line)}
}