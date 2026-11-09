(function(root){'use strict';
// Physical feet live at enemy.x/y/z; the rig never adds a gameplay lunge.
// +Z is forward. Only UI elsewhere faces the camera.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);},TAU=Math.PI*2;
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
function create({THREE:T,scene,kind}){
 const kit=root.HatEnemyRigKit.create({THREE:T,scene}),base=kit.root,{group,blocks,material}=kit;
 base.name='pixel-enemy-'+kind;
 const C={ink:'#242a32',steel:'#82939b',edge:'#b9c5bf',rust:'#806853',red:'#76505a',leather:'#675744',tan:'#b89c72',cream:'#ded0ac',skin:'#c8aa87',skinShade:'#a98b6e',green:'#536455',greenLight:'#78836a',navy:'#344453',purple:'#51435c',membrane:'#796070',membraneLight:'#997882',eye:'#d1bda0'};
 const bat=kind==='bat',archer=kind==='archer';
 const fall=group(base,0,bat?1:.86,0),body=group(fall,0,bat?-1:-.86,0),hips=group(body,0,.88,0),chest=group(body,0,1.3,0);
 const head=group(chest,0,.62,.015),arms=[],legs=[],wings=[];
 let sword=null,bowMount=null,bow=null,arrow=null,stringGeometry=null,stringMaterial=null,stringLine=null,mantle=null;
 const down=new T.Vector3(0,-1,0),up=new T.Vector3(0,1,0),target=new T.Vector3(),direction=new T.Vector3(),bend=new T.Vector3(),elbow=new T.Vector3(),lower=new T.Vector3(),normal=new T.Vector3();
 const inverse=new T.Quaternion(),jointQ=new T.Quaternion(),weaponParent=new T.Quaternion(),weaponQ=new T.Quaternion(),floorQ=new T.Quaternion();
 const blade={base:new T.Vector3(),tip:new T.Vector3(),visible:false,active:false,attackId:0,kind:'slash',progress:0};
 if(bat){
  chest.position.set(0,1,0);head.position.set(0,.12,.25);
  blocks(chest,[[0,0,0,.39,.40,.43,C.purple],[0,-.05,.20,.28,.25,.10,C.membrane],[-.13,-.23,.06,.09,.18,.10,C.ink],[.13,-.23,.06,.09,.18,.10,C.ink],[0,-.10,-.29,.13,.12,.28,C.purple]]);
  blocks(head,[[0,0,0,.40,.29,.30,C.purple],[-.14,.21,-.06,.13,.24,.14,C.purple],[.14,.21,-.06,.13,.24,.14,C.purple],[-.14,.22,.017,.065,.13,.035,C.membraneLight],[.14,.22,.017,.065,.13,.035,C.membraneLight],[-.105,.035,.16,.065,.05,.035,C.eye],[.105,.035,.16,.065,.05,.035,C.eye],[0,-.075,.16,.18,.09,.10,C.ink],[-.065,-.135,.17,.035,.07,.045,C.cream],[.065,-.135,.17,.035,.07,.045,C.cream]]);
  for(const side of [-1,1]){
   const shoulder=group(chest,side*.16,.08,-.03),tip=group(shoulder,side*.46,0,-.025);
   blocks(shoulder,[[side*.20,0,0,.43,.075,.11,C.ink],[side*.19,-.018,-.13,.40,.055,.23,C.membrane],[side*.12,-.026,-.29,.23,.045,.16,C.membraneLight],[side*.36,-.025,-.24,.17,.05,.20,C.membrane],[side*.42,0,-.05,.12,.08,.11,C.purple]]);
   blocks(tip,[[side*.20,0,-.07,.44,.065,.09,C.ink],[side*.18,-.016,-.20,.39,.04,.24,C.membrane],[side*.08,-.022,-.37,.19,.04,.16,C.membraneLight],[side*.33,-.02,-.23,.16,.04,.15,C.membrane],[side*.42,0,-.105,.12,.055,.08,C.ink]]);
   wings.push({shoulder,tip,side});
  }
 }else{
  // Torso includes the belt/hip pixels, leaving separate boots in the budget.
  blocks(chest,[[0,.10,0,.65,.60,.40,archer?C.green:C.navy],[0,.30,.035,.72,.30,.42,archer?C.green:C.steel],[0,-.23,0,.70,.12,.44,C.leather],[-.22,-.34,0,.23,.15,.40,archer?C.green:C.steel],[.22,-.34,0,.23,.15,.40,archer?C.green:C.steel],[0,-.20,.24,.13,.11,.055,C.tan],[0,.25,.265,.12,.34,.045,archer?C.tan:C.rust],[0,.50,0,.18,.15,.19,C.skinShade],[-.22,.23,-.235,.08,.40,.06,C.leather],[.22,.23,-.235,.08,.40,.06,C.leather]]);
  const face=[[0,.08,.025,.44,.42,.41,C.skin],[0,-.09,.06,.34,.10,.35,C.skinShade],[-.11,.09,.245,.055,.065,.025,C.ink],[.11,.09,.245,.055,.065,.025,C.ink],[0,-.01,.25,.08,.055,.035,C.skinShade]];
  if(archer)face.push([0,.31,-.015,.56,.12,.50,C.green],[-.25,.12,-.07,.11,.36,.40,C.green],[.25,.12,-.07,.11,.36,.40,C.green],[0,.11,-.24,.53,.39,.10,C.green],[0,.385,-.10,.36,.08,.34,C.greenLight],[0,-.19,.10,.48,.16,.37,C.red]);
  else face.push([0,.32,-.025,.56,.13,.50,C.steel],[-.245,.12,-.04,.09,.31,.44,C.steel],[.245,.12,-.04,.09,.31,.44,C.steel],[0,.08,-.23,.52,.36,.11,C.steel],[0,.19,.26,.43,.07,.06,C.ink],[0,.195,.29,.08,.14,.05,C.rust],[0,.42,-.065,.12,.08,.30,C.rust]);
  blocks(head,face);
  for(const side of [-1,1]){
   const arm=group(chest,side*.42,.35,0),forearm=group(arm,0,-.36,0),hand=group(forearm,0,-.38,0);
   blocks(arm,[[0,-.13,0,.24,.30,.27,archer?C.green:C.steel],[side*.04,-.02,0,.26,.12,.32,archer?C.greenLight:C.edge],[0,-.31,0,.18,.11,.21,archer?C.skin:C.navy]]);
   const fore=[[0,-.14,0,.18,.28,.20,archer?C.skin:C.navy],[0,-.24,.01,.22,.14,.24,C.leather],[0,-.36,.025,.19,.13,.21,archer?C.skin:C.steel]];
   if(!archer&&side===1)fore.push([0,-.15,.20,.44,.47,.12,C.leather],[0,-.15,.275,.35,.38,.05,C.navy],[0,-.15,.315,.12,.12,.07,C.steel]);
   blocks(forearm,fore);arms.push({arm,forearm,hand,side});
   const thigh=group(hips,side*.22,0,0),shin=group(thigh,0,-.42,0),foot=group(shin,0,-.43,0);
   blocks(thigh,[[0,-.21,0,.23,.42,.25,archer?C.navy:C.leather],[0,-.06,.03,.25,.15,.29,archer?C.green:C.navy]]);
   blocks(shin,[[0,-.18,0,.20,.36,.22,archer?C.navy:C.steel],[0,-.06,.12,.22,.13,.07,C.leather],[0,-.34,0,.24,.17,.27,C.leather]]);
   blocks(foot,[[0,-.045,.065,.27,.15,.40,C.ink],[0,.025,.08,.25,.06,.33,C.leather]]);
   legs.push({thigh,shin,foot,side,plant:new T.Vector3(),start:new T.Vector3(),end:new T.Vector3(),lift:0,swing:false,valid:false});
  }
  if(archer){
   bowMount=group(body,0,1.55,.55);bow=group(bowMount);arrow=group(bow);
   const pixels=[[0,0,0,.075,.19,.08,C.leather]];
   for(const side of [-1,1])for(let i=0;i<4;i++)pixels.push([0,side*(.14+i*.12),-.025-i*i*.018,.075,.13,.075,i%2?C.leather:C.tan]);
   blocks(bow,pixels);blocks(arrow,[[0,0,-.025,.028,.028,.84,C.tan],[0,0,.425,.065,.06,.10,C.edge],[0,0,.485,.035,.035,.03,C.edge],[0,.035,-.345,.035,.09,.13,C.cream]]);
   stringGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(),new T.Vector3()]);
   stringMaterial=new T.LineBasicMaterial({color:C.cream});stringLine=new T.Line(stringGeometry,stringMaterial);stringLine.frustumCulled=false;bow.add(stringLine);
  }else{
   sword=group(arms[0].hand,0,0,.025);
   blocks(sword,[[0,-.015,0,.075,.17,.085,C.leather],[0,-.12,0,.30,.065,.13,C.rust],[0,-.69,0,.15,1.10,.075,C.steel],[-.05,-.69,.045,.045,1.08,.02,C.edge],[0,-1.28,0,.09,.10,.06,C.edge],[0,-1.35,0,.035,.05,.04,C.edge]]);
   mantle=group(chest,0,.38,-.26);blocks(mantle,[[0,-.25,0,.61,.60,.08,C.red],[-.19,-.61,.015,.17,.17,.075,C.red],[.19,-.58,.015,.17,.12,.075,C.red],[0,-.54,0,.19,.12,.08,C.rust]]);
  }
 }
 let lastX=null,lastZ=null,travel=0,speed=0,yaw=0,clock=0,death=0,disposed=false,valid=false;
 let previousState='',previousMove='',blendLeft=0,blendDuration=.12,lastHurt=0,lastParry=0,recoil=0,parryRecoil=0,hurtX=0,hurtZ=-1;
 let attackEntry=null,attackPose=null,identity=null,lastStrikeIdentity=null,lastContactReached=false;
 const poseNodes=[fall,body,hips,chest,head,...arms.flatMap(a=>[a.arm,a.forearm]),...legs.flatMap(l=>[l.thigh,l.shin,l.foot]),...wings.flatMap(w=>[w.shoulder,w.tip]),...[sword,bowMount,bow,arrow,mantle].filter(Boolean)];
 const history=poseNodes.map(node=>({node,p:node.position.clone(),q:node.quaternion.clone(),s:node.scale.clone(),fromP:node.position.clone(),fromQ:node.quaternion.clone(),fromS:node.scale.clone(),targetQ:node.quaternion.clone()}));
 const rest={hx:-.47,hy:1.19,hz:.12,heading:-.22,pitch:-1.13,twist:0,lean:0,turn:0,bank:0,hip:0,drop:0,lx:.40,ly:1.22,lz:.18,head:0};
 const key=o=>({...rest,...o}),current={...rest},keys=Object.keys(rest);
 const slash={wind:key({hx:-.55,hy:1.91,hz:.10,heading:-1.04,pitch:.69,turn:-.48,hip:-.22,lean:-.08,drop:-.045,lx:.38,ly:1.47,lz:.28}),contact:key({hx:-.14,hy:1.54,hz:.58,heading:0,pitch:-.13,turn:.08,hip:.22,lean:.16,drop:-.075,lx:.40,ly:1.43,lz:.28}),follow:key({hx:.18,hy:1.22,hz:.36,heading:1.35,pitch:-.58,turn:.54,hip:.30,lean:.10,drop:-.065,lx:.43,ly:1.32,lz:.17})};
 const backslash={wind:key({hx:.13,hy:1.34,hz:.33,heading:1.38,pitch:-.23,turn:.49,hip:.23,lean:.08,drop:-.07,lx:.43,ly:1.35,lz:.18}),contact:key({hx:-.13,hy:1.56,hz:.59,heading:0,pitch:.12,turn:-.10,hip:-.23,lean:.12,drop:-.075,lx:.40,ly:1.45,lz:.24}),follow:key({hx:-.58,hy:1.85,hz:.17,heading:-1.20,pitch:.54,turn:-.48,hip:-.28,lean:-.03,drop:-.02,lx:.36,ly:1.43,lz:.20})};
 const thrust={wind:key({hx:-.49,hy:1.45,hz:-.20,heading:-.10,pitch:.04,turn:-.37,hip:-.17,lean:-.14,drop:-.07,lx:.28,ly:1.56,lz:.26}),contact:key({hx:-.13,hy:1.50,hz:.68,heading:0,pitch:0,turn:.10,hip:.20,lean:.22,drop:-.09,lx:.41,ly:1.39,lz:.12}),follow:key({hx:-.13,hy:1.43,hz:.57,heading:.04,pitch:-.12,turn:.12,hip:.19,lean:.18,drop:-.07,lx:.43,ly:1.32,lz:.14})};
 function blendPose(a,b,t){for(const k of keys)current[k]=mix(a[k],b[k],t);}
 function setRotation(node,x=0,y=0,z=0){node.rotation.set(x,y,z);}
 function reachArm(a,x,y,z){
  target.set(x,y,z).sub(chest.position).applyQuaternion(inverse.copy(chest.quaternion).invert());
  direction.copy(target).sub(a.arm.position);const length=clamp(direction.length(),.035,.735);direction.normalize();
  bend.set(a.side,.05,-.32).addScaledVector(direction,-bend.dot(direction)).normalize();
  const cosine=clamp((.36*.36+length*length-.38*.38)/(.72*length),-1,1);
  elbow.copy(direction).multiplyScalar(.36*cosine).addScaledVector(bend,.36*Math.sqrt(1-cosine*cosine));
  a.arm.quaternion.setFromUnitVectors(down,lower.copy(elbow).normalize());
  lower.copy(direction).multiplyScalar(length).sub(elbow).normalize();jointQ.setFromUnitVectors(down,lower);
  a.forearm.quaternion.copy(a.arm.quaternion).invert().multiply(jointQ);
 }
 function aimSword(p){
  direction.set(Math.sin(p.heading)*Math.cos(p.pitch),Math.sin(p.pitch),Math.cos(p.heading)*Math.cos(p.pitch));
  weaponParent.copy(chest.quaternion).multiply(arms[0].arm.quaternion).multiply(arms[0].forearm.quaternion);
  weaponQ.setFromUnitVectors(down,direction);sword.quaternion.copy(weaponParent).invert().multiply(weaponQ);sword.rotateY(p.twist);
 }
 function support(game,x,z,y){return root.HatGame?.supportHeight?root.HatGame.supportHeight(game,x,z,y+.28,.13):root.HatTerrain?.heightAt(x,z)??y;}
 function worldFoot(e,x,z,out){const c=Math.cos(yaw),s=Math.sin(yaw);out.set(e.x+c*x+s*z,e.y+.12,e.z-s*x+c*z);return out;}
 function solveLeg(l,e,game,point,lift){
  // World stance anchors cancel root travel. Local IK then follows terrain
  // height; boots retain a terrain-aligned ankle independent of knee bend.
  target.copy(point);target.y=support(game,point.x,point.z,e.y)+.12+lift;
  target.sub(base.position).applyQuaternion(inverse.copy(base.quaternion).invert()).sub(fall.position).sub(body.position).sub(hips.position).applyQuaternion(inverse.copy(hips.quaternion).invert());
  direction.copy(target).sub(l.thigh.position);const distance=clamp(direction.length(),.06,.848);direction.normalize();
  bend.set(0,.1,1).addScaledVector(direction,-bend.dot(direction)).normalize();
  const cosine=clamp((.42*.42+distance*distance-.43*.43)/(.84*distance),-1,1);
  elbow.copy(direction).multiplyScalar(.42*cosine).addScaledVector(bend,.42*Math.sqrt(1-cosine*cosine));
  l.thigh.quaternion.setFromUnitVectors(down,lower.copy(elbow).normalize());lower.copy(direction).multiplyScalar(distance).sub(elbow).normalize();jointQ.setFromUnitVectors(down,lower);
  l.shin.quaternion.copy(l.thigh.quaternion).invert().multiply(jointQ);
  const terrain=root.HatTerrain?.heightAt(point.x,point.z),floor=support(game,point.x,point.z,e.y);
  if(root.HatTerrain?.normalAt&&Math.abs(floor-terrain)<.04)root.HatTerrain.normalAt(point.x,point.z,normal);else normal.copy(up);
  normal.applyQuaternion(inverse.copy(base.quaternion).invert());floorQ.setFromUnitVectors(up,normal);
  l.foot.quaternion.copy(hips.quaternion).multiply(l.thigh.quaternion).multiply(l.shin.quaternion).invert().multiply(floorQ);
  if(lift>.015)l.foot.rotateX(-Math.sin(Math.min(1,lift/.18)*Math.PI)*.18);
 }
 function walkFeet(e,game,dx,dz,distance,dt,locked){
  const moving=dt>0&&!locked&&distance>.0001&&distance<1.5,advance=moving?distance:0;travel+=advance;
  const phase=travel,velocityLength=Math.hypot(dx,dz),vx=velocityLength>.0001?dx/velocityLength:Math.sin(yaw),vz=velocityLength>.0001?dz/velocityLength:Math.cos(yaw);
  for(let i=0;i<legs.length;i++){
   const l=legs[i],p=(phase+i*.5)%1,wantsSwing=moving&&p>=.60;
   if(!l.valid||distance>1.5){worldFoot(e,l.side*.22,i===0?.30:-.20,l.plant);l.start.copy(l.plant);l.end.copy(l.plant);l.valid=true;l.swing=false;}
   // A .40m swing interval lands .30m ahead of the future root. The .60m
   // stance interval then finishes .30m behind it, within the bent-leg reach.
   if(wantsSwing&&!l.swing){l.start.copy(l.plant);worldFoot(e,l.side*.22,0,l.end);l.end.x+=vx*.70;l.end.z+=vz*.70;l.swing=true;}
   if(l.swing){
    if(!wantsSwing){if(moving)l.plant.copy(l.end);l.swing=false;}
    else l.plant.lerpVectors(l.start,l.end,smooth((p-.60)/.40));
   }
   // Turning in place needs a small corrective foot placement only when the
   // old anchor would exceed leg reach, never an idle march driven by time.
   worldFoot(e,l.side*.22,0,target);const drift=Math.hypot(l.plant.x-target.x,l.plant.z-target.z);
   if(drift>.36&&!l.swing){l.plant.x=mix(l.plant.x,target.x,1-Math.exp(-14*dt));l.plant.z=mix(l.plant.z,target.z,1-Math.exp(-14*dt));}
   l.lift=l.swing?Math.sin((p-.60)/.40*Math.PI)*.17:Math.max(0,l.lift-dt*1.8);
   solveLeg(l,e,game,l.plant,l.lift);
  }
 }
 function captureTransition(state,move,duration){
  if(state===previousState&&move===previousMove)return;
  for(const h of history){h.fromP.copy(h.p);h.fromQ.copy(h.q);h.fromS.copy(h.s);}
  previousState=state;previousMove=move;blendDuration=duration;blendLeft=valid?duration:0;
 }
 function finishPose(dt){
  blendLeft=Math.max(0,blendLeft-dt);const t=blendLeft>0?smooth(1-blendLeft/blendDuration):1;
  for(const h of history){
   // Copy the target before slerp: three.js cannot alias its second input.
   if(t<1){h.node.position.lerpVectors(h.fromP,h.node.position,t);h.targetQ.copy(h.node.quaternion);h.node.quaternion.slerpQuaternions(h.fromQ,h.targetQ,t);h.node.scale.lerpVectors(h.fromS,h.node.scale,t);}
   h.p.copy(h.node.position);h.q.copy(h.node.quaternion);h.s.copy(h.node.scale);
  }
  valid=true;
 }
 function strikeData(e){
  const duration=Math.max(.01,e.strikeDuration||.32),contact=clamp(e.strikeContact??.10,.01,duration),elapsed=clamp(e.strikeElapsed||0,0,duration);
  return{duration,contact,elapsed,progress:elapsed/duration};
 }
 function guardPose(e){
  const cut=e.attackKind==='thrust'||e.moveId==='guardThrust'?thrust:e.moveId==='guardBackslash'||(e.comboIndex||0)%2?backslash:slash;
  const active=e.state==='strike',winding=e.state==='windup',recover=e.state==='recover'||e.state==='comboGap',s=strikeData(e);
  if(winding){const t=smooth((1-(e.timer||0)/Math.max(.01,e.windupDuration||1))/.85);blendPose(attackEntry||rest,cut.wind,t);}
  else if(active){if(s.elapsed<=s.contact)blendPose(cut.wind,cut.contact,smooth(s.elapsed/s.contact));else blendPose(cut.contact,cut.follow,1-Math.pow(1-clamp((s.elapsed-s.contact)/(s.duration-s.contact),0,1),2));}
  else if(recover&&attackPose){const t=e.state==='comboGap'?.13:smooth(1-(e.timer||0)/Math.max(.01,e.recoveryDuration||1))*.9;blendPose(attackPose,rest,t);}
  else blendPose(rest,rest,0);
  if(winding||active)attackPose={...current};
  chest.position.y+=current.drop;hips.position.y+=current.drop;
  chest.rotation.x+=current.lean;chest.rotation.y+=current.turn;chest.rotation.z+=current.bank;hips.rotation.y+=current.hip;head.rotation.y-=current.turn*.62;head.rotation.x=current.head-current.lean*.35;
  reachArm(arms[0],current.hx,current.hy+current.drop,current.hz);reachArm(arms[1],current.lx,current.ly+current.drop,current.lz);aimSword(current);
  if(mantle){mantle.rotation.x=-current.lean*.60-Math.sin(travel*TAU)*Math.min(.14,speed*.035);mantle.rotation.z=-current.turn*.12;}
  blade.active=active&&s.elapsed>=Math.max(0,s.contact-.065)&&s.elapsed<=Math.min(s.duration,s.contact+.14)&&!e.dead&&e.spawned!==false&&!(e.hitStun>0);
  blade.progress=s.progress;blade.attackId=e.strikeId||0;blade.kind=e.attackKind||'slash';
 }
 function archerPose(e){
  const winding=e.state==='windup',strike=e.state==='strike',s=strikeData(e),released=strike&&s.elapsed>=s.contact;
  const recovering=e.state==='recover'||e.state==='comboGap',restAmount=recovering?clamp(1-(e.timer||0)/Math.max(.01,e.recoveryDuration||e.comboGapDuration||1),0,1):1;
  let draw=winding?smooth((1-(e.timer||0)/Math.max(.01,e.windupDuration||1))/.82):strike?(released?Math.max(0,1-(s.elapsed-s.contact)/.045):1):0;
  const ready=winding||strike?1:recovering?1-smooth(restAmount):0;
  chest.rotation.y-=.16*ready;chest.rotation.x-=draw*.035;head.rotation.y+=.13*ready;
  const aimDistance=Math.max(.1,Math.hypot((e.aimX??e.x)-e.x-(e.dirX||0)*.55,(e.aimZ??e.z)-e.z-(e.dirZ||0)*.55));
  const elevation=Math.atan2((e.aimY??(e.y+1.55))-e.y-1.55,aimDistance);
  bowMount.rotation.x=-clamp(elevation,-.8,.8)*ready;bowMount.rotation.z=-.14*(1-ready);
  // Elevation pivots around the gameplay muzzle itself. At full draw the
  // arrow tip is exactly (0,1.55,.55), even when firing up/down a slope.
  bowMount.position.set(0,mix(1.12,1.55,ready),mix(.27,.55,ready));bow.position.set(0,0,0);
  const pull=.11+draw*.39,releaseKick=released?Math.sin(clamp((s.elapsed-s.contact)/.18,0,1)*Math.PI)*.10:0;
  target.set(0,0,0).applyQuaternion(bowMount.quaternion).add(bowMount.position);reachArm(arms[1],target.x,target.y,target.z);
  target.set(-releaseKick,0,-pull-releaseKick).applyQuaternion(bowMount.quaternion).add(bowMount.position);reachArm(arms[0],target.x,target.y,target.z);
  const positions=stringGeometry.attributes.position;positions.setXYZ(0,0,.50,-.19);positions.setXYZ(1,0,0,-pull);positions.setXYZ(2,0,-.50,-.19);positions.needsUpdate=true;
  arrow.position.z=-pull;arrow.visible=!released&&!recovering&&!e.dead;
 }
 function batPose(e,turn){
  const winding=e.state==='windup',motion=e.state==='dive'||e.state==='swoop';
  const wind=winding?smooth(1-(e.timer||0)/Math.max(.01,e.windupDuration||1)):0,m=motion?clamp(1-(e.timer||0)/Math.max(.01,e.motionDuration||.48),0,1):0;
  const recover=e.state==='recover'||e.state==='comboGap'?Math.min(1,(e.timer||0)/Math.max(.01,e.recoveryDuration||e.comboGapDuration||1)):0;
  const flap=clock*(motion?13:wind>.6?10:17),fold=motion?(e.state==='dive'?.72:.30):wind*.18;
  chest.rotation.x=winding?-.30*wind:motion?(e.state==='dive'?.55:-.20)*Math.sin(m*Math.PI):-.10*recover;
  chest.rotation.z=clamp(-turn*.8,-.30,.30)+(e.state==='swoop'?Math.sin(m*Math.PI)*.28:0);
  chest.position.y=1+(motion?0:Math.sin(flap-.6)*.015);head.rotation.x=-chest.rotation.x*.55;
  for(const w of wings){
   w.shoulder.rotation.z=w.side*(Math.sin(flap)*mix(.48,.12,fold)+wind*.28-fold*.65);
   w.shoulder.rotation.y=w.side*(fold*.76+wind*.15);w.shoulder.rotation.x=-.10*wind;
   w.tip.rotation.z=w.side*(Math.sin(flap-.80)*mix(.36,.10,fold)-fold*.40);
   w.tip.rotation.y=w.side*(fold*.62+wind*.12);
  }
 }
 function update(e,game,dt){
  if(disposed)return;identity=e.id;dt=Math.max(0,dt||0);
  const hurt=e.hitReactionTimer||0,parry=e.parryStaggerTimer||0,newHurt=hurt>lastHurt+.001,newParry=parry>lastParry+.001;
  const strikeIdentity=e.strikeId||0,contactEdge=!!e.contactReached&&(!lastContactReached||strikeIdentity!==lastStrikeIdentity);
  const cancelEdge=valid&&previousState!==e.state&&(e.dead||e.hitStun>0||previousState==='strike'||previousState==='windup');
  const resample=dt===0&&valid&&(newHurt||newParry||contactEdge||cancelEdge||!!strikeIdentity&&strikeIdentity!==lastStrikeIdentity);
  if(newHurt||newParry){hurtX=e.hitDirX||0;hurtZ=e.hitDirZ||0;recoil=Math.max(recoil,newHurt?.17:0);parryRecoil=Math.max(parryRecoil,newParry?.32:0);}
  lastHurt=hurt;lastParry=parry;
  // Simulation hit-stop freezes every local timer and ordinary cached pose.
  // Only a newly delivered contact/impact may resample authoritative state.
  if(dt===0&&valid&&!resample){
   material.color.set(newParry?'#b9ccd0':newHurt?'#f7d4bd':material.color);
   base.visible=e.spawned!==false&&(!e.dead||death<.38);
   blade.visible=!!sword&&base.visible&&!e.dead;
   if(e.dead||e.spawned===false||e.state!=='strike'||e.hitStun>0||e.parryStaggerTimer>0||blade.attackId!==(e.strikeId||0))blade.active=false;
   return;
  }
  clock+=dt;recoil=Math.max(0,recoil-dt);parryRecoil=Math.max(0,parryRecoil-dt);
  const first=lastX===null,dx=first?0:e.x-lastX,dz=first?0:e.z-lastZ,distance=Math.hypot(dx,dz);
  const attack=e.state==='windup'||e.state==='strike'||e.state==='dive'||e.state==='swoop',moving=distance>.0001&&distance<1.5;
  const desired=Math.hypot(e.dirX||0,e.dirZ||0)>.001?Math.atan2(e.dirX,e.dirZ):yaw;
  if(first)yaw=desired;
  const turn=angle(yaw,desired),committed=e.state==='windup'||e.state==='strike'||e.state==='dive'||e.state==='swoop';
  let yawRate=committed?10:6;
  if(e.state==='strike'){const s=strikeData(e);yawRate=Math.max(yawRate,Math.abs(turn)/Math.max(.001,s.contact-s.elapsed));}
  if(e.state==='windup')yawRate=Math.max(yawRate,Math.abs(turn)/Math.max(.03,(e.timer||0)));
  yaw+=clamp(turn,-yawRate*dt,yawRate*dt);base.position.set(e.x,e.y,e.z);base.rotation.y=yaw;
  speed=mix(speed,moving&&dt>0?distance/dt:0,1-Math.exp(-12*dt));
  const state=e.dead?'dead':e.state||'idle',move=(e.moveId||e.attackKind||'')+':'+(e.comboIndex||0);
  if(e.state==='windup'&&(previousState!=='windup'||move!==previousMove))attackEntry={...current};
  // No transition blend at contact: strike starts at the held windup pose.
  captureTransition(state,move,e.state==='strike'?.025:e.state==='windup'?.13:.12);
  fall.position.set(0,bat?1:.86,0);fall.scale.set(1,1,1);setRotation(fall);body.position.set(0,bat?-1:-.86,0);setRotation(body);
  hips.position.set(0,.88,0);setRotation(hips);chest.position.set(0,bat?1:1.3,0);chest.scale.set(1,1,1);setRotation(chest);setRotation(head);
  if(!bat){
   const gait=travel*TAU,walk=Math.min(1,speed/2.4),breath=Math.sin(clock*2.3)*.007;
   chest.position.y+=breath;chest.rotation.y=Math.sin(gait)*walk*.055+clamp(turn,-.4,.4)*.30;hips.rotation.y=-Math.sin(gait)*walk*.045;head.rotation.y=clamp(turn,-.5,.5)*.5;
   if(archer)archerPose(e);else guardPose(e);
   if(!attack&&state!=='recover'&&state!=='comboGap'){
    // Locomotion swings the free elbows while the sword/shield remain carried.
    for(const a of arms){a.arm.rotateX(Math.sin(gait+(a.side<0?Math.PI:0))*walk*.20);a.forearm.rotateX(-walk*.09);}
   }
   walkFeet(e,game,dx,dz,distance,dt,attack||e.dead||e.hitStun>0);
  }else batPose(e,turn);
  const localHitX=Math.cos(yaw)*hurtX-Math.sin(yaw)*hurtZ,localHitZ=Math.sin(yaw)*hurtX+Math.cos(yaw)*hurtZ,impact=clamp(recoil/.17,0,1),stagger=clamp(parryRecoil/.32,0,1);
  chest.rotation.x+=localHitZ*impact*.20-stagger*.22;chest.rotation.z-=localHitX*impact*.20;head.rotation.x-=impact*.10;
  if(stagger&&arms.length){arms[0].arm.rotateX(-stagger*.45);arms[0].forearm.rotateX(-stagger*.30);}
  material.color.set(parry>0?'#b9ccd0':e.hitFlash>0?'#f4d1b4':'#ffffff');
  if(e.dead){death=Math.min(.38,death+dt);const t=smooth(death/.38);fall.position.y=(bat?1:.86)-t*(bat?.70:.65);fall.rotation.x=t*1.35;fall.rotation.z=t*.32;fall.scale.setScalar(1-t*.12);blade.active=false;}
  else death=0;
  base.visible=e.spawned!==false&&(!e.dead||death<.38);
  if(e.state==='spawning'){const t=smooth(1-(e.spawnRemaining||0)/Math.max(.01,e.spawnDuration||1));fall.scale.setScalar(.55+.45*t);fall.position.y-=.25*(1-t);}
  // A contact/hit-stop edge samples the authoritative pose once without
  // advancing any clocks. Blending that edge from the pre-hit pose would
  // otherwise leave the visible blade behind the damage event.
  if(resample)blendLeft=0;
  finishPose(dt);base.updateMatrixWorld(true);
  if(sword){blade.base.set(0,-.13,0);sword.localToWorld(blade.base);blade.tip.set(0,-1.375,0);sword.localToWorld(blade.tip);blade.visible=base.visible&&!e.dead;}
  lastX=e.x;lastZ=e.z;lastStrikeIdentity=strikeIdentity;lastContactReached=!!e.contactReached;
 }
 function emit(event){
  if(event.targetId!==identity)return;
  if(event.type==='hurt'){hurtX=event.dirX||0;hurtZ=event.dirZ||0;recoil=.17;}
  if(event.type==='parry')parryRecoil=.32;
 }
 function dispose(){if(disposed)return;disposed=true;stringGeometry?.dispose();stringMaterial?.dispose();kit.dispose();}
 return{update,emit,dispose,getBladeSegment:()=>sword?blade:null};
}
root.HatPixelEnemies={create};
})(window);
