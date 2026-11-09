(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.HatControls=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function create({canvas,host=window,document=host.document,getPhase,onStart,onPause,onChoose,onCancel,aimPoint,onLook,onCaptureChange}){
 const keys=new Set(),mouse=new Set(),taps={},map={Space:'dash',KeyQ:'starfall',KeyF:'interact'},expectedCaptureLoss=new Set();
 const now=()=>host.performance?.now?.()??Date.now();
 let pointerX=null,pointerY=null,pointerInside=false,pointerBlocked=true,wantsCapture=false,locked=false,mode='free',requestSerial=0,pending=false,requestTime=0,ignoreEscapeUntil=0,lastEdgeTime=now(),externalUpdate=false;
 let fallbackX=null,fallbackY=null,dragPointerId=null,seedRelative=true,lockEventTime=0;
 const isCaptured=()=>document.pointerLockElement===canvas;
 function seedMotion(){fallbackX=null;fallbackY=null;seedRelative=true;lastEdgeTime=now();}
 function report(next){
  const actual=next==='locked'&&isCaptured();
  if(mode!==next||locked!==actual){seedMotion();locked=actual;mode=next;onCaptureChange?.(actual,next);}
 }
 function releaseDrag(){
  const id=dragPointerId;dragPointerId=null;
  if(id===null)return;
  try{if(canvas.hasPointerCapture?.(id)){expectedCaptureLoss.add(id);canvas.releasePointerCapture?.(id);}}catch(error){expectedCaptureLoss.delete(id);}
 }
 // A room input reset cancels actions but retains the requested look mode.
 function clear(){keys.clear();mouse.clear();pointerBlocked=true;seedMotion();releaseDrag();for(const key of Object.keys(taps))delete taps[key];onCancel?.();}
 function pauseIfPlaying(){if(['play','treasure'].includes(getPhase()))onPause?.();}
 function acceptLock(eventTime=0){
  if(!isCaptured())return false;
  if(!wantsCapture||!['play','loading'].includes(getPhase())){try{document.exitPointerLock?.();}catch(error){}return false;}
  pending=false;pointerInside=false;releaseDrag();if(eventTime>0)lockEventTime=eventTime;report('locked');return true;
 }
 function fallback(serial){
  if(serial!==requestSerial)return;
  pending=false;
  if(isCaptured()){acceptLock();return;}
  if(wantsCapture)report('edge');
 }
 function expireRequest(){
  // Legacy requestPointerLock() returns void. If the browser sends no result,
  // fallback stays usable and the next gesture is allowed to retry the request.
  if(pending&&now()-requestTime>1200){pending=false;requestSerial++;if(wantsCapture&&!isCaptured())report('edge');}
 }
 function capture(){
  if(getPhase()!=='play')return false;
  wantsCapture=true;lastEdgeTime=now();
  if(isCaptured()){acceptLock();return true;}
  report('edge');expireRequest();if(pending||typeof canvas.requestPointerLock!=='function')return false;
  const serial=++requestSerial;pending=true;requestTime=now();
  try{
   // Keep file:// and older browsers compatible; no raw-input option required.
   const request=canvas.requestPointerLock();
   if(request?.then)request.then(()=>{
    if(serial===requestSerial){pending=false;if(isCaptured())acceptLock();}
    else if(!wantsCapture&&isCaptured()){try{document.exitPointerLock?.();}catch(error){}}
   },()=>fallback(serial));
  }catch(error){fallback(serial);}
  return isCaptured();
 }
 function release(){
  wantsCapture=false;pending=false;requestSerial++;clear();pointerInside=false;pointerX=null;pointerY=null;
  report('free');
  if(isCaptured()){try{document.exitPointerLock?.();}catch(error){}}
 }
 document.addEventListener('pointerlockchange',e=>{
  const hadLock=locked;pending=false;
  if(isCaptured()){acceptLock(Number.isFinite(e.timeStamp)?e.timeStamp:0);return;}
  report(wantsCapture?'edge':'free');
  if(hadLock){
   clear();ignoreEscapeUntil=now()+450;
   // Native Escape may arrive before or after pointerlockchange. Only the
   // active phase pauses; its paired keydown must never immediately resume.
   if(wantsCapture){wantsCapture=false;report('free');pauseIfPlaying();}
  }
 });
 document.addEventListener('pointerlockerror',()=>{if(!isCaptured())fallback(requestSerial);});
 host.addEventListener('keydown',e=>{
  const phase=getPhase(),interactive=/BUTTON|INPUT|SELECT|TEXTAREA/.test(e.target?.tagName||'')||e.target?.isContentEditable;
  if(e.code==='Escape'){
   if(e.repeat||now()<ignoreEscapeUntil)return;
   const captured=isCaptured();clear();
   if(captured){ignoreEscapeUntil=now()+450;pauseIfPlaying();release();}
   else if(phase==='loading'&&wantsCapture)release();
   else if(['play','treasure','paused','rest'].includes(phase))onPause?.();
   return;
  }
  if(phase==='upgrade'){const index=['Digit1','Digit2','Digit3'].indexOf(e.code);if(index>=0&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();onChoose?.(index);}return;}
  if(interactive)return;
  if((e.code==='Enter'||e.code==='Space')&&phase==='ready'){if(!e.repeat){e.preventDefault();onStart?.();}return;}
  if(phase!=='play'||e.ctrlKey||e.metaKey||e.altKey)return;
  if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  keys.add(e.code);if(map[e.code])taps[map[e.code]]=true;
 });
 host.addEventListener('keyup',e=>keys.delete(e.code));
 function loseFocus(){release();pauseIfPlaying();}
 host.addEventListener('blur',loseFocus);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus();});
 function syncButtons(e){
  if(pointerBlocked||getPhase()!=='play')return;
  // Movement never starts an attack or revives a canceled guard/bow draw.
  if(!(e.buttons&1))mouse.delete(0);if(!(e.buttons&2))mouse.delete(2);
 }
 canvas.addEventListener('contextmenu',e=>{if(getPhase()==='play')e.preventDefault();});
 canvas.addEventListener('pointerdown',e=>{
  if(getPhase()!=='play'||e.pointerType==='touch'||![0,2].includes(e.button))return;
  pointerBlocked=false;pointerX=e.clientX;pointerY=e.clientY;pointerInside=true;
  syncButtons(e);mouse.add(e.button);taps[e.button===0?'attack':'secondary']=true;
  canvas.focus();capture();
  if(!isCaptured()){
   try{if(canvas.setPointerCapture){canvas.setPointerCapture(e.pointerId);dragPointerId=e.pointerId;}}catch(error){dragPointerId=null;}
  }
 });
 // Pointerdown fires only for the first mouse button; mousedown adds chords.
 canvas.addEventListener('mousedown',e=>{
  if(getPhase()!=='play'||pointerBlocked||![0,2].includes(e.button)||mouse.has(e.button)||e.sourceCapabilities?.firesTouchEvents)return;
  mouse.add(e.button);taps[e.button===0?'attack':'secondary']=true;
 });
 document.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  syncButtons(e);
  if(isCaptured()){fallbackX=null;fallbackY=null;return;}
  const rect=canvas.getBoundingClientRect(),wasInside=pointerInside,dragging=dragPointerId!==null&&e.pointerId===dragPointerId;
  pointerX=e.clientX;pointerY=e.clientY;
  pointerInside=pointerX>=rect.left&&pointerX<=rect.right&&pointerY>=rect.top&&pointerY<=rect.bottom;
  if(mode==='edge'&&wantsCapture&&getPhase()==='play'&&(pointerInside||dragging)){
   // Absolute cursor differences are reliable in fallback, including captured
   // drags outside the canvas. Seed transitions/entry; preserve fast motions.
   if((wasInside||dragging)&&fallbackX!==null&&fallbackY!==null){
    const dx=pointerX-fallbackX,dy=pointerY-fallbackY;
    if(Number.isFinite(dx)&&Number.isFinite(dy))onLook?.(dx*.8,dy*.8);
   }
   fallbackX=pointerX;fallbackY=pointerY;
  }else{fallbackX=null;fallbackY=null;}
 });
 document.addEventListener('mousemove',e=>{
  if(getPhase()!=='play'||!wantsCapture||mode!=='locked'||!isCaptured())return;
  // Drop only the first nonzero packet after a lock/reset and queued pre-lock
  // events. Browser recenter deltas must not become a huge yaw/pitch jump.
  // Once seeded, no magnitude clamp discards legitimate fast mouse turns.
  if(Number.isFinite(e.timeStamp)&&e.timeStamp<lockEventTime)return;
  const dx=Number.isFinite(e.movementX)?e.movementX:0,dy=Number.isFinite(e.movementY)?e.movementY:0;
  if(!dx&&!dy)return;
  if(seedRelative){seedRelative=false;return;}
  onLook?.(dx,dy);
 });
 canvas.addEventListener('pointerleave',()=>{if(!isCaptured()){pointerInside=false;if(dragPointerId===null){fallbackX=null;fallbackY=null;}}});
 host.addEventListener('pointerup',e=>{if(e.pointerType==='touch')return;syncButtons(e);if(!e.buttons){pointerBlocked=false;releaseDrag();}});
 host.addEventListener('mouseup',e=>{if(!e.sourceCapabilities?.firesTouchEvents)syncButtons(e);});
 canvas.addEventListener('pointercancel',e=>{
  if(e.pointerType==='touch')return;
  // Acquiring pointer lock cancels any fallback pointer capture; this does not
  // cancel held movement, a right-button guard, or the gesture that requested it.
  if(isCaptured()&&wantsCapture){releaseDrag();return;}
  clear();pointerInside=false;
 });
 canvas.addEventListener('lostpointercapture',e=>{
  if(expectedCaptureLoss.delete(e.pointerId))return;
  if(isCaptured()&&wantsCapture){if(dragPointerId===e.pointerId)dragPointerId=null;return;}
  if(dragPointerId===e.pointerId){dragPointerId=null;clear();pointerInside=false;}
 });
 function edgeLook(elapsed){
  expireRequest();
  const time=now(),dt=Math.min(.05,Math.max(0,Number.isFinite(elapsed)?elapsed:(time-lastEdgeTime)/1000));lastEdgeTime=time;
  if(mode!=='edge'||!wantsCapture||isCaptured()||getPhase()!=='play'||(!pointerInside&&dragPointerId===null)||pointerX===null)return;
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const x=(pointerX-rect.left)/rect.width*2-1,y=(pointerY-rect.top)/rect.height*2-1;
  const edge=v=>Math.sign(v)*Math.max(0,Math.min(1,(Math.abs(v)-.72)/.28));
  onLook?.(edge(x)*650*dt,edge(y)*500*dt);
 }
 function update(dt){externalUpdate=true;edgeLook(dt);}
 function read(consume=true){
  if(!externalUpdate)edgeLook();const active=getPhase()==='play';
  const input={left:active&&(keys.has('KeyA')||keys.has('ArrowLeft')),right:active&&(keys.has('KeyD')||keys.has('ArrowRight')),up:active&&(keys.has('KeyW')||keys.has('ArrowUp')),down:active&&(keys.has('KeyS')||keys.has('ArrowDown')),attack:active&&mouse.has(0),secondary:active&&mouse.has(2)};
  if(consume){if(active)Object.assign(input,taps);for(const key of Object.keys(taps))delete taps[key];}
  const point=aimPoint?.(pointerX,pointerY);
  if(point&&Number.isFinite(point.x)&&Number.isFinite(point.z)){input.aimX=point.x;input.aimZ=point.z;if(Number.isFinite(point.y))input.aimY=point.y;input.aimTargetId=point.targetId??null;}
  return input;
 }
 return{clear,read,capture,release,isCaptured,update};
}
return{create};
});
