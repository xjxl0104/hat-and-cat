(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.HatShoulderCamera=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),finite=(v,f=0)=>Number.isFinite(v)?v:f;
function create({THREE:T,camera,getOccluders=()=>[],getCameraOccluders=getOccluders,targetContact=globalThis.HatGame.projectileTargetContact}){
 const BOOM=4.6,SHOULDER=.82,PIVOT_HEIGHT=1.55,RADIUS=.28,SKIN=.025,MAX_AIM=30,SENSITIVITY=.0024;
 const pivot=new T.Vector3(),forward=new T.Vector3(),right=new T.Vector3(),desired=new T.Vector3(),delta=new T.Vector3(),lookAt=new T.Vector3(),hitPoint=new T.Vector3(),muzzle=new T.Vector3(),aimEnd=new T.Vector3(),aimStart=new T.Vector3(),terrainEnd=new T.Vector3();
 const aimRay=new T.Raycaster(),screenCentre=new T.Vector2(0,0),queryCache=new WeakMap();
 const choices=[{side:SHOULDER,lift:0,bias:0},{side:-SHOULDER,lift:0,bias:.2},{side:0,lift:1.15,bias:.36},{side:SHOULDER,lift:1.15,bias:.42},{side:-SHOULDER,lift:1.15,bias:.5}];
 const desiredDistance=Math.hypot(BOOM,SHOULDER);
 let yaw=0,pitch=-.12,distance=desiredDistance,obstructed=false,lastView=null,initialized=false,dirty=true,followY=1.55;
 let chosen=0,choiceAge=0,preferredClearAge=0,side=SHOULDER,lift=0;
 function basis(){const c=Math.cos(pitch);forward.set(Math.sin(yaw)*c,Math.sin(pitch),-Math.cos(yaw)*c);right.set(Math.cos(yaw),0,Math.sin(yaw));}
 function terrain(game){return game.wilds?globalThis.HatTerrain:null;}
 function groundClearance(game,x,z){const ground=terrain(game);return ground?Math.max(ground.heightAt(x,z),ground.heightAt(x+RADIUS,z),ground.heightAt(x-RADIUS,z),ground.heightAt(x,z+RADIUS),ground.heightAt(x,z-RADIUS))+RADIUS+SKIN*2:RADIUS+SKIN*2;}
 function boxesFor(game,objects){
  const boxes=[],ids=new Set();
  for(const o of game.obstacles||[]){const y=finite(o.y);boxes.push({min:{x:o.x-o.w/2,y:y-.25,z:o.z-o.d/2},max:{x:o.x+o.w/2,y:y+o.height,z:o.z+o.d/2}});if(o.id!==undefined)ids.add(o.id);}
  // World supplies invisible box query meshes, including camera-only canopies.
  // Reuse their analytic bounds; never raycast seven copies of the scene.
  for(const object of objects){
   if(ids.has(object.userData?.solidId))continue;
   const elements=object.matrixWorld?.elements;if(!elements||!object.geometry)continue;
   let cached=queryCache.get(object);
   if(!cached||elements.some((v,i)=>v!==cached.matrix[i])){
    if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
    const box=new T.Box3().copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
    cached={box,matrix:Array.from(elements)};queryCache.set(object,cached);
   }
   boxes.push(cached.box);
  }
  return boxes;
 }
 function inside(from,box,padding=0){return from.x>box.min.x-padding&&from.x<box.max.x+padding&&from.y>box.min.y-padding&&from.y<box.max.y+padding&&from.z>box.min.z-padding&&from.z<box.max.z+padding;}
 function boxDistance(from,dir,box,padding,limit,escape=false){
  let near=-Infinity,far=Infinity;
  for(const axis of ['x','y','z']){
   const low=box.min[axis]-padding,high=box.max[axis]+padding,d=dir[axis],o=from[axis];
   if(Math.abs(d)<1e-8){if(o<low||o>high)return null;continue;}
   let a=(low-o)/d,b=(high-o)/d;if(a>b){const swap=a;a=b;b=swap;}
   near=Math.max(near,a);far=Math.min(far,b);if(near>far)return null;
  }
  if(far<0||near>limit)return null;
  if(near<0&&escape&&!inside(from,box)){
   // A pivot can overlap the safety shell while remaining outside real cover.
   // Permit an outward exit, but never ignore a ray entering the physical wall.
   let outward=false;
   for(const axis of ['x','y','z'])if(from[axis]<=box.min[axis]&&dir[axis]<=0||from[axis]>=box.max[axis]&&dir[axis]>=0)outward=true;
   if(outward&&boxDistance(from,dir,box,0,limit)===null)return null;
  }
  return Math.max(0,near);
 }
 function coverDistance(from,dir,limit,boxes,padding=0,escape=false){
  let nearest=null;
  for(const box of boxes){const hit=boxDistance(from,dir,box,padding,nearest===null?limit:nearest,escape);if(hit!==null&&(nearest===null||hit<nearest))nearest=hit;}
  return nearest;
 }
 function safePivot(game,boxes){
  // Lift immediately with uphill terrain, then move an overlapping camera
  // anchor to the closest free face. Player bounds never constrain the camera.
  for(let pass=0;pass<8;pass++){
   pivot.y=Math.max(pivot.y,groundClearance(game,pivot.x,pivot.z));let moved=false;
   for(const box of boxes){
    if(!inside(pivot,box,RADIUS+SKIN))continue;
    let smallest=Infinity,axisToMove='y',value=pivot.y;
    for(const axis of ['x','y','z'])for(const edge of [box.min[axis]-RADIUS-SKIN,box.max[axis]+RADIUS+SKIN]){
     const gap=Math.abs(edge-pivot[axis]);if(gap<smallest){smallest=gap;axisToMove=axis;value=edge;}
    }
    pivot[axisToMove]=value;moved=true;
   }
   if(!moved)break;
  }
  pivot.y=Math.max(pivot.y,groundClearance(game,pivot.x,pivot.z));
 }
 function floorDistance(from,dir,game,padding=0,limit=MAX_AIM){
  const ground=terrain(game);
  if(ground){terrainEnd.copy(from).addScaledVector(dir,limit);const hit=ground.segmentContact(from,terrainEnd,padding);return hit?hit.t*limit:null;}
  if(dir.y>=-1e-8)return null;
  const b=game.bounds,ponds=game.ponds||[],inPond=(x,z,q)=>x>q.x-q.w/2&&x<q.x+q.w/2&&z>q.z-q.d/2&&z<q.z+q.d/2;
  const groundT=(padding-from.y)/dir.y,gx=from.x+dir.x*groundT,gz=from.z+dir.z*groundT;
  let nearest=groundT>=0&&groundT<=limit&&(!b||(gx>=b.minX&&gx<=b.maxX&&gz>=b.minZ&&gz<=b.maxZ))&&!ponds.some(q=>inPond(gx,gz,q))?groundT:null;
  for(const pond of ponds){const t=(finite(pond.bottom,-2.25)+padding-from.y)/dir.y,x=from.x+dir.x*t,z=from.z+dir.z*t;if(t>=0&&t<=limit&&inPond(x,z,pond)&&(nearest===null||t<nearest))nearest=t;}
  return nearest;
 }
 function boom(game,boxes,shoulder,height){
  desired.copy(pivot).addScaledVector(forward,-BOOM).addScaledVector(right,shoulder);desired.y+=height;
  delta.copy(desired).sub(pivot);const length=delta.length();delta.divideScalar(length);
  const cover=coverDistance(pivot,delta,length,boxes,RADIUS,true),ground=floorDistance(pivot,delta,game,RADIUS+SKIN,length);
  let allowed=length;if(cover!==null)allowed=Math.min(allowed,Math.max(0,cover-SKIN));if(ground!==null)allowed=Math.min(allowed,Math.max(0,ground-SKIN));
  return {allowed,length};
 }
 function place(view,dt,snap=false){
  if(!view?.player)return;
  lastView=view;const p=view.player,time=clamp(finite(dt),0,.1);basis();
  const ground=terrain(view),support=finite(p.groundY,ground?ground.heightAt(p.x,p.z):0),air=Math.max(0,finite(p.y)-support),targetY=support+PIVOT_HEIGHT+Math.min(.48,air*.32);
  if(snap)followY=targetY;else if(time>0)followY+=(targetY-followY)*(1-Math.exp(-12*time));
  pivot.set(p.x,Math.max(followY,groundClearance(view,p.x,p.z)),p.z);
  const boxes=boxesFor(view,getCameraOccluders()||[]);safePivot(view,boxes);
  const options=choices.map(c=>boom(view,boxes,c.side,c.lift));choiceAge+=time;
  preferredClearAge=options[0].allowed>desiredDistance-.05?preferredClearAge+time:0;
  let best=chosen;
  const score=i=>Math.min(desiredDistance,options[i].allowed)-choices[i].bias;
  for(let i=0;i<choices.length;i++)if(score(i)>score(best))best=i;
  // Keep the current shoulder at pillar edges. Change only for useful extra
  // clearance, or return to the preferred shoulder after a stable clear span.
  if(best!==chosen&&(snap||score(best)>score(chosen)+.52&&(choiceAge>.15||options[chosen].allowed<1.2)||best===0&&choiceAge>.45&&preferredClearAge>.35&&score(best)>score(chosen)+.12)){
   chosen=best;choiceAge=0;
  }
  const blend=snap?1:1-Math.exp(-10*time);
  side+=(choices[chosen].side-side)*blend;lift+=(choices[chosen].lift-lift)*blend;
  const current=boom(view,boxes,side,lift),allowed=current.allowed;
  obstructed=allowed<current.length-.03||chosen!==0;
  // Every intermediate shoulder position is checked. Contract on the current
  // frame; extend gently. No minimum boom can force the camera through cover.
  distance=snap||allowed<distance?allowed:distance+(allowed-distance)*(1-Math.exp(-9*time));
  camera.position.copy(pivot).addScaledVector(delta,distance);
  lookAt.copy(camera.position).add(forward);camera.lookAt(lookAt);camera.updateMatrixWorld(true);dirty=false;
 }
 function reset(game){
  const p=game?.player;if(!p)return;
  const b=game.bounds,boss=game.wilds?.bossEntered?game.enemies.find(e=>e.type==='boss'&&!e.dead):null,cx=boss?boss.x:b?(b.minX+b.maxX)/2:0,cz=boss?boss.z:b?(b.minZ+b.maxZ)/2:0;
  yaw=Math.hypot(cx-p.x,cz-p.z)>.01?Math.atan2(cx-p.x,-(cz-p.z)):Math.atan2(finite(p.aimDirX),-finite(p.aimDirZ,-1));
  pitch=-.12;distance=desiredDistance;chosen=0;choiceAge=0;preferredClearAge=0;side=SHOULDER;lift=0;initialized=true;place(game,0,true);
 }
 function look(dx,dy){yaw+=finite(dx)*SENSITIVITY;yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));pitch=clamp(pitch-finite(dy)*SENSITIVITY,-.75,.50);dirty=true;}
 function update(view,dt){
  if(!initialized){reset(view);return;}
  // An input refresh changes look, not the displayed interpolated player pose.
  if(!(dt>0)){if(dirty)place(lastView||view,0);return;}place(view,dt);
 }
 function movement(horizontal,vertical){const h=finite(horizontal),v=finite(vertical);return{x:Math.cos(yaw)*h+Math.sin(yaw)*v,z:Math.sin(yaw)*h-Math.cos(yaw)*v};}
 function aim(game){
  if(!initialized)reset(game);else if(dirty)place(lastView||game,0);
  aimRay.setFromCamera(screenCentre,camera);
  const from=aimRay.ray.origin,dir=aimRay.ray.direction,boxes=boxesFor(game,getOccluders()||[]),p=game.player;muzzle.set(p.x,finite(p.y)+1.45,p.z);
  const aimNear=clamp(delta.copy(muzzle).sub(from).dot(dir)+.2,.1,MAX_AIM-.01);
  let nearest=MAX_AIM,targetId=null,blocked=false;
  const worldHit=coverDistance(from,dir,nearest,boxes);if(worldHit!==null){nearest=worldHit;blocked=true;}
  const floorHit=floorDistance(from,dir,game);if(floorHit!==null&&floorHit<nearest){nearest=floorHit;blocked=false;}
  aimStart.copy(from).addScaledVector(dir,aimNear);aimEnd.copy(from).addScaledVector(dir,MAX_AIM);
  for(const enemy of game.enemies||[]){
   if(!enemy.spawned||enemy.dead||enemy.state==='spawning'||enemy.state==='dormant')continue;
   const fraction=targetContact(aimStart,aimEnd,enemy);if(fraction===null)continue;
   const t=aimNear+fraction*(MAX_AIM-aimNear);if(t<nearest){nearest=t;targetId=enemy.id;blocked=false;}
  }
  if(nearest<aimNear){nearest=aimNear;targetId=null;blocked=true;}
  hitPoint.copy(from).addScaledVector(dir,nearest);delta.copy(hitPoint).sub(muzzle);const travel=delta.length();
  if(travel>.001){delta.divideScalar(travel);const muzzleHit=coverDistance(muzzle,delta,travel,boxes,.15),muzzleFloor=floorDistance(muzzle,delta,game,.15,travel);if(muzzleHit!==null&&muzzleHit<travel-.04||targetId!==null&&muzzleFloor!==null&&muzzleFloor<travel-.04)blocked=true;}
  return{x:hitPoint.x,y:hitPoint.y,z:hitPoint.z,targetId,blocked};
 }
 function getState(){return{yaw,pitch,distance,desiredDistance,obstructed,shoulder:side,lift,forwardX:Math.sin(yaw),forwardZ:-Math.cos(yaw),rightX:Math.cos(yaw),rightZ:Math.sin(yaw)};}
 return{look,update,reset,aim,movement,getState};
}
return{create};
});
