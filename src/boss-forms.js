(function(root){'use strict';
// Three deliberately different silhouettes, drawn once in a small pixel atlas.
// Animation moves a bounded rig; it never repaints a canvas or spawns particles.
function create({THREE:T,scene,camera}){
 const rigs=new Map(),textures=new Map(),plane=new T.PlaneGeometry(1,1),cameraInverse=new T.Quaternion(),look=new T.Vector3(),hitProjection=new T.Vector3();
 const kinds=['ironWarden','tideBeast','starSeer'],ink='#172331';let time=0;
 function art(key,w,h,draw){
  if(textures.has(key))return textures.get(key);
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  const rect=(x,y,rw,rh,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(rw),Math.round(rh));};
  const poly=(points,col)=>{c.fillStyle=col;const min=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1])))),max=Math.min(h,Math.ceil(Math.max(...points.map(p=>p[1]))));for(let y=min;y<max;y++){const xs=[];for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[j],b=points[i];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))xs.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)c.fillRect(Math.ceil(xs[i]),y,Math.max(1,Math.floor(xs[i+1])-Math.ceil(xs[i])),1);}};
  const ellipse=(x,y,rx,ry,col)=>{c.fillStyle=col;for(let py=Math.floor(y-ry);py<=y+ry;py++){const span=rx*Math.sqrt(Math.max(0,1-((py+.5-y)/ry)**2));if(span>0)c.fillRect(Math.ceil(x-span),py,Math.max(1,Math.floor(span*2)),1);}};
  draw({rect,poly,ellipse});const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=tex.minFilter=T.NearestFilter;tex.generateMipmaps=false;textures.set(key,tex);return tex;
 }
 function plate(r,key,w,h,x,y,z,painter,pixelW=32,pixelH=48){
  const material=new T.MeshBasicMaterial({map:art(key,pixelW,pixelH,painter),transparent:true,alphaTest:.35,depthWrite:true,side:T.DoubleSide,toneMapped:false});
  const mesh=new T.Mesh(plane,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,1);r.face.add(mesh);r.parts.push(mesh);return mesh;
 }
 function make(kind){
  const base=new T.Group(),face=new T.Group();base.add(face);scene.add(base);
  const shadow=new T.Mesh(new T.CircleGeometry(1,20),new T.MeshBasicMaterial({color:'#0b1620',transparent:true,opacity:.28,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
  const r={kind,base,face,shadow,parts:[],stride:0,lastX:null,lastZ:null};
  if(kind==='ironWarden')warden(r);else if(kind==='tideBeast')tide(r);else seer(r);
  const bar=new T.Mesh(plane,new T.MeshBasicMaterial({color:'#c9b593',transparent:true,opacity:.82,depthWrite:false,toneMapped:false}));bar.position.set(0,kind==='tideBeast'?3.6:5.25,.14);bar.scale.set(1,.055,1);face.add(bar);r.bar=bar;
  const status=new T.Mesh(new T.OctahedronGeometry(.13,0),new T.MeshBasicMaterial({color:'#bfd5cf',toneMapped:false}));status.position.set(0,bar.position.y+.22,.16);face.add(status);r.status=status;return r;
 }
 function warden(r){
  r.cape=plate(r,'warden-cape',3.4,3.4,-.2,1.95,-.07,({poly,rect})=>{poly([[5,3],[28,2],[31,40],[24,45],[16,40],[5,46],[1,35]],ink);poly([[7,4],[25,4],[28,37],[23,41],[16,36],[7,42],[4,33]],'#733e4c');rect(9,9,3,26,'#9b5059');rect(20,8,3,28,'#562e40');});
  const boot=({poly,rect})=>{poly([[4,0],[14,0],[16,20],[20,22],[20,27],[2,27],[2,20]],ink);rect(5,1,9,15,'#576575');rect(6,2,3,12,'#91a1ac');rect(4,17,12,5,'#394451');rect(3,23,15,2,'#778794');};
  r.legA=plate(r,'warden-leg',1.3,1.7,-.63,.8,0,boot,22,28);r.legB=plate(r,'warden-leg',1.3,1.7,.58,.8,.005,boot,22,28);
  r.body=plate(r,'warden-body',3.55,3.85,0,2.91,.025,({rect,poly})=>{
   poly([[11,27],[4,28],[0,37],[5,44],[10,43],[10,60],[35,60],[37,43],[43,44],[48,35],[41,27],[35,25],[35,10],[28,2],[16,2],[10,10]],ink);
   poly([[15,3],[28,3],[33,11],[32,26],[12,26],[11,11]],'#7e8c99');rect(15,6,12,3,'#c3cbd1');rect(11,13,22,9,'#323d4b');rect(14,16,16,3,'#101c28');rect(18,17,10,1,'#c79873');rect(22,10,4,18,'#b1b6b3');
   poly([[9,2],[13,5],[13,14],[7,11],[4,3]],'#a6b3be');poly([[33,4],[38,1],[38,11],[32,15]],'#a6b3be');
   poly([[10,30],[18,27],[28,27],[36,31],[33,48],[12,48]],'#667889');rect(15,31,16,3,'#a5b0b8');poly([[22,34],[28,40],[23,46],[17,40]],'#b59a68');rect(22,36,2,7,'#e2c68d');
   poly([[5,30],[12,31],[10,40],[4,40],[2,36]],'#a8afb4');poly([[35,30],[42,30],[45,36],[40,41],[34,39]],'#87939c');rect(13,50,20,4,'#b18e61');rect(16,55,14,4,'#303e50');
  },48,64);
  r.shield=plate(r,'warden-shield',1.8,2.7,-1.43,2.1,.09,({poly,rect})=>{
   poly([[1,2],[12,0],[23,3],[23,25],[13,38],[2,28]],ink);poly([[3,4],[12,2],[21,5],[20,25],[13,34],[5,26]],'#ac936b');poly([[6,7],[12,5],[18,7],[17,24],[12,29],[8,23]],'#435567');rect(10,9,3,14,'#d5bd86');rect(8,14,8,3,'#d5bd86');rect(3,8,2,16,'#d9c69c');
  },24,38);
  r.sword=plate(r,'warden-sword',.9,3.9,1.67,2.4,.065,({poly,rect})=>{
   poly([[6,0],[10,7],[10,40],[15,40],[15,44],[10,44],[10,57],[5,57],[5,44],[0,44],[0,40],[5,40],[4,7]],ink);poly([[6,2],[8,8],[8,39],[5,39],[5,8]],'#d4d8ce');rect(7,9,2,29,'#8b9da9');rect(1,41,13,2,'#c1a46d');rect(6,45,2,10,'#825343');
  },16,58);
 }
 function tide(r){
  r.tail=plate(r,'tide-tail',2.7,1.9,-2.6,1.3,-.025,({poly,rect})=>{poly([[31,8],[17,12],[3,0],[5,13],[0,22],[16,19],[31,25]],ink);poly([[30,11],[16,14],[6,4],[8,15],[4,20],[17,16],[30,22]],'#48818b');rect(16,14,13,3,'#9abbb7');},32,26);
  const fin=({poly,rect})=>{poly([[3,0],[19,2],[27,18],[22,23],[2,23],[0,17]],ink);poly([[5,2],[17,4],[22,16],[19,19],[3,19]],'#567b7f');rect(4,18,17,3,'#aec3b1');rect(8,7,3,9,'#85a39a');};
  r.finA=plate(r,'tide-fin',1.8,1.25,-1.2,.5,.045,fin,28,24);r.finB=plate(r,'tide-fin',1.8,1.25,1.35,.5,.05,fin,28,24);
  r.body=plate(r,'tide-body',6,3.2,-.2,1.9,0,({ellipse,poly,rect})=>{
   poly([[12,25],[16,9],[24,12],[30,1],[39,7],[48,0],[56,7],[68,4],[72,16],[82,20],[87,36],[77,44],[17,45],[7,37]],ink);
   ellipse(45,29,37,17,'#3b5d69');ellipse(44,26,32,16,'#607c7e');
   poly([[19,12],[24,15],[28,7],[31,15],[42,7],[46,13],[57,9],[61,17],[70,12],[73,25],[16,28]],'#abc0ad');
   poly([[17,27],[24,18],[38,14],[49,18],[50,31],[39,39],[22,37]],'#5e777b');poly([[51,18],[64,17],[75,25],[76,35],[59,41],[50,32]],'#405d6b');
   rect(23,25,16,2,'#91a79b');rect(30,18,2,18,'#91a79b');rect(52,24,19,2,'#82998f');rect(61,19,2,15,'#82998f');
   poly([[11,35],[24,39],[61,41],[79,34],[76,42],[62,46],[24,44],[13,41]],'#b1b79a');rect(26,42,28,2,'#7f917e');
  },90,48);
  r.head=plate(r,'tide-head',2.3,2.15,2.1,1.35,.08,({poly,rect})=>{
   poly([[3,7],[11,1],[20,6],[25,6],[32,14],[32,24],[26,30],[8,29],[0,21]],ink);poly([[5,9],[12,5],[22,10],[27,11],[29,19],[24,25],[9,25],[3,19]],'#6b9695');poly([[11,4],[16,0],[19,9],[11,13],[4,12]],'#a7bfaa');rect(18,12,10,6,'#233a49');rect(21,13,5,2,'#e5bf78');rect(25,20,6,3,'#223542');rect(26,22,3,4,'#d0d1ac');rect(10,21,10,2,'#a3bcb1');
  },34,32);
 }
 function seer(r){
  r.halo=plate(r,'seer-halo',2.7,2.7,0,4.06,-.06,({poly})=>{poly([[10,1],[21,1],[30,10],[30,21],[21,30],[10,30],[1,21],[1,10]],'#8b856f');poly([[11,3],[20,3],[28,11],[28,20],[20,28],[11,28],[3,20],[3,11]],ink);poly([[11,5],[20,5],[26,11],[26,20],[20,26],[11,26],[5,20],[5,11]],'#000000');},32,32);
  // Punch out the halo centre once so the scenery remains visible through it.
  const haloCanvas=r.halo.material.map.image,haloCtx=haloCanvas.getContext('2d');haloCtx.clearRect(7,7,18,18);r.halo.material.map.needsUpdate=true;
  const cloth=({poly,rect})=>{poly([[4,0],[16,1],[20,32],[13,40],[10,31],[1,36]],ink);poly([[6,2],[14,3],[17,29],[13,34],[10,26],[4,30]],'#595873');rect(7,9,2,18,'#9b8b9a');};
  r.clothA=plate(r,'seer-cloth',1.35,2.6,-.57,1.45,0,cloth,22,42);r.clothB=plate(r,'seer-cloth',1.35,2.6,.58,1.45,.005,cloth,22,42);
  r.body=plate(r,'seer-body',3.2,4.25,0,3.05,.035,({poly,rect})=>{
   poly([[24,0],[33,6],[38,22],[34,30],[44,37],[43,48],[35,51],[33,61],[14,61],[12,51],[4,49],[3,37],[13,29],[10,22],[15,7]],ink);
   poly([[24,3],[31,9],[34,23],[30,29],[17,29],[13,22],[18,10]],'#706b87');poly([[24,9],[30,18],[29,27],[18,27],[16,20]],'#252f45');poly([[24,14],[27,20],[24,24],[21,20]],'#d4ca9c');rect(20,19,2,1,'#e6e4c6');rect(27,19,2,1,'#e6e4c6');
   poly([[15,30],[23,34],[33,30],[39,37],[34,54],[24,61],[13,54],[9,37]],'#514c6b');poly([[14,32],[21,38],[24,57],[16,51]],'#8d8094');poly([[33,32],[27,39],[25,57],[33,51]],'#6e647f');rect(23,37,2,14,'#bea47d');
   poly([[7,36],[11,37],[12,47],[5,46]],'#b3acaa');poly([[38,36],[41,37],[41,46],[36,47]],'#b3acaa');rect(18,53,13,2,'#a99781');
  },48,64);
  r.staff=plate(r,'seer-staff',.8,4.3,1.6,2.6,.07,({rect,poly})=>{rect(6,11,3,51,ink);rect(7,13,1,47,'#ab9675');poly([[7,0],[14,7],[7,17],[0,7]],ink);poly([[7,2],[11,7],[7,13],[3,7]],'#aebac0');rect(6,5,3,5,'#ded4a5');},15,64);
  r.shards=[];
  for(let i=0;i<3;i++)r.shards.push(plate(r,'seer-shard',.58,1.15,0,3,0,({poly,rect})=>{poly([[6,0],[11,10],[8,22],[3,22],[0,10]],ink);poly([[6,2],[9,10],[7,19],[4,19],[2,10]],'#a6b9be');poly([[6,3],[6,19],[4,16],[3,10]],'#e0d8b7');rect(5,10,2,3,'#757e9c');},12,24));
 }
 function update(game,dt){
  time+=Math.max(0,dt||0);cameraInverse.copy(camera.quaternion).invert();
  for(const e of game.enemies){
   if(e.type!=='boss'||e.bossKind==='sweetheart'||root.HatPixelWarden&&(e.bossKind||'ironWarden')==='ironWarden')continue;const kind=e.bossKind||kinds[game.levelIndex||0];let r=rigs.get(e.id);
   if(r&&r.kind!==kind){disposeRig(r);rigs.delete(e.id);r=null;}
   if(!r){r=make(kind);rigs.set(e.id,r);}
   const age=e.deadAge||0,alive=!e.dead||age<.38,spawn=e.state==='spawning'?Math.max(0,Math.min(1,1-e.spawnRemaining/Math.max(.01,e.spawnDuration))):1;
   r.base.visible=e.spawned!==false&&alive;r.shadow.visible=e.spawned!==false&&!e.dead;if(!r.base.visible)continue;
   if(r.lastX!==null){const travel=Math.hypot(e.x-r.lastX,e.z-r.lastZ);if(travel<2)r.stride+=travel;}r.lastX=e.x;r.lastZ=e.z;
   look.set(e.dirX??e.facing??1,0,e.dirZ||0).applyQuaternion(cameraInverse);if(Math.abs(look.x)>.02)r.facing=Math.sign(look.x);const facing=r.facing||1;
   r.base.position.set(e.x,e.y,e.z);r.face.quaternion.copy(camera.quaternion);r.face.scale.set(facing,1,1);
   r.shadow.position.set(e.x,root.HatTerrain.heightAt(e.x,e.z)+.035,e.z);r.shadow.scale.set(kind==='tideBeast'?2.1:kind==='starSeer'?.75:1.05,kind==='tideBeast'?1.05:.65,1);
   const wind=e.state==='windup',charge=e.state==='charge',t=wind?Math.max(0,Math.min(1,1-e.timer/Math.max(.01,e.windupDuration))):0;
   const attack=e.attackTimer>0?Math.sin(Math.min(1,e.attackTimer/.25)*Math.PI):0,walk=Math.hypot(e.vx||0,e.vz||0)>.1;
   const bob=walk?Math.sin(r.stride*5.5)*.045:Math.sin(time*2)*.018;r.body.rotation.z=0;
   if(kind==='ironWarden'){
    r.body.position.y=2.91+bob-(wind?.12*t:0);r.body.rotation.z=charge?-.12:wind?.035*t:0;
    r.legA.position.y=.8+(walk?Math.sin(r.stride*5)*.1:0);r.legB.position.y=.8-(walk?Math.sin(r.stride*5)*.1:0);
    r.legA.rotation.z=walk?Math.sin(r.stride*5)*.12:0;r.legB.rotation.z=-r.legA.rotation.z;
    r.cape.rotation.z=(charge?.15:0)+Math.sin(time*2.2)*.025;r.cape.position.y=1.95+bob;
    r.shield.position.x=charge?-.8:-1.43;r.shield.position.y=2.1+bob+(wind&&e.attackKind==='charge'?.24*t:0);r.shield.rotation.z=charge?-.12:wind?.06*t:0;
    r.sword.rotation.z=e.attackKind==='slash'?(wind?-.8*t:attack*1.2):charge?.35:.06;r.sword.position.y=2.4+bob;
   }else if(kind==='tideBeast'){
    const breath=Math.sin(time*1.8)*.035,lower=wind&&e.attackKind==='tideSplash'?.18*t:0;
    r.body.position.y=1.9+breath-lower;r.body.rotation.z=walk?Math.sin(r.stride*3)*.025:0;
    r.head.position.x=2.1+(wind?.14*t:attack*.27);r.head.position.y=1.35+breath-lower;r.head.rotation.z=wind?-.07*t:attack*.08;
    r.tail.rotation.z=Math.sin(time*1.6)*.11;r.finA.rotation.z=Math.sin((walk?r.stride*4:time*1.5))*.1;r.finB.rotation.z=-r.finA.rotation.z;
   }else{
    const float=Math.sin(time*1.8)*.1;r.body.position.y=3.05+float;r.staff.position.y=2.6+float;r.staff.rotation.z=wind?-.1*t:0;
    r.clothA.position.y=1.45+float;r.clothB.position.y=1.45+float;r.clothA.rotation.z=-.04+Math.sin(time*1.8)*.055;r.clothB.rotation.z=.04-Math.sin(time*1.8)*.055;
    r.halo.position.y=4.06+float;r.halo.rotation.z=Math.sin(time*.35)*.12;
    for(let i=0;i<3;i++){const angle=time*.55+i*Math.PI*2/3,shard=r.shards[i];shard.position.set(Math.cos(angle)*2.15,2.95+Math.sin(angle)*.5+float,Math.sin(angle)*.12);shard.rotation.z=-Math.cos(angle)*.2;}
   }
   const opacity=spawn*(e.dead?Math.max(0,1-age/.38):1);
   for(const mesh of r.parts){mesh.material.opacity=opacity;mesh.material.color.set(e.parryStaggerTimer>0?'#c2d2d1':e.hitFlash>.1?'#e9cbbb':'#ffffff');}
   r.face.position.set(0,e.dead?-age*1.5:0,0);r.face.scale.y=e.dead?Math.max(.2,1-age*1.9):.95+spawn*.05;
   if(!e.dead&&(e.hitReactionTimer>0||e.parryStaggerTimer>0)){
    // The rig recoils around its planted base; world collision position and
    // movement remain entirely owned by the engine. Direction is independent
    // of which way this billboard happened to be facing when struck.
    const life=Math.max(0,Math.min(1,(e.hitReactionTimer||0)/Math.max(.01,e.hitReactionDuration||.24))),kick=life*life*Math.min(1.3,e.hitReactionStrength||.5),stagger=Math.max(0,Math.min(1,(e.parryStaggerTimer||0)/.5)),held=Math.min(1,stagger*2);
    hitProjection.set(e.hitDirX||0,0,e.hitDirZ||0).applyQuaternion(cameraInverse);
    r.face.rotateZ(-hitProjection.x*(.14*kick+.12*held));r.face.scale.y-=.035*kick+.05*held;
    r.face.position.x=(e.hitDirX||0)*.07*kick;r.face.position.z=(e.hitDirZ||0)*.07*kick;
    r.body.rotation.z-=facing*hitProjection.x*.055*kick;r.body.position.y-=.12*held;
    if(kind==='ironWarden'){r.sword.rotation.z+=.52*kick+.92*held;r.sword.position.y-=.36*held;r.shield.position.y-=.18*held;r.cape.rotation.z+=.12*held;}
    else if(kind==='tideBeast'){r.head.rotation.z+=.16*kick+.10*held;r.head.position.y-=.12*held;r.tail.rotation.z-=.12*kick;}
    else{r.staff.rotation.z+=.24*kick+.35*held;r.staff.position.y-=.25*held;r.halo.rotation.z-=.10*kick;}
   }
   r.bar.visible=!e.dead&&e.state!=='spawning'&&(wind||e.exposed);r.bar.material.color.set(e.exposed?'#9ebeb0':e.harmless?'#a8bcc3':'#c9b593');
   r.bar.scale.x=Math.max(.03,wind?t:e.timer/Math.max(.01,e.recoveryDuration||1));
   const status=e.statuses||{};r.status.visible=!e.dead&&Object.values(status).some(v=>(typeof v==='number'?v:v?.expiresAt)>game.time);r.status.rotation.z=time*.5;
  }
 }
 function emit(e){if(e.type==='bossRelocate'){const r=rigs.get(e.targetId);if(r){r.lastX=e.to?.x??null;r.lastZ=e.to?.z??null;}}}
 function disposeRig(r){scene.remove(r.base,r.shadow);for(const mesh of r.parts)mesh.material.dispose();r.bar.material.dispose();r.status.geometry.dispose();r.status.material.dispose();r.shadow.geometry.dispose();r.shadow.material.dispose();}
 function reset(){for(const r of rigs.values())disposeRig(r);rigs.clear();time=0;}
 function dispose(){reset();for(const tex of textures.values())tex.dispose();textures.clear();plane.dispose();}
 return{update,emit,reset,dispose};
}
root.HatBossForms={create};
})(typeof window!=='undefined'?window:globalThis);
