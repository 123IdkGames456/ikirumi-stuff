export function buildMap(scene,T){
const M=(color,roughness=.9)=>new T.MeshStandardMaterial({color,roughness});
const colors={grass:M(0x668b56),grassDark:M(0x426d49),sand:M(0xd9c18b),cliff:M(0x887d6b),rock:M(0x77796f),water:M(0x287e9b),road:M(0x343b42),edge:M(0xe8dfc4),line:M(0xf5e9bf),barrier:M(0xf1eee4),wood:M(0x8c5938)};
scene.background=new T.Color(0x9bcbdc);scene.fog=new T.Fog(0x9bcbdc,650,1900);
function terrain(size,segments,height,material,offset=0){const g=new T.PlaneGeometry(size,size,segments,segments);g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,height(x,z)+offset)}g.computeVertexNormals();const o=new T.Mesh(g,material);o.position.y=-.35;scene.add(o);return o}
terrain(1900,150,(x,z)=>Math.sin(x*.006)*.18+Math.cos(z*.008)*.16+Math.sin((x+z)*.018)*.06,colors.grass);
function box(x,y,z,sx,sy,sz,m,r=0){const o=new T.Mesh(new T.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);o.rotation.y=r;scene.add(o);return o}
const sea=new T.Mesh(new T.PlaneGeometry(2100,2100),colors.water);sea.rotation.x=-Math.PI/2;sea.position.set(690,-.55,120);scene.add(sea);
const path=[[-540,230],[-430,160],[-320,75],[-210,30],[-110,55],[0,150],[110,230],[220,250],[310,190],[340,75],[300,-40],[190,-105],[60,-120],[-60,-70],[-140,-150],[-260,-240],[-390,-220],[-500,-120]];
function road(points,width,mat,y=.05){const pts=points.map(p=>new T.Vector3(p[0],y,p[1]));const curve=new T.CatmullRomCurve3(pts,false,'catmullrom',.12);const seg=360,verts=[],uv=[],idx=[];for(let i=0;i<=seg;i++){const t=i/seg,p=curve.getPoint(t),tan=curve.getTangent(t),side=new T.Vector3(-tan.z,0,tan.x).normalize();verts.push(p.x+side.x*width/2,p.y,p.z+side.z*width/2,p.x-side.x*width/2,p.y,p.z-side.z*width/2);uv.push(0,t,1,t);if(i<seg){let a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const o=new T.Mesh(g,mat);o.material.side=T.DoubleSide;scene.add(o);return curve}
const curve=road(path,24,colors.road,.08);road(path,1.1,colors.edge,.1);
function clearOfRoad(x,z,margin=42){for(let t=0;t<=1;t+=.004){const p=curve.getPoint(t),dx=p.x-x,dz=p.z-z;if(dx*dx+dz*dz<margin*margin)return false}return true}

for(let i=0;i<170;i++){const t=i/170,p=curve.getPoint(t),tan=curve.getTangent(t),side=new T.Vector3(-tan.z,0,tan.x).normalize();if(i%2===0)box(p.x+side.x*1.7,.15,p.z+side.z*1.7,.5,.12,2.8,colors.line,Math.atan2(tan.x,tan.z))}
for(let i=0;i<70;i++){const x=-850+(i*137%1650),z=-820+(i*223%1600);if(!clearOfRoad(x,z,48))continue;const h=8+(i%5)*3;box(x,h/2-0.1,z,32,h,28,colors.cliff,(i%7)*.13);if(i%3===0){const tree=box(x+12,h+2,z+4,3,5,3,colors.grassDark);tree.rotation.z=.12}}
for(const [x,z] of [[-470,190],[-390,90],[-280,30],[-120,20],[120,245],[260,205],[310,80],[220,-95],[30,-100],[-230,-220],[-420,-190]]){if(!clearOfRoad(x,z,19))continue;box(x,.8,z,2,1.6,2,colors.barrier,.2)}
for(let i=0;i<10;i++){const x=-400+i*82;box(x,.7,-420,8,1.4,5,colors.wood);box(x,1.8,-420,1,1.2,1,colors.barrier)}
}