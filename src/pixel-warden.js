(function(root){'use strict';
// World-space articulated Warden. The collision engine owns the root, including
// charge travel; this rig only moves joints inside/around that physical body.
// Eighteen opaque pixel meshes, made once: armor 3, arms 4, equipment 2,
// legs 6, cape 3. +Z is forward, matching pixel-hero and the AI's locked aim.
function create({THREE:T,scene}){
 const kit=root.HatEnemyRigKit.create({THREE:T,scene}),base=kit.root,group=kit.group,blocks=kit.blocks;
 base.name='pixel-iron-warden';
 const C={ink:'#202a35',joint:'#303a46',iron:'#505f70',light:'#81909d',edge:'#b1b7b8',steel:'#abbcc5',blade:'#deded0',gold:'#ad8e5b',goldLight:'#dcc28c',wine:'#703f50',wineDark:'#482e40',wineLight:'#915461',eye:'#d2a777'};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},finite=(n,d=0)=>Number.isFinite(n)?n:d;
 const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a)),damp=(a,b,rate,dt)=>mix(a,b,1-Math.exp(-rate*dt));
 const balance=group(base),pelvis=group(balance,0,2.05,0),chest=group(pelvis,0,.30,0),head=group(chest,0,1.10,0);
 blocks(pelvis,[
  [0,0,0,1.14,.40,.70,C.joint],[0,.17,0,1.25,.16,.79,C.gold],
  [0,.19,.425,.24,.20,.12,C.goldLight],[-.39,-.20,.38,.40,.52,.16,C.iron],[.39,-.20,.38,.40,.52,.16,C.iron],
  [-.41,-.39,.40,.43,.13,.18,C.light],[.41,-.39,.40,.43,.13,.18,C.light],
  [-.62,-.18,0,.18,.52,.65,C.iron],[.62,-.18,0,.18,.52,.65,C.iron],
  [0,-.28,-.39,.80,.55,.12,C.joint]
 ]);
 blocks(chest,[
  [0,.38,0,1.25,.98,.72,C.iron],[0,.68,.03,1.40,.30,.79,C.iron],
  [0,.87,.01,1.12,.12,.69,C.light],[0,.78,.43,1.08,.10,.08,C.edge],
  [-.50,.42,.40,.16,.63,.09,C.light],[.50,.42,.40,.16,.63,.09,C.light],
  [0,.19,.41,.84,.16,.10,C.joint],[0,.03,.39,.99,.12,.10,C.light],
  [0,.48,.44,.38,.50,.09,C.gold],[0,.48,.50,.14,.36,.05,C.goldLight],
  [0,.50,.51,.33,.10,.05,C.goldLight],[0,.18,.48,.14,.13,.08,C.gold],
  [0,.40,-.40,.79,.74,.11,C.joint],[0,.97,0,.35,.22,.35,C.joint]
 ]);
 blocks(head,[
  [0,.32,0,.78,.82,.65,C.iron],[0,.68,-.03,.65,.16,.60,C.light],
  [0,.80,-.03,.46,.10,.46,C.edge],[0,.36,.35,.83,.32,.11,C.ink],
  [0,.42,.42,.60,.06,.045,C.eye],[0,.46,.43,.64,.055,.045,C.ink],
  [0,.32,.45,.13,.65,.10,C.edge],[-.29,.12,.37,.15,.20,.10,C.light],[.29,.12,.37,.15,.20,.10,C.light],
  [-.43,.34,-.02,.14,.47,.48,C.joint],[.43,.34,-.02,.14,.47,.48,C.joint],
  [-.46,.64,-.08,.14,.37,.17,C.light],[.46,.64,-.08,.14,.37,.17,C.light],
  [-.52,.82,-.10,.12,.25,.15,C.edge],[.52,.82,-.10,.12,.25,.15,C.edge],
  [0,.95,-.08,.14,.32,.31,C.gold],[0,1.10,-.08,.11,.10,.22,C.goldLight]
 ]);
 const legs=[];
 for(const side of [-1,1]){
  const thigh=group(pelvis,side*.48,-.10,0),shin=group(thigh,0,-.91,0),foot=group(shin,0,-.91,0);
  blocks(thigh,[[0,-.36,0,.43,.78,.49,C.joint],[0,-.34,.24,.44,.65,.16,C.iron],[side*.16,-.34,.33,.08,.56,.04,C.light],
   [0,-.80,.17,.51,.25,.45,C.light],[0,-.80,.40,.28,.18,.07,C.iron]]);
  blocks(shin,[[0,-.39,0,.35,.73,.36,C.joint],[0,-.40,.19,.41,.71,.18,C.iron],[side*.12,-.38,.29,.09,.61,.055,C.light],
   [0,-.69,.20,.44,.12,.22,C.edge],[0,-.12,.24,.35,.11,.10,C.light]]);
  blocks(foot,[[0,-.10,.08,.49,.24,.65,C.iron],[0,-.13,.37,.52,.18,.37,C.joint],[0,-.23,.19,.54,.08,.87,C.ink],
   [0,-.045,.39,.49,.065,.31,C.light],[0,-.115,.55,.48,.07,.06,C.edge]]);
  legs.push({thigh,shin,foot,side});
 }
 const arms=[];
 for(const side of [-1,1]){
  const arm=group(chest,side*.86,.72,0),forearm=group(arm,0,-.84,0);
  blocks(arm,[[0,-.28,0,.39,.65,.43,C.joint],[side*.08,-.02,0,.65,.39,.69,C.iron],[side*.09,.18,0,.52,.11,.62,C.light],
   [side*.12,-.10,.37,.51,.12,.07,C.edge],[side*.18,-.29,.03,.35,.18,.57,C.iron],
   [0,-.59,.15,.41,.33,.32,C.iron],[0,-.78,.12,.44,.17,.40,C.light]]);
  blocks(forearm,[[0,-.33,0,.34,.62,.36,C.iron],[side*.10,-.29,.20,.14,.57,.09,C.light],
   [0,-.55,.02,.41,.12,.43,C.edge],[0,-.74,.02,.33,.28,.36,C.joint],[0,-.76,.22,.34,.18,.10,C.iron]]);
  arms.push({arm,forearm,side});
 }
 const right=arms[0],left=arms[1],sword=group(right.forearm,0,-.88,.02),shield=group(left.forearm,0,-.76,.17);
 blocks(sword,[
  [0,.11,0,.15,.39,.15,C.joint],[0,.10,.08,.08,.30,.035,C.wine],
  [0,.34,0,.23,.16,.22,C.gold],[0,-.17,0,.71,.13,.22,C.gold],[-.33,-.12,0,.13,.13,.19,C.goldLight],[.33,-.12,0,.13,.13,.19,C.goldLight],
  [0,-1.40,0,.27,2.36,.11,C.steel],[-.105,-1.40,.064,.065,2.36,.03,C.blade],
  [.105,-1.40,-.064,.065,2.36,.03,C.edge],[0,-1.38,.065,.055,2.18,.02,C.light],
  [0,-2.65,0,.18,.15,.095,C.blade],[0,-2.77,0,.10,.10,.075,C.blade],[0,-2.85,0,.04,.07,.05,C.blade]
 ]);
 const shieldPixels=[];
 for(const [y,w] of [[.94,.72],[.76,1.10],[.52,1.30],[.22,1.34],[-.08,1.30],[-.36,1.16],[-.60,.88],[-.81,.54],[-.96,.24]]){
  shieldPixels.push([0,y,0,w,.28,.23,C.gold],[0,y,.14,Math.max(.08,w-.15),.23,.09,C.iron]);
 }
 shieldPixels.push([0,.10,.225,.14,1.35,.09,C.goldLight],[0,.36,.225,.70,.14,.09,C.goldLight],[-.49,.54,.22,.08,.08,.07,C.edge],[.49,.54,.22,.08,.08,.07,C.edge],[0,.88,.22,.12,.10,.07,C.edge]);blocks(shield,shieldPixels);
 const capeTop=group(chest,0,.93,-.45),capeMid=group(capeTop,0,-.87,-.015),capeEnd=group(capeMid,0,-.89,-.02);
 blocks(capeTop,[[0,-.39,0,1.63,.92,.12,C.wine],[-.54,-.40,-.075,.16,.80,.035,C.wineLight],[.50,-.39,-.075,.22,.83,.035,C.wineDark],[-.59,.02,.07,.16,.13,.13,C.gold],[.59,.02,.07,.16,.13,.13,C.gold]]);
 blocks(capeMid,[[0,-.43,0,1.75,.93,.115,C.wine],[-.56,-.42,-.07,.16,.87,.035,C.wineLight],[.50,-.43,-.07,.24,.90,.035,C.wineDark]]);
 blocks(capeEnd,[[-.67,-.39,0,.43,.83,.11,C.wine],[-.24,-.46,0,.39,.99,.11,C.wine],[.16,-.31,0,.38,.70,.11,C.wineDark],[.57,-.42,0,.41,.92,.11,C.wine],
  [-.76,-.87,0,.25,.16,.11,C.wineDark],[-.28,-1.02,0,.22,.18,.11,C.wine],[.58,-.94,0,.25,.18,.11,C.wineDark],[-.55,-.35,-.07,.12,.72,.035,C.wineLight]]);

 const ready={hx:-.88,hy:2.12,hz:.34,bh:-.29,bp:-.72,bt:0,sx:.88,sy:2.35,sz:.60,sh:.12,sp:-.08,sr:-.05,
  cx:.025,cy:.05,cz:0,hip:0,drop:0,rx:-.52,rz:-.10,rl:0,lx:.52,lz:.12,ll:0,neck:0};
 const key=changes=>({...ready,...changes});
 // Reach is supplied by the actual 1.72m arm chain and 2.65m blade, never by
 // shifting the root. Sweep contact is ~4.1m, straight thrust ~4.8m from root.
 const moves={
  wardenSweep:{
   wind:key({hx:-.88,hy:1.86,hz:.41,bh:-1.65,bp:-.30,cx:.18,cy:-.50,hip:-.27,drop:-.43,rz:-.33,lz:.40,sy:2.40,sz:.54,sh:-.30}),
   contact:key({hx:-.12,hy:1.50,hz:1.30,bh:0,bp:-.26,cx:.28,cy:.08,hip:.20,drop:-.53,rz:-.36,lz:.44,sy:2.50,sx:.76,sz:.48,sh:.22}),
   follow:key({hx:.45,hy:1.60,hz:.61,bh:1.60,bp:-.25,cx:.20,cy:.56,hip:.31,drop:-.48,rz:-.30,lz:.38,sy:2.46,sz:.40,sh:.38}),
   recover:key({hx:.34,hy:1.75,hz:.47,bh:1.72,bp:-.50,cx:.12,cy:.39,hip:.22,drop:-.30,rz:-.27,lz:.34,sy:2.30,sz:.49})
  },
  wardenReturn:{
   wind:key({hx:.38,hy:2.52,hz:.37,bh:1.58,bp:.30,cx:-.05,cy:.53,hip:.24,drop:-.13,rz:.34,lz:-.26,sx:.89,sy:2.54,sz:.41,sh:.38}),
   contact:key({hx:-.15,hy:2.66,hz:.98,bh:-.05,bp:.04,cx:.14,cy:-.08,hip:-.20,drop:-.18,rz:.45,lz:-.28,sy:2.35,sz:.70,sh:-.20}),
   follow:key({hx:-.86,hy:2.90,hz:.41,bh:-1.32,bp:.35,cx:.02,cy:-.52,hip:-.30,drop:-.12,rz:.34,lz:-.25,sy:2.25,sz:.67,sh:-.32}),
   recover:key({hx:-.92,hy:2.65,hz:.31,bh:-1.46,bp:.08,cy:-.30,hip:-.17,drop:-.08,rz:.26,lz:-.18})
  },
  wardenThrust:{
   wind:key({hx:-.95,hy:2.70,hz:-.05,bh:.02,bp:.02,cx:-.11,cy:-.36,hip:-.19,drop:-.16,rz:-.36,lz:.35,sy:2.65,sz:.78,sh:-.14}),
   contact:key({hx:-.34,hy:2.75,hz:1.88,bh:0,bp:-.01,cx:.38,cy:.03,hip:.15,drop:-.19,rx:-.58,rz:-.48,lz:.64,sy:2.60,sz:.72,sh:.14}),
   follow:key({hx:-.28,hy:2.70,hz:1.75,bh:.03,bp:-.05,cx:.34,cy:.10,hip:.18,drop:-.23,rx:-.58,rz:-.43,lz:.62,sy:2.50,sz:.72}),
   recover:key({hx:-.74,hy:2.43,hz:.93,bh:.06,bp:-.25,cx:.17,cy:.08,hip:.11,drop:-.15,rz:-.33,lz:.43,sy:2.40,sz:.65})
  },
  wardenStomp:{
   wind:key({hx:-.28,hy:4.02,hz:.05,bh:-.12,bp:1.24,cx:-.17,cy:-.16,hip:-.10,drop:-.12,rz:-.18,rl:.36,lz:.24,sx:.73,sy:2.98,sz:.57,sp:-.24,neck:-.09}),
   contact:key({hx:-.10,hy:2.03,hz:1.09,bh:.04,bp:-.73,cx:.44,cy:.12,hip:.15,drop:-.45,rz:.41,lz:-.13,sy:2.21,sz:.69,neck:.05}),
   follow:key({hx:-.10,hy:1.67,hz:.88,bh:.07,bp:-.60,cx:.49,cy:.17,hip:.20,drop:-.49,rz:.39,lz:-.13,sy:2.10,sz:.62,neck:.10}),
   recover:key({hx:-.16,hy:1.78,hz:.78,bh:.12,bp:-.63,cx:.29,cy:.12,hip:.13,drop:-.30,rz:.30,lz:-.12,sy:2.17,sz:.56,neck:.04})
  },
  wardenCharge:{
   wind:key({hx:-.92,hy:2.18,hz:-.29,bh:-.34,bp:.45,cx:.22,cy:-.20,hip:-.13,drop:-.31,rz:-.38,lz:.36,sx:.28,sy:2.60,sz:1.23,sh:0,sp:-.08,neck:-.12}),
   run:key({hx:-.94,hy:2.11,hz:-.31,bh:-.34,bp:.48,cx:.32,cy:-.10,hip:0,drop:-.24,sx:.24,sy:2.55,sz:1.35,sh:0,sp:-.11,neck:-.17})
  }
 };
 const keys=Object.keys(ready),pose={...ready},entry={...ready},target={...ready};
 function copyPose(out,from){for(const k of keys)out[k]=from[k];}
 function blendPose(out,a,b,t){for(const k of keys)out[k]=mix(a[k],b[k],t);}
 // Two-bone solvers share their scratch buffers. Every quaternion destination
 // is distinct from its input, including the wrist's body-space orientation.
 const down=new T.Vector3(0,-1,0),targetPoint=new T.Vector3(),direction=new T.Vector3(),bend=new T.Vector3(),elbow=new T.Vector3(),lower=new T.Vector3();
 const inv=new T.Quaternion(),lowerQ=new T.Quaternion(),parentQ=new T.Quaternion(),desiredQ=new T.Quaternion(),bladeDirection=new T.Vector3();
 function chain(upper,lowerNode,lengthA,lengthB,side,isLeg){
  direction.copy(targetPoint).sub(upper.position);const reach=clamp(direction.length(),.05,lengthA+lengthB-.005);direction.normalize();
  bend.set(isLeg?0:side,isLeg?0:.10,isLeg?1:-.35).addScaledVector(direction,-bend.dot(direction));
  if(bend.lengthSq()<.0001)bend.set(1,0,0).addScaledVector(direction,-direction.x);bend.normalize();
  const cosine=clamp((lengthA*lengthA+reach*reach-lengthB*lengthB)/(2*lengthA*reach),-1,1);
  elbow.copy(direction).multiplyScalar(lengthA*cosine).addScaledVector(bend,lengthA*Math.sqrt(1-cosine*cosine));
  upper.quaternion.setFromUnitVectors(down,lower.copy(elbow).normalize());
  lower.copy(direction).multiplyScalar(reach).sub(elbow).normalize();lowerQ.setFromUnitVectors(down,lower);
  lowerNode.quaternion.copy(upper.quaternion).invert().multiply(lowerQ);
 }
 function handAt(arm,x,y,z){
  targetPoint.set(x,y,z).sub(pelvis.position).applyQuaternion(inv.copy(pelvis.quaternion).invert()).sub(chest.position).applyQuaternion(inv.copy(chest.quaternion).invert());
  chain(arm.arm,arm.forearm,.84,.88,arm.side,false);
 }
 function weaponParent(arm){return parentQ.copy(pelvis.quaternion).multiply(chest.quaternion).multiply(arm.arm.quaternion).multiply(arm.forearm.quaternion);}
 function aimBlade(heading,pitch,twist){
  bladeDirection.set(Math.sin(heading)*Math.cos(pitch),Math.sin(pitch),Math.cos(heading)*Math.cos(pitch));
  desiredQ.setFromUnitVectors(down,bladeDirection);sword.quaternion.copy(weaponParent(right)).invert().multiply(desiredQ);sword.rotateY(twist);
 }
 function faceShield(pitch,heading,bank){shield.rotation.set(pitch,heading,bank);desiredQ.copy(shield.quaternion);shield.quaternion.copy(weaponParent(left)).invert().multiply(desiredQ);}
 const bladeSegment={base:new T.Vector3(),tip:new T.Vector3(),visible:false,active:false,attackId:0,kind:'slash',moveId:'',progress:0};
 let clock=0,travel=0,speed=0,lastX=null,lastZ=null,yaw=0,torsoYaw=0,headYaw=0,mode='',modeAge=0,initialized=false,disposed=false;
 let reactionTimer=0,parryTimer=0,capePitch=.04,capeYaw=0,capeMidPitch=0,capeEndPitch=0,lastSpeed=0,deathX=0,deathZ=-1,wasDead=false;
 let sampledState='',sampledStrike=null,sampledContact=false,sampledDead=false;
 function gait(out,phase,amount,charge){
  const stride=charge?.64:.45,lift=charge?.25:.17;
  out.rz+=-Math.sin(phase)*stride*amount;out.lz+=Math.sin(phase)*stride*amount;
  out.rl+=Math.max(0,-Math.cos(phase))*lift*amount;out.ll+=Math.max(0,Math.cos(phase))*lift*amount;
  out.drop-=Math.abs(Math.sin(phase))*.045*amount;out.hip+=Math.sin(phase)*.08*amount;
  out.cy-=Math.sin(phase)*.07*amount;out.cz+=Math.sin(phase)*.025*amount;
  if(!charge){out.hz+=Math.sin(phase)*.18*amount;out.sz-=Math.sin(phase)*.08*amount;out.bp+=Math.sin(phase)*.09*amount;}
 }
 function update(e,game,dt){
  if(disposed||!e)return;dt=clamp(finite(dt),0,.1);
  const hit=finite(e.hitReactionTimer),parry=finite(e.parryStaggerTimer),newReaction=hit>reactionTimer+.000001||parry>parryTimer+.000001;
  // The authoritative hit timer also updates on the first hit-stop frame;
  // unchanged frozen frames retain this pulse without advancing a local clock.
  const flash=clamp(finite(e.hitFlash)/.09,0,1);
  kit.material.emissive.set(flash>0?'#ffffff':parry>0?'#5a7a88':'#000000');
  kit.material.emissiveIntensity=flash>0?.9*smooth(flash):.35*smooth(parry/.25);
  base.position.set(finite(e.x),finite(e.y),finite(e.z));
  base.visible=e.spawned!==false&&(!e.dead||finite(e.deadAge)<1.05);
  // A fixed simulation step can reach contact immediately before hitstop.
  // Sample that authoritative contact/cancellation once without advancing a
  // visual clock; subsequent frozen renders retain the identical pose.
  const contactChanged=sampledContact!==!!e.contactReached||sampledStrike!==e.strikeId||sampledState!==e.state||sampledDead!==!!e.dead||bladeSegment.visible!==base.visible;
  if(initialized&&dt===0&&!newReaction&&!contactChanged)return;
  const dx=lastX===null?0:e.x-lastX,dz=lastZ===null?0:e.z-lastZ,distance=Math.hypot(dx,dz),validStep=distance<Math.max(2,dt*24);
  const dirX=finite(e.dirX),dirZ=finite(e.dirZ,1),heading=Math.hypot(dirX,dirZ)>.001?Math.atan2(dirX,dirZ):yaw;
  if(!initialized)yaw=torsoYaw=headYaw=heading;
  const committed=e.state==='windup'||e.state==='strike'||e.state==='charge';
  yaw+=angle(yaw,heading)*(1-Math.exp(-(committed?12:6)*dt));torsoYaw+=angle(torsoYaw,heading)*(1-Math.exp(-10*dt));headYaw+=angle(headYaw,heading)*(1-Math.exp(-17*dt));
  base.rotation.y=yaw;clock+=dt;
  if(dt>0&&validStep){const forward=dx*Math.sin(yaw)+dz*Math.cos(yaw);travel+=distance*(forward<-.0001?-1:1);}
  const velocity=dt>0?(validStep?distance/dt:0):lastSpeed,acceleration=dt>0?clamp((velocity-lastSpeed)/dt,-12,12):0;
  speed=damp(speed,clamp(velocity/(e.state==='charge'?10:2.2),0,1),12,dt);lastSpeed=velocity;
  const moveId=e.moveId||(e.attackKind==='charge'?'wardenCharge':e.attackKind==='thrust'?'wardenThrust':e.attackKind==='stomp'?'wardenStomp':'wardenSweep'),move=moves[moveId]||moves.wardenSweep;
  const state=e.dead?'dead':e.state||'idle',stateKey=state+':'+(committed?moveId+':'+(e.strikeId||0):'');
  if(stateKey!==mode){copyPose(entry,pose);mode=stateKey;modeAge=0;}else modeAge+=dt;
  copyPose(target,ready);const phase=travel*Math.PI*2/(state==='charge'?3.9:2.7);
  if(state==='windup'){
   const progress=clamp(1-finite(e.timer)/Math.max(.01,finite(e.windupDuration,1)),0,1);
   blendPose(target,entry,move.wind,smooth(progress/.86));
  }else if(state==='strike'){
   const elapsed=finite(e.strikeElapsed),duration=Math.max(.05,finite(e.strikeDuration,.42)),contact=clamp(finite(e.strikeContact,.14),.025,duration*.72),follow=contact+(duration-contact)*.48;
   if(elapsed<contact)blendPose(target,move.wind,move.contact||move.wind,smooth(elapsed/contact));
   else if(elapsed<follow)blendPose(target,move.contact||move.wind,move.follow||move.wind,smooth((elapsed-contact)/(follow-contact)));
   else blendPose(target,move.follow||move.wind,move.recover||move.wind,smooth((elapsed-follow)/Math.max(.01,duration-follow)));
  }else if(state==='charge'){
   copyPose(target,moves.wardenCharge.run);gait(target,phase,speed,true);
   blendPose(target,entry,target,smooth(modeAge/.10));
  }else if(state==='recover'||state==='comboGap'){
   const duration=Math.max(.05,finite(state==='comboGap'?e.comboGapDuration:e.recoveryDuration,.8));
   const progress=clamp(1-finite(e.timer)/duration,0,1);
   // Carry the displayed follow-through into a readable heavy recovery. The
   // next windup captures this pose, so combos never jump back through idle.
   blendPose(target,entry,ready,smooth((progress-.12)/.88));
  }else if(state==='dead'){
   copyPose(target,entry);
  }else{
   gait(target,phase,speed,false);target.drop+=Math.sin(clock*1.45)*.015;target.cx+=Math.sin(clock*1.45)*.006;
   if(initialized)blendPose(target,entry,target,smooth(modeAge/.24));
  }
  copyPose(pose,target);
  const life=clamp(hit/Math.max(.01,finite(e.hitReactionDuration,.24)),0,1),kick=life*life*clamp(finite(e.hitReactionStrength,.5),0,1.3),held=smooth(clamp(parry/.25,0,1));
  const hitX=finite(e.hitDirX)*Math.cos(yaw)-finite(e.hitDirZ)*Math.sin(yaw),hitZ=finite(e.hitDirX)*Math.sin(yaw)+finite(e.hitDirZ)*Math.cos(yaw);
  const spawn=e.state==='spawning'?clamp(1-finite(e.spawnRemaining)/Math.max(.01,finite(e.spawnDuration,1)),0,1):1;
  let death=0;
  if(e.dead){
   if(!wasDead){deathX=hitX;deathZ=hitZ;if(Math.hypot(deathX,deathZ)<.01){deathX=.35;deathZ=-.94;}const length=Math.hypot(deathX,deathZ);deathX/=length;deathZ/=length;}
   death=smooth(finite(e.deadAge)/.92);
  }
  wasDead=!!e.dead;
  // Impulse is projected into the actual body orientation. Only the balance
  // pivot tilts; world translation and charge collision stay authoritative.
  balance.rotation.set(hitZ*(.13*kick+.12*held)+deathZ*1.28*death,0,-hitX*(.14*kick+.12*held)-deathX*1.28*death);
  pelvis.position.set(0,2.05+pose.drop-.15*held-.43*(1-spawn)-.68*death,0);
  pelvis.rotation.set(0,pose.hip*(1-death),0);
  chest.rotation.set(pose.cx+hitZ*.10*kick+.16*held+.30*death,pose.cy+clamp(angle(yaw,torsoYaw),-.35,.35)-pose.hip,-hitX*.08*kick+pose.cz);
  head.rotation.set(pose.neck-.05*held-.10*death,clamp(angle(torsoYaw,headYaw),-.42,.42)-pose.cy*.46,hitX*.055*kick);
  handAt(right,pose.hx-hitX*.14*kick,pose.hy-.36*held-.40*death,pose.hz-hitZ*.13*kick);
  handAt(left,pose.sx,pose.sy-.28*held-.48*death,pose.sz-.20*held);
  aimBlade(pose.bh-.40*held,pose.bp+.48*kick+.75*held-.25*death,pose.bt);
  faceShield(pose.sp+.22*held,pose.sh+.17*kick,pose.sr+.12*held);
  for(const leg of legs){
   const rightLeg=leg.side<0,x=rightLeg?pose.rx:pose.lx,z=rightLeg?pose.rz:pose.lz,lift=rightLeg?pose.rl:pose.ll;
   let floor=0;
   if(root.HatTerrain?.heightAt&&!e.dead){const wx=e.x+x*Math.cos(yaw)+z*Math.sin(yaw),wz=e.z-x*Math.sin(yaw)+z*Math.cos(yaw);floor=clamp(root.HatTerrain.heightAt(wx,wz)-finite(e.y),-.22,.22);}
   targetPoint.set(x,.27+lift+floor,z).sub(pelvis.position).applyQuaternion(inv.copy(pelvis.quaternion).invert());
   chain(leg.thigh,leg.shin,.91,.91,leg.side,true);
   parentQ.copy(pelvis.quaternion).multiply(leg.thigh.quaternion).multiply(leg.shin.quaternion);
   leg.foot.quaternion.copy(parentQ).invert();leg.foot.rotateX(-lift*.45);
  }
  // Independent delayed cape joints retain momentum after the shield stops.
  const clothTarget=-.035-speed*.25-clamp(acceleration*.008,-.10,.10)-pose.cx*.40-.20*held;
  capePitch=damp(capePitch,clothTarget,7,dt);capeYaw=damp(capeYaw,-pose.cy*.30-clamp(angle(yaw,heading),-.30,.30),5,dt);
  capeMidPitch=damp(capeMidPitch,capePitch*.78,5,dt);capeEndPitch=damp(capeEndPitch,capeMidPitch*.80,4,dt);
  capeTop.rotation.set(capePitch,capeYaw,Math.sin(clock*1.9)*.012);capeMid.rotation.set(capeMidPitch,0,Math.sin(clock*1.9-.65)*.018);capeEnd.rotation.set(capeEndPitch,0,Math.sin(clock*1.9-1.25)*.025);
  const elapsed=finite(e.strikeElapsed),duration=Math.max(.01,finite(e.strikeDuration,.42)),contact=finite(e.strikeContact,.14);
  bladeSegment.visible=base.visible;bladeSegment.attackId=e.strikeId||0;bladeSegment.kind=e.attackKind||'slash';bladeSegment.moveId=moveId;bladeSegment.progress=clamp(elapsed/duration,0,1);
  bladeSegment.active=!!(base.visible&&!e.dead&&state==='strike'&&!parry&&elapsed>=Math.max(0,contact-.085)&&elapsed<=Math.min(duration,contact+.14));
  sword.updateWorldMatrix(true,false);bladeSegment.base.set(0,-.24,0).applyMatrix4(sword.matrixWorld);bladeSegment.tip.set(0,-2.885,0).applyMatrix4(sword.matrixWorld);
  lastX=e.x;lastZ=e.z;reactionTimer=hit;parryTimer=parry;sampledState=e.state;sampledStrike=e.strikeId;sampledContact=!!e.contactReached;sampledDead=!!e.dead;initialized=true;
 }
 function emit(event){if(event?.type==='bossRelocate'){lastX=lastZ=null;speed=lastSpeed=0;}}
 function dispose(){if(disposed)return;disposed=true;bladeSegment.visible=bladeSegment.active=false;kit.dispose();}
 return{update,emit,dispose,getBladeSegment:()=>disposed?null:bladeSegment};
}
root.HatPixelWarden={create};
})(typeof window!=='undefined'?window:globalThis);
