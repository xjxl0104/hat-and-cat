(function(root){'use strict';
// Presentation-only impulses: never feed these offsets back into aim or collision.
function create({reduced=false}={}){
 const seen=new Set(),order=[];let age=0,duration=.16,strength=0,side=1;
 function emit(e){
  if(reduced||!e||e.origin==='reaction')return;
  let amount=0,life=.16;
  if(e.type==='hit'){
   if(e.owner&&e.owner!=='player'||!(e.value>0||e.damage>0))return;
   amount=e.attackCounter?.09:e.heavy?.075:e.sourceSkill==='blade'?.04:.025;
   life=e.attackCounter||e.heavy?.19:.14;
  }else if(e.type==='hurt'){amount=e.heavy?.095:.06;life=.19;}
  else if(e.type==='parry'){amount=.055;life=.16;}
  else if(e.type==='block')amount=.025;
  else if(e.type==='guardBreak'){amount=.075;life=.2;}
  if(!amount)return;
  // One sword stroke hitting several enemies must not multiply the shake.
  const id=e.rootActionId??e.actionId??e.eventId,key=id==null?null:e.type+':'+id;
  if(key!==null){if(seen.has(key))return;seen.add(key);order.push(key);if(order.length>64)seen.delete(order.shift());}
  const remaining=strength*Math.pow(Math.max(0,1-age/duration),2);
  strength=Math.min(.095,Math.max(remaining,amount));duration=life;age=0;
  side=(Number.isFinite(e.dirX)&&Math.abs(e.dirX)>.05?e.dirX:e.direction??1)<0?-1:1;
 }
 function sample(){
  if(reduced||!strength)return{x:0,y:0};
  const t=Math.min(1,age/duration),envelope=strength*(1-t)*(1-t);
  // Two small settling motions, with no roll, zoom or full-screen flash.
  const x=side*Math.cos(t*Math.PI*3),y=Math.sin(t*Math.PI*4+.6)*.45;
  const norm=Math.max(1,Math.hypot(x,y));return{x:x/norm*envelope,y:y/norm*envelope};
 }
 function update(dt){if(Number.isFinite(dt)&&dt>0){age=Math.min(duration,age+Math.min(dt,.1));if(age>=duration)strength=0;}return sample();}
 function reset(){age=strength=0;seen.clear();order.length=0;}
 return{emit,update,sample,reset};
}
root.HatImpactCamera={create};
})(typeof window!=='undefined'?window:globalThis);
