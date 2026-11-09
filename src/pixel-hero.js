(function(root){'use strict';
// Read-only world rig: +Z is forward, +X is the character's left. A world
// direction (dx,dz) therefore has yaw atan2(dx,dz). Never rotate to the camera.
// Small rectangular pixel masses are merged ONCE per moving part. Opaque,
// vertex-coloured flat faces keep the palette and silhouette at 320px height.
function create({THREE:T,scene,camera}){
 const C={ink:'#20232c',hair:'#282a32',hairLight:'#363740',skin:'#e6b18d',skinShade:'#bd8b6d',green:'#5b6853',greenLight:'#7d8666',navy:'#293a4c',navyLight:'#3b4d5d',straw:'#cba163',strawLight:'#e7c282',strawDark:'#987046',tan:'#bd9c70',cream:'#e9d2a2',teal:'#66a9a1',steel:'#aabcc7',steelLight:'#dfded2',orange:'#d89b58',orangeDark:'#a9693b',catCream:'#efdcba',scarf:'#773e50'};
 const geometries=[],materials=[],unit=new T.BoxGeometry(1,1,1);
 const heroMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,flatShading:true});
 const catMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,flatShading:true});materials.push(heroMaterial,catMaterial);
 const positions=unit.attributes.position,normals=unit.attributes.normal,indices=unit.index;
 const palette=Object.fromEntries(Object.entries(C).map(([key,color])=>[key,new T.Color(color)]));
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
 function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
 function blocks(parent,list,material=heroMaterial){
  const pos=[],col=[],idx=[];
  for(const b of list){const [x,y,z,w,h,d,key]=b,color=palette[key],offset=pos.length/3;
   for(let i=0;i<positions.count;i++){
    pos.push(x+positions.getX(i)*w,y+positions.getY(i)*h,z+positions.getZ(i)*d);
    // Gentle palette shading preserves pixel masses; the same world lights
    // now illuminate the heroine, cat and stone instead of pasted-on colours.
    const shade=normals.getY(i)<-.5?.82:1;
    col.push(color.r*shade,color.g*shade,color.b*shade);
   }
   for(let i=0;i<indices.count;i++)idx.push(offset+indices.getX(i));
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setAttribute('color',new T.Float32BufferAttribute(col,3));geometry.setIndex(idx);geometry.computeVertexNormals();geometry.computeBoundingSphere();geometries.push(geometry);
  const mesh=new T.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 const base=new T.Group();scene.add(base);base.name='pixel-hero';
 const roll=group(base,0,1.15,0),body=group(roll,0,-1.15,0),hips=group(body),chest=group(body,0,1.35,0);
 blocks(chest,[
  [0,.15,0,.56,.32,.38,'green'],[0,.40,0,.70,.34,.40,'green'],[0,.58,0,.57,.10,.36,'greenLight'],
  [0,.66,0,.18,.16,.18,'skinShade'],[0,.31,.218,.37,.41,.05,'navy'],
  [-.22,.48,.225,.085,.32,.06,'tan'],[.22,.48,.225,.085,.32,.06,'tan'],
  [0,.03,0,.62,.09,.45,'tan'],[-.18,.48,-.222,.085,.28,.045,'tan'],[.18,.48,-.222,.085,.28,.045,'tan'],
  [-.13,.32,-.223,.10,.10,.045,'tan'],[.13,.32,-.223,.10,.10,.045,'tan'],
  [-.07,.23,-.223,.10,.10,.045,'tan'],[.07,.23,-.223,.10,.10,.045,'tan'],
  [0,.07,-.27,.13,.10,.09,'cream'],[-.12,.09,-.265,.13,.12,.065,'tan'],[.12,.09,-.265,.13,.12,.065,'tan'],
  [-.055,-.04,-.266,.06,.16,.05,'tan'],[.07,-.08,-.266,.06,.22,.05,'tan']
 ]);
 const skirt=group(hips,0,1.29,0),skirtPixels=[
  [0,-.08,0,.65,.22,.45,'navy'],[0,-.27,0,.81,.20,.53,'navy'],[0,-.44,0,.95,.18,.62,'navy'],
  [-.35,-.30,.285,.09,.28,.035,'navyLight'],[.35,-.30,.285,.09,.28,.035,'navyLight'],
  [-.38,-.32,-.294,.08,.25,.04,'navyLight'],[.38,-.32,-.294,.08,.25,.04,'navyLight'],
  [.18,-.36,.328,.17,.16,.035,'strawDark'],[-.21,-.31,-.318,.15,.12,.03,'tan'],
  [0,-.53,0,.98,.09,.65,'tan']
 ];
 for(let i=-4;i<=4;i++){const x=i*.105;skirtPixels.push([x,-.60+(i%2===0?0:.025),.304,.065,.10,.07,'cream'],[x,-.60+(i%2===0?0:.025),-.304,.065,.10,.07,'cream']);}
 for(const side of [-1,1])for(let j=-1;j<=1;j++)skirtPixels.push([side*.465,-.59,j*.16,.07,.10,.07,'cream']);
 blocks(skirt,skirtPixels);
 const legs=[];
 for(const side of [-1,1]){
  const leg=group(hips,side*.22,.91,0),shin=group(leg,0,-.36,0);
  blocks(leg,[[0,-.18,0,.21,.38,.24,'skin'],[side*.073,-.21,-.01,.07,.28,.25,'skinShade']]);
  blocks(shin,[[0,-.12,0,.19,.26,.21,'skin'],[0,-.29,0,.25,.27,.27,'ink'],[0,-.29,.03,.19,.23,.25,'tan'],[0,-.45,.08,.28,.15,.43,'ink'],[0,-.405,.12,.23,.075,.33,'tan']]);
  legs.push({leg,shin});
 }
 const head=group(chest,0,.70,0),headPixels=[
  [0,.12,0,.50,.48,.45,'skin'],[0,-.09,.03,.37,.10,.38,'skinShade'],
  [-.285,.08,0,.09,.15,.15,'skin'],[.285,.08,0,.09,.15,.15,'skin'],
  [0,.17,-.235,.58,.49,.14,'hair'],[-.25,.14,-.04,.12,.45,.42,'hair'],[.25,.20,-.04,.12,.33,.42,'hair'],
  [0,.35,.02,.55,.12,.48,'hair'],[-.15,.28,.24,.20,.17,.06,'hair'],[.015,.315,.24,.14,.10,.06,'hair'],
  [-.12,.105,.235,.06,.075,.025,'ink'],[.13,.105,.235,.06,.075,.025,'ink'],
  [0,-.015,.237,.06,.035,.02,'skinShade'],[-.16,.015,.237,.08,.035,.02,'skinShade']
 ];
 // Stepped oval brim and crown, with woven rows and the atlas's teal hat tie.
 for(const [z,w] of [[-.56,.72],[-.42,1.23],[-.28,1.49],[-.14,1.65],[0,1.72],[.14,1.65],[.28,1.49],[.42,1.23],[.56,.72]])headPixels.push([0,.39,z,w,.105,.14,'straw']);
 headPixels.push([0,.47,0,.97,.13,.79,'strawDark'],[0,.56,-.02,.85,.16,.69,'straw'],[0,.68,-.04,.69,.09,.55,'strawLight'],[0,.49,.365,.83,.055,.055,'strawLight'],[-.43,.52,-.02,.07,.19,.34,'teal']);
 for(const z of [-.39,-.13,.13,.39])for(const side of [-1,1])headPixels.push([side*(Math.abs(z)>.3?.49:.65),.449,z,.15,.012,.055,'strawLight']);
 for(const x of [-.27,0,.27])headPixels.push([x,.725,-.06,.13,.012,.13,'straw']);
 blocks(head,headPixels);
 const tails=[];
 for(const side of [-1,1]){
  const tail=group(head,side*.32,.06,-.21),tip=group(tail,side*.06,-.33,-.07);
  blocks(tail,[[0,0,0,.17,.16,.17,'tan'],[side*.035,-.18,-.06,.22,.30,.22,'hair'],[side*.07,-.32,-.10,.19,.13,.22,'hair'],[side*.06,-.17,-.175,.09,.19,.025,'hairLight']]);
  blocks(tip,[[0,-.13,-.03,.17,.30,.18,'hair'],[side*.04,-.29,-.065,.13,.14,.15,'hair'],[side*.025,-.16,-.13,.06,.18,.03,'hairLight']]);tails.push({tail,tip,side});
 }
 const arms=[];
 for(const side of [-1,1]){
  const arm=group(chest,side*.41,.43,0),forearm=group(arm,0,-.30,0);arm.rotation.order='YXZ';
  const armPixels=[[0,-.08,0,.24,.22,.29,'green'],[0,-.19,0,.25,.08,.31,'tan'],[0,-.245,0,.17,.13,.21,'skin']];
  for(const z of [-.11,0,.11])armPixels.push([side*.10,-.26,z,.07,.11,.07,'cream']);
  blocks(arm,armPixels);blocks(forearm,[[0,-.13,0,.17,.27,.19,'skin'],[0,-.28,.02,.19,.11,.21,'skin'],[0,-.205,-.01,.18,.065,.21,'navy']]);arms.push({arm,forearm});
 }
 const right=arms[0],left=arms[1],sword=group(right.forearm,0,-.31,.025);
 blocks(sword,[[0,-.035,0,.075,.18,.075,'ink'],[0,-.045,.005,.055,.13,.07,'tan'],[0,-.145,0,.31,.065,.14,'strawDark'],[0,-.57,0,.14,.80,.075,'steel'],[-.047,-.57,.042,.045,.78,.02,'steelLight'],[0,-1.0,0,.08,.09,.055,'steelLight'],[0,-1.065,0,.035,.05,.04,'steelLight']]);
 // A forearm-sized stepped buckler: its 0.66m silhouette leaves the hat,
 // face and apron readable. Shared opaque material, no shield-sized glow.
 const shield=group(left.forearm,0,-.25,.10),shieldPixels=[];
 for(const [y,w] of [[-.28,.30],[-.20,.50],[-.10,.62],[0,.66],[.10,.62],[.20,.50],[.28,.30]]){
  shieldPixels.push([0,y,0,w,.10,.10,'strawDark'],[0,y,.065,Math.max(.12,w-.09),.08,.055,'navy']);
 }
 shieldPixels.push([0,0,.12,.17,.17,.10,'steel'],[0,.015,.178,.085,.085,.015,'steelLight'],[-.25,0,.105,.05,.055,.025,'cream'],[.25,0,.105,.05,.055,.025,'cream'],[0,.25,.105,.055,.05,.025,'cream'],[0,-.25,.105,.055,.05,.025,'cream']);blocks(shield,shieldPixels);
 // One reusable flask shares the heroine's pixel material; drinking only moves
 // the hand and toggles this mesh, so repeated R presses allocate no geometry.
 const bottle=group(left.forearm,0,-.31,.02);
 blocks(bottle,[[0,.025,0,.17,.20,.15,'teal'],[0,.025,.08,.08,.10,.02,'cream'],[0,.16,0,.075,.09,.08,'strawDark'],[0,.22,0,.085,.035,.09,'cream']]);bottle.visible=false;
 // The shortbow is held at the same +1.45m height used by the engine's muzzle.
 // A body-local mount makes the shape readable without camera-facing planes.
 const bowMount=group(body,0,1.45,0),bow=group(bowMount,.07,0,.40),arrow=group(bow,0,0,0);
 const bowPixels=[[0,0,0,.075,.20,.075,'tan']];
 for(const side of [-1,1])for(let i=0;i<4;i++)bowPixels.push([0,side*(.13+i*.115),-.025-i*i*.018,.07,.13,.075,i%2?'strawDark':'tan']);
 blocks(bow,bowPixels);blocks(arrow,[[0,0,.12,.026,.026,.86,'tan'],[0,0,.58,.07,.06,.12,'steelLight'],[0,0,.665,.035,.035,.06,'steelLight'],[0,.035,-.25,.035,.09,.12,'cream']]);
 const stringGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(),new T.Vector3()]);geometries.push(stringGeometry);
 const stringMaterial=new T.LineBasicMaterial({color:C.cream,toneMapped:false});materials.push(stringMaterial);const stringLine=new T.Line(stringGeometry,stringMaterial);stringLine.frustumCulled=false;bow.add(stringLine);bowMount.visible=false;
 const catBase=new T.Group();scene.add(catBase);catBase.name='pixel-companion';
 const catBody=group(catBase),catHead=group(catBody,0,.51,.30),catLegs=[];
 blocks(catBody,[[0,.35,-.05,.42,.37,.68,'orange'],[0,.25,.15,.35,.24,.29,'catCream'],[0,.515,-.05,.36,.05,.53,'orange'],[0,.49,-.13,.43,.08,.07,'orangeDark'],[0,.49,-.33,.43,.08,.07,'orangeDark'],[0,.49,.20,.48,.10,.18,'scarf']],catMaterial);
 blocks(catHead,[[0,.10,0,.45,.37,.34,'orange'],[-.15,.32,-.03,.13,.20,.15,'orange'],[.15,.32,-.03,.13,.20,.15,'orange'],[-.15,.32,.055,.065,.12,.025,'catCream'],[.15,.32,.055,.065,.12,.025,'catCream'],[0,.01,.17,.30,.16,.13,'catCream'],[-.12,.15,.18,.045,.075,.03,'ink'],[.12,.15,.18,.045,.075,.03,'ink'],[0,.045,.245,.065,.04,.035,'ink'],[0,.23,-.18,.30,.075,.025,'orangeDark']],catMaterial);
 for(const side of [-1,1])for(const z of [-.25,.19]){
  const leg=group(catBody,side*.16,.29,z);blocks(leg,[[0,-.09,0,.13,.23,.15,'orange'],[0,-.225,.025,.14,.07,.20,'catCream']],catMaterial);catLegs.push({leg,side,z});
 }
 const catTail=group(catBody,0,.42,-.39),catTailTip=group(catTail,0,.33,-.17),scarf=group(catBody,0,.49,-.18);
 blocks(catTail,[[0,.10,-.06,.12,.25,.13,'orange'],[0,.27,-.15,.12,.19,.13,'orangeDark']],catMaterial);
 blocks(catTailTip,[[0,.10,0,.11,.23,.13,'orange'],[0,.25,.04,.12,.12,.18,'catCream']],catMaterial);
 blocks(scarf,[[0,.06,-.03,.15,.10,.30,'scarf'],[.045,.09,-.22,.17,.10,.20,'scarf']],catMaterial);
 unit.dispose();
 let clock=0,lastX=null,lastZ=null,travel=0,speed=0,yaw=0,hipYaw=0,gaitDirection=1,headTurn=0,hidden=false;
 let catX=null,catZ=null,catTravel=0,catSpeed=0,catYaw=0,castKind=null,castLeft=0,releaseLeft=0,disposed=false;
 let castYaw=0,releaseYaw=0,lastDrawElevation=0,releaseElevation=0;
 let sprintAmount=0,airAmount=0,lastGrounded=null,lastVy=0,landLeft=0,landWeight=1,deathAmount=0,catY=null;
 let guardWeight=0,hurtDirX=0,hurtDirZ=-1,catVelocityY=0;
 const heroWorld=new T.Vector3(),catWorld=new T.Vector3(),bowTarget=new T.Vector3(),armDirection=new T.Vector3(),armBend=new T.Vector3(),elbowPoint=new T.Vector3(),lowerDirection=new T.Vector3(),down=new T.Vector3(0,-1,0),chestInverse=new T.Quaternion(),lowerRotation=new T.Quaternion();
 const bottleRotation=new T.Quaternion(),bottleTilt=new T.Quaternion(),sideAxis=new T.Vector3(1,0,0);
 const weaponParent=new T.Quaternion(),weaponRotation=new T.Quaternion(),bladeDirection=new T.Vector3();
 // Reused by actors/FX; sample only after all articulated transforms are set.
 const bladeSegment={base:new T.Vector3(),tip:new T.Vector3(),visible:false,active:false,attackId:0,combo:0,progress:0,jumpAttack:false,counter:false};
 function rotate(g,x=0,y=0,z=0){g.rotation.set(x,y,z);}
 function dampAngle(a,b,rate,dt){return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*(1-Math.exp(-rate*dt));}
 function setArm(a,x,y,z,elbow){rotate(a.arm,x,y,z);rotate(a.forearm,elbow,0,0);}
 function holdBow(a,side,stringOffset){
  // Solve two short bones against the actual tilted grip/string, keeping the
  // drawing hand attached to the arrow instead of floating in an atlas pose.
  bowTarget.set(bow.position.x,0,bow.position.z+stringOffset).applyQuaternion(bowMount.quaternion).add(bowMount.position).sub(chest.position).applyQuaternion(chestInverse.copy(chest.quaternion).invert());
  reachHand(a,side);
 }
 function reachHand(a,side){
  // bowTarget is the desired hand point in chest-local space.
  armDirection.copy(bowTarget).sub(a.arm.position);const reach=clamp(armDirection.length(),.04,.609);armDirection.normalize();
  armBend.set(side,.15,-.25).addScaledVector(armDirection,-armBend.dot(armDirection)).normalize();
  const cosine=clamp((.30*.30+reach*reach-.31*.31)/(.60*reach),-1,1);
  elbowPoint.copy(armDirection).multiplyScalar(.30*cosine).addScaledVector(armBend,.30*Math.sqrt(1-cosine*cosine));
  a.arm.quaternion.setFromUnitVectors(down,lowerDirection.copy(elbowPoint).normalize());
  lowerDirection.copy(armDirection).multiplyScalar(reach).sub(elbowPoint).normalize();lowerRotation.setFromUnitVectors(down,lowerDirection);
  a.forearm.quaternion.copy(a.arm.quaternion).invert().multiply(lowerRotation);
 }
 function handAt(a,side,x,y,z){
  bowTarget.set(x,y,z).sub(chest.position).applyQuaternion(chestInverse.copy(chest.quaternion).invert());reachHand(a,side);
 }
 function aimBlade(heading,pitch,twist=0){
  bladeDirection.set(Math.sin(heading)*Math.cos(pitch),Math.sin(pitch),Math.cos(heading)*Math.cos(pitch));
  weaponParent.copy(chest.quaternion).multiply(right.arm.quaternion).multiply(right.forearm.quaternion);
  weaponRotation.setFromUnitVectors(down,bladeDirection);sword.quaternion.copy(weaponParent).invert().multiply(weaponRotation);sword.rotateY(twist);
 }
 function faceShield(pitch=0,heading=0,bank=0){
  weaponParent.copy(chest.quaternion).multiply(left.arm.quaternion).multiply(left.forearm.quaternion);
  shield.rotation.set(pitch,heading,bank);weaponRotation.copy(shield.quaternion);shield.quaternion.copy(weaponParent).invert().multiply(weaponRotation);
 }
 function plantFoot(l,drop,lift=0){
  const thigh=l.leg.rotation.x,ankle=thigh+l.shin.rotation.x,sine=Math.sin(ankle);
  // Include the boot's protruding toe when finding its lowest pixel corner.
  l.leg.position.y=.025+.36*Math.cos(thigh)+.525*Math.cos(ankle)+(sine>0?.295:-.135)*sine-drop+lift;
 }
 function directionYaw(dx,dz,fallback){dx=Number.isFinite(dx)?dx:0;dz=Number.isFinite(dz)?dz:0;return Math.hypot(dx,dz)>.001?Math.atan2(dx,dz):fallback;}
 function eventYaw(e){
  // Cat's gesture starts at the heroine, while its separate flight starts at
  // e.from. Q and the main arrow already carry their committed X/Z direction.
  const dx=Number.isFinite(e.dirX)?e.dirX:e.to?e.to.x-e.x:0,dz=Number.isFinite(e.dirZ)?e.dirZ:e.to?e.to.z-e.z:0;
  return directionYaw(dx,dz,yaw);
 }
 function eventPose(e){
  if(e.type==='hurt'&&e.targetId==='player'){hurtDirX=e.dirX||0;hurtDirZ=e.dirZ||0;}
  if(e.origin==='reaction')return;
  if(e.type==='bowDraw'){castLeft=releaseLeft=0;}
  if(e.type==='windCut'||e.type==='cat'){castKind=e.type==='cat'?'cat':'nova';castLeft=e.type==='cat'?.28:.30;castYaw=eventYaw(e);releaseLeft=0;}
  if(e.type==='bolt'){
   releaseLeft=.12;releaseYaw=eventYaw(e);castLeft=0;
   // Only the primary bolt event owns release pose. Split-arrow projectile
   // events cannot overwrite it; older emitters retain the last draw pitch.
   releaseElevation=clamp(Number.isFinite(e.elevation)?e.elevation:Number.isFinite(e.dirY)?Math.atan2(e.dirY,Math.hypot(e.dirX||0,e.dirZ||0)):lastDrawElevation,-1.25,1.25);
  }
 }
 // Authored whole-body key poses, in body-local metres/radians. The hand
 // follows a reachable arc; the wrist aims the real blade independently of
 // the elbow. Hips lead, shoulder follows, blade and skirt finish last.
 const ready={hx:-.48,hy:1.28,hz:.16,by:-.35,bp:-1.05,bt:0,cx:0,cy:0,cz:0,hip:0,drop:0,rt:-.04,rk:.10,lt:.03,lk:.05,lx:-.32,ly:0,lz:.12,le:-.55,head:0,skirt:0};
 const key=changes=>({...ready,...changes}),poseKeys=Object.keys(ready),cutPose={...ready},cutEntryPose={...ready};
 // Cache the actually displayed local transforms, not an assumed idle pose.
 // Blends finish before the damage window so blade contact timing is unchanged.
 const poseNodes=[roll,body,hips,chest,head,skirt,...legs.flatMap(l=>[l.leg,l.shin]),...arms.flatMap(a=>[a.arm,a.forearm]),sword,shield,bowMount];
 const poseHistory=poseNodes.map(node=>({node,lastP:node.position.clone(),lastQ:node.quaternion.clone(),lastS:node.scale.clone(),fromP:node.position.clone(),fromQ:node.quaternion.clone(),fromS:node.scale.clone(),targetQ:node.quaternion.clone()}));
 let poseState='',poseLeft=0,poseDuration=0,poseValid=false,cutYawFrom=0;
 function beginPose(state,duration,dt){
  if(state!==poseState){for(const h of poseHistory){h.fromP.copy(h.lastP);h.fromQ.copy(h.lastQ);h.fromS.copy(h.lastS);}poseState=state;poseDuration=duration;poseLeft=poseValid?duration:0;}
  poseLeft=Math.max(0,poseLeft-dt);
 }
 function finishPose(){
  const t=poseLeft>0?smooth(1-poseLeft/Math.max(.001,poseDuration)):1;
  for(const h of poseHistory){if(t<1){h.node.position.lerpVectors(h.fromP,h.node.position,t);h.targetQ.copy(h.node.quaternion);h.node.quaternion.slerpQuaternions(h.fromQ,h.targetQ,t);h.node.scale.lerpVectors(h.fromS,h.node.scale,t);}h.lastP.copy(h.node.position);h.lastQ.copy(h.node.quaternion);h.lastS.copy(h.node.scale);}poseValid=true;
 }
 const cuts=[
  { // Right shoulder loads; left foot receives the descending diagonal cut.
   wind:key({hx:-.62,hy:1.91,hz:.12,by:-1.02,bp:.78,bt:-.35,cx:-.09,cy:-.49,cz:.06,hip:-.24,drop:-.035,rt:.20,rk:.20,lt:-.30,lk:.34,lx:-.62,le:-.95,head:-.04,skirt:.03}),
   contact:key({hx:-.16,hy:1.55,hz:.59,by:.03,bp:-.18,bt:-.32,cx:.16,cy:.12,cz:-.07,hip:.24,drop:-.09,rt:.23,rk:.35,lt:-.43,lk:.38,lx:-.48,ly:.25,le:-1.03,skirt:-.08}),
   follow:key({hx:.20,hy:1.27,hz:.30,by:1.28,bp:-.64,bt:-.4,cx:.14,cy:.52,cz:-.09,hip:.31,drop:-.075,rt:.23,rk:.25,lt:-.34,lk:.37,lx:-.34,ly:.2,le:-.80,skirt:-.13}),
   recover:key({hx:.13,hy:1.25,hz:.26,by:1.44,bp:-.83,cx:.07,cy:.34,hip:.18,drop:-.04,lt:-.20,lk:.24,lx:-.3,le:-.65,skirt:-.09})
  },
  { // Return edge crosses low left to high right, reversing the planted hips.
   wind:key({hx:.13,hy:1.36,hz:.32,by:1.62,bp:-.37,bt:.30,cx:.08,cy:.55,cz:-.04,hip:.26,drop:-.07,rt:-.27,rk:.30,lt:.20,lk:.23,lx:-.30,ly:.4,le:-1.15,skirt:-.07}),
   contact:key({hx:-.13,hy:1.57,hz:.60,by:-.04,bp:.15,bt:.28,cx:.10,cy:-.10,cz:.07,hip:-.27,drop:-.075,rt:-.42,rk:.37,lt:.20,lk:.30,lx:-.38,le:-.95,skirt:.08}),
   follow:key({hx:-.63,hy:1.83,hz:.23,by:-1.33,bp:.61,bt:.38,cx:-.03,cy:-.53,cz:.06,hip:-.33,drop:-.035,rt:-.33,rk:.30,lt:.18,lk:.22,lx:-.58,le:-.75,skirt:.14}),
   recover:key({hx:-.63,hy:1.72,hz:.18,by:-1.45,bp:.38,cx:0,cy:-.30,hip:-.18,rt:-.20,rk:.22,lx:-.48,le:-.65,skirt:.10})
  },
  { // A held overhead load, both boots planted through the heavy downswing.
   wind:key({hx:-.27,hy:2.13,hz:.05,by:-.28,bp:1.17,bt:.15,cx:-.16,cy:-.25,hip:-.14,drop:-.12,rt:.12,rk:.40,lt:-.34,lk:.55,lx:-.60,le:-1.05,head:-.12,skirt:.09}),
   contact:key({hx:-.12,hy:1.54,hz:.60,by:.06,bp:-.21,cx:.31,cy:.12,hip:.18,drop:-.15,rt:.16,rk:.41,lt:-.47,lk:.53,lx:-.35,le:-1.12,head:-.11,skirt:-.11}),
   follow:key({hx:-.10,hy:1.15,hz:.46,by:.12,bp:-1.08,cx:.35,cy:.20,hip:.20,drop:-.15,rt:.18,rk:.43,lt:-.40,lk:.50,lx:-.28,ly:.17,le:-.92,head:-.12,skirt:-.18}),
   recover:key({hx:-.13,hy:1.13,hz:.39,by:.22,bp:-1.24,cx:.22,cy:.14,hip:.12,drop:-.10,rt:.10,rk:.30,lt:-.30,lk:.40,lx:-.30,le:-.70,head:-.06,skirt:-.11})
  }
 ];
 const airCut={
  wind:key({hx:-.29,hy:2.16,hz:.05,by:-.20,bp:1.34,cx:-.21,cy:-.16,hip:-.10,rt:-1.05,rk:1.35,lt:-.75,lk:1.10,lx:-1.0,lz:.30,le:-.65,head:-.12,skirt:.12}),
  contact:key({hx:-.11,hy:1.63,hz:.56,by:.03,bp:-.30,cx:.28,cy:.08,hip:.09,rt:-.58,rk:.90,lt:.15,lk:.42,lx:-.65,lz:.35,le:-.75,head:-.10,skirt:-.18}),
  follow:key({hx:-.08,hy:1.19,hz:.41,by:.06,bp:-1.16,cx:.42,cy:.14,hip:.12,rt:-.45,rk:.78,lt:.28,lk:.30,lx:-.39,lz:.28,le:-.70,head:-.14,skirt:-.23}),
  recover:key({hx:-.19,hy:1.22,hz:.33,by:.10,bp:-1.13,cx:.22,cy:.08,rt:-.38,rk:.63,lt:.12,lk:.34,lx:-.34,lz:.23,le:-.55,skirt:-.14})
 };
 const counterCut={
  wind:key({hx:-.61,hy:1.26,hz:.16,by:-1.17,bp:-.48,bt:.45,cx:.08,cy:-.48,cz:.04,hip:-.25,drop:-.13,rt:.22,rk:.42,lt:-.42,lk:.52,lx:-.96,ly:-.15,lz:.16,le:-.82,skirt:.06}),
  contact:key({hx:-.10,hy:1.54,hz:.63,by:.02,bp:.15,bt:.36,cx:.18,cy:.13,cz:-.06,hip:.29,drop:-.08,rt:.30,rk:.32,lt:-.49,lk:.42,lx:-.56,ly:.25,le:-1.12,head:-.05,skirt:-.11}),
  follow:key({hx:.12,hy:1.88,hz:.33,by:1.08,bp:.86,bt:.40,cx:-.07,cy:.60,cz:-.05,hip:.34,drop:-.02,rt:.24,rk:.20,lt:-.30,lk:.28,lx:-.40,ly:.30,le:-.92,head:-.09,skirt:-.16}),
  recover:key({hx:.12,hy:1.74,hz:.27,by:1.30,bp:.76,cx:0,cy:.35,hip:.19,rt:.10,rk:.17,lt:-.15,lk:.20,lx:-.36,le:-.74,skirt:-.09})
 };
 function blendCut(a,b,t){for(const k of poseKeys)cutPose[k]=mix(a[k],b[k],t);}
 function poseCut(p,grounded){
  const spec=root.HatGame.ATTACKS[clamp((p.combo||1)-1,0,2)],cut=p.attackCounter?counterCut:p.jumpAttack?airCut:cuts[clamp((p.combo||1)-1,0,2)],elapsed=p.attackElapsed||0;
  const wind=elapsed<spec.windup,active=elapsed<spec.windup+spec.active;
  if(wind)blendCut(cutEntryPose,cut.wind,smooth(clamp(elapsed/(spec.windup*.82),0,1)));
  else if(active){const t=clamp((elapsed-spec.windup)/spec.active,0,1),whip=1-(1-t)*(1-t);if(whip<.53)blendCut(cut.wind,cut.contact,whip/.53);else blendCut(cut.contact,cut.follow,(whip-.53)/.47);}
  else{const t=clamp((elapsed-spec.windup-spec.active)/Math.max(.01,spec.duration-spec.windup-spec.active),0,1);blendCut(cut.follow,cut.recover,smooth(clamp(t/.68,0,1)));}
  const q=cutPose;hips.rotation.y=q.hip;hips.position.y=q.drop;chest.position.y=1.35+q.drop;chest.rotation.set(q.cx,q.cy,q.cz);
  rotate(legs[0].leg,q.rt,0,-.07);rotate(legs[0].shin,q.rk);rotate(legs[1].leg,q.lt,0,.07);rotate(legs[1].shin,q.lk);
  // Contact boots stay at the engine floor. This changes the covered thigh
  // joint, never the actor/root position, and adds no second lunge.
  if(grounded)for(let i=0;i<2;i++){const step=wind&&i===((p.combo||1)===2?0:1)?Math.sin(clamp(elapsed/spec.windup,0,1)*Math.PI)*((p.combo||1)===3?.035:.085):0;plantFoot(legs[i],q.drop,step);}
  handAt(right,-1,q.hx,q.hy+q.drop,q.hz);aimBlade(q.by,q.bp,q.bt);setArm(left,q.lx,q.ly,q.lz,q.le);
  rotate(head,q.head,-q.cy*.38,-q.cz*.35);rotate(skirt,q.skirt,0,-q.cz*.45);
 }
 function update(game,dt){
  if(disposed||!game?.player)return;dt=Math.max(0,dt||0);clock+=dt;castLeft=Math.max(0,castLeft-dt);releaseLeft=Math.max(0,releaseLeft-dt);
  const p=game.player,dead=p.dead===true||p.hp<=0||game.phase==='dead',dash=!dead&&!!p.dash?.active,attacking=!dead&&p.attackPhase&&p.attackPhase!=='idle',drawing=!dead&&!!p.bowCharging,drinking=!dead&&p.healTimer>0,bowMode=p.weaponMode==='bow';
  const guarding=!dead&&!bowMode&&!attacking&&!dash&&!drinking&&!!p.guardActive,broken=!dead&&p.guardBreakTimer>0;
  const state=dead?'dead':dash?'dodge':broken?'broken':attacking?'cut:'+p.attackId:guarding?'guard':drawing?'draw':drinking?'drink':bowMode?'bow':'travel';
  if(attacking&&state!==poseState){for(const k of poseKeys)cutEntryPose[k]=poseState.startsWith('cut:')?cutPose[k]:ready[k];cutYawFrom=yaw;}
  beginPose(state,dead?0:attacking?.065:dash||guarding||broken?.045:.12,dt);
  if(attacking&&p.attackPhase==='active')poseLeft=0;
  const grounded=p.grounded!==false,airborne=!grounded,vy=Number.isFinite(p.vy)?p.vy:0;
  landLeft=Math.max(0,landLeft-dt);
  if(lastGrounded===false&&grounded){landLeft=.18;landWeight=clamp(Math.abs(lastVy)/8,.45,1);}
  if(p.landTimer>0&&grounded)landLeft=Math.max(landLeft,Math.min(.18,p.landTimer));
  lastGrounded=grounded;lastVy=vy;
  airAmount=mix(airAmount,airborne&&!dead?1:0,1-Math.exp(-20*dt));
  if(!airborne&&airAmount<.001)airAmount=0;
  sprintAmount=mix(sprintAmount,p.sprinting&&grounded&&!dead&&!dash&&!drinking?1:0,1-Math.exp(-12*dt));
  if(guarding)guardWeight=Math.max(smooth(1-clamp((p.guardRaiseTimer||0)/.18,0,1)),p.guardImpactTimer>0?1:0);
  else guardWeight=mix(guardWeight,0,1-Math.exp(-22*dt));
  if(attacking||dash||drawing||drinking||dead||broken||bowMode)guardWeight=0;
  // Death freezes simulation time in the shell. Enter the collapse even on a
  // zero-delta draw, keeping the engine's feet Y instead of snapping to soil.
  deathAmount=dead?(dt>0?Math.min(1,deathAmount+dt*5):1):0;
  if(!dead&&!drinking&&p.castTimer>0&&(p.castKind==='nova'||p.castKind==='cat')){
   if(castKind!==p.castKind||castLeft<=0)castYaw=directionYaw(p.castContext?.dirX??p.aimDirX,p.castContext?.dirZ??p.aimDirZ,yaw);
   castKind=p.castKind;castLeft=Math.max(castLeft,p.castTimer);
  }
  if(dash||attacking||drinking||guarding||broken||dead||p.hurtTimer>0){castLeft=0;releaseLeft=0;}
  const dx=lastX===null?0:p.x-lastX,dz=lastZ===null?0:p.z-lastZ,dist=Math.hypot(dx,dz);lastX=p.x;lastZ=p.z;
  const rawSpeed=dt>0&&dist<2?dist/dt:0;speed=mix(speed,clamp(rawSpeed/8.4,0,1),1-Math.exp(-18*dt));
  const moving=!dead&&rawSpeed>.05,committed=!drawing&&(castLeft>0||releaseLeft>0),committedYaw=releaseLeft>0?releaseYaw:castYaw,locked=attacking||drawing||guarding||committed;
  const fx=dash?p.dash.dirX:attacking?p.attackDirX:guarding?p.guardDirX:drawing?p.aimDirX:committed?Math.sin(committedYaw):moving?dx:p.aimDirX;
  const fz=dash?p.dash.dirZ:attacking?p.attackDirZ:guarding?p.guardDirZ:drawing?p.aimDirZ:committed?Math.cos(committedYaw):moving?dz:p.aimDirZ;
  const oldYaw=yaw,targetYaw=!dead&&Math.hypot(fx||0,fz||0)>.001?Math.atan2(fx,fz):yaw;
  // Committed cuts and releases face the emitted action. Mouse motion changes
  // live drawing, then resumes steering the rig once its follow-through ends.
  if(attacking){const windup=root.HatGame.ATTACKS[clamp((p.combo||1)-1,0,2)].windup,t=smooth(clamp((p.attackElapsed||0)/(windup*.8),0,1));yaw=cutYawFrom+Math.atan2(Math.sin(targetYaw-cutYawFrom),Math.cos(targetYaw-cutYawFrom))*t;}
  else yaw=dash||committed?targetYaw:dampAngle(yaw,targetYaw,guarding?32:locked?26:15,dt);
  base.rotation.y=yaw;base.position.set(p.x,p.y||0,p.z);
  let hipTarget=0;
  if(moving&&!dash&&grounded){
   const along=(dx*Math.sin(yaw)+dz*Math.cos(yaw))/dist;
   // Keep the last gait sense around a pure strafe; small aim changes must not
   // flip the leg cycle repeatedly. Backpedalling traverses the cycle backwards.
   if(along>.15)gaitDirection=1;else if(along<-.15)gaitDirection=-1;
   travel+=dist*gaitDirection/mix(1.65,2.45,sprintAmount);
   const movementYaw=Math.atan2(dx*gaitDirection,dz*gaitDirection);
   hipTarget=clamp(Math.atan2(Math.sin(movementYaw-yaw),Math.cos(movementYaw-yaw)),-.60,.60);
  }
  hipYaw=dampAngle(hipYaw,hipTarget,12,dt);hips.rotation.y=dash?0:hipYaw;
  const turn=dt>0?clamp(Math.atan2(Math.sin(yaw-oldYaw),Math.cos(yaw-oldYaw))/dt,-5,5):0;
  const gait=travel*Math.PI*2,swing=Math.sin(gait)*speed*(1-airAmount),settle=grounded?Math.sin(clamp(landLeft/.18,0,1)*Math.PI)*landWeight:0;
  const bob=(1-Math.cos(gait*2))*mix(.022,.038,sprintAmount)*speed*(1-airAmount)-settle*.10;
  roll.position.set(0,1.15,0);rotate(roll);body.scale.setScalar(1);hips.position.y=bob;chest.position.y=1.35+bob;
  rotate(chest,sprintAmount*.19-speed*.035+settle*.12,Math.sin(gait)*speed*.045,0);rotate(skirt,sprintAmount*.04,Math.sin(gait)*speed*.025,Math.sin(gait)*speed*.018);
  for(let i=0;i<2;i++){const s=i?1:-1;legs[i].leg.position.y=.91;rotate(legs[i].leg,swing*s*mix(.60,.94,sprintAmount)-settle*.34,0,s*.035);rotate(legs[i].shin,Math.max(0,-swing*s)*mix(.65,1.02,sprintAmount)+settle*.68,0,0);}
  setArm(right,-.14+swing*mix(.48,.70,sprintAmount),0,-.10,-.12-sprintAmount*.55);setArm(left,-.32-swing*.26,0,.12,-.55-sprintAmount*.28);
  sword.visible=!dead&&!bowMode&&!drawing&&releaseLeft<=0;sword.rotation.set(-.25,0,0);bottle.visible=false;shield.visible=!dead&&!bowMode&&!drawing&&!drinking&&!dash;shield.position.set(0,-.25,.10);
  if(sword.visible&&!dash&&!drinking){handAt(right,-1,ready.hx,ready.hy+bob+swing*.07,ready.hz-swing*.10);aimBlade(ready.by,ready.bp+sprintAmount*.25);}
  const lookYaw=committed?targetYaw:directionYaw(p.aimDirX,p.aimDirZ,yaw);
  headTurn=mix(headTurn,clamp(Math.atan2(Math.sin(lookYaw-yaw),Math.cos(lookYaw-yaw)),-.36,.36),1-Math.exp(-12*dt));rotate(head,-speed*.025,headTurn,0);
  if(airAmount>0&&!dash&&!dead){
   // Pose only: the engine alone moves the root through its ballistic arc.
   // Positive velocity folds the knees; descent opens them before touchdown.
   const rising=clamp((vy+1.5)/8,0,1),tuck=.30+rising*.65;
   for(let i=0;i<2;i++){const l=legs[i],legTarget=-tuck+(i?.18:-.12),kneeTarget=.45+rising*.80+(i?.12:0);l.leg.rotation.x=mix(l.leg.rotation.x,legTarget,airAmount);l.shin.rotation.x=mix(l.shin.rotation.x,kneeTarget,airAmount);}
   chest.rotation.x=mix(chest.rotation.x,.09+rising*.08,airAmount);skirt.rotation.x=mix(skirt.rotation.x,-.09,airAmount);head.rotation.x=mix(head.rotation.x,-.06,airAmount);
   if(!attacking&&!drawing&&castLeft<=0&&releaseLeft<=0&&!drinking){setArm(right,mix(right.arm.rotation.x,-.30-rising*.18,airAmount),0,mix(right.arm.rotation.z,-.22,airAmount),mix(right.forearm.rotation.x,-.25,airAmount));setArm(left,mix(left.arm.rotation.x,-.50-rising*.25,airAmount),0,mix(left.arm.rotation.z,.28,airAmount),mix(left.forearm.rotation.x,-.60,airAmount));}
  }
  if(attacking&&!dash)poseCut(p,grounded);
  if(guardWeight>.001&&!attacking&&!dash&&!broken){
   const g=guardWeight,impact=clamp((p.guardImpactTimer||0)/.20,0,1),recoil=impact*impact,perfect=p.parryUntil>game.time;
   chest.rotation.x=mix(chest.rotation.x,-.06-recoil*.19,g);chest.rotation.y=mix(chest.rotation.y,-.18,g);hips.rotation.y=mix(hips.rotation.y,.12,g);chest.position.y-=g*(.055+recoil*.035);hips.position.y-=g*.055;
   handAt(left,1,mix(.45,.19,g),mix(1.28,1.57,g)-recoil*.045,mix(.20,.46,g)-recoil*.10);
   handAt(right,-1,-.47,1.34+g*.13,.16+g*.08);aimBlade(-.40,mix(-1.05,-.55,g));
   head.rotation.set(-.04,-chest.rotation.y*.5,recoil*.045);
   for(let i=0;i<2;i++){legs[i].leg.rotation.x-=g*(i?.20:.06);legs[i].shin.rotation.x+=g*(i?.27:.17);if(grounded&&speed<.15)plantFoot(legs[i],hips.position.y);}
   shield.position.z=.10+(perfect?.012:0);
  }
  const bowVisible=(bowMode||drawing||releaseLeft>0)&&!attacking&&!dash&&!drinking&&!dead&&castLeft<=0&&!broken;bowMount.visible=bowVisible;
  if(bowVisible){
   const aiming=drawing||releaseLeft>0,charge=clamp(p.bowCharge||0,0,1),elevation=drawing?clamp(p.aimElevation||0,-1.25,1.25):releaseLeft>0?releaseElevation:-.43;
   if(drawing)lastDrawElevation=elevation;
   bowMount.rotation.set(-elevation,0,0);const pull=-.19-charge*.27;
   const points=stringGeometry.attributes.position;points.setXYZ(0,0,.51,-.19);points.setXYZ(1,0,0,pull);points.setXYZ(2,0,-.51,-.19);points.needsUpdate=true;
   arrow.position.z=pull+.11;arrow.visible=drawing;chest.rotation.y=aiming?-.15:-.06;head.rotation.y=aiming?.15:headTurn;
   holdBow(left,1,0);if(aiming)holdBow(right,-1,pull);else setArm(right,-.17+swing*.34,0,-.10,-.25);head.rotation.x=aiming?-elevation*.18:0;
  }else if(castLeft>0&&!attacking&&!dash&&!dead){
   const envelope=Math.sin(clamp(castLeft/.30,0,1)*Math.PI);
   if(castKind==='nova'){setArm(right,-1.4,-.80+envelope*1.7,-.32,-.12);setArm(left,-.9,0,.30,-.25);chest.rotation.y=envelope*.22;}
   else{setArm(left,-1.52,0,.10,-.12);setArm(right,-.20,0,-.17,-.25);head.rotation.y=.12;}
  }
  if(drinking&&!dash){
   const progress=clamp(1-p.healTimer/Math.max(.01,p.healDuration||1.1),0,1),lift=smooth(clamp(progress/.24,0,1))*(1-smooth(clamp((progress-.76)/.24,0,1)));
   setArm(right,.10,0,-.11,-.10);sword.rotation.x=.12;chest.rotation.y=0;head.rotation.set(-.13*lift,.10*lift,0);
   bowTarget.set(mix(.38,.10,lift),mix(1.27,1.91,lift),mix(.12,.38,lift)).sub(chest.position).applyQuaternion(chestInverse.copy(chest.quaternion).invert());reachHand(left,1);
   bottle.visible=true;bottleRotation.copy(chest.quaternion).multiply(left.arm.quaternion).multiply(left.forearm.quaternion);bottleTilt.setFromAxisAngle(sideAxis,-.75*lift);bottle.quaternion.copy(bottleRotation).invert().multiply(bottleTilt);
  }
  if(broken&&!dash){
   const recoil=clamp(p.guardBreakTimer/.8,0,1),open=smooth(Math.min(1,recoil*2)),sag=Math.sin(recoil*Math.PI)*.09;
   chest.rotation.set(-.28*recoil,-.13*open,.10*recoil);chest.position.y=1.35-.09*open-sag;hips.position.y=-.08*open;hips.rotation.y=.13*open;
   setArm(left,-.15*open,.48*open,.76*open,-.25);handAt(right,-1,-.53,1.17-.05*open,.11);aimBlade(-.50,-1.30);
   rotate(head,.16*recoil,.1*open,-.07*recoil);rotate(legs[0].leg,-.18*open,0,-.09);rotate(legs[0].shin,.38*open);rotate(legs[1].leg,.12*open,0,.10);rotate(legs[1].shin,.28*open);skirt.rotation.x=.12*recoil;
   if(grounded)for(const l of legs)plantFoot(l,hips.position.y);
  }else if(p.hurtTimer>0&&!dash&&!dead){
   const weight=clamp(p.hurtTimer/.28,0,1),localX=hurtDirX*Math.cos(yaw)-hurtDirZ*Math.sin(yaw),localZ=hurtDirX*Math.sin(yaw)+hurtDirZ*Math.cos(yaw);
   chest.rotation.x+=localZ*.26*weight;chest.rotation.z-=localX*.20*weight;head.rotation.x-=localZ*.10*weight;head.rotation.z+=localX*.08*weight;hips.position.y-=.05*weight;chest.position.y-=.05*weight;
  }
  if(dash){
   const t=clamp(p.dash.elapsed/Math.max(.01,p.dash.duration),0,1),tuck=Math.sin(t*Math.PI);
   roll.rotation.x=t*Math.PI*2;roll.position.y=1.15+tuck*.08;body.scale.setScalar(1-tuck*.32);chest.rotation.set(-.18*tuck,0,0);head.rotation.set(.14*tuck,0,0);
   for(const l of legs){rotate(l.leg,-.8*tuck);rotate(l.shin,1.2*tuck);}setArm(right,-.55*tuck,0,-.12,-1.1*tuck);setArm(left,-.55*tuck,0,.12,-1.1*tuck);sword.visible=false;
  }
  if(dead){
   const collapse=smooth(deathAmount);roll.rotation.set(collapse*1.47,0,collapse*.06);roll.position.y=mix(1.15,.64,collapse);hips.position.y=0;hips.rotation.y=0;chest.position.y=1.35;rotate(chest,.12*collapse);rotate(head,.15*collapse);rotate(skirt);
   for(let i=0;i<2;i++){rotate(legs[i].leg,-.18*collapse);rotate(legs[i].shin,(i?.55:.30)*collapse);}setArm(right,-.72*collapse,0,-.25,-.65*collapse);setArm(left,-.85*collapse,0,.30,-.75*collapse);sword.visible=shield.visible=bowMount.visible=bottle.visible=false;
  }
  if(shield.visible)faceShield(broken?-.30:guardWeight>.01?.05+clamp((p.guardImpactTimer||0)/.2,0,1)*.18:-.12,broken?1.15:guardWeight>.01?0:.32,broken?-.48:.025);
  for(const {tail,tip,side} of tails){
   const target=dead?-.20:.10+speed*.30+sprintAmount*.16+Math.sin(gait+side*.8)*speed*.10+airAmount*.18+(dash?.4:0)+(attacking?cutPose.cx*.42:0),cutLag=attacking?-cutPose.cy*.27:0;
   tail.rotation.x=mix(tail.rotation.x,target,1-Math.exp(-9*dt));tail.rotation.z=mix(tail.rotation.z,side*.10+turn*.065+cutLag,1-Math.exp(-8*dt));tip.rotation.x=mix(tip.rotation.x,-tail.rotation.x*.6+Math.sin(clock*3+side)*.035,1-Math.exp(-7*dt));
  }
  finishPose();
  if(grounded&&!dash&&!dead){
   for(let i=0;i<2;i++){
    const l=legs[i],thigh=l.leg.rotation.x,ankle=thigh+l.shin.rotation.x;
    if(!attacking&&!broken&&guardWeight<.01)plantFoot(l,hips.position.y,Math.max(0,Math.sin(gait+(i?0:Math.PI)))*.13*speed);
    const lx=(i?.22:-.22),lz=-.36*Math.sin(thigh)-.49*Math.sin(ankle),wx=p.x+lx*Math.cos(yaw)+lz*Math.sin(yaw),wz=p.z-lx*Math.sin(yaw)+lz*Math.cos(yaw);
    let floor=root.HatTerrain.heightAt(wx,wz);
    for(const o of game.obstacles||[]){const top=(o.y||0)+o.height;if(o.walkable&&top<=p.y+.30&&Math.abs(wx-o.x)<=o.w/2&&Math.abs(wz-o.z)<=o.d/2)floor=Math.max(floor,top);}
    l.leg.position.y+=clamp(floor-p.y,-.24,.24);
   }
  }
  heroMaterial.color.set(p.hurtTimer>0?'#efbba4':'#ffffff');
  // Opaque hide with hysteresis avoids near-plane hat/head blocking and all
  // transparency/depth-sorting artifacts when a wall shortens the camera arm.
  heroWorld.set(p.x,clamp(camera.position.y,(p.y||0)+.35,(p.y||0)+2.72),p.z);
  const cameraDistance=camera.position.distanceTo(heroWorld);hidden=!dead&&cameraDistance<(hidden?1.12:.93);base.visible=!hidden;
  const attackSpec=root.HatGame.ATTACKS[clamp((p.combo||1)-1,0,2)],attackElapsed=p.attackElapsed||0;
  // A camera-hidden heroine must not leave a floating sword ribbon. There is
  // no pre-windup/late-recovery extension outside the engine's damage window.
  bladeSegment.visible=!!(base.visible&&sword.visible);bladeSegment.active=!!(bladeSegment.visible&&!dash&&!dead&&p.attackPhase==='active'&&attackElapsed>=attackSpec.windup&&attackElapsed<attackSpec.windup+attackSpec.active);
  bladeSegment.attackId=p.attackId||0;bladeSegment.combo=p.combo||0;bladeSegment.progress=clamp(attackElapsed/attackSpec.duration,0,1);bladeSegment.jumpAttack=!!p.jumpAttack;bladeSegment.counter=!!p.attackCounter;
  sword.updateWorldMatrix(true,false);bladeSegment.base.set(0,-.18,0).applyMatrix4(sword.matrixWorld);bladeSegment.tip.set(0,-1.09,0).applyMatrix4(sword.matrixWorld);
  updateCat(game,dt);
 }
 function updateCat(game,dt){
  const p=game.player,position=game.catMotion?.position||{x:p.x-1.1,y:p.y||0,z:p.z+.85},flight=game.catMotion?.flight;
  const dx=catX===null?0:position.x-catX,dz=catZ===null?0:position.z-catZ,d=Math.hypot(dx,dz);if(dt>0)catVelocityY=catY===null?0:((position.y||0)-catY)/dt;const catVy=catVelocityY;catX=position.x;catZ=position.z;catY=position.y||0;
  if(d<2)catTravel+=d;catSpeed=mix(catSpeed,clamp(dt>0&&d<2?d/dt/6:0,0,1),1-Math.exp(-18*dt));
  if(d>.002)catYaw=dampAngle(catYaw,Math.atan2(dx,dz),20,dt);else if(flight){const fdx=flight.to.x-flight.from.x,fdz=flight.to.z-flight.from.z;if(Math.hypot(fdx,fdz)>.001)catYaw=Math.atan2(fdx,fdz);}
  catBase.position.set(position.x,position.y||0,position.z);catBase.rotation.y=catYaw;
  let floor=root.HatTerrain.heightAt(position.x,position.z);
  for(const o of game.obstacles||[]){const top=(o.y||0)+o.height;if(o.walkable&&Math.abs(position.x-o.x)<=o.w/2&&Math.abs(position.z-o.z)<=o.d/2&&top<=(position.y||0)+.08)floor=Math.max(floor,top);}
  const catAir=!!flight||(position.y||0)-floor>.09,phase=catTravel*Math.PI*2/1.15;
  // catMotion already contains the full leap arc. Only its limbs and pitch
  // animate here; adding another sine arc would lift it above its hit volume.
  catBody.position.y=catAir?0:Math.abs(Math.sin(phase))*.025*catSpeed;catBody.rotation.x=catAir?clamp(-catVy*.035,-.30,.28):0;
  for(const {leg,side,z} of catLegs)leg.rotation.x=flight?(z>0?-1.0:.85):catAir?(z>0?-.55:.48):Math.sin(phase+(side*(z>0?1:-1)>0?Math.PI:0))*.65*catSpeed;
  catTail.rotation.set(catAir?.6:.15,Math.sin(clock*2.2)*.18,Math.sin(clock*2.2)*.10);catTailTip.rotation.x=-.3+Math.sin(clock*2.2-.4)*.16;scarf.rotation.x=-(catAir?.4:catSpeed*.24);catHead.rotation.y=catAir?0:Math.sin(clock*1.8)*.04;
  catWorld.set(position.x,(position.y||0)+.45,position.z);catBase.visible=camera.position.distanceTo(catWorld)>.65;
 }
 function reset(game){
  poseState='';poseLeft=poseDuration=0;poseValid=false;for(const k of poseKeys)cutEntryPose[k]=cutPose[k]=ready[k];
  lastX=lastZ=catX=catY=catZ=null;lastGrounded=null;travel=catTravel=clock=speed=catSpeed=headTurn=hipYaw=sprintAmount=airAmount=landLeft=lastVy=deathAmount=guardWeight=catVelocityY=0;landWeight=1;gaitDirection=1;castLeft=releaseLeft=0;castKind=null;hidden=false;hurtDirX=0;hurtDirZ=-1;bladeSegment.active=bladeSegment.visible=false;
  yaw=Math.atan2(game?.player?.aimDirX??0,game?.player?.aimDirZ??1);catYaw=castYaw=releaseYaw=yaw;lastDrawElevation=releaseElevation=clamp(game?.player?.aimElevation||0,-1.25,1.25);base.visible=catBase.visible=true;bowMount.visible=false;
  for(const {tail,tip} of tails){tail.rotation.set(0,0,0);tip.rotation.set(0,0,0);}if(game)update(game,0);
 }
 function dispose(){if(disposed)return;disposed=true;scene.remove(base,catBase);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
 return{update,emit:eventPose,reset,dispose,getBladeSegment:()=>disposed?null:bladeSegment};
}
root.HatPixelHero={create};
})(window);
