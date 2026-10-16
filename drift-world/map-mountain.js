export function buildMap(scene,T){
const M=(color,roughness=.95)=>new T.MeshStandardMaterial({color,roughness});
const c={valley:M(0x506e48),grass:M(0x71835b),pine:M(0x244735),rock:M(0x777c78),snow:M(0xcbd4d3),road:M(0x34383d),line:M(0xf1e7c7),barrier:M(0xe6e5d9),wood:M(0x76523b)};
scene.background=new T.Color(0xa9c7d9);scene.fog=new T.Fog(0xa9c7d9,450,1800);
function terrain(size,segments,height,mat){const g=new T.PlaneGeometry(size,size,segments,segments);g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,height(x,z))}g.computeVertexNormals();const o=new T.Mesh(g,mat);o.position.y=-.4;scene.add(o)}
terrain(1900,180,(x,z)=>Math.sin(x*.008)*.22+Math.cos(z*.009)*.2+Math.sin((x+z)*.014)*.08);
function box(x,y,z,sx,sy,sz,m,r=0){const o=new T.Mesh(new T.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);o.rotation.y=r;scene.add(o);return o}
function road(points,width,mat,y=.12){const pts=points.map(p=>new T.Vector3(p[0],y,p[1])),curve=new T.CatmullRomCurve3(pts,false,'catmullrom',.15),seg=420,v=[],idx=[];for(let i=0;i<=seg;i++){const t=i/seg,p=curve.getPoint(t),tan=curve.getTangent(t),s=new T.Vector3(-tan.z,0,tan.x).normalize();v.push(p.x+s.x*width/2,p.y,p.z+s.z*width/2,p.x-s.x*width/2,p.y,p.z-s.z*width/2);if(i<seg){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const o=new T.Mesh(g,mat);o.material.side=T.DoubleSide;scene.add(o);return curve}
const path=[[-520,350],[-400,260],[-300,130],[-230,20],[-280,-90],[-390,-180],[-350,-300],[-200,-330],[-70,-240],[20,-100],[100,30],[230,85],[360,25],[390,-100],[300,-210],[170,-220],[80,-150],[30,-10],[-20,140],[50,260],[190,340],[340,320],[500,220]];
const curve=road(path,23,c.road);road(path,1,c.line,.15);
function clearOfRoad(x,z,margin=42){for(let t=0;t<=1;t+=.004){const p=curve.getPoint(t),dx=p.x-x,dz=p.z-z;if(dx*dx+dz*dz<margin*margin)return false}return true}

for(let i=0;i<210;i++){const t=i/210,p=curve.getPoint(t),tan=curve.getTangent(t),s=new T.Vector3(-tan.z,0,tan.x).normalize();if(i%3===0){const side=i%2?1:-1,x=p.x+s.x*13*side,z=p.z+s.z*13*side;box(x,.35,z,2.2,.7,2.2,c.barrier,Math.atan2(tan.x,tan.z))}}
for(let i=0;i<38;i++){const x=-820+(i*191%1600),z=-800+(i*317%1550),h=35+(i*17%75);if(!clearOfRoad(x,z,52))continue;const rock=box(x,h/2-1,z,55+(i%4)*16,h,58+(i%3)*18,i%4===0?c.snow:c.rock,(i%5)*.2);if(i%2===0)box(x,h+5,z,28,10,30,c.snow)}
for(let i=0;i<100;i++){const x=-800+(i*73%1600),z=-780+(i*119%1550);if(!clearOfRoad(x,z,42))continue;const h=5+(i%5)*1.5;const trunk=box(x,h/2,z,1.4,h,1.4,c.wood);box(x,h+1,z,6,7,6,c.pine,(i%4)*.4)}
for(const [x,z,r] of [[-280,20,.2],[-390,-180,-.4],[-70,-240,.3],[230,85,.5],[300,-210,-.2],[50,260,.4]]){if(!clearOfRoad(x,z,22))continue;box(x,.65,z,4,1.3,2,c.barrier,r)}
}