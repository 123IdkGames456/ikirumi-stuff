export function buildMap(scene,T){
const M=(color,emissive=0x000000,ei=0)=>new T.MeshStandardMaterial({color,emissive,emissiveIntensity:ei,roughness:.65});
const c={floor:M(0x17192a),road:M(0x25263a),line:M(0xa8ff4b,0xa8ff4b,1.6),pink:M(0xff36b7,0xff36b7,1.8),blue:M(0x35dfff,0x35dfff,1.5),building:M(0x252a43),window:M(0x55c9f0,0x2b9ac2,.7),grass:M(0x303b35)};
scene.background=new T.Color(0x101326);scene.fog=new T.Fog(0x101326,350,1450);
function box(x,y,z,sx,sy,sz,m,r=0){const o=new T.Mesh(new T.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);o.rotation.y=r;scene.add(o);return o}
const floor=new T.Mesh(new T.PlaneGeometry(1900,1900),c.floor);floor.rotation.x=-Math.PI/2;floor.position.y=-.4;scene.add(floor);
function road(points,width,mat,y=.07){const pts=points.map(p=>new T.Vector3(p[0],y,p[1])),curve=new T.CatmullRomCurve3(pts,false,'catmullrom',.12),seg=420,v=[],idx=[];for(let i=0;i<=seg;i++){const t=i/seg,p=curve.getPoint(t),tan=curve.getTangent(t),s=new T.Vector3(-tan.z,0,tan.x).normalize();v.push(p.x+s.x*width/2,p.y,p.z+s.z*width/2,p.x-s.x*width/2,p.y,p.z-s.z*width/2);if(i<seg){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const o=new T.Mesh(g,mat);o.material.side=T.DoubleSide;scene.add(o);return curve}
const path=[[-500,300],[-370,250],[-240,120],[-120,40],[0,70],[120,180],[250,230],[360,150],[370,20],[280,-90],[140,-130],[0,-70],[-120,-150],[-240,-260],[-360,-220],[-420,-80],[-330,20],[-190,0],[-70,100],[60,260],[220,330],[400,270],[510,150]];
const curve=road(path,25,c.road);road(path,1.3,c.pink,.11);
function clearOfRoad(x,z,margin=42){for(let t=0;t<=1;t+=.004){const p=curve.getPoint(t),dx=p.x-x,dz=p.z-z;if(dx*dx+dz*dz<margin*margin)return false}return true}

for(let i=0;i<220;i++){const t=i/220,p=curve.getPoint(t),tan=curve.getTangent(t),s=new T.Vector3(-tan.z,0,tan.x).normalize();if(i%2===0)box(p.x+s.x*13,.25,p.z+s.z*13,.7,.5,2.3,i%4===0?c.pink:c.line,Math.atan2(tan.x,tan.z))}
for(let row=0;row<7;row++)for(let col=0;col<8;col++){const x=-650+col*180,z=-650+row*190;if(!clearOfRoad(x,z,54))continue;const h=20+(row*17+col*13)%65;box(x,h/2,z,65,h,65,c.building,(row%3)*.08);for(let y=5;y<h-2;y+=7)for(let xx=-2;xx<=2;xx++)box(x+xx*10,y,z-33,.9,2.5,1,c.window)}
for(let i=0;i<16;i++){const x=-520+i*70;box(x,8,-400,3,16,3,c.blue);box(x,16,-400,18,.8,3,c.pink);box(x,3,-400,10,.5,10,c.line)}
for(let i=0;i<9;i++){const x=-350+i*85;box(x,1.2,440,28,2.4,20,c.road);box(x,2.6,431,28,.5,2,c.blue);box(x,2.6,449,28,.5,2,c.pink)}
for(const [x,z] of [[-320,80],[0,180],[300,20],[180,-180],[-180,-220]]){box(x,2,z,28,4,24,c.road);box(x,4.5,z,28,.8,3,c.line)}
}