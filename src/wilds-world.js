(function(root){'use strict';
// Terrain samples and solid boxes are shared with gameplay. Original Kenney
// CC0 model geometry is embedded locally; no runtime network or model loader.
function create({THREE:T,scene}){
 const group=new T.Group();group.name='余晖荒庭 | authored pixel landscape';scene.add(group);
 const queryGroup=new T.Group();queryGroup.name='Wilds query geometry (not rendered)';
 const palette={sky:'#2a2c5c',fog:'#d99a86',ambient:'#a9b6ff',key:'#ffcf8f',accent:'#f2b864',stone:'#8a8494',dark:'#3d3a52',brass:'#d4a85a',leaf:'#e0a040'};
 const materials=new Set(),geometries=new Set(),textures=new Set(),batches=new Map(),artBatches=new Map(),artGeometry=new Map(),patches=new Map();
 const chestModels=new Map(),solidQueries=new Map(),overhangQueries=[],occluders=[],cameraOccluders=[];
 let data=null,m=null,unit=null,queryMaterial=null,solidKey='',gate=null,lever=null,camp=null,mist=null,altar=null,deathDrop=null,skyMat=null,glowTex=null,cake=null,gateRing=null;
 const flickers=[],glows=[];
 const finite=(n,f=0)=>Number.isFinite(n)?n:f,H=(x,z)=>root.HatTerrain.heightAt(x,z);
 const noise=(x,z,s=0)=>{const n=Math.sin(x*127.1+z*311.7+s*74.7)*43758.5453;return n-Math.floor(n);};
 function material(color,unlit=false,options={}){
  const mat=unlit?new T.MeshBasicMaterial({color,toneMapped:false,...options}):new T.MeshStandardMaterial({color,roughness:1,metalness:0,flatShading:true,...options});materials.add(mat);return mat;
 }
 function geometry(g){geometries.add(g);return g;}
 function mesh(g,mat,x=0,y=0,z=0,parent=group){const o=new T.Mesh(g,mat);o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,mat,x=0,y=0,z=0,parent=group){const o=mesh(unit,mat,x,y,z,parent);o.scale.set(w,h,d);return o;}
 function localGroup(name,x=0,y=0,z=0,parent=group){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
 function stamp(mat,x,y,z,w,h,d,rotation=0){
  let list=batches.get(mat);if(!list){list=[];batches.set(mat,list);}
  list.push({x,y,z,w,h,d,rotation});
 }
 function line(mat,ax,az,bx,bz,width=.1,y=.016,height=.016){
  const dx=bx-ax,dz=bz-az;stamp(mat,(ax+bx)/2,y,(az+bz)/2,width,height,Math.hypot(dx,dz),Math.atan2(dx,dz));
 }
 function art(id,x,y,z,w,h,d,rotation=0,variant='default'){
  const key=id+'|'+variant;let list=artBatches.get(key);if(!list){list=[];artBatches.set(key,list);}list.push({id,x,y,z,w,h,d,rotation,variant});
  // The shoulder camera may orbit beyond the play border. Near-border solid
  // geology gets camera-only bounds; leaves and distant skyline never do.
  if(/rock_|cliff_/.test(id)){
   const b=data.bounds,c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation)),rw=w*c+d*s,rd=d*c+w*s,minX=x-rw/2,maxX=x+rw/2,minZ=z-rd/2,maxZ=z+rd/2;
   const outside=maxX<b.minX||minX>b.maxX||maxZ<b.minZ||minZ>b.maxZ,near=maxX>b.minX-7&&minX<b.maxX+7&&maxZ>b.minZ-7&&minZ<b.maxZ+7;
   if(outside&&near)overhangQueries.push(queryBox('Camera | border geology '+id,x,y+h/2,z,rw,h,rd,true));
  }
 }
 function bakedGeometry(id,variant){
  const key=id+'|'+variant;if(artGeometry.has(key))return artGeometry.get(key);
  const source=root.HatArtAssets[id];if(!source)throw Error('Missing offline Kenney model '+id);
  const colors=[],c=new T.Color(),isTree=id.includes('tree_'),isPlant=/grass|plant_|moss/.test(id),isCastle=id.startsWith('castle-kit/'),isBanner=id.includes('flag-');
  for(let i=0;i<source.colors.length;i+=3){
   const r=source.colors[i]/255,g=source.colors[i+1]/255,b=source.colors[i+2]/255,lum=r*.2126+g*.7152+b*.0722;let tint='#79796d';
   // Detail props keep the kit's own colours, nudged warm for the dusk light.
   if(variant==='native'){c.setRGB(r,g,b,T.SRGBColorSpace);colors.push(c.r*.98,c.g*.9,c.b*.8);continue;}
   if(isTree){const leaf=id.includes('fall')?r-b>.22:g>r*.93&&g>b*1.12;tint=leaf?(variant==='gold'?'#e39a3c':id.includes('pine')?'#3f6b52':'#7f9d47'):'#5e4636';}
   else if(isPlant)tint=id.includes('moss')?'#6f8a45':variant==='straw'?'#d2b45f':'#82a446';
   else if(isBanner)tint=Math.max(r,g,b)-Math.min(r,g,b)>.12?'#b03f52':'#e0b45e';
   else if(isCastle)tint=variant==='distant'?'#6a5d80':variant==='gold'?'#c99d58':'#8e8799';
   else tint=variant==='distant'?'#6e6080':'#837e8c';
   c.set(tint).multiplyScalar(.76+lum*.38);colors.push(c.r,c.g,c.b);
  }
  const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(source.positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(source.normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeBoundingSphere();artGeometry.set(key,g);return g;
 }
 function flush(){
  const dummy=new T.Object3D();
  for(const [mat,items] of batches){
   const batch=new T.InstancedMesh(unit,mat,items.length);batch.name='Wilds static | '+mat.name;batch.receiveShadow=true;batch.castShadow=mat.isMeshStandardMaterial&&!['horizon','path','pathDark','pathLight','goldDark'].includes(mat.name);
   items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.rotation,0);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});
   batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();group.add(batch);
  }
  for(const [key,items] of artBatches){
   const first=items[0],g=bakedGeometry(first.id,first.variant),source=root.HatArtAssets[first.id],batch=new T.InstancedMesh(g,m.art,items.length);batch.name='Kenney CC0 | '+key;batch.receiveShadow=true;batch.castShadow=!/grass|plant_|moss/.test(first.id)&&first.variant!=='distant';
   items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.rotation,0);dummy.scale.set(p.w/source.size[0],p.h/source.size[1],p.d/source.size[2]);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();group.add(batch);
  }
  for(const [mat,positions] of patches){const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();const p=mesh(g,mat);p.name='Terrain-conforming path and floor';}
  batches.clear();artBatches.clear();patches.clear();
 }
 function clear(){
  group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});group.clear();queryGroup.clear();
  for(const g of geometries)g.dispose();for(const mat of materials)mat.dispose();for(const tex of textures)tex.dispose();
  geometries.clear();materials.clear();textures.clear();batches.clear();artBatches.clear();artGeometry.clear();patches.clear();chestModels.clear();solidQueries.clear();
  overhangQueries.length=occluders.length=cameraOccluders.length=0;flickers.length=glows.length=0;solidKey='';data=m=unit=queryMaterial=gate=lever=camp=mist=altar=deathDrop=skyMat=glowTex=cake=gateRing=null;
 }
 function theme(){return {...palette,...(data?.theme||{})};}
 function makePalette(){
  const colors={earth:'#5b6a3c',soil:'#7a6448',grass:'#7c9a44',grassDark:'#5a7a3a',grassLight:'#9fb85a',straw:'#d2b45f',leaf:'#e39a3c',leafLight:'#f4c25a',leafShadow:'#b06a2e',stone:'#8a8494',stoneLight:'#aaa3b6',stoneDark:'#5a5568',mortar:'#3a3447',path:'#b39f80',pathLight:'#d0bb94',pathDark:'#8c7b65',bark:'#5e4434',barkLight:'#86634a',wood:'#7a5a42',iron:'#3c4152',gold:'#e0b45e',goldDark:'#a7803f',cloth:'#9a4a50',ash:'#423c3c',horizon:'#9a7c88',mountain:'#7a6888',mountainNear:'#5e5470',stem:'#5f8a3a',petalPink:'#ff8fb3',petalYellow:'#ffd84d',petalWhite:'#fff2e2',petalLilac:'#b99cff',capRed:'#e0483f',stalk:'#f2e6cf',cakeSponge:'#fff1e2',cakeCream:'#ff9cc0',plate:'#f4efe6'};
  const out={};for(const [name,color] of Object.entries(colors)){out[name]=material(color);out[name].name=name;}
  for(const [name,color] of Object.entries({flame:'#ffa63d',flameCore:'#fff0b0',glint:'#ffe08a',mist:'#f0d9b0',rune:'#ffd27a',lamp:'#ffd98a',cherry:'#ff3a5a',cloudLit:'#ffc1a0',cloudShade:'#c98a9a',ridgeFar:'#c98597',ridgeMid:'#8e6189',ridgeNear:'#5a4672'})){out[name]=material(color,true);out[name].name=name;}
  for(const [name,color] of Object.entries(data?.theme?.colors||{}))out[name]?.color.set(color);
  out.art=material('#ffffff',false,{vertexColors:true});out.art.name='Muted Kenney vertex color';return out;
 }
 function queryBox(id,x,y,z,w,h,d,cameraOnly=false){
  const q=box(w,h,d,queryMaterial,x,y,z,queryGroup);q.name=id;q.userData.occluderKind=cameraOnly?'scenery':'cover';q.userData.cameraOnly=cameraOnly;return q;
 }
 function overhang(x,y,z,w,h,d){
  // Only opaque overhangs overlapping the shoulder's near play volume are
  // queried. Far foliage, clouds, sun and skyline never enter either ray list.
  const b=data.bounds,minX=Math.max(x-w/2,b.minX-.5),maxX=Math.min(x+w/2,b.maxX+.5),minZ=Math.max(z-d/2,b.minZ-.5),maxZ=Math.min(z+d/2,b.maxZ+.5),minY=y-h/2,maxY=y+h/2;
  if(maxX<=minX||maxZ<=minZ||maxY<=minY)return;
  overhangQueries.push(queryBox('Camera | stone / canopy', (minX+maxX)/2,(minY+maxY)/2,(minZ+maxZ)/2,maxX-minX,maxY-minY,maxZ-minZ,true));
 }
 function sky(){
  const P=theme(),stops=P.skyStops||['#141a45','#3d3678','#a25a8c','#f2806b','#ffc27a'],sunDir=new T.Vector3(...(P.sunDir||[-77,35,76])).normalize(),sunAt=sunDir.clone().multiplyScalar(112.5);
  skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new T.Color(stops[0])},upper:{value:new T.Color(stops[1])},mid:{value:new T.Color(stops[2])},low:{value:new T.Color(stops[3])},horizon:{value:new T.Color(stops[4])},sunDir:{value:sunDir.clone()},time:{value:0},sunTint:{value:new T.Vector3(...(P.sunTint||[1,.66,.38]))},ground:{value:new T.Vector3(...(P.skyGround||[.55,.36,.42]))},starFrom:{value:P.starFrom??.3},starCut:{value:P.starCut??.9963}},vertexShader:'varying vec3 vSky; void main(){vSky=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 top; uniform vec3 upper; uniform vec3 mid; uniform vec3 low; uniform vec3 horizon; uniform vec3 sunDir; uniform float time; uniform vec3 sunTint; uniform vec3 ground; uniform float starFrom; uniform float starCut; varying vec3 vSky; float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);} void main(){vec3 n=normalize(vSky); float h=clamp(n.y,0.0,1.0); float band=floor(h*30.0)/30.0; vec3 c=mix(horizon,low,smoothstep(0.0,0.1,band)); c=mix(c,mid,smoothstep(0.08,0.26,band)); c=mix(c,upper,smoothstep(0.24,0.5,band)); c=mix(c,top,smoothstep(0.46,0.92,band)); float s=max(dot(n,sunDir),0.0); c+=sunTint*floor((pow(s,5.0)*0.5+pow(s,48.0)*0.7)*9.0)/9.0; if(n.y<0.0)c=mix(horizon,ground,clamp(-n.y*4.0,0.0,1.0)); vec2 g=floor(vec2(atan(n.z,n.x)*96.0,n.y*96.0)); float r=hash(g); c+=vec3(1.0,0.94,0.82)*step(starCut,r)*smoothstep(starFrom,starFrom+0.32,n.y)*(0.5+0.5*sin(time*2.3+r*80.0)); gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});materials.add(skyMat);
  // Radius plus the furthest playable camera offset stays inside the 180-unit
  // far plane. A larger fixed dome would clip when walking to an area corner.
  const dome=mesh(geometry(new T.SphereGeometry(112,32,20)),skyMat);dome.name='Stepped golden-hour sky';dome.renderOrder=-10;
  const sun=mesh(geometry(new T.CircleGeometry(P.sunSize||5.4,14)),material(P.sunDisc||'#fff3cf',true,{fog:false}),sunAt.x,sunAt.y,sunAt.z);sun.name=data.id==='firefly-lake'?'Full moon':'Low autumn sun';sun.lookAt(0,4,0);glow(sunAt.x*.99,sunAt.y*.99,sunAt.z*.99,34,P.sunGlow||'#ffb070',.55,false);
  // Sunset-lit cloud bands: warm undersides catch the low sun.
  for(const p of [[-69,31,-87,28,2.4,8],[-42,34,-94,23,1.6,7],[13,27,-103,34,2,7],[38,30,-100,30,2,6],[76,28,-83,25,1.6,7],[-91,25,12,20,1.5,8],[-48,40,98,37,1.6,8],[35,33,111,32,1.5,8]]){stamp(m.cloudShade,...p);stamp(m.cloudLit,p[0],p[1]-p[4]*.45,p[2],p[3]*.82,p[4]*.45,p[5]*.9);}
 }
 // Three stepped ridge rings outside the playable land: different radii and
 // colours give real parallax and aerial perspective as the camera moves.
 function ridges(){
  for(const [radius,base,amp,mat,seed,count] of [[104,7,10,m.ridgeFar,1.3,96],[93,3,8,m.ridgeMid,2.7,84],[82,0,6,m.ridgeNear,4.1,72]]){
   const positions=[];const height=i=>base+Math.round((Math.sin(i*.41+seed)*.55+Math.sin(i*.17+seed*2.3)*.45+noise(i,seed,7)*.5)*amp*2)/2;
   for(let i=0;i<count;i++){const a0=i/count*Math.PI*2,a1=(i+1)/count*Math.PI*2,h=height(i),x0=Math.cos(a0)*radius,z0=Math.sin(a0)*radius,x1=Math.cos(a1)*radius,z1=Math.sin(a1)*radius;positions.push(x0,-10,z0,x1,h,z1,x1,-10,z1,x0,-10,z0,x0,h,z0,x1,h,z1);}
   const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));const ring=new T.Mesh(g,mat);ring.name='Distant ridge ring '+radius;ring.renderOrder=-8;group.add(ring);
  }
  for(const mat of [m.ridgeFar,m.ridgeMid,m.ridgeNear]){mat.side=T.DoubleSide;mat.fog=false;}
 }
 // Pixel halos stand in for bloom: stepped radial sprites, additive and cheap.
 function glow(x,y,z,size,color,opacity=.7,fogged=true,parent=group){
  if(!glowTex){const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');for(let py=0;py<32;py++)for(let px=0;px<32;px++){const d=Math.hypot(px-15.5,py-15.5)/16,a=Math.floor(Math.pow(Math.max(0,1-d),2.2)*5)/5;if(a>0){g.fillStyle='rgba(255,255,255,'+a+')';g.fillRect(px,py,1,1);}}glowTex=new T.CanvasTexture(c);glowTex.magFilter=glowTex.minFilter=T.NearestFilter;glowTex.generateMipmaps=false;textures.add(glowTex);}
  const mat=new T.SpriteMaterial({map:glowTex,color,transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false,fog:fogged,toneMapped:false});materials.add(mat);
  const sprite=new T.Sprite(mat);sprite.position.set(x,y,z);sprite.scale.set(size,size,1);sprite.renderOrder=20;parent.add(sprite);glows.push({sprite,base:opacity,size,seed:x*.7+z*1.3});return sprite;
 }
 function lightAt(x,y,z,color,intensity,distance,parent=group,flicker=.12){const l=new T.PointLight(color,intensity,distance,1.6);l.position.set(x,y,z);parent.add(l);flickers.push({l,base:intensity,amount:flicker,seed:x*1.7+z*.9});return l;}
 function terrain(){
  const {bounds:b,cell,nx,nz,heights}=root.HatTerrain,positions=[],colors=[],indices=[],c=new T.Color();
  for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
   const x=b.minX+ix*cell,z=b.minZ+iz*cell,y=heights[iz*nx+ix],n=noise(ix,iz,13),normal=root.HatTerrain.normalAt(x,z);positions.push(x,y,z);
   const rocky=normal.y<.91,chapel=x>-10.8&&x<10.8&&z<-12.7,warm=noise(ix>>1,iz>>1,31);c.set(chapel?'#6c667a':rocky?'#857a6c':n>.7?'#8fae4e':n<.2?'#5f8640':warm>.72?'#a3ab4e':'#76984a');c.multiplyScalar(.93+n*.13);colors.push(c.r,c.g,c.b);
  }
  for(let iz=0;iz<nz-1;iz++)for(let ix=0;ix<nx-1;ix++){const a=iz*nx+ix,b=a+1,c=a+nx,d=c+1;indices.push(a,c,b,b,c,d);}
  const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();const ground=mesh(g,m.art);ground.name='HatTerrain | exact shared physical surface';
  const skirt=[];function edge(ax,az,bx,bz){const ay=H(ax,az),by=H(bx,bz),bottom=-5;skirt.push(ax,ay,az,bx,by,bz,ax,bottom,az,bx,by,bz,bx,bottom,bz,ax,bottom,az);}
  for(let x=b.minX;x<b.maxX;x+=cell){edge(x,b.minZ,x+cell,b.minZ);edge(x+cell,b.maxZ,x,b.maxZ);}for(let z=b.minZ;z<b.maxZ;z+=cell){edge(b.maxX,z,b.maxX,z+cell);edge(b.minX,z+cell,b.minX,z);}
  const sg=geometry(new T.BufferGeometry());sg.setAttribute('position',new T.Float32BufferAttribute(skirt,3));sg.computeVertexNormals();mesh(sg,material('#5a4a48',false,{side:T.DoubleSide}));
 }
 // Clip ground decoration against the same terrain triangles. Even on ramps,
 // paths, leaves and chapel tiles remain coplanar with the actual ground.
 function groundPatch(mat,polygon,lift=.018){
  let out=patches.get(mat);if(!out){out=[];patches.set(mat,out);}const {bounds:b,cell,nx,nz}=root.HatTerrain;
  const minX=Math.max(0,Math.floor((Math.min(...polygon.map(p=>p[0]))-b.minX)/cell)),maxX=Math.min(nx-2,Math.floor((Math.max(...polygon.map(p=>p[0]))-b.minX)/cell)),minZ=Math.max(0,Math.floor((Math.min(...polygon.map(p=>p[1]))-b.minZ)/cell)),maxZ=Math.min(nz-2,Math.floor((Math.max(...polygon.map(p=>p[1]))-b.minZ)/cell));
  for(let iz=minZ;iz<=maxZ;iz++)for(let ix=minX;ix<=maxX;ix++){
   const x=b.minX+ix*cell,z=b.minZ+iz*cell;for(const tri of [[[x,z],[x+cell,z],[x,z+cell]],[[x+cell,z],[x+cell,z+cell],[x,z+cell]]]){
    let poly=polygon.map(p=>[p[0],p[1]]);for(let k=0;k<3&&poly.length;k++){const a=tri[k],q=tri[(k+1)%3],cross=p=>(q[0]-a[0])*(p[1]-a[1])-(q[1]-a[1])*(p[0]-a[0]),next=[];for(let i=0;i<poly.length;i++){const p=poly[i],s=poly[(i+1)%poly.length],cp=cross(p),cs=cross(s);if(cp>=-.000001)next.push(p);if((cp>=0)!==(cs>=0)){const t=cp/(cp-cs);next.push([p[0]+(s[0]-p[0])*t,p[1]+(s[1]-p[1])*t]);}}poly=next;}
    for(let j=1;j<poly.length-1;j++)for(const p of [poly[0],poly[j+1],poly[j]])out.push(p[0],H(p[0],p[1])+lift,p[1]);
   }
  }
 }
 function groundTile(mat,x,z,w,d,angle=0,lift=.02){const c=Math.cos(angle),s=Math.sin(angle);groundPatch(mat,[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([a,b])=>[x+a*c+b*s,z-a*s+b*c]),lift);}
 const route=[[-19,19],[-13,14],[-7,8],[-4,0],[0,-9],[0,-13]];
 const sideRoute=[[-4,0],[6,1],[12,3]];
 const shortcutRoute=[[-19,19],[-19,8],[-19,-5],[-19,-10],[-11,-10],[-3,-10]];
 function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-dx*u,z-a[1]-dz*u);}
 function routeDistance(x,z,points){let dist=Infinity;for(let i=1;i<points.length;i++)dist=Math.min(dist,segmentDistance(x,z,points[i-1],points[i]));return dist;}
 function path(points,width,side=false){
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),rx=dz/length,rz=-dx/length,steps=Math.ceil(length/.85),angle=Math.atan2(dx,dz);
   groundPatch(m.soil,[[a[0]+rx*(width+.3)/2,a[1]+rz*(width+.3)/2],[b[0]+rx*(width+.3)/2,b[1]+rz*(width+.3)/2],[b[0]-rx*(width+.3)/2,b[1]-rz*(width+.3)/2],[a[0]-rx*(width+.3)/2,a[1]-rz*(width+.3)/2]],.012);
   for(let j=0;j<steps;j++)for(let k=-1;k<=1;k++){
    if(side&&noise(i+j,k,8)<.25)continue;const u=(j+.5)/steps,n=noise(i+j,k,5),offset=k*width*.31;
    groundTile(n<.22?m.pathLight:n>.73?m.pathDark:m.path,a[0]+dx*u+rx*offset,a[1]+dz*u+rz*offset,width*.29-.05,length/steps-.09,angle+(n-.5)*.09);
   }
  }
 }
 function clearGrass(x,z){
  if(Math.hypot(x-data.camp.x,z-data.camp.z)<3.8)return false;
  if(data.id==='firefly-lake'){if(H(x,z)<data.waterLevel+.25||routeDistance(x,z,data.route)<2||Math.hypot(x,z-data.portal.z)<3.2||x>3.6&&x<10.4&&Math.abs(z+6)<4.5)return false;}
  else{if(x>-10.8&&x<10.8&&z<-12.5)return false;
  if(routeDistance(x,z,route)<2.2||routeDistance(x,z,sideRoute)<1.65||routeDistance(x,z,shortcutRoute)<1.15)return false;}
  if(data.obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.45&&Math.abs(z-o.z)<o.d/2+.45))return false;
  return true;
 }
 function meadow(){
  path(route,3.7);path(sideRoute,2.7,true);path(shortcutRoute,2.2,true);
  const b=data.bounds;
  for(let x=b.minX+.8;x<b.maxX-.6;x+=1.7)for(let z=b.minZ+1;z<b.maxZ-.6;z+=1.9){
   const n=noise(x,z,3),xx=x+(n-.5)*.7,zz=z+(noise(z,x,9)-.5)*.7;if(!clearGrass(xx,zz))continue;
   if(n<.42)continue;
   art('nature-kit/grass_large',xx,H(xx,zz)-.015,zz,.46+n*.28,.22+n*.3,.4+n*.3,n*6.28,n>.83?'straw':'default');
   if(n>.9)art('nature-kit/plant_bushSmall',xx+.4,H(xx+.4,zz+.3)-.03,zz+.3,.7,.38,.65,n*3);
  }
  const petals=[m.petalPink,m.petalYellow,m.petalWhite,m.petalLilac];
  for(let x=b.minX+1.1;x<b.maxX-.8;x+=1.15)for(let z=b.minZ+1.3;z<b.maxZ-.8;z+=1.2){
   const n=noise(x,z,41),cluster=noise(Math.floor(x/6),Math.floor(z/6),43);if(n<.62||cluster<.35)continue;
   const xx=x+(noise(z,x,44)-.5)*.8,zz=z+(noise(x,z,45)-.5)*.8;if(!clearGrass(xx,zz))continue;const y=H(xx,zz),hgt=.08+n*.09;
   stamp(m.stem,xx,y+hgt/2,zz,.035,hgt,.035);stamp(petals[Math.floor(noise(Math.floor(x/4),Math.floor(z/4),46)*4)],xx,y+hgt+.03,zz,.1,.06,.1);if(n>.9)stamp(m.petalYellow,xx,y+hgt+.065,zz,.04,.025,.04);
  }
  for(const c of [{x:-24,z:11},{x:23,z:17},{x:-9,z:5},{x:20,z:-1}])for(let i=0;i<5;i++){const a=i*2.1+c.x,r=1.3+noise(i,c.z,47)*1.3,x=c.x+Math.cos(a)*r,z=c.z+Math.sin(a)*r;if(x<b.minX+.3||x>b.maxX-.3||z>b.maxZ-.3||!clearGrass(x,z))continue;const y=H(x,z),s=.7+noise(i,c.x,48)*.6;stamp(m.stalk,x,y+.09*s,z,.07*s,.18*s,.07*s);stamp(m.capRed,x,y+.2*s,z,.22*s,.09*s,.22*s);stamp(m.petalWhite,x+.05*s,y+.25*s,z,.05*s,.02,.05*s);}
  // Quiet, ground-level leaf fall is concentrated around the two landmark trees.
  for(const c of [{x:-24,z:11,r:4.7},{x:23,z:17,r:6.7}])for(let i=0;i<46;i++){
   const angle=i*2.39996,r=Math.sqrt((i+.5)/46)*c.r,x=c.x+Math.cos(angle)*r,z=c.z+Math.sin(angle)*r;
   if(x<b.minX+.2||x>b.maxX-.2||z>b.maxZ-.2||!clearGrass(x,z))continue;
   groundTile(i%3?m.leafShadow:m.leaf,x,z,.14,.23,angle,.025);
  }
  for(const [x,z,s] of [[-31,1,1.2],[-31,-16,1.5],[31,6,1.3],[31,-8,.9],[-13,32,.75],[16,32,1.2],[31,23,1.1]])art('nature-kit/rock_largeC',x,H(x,z)-.14,z,2.5*s,.65*s,1.8*s,noise(x,z)*3);
 }
 function masonry(o){
  const {x,z,w,d,height:h}=o,y=finite(o.y),alongX=w>=d,length=alongX?w:d;
  // Recessed structural core + original model relief, all inside the solid.
  stamp(m.stoneDark,x,y+h*.45,z,w*.98,h*.9,d*.98);
  const pieces=Math.max(1,Math.ceil(length/2.5)),pitch=length/pieces;
  for(let i=0;i<pieces;i++){const p=-length/2+(i+.5)*pitch;art(o.kind==='low-wall'?'castle-kit/wall-half':'castle-kit/wall',x+(alongX?p:0),y,z+(alongX?0:p),alongX?pitch:w,h,alongX?d:pitch);}
  if(o.walkable)stamp(m.path,x,y+h-.035,z,w,.07,d);
 }
 function archRelief(x,y,z,width,height,axis=0){
  // Blind clerestory niches: opaque stone remains behind every dark recess.
  const alongX=axis===0,face=(mat,dx,dy,ww,hh)=>stamp(mat,x+(alongX?dx:0),y+dy,z+(alongX?0:dx),alongX?ww:.026,hh,alongX?.026:ww);
  face(m.mortar,0,0,width*.7,height*.82);face(m.mortar,0,height*.43,width*.4,height*.17);
  for(const side of [-1,1]){face(m.stoneLight,side*width*.48,-.03,width*.12,height*.88);face(m.stoneLight,side*width*.34,height*.43,width*.24,height*.12);face(m.goldDark,side*width*.13,-.1,width*.04,height*.65);}
  face(m.stoneLight,0,height*.53,width*.48,height*.12);face(m.stoneDark,0,-height*.46,width*1.12,.16);
 }
 function statue(o){
  const y=finite(o.y);stamp(m.stoneDark,o.x,y+o.height*.45,o.z,o.w*.67,o.height*.9,o.d*.67);
  art('nature-kit/statue_columnDamaged',o.x,y,o.z,o.w,o.height,o.d);
 }
 function cart(o){
  const y=finite(o.y);art('fantasy-town-kit/cart',o.x,y,o.z,o.d,1.55,o.w,Math.PI/2+.08,'native');
  prop('nature-kit/crop_pumpkin',o.x+1.9,o.z+.9,.42,.6);prop('nature-kit/crop_pumpkin',o.x+2.3,o.z+.2,.3,2);prop('fantasy-town-kit/wheel',o.x-1.9,o.z+1.1,.75,1.3);
 }
 function tree(x,z,height,width,backdrop=false,base=H(x,z)){
  const spread=height*.84;art('nature-kit/tree_oak_fall',x,base,z,spread,height+3.2,spread*.95,.3,'gold');
  // The readable trunk matches the authoritative collision footprint. Imported
  // crowns/branches are scenery, not a broad near-camera occlusion box.
  if(!backdrop){stamp(m.bark,x,base+height/2,z,width,height,width);stamp(m.barkLight,x-width*.25,base+height*.42,z+width*.4,width*.13,height*.69,width*.13);}
 }
 function obstacleScenery(){
  for(const o of data.obstacles){
   if(o.kind==='gate'||o.kind==='water')continue;
   if(o.kind==='prop'){prop(o.model,o.x,o.z,o.height,o.rot||0);continue;}
   if(o.kind==='tree'){tree(o.x,o.z,o.height,o.w,false,finite(o.y));continue;}
   if(o.kind==='cart'){cart(o);continue;}
   if(o.kind==='pillar'){statue(o);continue;}
   if(o.kind==='rock'){art('nature-kit/rock_largeA',o.x,finite(o.y)-.03,o.z,o.w,o.height+.03,o.d);continue;}
   if(o.kind==='lantern'){lantern(o);continue;}
   masonry(o);
   if(o.kind==='plinth'){
    for(const side of [-1,1]){stamp(m.goldDark,o.x+side*(o.w/2-.15),finite(o.y)+o.height+.01,o.z,.07,.02,o.d-.3);stamp(m.goldDark,o.x,finite(o.y)+o.height+.01,o.z+side*(o.d/2-.15),o.w-.3,.02,.07);}
    // All four faces advertise a genuine jump ledge, with no fake walk-up steps.
    for(const dx of [-1.8,-.6,.6,1.8])stamp(m.stoneLight,o.x+dx,finite(o.y)+.56,o.z+o.d/2-.02,.16,.45,.04);
   }
  }
 }
 function prop(id,x,z,height,rotation=0,y=H(x,z)-.02){
  const size=root.HatArtAssets[id].size,s=height/size[1];art(id,x,y,z,size[0]*s,height,size[2]*s,rotation,'native');
 }
 // Kenney CC0 detail pass: flower beds, forest-floor clutter, a camp, and a
 // border forest. None of this is solid; solid props live in HatWilds.obstacles.
 function details(){
  const b=data.bounds,flowers=['flower_redA','flower_yellowA','flower_purpleA','flower_redB','flower_yellowB','flower_purpleB'];
  for(let x=b.minX+.9;x<b.maxX-.6;x+=1.15)for(let z=b.minZ+1;z<b.maxZ-.6;z+=1.2){
   const bed=noise(Math.floor(x/5),Math.floor(z/5),61),n=noise(x,z,62);if(bed<.58||n<.5)continue;
   const xx=x+(noise(z,x,63)-.5)*.6,zz=z+(noise(x,z,64)-.5)*.6;if(!clearGrass(xx,zz))continue;
   prop('nature-kit/'+flowers[Math.floor(noise(Math.floor(x/3),Math.floor(z/3),65)*6)],xx,zz,.3+n*.22,n*9);
  }
  for(let x=b.minX+1.2;x<b.maxX-.8;x+=2.6)for(let z=b.minZ+1.2;z<b.maxZ-.8;z+=2.4){
   const n=noise(x,z,71),xx=x+(noise(z,x,72)-.5)*1.6,zz=z+(noise(x,z,73)-.5)*1.6;if(n<.8||!clearGrass(xx,zz))continue;
   const pick=Math.floor(noise(z,x,74)*8),r=n*9;
   if(pick<2)prop('nature-kit/rock_smallA',xx,zz,.32+n*.2,r);else if(pick<3)prop('nature-kit/rock_smallFlatA',xx,zz,.12,r);
   else if(pick<4)prop('nature-kit/mushroom_redGroup',xx,zz,.42,r);else if(pick<5)prop('nature-kit/mushroom_tanGroup',xx,zz,.4,r);
   else if(pick<6)prop('nature-kit/plant_bushDetailed',xx,zz,.62,r);else if(pick<7)prop('nature-kit/grass_leafs',xx,zz,.4,r);else prop('nature-kit/plant_flatTall',xx,zz,.55,r);
  }
  if(data.id!=='golden-wake'){borderForest(b,true);return;}
  // The traveller's camp: tent, firewood, a seat and a signpost toward the road.
  prop('nature-kit/log',-21.4,21.6,.42,1.25);prop('nature-kit/stump_roundDetailed',-16.8,21.4,.48);prop('nature-kit/pot_large',-22.2,17.2,.5,.4);
  prop('nature-kit/sign',-15.6,15.2,1.2,-.75);for(const [x,z,r] of [[-26.3,22],[-25.8,21.2],[-22.5,25.2]])prop('nature-kit/crop_pumpkin',x,z,.38,r);
  prop('nature-kit/path_stoneCircle',-19,19,.05);
  // Ruins and road clutter, kept off the paving.
  prop('fantasy-town-kit/fence-broken',21.3,9.6,.9,.3);prop('fantasy-town-kit/fence-broken',9.7,11.2,.9,1.7);prop('nature-kit/log',4.3,14,.4,.6);prop('nature-kit/stump_old',-12.2,4.4,.55);
  for(const [x,z] of [[-24,11],[23,17],[-9,5]])for(let i=0;i<4;i++){const a=i*1.7+x,r=2+noise(i,z,75),xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r;if(clearGrass(xx,zz))prop('nature-kit/mushroom_redTall',xx,zz,.36+noise(i,x,76)*.2,a);}
  // Banners on the chapel facade and hedges framing its door.
  const front=H(0,-12.4);for(const x of [-8.6,-4.2,4.2,8.6])art('fantasy-town-kit/banner-red',x,front+2.2,-12.42,.06,2.5,1.15,Math.PI/2,'native');
  for(const side of [-1,1])for(const z of [-6.5,-9])prop('fantasy-town-kit/hedge',side*5.3,z,.55,0,H(side*5.3,z)-.03);
  borderForest(b,false);
 }
 // Border forest: mixed species just outside the walkable bounds.
 function borderForest(b,night){
  const trees=night?['nature-kit/tree_pineDefaultA','nature-kit/tree_tall_dark','nature-kit/tree_thin_dark','nature-kit/tree_pineRoundA','nature-kit/tree_pineTallA_detailed','nature-kit/tree_default']:['nature-kit/tree_default','nature-kit/tree_oak','nature-kit/tree_fat_fall','nature-kit/tree_cone_fall','nature-kit/tree_pineRoundA','nature-kit/tree_small_fall','fantasy-town-kit/tree-crooked'];
  const ring=[];for(let x=b.minX-1;x<=b.maxX+1;x+=2.7){ring.push([x,b.maxZ,0,1]);if(night||x<-11||x>11)ring.push([x,b.minZ,0,-1]);}
  for(let z=b.minZ;z<=b.maxZ;z+=2.7){ring.push([b.minX,z,-1,0]);ring.push([b.maxX,z,1,0]);}
  for(const [bx,bz,ox,oz] of ring)for(let k=0;k<2;k++){
   const n=noise(bx+k*7,bz,81),off=1.6+k*3.4+n*2.2,x=bx+ox*off+(oz?(n-.5)*2:0),z=bz+oz*off+(ox?(n-.5)*2:0);
   if(n<.18)continue;const gy=H(x,z);if(night&&gy<data.waterLevel)continue;prop(trees[Math.floor(noise(bz,bx+k,82)*trees.length)],x,z,4.2+n*4+k*1.5,n*7,H(x,z)-.1);
   if(n>.6)prop('nature-kit/plant_bushLarge',x-ox*1.2+.8,z-oz*1.2,.9,n*5);
  }
 }
 // Chapter one: water, bridge, reeds, lily pads, a north-bank pinewood and the moon gate.
 function lakeWorld(){
  const b=data.bounds,wl=data.waterLevel;path(data.route,3);
  for(let x=b.minX+.8;x<b.maxX-.6;x+=1.7)for(let z=b.minZ+1;z<b.maxZ-.6;z+=1.9){
   const n=noise(x,z,3),xx=x+(n-.5)*.7,zz=z+(noise(z,x,9)-.5)*.7;if(n<.4||!clearGrass(xx,zz))continue;
   art('nature-kit/grass_large',xx,H(xx,zz)-.015,zz,.46+n*.28,.22+n*.3,.4+n*.3,n*6.28);
  }
  const petals=[m.petalLilac,m.petalWhite,m.petalPink];
  for(let x=b.minX+1.1;x<b.maxX-.8;x+=1.3)for(let z=b.minZ+1.3;z<b.maxZ-.8;z+=1.3){
   const n=noise(x,z,41),cluster=noise(Math.floor(x/6),Math.floor(z/6),43);if(n<.66||cluster<.4)continue;
   const xx=x+(noise(z,x,44)-.5)*.8,zz=z+(noise(x,z,45)-.5)*.8;if(!clearGrass(xx,zz))continue;const y=H(xx,zz),hgt=.08+n*.09;
   stamp(m.stem,xx,y+hgt/2,zz,.035,hgt,.035);stamp(petals[Math.floor(noise(Math.floor(x/4),Math.floor(z/4),46)*3)],xx,y+hgt+.03,zz,.1,.06,.1);
  }
  // Moonlit water: stepped ripples and twinkling glints, under the scene fog.
  const water=new T.ShaderMaterial({transparent:true,fog:true,uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{time:{value:0}}]),
   vertexShader:'#include <fog_pars_vertex>\nvarying vec3 vW;void main(){vW=(modelMatrix*vec4(position,1.0)).xyz;vec4 mvPosition=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
   fragmentShader:'#include <fog_pars_fragment>\nuniform float time;varying vec3 vW;float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}void main(){vec2 p=floor(vW.xz*2.0)/2.0;float r=sin(p.x*.9+time*.8)*sin(p.y*1.1-time*.6);vec3 c=mix(vec3(.02,.05,.15),vec3(.05,.12,.28),floor((r*.5+.5)*4.0)/4.0);float g=hash(floor(vW.xz*3.0)+floor(time*1.5));c+=vec3(.6,.7,.9)*step(.995,g);float moon=smoothstep(3.5,0.0,abs(vW.x*.79+vW.z*.45+4.0));c+=vec3(.3,.36,.5)*moon*step(.75,hash(floor(vW.xz*4.0)+floor(time*3.0)));gl_FragColor=vec4(c,.94);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n#include <fog_fragment>\n}'});
  materials.add(water);const sheet=mesh(geometry(new T.PlaneGeometry(b.maxX-b.minX+40,b.maxZ-b.minZ+40)),water,0,wl,(b.minZ+b.maxZ)/2);sheet.rotation.x=-Math.PI/2;sheet.name='Moonlit lake';sheet.renderOrder=2;group.userData.waterMat=water;
  // Lily pads, reeds and a canoe pulled up on the south shore.
  for(let i=0;i<70;i++){const x=-24+noise(i,1,51)*30,z=-11+noise(i,2,52)*20;if(H(x,z)>wl-.5)continue;const big=noise(i,3,53)>.45;art(big?'nature-kit/lily_large':'nature-kit/lily_small',x,wl+.01,z,big?.9:.6,.1,big?1:.7,i,'native');if(noise(i,4,54)>.8)glow(x,wl+.3,z,.9,'#ffd6f0',.5);}
  for(let x=b.minX+.5;x<b.maxX;x+=.9)for(let z=b.minZ+.5;z<b.maxZ;z+=.9){const y=H(x,z);if(y<wl-.25||y>wl+.45||noise(x,z,55)<.55)continue;art('nature-kit/grass',x,y-.05,z,.5,.55+noise(z,x,56)*.4,.5,x*z,'native');}
  prop('nature-kit/canoe',-9.5,7.6,.5,.9);prop('nature-kit/stump_round',.8,24.4,.45);prop('nature-kit/log',-4.6,20.2,.42,.3);prop('nature-kit/pot_large',-.3,25.6,.5);prop('nature-kit/sign',4.6,17,1.2,-.4);
  // The wooden bridge spans the river where the bank stays dry.
  for(let z=-9.6;z<-2.2;z+=1.25)art('nature-kit/bridge_wood',7,H(7,z)-.05,z,1.3,.9,5.4,Math.PI/2,'native');
  // North-bank pinewood, kept off the path, the river and the gate.
  const pines=['nature-kit/tree_pineDefaultA','nature-kit/tree_tall_dark','nature-kit/tree_thin_dark','nature-kit/tree_pineTallA_detailed'];
  for(let x=b.minX+1.5;x<b.maxX-1;x+=3.1)for(let z=b.minZ+1.5;z<-10;z+=3.1){const n=noise(x,z,57),xx=x+(n-.5)*1.6,zz=z+(noise(z,x,58)-.5)*1.6;if(n<.42||H(xx,zz)<wl+.3||routeDistance(xx,zz,data.route)<3.4||Math.hypot(xx,zz-data.portal.z)<5.5||data.chests.some(c=>Math.hypot(c.x-xx,c.z-zz)<2.5)||data.enemies.some(e=>Math.hypot(e.x-xx,e.z-zz)<2))continue;
   prop(pines[Math.floor(noise(zz,xx,59)*pines.length)],xx,zz,4.2+n*3.5,n*6);}
  for(const [x,z,h] of [[19,1,5],[24,-1,6],[-24,10,5.5],[-25,3,6],[22,24,5],[-14,25,4.5],[12,25,5]])prop('nature-kit/tree_pineRoundA',x,z,h,x);
  // The moon gate: a standing stone ring holding a slow, shimmering disc.
  const pg=data.portal,base=H(pg.x,pg.z-1);gateRing=localGroup('Moon gate',pg.x,base,pg.z-1);
  art('nature-kit/statue_ring',pg.x,base-.05,pg.z-1,3.9,5.2,1.2,0,'native');prop('nature-kit/path_stoneCircle',pg.x,pg.z+.6,.06);
  const disc=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,uniforms:{time:{value:0}},vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:'uniform float time;varying vec2 vU;void main(){vec2 q=vU-.5;float r=length(q)*2.0,a=atan(q.y,q.x);float sw=sin(a*5.0+r*9.0-time*2.2)*.5+.5;float k=floor((1.0-r)*5.0+sw*1.5)/5.0;if(r>1.0)discard;vec3 c=mix(vec3(.45,.6,1.0),vec3(1.0,.85,.98),sw*(1.0-r));gl_FragColor=vec4(c,clamp(k,0.0,1.0)*.85);}'});
  materials.add(disc);const d=mesh(geometry(new T.CircleGeometry(1.45,24)),disc,0,2.65,0,gateRing);gateRing.userData.disc=disc;d.name='Moon gate disc';
  glow(pg.x,base+2.6,pg.z-1,5.5,'#9fc4ff',.55);lightAt(pg.x,base+2.6,pg.z-.2,'#a8c8ff',5,12,group,.06);
  for(const [x,z] of [[-2.8,-23.5],[2.8,-23.5]])prop('nature-kit/statue_obelisk',x,z,2.2,.3);
 }
 function lantern(o){
  const y=finite(o.y),hx=o.x+(o.x<0?.34:-.34);
  stamp(m.stoneDark,o.x,y+.1,o.z,.46,.2,.46);stamp(m.bark,o.x,y+1.08,o.z,.14,1.96,.14);stamp(m.barkLight,o.x-.04,y+1.05,o.z+.05,.04,1.7,.04);
  stamp(m.bark,(o.x+hx)/2,y+2.02,o.z,.5,.09,.09);stamp(m.iron,hx,y+1.97,o.z,.05,.12,.05);
  stamp(m.iron,hx,y+1.84,o.z,.36,.06,.36);stamp(m.gold,hx,y+1.9,o.z,.18,.07,.18);stamp(m.iron,hx,y+1.36,o.z,.3,.05,.3);
  stamp(m.lamp,hx,y+1.6,o.z,.24,.42,.24);for(const dx of [-.13,.13])for(const dz of [-.13,.13])stamp(m.iron,hx+dx,y+1.6,o.z+dz,.03,.44,.03);
  glow(hx,y+1.6,o.z,1.7,'#ffb45a',.62);lightAt(hx,y+1.6,o.z,'#ffb35a',3.2,7,group,.08);
 }
 function chapel(){
  const base=H(0,-22);
  groundTile(m.pathDark,0,-22.6,18.5,18.7,0,.008);
  for(let x=-8.4;x<=8.4;x+=1.4)for(let z=-30.5;z<-14;z+=1.4){const n=noise(x,z);groundTile(n>.8?m.path:m.stoneDark,x,z,1.33,1.33,0,.018);}
  // A narrow gold inlay leads through a broad, unobstructed duel floor.
  for(const x of [-2.65,2.65])groundTile(m.goldDark,x,-21.5,.065,15,0,.028);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;groundTile(m.path,Math.cos(a)*5,-23+Math.sin(a)*5,.14,.6,-a,.03);}
  for(const side of [-1,1]){
   const face=side*9.245;
   for(const z of [-17,-22,-27])archRelief(face,base+4.8,z,2.3,2.35,1);
   for(const z of [-16.2,-21.4,-26.6,-30.4]){
    // Buttresses sit within the wall collider, keeping both exterior routes clear.
    art('castle-kit/wall-pillar',side*10.45,base,z,.55,5.65,1.25);
    stamp(m.goldDark,side*10.72,base+1.1,z,.05,.16,1.1);
   }
   archRelief(side*6.6,base+3.8,-12.492,2.5,2.5);
   art('castle-kit/flag-banner-long',side*9.22,base+3.25,-20,.1,2.6,.85);
   for(const z of [-17,-25.5])art('nature-kit/hanging_moss',side*9.22,base+4.3,z,.7,1.8,.06,Math.PI/2);
  }
  for(const x of [-7,0,7])archRelief(x,base+5.85,-30.992,x===0?3.4:2.2,x===0?4.1:3.2);
  // Stepped surviving arch above the 5.8-high sealed doorway. These overhangs
  // are above jump height and explicitly enter the camera-only query list.
  for(const side of [-1,1])for(let j=0;j<4;j++){
   const x=side*(2.55-j*.55),y=base+6.15+j*.48,w=.72,h=.65,d=1;
   stamp(j===3?m.goldDark:m.stoneLight,x,y,-13,w,h,d);overhang(x,y,-13,w,h,d);
  }
  stamp(m.stoneLight,0,base+7.73,-13,1.15,.52,1);overhang(0,base+7.73,-13,1.15,.52,1);
  // Broken cross-ribs survive only at the edges: the chapel roof is open sky.
  for(const z of [-19.2,-27.3])for(const side of [-1,1])for(let j=0;j<3;j++){
   const x=side*(9.15-j*.65),y=base+7.15+j*.38;stamp(m.stoneLight,x,y,z,.85,.45,.75);overhang(x,y,z,.85,.45,.75);
  }
  // Small candle groups occupy wall/pillar feet, never a new movement barrier.
  for(const side of [-1,1])for(const z of [-15.1,-20.1,-28.7]){candles(side*8.8,H(side*8.8,z),z);glow(side*8.8,H(side*8.8,z)+.45,z,1.3,'#ffb050',.55);}
  for(const side of [-1,1])for(const z of [-16,-26])lightAt(side*7.4,base+1.4,z,'#ffa95a',7,10,group,.1);
  // Slanted light shafts through the broken roof: additive, fog-free, never solid.
  const shaftMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,fog:false,toneMapped:false,uniforms:{tint:{value:new T.Color('#ffc890')},time:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 tint; uniform float time; varying vec2 vUv; void main(){float edge=1.0-abs(vUv.x*2.0-1.0); float a=floor(pow(edge,1.2)*pow(vUv.y,1.1)*8.0)/8.0*(0.42+0.06*sin(time*0.7+vUv.x*3.0)); gl_FragColor=vec4(tint*a,a);}'});materials.add(shaftMat);
  for(const [x,z,w,tilt] of [[-3.6,-19.5,2.2,.42],[2.2,-23.5,1.6,.38],[4.8,-17.8,1.2,.45],[-1,-27,1.8,.4]])for(const turn of [0,Math.PI/2]){const shaft=mesh(geometry(new T.PlaneGeometry(w,11)),shaftMat,x,base+5.2,z);shaft.rotation.set(0,turn+.6,tilt);shaft.receiveShadow=false;shaft.renderOrder=18;shaft.name='Chapel light shaft';}
  group.userData.shaftMat=shaftMat;
  // The reliquary rests on shared hilltop terrain; the light is intangible.
  const e=data.exit;altar=localGroup('The last vow | altar',e.x,finite(e.y),e.z);
  const ring=mesh(geometry(new T.RingGeometry(1.5,1.63,12)),m.goldDark,0,.026,0,altar);ring.rotation.x=-Math.PI/2;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;box(.13,.025,.43,m.gold,Math.sin(a)*1.27,.022,Math.cos(a)*1.27,altar).rotation.y=a;}
  altar.userData.light=mesh(geometry(new T.OctahedronGeometry(.26)),m.rune,0,.88,0,altar);altar.userData.light.visible=false;
  const candlePositions=[[-1.9,-.25],[1.9,-.25],[-1.6,.8],[1.6,.8]];for(const p of candlePositions){candles(e.x+p[0],H(e.x+p[0],e.z+p[1]),e.z+p[1]);glow(e.x+p[0],H(e.x+p[0],e.z+p[1])+.45,e.z+p[1],1.2,'#ffb050',.5);}
  lightAt(e.x,finite(e.y)+1.6,e.z-.4,'#ffbf7a',4,9,group,.1);
  cake=localGroup('Birthday cake',0,0,-1.15,altar);cake.visible=false;
  box(1.15,.62,1.15,m.stoneLight,0,.31,0,cake);box(1.3,.06,1.3,m.plate,0,.65,0,cake);
  box(.95,.36,.95,m.cakeSponge,0,.86,0,cake);box(.99,.08,.99,m.cakeCream,0,1.06,0,cake);box(.66,.3,.66,m.cakeSponge,0,1.25,0,cake);box(.7,.07,.7,m.cakeCream,0,1.42,0,cake);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;box(.1,.1,.1,m.cherry,Math.cos(a)*.38,1.14,Math.sin(a)*.38,cake);}
  const flames=[];for(const [cx,cz] of [[-.18,-.12],[0,.14],[.18,-.12]]){box(.06,.26,.06,m.petalWhite,cx,1.58,cz,cake);flames.push(box(.07,.12,.07,m.flameCore,cx,1.77,cz,cake));}
  cake.userData.flames=flames;cake.userData.glow=glow(0,1.85,0,1.4,'#ffcf7a',.8,true,cake);cake.userData.light=lightAt(0,2,0,'#ffcf8a',0,5,cake,.15);
 }
 function candles(x,y,z){
  for(let j=0;j<3;j++){const xx=x+(j-1)*.2,h=.16+(j%2)*.16;stamp(m.pathLight,xx,y+h/2,z,.1,h,.1);stamp(m.flame,xx,y+h+.07,z,.07,.14,.07);}
 }
 function relicArch(){
  // Ruined arch fragments above the two authoritative side-ruin pillars.
  for(const side of [-1,1])for(let j=0;j<3;j++){
   const pillar=data.obstacles.find(o=>o.id===(side<0?'ruin-arch-a':'ruin-arch-b')),x=15+side*(2.8-j*.55),y=pillar.y+pillar.height+.2+j*.45;stamp(m.stoneLight,x,y,8,.8,.56,1);overhang(x,y,8,.8,.56,1);
  }
  // Fallen heraldry lies flat, so it cannot suggest a nonexistent jump surface.
  groundTile(m.mortar,15,10,2.7,1.2,.12,.025);groundTile(m.goldDark,15,10,1.6,.08,.12,.036);
 }
 function skyline(){
  // Original faceted models form the distant geology, tree line and bell
  // tower. They remain wholly outside the shared playable collision bounds.
  for(const [x,z,w,h,d,rot] of [[-38,-25,16,13,9,.4],[-36,14,12,9,12,.2],[38,-18,13,14,10,-.4],[39,20,16,11,13,.1],[-23,39,22,7,10,0],[15,43,30,9,12,.2],[-12,-47,35,13,16,.2],[29,-48,28,19,18,-.2]])art('nature-kit/rock_tallA',x,-4,z,w,h,d,rot,'distant');
  for(const [x,z,w,h,d] of [[-61,-64,46,23,27],[0,-75,55,27,28],[59,-61,48,21,28],[-62,51,40,19,25],[56,56,48,19,26]])art('nature-kit/rock_tallA',x,-4,z,w,h,d,.5,'distant');
  for(const [x,z,h] of [[-33,-7,11],[-33,23,10],[33,10,12],[33,-28,13],[-27,-39,11],[15,-43,16],[26,-43,13]])art('nature-kit/tree_pineTallA_detailed',x,H(x,z)-.4,z,h*.3,h,h*.31,.2,'distant');
  tree(22,-46,18,2,true,3.5);art('nature-kit/tree_detailed_dark',-36,-.7,4,9,12,9,.5,'distant');
  const x=-18,z=-43,y=3.5;art('castle-kit/tower-square-base-border',x,y,z,7,4.5,7,0,'distant');art('castle-kit/tower-square-mid-windows',x,y+4.5,z,6.5,8.5,6.5,0,'distant');art('castle-kit/tower-square-arch',x,y+13,z,6.5,5.8,6.5,0,'distant');art('castle-kit/tower-square-top',x,y+18.8,z,7.1,2,7.1,0,'distant');
  const bell=mesh(geometry(new T.CylinderGeometry(.7,1.2,1.5,6)),m.goldDark,x,y+15,z);bell.name='Distant silent bell';
  for(const [x,z,rot] of [[28.4,0,Math.PI/2],[28.4,6,Math.PI/2],[-28.4,-17,-Math.PI/2],[-28.4,-24,-Math.PI/2]])art('nature-kit/cliff_rock',x,H(x,z)-2.4,z,5.8,2.6,.7,rot);
 }
 function campBuild(){
  const c=data.camp;camp=localGroup('Traveller campfire',c.x,finite(c.y),c.z);
  groundPatch(m.soil,Array.from({length:14},(_,i)=>[c.x+Math.cos(i*Math.PI/7)*2.8,c.z+Math.sin(i*Math.PI/7)*2.8]),.016);
  const ash=mesh(geometry(new T.CircleGeometry(.7,10)),m.ash,0,.02,0,camp);ash.rotation.x=-Math.PI/2;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;box(.38,.23,.29,m.stoneDark,Math.sin(a)*.8,.115,Math.cos(a)*.8,camp).rotation.y=a;}
  for(const sign of [-1,1])box(1,.16,.2,m.bark,0,.15,0,camp).rotation.y=sign*.67;
  const fire=localGroup('Stepped flame',0,.18,0,camp);
  box(.27,.69,.27,m.flame,0,.35,0,fire);box(.16,.37,.17,m.flame,-.19,.21,.08,fire);box(.15,.49,.15,m.flame,.18,.3,-.06,fire);box(.12,.4,.13,m.flameCore,0,.24,.15,fire);
  const light=lightAt(0,.9,0,'#ff9d4a',7,10,camp,.22);camp.userData.fire=fire;camp.userData.light=light;camp.userData.glow=glow(0,.75,0,3.2,'#ff9a45',.7,true,camp);
  // A ground cloth and quiet boot prints establish rest without blocking spawn.
  groundTile(m.cloth,c.x-2,c.z+.2,1.1,1.8,0,.022);box(.85,.08,.3,m.barkLight,-2,H(c.x-2,c.z-.7)-c.y+.04,-.7,camp);
  for(let i=0;i<4;i++)groundTile(m.pathDark,c.x-.4+(i%2)*.3,c.z+1.3+i*.4,.13,.25,0,.024);
 }
 function shortcutBuild(){
  const c=data.shortcut,o=data.obstacles.find(p=>p.id===c.id);if(!o)return;
  gate=localGroup('Western shortcut | retracting iron bars',o.x,finite(o.y),o.z);gate.userData.baseY=finite(o.y);
  for(let i=0;i<7;i++){const x=-o.w/2+.2+i*(o.w-.4)/6;box(.12,o.height,.12,m.iron,x,o.height/2,0,gate);box(.08,.22,.18,m.goldDark,x,o.height-.12,.01,gate);}
  for(const y of [.35,2.1,3.65])box(o.w,.12,.18,m.iron,0,y,0,gate);
  // The grate retracts into the threshold when the solid is removed. No
  // unsupported floating portcullis or newly uncollidable swinging leaf remains.
  gate.userData.height=o.height;groundTile(m.iron,o.x,o.z,o.w,o.d,0,.024);
  const l=c.lever;lever=localGroup('Shortcut winch',l.x,finite(l.y),l.z);
  box(.48,.12,.48,m.stoneDark,0,.06,0,lever);box(.15,.65,.15,m.iron,0,.38,0,lever);
  const handle=localGroup('Winch handle',0,.6,0,lever);box(.08,.7,.08,m.iron,0,.32,0,handle);box(.4,.12,.16,m.gold,0,.68,0,handle);lever.userData.handle=handle;
  groundTile(m.goldDark,l.x,l.z+1.3,.2,.5,.1,.024);
 }
 function mistBuild(){
  const gateData=data.bossGate;mist=localGroup('Sealed chapel mist',gateData.x,H(gateData.x,-13),-13);
  const w=32,h=32,pixels=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4,n=noise(Math.floor(x/2),Math.floor(y/4),23),streak=(x%7<2?.2:0),edge=Math.min(x/(w*.15),(w-1-x)/(w*.15),1);
   pixels[i]=205;pixels[i+1]=193;pixels[i+2]=150;pixels[i+3]=Math.round((.23+n*.28+streak)*edge*255);
  }
  const tex=new T.DataTexture(pixels,w,h,T.RGBAFormat);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=tex.minFilter=T.NearestFilter;tex.generateMipmaps=false;tex.needsUpdate=true;textures.add(tex);
  const mat=material('#bfc0b0',true,{map:tex,transparent:true,opacity:.82,side:T.DoubleSide,depthWrite:false});
  const veil=mesh(geometry(new T.PlaneGeometry(5.8,5.8)),mat,0,2.9,0,mist);veil.name='Pixel-woven boss veil';mist.userData.veil=veil;
  const threshold=box(5.8,.025,.45,m.goldDark,0,.018,0,mist);threshold.name='Boss threshold';
 }
 function chestBuild(c){
  const g=localGroup('Relic coffer | '+c.id,c.x,finite(c.y),c.z);
  box(1.18,.56,.84,m.wood,0,.28,0,g);box(1.22,.08,.88,m.iron,0,.12,0,g);
  for(const side of [-1,1])box(.1,.57,.88,m.goldDark,side*.38,.3,0,g);
  const lid=localGroup('Coffer lid',0,.58,-.42,g);box(1.22,.2,.86,m.wood,0,.1,.43,lid);box(1.25,.07,.9,m.goldDark,0,.22,.43,lid);
  box(.17,.21,.08,m.gold,0,.49,.46,g);
  const rune=mesh(geometry(new T.OctahedronGeometry(.17)),m.glint,0,1.16,0,g);chestModels.set(c.id,{g,lid,rune});
 }
 function deathDropBuild(){
  deathDrop=localGroup('Recoverable fallen embers');deathDrop.visible=false;
  const ring=mesh(geometry(new T.RingGeometry(.36,.43,8)),m.gold,0,.025,0,deathDrop);ring.rotation.x=-Math.PI/2;
  const shard=mesh(geometry(new T.OctahedronGeometry(.2)),m.flameCore,0,.5,0,deathDrop);deathDrop.userData.shard=shard;
  for(const side of [-1,1])box(.05,.48,.05,m.flame,side*.15,.28,0,deathDrop);
 }
 function activeSolids(game){
  const wilds=game.wilds||{},engineOwns=Array.isArray(game.obstacles),items=[...(engineOwns?game.obstacles:data.obstacles)];
  // Defensive fallback also supports an initial state before engine sync.
  if(!engineOwns&&data.bossGate&&!wilds.bossDefeated&&!items.some(o=>o.id==='boss-mist'))items.push({id:'boss-mist',x:0,y:H(0,-13),z:-13,w:5.8,d:.45,height:5.8,kind:'fog'});
  for(const door of game.doors||[])if(!door.open&&door.solid&&Number.isFinite(door.w)&&Number.isFinite(door.d)&&!items.some(o=>o.id===door.id))items.push(door);
  return items.filter(o=>o.active!==false&&!o.disabled&&!(data.shortcut&&o.id===data.shortcut.id&&wilds.shortcutOpen)&&!(o.id==='boss-mist'&&wilds.bossDefeated&&!(wilds.finalEntered&&!wilds.finalDefeated)));
 }
 function syncQueries(game){
  const items=activeSolids(game),key=items.map(o=>[o.id,o.x,o.z,o.y||0,o.w,o.d,o.height||o.h||1].join(',')).join('|')+'|'+!!game.wilds?.shortcutOpen;
  if(key===solidKey)return;solidKey=key;const keep=new Set();occluders.length=0;
  for(const o of items){
   const id=o.id||[o.x,o.z,o.w,o.d].join(':'),h=finite(o.height,finite(o.h,1));let q=solidQueries.get(id);
   if(!q){q=queryBox('Solid | '+id,o.x,finite(o.y)+h/2,o.z,o.w,h,o.d);solidQueries.set(id,q);}
   q.position.set(o.x,finite(o.y)+h/2,o.z);q.scale.set(o.w,h,o.d);q.userData.solidId=id;keep.add(id);occluders.push(q);
  }
  for(const [id,q] of solidQueries)if(!keep.has(id)){queryGroup.remove(q);solidQueries.delete(id);}
  cameraOccluders.length=0;cameraOccluders.push(...occluders,...overhangQueries);
  queryGroup.updateMatrixWorld(true);
 }
 async function load(game){
  clear();data=root.HatWilds;if(!data||!root.HatTerrain||!root.HatArtAssets)throw new Error('HatTerrain, HatArtAssets and HatWilds must load before HatWildsWorld');
  unit=geometry(new T.BoxGeometry(1,1,1));queryMaterial=material('#ffffff',true,{side:T.DoubleSide});m=makePalette();
  const P=theme();scene.background=new T.Color(P.sky);scene.fog=new T.Fog(P.fog,P.fogNear||30,P.fogFar||122);
  if(data.id==='firefly-lake'){sky();ridges();terrain();lakeWorld();details();obstacleScenery();campBuild();}
  else{sky();ridges();terrain();meadow();details();obstacleScenery();chapel();relicArch();skyline();campBuild();shortcutBuild();mistBuild();}
  for(const c of game.chests||data.chests)chestBuild(c);deathDropBuild();flush();update(game,0,0);group.updateMatrixWorld(true);queryGroup.updateMatrixWorld(true);return true;
 }
 function update(game,dt,time){
  if(!data||!game)return;const w=game.wilds||{},t=finite(time),delta=Math.min(.1,Math.max(0,finite(dt))),smooth=1-Math.exp(-delta*10);
  syncQueries(game);
  if(gate){
   const open=!!w.shortcutOpen||!solidQueries.has(data.shortcut.id);gate.position.y=gate.userData.baseY+(open?-gate.userData.height-.1:0);
   lever.userData.handle.rotation.z=open?-.86:.64;
  }
  if(mist){mist.visible=solidQueries.has('boss-mist');mist.userData.veil.material.opacity=(w.bossEntered||w.finalEntered?.88:.67)+Math.sin(t*.8)*.025;}
  if(camp){const restful=game.phase==='rest',pulse=Math.sin(t*7)*.035+Math.sin(t*13.1)*.02;camp.userData.fire.scale.y=(restful?1.18:1)+pulse;camp.userData.glow.scale.setScalar(3.2*(restful?1.2:1)*(1+pulse));}
  for(const f of flickers)if(f.l!==cake?.userData.light)f.l.intensity=f.base*(1+(Math.sin(t*9+f.seed)*.6+Math.sin(t*23+f.seed*2)*.4)*f.amount);
  for(const g of glows)if(g.sprite!==camp?.userData.glow)g.sprite.material.opacity=g.base*(1+Math.sin(t*6+g.seed)*.08);
  if(skyMat)skyMat.uniforms.time.value=t;if(group.userData.waterMat)group.userData.waterMat.uniforms.time.value=t;if(gateRing){gateRing.userData.disc.uniforms.time.value=t;}if(group.userData.shaftMat)group.userData.shaftMat.uniforms.time.value=t;
  if(cake){const lit=!!w.finalDefeated&&game.phase!=='won';cake.visible=!!w.finalDefeated;for(const f of cake.userData.flames){f.visible=lit;f.scale.y=1+Math.sin(t*14+f.position.x*9)*.18;}cake.userData.glow.visible=lit;cake.userData.light.intensity=lit?3.2*(1+Math.sin(t*11)*.12):0;}
  if(altar){altar.userData.light.visible=!!w.bossDefeated;altar.userData.light.position.y=.86+Math.sin(t*1.5)*.07;altar.userData.light.rotation.y=t*.2;}
  for(const c of game.chests||[]){const r=chestModels.get(c.id);if(!r)continue;const opening=c.opened||c.revealing,target=opening?-1.85:0;r.lid.rotation.x=delta?r.lid.rotation.x+(target-r.lid.rotation.x)*smooth:target;r.rune.visible=!opening;r.rune.rotation.y=t*.25;r.g.position.set(c.x,finite(c.y),c.z);}
  const drop=w.deathDrop;if(deathDrop){deathDrop.visible=!!drop&&finite(drop.coins)>0;if(drop){deathDrop.position.set(finite(drop.x),finite(drop.y),finite(drop.z));deathDrop.userData.shard.position.y=.5+Math.sin(t*2)*.06;deathDrop.userData.shard.rotation.y=t*.6;}}
 }
 return{load,update,clear,theme,getOccluders:()=>occluders,getCameraOccluders:()=>cameraOccluders};
}
root.HatWildsWorld={create};
})(typeof globalThis!=='undefined'?globalThis:this);
