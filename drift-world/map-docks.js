export function buildMap(scene,T){
const M=(color,roughness=.82)=>new T.MeshStandardMaterial({color,roughness});
const c={concrete:M(0x6b7479),road:M(0x30383e),line:M(0xe3dfc8),water:M(0x245d70),metal:M(0x454f56),white:M(0xd5d7d4),red:M(0xb84d3c),blue:M(0x397d9e),yellow:M(0xd4a23a),green:M(0x53796d),orange:M(0xd4773e),window:M(0x273d48),crane:M(0xd6b044)};
scene.background=new T.Color(0x9bb5c0);scene.fog=new T.Fog(0x9bb5c0,550,1800);
function box(x,y,z,sx,sy,sz,m,r=0){const o=new T.Mesh(new T.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);o.rotation.y=r;scene.add(o);return o}
const ground=new T.Mesh(new T.PlaneGeometry(1900,1900),c.concrete);ground.rotation.x=-Math.PI/2;ground.position.y=-.4;scene.add(ground);
const water=new T.Mesh(new T.PlaneGeometry(850,1450),c.water);water.rotation.x=-Math.PI/2;water.position.set(610,-.25,0);scene.add(water);
function road(points,width,mat,y=.06){const pts=points.map(p=>new T.Vector3(p[0],y,p[1])),curve=new T.CatmullRomCurve3(pts,false,'catmullrom',.1),seg=400,v=[],idx=[];for(let i=0;i<=seg;i++){const t=i/seg,p=curve.getPoint(t),tan=curve.getTangent(t),s=new T.Vector3(-tan.z,0,tan.x).normalize();v.push(p.x+s.x*width/2,p.y,p.z+s.z*width/2,p.x-s.x*width/2,p.y,p.z-s.z*width/2);if(i<seg){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const o=new T.Mesh(g,mat);o.material.side=T.DoubleSide;scene.add(o);return curve}
const path=[[-500,-300],[-400,-300],[-300,-180],[-200,-100],[-100,-120],[0,-220],[150,-220],[260,-130],[250,0],[140,80],[20,50],[-100,140],[-200,260],[-340,260],[-430,140],[-370,20],[-250,0],[-150,-50],[0,-30],[130,130],[280,230],[420,230]];
const curve=road(path,25,c.road);road(path,1.1,c.line,.1);
for(let i=0;i<150;i++){const t=i/150,p=curve.getPoint(t),tan=curve.getTangent(t),s=new T.Vector3(-tan.z,0,tan.x).normalize();if(i%2===0)box(p.x+s.x*13,.3,p.z+s.z*13,1.8,.6,2,c.white,Math.atan2(tan.x,tan.z))}
const containers=[c.red,c.blue,c.yellow,c.green,c.orange];for(let row=0;row<7;row++)for(let col=0;col<5;col++){const x=-430+col*75,z=-500+row*145;if((row===2&&col>1)||(row===5&&col<3))continue;const m=containers[(row+col)%containers.length],h=row%3===0?6:4;box(x,h/2,z,54,h,22,m);box(x,h+.15,z,52,.25,20,c.metal);for(let k=-2;k<=2;k++)box(x+k*9,h/2,z-11.3,.45,h*.85,.35,c.metal)}
for(let i=0;i<5;i++){const x=-300+i*135;box(x,12,-650,5,24,5,c.crane);box(x+30,24,-650,65,4,4,c.crane);box(x+58,16,-650,3,16,3,c.crane);box(x+58,7,-650,14,2,14,c.yellow)}
for(let i=0;i<4;i++){const x=430,z=-360+i*230;box(x,10,z,70,20,60,c.metal);box(x,21,z,66,2,56,c.white);for(let j=0;j<5;j++)box(x-25+j*12,13,z-30,.6,10,.5,c.window)}
for(let i=0;i<10;i++){const x=-450+i*80;box(x,1.1,430,8,2.2,6,c.white);box(x,2.5,430,1,1,1,c.yellow)}
}