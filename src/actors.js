(function(root){'use strict';
function create({THREE:T,scene,camera,manager}){
 // Sprite enemies stay vertical at low shoulder angles. Boss forms consume
 // only this yaw quaternion, never the perspective camera's pitch or roll.
 const billboardCamera={quaternion:new T.Quaternion()},vertical=new T.Vector3(0,1,0),cameraBack=new T.Vector3();
 const loader=new T.TextureLoader(manager),actors=new Map(),trail=[],bossForms=root.HatBossForms?.create({THREE:T,scene,camera:billboardCamera}),pixelRig=root.HatPixelHero?.create({THREE:T,scene,camera});
 const enemyRigs=new Map(),enemyBlades=[];
 function articulated(e){return e.bossKind==='sweetheart'?!!root.HatPixelSweetheart:e.type==='boss'&&(e.bossKind||'ironWarden')==='ironWarden'?!!root.HatPixelWarden:['guard','archer','bat'].includes(e.type)&&!!root.HatPixelEnemies;}
 function enemyRig(e){if(!articulated(e))return null;let r=enemyRigs.get(e.id);if(!r){r=e.bossKind==='sweetheart'?root.HatPixelSweetheart.create({THREE:T,scene}):e.type==='boss'?root.HatPixelWarden.create({THREE:T,scene}):root.HatPixelEnemies.create({THREE:T,scene,kind:e.type});enemyRigs.set(e.id,r);}return r;}
 const heroAtlas={width:1261,height:1247,cols:[0,315,630,945,1261],rows:[0,328,637,940,1247],feet:[319,317,319,316,620,620,620,606,919,919,918,919,1220,1219,1219,1202],anchors:[156,174,172,180,175,174,174,172,162,170,172,172,175,176,171,165]};
 function texture(path){const t=loader.load(path);t.colorSpace=T.SRGBColorSpace;t.magFilter=t.minFilter=T.NearestFilter;t.generateMipmaps=false;return t;}
 const heroTex=texture('assets/hero-v3.png'),catTex=texture('assets/cat-v3.png'),enemyTex=texture('assets/enemies-v3.png'),creatureTex=texture('assets/creatures-v1.png');
 const profiles={archer:{row:0,size:3.2,aspect:1,center:3.2*(337/362-.5)},bat:{row:1,size:2.7,aspect:1,center:1},swimmer:{row:2,size:2.7,aspect:1,center:1}};
 const motion=root.HatMotion.create({attackTimings:root.HatGame.ATTACKS,hero:{width:3.5},cat:{cols:4,rows:2,height:2.4,width:1.8,strideLength:1.55,center:frame=>([462,462,462,462,447,449,449,449][frame]/512-.5)*2.4,frames:{idle:[0],run:[1,2,3,4,5,6],dash:[7]}}});
 const shadowAxis=new T.Vector3(0,0,1),shadowNormal=new T.Vector3();
 function shadow(radius){const m=new T.Mesh(new T.CircleGeometry(radius,16),new T.MeshBasicMaterial({color:'#07111a',transparent:true,opacity:.18,depthWrite:false}));m.rotation.x=-Math.PI/2;scene.add(m);return m;}
 function supportY(game,x,y,z,radius=.45){return root.HatGame.supportHeight(game,x,z,y+.055,radius);}
 function placeShadow(mesh,x,y,z,floor){const height=Math.max(0,y-floor);mesh.position.set(x,floor+.025,z);if(Math.abs(floor-root.HatTerrain.heightAt(x,z))<.02)root.HatTerrain.normalAt(x,z,shadowNormal);else shadowNormal.set(0,1,0);mesh.quaternion.setFromUnitVectors(shadowAxis,shadowNormal);mesh.scale.setScalar(Math.max(.48,1-height*.12));mesh.material.opacity=Math.max(.055,.18-height*.025);}
 function billboard(tex,w,h,foot){const base=new T.Group(),face=new T.Group();base.add(face);scene.add(base);const plane=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.4,depthWrite:true,toneMapped:false,side:T.DoubleSide}));plane.position.y=foot;face.add(plane);return{base,face,plane,tex};}
 const hero=billboard(heroTex,3.5,3.5,1.47),cat=billboard(catTex,1.8,2.4,.966);hero.shadow=shadow(.62);cat.shadow=shadow(.32);
 // Keep the atlas for the portrait and a source-compatible sprite fallback.
 // Hiding the entire face also hides its old silhouette, bow and sword pixels.
 hero.face.visible=cat.face.visible=!pixelRig;
 function solidSprite(plane,color,opacity,depthFunc=T.LessEqualDepth){const material=new T.MeshBasicMaterial({map:plane.material.map,color,transparent:true,opacity,alphaTest:.04,depthWrite:false,depthFunc,toneMapped:false,side:T.DoubleSide});material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb = diffuse;');};const mesh=new T.Mesh(plane.geometry,material);mesh.renderOrder=85;plane.parent.add(mesh);return mesh;}
 const silhouette=solidSprite(hero.plane,'#8baaa7',.22,T.GreaterDepth);
 const bow=new T.Group();hero.face.add(bow);bow.visible=false;
 const bowGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(0,.57,0),new T.Vector3(.22,.35,0),new T.Vector3(.3,0,0),new T.Vector3(.22,-.35,0),new T.Vector3(0,-.57,0)]);
 bow.add(new T.Line(bowGeometry,new T.LineBasicMaterial({color:'#aa8258',toneMapped:false})));
 const stringGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(),new T.Vector3()]),bowString=new T.Line(stringGeometry,new T.LineBasicMaterial({color:'#b5b6a6',toneMapped:false}));bow.add(bowString);
 const arrowShaft=new T.Mesh(new T.BoxGeometry(.88,.035,.025),new T.MeshBasicMaterial({color:'#b69c76',toneMapped:false}));arrowShaft.position.x=.1;bow.add(arrowShaft);
 const arrowTip=new T.Mesh(new T.ConeGeometry(.08,.18,3).rotateZ(-Math.PI/2),new T.MeshBasicMaterial({color:'#b7c9ca',toneMapped:false}));arrowTip.position.x=.62;bow.add(arrowTip);
 function matchSprite(a,b){a.position.copy(b.position);a.quaternion.copy(b.quaternion);a.scale.copy(b.scale);}
 let clock=0,lastDash=0,catFlight=null,catPos=new T.Vector3(-15,0,8),lastCat=new T.Vector3(),portraitDrawn=false;const travel=new Map(),inverseView=new T.Quaternion(),facingVector=new T.Vector3(),bowAim=new T.Vector3(),hitProjection=new T.Vector3();
 function stride(actor,id,facing,dt){let t=travel.get(id);if(!t){t={x:actor.x,z:actor.z,value:0};travel.set(id,t);}const distance=Math.hypot(actor.x-t.x,actor.z-t.z);if(dt>0&&distance<2)t.value+=distance*facing;t.x=actor.x;t.z=actor.z;return{...actor,x:t.value,vx:dt?distance/dt*facing:0,facing,attackFacing:facing};}
 function drawPortrait(){if(portraitDrawn||!heroTex.image)return;const c=document.getElementById('hero-portrait');if(!c)return;const a=c.getContext('2d');a.imageSmoothingEnabled=false;a.clearRect(0,0,c.width,c.height);a.drawImage(heroTex.image,84,45,167,157,0,0,c.width,c.height);portraitDrawn=true;}
 function pose(r,p,size,center,atlas){let shift=center,sy=1,sx=1,horizontal=0;
  if(atlas){const col=p.frame%4,row=Math.floor(p.frame/4),x=atlas.cols[col],y=atlas.rows[row],w=atlas.cols[col+1]-x,h=atlas.rows[row+1]-y;r.tex.repeat.set(w/atlas.width,h/atlas.height);r.tex.offset.set(x/atlas.width,1-(y+h)/atlas.height);sx=w/315;sy=h/315;shift=(atlas.feet[p.frame]-y-h/2)*size/315;horizontal=(w/2-atlas.anchors[p.frame])*size/315*p.flipX*p.scaleX;}
  else{r.tex.repeat.set(p.repeatX,p.repeatY);r.tex.offset.set(p.u,p.v);}
  const delta=(shift-center)*p.scaleY;r.plane.position.set(p.x+horizontal*Math.cos(p.rot)-delta*Math.sin(p.rot),p.y+horizontal*Math.sin(p.rot)+delta*Math.cos(p.rot),0);r.plane.rotation.z=p.rot;r.plane.scale.set(p.flipX*p.scaleX*sx,p.scaleY*sy,1);
 }
 function screenFacing(dx,dz,fallback=1){facingVector.set(dx,0,dz).applyQuaternion(inverseView);return Math.abs(facingVector.x)>.02?Math.sign(facingVector.x):fallback;}
 function makeEnemy(e){const p=profiles[e.type],size=p?p.size:e.type==='boss'?5.8:4.3,aspect=p?p.aspect:.75,tex=articulated(e)?null:(p?creatureTex:enemyTex).clone();if(tex)tex.needsUpdate=true;const r=billboard(tex,size*aspect,size,p?p.center:size*.375);r.size=size;r.profile=p;r.center=p?p.center:size*.375;r.shadow=shadow(e.type==='boss'?1:.55);
  const bg=new T.Mesh(new T.PlaneGeometry(e.type==='boss'?2.5:1.2,.085),new T.MeshBasicMaterial({color:'#1b1827',depthTest:true}));bg.position.set(0,e.type==='boss'?4.9:3.1,.04);r.face.add(bg);
  const fill=new T.Mesh(new T.PlaneGeometry(e.type==='boss'?2.45:1.16,.055),new T.MeshBasicMaterial({color:'#ed7b80',depthTest:true}));fill.position.z=.01;bg.add(fill);r.bar=bg;r.fill=fill;r.flash=solidSprite(r.plane,'#fff5d8',.85);
  r.icons=['moonMark','offBalance','bellMark'].map((name,i)=>{const mesh=new T.Mesh(new T.OctahedronGeometry(.16,0),new T.MeshBasicMaterial({color:['#9ff6ff','#c5a4ff','#ffd085'][i],toneMapped:false,depthTest:true}));mesh.position.set((i-1)*.38,e.type==='boss'?5.25:3.5,.06);r.face.add(mesh);return{name,mesh};});
  r.tell=new T.Group();r.tell.position.set(0,e.type==='boss'?5.65:3.87,.07);r.face.add(r.tell);
  r.beats=Array.from({length:3},(_,i)=>{const m=new T.Mesh(new T.PlaneGeometry(.13,.13),new T.MeshBasicMaterial({color:'#ffc778',depthTest:true,toneMapped:false}));r.tell.add(m);return m;});
  const tellBar=new T.Mesh(new T.PlaneGeometry(.9,.045),new T.MeshBasicMaterial({color:'#ffe7bc',depthTest:true,toneMapped:false}));tellBar.position.y=-.18;r.tell.add(tellBar);r.tellBar=tellBar;
  actors.set(e.id,r);return r;
 }
 function afterimage(){const g=hero.face.clone(),m=g.children[0];for(let i=g.children.length-1;i>0;i--)g.remove(g.children[i]);m.material=m.material.clone();m.material.map=m.material.map.clone();m.material.map.needsUpdate=true;m.material.color.set('#87e8e9');m.material.transparent=true;m.material.opacity=.28;m.material.alphaTest=.06;m.material.depthWrite=false;g.position.copy(hero.base.position);scene.add(g);trail.push({g,m,life:.22});if(trail.length>2)disposeGhost(trail.shift());}
 function disposeGhost(t){scene.remove(t.g);t.m.material.map.dispose();t.m.material.dispose();}
 function emit(e){bossForms?.emit(e);pixelRig?.emit(e);const id=e.targetId||e.sourceId;if(id)enemyRigs.get(id)?.emit?.(e);if(e.type==='catLeap'&&e.to){catFlight={from:e.from?new T.Vector3(e.from.x,e.from.y||0,e.from.z):catPos.clone(),to:new T.Vector3(e.to.x,e.to.y||0,e.to.z),elapsed:0,duration:e.duration||e.travelTime||.12};}}
 function update(game,dt){clock+=dt;cameraBack.set(0,0,1).applyQuaternion(camera.quaternion);if(Math.hypot(cameraBack.x,cameraBack.z)>.001)billboardCamera.quaternion.setFromAxisAngle(vertical,Math.atan2(cameraBack.x,cameraBack.z));inverseView.copy(billboardCamera.quaternion).invert();drawPortrait();const p=game.player,dash=p.dash?.active,moving=Math.hypot(p.vx||0,p.vz||0)>.05,attacking=p.attackPhase!=='idle',casting=p.castTimer>0||p.bowCharging,facing=screenFacing(dash?p.dash.dirX:attacking?p.attackDirX:casting?p.aimDirX:moving?p.vx:p.aimDirX??p.facing,dash?p.dash.dirZ:attacking?p.attackDirZ:casting?p.aimDirZ:moving?p.vz:p.aimDirZ??0,p.facing||1);let actor={...stride(p,'hero',facing,dt),dodgeTimer:dash?Math.max(.001,p.dash.duration-p.dash.elapsed):0,dodgeDuration:p.dash.duration,dodgeDirection:facing};
  if(dash){actor.vx=facing*17;actor.attackPhase='idle';actor.attackTimer=0;}
  else if(p.castTimer>0&&p.attackPhase==='idle'){actor.attackPhase=p.castKind==='nova'&&p.castTimer>.15?'windup':'active';actor.attackTimer=p.castTimer;actor.attackElapsed=.09;actor.combo=p.castKind==='nova'?3:1;}
  hero.base.position.set(p.x,p.y,p.z);hero.face.quaternion.copy(billboardCamera.quaternion);const hp=motion.hero(actor,dt);
  if(p.bowCharging&&!dash){hp.frame=moving?hp.frame:4;hp.rot=-facing*.025;}
  pose(hero,hp,3.5,1.47,heroAtlas);matchSprite(silhouette,hero.plane);
  const bowVisible=!!p.bowCharging&&!dash;bow.visible=bowVisible;if(bowVisible){const charge=p.bowCharge||0;bowAim.set(p.aimDirX,0,p.aimDirZ).applyQuaternion(inverseView);bow.position.set(facing*.64,1.43,.06);bow.scale.x=facing;bow.rotation.z=Math.atan2(bowAim.y,bowAim.x)+(facing<0?Math.PI:0);const v=stringGeometry.attributes.position;v.setXYZ(0,0,.57,0);v.setXYZ(1,-.08-charge*.3,0,0);v.setXYZ(2,0,-.57,0);v.needsUpdate=true;arrowShaft.position.x=.1-charge*.25;arrowTip.position.x=.62-charge*.25;}
  hero.plane.material.color.set(p.hurtTimer>0?'#d6b2a7':'#e6e4dc');hero.plane.material.opacity=1;placeShadow(hero.shadow,p.x,p.y||0,p.z,p.grounded&&Number.isFinite(p.groundY)?p.groundY:supportY(game,p.x,p.y||0,p.z));
  for(let i=trail.length-1;i>=0;i--){const t=trail[i];t.life-=dt;t.m.material.opacity=Math.max(0,t.life)*1.2;if(t.life<=0){disposeGhost(t);trail.splice(i,1);}}
  lastCat.copy(catPos);if(game.catMotion){const c=game.catMotion.position;catPos.set(c.x,c.y,c.z);catFlight=game.catMotion.flight;}
  else if(catFlight){catFlight.elapsed+=dt;const t=Math.min(1,catFlight.elapsed/catFlight.duration);catPos.lerpVectors(catFlight.from,catFlight.to,t);catPos.y+=Math.sin(t*Math.PI)*.7;if(t>=1)catFlight=null;}
  else{const target=new T.Vector3(p.x-1.1,p.y,p.z+.85);catPos.lerp(target,Math.min(1,dt*7));}
  const catFloor=supportY(game,catPos.x,catPos.y,catPos.z,.22),cv=catPos.clone().sub(lastCat),cf=screenFacing(cv.x,cv.z,facing),cp=motion.cat(stride({id:'friend',x:catPos.x,y:catPos.y,z:catPos.z,grounded:!catFlight&&catPos.y<=catFloor+.09,dash:catFlight?.duration||0},'cat',cf,dt),dt);cat.base.position.copy(catPos);cat.face.quaternion.copy(billboardCamera.quaternion);pose(cat,cp,2.4,cp.center);placeShadow(cat.shadow,catPos.x,catPos.y,catPos.z,catFloor);
  pixelRig?.update(game,dt);
  bossForms?.update(game,dt);
  enemyBlades.length=0;
  for(const e of game.enemies){if(e.type==='boss'&&bossForms&&!articulated(e))continue;let r=actors.get(e.id);if(e.spawned===false){if(r){r.base.visible=false;r.shadow.visible=false;}enemyRigs.get(e.id)?.update(e,game,dt);continue;}r=r||makeEnemy(e);const rig=enemyRig(e);if(rig){rig.update(e,game,dt);const blade=rig.getBladeSegment?.();if(blade){blade.entityId=e.id;enemyBlades.push(blade);}const head=e.bossKind==='sweetheart'?3.95:e.type==='boss'?4.6:e.type==='bat'?1.6:e.type==='archer'?2.55:2.45;r.bar.position.y=head+.22;for(const i of r.icons)i.mesh.position.y=head+.43;r.tell.position.y=head+.82;}
   r.plane.visible=!rig;const age=e.deadAge||0,spawning=e.state==='spawning',spawnAlpha=spawning?Math.max(0,1-e.spawnRemaining/e.spawnDuration):1;r.base.visible=(!e.dead||age<.38)&&e.state!=='dormant';r.shadow.visible=e.bossKind==='sweetheart'?e.state!=='dormant':!e.dead;r.base.position.set(e.x,e.y,e.z);r.face.quaternion.copy(billboardCamera.quaternion);placeShadow(r.shadow,e.x,e.y,e.z,e.type==='swimmer'?(game.ponds.find(q=>q.id===e.waterZoneId)?.surface??root.HatTerrain.heightAt(e.x,e.z)):supportY(game,e.x,e.y,e.z,e.radius));
   if(!rig){const ef=screenFacing(e.dirX??e.facing??-1,e.dirZ||0,-1),ea=stride(e,e.id,ef,dt);hitProjection.set(e.hitDirX||0,0,e.hitDirZ||0).applyQuaternion(inverseView);
   const ep=motion.enemy(ea,dt,{height:r.size,width:r.size*(r.profile?1:.75),center:r.center,hitScreenX:hitProjection.x,hitDepth:hitProjection.z});
   if(r.profile){const frame=e.attackTimer>0||e.state==='dive'?3:e.state==='windup'?2:e.type==='bat'?[0,1,2,1][Math.floor(clock*10)%4]:e.type==='swimmer'?Math.floor(clock*6)%2:e.state==='chase'?Math.floor(clock*7)%2:0;ep.u=frame*.25;ep.v=1-(r.profile.row+1)/3;ep.repeatX=.25;ep.repeatY=1/3;}
   pose(r,ep,r.size,ep.center);r.plane.material.color.set(e.parryStaggerTimer>0?'#b6c8ce':e.hitFlash>0?'#e2c7aa':e.state==='windup'?'#d8b7a2':'#e1e2db');r.plane.material.opacity=(e.dead?Math.max(0,1-age/.38):1)*spawnAlpha;if(spawning){r.plane.scale.y*=.55+spawnAlpha*.45;r.plane.position.y-=.15*(1-spawnAlpha);}if(e.dead){r.plane.scale.y*=Math.max(.12,1-age*2);r.plane.rotation.z+=age*1.5*ef;}}r.flash.visible=false;
   r.bar.visible=!e.dead&&e.hp<e.maxHp&&e.type!=='boss';r.fill.scale.x=Math.max(0,e.hp/e.maxHp);
   const winding=e.state==='windup',precontact=e.state==='strike'&&e.strikeElapsed<e.strikeContact,inCombo=['windup','strike','comboGap','charge','dive','swoop','hop'].includes(e.state)||e.attackTimer>0,beats=Math.min(3,e.comboTotal||1),beat=e.comboIndex||0;
   r.tell.visible=!e.dead&&!spawning&&(inCombo||e.exposed);r.tellBar.visible=winding||precontact||!!e.exposed;r.tellBar.scale.x=winding?Math.max(.03,1-e.timer/Math.max(.01,e.windupDuration)):precontact?1:Math.max(.03,e.timer/Math.max(.01,e.recoveryDuration||1));r.tellBar.material.color.set(winding||precontact?'#ffcf8c':'#b5e4cf');
   r.beats.forEach((m,i)=>{m.visible=inCombo&&i<beats;m.position.x=(i-(beats-1)/2)*.23;m.material.color.set(i<beat?'#86696b':i===beat?'#ffe1a4':'#bf7777');m.scale.setScalar(winding&&i===beat?1.08+Math.max(0,.25-e.timer)*2:1);});
   for(const icon of r.icons){const status=e.statuses?.[icon.name],until=typeof status==='number'?status:status?.expiresAt;icon.mesh.visible=!e.dead&&until>game.time;icon.mesh.rotation.z=0;}
  }
 }
 function reset(game){for(const r of enemyRigs.values())r.dispose();enemyRigs.clear();enemyBlades.length=0;bossForms?.reset(game);pixelRig?.reset(game);bow.visible=false;for(const r of actors.values()){scene.remove(r.base,r.shadow);r.base.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});r.shadow.geometry.dispose();r.shadow.material.dispose();r.tex?.dispose();}actors.clear();trail.forEach(disposeGhost);trail.length=0;motion.reset();travel.clear();catFlight=null;const c=game?.catMotion?.position;catPos.set(c?.x??(game?.player.x||0)-1,c?.y??game?.player.y??0,c?.z??(game?.player.z||0)+.7);clock=0;}
 function dispose(){reset();pixelRig?.dispose();bossForms?.dispose();const geometry=new Set(),material=new Set();for(const object of [hero.base,cat.base,hero.shadow,cat.shadow]){scene.remove(object);object.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)material.add(o.material);});}for(const g of geometry)g.dispose();for(const m of material)m.dispose();for(const t of [heroTex,catTex,enemyTex,creatureTex])t.dispose();}
 return{update,emit,reset,dispose,heroPosition:()=>hero.base.position,getBladeSegment:()=>pixelRig?.getBladeSegment()||null,getEnemyBladeSegments:()=>enemyBlades};
}
root.HatActors={create};
})(window);


