(function(root){
'use strict';

// View-only layer: simulation owns hits, locked attack shapes and both clocks.
function create({THREE:T,scene,camera:cameraView,reduced=true,getBladeSegment=null,getEnemyBladeSegments=null}){
 const group=new T.Group();group.name='Battle contact FX';scene.add(group);
 const C={mint:0x83b9ab,ice:0xa9c2cd,purple:0x9e94b9,gold:0xc7a968,red:0xc87a68,blue:0x629fb5,steel:0xb2b9be,wood:0x79543c,feather:0xcbbf9e,fire:0xba683c,ember:0xdb9a50,goo:0x86a15d,dust:0x9e9587,blade:0xd7ddc3,clang:0xd5b575,break:0x807767,danger:0xb44f36};
 const UP=new T.Vector3(0,1,0),AXIS=new T.Vector3(1,0,0),dummy=new T.Object3D(),tmp=new T.Vector3(),color=new T.Color(),flight=new T.Vector3(),flightQ=new T.Quaternion();
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(n,f=0)=>Number.isFinite(n)?n:f;
 const point=(p,f={})=>({x:finite(p?.x,finite(f.x)),y:finite(p?.y,finite(f.y)),z:finite(p?.z,finite(f.z))});
 function groundAt(x,z,maxHeight=Infinity){let y=root.HatTerrain.heightAt(x,z);for(const o of lastGame?.obstacles||[]){const top=finite(o.y)+o.height;if(o.walkable&&top<=maxHeight+.12&&Math.abs(x-o.x)<=o.w/2&&Math.abs(z-o.z)<=o.d/2)y=Math.max(y,top);}return y;}
 const direction=(e,p={})=>{const x=finite(e.dirX,finite(e.attackDirX,finite(p.dirX,1))),z=finite(e.dirZ,finite(e.attackDirZ,finite(p.dirZ))),l=Math.hypot(x,z)||1;return{x:x/l,z:z/l};};
 const seen=new Set(),seenOrder=[];let time=0,serial=0,lastGame=null;
 // Normal alpha blending cannot accumulate into white. Physical weapons write depth.
 function mat(tint,opacity=1,solid=false){return new T.MeshBasicMaterial({color:tint,opacity,transparent:!solid,depthWrite:solid,depthTest:true,side:T.DoubleSide,toneMapped:true,blending:T.NormalBlending});}
 function band(from,to,width=.035,segments=18){const ps=[],ix=[];for(let i=0;i<=segments;i++){const t=i/segments,a=from+(to-from)*t,w=width*(.2+.8*Math.sin(t*Math.PI));for(const s of [-1,1]){const r=1+s*w;ps.push(Math.cos(a)*r,0,Math.sin(a)*r);}if(i<segments){const k=i*2;ix.push(k,k+1,k+2,k+1,k+3,k+2);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setIndex(ix);return g;}
 function polygon(points){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new T.ShapeGeometry(s);}
 function combine(parts){const positions=[];for(const part of parts){const g=part.index?part.toNonIndexed():part;positions.push(...g.attributes.position.array);if(g!==part)g.dispose();part.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));return g;}
 const arrowTip=combine([polygon([[.67,0],[.31,.13],[.37,0],[.31,-.13]]).rotateX(Math.PI/2),polygon([[.67,0],[.31,.1],[.37,0],[.31,-.1]])]);
 const arrowFeathers=combine([0,Math.PI*2/3,Math.PI*4/3].map(a=>polygon([[-.64,0],[-.57,.15],[-.32,.15],[-.39,0]]).rotateX(a)));
 const geo={box:new T.BoxGeometry(1,1,1),plane:new T.PlaneGeometry(1,1),diamond:new T.OctahedronGeometry(1,0),
  ring:new T.RingGeometry(.97,1,32).rotateX(-Math.PI/2),contactRing:new T.RingGeometry(.87,1,24),star:polygon([[0,.5],[.09,.12],[.5,0],[.09,-.12],[0,-.5],[-.09,-.12],[-.5,0],[-.09,.12]]),arc:band(-.82,.82,.038),edge:band(-.82,.82,.012),crescent:band(-1.3,1.3,.11,20),
  shaft:new T.CylinderGeometry(.031,.035,1.01,6).rotateZ(-Math.PI/2).translate(-.145,0,0),arrowTip,arrowFeathers,
  orb:new T.IcosahedronGeometry(1,0),flame:new T.ConeGeometry(.20,.82,5).rotateZ(Math.PI/2).translate(-.3,0,0),
  drop:new T.LatheGeometry([new T.Vector2(0,-.65),new T.Vector2(.035,-.43),new T.Vector2(.15,-.16),new T.Vector2(.23,.06),new T.Vector2(.18,.23),new T.Vector2(0,.32)],8).rotateZ(-Math.PI/2)};

 // At most three non-additive surfaces per transient; no parallel particle engine.
 const rigs=Array.from({length:18},()=>{const g=new T.Group(),materials=[mat(C.mint,.6),mat(C.ice,.45),mat(C.dust,.35)],meshes=materials.map(m=>{const mesh=new T.Mesh(geo.arc,m);g.add(mesh);return mesh;});g.visible=false;group.add(g);return{g,materials,meshes,alpha:[.58,.36,.28],active:false,age:0,life:1,serial:0};});
 function shape(r,i,g,sx=1,sy=sx,sz=sx,x=0,y=0,z=0){const m=r.meshes[i];m.geometry=g;m.visible=true;m.position.set(x,y,z);m.rotation.set(0,0,0);m.scale.set(sx,sy,sz);return m;}
 function alloc(kind,e,life,tint=C.mint){const r=rigs.find(v=>!v.active)||rigs.reduce((a,b)=>a.serial<b.serial?a:b),p=point(e,lastGame?.player);Object.assign(r,{kind,active:true,age:0,life:Math.max(.04,life),serial:++serial,p,dir:direction(e,lastGame?.player),radius:finite(e.radius,finite(e.range,1)),delay:Math.max(0,finite(e.delay))});r.g.name='Contact FX | '+kind;r.g.visible=!r.delay;r.g.position.set(p.x,p.y,p.z);r.g.rotation.set(0,0,0);r.g.scale.setScalar(1);for(let i=0;i<3;i++){r.materials[i].color.set(i===1?C.ice:tint);r.alpha[i]=i===0?.58:i===1?.36:.28;r.materials[i].opacity=r.alpha[i];r.meshes[i].visible=false;}return r;}
 function orient(r){r.g.rotation.y=-Math.atan2(r.dir.z,r.dir.x);}
 function groundRing(e,tint=C.mint,life=.28,kind='ring'){const r=alloc(kind,e,life,tint),floor=groundAt(r.p.x,r.p.z,r.p.y);r.g.position.y=floor+.055;if(Math.abs(floor-root.HatTerrain.heightAt(r.p.x,r.p.z))<.02){const n=root.HatTerrain.normalAt(r.p.x,r.p.z);tmp.set(n.x,n.y,n.z);r.g.quaternion.setFromUnitVectors(UP,tmp);}shape(r,0,geo.ring,r.radius,1,r.radius);return r;}

 // Four bounded ribbons follow the physical sword. The wide low-opacity layer
 // reads as a soft glow without bloom or additive overlap washing out the scene.
 const BLADE_CAP=22,bladeHistory=Array.from({length:BLADE_CAP},()=>({base:new T.Vector3(),tip:new T.Vector3(),at:0}));
 const bladeLayers=[{from:.24,to:1.065,alpha:.12,tint:0xbce9cf},{from:.37,to:1.025,alpha:.38,tint:0xa7dcc4},{from:.76,to:1.025,alpha:.7,tint:0xd4ede3},{from:.94,to:1.035,alpha:.96,tint:0xfff5d9}].map((layer,i)=>{
  const positions=new Float32Array((BLADE_CAP-1)*18),geometry=new T.BufferGeometry(),attribute=new T.BufferAttribute(positions,3);attribute.setUsage(T.DynamicDrawUsage);geometry.setAttribute('position',attribute);geometry.setDrawRange(0,0);
  const mesh=new T.Mesh(geometry,mat(layer.tint,layer.alpha));mesh.name='Player blade trail | '+i;mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=i+1;group.add(mesh);return{...layer,mesh,positions,geometry,attribute};
 });
 let bladeCount=0,bladeStart=0,bladeAttackId=null,bladeClock=0,bladeLife=.12,bladeHeavy=false,bladeCounter=false,bladeWasFrozen=false;
 const previousBlade={base:new T.Vector3(),tip:new T.Vector3(),attackId:null,at:0,valid:false};
 const tipGlint=new T.Group(),tipHalo=new T.Mesh(geo.star,mat(C.gold,.2)),tipCore=new T.Mesh(geo.star,mat(0xfff5d9,.85));tipGlint.name='Sword windup glint';tipHalo.scale.setScalar(1.7);tipCore.position.z=.002;tipGlint.add(tipHalo,tipCore);group.add(tipGlint);tipGlint.visible=false;
 function clearBlade(){bladeCount=bladeStart=0;bladeAttackId=null;bladeWasFrozen=false;previousBlade.valid=false;tipGlint.visible=false;for(const l of bladeLayers){l.mesh.visible=false;l.geometry.setDrawRange(0,0);}}
 function updateTipGlint(p,blade){
  const spec=root.HatGame?.ATTACKS?.[clamp((p.combo||1)-1,0,2)],progress=clamp(finite(p.attackElapsed)/Math.max(.01,finite(spec?.windup,.11)),0,1);
  tipGlint.visible=!!(blade?.visible&&blade.tip&&p.attackPhase==='windup'&&progress>.3);if(!tipGlint.visible)return;
  const pulse=reduced?.55:Math.sin(clamp((progress-.3)/.7,0,1)*Math.PI),size=(reduced?.14:p.attackCounter?.35:p.combo>=3?.3:.24)*(.45+.55*pulse);
  tipGlint.position.copy(blade.tip);tipGlint.quaternion.copy(cameraView.quaternion);tipGlint.scale.setScalar(size);tipCore.material.opacity=(reduced?.55:.9)*pulse;tipHalo.visible=!reduced;tipHalo.material.opacity=.18*pulse;
 }
 function bladeVertex(array,k,s,f){array[k]=s.base.x+(s.tip.x-s.base.x)*f;array[k+1]=s.base.y+(s.tip.y-s.base.y)*f;array[k+2]=s.base.z+(s.tip.z-s.base.z)*f;return k+3;}
 function rebuildBlade(){for(let layerIndex=0;layerIndex<bladeLayers.length;layerIndex++){
  const l=bladeLayers[layerIndex];let k=0;
  for(let i=1;i<bladeCount;i++){
   const a=bladeHistory[(bladeStart+i-1)%BLADE_CAP],b=bladeHistory[(bladeStart+i)%BLADE_CAP],fadeA=clamp(1-(bladeClock-a.at)/bladeLife,0,1),fadeB=clamp(1-(bladeClock-b.at)/bladeLife,0,1);
   // A narrowing tail keeps the bright edge crisp at the low render resolution.
   const width=(bladeHeavy?1:.9)*(reduced?.72:1),fa=l.to-(l.to-l.from)*fadeA*width,fb=l.to-(l.to-l.from)*fadeB*width;
   k=bladeVertex(l.positions,k,a,fa);k=bladeVertex(l.positions,k,a,l.to);k=bladeVertex(l.positions,k,b,fb);
   k=bladeVertex(l.positions,k,a,l.to);k=bladeVertex(l.positions,k,b,l.to);k=bladeVertex(l.positions,k,b,fb);
  }
  l.geometry.setDrawRange(0,k/3);l.attribute.needsUpdate=true;l.mesh.visible=k>0&&(!reduced||layerIndex>0);
  const newest=bladeCount?bladeHistory[(bladeStart+bladeCount-1)%BLADE_CAP]:null,fade=newest?clamp(1-(bladeClock-newest.at)/bladeLife,0,1):0;
  l.mesh.material.opacity=l.alpha*fade*(reduced?.8:1);l.mesh.material.color.set(layerIndex===3?0xfff5d9:bladeCounter?0xffd88f:bladeHeavy?0xe8c787:l.tint);
 }}
 function appendBladeSample(blade,at){
  if(bladeCount===BLADE_CAP){bladeStart=(bladeStart+1)%BLADE_CAP;bladeCount--;}
  const sample=bladeHistory[(bladeStart+bladeCount++)%BLADE_CAP];sample.base.copy(blade.base);sample.tip.copy(blade.tip);sample.at=at;
 }
 function updateBlade(game,dt){const p=game.player;
  if(game.phase==='paused')return;
  if(game.phase!=='play'||p.dead||p.hp<=0||p.weaponMode==='bow'||p.guardActive||p.guardBreakTimer>0||p.hurtTimer>0||p.dash?.active){clearBlade();return;}
  const blade=typeof getBladeSegment==='function'?getBladeSegment():null;
  if(blade?.visible===false){clearBlade();return;}
  if(blade&&bladeAttackId!==blade.attackId){clearBlade();bladeAttackId=blade.attackId;}
  updateTipGlint(p,blade);
  // A slow frame can contain both the hit and the first frozen simulation step.
  // Sample that newly arrived contact pose once, without advancing the ribbon
  // clock. Subsequent frozen frames neither age nor duplicate its samples.
  const frozen=!!game.impactFrozen;if(frozen&&bladeWasFrozen||!frozen&&dt<=0)return;
  bladeWasFrozen=frozen;if(!frozen)bladeClock+=dt;
  while(bladeCount&&bladeClock-bladeHistory[bladeStart].at>bladeLife){bladeStart=(bladeStart+1)%BLADE_CAP;bladeCount--;}
  if(blade?.active&&blade.base&&blade.tip){
   bladeHeavy=blade.combo>=3||blade.jumpAttack;bladeCounter=!!blade.counter;bladeLife=reduced?((bladeHeavy||bladeCounter)?.09:.075):bladeCounter?.16:bladeHeavy?.15:blade.combo===2?.14:.12;
   // Cache real windup poses but never draw them until the damaging phase. This
   // supplies the start of a sweep even when its first visible frame is a hit.
   if(!bladeCount&&previousBlade.valid&&previousBlade.attackId===blade.attackId&&bladeClock-previousBlade.at<=.08){
    const moved=previousBlade.tip.distanceToSquared(blade.tip)+previousBlade.base.distanceToSquared(blade.base);if(moved>.00035&&moved<25)appendBladeSample(previousBlade,previousBlade.at);
   }
   const last=bladeCount?bladeHistory[(bladeStart+bladeCount-1)%BLADE_CAP]:null;
   if(!last||(frozen||bladeClock-last.at>=.008)&&last.tip.distanceToSquared(blade.tip)+last.base.distanceToSquared(blade.base)>.00035)appendBladeSample(blade,bladeClock);
  }
  rebuildBlade();
  previousBlade.valid=!!(blade?.visible&&blade.base&&blade.tip&&(p.attackPhase==='windup'||p.attackPhase==='active'));
  if(previousBlade.valid){previousBlade.base.copy(blade.base);previousBlade.tip.copy(blade.tip);previousBlade.attackId=blade.attackId;previousBlade.at=bladeClock;}
 }

 // A short, narrow ribbon follows each actual enemy sword. Four bounded
 // buffers cover simultaneous commitments; no generic circular attack sheet.
 const ENEMY_SAMPLES=8,enemyTrails=Array.from({length:4},()=>{
  const positions=new Float32Array((ENEMY_SAMPLES-1)*18),geometry=new T.BufferGeometry(),attribute=new T.BufferAttribute(positions,3);attribute.setUsage(T.DynamicDrawUsage);geometry.setAttribute('position',attribute);geometry.setDrawRange(0,0);
  const mesh=new T.Mesh(geometry,mat(C.steel,.42));mesh.frustumCulled=false;mesh.visible=false;group.add(mesh);
  return{mesh,geometry,attribute,positions,id:null,attackId:0,count:0,start:0,clock:0,history:Array.from({length:ENEMY_SAMPLES},()=>({base:new T.Vector3(),tip:new T.Vector3(),at:0}))};
 });
 function clearEnemyTrail(r){r.id=null;r.count=r.start=0;r.mesh.visible=false;r.geometry.setDrawRange(0,0);}
 function updateEnemyBlades(game,dt){
  const blades=typeof getEnemyBladeSegments==='function'?getEnemyBladeSegments():[];
  if(game.phase!=='play'){for(const r of enemyTrails)clearEnemyTrail(r);return;}
  for(const r of enemyTrails){const b=blades.find(v=>v.entityId===r.id);if(r.id&&(!b||!b.visible||b.attackId!==r.attackId))clearEnemyTrail(r);}
  if(game.impactFrozen||dt<=0)return;
  for(const b of blades){if(!b.visible||!b.active||!b.entityId)continue;let r=enemyTrails.find(v=>v.id===b.entityId);if(!r){r=enemyTrails.find(v=>v.id===null);if(!r)continue;r.id=b.entityId;r.attackId=b.attackId;r.clock=0;r.count=r.start=0;}}
  for(const r of enemyTrails){if(r.id===null)continue;r.clock+=dt;const b=blades.find(v=>v.entityId===r.id),life=reduced?.055:.08;
   while(r.count&&r.clock-r.history[r.start].at>life){r.start=(r.start+1)%ENEMY_SAMPLES;r.count--;}
   if(b?.active){const last=r.count?r.history[(r.start+r.count-1)%ENEMY_SAMPLES]:null;if(!last||last.tip.distanceToSquared(b.tip)+last.base.distanceToSquared(b.base)>.00025){if(r.count===ENEMY_SAMPLES){r.start=(r.start+1)%ENEMY_SAMPLES;r.count--;}const q=r.history[(r.start+r.count++)%ENEMY_SAMPLES];q.base.copy(b.base);q.tip.copy(b.tip);q.at=r.clock;}}
   let k=0;for(let i=1;i<r.count;i++){const a=r.history[(r.start+i-1)%ENEMY_SAMPLES],q=r.history[(r.start+i)%ENEMY_SAMPLES],fa=.99-.2*clamp(1-(r.clock-a.at)/life,0,1),fb=.99-.2*clamp(1-(r.clock-q.at)/life,0,1);k=bladeVertex(r.positions,k,a,fa);k=bladeVertex(r.positions,k,a,.99);k=bladeVertex(r.positions,k,q,fb);k=bladeVertex(r.positions,k,a,.99);k=bladeVertex(r.positions,k,q,.99);k=bladeVertex(r.positions,k,q,fb);}
   r.geometry.setDrawRange(0,k/3);r.attribute.needsUpdate=true;r.mesh.visible=k>0;r.mesh.material.color.set(b?.tint??(b?.kind==='thrust'?C.steel:C.clang));
   if(!r.count&&!b?.active)clearEnemyTrail(r);
  }
 }
 const SPARK_CAP=reduced?48:120,sparks=[];
 function instanced(g,cap,material){const mesh=new T.InstancedMesh(g,material,cap);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.count=0;mesh.frustumCulled=false;group.add(mesh);return mesh;}
 const sparkMesh=instanced(geo.box,SPARK_CAP,mat(0xffffff,1,true));sparkMesh.name='Contact sparks';
 function dirty(m,count){if(count===0&&m.count===0)return;m.count=count;if(count){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}}
 function put(mesh,i,p,q,sx,sy=sx,sz=sx,tint=0xffffff){dummy.position.set(p.x,p.y,p.z);dummy.quaternion.copy(q);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);color.set(tint);mesh.setColorAt(i,color);}
 function burst(p,tint,n=4,force=2.5,dir=null,contact=false){n=Math.min(reduced?4:14,reduced?Math.ceil(n*.45):n,SPARK_CAP-sparks.length);for(let i=0;i<n;i++){const a=dir?Math.atan2(dir.z,dir.x)+(Math.random()-.5)*(contact?1.7:1.15):Math.random()*Math.PI*2,s=force*(reduced?.55:1)*(.3+Math.random()*.7),life=contact?.15+Math.random()*.1:.13+Math.random()*.08;sparks.push({x:p.x,y:p.y,z:p.z,vx:Math.cos(a)*s,vy:(contact?1.1:.7)+Math.random()*1.6,vz:Math.sin(a)*s,tint:i===0&&contact?C.blade:tint,life,max:life,size:(contact?.055:.035)+Math.random()*.025,stretch:contact?3.3:2.5});}}
 function updateSparks(dt){if(!sparks.length){dirty(sparkMesh,0);return;}let n=0;for(let i=sparks.length-1;i>=0;i--){const p=sparks[i];p.life-=dt;if(p.life<=0){sparks[i]=sparks[sparks.length-1];sparks.pop();continue;}p.vy-=10*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;tmp.set(p.vx,p.vy,p.vz);dummy.quaternion.setFromUnitVectors(AXIS,tmp.normalize());const s=p.size*clamp(p.life/p.max*2,0,1);put(sparkMesh,n++,p,dummy.quaternion,s*p.stretch,s,s,p.tint);}dirty(sparkMesh,n);}

 // A 64-projectile budget preserves the prior visibility cap across nine
 // banks; physical arrows have wood, metal and feathers rather than light trails.
 const PROJECTILE_CAP=64,LODGE_CAP=8,lodged=[];
 const arrowShafts=instanced(geo.shaft,PROJECTILE_CAP+LODGE_CAP,mat(C.wood,1,true)),arrowTips=instanced(geo.arrowTip,PROJECTILE_CAP+LODGE_CAP,mat(C.steel,1,true)),arrowVanes=instanced(geo.arrowFeathers,PROJECTILE_CAP+LODGE_CAP,mat(C.feather,1,true));
 const crescents=instanced(geo.crescent,PROJECTILE_CAP,mat(0xffffff,1,true)),heads=instanced(geo.diamond,PROJECTILE_CAP,mat(C.gold,1,true));
 const coals=instanced(geo.orb,PROJECTILE_CAP,mat(C.fire,1,true)),flames=instanced(geo.flame,PROJECTILE_CAP,mat(C.ember,1,true));
 const drops=instanced(geo.drop,PROJECTILE_CAP,mat(C.blue,1,true)),spray=instanced(geo.orb,PROJECTILE_CAP,mat(C.ice,1,true));
 // Birthday cakes thrown by the finale boss: sponge, frosting and a cherry.
 const cakeBases=instanced(geo.box,PROJECTILE_CAP,mat(0xfff1e2,1,true)),cakeTops=instanced(geo.box,PROJECTILE_CAP,mat(0xff8fb8,1,true)),cherries=instanced(geo.box,PROJECTILE_CAP,mat(0xe2364e,1,true));
 const projectileMeshes=[arrowShafts,arrowTips,arrowVanes,crescents,heads,coals,flames,drops,spray,cakeBases,cakeTops,cherries];
 // Party confetti: flat paper squares that flutter down and settle on the ground.
 const CONFETTI_CAP=260,confetti=[],pendingConfetti=[],PARTY=[0xff6f9f,0xffcf5a,0x7fd6ff,0x9df59a,0xc59bff,0xffffff,0xff9b5e],euler=new T.Euler(),confettiMesh=instanced(geo.box,CONFETTI_CAP,mat(0xffffff,1,true));
 function confettiBurst(p,n=30,force=4,up=4){n=Math.min(reduced?Math.ceil(n/2):n,CONFETTI_CAP-confetti.length);for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=force*(.2+Math.random()*.8),life=1.4+Math.random()*1.4;confetti.push({x:p.x,y:p.y,z:p.z,vx:Math.cos(a)*s,vy:up*(.45+Math.random()*.85),vz:Math.sin(a)*s,rx:Math.random()*6,ry:Math.random()*6,spin:5+Math.random()*9,tint:PARTY[(i+serial)%PARTY.length],life,max:life,landed:false});}}
 function updateConfetti(dt){for(let i=pendingConfetti.length-1;i>=0;i--){const q=pendingConfetti[i];q.delay-=dt;if(q.delay<=0){confettiBurst(q.p,q.n,q.force,q.up);pendingConfetti.splice(i,1);}}
  let n=0;for(let i=confetti.length-1;i>=0;i--){const c=confetti[i];c.life-=dt;if(c.life<=0){confetti[i]=confetti[confetti.length-1];confetti.pop();continue;}
   if(!c.landed){const drag=Math.exp(-dt*2.2);c.vx*=drag;c.vz*=drag;c.vy=Math.max(-1.7,c.vy-7*dt);c.x+=c.vx*dt+Math.sin(time*6+c.rx)*dt*.35;c.y+=c.vy*dt;c.z+=c.vz*dt;c.rx+=c.spin*dt;const floor=groundAt(c.x,c.z,c.y)+.03;if(c.y<=floor&&c.vy<0){c.y=floor;c.landed=true;c.rx=Math.PI/2;}}
   euler.set(c.rx,c.ry,c.rx*.5);dummy.quaternion.setFromEuler(euler);const s=Math.min(1,c.life/.35);put(confettiMesh,n++,c,dummy.quaternion,.13*s,.13*s,.025,c.tint);}
  dirty(confettiMesh,n);}
 function travel(e){flight.set(finite(e.vx,finite(e.dirX,1)),finite(e.vy,finite(e.dirY)),finite(e.vz,finite(e.dirZ)));if(flight.lengthSq()<.0001)flight.set(1,0,0);flight.normalize();flightQ.setFromUnitVectors(AXIS,flight);}
 function putArrow(i,p,q,scale=1){put(arrowShafts,i,p,q,scale);put(arrowTips,i,p,q,scale);put(arrowVanes,i,p,q,scale);}
 function lodgeArrow(e){if(lodged.length>=LODGE_CAP)lodged.shift();travel(e);const p=point(e),normal=e.normal||{};lodged.push({p:{x:p.x-flight.x*.6+finite(e.normalX,finite(normal.x))*.015,y:p.y-flight.y*.6+finite(e.normalY,finite(normal.y))*.015,z:p.z-flight.z*.6+finite(e.normalZ,finite(normal.z))*.015},q:flightQ.clone(),life:.6});}
 function updateProjectiles(game,dt){let a=0,b=0,h=0,f=0,w=0,n=0,k=0;for(const p of game.projectiles||[]){if(p.dead||p.life<=0||p.magic||n>=PROJECTILE_CAP)continue;n++;travel(p);const kind=p.kind||'bolt';
   if(['arrow','bowArrow','ricochetBolt','bolt'].includes(kind))putArrow(a++,p,flightQ,1+finite(p.charge)*.14);
   else if(kind==='bossOrb'){put(coals,f,p,flightQ,.29,.29,.29);put(flames,f++,p,flightQ,.85,1,1);}
   else if(kind==='cake'){dummy.quaternion.setFromAxisAngle(UP,time*7+finite(p.prevX));const q=dummy.quaternion;put(cakeBases,k,p,q,.44,.26,.44);put(cakeTops,k,{x:p.x,y:p.y+.16,z:p.z},q,.47,.09,.47);put(cherries,k++,{x:p.x,y:p.y+.27,z:p.z},q,.11,.11,.11);}
   else if(kind==='water'){put(drops,w,p,flightQ,.85,.95,.95);put(spray,w++,{x:p.x-flight.x*.55,y:p.y-flight.y*.55,z:p.z-flight.z*.55},flightQ,.085,.06,.06);}
   else if(/catStar|star/i.test(kind))put(heads,h++,p,cameraView.quaternion,.18,.24,.1);
   else {dummy.quaternion.setFromAxisAngle(UP,-Math.atan2(flight.z,flight.x));const size=kind==='returnCrescent'?.72:kind==='windCut'?.56:.42;put(crescents,b++,p,dummy.quaternion,size,.25,size,kind==='reflected'?C.gold:C.ice);}
  }
  for(let i=lodged.length-1;i>=0;i--){const l=lodged[i];l.life-=dt;if(l.life<=0){lodged.splice(i,1);continue;}putArrow(a++,l.p,l.q,Math.min(1,l.life/.1));}
  dirty(arrowShafts,a);dirty(arrowTips,a);dirty(arrowVanes,a);dirty(crescents,b);dirty(heads,h);dirty(coals,f);dirty(flames,f);dirty(drops,w);dirty(spray,w);dirty(cakeBases,k);dirty(cakeTops,k);dirty(cherries,k);
 }

 // Persistent indicators are tied to authoritative state and never pulse.
 const stars=instanced(geo.diamond,2,mat(C.gold,1,true)),mirror=new T.Mesh(geo.arc,mat(C.ice,.32)),chargeMark=new T.Mesh(geo.box,mat(C.gold,1,true)),guardMark=new T.Mesh(geo.diamond,mat(C.gold,1,true));group.add(mirror,chargeMark,guardMark);mirror.visible=chargeMark.visible=guardMark.visible=false;guardMark.scale.set(.075,.12,.075);
 function updatePersistent(game){const p=game.player,orbit=p.orbitStars;let n=0;if(orbit&&orbit.expiresAt>game.time){for(;n<Math.min(2,orbit.count||0);n++){const a=time*1.4+n*Math.PI;dummy.quaternion.setFromAxisAngle(UP,a);put(stars,n,{x:p.x+Math.cos(a)*.85,y:p.y+1.1,z:p.z+Math.sin(a)*.85},dummy.quaternion,.11,.17,.11);}}dirty(stars,n);
  const m=p.mirror;mirror.visible=!!m&&!m.consumed&&m.expiresAt>game.time;if(mirror.visible){mirror.position.set(m.x,(m.y||0)+.08,m.z);mirror.rotation.y=-Math.atan2(m.dirZ||0,m.dirX||1);mirror.scale.set(.7,1,.7);}
  chargeMark.visible=!!p.bowCharging;if(chargeMark.visible){const d=direction({dirX:p.aimDirX,dirZ:p.aimDirZ},p),q=clamp(finite(p.bowCharge),0,1);chargeMark.position.set(p.x-d.z*.33,p.y+1.15,p.z+d.x*.33);chargeMark.rotation.y=-Math.atan2(d.z,d.x);chargeMark.scale.set(.12+q*.45,.055,.055);}
  guardMark.visible=p.catGuardCharges>0&&p.catGuardUntil>game.time;if(guardMark.visible)guardMark.position.set(p.x-.42,p.y+1.3,p.z);
 }

 // Shape rejection happens before cover occlusion. Only edge and one faint fill
 // carry the warning; ready means a steady amber edge, never a brightness pulse.
 const warningTerrain=(()=>{const h=root.HatTerrain,p=[],index=[];for(let iz=0;iz<h.nz;iz++)for(let ix=0;ix<h.nx;ix++){p.push(h.bounds.minX+ix*h.cell,h.heights[iz*h.nx+ix]+.055,h.bounds.minZ+iz*h.cell);if(ix<h.nx-1&&iz<h.nz-1){const a=iz*h.nx+ix,b=a+1,c=a+h.nx,d=c+1;index.push(a,c,b,b,c,d);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(index);return g;})();
 function warningMesh(){const material=new T.ShaderMaterial({transparent:true,depthTest:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,
  uniforms:{angle:{value:1},shape:{value:0},progress:{value:0},width:{value:.1},pathLength:{value:1},harmless:{value:0},origin:{value:new T.Vector2()},centre:{value:new T.Vector2()},heading:{value:new T.Vector2(1,0)},extent:{value:1},coverCount:{value:0},covers:{value:Array.from({length:24},()=>new T.Vector4())}},
  vertexShader:'varying vec2 v;varying vec2 world;uniform vec2 centre;uniform vec2 heading;uniform float extent;void main(){vec4 p=modelMatrix*vec4(position,1.0);world=p.xz;vec2 delta=world-centre;v=vec2(dot(delta,heading),dot(delta,vec2(heading.y,-heading.x)))/extent;gl_Position=projectionMatrix*viewMatrix*p;}',
  fragmentShader:'varying vec2 v;varying vec2 world;uniform float angle;uniform float shape;uniform float progress;uniform float width;uniform float pathLength;uniform float harmless;uniform vec2 origin;uniform int coverCount;uniform vec4 covers[24];void main(){float r=length(v);float line=0.;float fill=0.;if(shape<.5){if(r>1.||v.x<cos(angle)*max(r,.0001))discard;float a=abs(atan(v.y,v.x));line=max(step(.965,r),step(angle-.018,a));fill=step(r,progress);}else if(shape<1.5){if(r>1.)discard;line=step(.965,r);fill=step(r,progress);}else if(shape<2.5){if(v.x<0.||v.x>1.||abs(v.y)>width)discard;line=max(step(max(0.,width-.012),abs(v.y)),step(.97,v.x));fill=step(v.x,progress);}else{vec2 closest=vec2(clamp(v.x,0.,pathLength),0.);float distance=length(v-closest);if(distance>width)discard;line=step(max(0.,width-.012),distance);fill=step(v.x,progress*pathLength);}vec2 d=world-origin;vec2 safe=vec2(abs(d.x)<.0001?.0001:d.x,abs(d.y)<.0001?.0001:d.y);for(int i=0;i<24;i++){if(i>=coverCount)break;vec2 a=(covers[i].xy-origin)/safe;vec2 b=(covers[i].zw-origin)/safe;vec2 lo=min(a,b),hi=max(a,b);float near=max(0.,max(lo.x,lo.y)),far=min(1.,min(hi.x,hi.y));if(far>=near&&near<.998)discard;}vec3 edge=mix(vec3(.72,.35,.24),vec3(.81,.57,.31),smoothstep(.75,1.,progress));edge=mix(edge,vec3(.42,.58,.64),harmless);gl_FragColor=vec4(edge,line*.76+fill*.045+.018);}'
 });const mesh=new T.Mesh(warningTerrain,material);mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=15;group.add(mesh);
  // This separate world-space sign stays small even when the ground telegraph
  // spans a long charge lane. It never inherits the warning plane's scale.
  const cross=new T.Group(),crossMaterial=mat(C.danger,1,true);for(const angle of [-Math.PI/4,Math.PI/4]){const bar=new T.Mesh(geo.box,crossMaterial);bar.scale.set(.68,.105,.075);bar.rotation.z=angle;cross.add(bar);}cross.visible=false;group.add(cross);mesh.unblockableMark=cross;return mesh;}
 const warningPool=Array.from({length:12},warningMesh);
 function updateWarnings(game){let i=0;for(const e of game.enemies||[]){if(e.dead||e.spawned===false||e.spawning||!(e.state==='windup'||e.state==='strike'&&e.strikeElapsed<e.strikeContact))continue;
   // Overflow grows only if the simulation presents more simultaneous warnings;
   // a cosmetic pool budget must never hide a damaging attack's telegraph.
   if(!warningPool[i])warningPool.push(warningMesh());const m=warningPool[i++],u=m.material.uniforms,kind=e.attackKind||'slash',d=direction(e),circle=e.telegraphShape?e.telegraphShape==='circle':['slam','slimeSlam','tideSplash','relocate'].includes(kind),line=e.telegraphShape?e.telegraphShape==='line':['arrow','water','bossOrb','dive','swoop','hop','thrust','charge'].includes(kind);let range=finite(e.attackRange,circle?3:3.2);const origin=circle?point(e.telegraphOrigin,e):point(e),px=origin.x,pz=origin.z;
   if(['dive','swoop','hop'].includes(kind)&&Number.isFinite(e.aimX)&&Number.isFinite(e.aimZ))range=Math.min(range,Math.hypot(e.aimX-e.x,e.aimZ-e.z))||range;
   const capsule=['charge','dive','swoop','hop'].includes(kind),halfWidth=Math.max(.05,finite(e.attackWidth,1.2)*.5),extent=capsule?range+halfWidth:range;
   // Every warning shares the exact ground triangles. Compute its locked
   // footprint in the vertex shader, avoiding a second grid across creases.
   m.visible=true;u.centre.value.set(px,pz);u.heading.value.set(d.x,d.z);u.extent.value=extent;
   u.shape.value=capsule?3:circle?1:line?2:0;u.pathLength.value=range/Math.max(.1,extent);u.angle.value=clamp(finite(e.attackHalfAngle,1),.1,Math.PI);u.width.value=capsule?halfWidth/Math.max(.1,extent):clamp(finite(e.attackWidth,.42)*.5/Math.max(range,.1),.01,.5);u.progress.value=e.state==='strike'?1:1-clamp(finite(e.timer)/Math.max(.01,finite(e.windupDuration,.6)),0,1);u.harmless.value=e.harmless||kind==='relocate'?1:0;u.origin.value.set(e.x,e.z);
   const cross=m.unblockableMark;cross.visible=!!e.unblockable&&!u.harmless.value;if(cross.visible){cross.position.set(e.x,finite(e.y)+(e.type==='boss'?3.65:2.05),e.z);cross.quaternion.copy(cameraView.quaternion);cross.children[0].material.color.set(u.progress.value<.65?C.ember:C.danger);}
   let covers=0;if(!u.harmless.value)for(const o of game.obstacles||[]){if(covers>=24)break;if(['dive','swoop'].includes(kind)&&(finite(o.y)+o.height)<=e.y+.2)continue;u.covers.value[covers++].set(o.x-o.w/2,o.z-o.d/2,o.x+o.w/2,o.z+o.d/2);}u.coverCount.value=covers;
  }for(;i<warningPool.length;i++){warningPool[i].visible=false;warningPool[i].unblockableMark.visible=false;}
 }

 // A local diamond and one small glint use the separate reward clock. No beams,
 // expanding star sheets, ambient twinkles, camera shake or screen flash.
 const reward={g:new T.Group(),active:false,age:0,life:.9,revealed:false,chestId:null};group.add(reward.g);reward.g.visible=false;
 reward.crystal=new T.Mesh(geo.diamond,mat(C.gold,.85));reward.glint=new T.Mesh(geo.diamond,mat(C.ice,.65));reward.g.add(reward.crystal,reward.glint);
 function beginReward(e){reward.active=true;reward.age=0;reward.life=Math.max(.3,finite(e.duration,.9));reward.revealed=false;reward.chestId=e.chestId;const p=point(e);reward.g.position.set(p.x,p.y,p.z);reward.g.visible=true;updateReward(0);}
 function revealReward(e){if(!reward.active||e.chestId&&reward.chestId&&e.chestId!==reward.chestId)return;reward.revealed=true;updateReward(0);}
 function updateReward(dt){if(!reward.active)return;reward.age+=dt;if(reward.age>=reward.life){reward.active=false;reward.g.visible=false;return;}const t=clamp((reward.age-.22)/Math.max(.12,reward.life-.22),0,1),fade=1-t;reward.crystal.visible=reward.glint.visible=reward.revealed;reward.crystal.position.set(0,1.1+t*.42,0);reward.crystal.rotation.y=reward.age*1.7;reward.crystal.scale.set(.22,.34,.22);reward.crystal.material.opacity=.85*fade;reward.glint.position.set(.23,1.35+t*.42,0);reward.glint.quaternion.copy(cameraView.quaternion);reward.glint.scale.set(.035,.09,.035);reward.glint.material.opacity=.65*fade;}

 function slash(e,game,ghost=false){const enemy=e.type==='enemySwing',combo=e.combo||game.player.combo||1,tint=enemy?C.red:ghost?C.ice:combo===3?C.gold:C.mint,r=alloc('slash',e,Math.min(.2,finite(e.duration,.16)),tint);r.radius=finite(e.range,2.5);r.combo=combo;r.ghost=ghost;orient(r);r.g.position.y+=.9;shape(r,0,geo.arc,r.radius,1,r.radius);shape(r,1,geo.edge,r.radius*.98,1,r.radius*.98,0,.025,0);}
 function contactImpact(e,at,heavy,tint){
  const r=alloc('contactImpact',{...e,...at},reduced?.13:heavy?.22:.17,tint);r.heavy=heavy;r.radius=reduced?.24:heavy?.46:.33;r.g.quaternion.copy(cameraView.quaternion);r.alpha[0]=reduced?.65:.92;r.alpha[1]=reduced?.22:.48;r.alpha[2]=.86;
  const size=reduced?.38:heavy?.86:.62;shape(r,0,geo.star,size,size*.78,1).rotation.z=heavy?.2:e.combo===2?.6:-.3;shape(r,1,geo.contactRing,r.radius*(reduced?1:.64),r.radius*(reduced?1:.64),1,0,0,-.006);shape(r,2,geo.diamond,reduced?.035:heavy?.075:.055);r.materials[0].color.set(e.attackCounter?0xffd88f:0xffe8b6);r.materials[2].color.set(0xfff5d9);
  for(let i=0;i<3;i++)r.materials[i].opacity=r.alpha[i];
 }
 function impact(e,game,light=false){const at=point(e.contactPoint,e),heavy=!!e.heavy||e.combo>=3||e.attackCounter,tint=e.type==='hurt'?C.red:e.attackCounter?C.clang:e.targetType==='guard'?C.steel:e.origin==='reaction'?C.ice:C.gold;
  if(e.type==='hit'&&!light&&e.origin!=='reaction'){contactImpact(e,at,heavy,tint);burst(at,tint,heavy?14:9,heavy?5.6:4.2,direction(e,game.player),true);return;}
  const r=alloc('cut',{...e,...at},light?.105:heavy?.2:.15,tint);orient(r);r.heavy=heavy;r.alpha[0]=.92;r.alpha[1]=.82;r.alpha[2]=.4;
  const angle=heavy?1.34:e.combo===2?.68:-.56,length=light?.32:heavy?.93:.66;
  shape(r,0,geo.box,length,light?.055:heavy?.105:.075,.07).rotation.z=angle;
  shape(r,1,geo.box,length*.61,.034,.084,.015,.018,.008).rotation.z=angle;
  // A short transverse nick and a directional shove describe contact, not a
  // halo around the victim. Heavy strikes leave a longer, downward cut.
  shape(r,2,geo.box,heavy?.32:.2,.055,.065,-.09,.035,0).rotation.z=angle+1.3;
  r.materials[1].color.set(C.blade);burst(at,tint,light?3:heavy?8:5,heavy?5.2:3.8,direction(e,game.player),!light);
 }
 function shieldContact(e,game){const at=point(e.contactPoint,e),broken=e.type==='guardBreak',perfect=e.type==='parry',tint=broken?C.break:perfect?C.clang:C.steel;
  const r=alloc(broken?'guardBreak':perfect?'parry':'block',{...e,...at},broken?.26:perfect?.19:.14,tint);r.g.quaternion.copy(cameraView.quaternion);r.alpha[0]=.95;r.alpha[1]=.9;r.alpha[2]=.68;
  if(broken){
   for(let i=0;i<3;i++){shape(r,i,geo.box,.12,.21,.08,(i-1)*.17,.03,0).rotation.z=(i-1)*.8;r.materials[i].color.set(i===1?C.wood:C.break);}
  }else{
   const size=perfect?.63:.37;shape(r,0,geo.box,size,.075,.055).rotation.z=perfect?.2:-.45;shape(r,1,geo.box,.065,size*.8,.065).rotation.z=perfect?.2:-.45;
   shape(r,2,geo.diamond,perfect?.1:.075,perfect?.1:.075,.055);r.materials[1].color.set(perfect?C.blade:C.ice);r.materials[2].color.set(perfect?C.clang:C.steel);
  }
  const incoming=direction(e,game.player);burst(at,tint,broken?5:perfect?8:5,broken?2.4:perfect?4.7:3.6,{x:-incoming.x,z:-incoming.z},!broken);
 }
 function dangerCross(e){const at=point(e),r=alloc('dangerCross',{...e,y:at.y+(e.targetType==='boss'||e.enemyType==='boss'?3.65:2.05)},.16,C.danger);r.g.quaternion.copy(cameraView.quaternion);r.alpha[0]=r.alpha[1]=.85;for(let i=0;i<2;i++){shape(r,i,geo.box,.68,.105,.075).rotation.z=i?Math.PI/4:-Math.PI/4;r.materials[i].color.set(C.danger);}}
 function elementImpact(e,water=false){const r=groundRing({...e,y:finite(e.groundY,finite(e.y)-.55),radius:water?.43:.36},water?C.blue:C.fire,.22,'splash');shape(r,1,water?geo.drop:geo.flame,.16,.22,.16,0,.12,0);burst(point(e),water?C.ice:C.ember,3,2);}
 function emit(e,game){if(!e||!game?.player)return;lastGame=game;if(e.eventId!=null){if(seen.has(e.eventId))return;seen.add(e.eventId);seenOrder.push(e.eventId);if(seenOrder.length>1024)seen.delete(seenOrder.shift());}
  if(e.type==='bossAwake'&&e.bossKind==='sweetheart')pendingConfetti.push({delay:.95,p:{x:finite(e.x),y:finite(e.y)+1.2,z:finite(e.z)},n:70,force:5.5,up:4.5});
  if(e.type==='finalDefeated'){const at2=point(e);confettiBurst({...at2,y:at2.y+2.6},120,6,7);pendingConfetti.push({delay:.5,p:{...at2,y:at2.y+3},n:90,force:7,up:6});}
  const actor=(game.enemies||[]).find(a=>a.id===e.targetId||a.id===e.sourceId);if(e.type!=='encounterSpawn'&&actor&&(actor.spawned===false||actor.spawning||actor.state==='spawning'))return;const p=game.player,at=point(e,p);
  switch(e.type){
   case 'swing':case 'meleeActive':break; // Only the actual blade endpoints create the player's trail.
   case 'weaponSwap':case 'death':clearBlade();break;
   case 'block':case 'parry':case 'guardBreak':clearBlade();shieldContact(e,game);break;
   case 'counterStrike':clearBlade();break; // The ensuing sword stroke and hit carry the gold counter cue.
   case 'mirrorSlash':slash(e,game,true);break;
   case 'hit':impact(e,game,e.origin==='reaction');break;
   case 'hurt':clearBlade();impact(e,game,e.origin==='reaction');break;
   case 'projectileHit':if(e.kind==='cake'){groundRing({...e,y:finite(e.groundY,finite(e.y)-.55),radius:.7},0xff8fb8,.3,'splash');burst(point(e),0xfff1e2,7,3.2);confettiBurst(point(e),10,2.2,2.4);}else if(e.kind==='bossOrb')elementImpact(e);else if(e.kind==='water')elementImpact(e,true);else if(!e.targetId||e.targetId==='wall'){impact({...e,targetType:'guard'},game,true);if(['arrow','bowArrow','ricochetBolt'].includes(e.kind))lodgeArrow(e);}break;
   case 'kill':burst(at,e.targetType==='slime'?C.goo:C.dust,e.targetType==='boss'?5:2,2.2);break;
   case 'dashStart':clearBlade();burst({...at,y:at.y+.08},C.dust,4,1.5,{x:-finite(e.dirX,p.dirX),z:-finite(e.dirZ,p.dirZ)});break;
   case 'novaPull':groundRing(e,C.purple,finite(e.duration,.28),'pull');break;
   case 'windWhirl':case 'nova':groundRing(e,C.purple,.26,'whirl');break;
   case 'windCut':{const r=alloc('windLaunch',e,.16,C.mint);orient(r);r.g.position.y+=.8;shape(r,0,geo.arc,.6,1,.6);break;}
   case 'starBurst':groundRing({...e,radius:Math.min(1.3,finite(e.radius,1.3))},C.ice,.2);break;
   case 'guardReflect':{const r=alloc('guard',e,.2,C.ice);orient(r);r.g.position.y+=.7;shape(r,0,geo.arc,.65,1,.65);burst(at,C.ice,3,2.2,direction(e,p));break;}
   case 'catLeap':{const r=alloc('catLeap',e,finite(e.duration,.16),C.gold);r.from=point(e.from,p);r.to=point(e.to,e);shape(r,0,geo.diamond,.08,.05,.08);break;}
   case 'catClaw':{const r=alloc('claw',e,.15,C.gold);r.g.quaternion.copy(cameraView.quaternion);for(let i=0;i<3;i++)shape(r,i,geo.box,.035,e.finisher?.48:.34,.035,(i-1)*.12,0,0).rotation.z=-.45;break;}
   case 'catGuard':groundRing({...e,radius:.75},C.gold,.3);break;
   case 'catGuardBlock':burst(at,C.gold,3,1.8);break;
   case 'mirrorSpawn':groundRing({...e,radius:.65},C.ice,.2);break;
   case 'crescentLaunch':case 'starLaunch':case 'bolt':break; // The launched physical object is the release cue.
   case 'statusConsume':{const r=alloc('consume',{...e,y:at.y+1.3},.14,e.statusId==='bellMark'?C.gold:C.ice);shape(r,0,geo.diamond,.1,.18,.1);break;}
   case 'treasureOpen':beginReward(e);break;
   case 'treasureReveal':revealReward(e);break;
   case 'upgrade':burst({x:p.x,y:p.y+.9,z:p.z},C.gold,4,1);break;
   case 'heal':case 'checkpoint':groundRing({...e,radius:.8},e.type==='heal'?C.mint:C.gold,.3);break;
   case 'land':burst({...at,y:at.y+.05},C.dust,2,1);break;
   case 'chargeBlocked':burst({...at,y:at.y+.2},C.dust,4,2.2);break;
   case 'bossRelocate':groundRing({...point(e.from,e),radius:.65},C.ice,.22);groundRing({...point(e.to,e),radius:.65},C.ice,.3);break;
   case 'enemySwing':{
    if(e.unblockable)dangerCross(e);
    const kind=e.attackKind,sweet=e.bossKind==='sweetheart',physical=(e.enemyType==='guard'&&root.HatPixelEnemies)||(e.enemyType==='boss'&&(e.bossKind||'ironWarden')==='ironWarden'&&root.HatPixelWarden)||(sweet&&root.HatPixelSweetheart);
    if(sweet&&kind==='stomp'){const at2=point(e);groundRing({...e,...at2,radius:finite(e.range,3)},0xff8fb8,.34);confettiBurst({...at2,y:at2.y+2.4},46,4.6,5.5);break;}
    if(sweet&&kind==='charge'){confettiBurst({...at,y:at.y+1.4},12,2,2.5);break;}
    if(physical&&['slash','thrust'].includes(kind))break;
    if(kind==='slash'||!kind)slash(e,game);
    else if(['slam','stomp','slimeSlam','tideSplash'].includes(kind)){const impactPoint=point(e.telegraphOrigin,e);groundRing({...e,...impactPoint,radius:finite(e.range,finite(e.radius,2))},kind==='tideSplash'?C.blue:kind==='slimeSlam'?C.goo:C.red,.28);burst({...impactPoint,y:impactPoint.y+.12},C.dust,4,2.3);}
    else if(kind==='thrust'){const r=alloc('thrust',e,.16,C.steel);orient(r);r.g.position.y+=.9;r.radius=finite(e.range,3.2);shape(r,0,geo.box,1,.045,.045);}
    else if(kind==='charge')burst({...at,y:at.y+.1},C.dust,3,1.4);
    break;}
   case 'encounterSpawn':for(const enemy of (e.enemies||[]).slice(0,12))groundRing({...enemy,radius:e.boss?1.2:.6},C.dust,finite(e.duration,.7),'arrival');break;
   // No room-sized burst for a phase, cat cast, jump, windup or status change.
   default:break;
  }
 }
 function updateRigs(game,dt){for(const r of rigs){if(!r.active)continue;r.age+=dt;if(r.age<r.delay){r.g.visible=false;continue;}const t=clamp((r.age-r.delay)/r.life,0,1),out=1-t,ease=1-out*out;if(t>=1){r.active=false;r.g.visible=false;continue;}r.g.visible=true;for(let i=0;i<3;i++)r.materials[i].opacity=out*r.alpha[i];const m=r.meshes;
   if(r.kind==='slash'){const strength=r.ghost?.45:1;r.materials[0].opacity*=strength;r.materials[1].opacity*=strength;r.g.rotation.y=-Math.atan2(r.dir.z,r.dir.x)+(r.combo===2?1:-1)*(.38-t*.7);r.g.scale.setScalar(.9+ease*.1);}
   else if(['ring','splash','arrival'].includes(r.kind)){const rr=r.radius*(.88+ease*.12);m[0].scale.set(rr,1,rr);if(r.kind==='arrival')r.materials[0].opacity=Math.sin(t*Math.PI)*.32;}
   else if(r.kind==='pull'||r.kind==='whirl'){const rr=r.radius*(r.kind==='pull'?1-t*.15:.92+ease*.08);m[0].scale.set(rr,1,rr);r.materials[0].opacity=out*.32;}
   else if(r.kind==='thrust'){const reach=.6+ease*(r.radius-.6);m[0].scale.x=reach;m[0].position.x=reach*.5;}
   else if(r.kind==='contactImpact'){r.g.quaternion.copy(cameraView.quaternion);const spread=reduced?1:.64+ease*.52;m[1].scale.set(r.radius*spread,r.radius*spread,1);r.g.scale.setScalar(reduced?1:1+Math.sin(t*Math.PI)*.08);r.materials[0].opacity=r.alpha[0]*Math.pow(out,1.6);r.materials[1].opacity=r.alpha[1]*out;r.materials[2].opacity=r.alpha[2]*Math.max(0,1-t*2.5);}
   else if(r.kind==='cut'){const push=ease*(r.heavy?.16:.085);r.g.position.set(r.p.x+r.dir.x*push,r.p.y-(r.heavy?ease*.07:0),r.p.z+r.dir.z*push);r.g.scale.setScalar(.92+Math.min(t*4,1)*.14);}
   else if(r.kind==='block'||r.kind==='parry'){r.g.quaternion.copy(cameraView.quaternion);r.g.scale.setScalar(1+t*.12);for(let i=0;i<3;i++)r.materials[i].opacity=r.alpha[i]*Math.min(1,out*2.3);}
   else if(r.kind==='guardBreak'){r.g.quaternion.copy(cameraView.quaternion);for(let i=0;i<3;i++){m[i].position.x=(i-1)*(.17+t*.27);m[i].position.y=.03-t*t*.38;m[i].rotation.z=(i-1)*(.8+t*.7);}}
   else if(r.kind==='dangerCross'||r.kind==='claw'){r.g.quaternion.copy(cameraView.quaternion);}
   else if(r.kind==='windLaunch'){r.g.position.x=r.p.x+r.dir.x*t*.45;r.g.position.z=r.p.z+r.dir.z*t*.45;}
   else if(r.kind==='consume')r.g.scale.setScalar(out);
   else if(r.kind==='catLeap')r.g.position.set(r.from.x+(r.to.x-r.from.x)*t,r.from.y+(r.to.y-r.from.y)*t+.45+Math.sin(t*Math.PI)*.3,r.from.z+(r.to.z-r.from.z)*t);
  }}
 function update(game,simDt,revealDt=simDt){if(!game?.player)return;lastGame=game;const combatDt=clamp(finite(simDt),0,.1),presentationDt=clamp(finite(revealDt),0,.1);if(combatDt>0){time+=combatDt;updateRigs(game,combatDt);updateSparks(combatDt);updateConfetti(combatDt);}updateBlade(game,combatDt);updateEnemyBlades(game,combatDt);if(presentationDt>0)updateReward(presentationDt);updateProjectiles(game,combatDt);updatePersistent(game);updateWarnings(game);}
 function reset(){time=serial=bladeClock=0;clearBlade();for(const r of enemyTrails)clearEnemyTrail(r);seen.clear();seenOrder.length=0;sparks.length=lodged.length=confetti.length=pendingConfetti.length=0;confettiMesh.count=0;lastGame=null;reward.active=false;reward.age=0;reward.revealed=false;reward.g.visible=false;for(const r of rigs){r.active=false;r.g.visible=false;}for(const m of [sparkMesh,...projectileMeshes,stars])m.count=0;mirror.visible=chargeMark.visible=guardMark.visible=false;for(const m of warningPool){m.visible=false;m.unblockableMark.visible=false;}}
 function camera(){return{x:0,y:0,flash:0,zoom:1};}
 return{emit,update,reset,camera};
}
root.HatBattleFX={create};
})(typeof window!=='undefined'?window:globalThis);
