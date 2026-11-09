(function(root){'use strict';
function create({THREE:T,camera}){
 const reticle=document.getElementById('reticle'),label=document.getElementById('aim-label'),layer=document.getElementById('threats'),inverse=new T.Quaternion(),position=new T.Vector3(),local=new T.Vector3();
 const markers=Array.from({length:3},()=>{const el=document.createElement('span');el.className='threat';el.setAttribute('aria-hidden','true');el.innerHTML='<i></i><b></b>';layer.append(el);return el;});
 const candidates=[];
 function update(game,aim){
  const p=game.player,playing=game.phase==='play',bow=p.weaponMode==='bow';reticle.hidden=!playing;layer.hidden=!playing;if(!playing)return;
  const target=aim?.targetId?game.enemies.find(e=>e.id===aim.targetId&&!e.dead):null,distance=target?Math.hypot(target.x-p.x,target.z-p.z):0,arrowDistance=aim?Math.hypot(aim.x-p.x,aim.y-p.y-1.45,aim.z-p.z):Infinity,swordRange=(root.HatGame.ATTACKS[Math.max(0,(p.combo||1)-1)]?.range||1.9)+(target?.radius||.43);
  reticle.classList.toggle('sword-mode',!bow);reticle.classList.toggle('guarding',!!p.guardActive);reticle.classList.toggle('on-target',!!target&&!aim.blocked&&(bow?arrowDistance<=14:distance<=swordRange));reticle.classList.toggle('blocked',bow&&!!aim?.blocked);reticle.classList.toggle('charging',!!p.bowCharging);
  reticle.style.setProperty('--draw',Math.round((p.bowCharge||0)*100)+'%');
  label.textContent=bow?(aim?.blocked?'掩体挡住箭路':target&&arrowDistance>14?'超出弓程':p.bowCharging?'蓄箭 '+Math.round((p.bowCharge||0)*100)+'%':target?'目标 · '+Math.round(distance)+' 步':''):target&&distance<=swordRange&&!aim?.blocked?'剑锋可及':'';
  inverse.copy(camera.quaternion).invert();candidates.length=0;
  for(const e of game.enemies){
   if(e.dead||e.spawned===false||e.state==='spawning'||e.state==='dormant')continue;
   const distance=Math.hypot(e.x-p.x,e.z-p.z);if(distance>13)continue;
   position.set(e.x,e.y+.9,e.z);local.copy(position).sub(camera.position).applyQuaternion(inverse);position.project(camera);
   if(local.z<0&&Math.abs(position.x)<.88&&Math.abs(position.y)<.82)continue;
   const angle=Math.atan2(local.x,-local.z),urgent=e.state==='windup'||e.state==='comboGap'||e.attackTimer>0;
   candidates.push({angle,distance,urgent,behind:local.z>=0,unblockable:urgent&&!!e.unblockable});
  }
  candidates.sort((a,b)=>Number(b.urgent)-Number(a.urgent)||a.distance-b.distance);
  markers.forEach((el,i)=>{const t=candidates[i];el.hidden=!t;if(!t)return;el.style.left=(50+Math.sin(t.angle)*43)+'%';el.style.top=(50-Math.cos(t.angle)*37)+'%';el.classList.toggle('urgent',t.urgent);el.classList.toggle('unblockable',t.unblockable);el.firstElementChild.style.transform=t.unblockable?'none':'rotate('+t.angle+'rad)';el.lastElementChild.textContent=t.unblockable?'快翻滚':t.urgent?'蓄势':t.behind?'身后':'';});
 }
 return{update};
}
root.HatShoulderHUD={create};
})(window);
