(function(root){'use strict';
// Birthday finale boss, modelled on the player's boyfriend: black hair with a
// heavy fringe, round face, beige button shirt. Chibi proportions keep him
// friendly; a party hat and a giant heart lollipop make the fight a gift.
// The engine owns the root (including the hug charge); joints move inside it.
function create({THREE:T,scene}){
 const kit=root.HatEnemyRigKit.create({THREE:T,scene}),base=kit.root,group=kit.group,blocks=kit.blocks;
 base.name='pixel-sweetheart';
 const C={hair:'#16161d',hairLight:'#2c2c38',hairSheen:'#45465a',skin:'#f4d4bd',skinShade:'#e2b89d',blush:'#f2a2a0',eye:'#1c1a20',eyeLight:'#ffffff',brow:'#26232a',mouth:'#b4585a',
  shirt:'#cfba95',shirtLight:'#e0cfab',shirtShade:'#a99572',collar:'#e6d8b7',button:'#f6efdf',pants:'#2e3646',pantsShade:'#232937',shoe:'#3a2b24',sole:'#efe6d6',
  stick:'#f6f2e8',candy:'#ff6f9f',candyDark:'#d94a7d',candyLight:'#ffc2d6',hatA:'#ffcf5a',hatB:'#ff7aa6',pom:'#ffffff',cake:'#fff4e8',frost:'#ff9cc0',cherry:'#e2364e'};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},finite=(n,d=0)=>Number.isFinite(n)?n:d;
 const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a)),damp=(a,b,rate,dt)=>mix(a,b,1-Math.exp(-rate*dt));
 const lift=group(base),balance=group(lift),pelvis=group(balance,0,1.02,0),chest=group(pelvis,0,.12,0),head=group(chest,0,1.02,0);
 // Trousers and belt.
 blocks(pelvis,[[0,-.02,0,.92,.34,.58,C.pants],[0,.14,0,.96,.1,.62,C.pantsShade],[0,.14,.31,.18,.08,.03,'#b9a27a']]);
 // Beige shirt: collar, placket with four buttons, chest pocket, untucked hem.
 blocks(chest,[
  [0,.46,0,1.02,.92,.62,C.shirt],[0,.02,0,1.06,.14,.66,C.shirtShade],
  [-.27,.5,.315,.4,.78,.02,C.shirtLight],[.3,.42,.315,.32,.66,.02,C.shirt],
  [0,.48,.32,.1,.86,.03,C.shirtShade],
  [0,.78,.335,.07,.07,.03,C.button],[0,.58,.335,.07,.07,.03,C.button],[0,.38,.335,.07,.07,.03,C.button],[0,.18,.335,.07,.07,.03,C.button],
  [.27,.62,.33,.24,.22,.03,C.shirtShade],[.27,.72,.335,.26,.05,.035,C.shirtLight],
  [-.18,.9,.27,.3,.12,.16,C.collar],[.18,.9,.27,.3,.12,.16,C.collar],[-.12,.84,.33,.16,.1,.06,C.collar],[.12,.84,.33,.16,.1,.06,C.collar],
  [0,.94,0,.36,.12,.36,C.skin],[0,.92,-.06,.86,.1,.42,C.collar]
 ]);
 // Head: round face, heavy black fringe low over the brows, visible ears.
 const face=group(head),eyes=group(face,0,.5,.56),mouth=group(face,0,.25,.565);
 blocks(face,[
  [0,.52,0,1.18,1.06,1.06,C.skin],[0,.06,.02,1.04,.12,.96,C.skin],[0,.0,.06,.82,.06,.82,C.skinShade],
  [-.6,.5,0,.1,.24,.2,C.skinShade],[.6,.5,0,.1,.24,.2,C.skinShade],
  [-.37,.34,.54,.2,.1,.03,C.blush],[.37,.34,.54,.2,.1,.03,C.blush],[0,.42,.55,.1,.1,.04,C.skinShade]
 ]);
 blocks(eyes,[[-.25,0,0,.15,.15,.03,C.eye],[.25,0,0,.15,.15,.03,C.eye],[-.21,.04,.012,.05,.05,.02,C.eyeLight],[.29,.04,.012,.05,.05,.02,C.eyeLight],
  [-.25,.15,0,.24,.045,.03,C.brow],[.25,.15,0,.24,.045,.03,C.brow]]);
 blocks(mouth,[[0,0,0,.2,.05,.03,C.mouth],[-.11,.03,0,.05,.04,.03,C.mouth],[.11,.03,0,.05,.04,.03,C.mouth]]);
 blocks(head,[
  // Crown and back, slightly bigger than the face for a soft mushroom silhouette.
  [0,1.12,-.04,1.3,.32,1.18,C.hair],[0,.95,-.32,1.3,.5,.6,C.hair],[0,.62,-.5,1.24,.72,.18,C.hair],
  [-.63,.82,-.06,.1,.46,.92,C.hair],[.63,.82,-.06,.1,.46,.92,C.hair],[-.63,.58,-.24,.1,.3,.42,C.hair],[.63,.58,-.24,.1,.3,.42,C.hair],
  [-.2,1.29,-.05,.5,.07,.7,C.hairLight],[.32,1.22,.18,.38,.06,.4,C.hairSheen],
  // Fringe: uneven strands covering the forehead down to the brows.
  [0,.96,.5,1.24,.36,.16,C.hair],[-.5,.78,.53,.24,.16,.12,C.hair],[-.24,.77,.55,.24,.14,.12,C.hair],[.04,.8,.55,.26,.12,.12,C.hair],
  [.3,.76,.54,.24,.16,.12,C.hair],[.53,.8,.52,.18,.14,.12,C.hair],[-.36,.71,.57,.1,.06,.08,C.hair],[.18,.72,.57,.08,.06,.08,C.hair],
  [-.3,1.0,.59,.34,.05,.03,C.hairLight],[.22,1.04,.585,.28,.04,.03,C.hairSheen]
 ]);
 // Tilted cone party hat: stacked stripes and a pompom.
 const hat=group(head,.3,1.24,0);hat.rotation.set(.12,0,-.32);
 blocks(hat,[[0,.06,0,.56,.12,.56,C.hatA],[0,.17,0,.47,.1,.47,C.hatB],[0,.27,0,.38,.1,.38,C.hatA],[0,.37,0,.29,.1,.29,C.hatB],[0,.47,0,.2,.1,.2,C.hatA],[0,.56,0,.12,.08,.12,C.hatB],[0,.66,0,.16,.14,.16,C.pom],[-.05,.13,.25,.1,.1,.06,C.pom],[.12,.33,.17,.08,.08,.06,C.pom]]);
 const legs=[];
 for(const side of [-1,1]){
  const thigh=group(pelvis,side*.25,-.12,0),shin=group(thigh,0,-.46,0),foot=group(shin,0,-.44,0);
  blocks(thigh,[[0,-.22,0,.38,.5,.42,C.pants],[side*.13,-.22,.2,.06,.44,.03,C.pantsShade]]);
  blocks(shin,[[0,-.2,0,.34,.44,.38,C.pants],[0,-.38,0,.37,.08,.41,C.pantsShade]]);
  blocks(foot,[[0,-.06,.08,.38,.2,.58,C.shoe],[0,-.15,.08,.4,.06,.62,C.sole],[0,-.01,.3,.3,.06,.12,'#4b3a30']]);
  legs.push({thigh,shin,foot,side});
 }
 const arms=[];
 for(const side of [-1,1]){
  const arm=group(chest,side*.62,.78,0),forearm=group(arm,0,-.48,0),hand=group(forearm,0,-.46,0);
  blocks(arm,[[0,-.22,0,.32,.54,.36,C.shirt],[side*.1,-.22,.04,.06,.5,.3,C.shirtShade]]);
  blocks(forearm,[[0,-.18,0,.3,.42,.34,C.shirt],[0,-.38,0,.33,.1,.37,C.shirtLight]]);
  blocks(hand,[[0,-.08,.02,.26,.24,.28,C.skin],[side*-.1,-.04,.12,.08,.14,.1,C.skin]]);
  arms.push({arm,forearm,hand,side});
 }
 const right=arms[0],left=arms[1];
 // Giant heart lollipop: the "blade" that both trail and contact sampling use.
 const pop=group(right.hand,0,-.06,.04);
 blocks(pop,[[0,.55,0,.1,1.7,.1,C.stick],[0,1.0,.052,.02,.7,.02,'#e7dfcf']]);
 const heart=group(pop,0,1.62,0),heartPixels=[];
 for(const [y,xs] of [[.36,[[-.29,.3],[.29,.3]]],[.24,[[-.31,.46],[.31,.46]]],[.1,[[0,1.12]]],[-.04,[[0,1.1]]],[-.18,[[0,.92]]],[-.31,[[0,.7]]],[-.43,[[0,.46]]],[-.53,[[0,.22]]]])
  for(const [x,w] of xs)heartPixels.push([x,y,0,w,.15,.18,C.candy],[x,y,-.1,Math.max(.06,w-.08),.13,.03,C.candyDark]);
 heartPixels.push([-.27,.26,.095,.12,.1,.03,C.candyLight],[-.36,.14,.095,.06,.14,.03,C.candyLight],[.12,-.1,.095,.34,.05,.03,'#ff94b8'],[0,-.22,.095,.2,.05,.03,'#ff94b8']);
 blocks(heart,heartPixels);
 // Left-hand cake, only visible while winding up a throw.
 const cake=group(left.hand,0,-.22,.08);
 blocks(cake,[[0,0,0,.42,.24,.42,C.cake],[0,.15,0,.44,.08,.44,C.frost],[0,.04,.215,.42,.05,.02,C.frost],[0,.25,0,.09,.1,.09,C.cherry]]);
 cake.visible=false;

 const ready={rx:-.25,rz:-.18,re:-.55,lx:.05,lz:.22,le:-.25,ly:0,cy:0,cp:.04,drop:0,tilt:0,sh:-.35,sp:1.05,legSpread:0,lean:0};
 const key=c=>({...ready,...c});
 // sh/sp aim the lollipop in body space: heading 0 is forward, +pitch is up.
 const moves={
  sweetSweep:{wind:key({rx:-.9,rz:-1.4,re:-.2,cy:-.9,cp:-.05,lz:.5,lx:-.3,drop:.1,sh:-2.3,sp:.35,lean:-.05}),
   contact:key({rx:-1.5,rz:-.6,re:-.1,cy:.5,cp:.18,lz:.35,drop:.18,sh:-.1,sp:.15,lean:.1}),
   follow:key({rx:-1.3,rz:.3,re:-.2,cy:1.0,cp:.2,lz:.3,drop:.16,sh:1.3,sp:.2,lean:.08}),
   recover:key({rx:-.7,rz:.05,re:-.45,cy:.5,cp:.1,drop:.08,sh:.6,sp:.8,lean:.03})},
  sweetBonk:{wind:key({rx:-2.9,rz:-.25,re:-.35,cp:-.28,lx:-.6,lz:.55,drop:-.02,sh:0,sp:2.35,lean:-.18,tilt:-.08}),
   contact:key({rx:-1.15,rz:-.1,re:-.05,cp:.42,lx:.3,drop:.28,sh:0,sp:-.15,lean:.24}),
   follow:key({rx:-.85,rz:-.1,re:-.1,cp:.46,lx:.35,drop:.3,sh:0,sp:-.45,lean:.26}),
   recover:key({rx:-.6,re:-.4,cp:.2,drop:.14,sh:-.2,sp:.5,lean:.1})},
  sweetPopper:{wind:key({rx:-2.6,rz:-.6,re:-.2,lx:-2.6,lz:.6,le:-.2,cp:-.2,drop:.32,sh:0,sp:1.5,lean:-.1}),
   contact:key({rx:-1.6,rz:-1.5,re:-.1,lx:-1.6,lz:1.5,le:-.1,cp:.12,drop:.36,legSpread:.25,sh:-1.3,sp:.9}),
   follow:key({rx:-1.5,rz:-1.45,re:-.1,lx:-1.5,lz:1.45,le:-.1,cp:.1,drop:.3,legSpread:.22,sh:-1.3,sp:.9}),
   recover:key({rx:-.8,rz:-.7,lx:-.8,lz:.7,drop:.12,legSpread:.1,sh:-.8,sp:1})},
  sweetHug:{wind:key({rx:-1.0,rz:-1.4,re:-.15,lx:-1.0,lz:1.4,le:-.15,cp:-.24,drop:.12,sh:-1.5,sp:1.25,lean:-.22,tilt:.06}),
   run:key({rx:-1.35,rz:-.85,re:-.35,lx:-1.35,lz:.85,le:-.35,cp:.3,drop:.04,sh:-1,sp:.55,lean:.3})},
  cake:{wind:key({lx:1.05,lz:.25,le:-1.2,ly:.3,cy:.45,cp:-.08,rx:-.4,rz:-.3,lean:-.06}),
   contact:key({lx:-2.05,lz:.05,le:-.15,ly:0,cy:-.4,cp:.18,rx:-.25,lean:.12}),
   follow:key({lx:-1.6,lz:.05,le:-.2,cy:-.35,cp:.14,lean:.1}),
   recover:key({lx:-.4,lz:.15,le:-.3,cy:-.1,cp:.06})}
 };
 const stickDirection=new T.Vector3(),stickFace=new T.Vector3(),stickSide=new T.Vector3(),stickBasis=new T.Matrix4(),parentQ=new T.Quaternion(),desiredQ=new T.Quaternion();
 function aimStick(heading,pitch){
  // The heart's face always turns toward the body's front, whatever the swing.
  stickDirection.set(Math.sin(heading)*Math.cos(pitch),Math.sin(pitch),Math.cos(heading)*Math.cos(pitch));
  stickFace.set(0,0,1).addScaledVector(stickDirection,-stickDirection.z);if(stickFace.lengthSq()<.0001)stickFace.set(0,1,0).addScaledVector(stickDirection,-stickDirection.y);stickFace.normalize();
  stickSide.crossVectors(stickDirection,stickFace);stickBasis.makeBasis(stickSide,stickDirection,stickFace);desiredQ.setFromRotationMatrix(stickBasis);
  parentQ.copy(pelvis.quaternion).multiply(chest.quaternion).multiply(right.arm.quaternion).multiply(right.forearm.quaternion).multiply(right.hand.quaternion);
  pop.quaternion.copy(parentQ).invert().multiply(desiredQ);
 }
 const keys=Object.keys(ready),pose={...ready},entry={...ready},target={...ready};
 const copyPose=(out,from)=>{for(const k of keys)out[k]=from[k];};
 const blendPose=(out,a,b,t)=>{for(const k of keys)out[k]=mix(a[k],b[k],t);};
 const bladeSegment={base:new T.Vector3(),tip:new T.Vector3(),visible:false,active:false,attackId:0,kind:'slash',moveId:'',progress:0,tint:0xff8fb8};
 let clock=0,travel=0,speed=0,lastX=null,lastZ=null,yaw=0,mode='',modeAge=0,initialized=false,disposed=false,reactionTimer=0,parryTimer=0,lastSpeed=0,wasDead=false,blinkAt=2.2;
 let sampledState='',sampledStrike=null,sampledContact=false,sampledDead=false;
 function moveFor(e){const id=e.moveId||'';return id.startsWith('sweetCake')?'cake':moves[id]?id:e.attackKind==='charge'?'sweetHug':e.attackKind==='stomp'?'sweetPopper':e.attackKind==='thrust'?'sweetBonk':e.attackKind==='cake'?'cake':'sweetSweep';}
 function update(e,game,dt){
  if(disposed||!e)return;dt=clamp(finite(dt),0,.1);
  const hit=finite(e.hitReactionTimer),parry=finite(e.parryStaggerTimer),newReaction=hit>reactionTimer+.000001||parry>parryTimer+.000001;
  base.position.set(finite(e.x),finite(e.y),finite(e.z));
  // Asleep until the altar calls him; once beaten he stays, sitting, as part of the ending.
  base.visible=e.spawned!==false&&e.state!=='dormant';
  const contactChanged=sampledContact!==!!e.contactReached||sampledStrike!==e.strikeId||sampledState!==e.state||sampledDead!==!!e.dead||bladeSegment.visible!==base.visible;
  if(initialized&&dt===0&&!newReaction&&!contactChanged)return;
  const dx=lastX===null?0:e.x-lastX,dz=lastZ===null?0:e.z-lastZ,distance=Math.hypot(dx,dz),validStep=distance<Math.max(2,dt*24);
  const dirX=finite(e.dirX),dirZ=finite(e.dirZ,1),heading=Math.hypot(dirX,dirZ)>.001?Math.atan2(dirX,dirZ):yaw;
  if(!initialized)yaw=heading;
  const committed=e.state==='windup'||e.state==='strike'||e.state==='charge';
  if(!e.dead)yaw+=angle(yaw,heading)*(1-Math.exp(-(committed?12:6)*dt));base.rotation.y=yaw;clock+=dt;
  if(dt>0&&validStep)travel+=distance;
  const velocity=dt>0?(validStep?distance/dt:0):lastSpeed;speed=damp(speed,clamp(velocity/(e.state==='charge'?9:2.2),0,1),12,dt);lastSpeed=velocity;
  const moveId=moveFor(e),move=moves[moveId],state=e.dead?'dead':e.state||'idle',stateKey=state+':'+(committed?moveId+':'+(e.strikeId||0):'');
  if(stateKey!==mode){copyPose(entry,pose);mode=stateKey;modeAge=0;}else modeAge+=dt;
  copyPose(target,ready);const phase=travel*Math.PI*2/(state==='charge'?2.6:1.9);let walk=0;
  if(state==='windup'){blendPose(target,entry,move.wind,smooth(clamp(1-finite(e.timer)/Math.max(.01,finite(e.windupDuration,1)),0,1)/.86));}
  else if(state==='strike'){
   const elapsed=finite(e.strikeElapsed),duration=Math.max(.05,finite(e.strikeDuration,.42)),contact=clamp(finite(e.strikeContact,.14),.025,duration*.72),follow=contact+(duration-contact)*.48;
   if(elapsed<contact)blendPose(target,move.wind,move.contact||move.wind,smooth(elapsed/contact));
   else if(elapsed<follow)blendPose(target,move.contact||move.wind,move.follow||move.wind,smooth((elapsed-contact)/(follow-contact)));
   else blendPose(target,move.follow||move.wind,move.recover||move.wind,smooth((elapsed-follow)/Math.max(.01,duration-follow)));
  }else if(state==='charge'){copyPose(target,moves.sweetHug.run);walk=1.4;blendPose(target,entry,target,smooth(modeAge/.1));}
  else if(state==='recover'||state==='comboGap'){const duration=Math.max(.05,finite(state==='comboGap'?e.comboGapDuration:e.recoveryDuration,.8));blendPose(target,entry,ready,smooth((clamp(1-finite(e.timer)/duration,0,1)-.12)/.88));}
  else if(state==='dead'){copyPose(target,ready);}
  else{walk=speed;target.drop+=Math.sin(clock*2.2)*.025;target.rz+=Math.sin(clock*2.2)*.04;if(initialized)blendPose(target,entry,target,smooth(modeAge/.24));}
  copyPose(pose,target);
  const life=clamp(hit/Math.max(.01,finite(e.hitReactionDuration,.24)),0,1),kick=life*life*clamp(finite(e.hitReactionStrength,.5),0,1.3),held=smooth(clamp(parry/.25,0,1));
  const hitX=finite(e.hitDirX)*Math.cos(yaw)-finite(e.hitDirZ)*Math.sin(yaw),hitZ=finite(e.hitDirX)*Math.sin(yaw)+finite(e.hitDirZ)*Math.cos(yaw);
  // Entrance: drops from the sky and squashes on landing.
  let fall=0,squash=0;
  if(e.state==='spawning'){const t=clamp(1-finite(e.spawnRemaining)/Math.max(.01,finite(e.spawnDuration,1)),0,1),land=.72;fall=t<land?Math.pow(1-t/land,2)*9:0;squash=t>=land?Math.sin((t-land)/(1-land)*Math.PI)*.35:0;}
  // Defeat: plops down to sit, then waves both arms with the lollipop.
  let sit=0;if(e.dead){if(!wasDead)modeAge=0;sit=smooth(finite(e.deadAge)/.6);}wasDead=!!e.dead;
  const wave=sit*Math.sin(clock*5);
  lift.position.y=fall;lift.scale.set(1+squash*.5,1-squash,1+squash*.5);
  balance.rotation.set(hitZ*(.16*kick+.12*held)+pose.lean*.4,0,-hitX*(.18*kick+.12*held)+pose.tilt);
  pelvis.position.set(0,1.02-pose.drop-.15*held-.55*sit,0);
  chest.rotation.set(pose.cp+hitZ*.12*kick+.18*held-.12*sit,pose.cy,-hitX*.08*kick);
  const nod=e.state==='idle'||e.state==='chase'?Math.sin(clock*2.2+.6)*.04:0;
  head.rotation.set(-.08*held+nod+.1*kick-.1*sit,Math.sin(clock*.9)*.06*(1-sit),hitX*.07*kick+Math.sin(clock*2)*.1*sit);
  // Arms are simple pitch/roll joints; walking swings them opposite the legs.
  const swing=Math.sin(phase)*.55*walk;
  right.arm.rotation.set(pose.rx-swing-2.4*sit+wave*.35,0,pose.rz-.45*sit);right.forearm.rotation.set(pose.re,0,0);
  left.arm.rotation.set(pose.lx+swing-2.4*sit-wave*.35,pose.ly,pose.lz+.45*sit);left.forearm.rotation.set(pose.le,0,0);
  right.hand.rotation.set(0,0,0);aimStick(pose.sh-.6*sit,pose.sp+(sit?(1.25-pose.sp)*sit+wave*.25:0));
  cake.visible=!e.dead&&moveId==='cake'&&(state==='windup'||state==='strike'&&finite(e.strikeElapsed)<finite(e.strikeContact,.08));
  for(const leg of legs){
   const stride=Math.sin(phase+(leg.side<0?0:Math.PI))*.65*walk;
   leg.thigh.rotation.set(stride-pose.drop*1.1-1.45*sit,0,leg.side*(pose.legSpread+.25*sit));
   leg.shin.rotation.set(Math.max(0,-stride)*.7+pose.drop*1.6+.25*sit,0,0);
   leg.foot.rotation.set(-(stride-pose.drop*1.1)-Math.max(0,-stride)*.7-pose.drop*1.6+1.2*sit,0,0);
  }
  // Blink every few seconds; squint while flinching.
  if(clock>blinkAt)blinkAt=clock+2.4+Math.random()*2.2;
  const blink=clock>blinkAt-.12;eyes.scale.y=blink||kick>.3||held>.3?.18:1;mouth.scale.set(kick>.3?.6:sit?1.3:1,kick>.3?2.6:sit?1.6:1,1);
  // Emissive pulse is the hit flash; lit colour stays untouched.
  kit.material.emissive.set(parry>0?'#5a7a88':finite(e.hitFlash)>0?'#ffffff':'#000000');kit.material.emissiveIntensity=finite(e.hitFlash)>0?.9:parry>0?.35:0;
  const elapsed=finite(e.strikeElapsed),duration=Math.max(.01,finite(e.strikeDuration,.42)),contact=finite(e.strikeContact,.14);
  bladeSegment.visible=base.visible&&!e.dead;bladeSegment.attackId=e.strikeId||0;bladeSegment.kind=e.attackKind||'slash';bladeSegment.moveId=moveId;bladeSegment.progress=clamp(elapsed/duration,0,1);
  bladeSegment.active=!!(bladeSegment.visible&&state==='strike'&&['sweetSweep','sweetBonk'].includes(moveId)&&!parry&&elapsed>=Math.max(0,contact-.09)&&elapsed<=Math.min(duration,contact+.16));
  pop.updateWorldMatrix(true,false);bladeSegment.base.set(0,.2,0).applyMatrix4(pop.matrixWorld);bladeSegment.tip.set(0,2.1,0).applyMatrix4(pop.matrixWorld);
  lastX=e.x;lastZ=e.z;reactionTimer=hit;parryTimer=parry;sampledState=e.state;sampledStrike=e.strikeId;sampledContact=!!e.contactReached;sampledDead=!!e.dead;initialized=true;
 }
 function emit(){}
 function dispose(){if(disposed)return;disposed=true;bladeSegment.visible=bladeSegment.active=false;kit.dispose();}
 return{update,emit,dispose,getBladeSegment:()=>disposed?null:bladeSegment};
}
root.HatPixelSweetheart={create};
})(typeof window!=='undefined'?window:globalThis);
