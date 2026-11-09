(function(root){'use strict';
// Fixed-step simulation remains authoritative. This module only samples a view
// between its last two poses; it never writes into gameplay state.
function create(){
 const previous=new Map(),views=new Map(),projectileViews=new Map(),view={enemies:[],projectiles:[]},playerView={},dashView={},catView={},catPosition={};
 let previousPlayer=null,previousCat=null;
 const save=a=>({x:a.x,y:a.y||0,z:a.z,attackId:a.attackId,attackElapsed:a.attackElapsed,attackPhase:a.attackPhase,attackTimer:a.attackTimer,strikeId:a.strikeId,strikeElapsed:a.strikeElapsed,contactReached:a.contactReached,timer:a.timer,state:a.state,dashId:a.dash?.id,dashElapsed:a.dash?.elapsed});
 function capture(s){
  previousPlayer=save(s.player);previousCat=s.catMotion?save(s.catMotion.position):null;previous.clear();
  for(const e of s.enemies)previous.set('e:'+e.id,save(e));for(const p of s.projectiles)previous.set('p:'+p.id,save(p));
 }
 function position(out,current,old,t){
  if(!old||Math.hypot(current.x-old.x,current.z-old.z)>5){out.x=current.x;out.y=current.y||0;out.z=current.z;return out;}
  out.x=old.x+(current.x-old.x)*t;out.y=old.y+((current.y||0)-old.y)*t;out.z=old.z+(current.z-old.z)*t;return out;
 }
 function sample(s,alpha){
  // On the impact frame and throughout hitstop, sample the exact contact pose.
  // Interpolating behind that pose would make a frozen weapon land after its hit.
  const t=s.impactFrozen||s.hitStop>0?1:Math.max(0,Math.min(1,alpha)),enemies=view.enemies,projectiles=view.projectiles;
  Object.assign(view,s);view.enemies=enemies;view.projectiles=projectiles;enemies.length=0;projectiles.length=0;
  Object.assign(playerView,s.player);position(playerView,s.player,previousPlayer,t);Object.assign(dashView,s.player.dash);playerView.dash=dashView;
  playerView.groundY=root.HatGame.supportHeight(s,playerView.x,playerView.z,Math.max(playerView.y,s.player.groundY)+.03,playerView.radius);
  if(previousPlayer?.dashId===dashView.id&&dashView.active)dashView.elapsed=previousPlayer.dashElapsed+(dashView.elapsed-previousPlayer.dashElapsed)*t;
  if(previousPlayer?.attackId===playerView.attackId&&previousPlayer.attackPhase===playerView.attackPhase)playerView.attackElapsed=previousPlayer.attackElapsed+(playerView.attackElapsed-previousPlayer.attackElapsed)*t;
  view.player=playerView;
  for(const e of s.enemies){
   let v=views.get(e.id);if(!v){v={};views.set(e.id,v);}const old=previous.get('e:'+e.id);Object.assign(v,e);position(v,e,old,t);
   const sameMove=old?.state===e.state&&old.strikeId===e.strikeId;
   if(sameMove&&Number.isFinite(old.timer))v.timer=old.timer+(e.timer-old.timer)*t;
   if(sameMove&&e.strikeId&&Number.isFinite(old.strikeElapsed)){
    v.strikeElapsed=old.strikeElapsed+(e.strikeElapsed-old.strikeElapsed)*t;
    // Contact flags are discrete. Once the authoritative event has fired, do
    // not render the projectile or hit with the weapon still before release.
    if(e.contactReached&&!old.contactReached)v.strikeElapsed=Math.max(v.strikeElapsed,e.strikeContact);
    if(['strike','hop','dive','swoop','charge'].includes(e.state))v.timer=v.attackTimer=Math.max(0,e.strikeDuration-v.strikeElapsed);
   }
   enemies.push(v);
  }
  const live=new Set();for(const p of s.projectiles){live.add(p.id);let v=projectileViews.get(p.id);if(!v){v={};projectileViews.set(p.id,v);}Object.assign(v,p);position(v,p,previous.get('p:'+p.id),t);projectiles.push(v);}for(const id of projectileViews.keys())if(!live.has(id))projectileViews.delete(id);
  if(s.catMotion){Object.assign(catView,s.catMotion);position(catPosition,s.catMotion.position,previousCat,t);catView.position=catPosition;view.catMotion=catView;}
  return view;
 }
 function reset(s){previous.clear();views.clear();projectileViews.clear();previousPlayer=null;previousCat=null;if(s)capture(s);}
 return{capture,sample,reset};
}
root.HatRenderState={create};
})(window);
