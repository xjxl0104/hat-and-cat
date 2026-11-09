(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.HatEnemyAI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const EPS=1e-6,TAU=Math.PI*2,RANGED=['arrow','water','bossOrb','cake'];
  const MOTION=['hop','dive','swoop','charge'],MAX_ENEMY_SHOTS=5;
  const BOSS_KINDS=['ironWarden','tideBeast','starSeer'];

  // Every entry is one commitment with its own full, locked-direction warning.
  // A combo never chases the player between hits. Its gap is safe to move through.
  const MOVES={
    guardSlash:{kind:'slash',name:'横斩',windup:.74,range:2.0,halfAngle:.95,damage:12,gap:.3},
    guardBackslash:{kind:'slash',name:'回身斩',windup:.61,range:2.0,halfAngle:1.08,damage:14,gap:.3},
    guardThrust:{kind:'thrust',name:'蓄力直刺',windup:1.02,range:2.1,width:.72,shape:'line',damage:18},
    slimeHop:{kind:'hop',name:'蓄力跃进',windup:.72,range:3.3,width:1.1,shape:'line',damage:0,motion:.48,gap:.22},
    slimeCrush:{kind:'slimeSlam',name:'软泥重压',windup:.65,range:2.35,shape:'circle',damage:14},
    arrowSingle:{kind:'arrow',name:'凝神穿云箭',windup:1.12,range:14,width:.42,shape:'line',damage:15,speed:12},
    arrowFirst:{kind:'arrow',name:'连珠箭 · 起手',windup:.94,range:14,width:.42,shape:'line',damage:10,speed:10.5,gap:.32},
    arrowSecond:{kind:'arrow',name:'连珠箭 · 追射',windup:.62,range:14,width:.42,shape:'line',damage:11,speed:10.5},
    batDive:{kind:'dive',name:'俯冲啄击',windup:.88,range:5.4,width:1.2,shape:'line',damage:10,motion:.48,gap:.34},
    batSwoop:{kind:'swoop',name:'折翼掠袭',windup:.72,range:3.6,width:1.2,shape:'line',damage:9,motion:.46},
    waterFirst:{kind:'water',name:'潮汐水弹',windup:1,range:14,width:.48,shape:'line',damage:10,speed:7.5,gap:.34},
    waterSecond:{kind:'water',name:'回潮水弹',windup:.68,range:14,width:.48,shape:'line',damage:10,speed:7.5},
    waterFan:{kind:'water',name:'三岔浪花',windup:1.2,range:12,halfAngle:.28,shape:'cone',damage:9,speed:6.8,angles:[-.28,0,.28]},
    wardenCharge:{kind:'charge',name:'誓盾冲锋 · 不可挡',windup:1.3,range:7.2,width:1.6,shape:'line',damage:28,motion:.62,gap:.55,hitHeight:3.2,unblockable:true,parryable:false},
    wardenSweep:{kind:'slash',name:'贴地横扫 · 跳跃',windup:1.12,range:4.1,halfAngle:1.45,damage:24,gap:.5,jumpable:true},
    wardenThrust:{kind:'thrust',name:'余晖重刺 · 侧闪',windup:1.18,range:4.8,width:1.05,shape:'line',damage:32,gap:.5,hitHeight:3.2},
    wardenStomp:{kind:'stomp',name:'震地誓印 · 不可挡',windup:1.05,range:3.7,shape:'circle',damage:25,jumpable:true,unblockable:true,parryable:false},
    wardenReturn:{kind:'slash',name:'高刃追斩 · 闪避',windup:.88,range:3.8,halfAngle:1.15,damage:27,hitHeight:3.2},
    tidePulse:{kind:'water',name:'破浪水矢',windup:1.08,range:13,width:.5,shape:'line',damage:13,speed:6.5,gap:.52},
    tideFan:{kind:'water',name:'三道潮脊',windup:1.3,range:13,halfAngle:.34,shape:'cone',damage:12,speed:6.2,angles:[-.34,0,.34]},
    tideSplash:{kind:'tideSplash',name:'潜流涌起',windup:1.25,range:2.1,shape:'circle',damage:18,gap:.6},
    seerRelocate:{kind:'relocate',name:'星位转移',windup:1.15,range:1,shape:'circle',damage:0,harmless:true,gap:.55},
    seerFirst:{kind:'bossOrb',name:'星针 · 一',windup:1.04,range:14,width:.6,shape:'line',damage:12,speed:8,gap:.42},
    seerSecond:{kind:'bossOrb',name:'星针 · 二',windup:.86,range:14,width:.6,shape:'line',damage:12,speed:8,gap:.42},
    seerThird:{kind:'bossOrb',name:'星针 · 三',windup:.86,range:14,width:.6,shape:'line',damage:14,speed:8},
    // Birthday finale: long, readable warnings and soft damage. He is meant to be beaten.
    sweetSweep:{kind:'slash',name:'爱心棒棒糖横扫 · 可格挡',windup:1.05,range:3.3,halfAngle:1.25,damage:11,gap:.5},
    sweetBonk:{kind:'thrust',name:'棒棒糖敲头 · 侧闪',windup:1.1,range:3.5,width:1.1,shape:'line',damage:12,gap:.5,hitHeight:3},
    sweetPopper:{kind:'stomp',name:'生日礼花 · 跳开',windup:1.2,range:3.1,shape:'circle',damage:11,jumpable:true,unblockable:true,parryable:false,gap:.55},
    sweetHug:{kind:'charge',name:'抱抱冲锋 · 不可挡',windup:1.4,range:6.6,width:1.5,shape:'line',damage:13,motion:.72,gap:.6,hitHeight:2.8,unblockable:true,parryable:false},
    sweetCakeA:{kind:'cake',name:'投喂蛋糕 · 一',windup:1,range:13,width:.62,shape:'line',damage:8,speed:7.2,gap:.42},
    sweetCakeB:{kind:'cake',name:'投喂蛋糕 · 二',windup:.78,range:13,width:.62,shape:'line',damage:8,speed:7.2,gap:.42},
    sweetCakeFan:{kind:'cake',name:'三层蛋糕雨',windup:1.25,range:12,halfAngle:.3,shape:'cone',damage:8,speed:6.6,angles:[-.3,0,.3]}
  };

  function create(H){
    const {clamp,finite,point,direction,groundDist,groundHeight,centre,visible,canOccupy,moveDisc,activeEnemy,context,emit,projectile,hurtPlayer,clearEnemyStrike}=H;
    const bossKind=(s,e)=>e.bossKind||(e.bossKind=BOSS_KINDS[clamp(finite(s.levelIndex),0,2)]);
    const locomotion=e=>e.type==='bat'?'bat':e.type==='swimmer'?'swimmer':'ground';
    const ranged=kind=>RANGED.includes(kind);
    const enemyShots=s=>s.projectiles.filter(p=>p.owner==='enemy'&&p.life>EPS).length;
    const committed=e=>e.comboActive||e.state==='windup'||e.state==='strike'||MOTION.includes(e.state)||e.state==='comboGap'||e.attackTimer>EPS;
    // Seconds from the end of the full warning: [follow-through end, contact].
    // Renderers read these same clocks; damage never leads the committed pose.
    function strikeTiming(e,move){
      if(MOTION.includes(move.kind))return[move.motion,0];
      if(ranged(move.kind)||move.kind==='relocate')return[.24,.08];
      if(e.type==='boss')return[.42,.14];
      if(move.kind==='slimeSlam')return[.38,.13];
      return move.kind==='thrust'?[.32,.12]:[.30,.10];
    }
    function refreshBase(e){e.groundY=groundHeight(e.x,e.z);if(e.type!=='swimmer')e.baseY=e.groundY+(e.type==='bat'?finite(e.hoverHeight,1.8):0);}
    const navigationHeight=(e,x,z)=>groundHeight(x,z)+(e.type==='bat'?Math.max(0,e.y-groundHeight(e.x,e.z)):0);

    function withinTerritory(s,e,at){
      if(s.mode!=='wilds')return true;
      if(e.type==='boss'){
        const arena=globalThis.HatWilds.bossArena,r=e.radius;
        return at.x>=arena.minX+r&&at.x<=arena.maxX-r&&at.z>=arena.minZ+r&&at.z<=arena.maxZ-r;
      }
      return at.z>=-12.4&&groundDist(at,e.spawnAnchor)<=finite(e.leash,12)+.2&&groundDist(at,s.camp)>=5;
    }

    function returnHome(s,e,dt){
      if(!e.returning){
        if(e.comboActive)emit(s,'enemyAttackCancel',e,{...attackFields(s,e),reason:'leash'},e.attackContext);
        e.returning=true;e.aggro=false;e.comboActive=false;e.comboMoves=null;clearEnemyStrike(e);e.timer=0;e.hitStun=0;e.statuses={};e.exposed=false;e.path=[];e.repath=0;
        s.projectiles=s.projectiles.filter(p=>p.owner!=='enemy'||p.sourceId!==e.id);
      }
      e.state='return';settleHeight(s,e,dt);steerEnemy(s,e,e.spawnAnchor,4.5,dt);
      if(groundDist(e,e.spawnAnchor)<.3){Object.assign(e,point(e.spawnAnchor));refreshBase(e);e.y=e.baseY;e.hp=e.maxHp;e.state='idle';e.returning=false;e.cooldown=1;e.path=[];}
    }

    function hasAttackSlot(s,e,kind){
      const isRanged=ranged(kind);
      if(isRanged&&enemyShots(s)>=MAX_ENEMY_SHOTS)return false;
      const others=s.enemies.filter(n=>n!==e&&activeEnemy(n)&&committed(n)&&ranged(n.attackKind)===isRanged);
      return others.length<(isRanged?1:2);
    }

    function separateEnemies(s,dt){
      const live=s.enemies.filter(activeEnemy),movable=e=>!committed(e)&&!(e.pulledUntil>s.time);
      for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
        const a=live[i],b=live[j],minimum=a.radius+b.radius+.65,distance=groundDist(a,b);
        if(distance>=minimum)continue;
        const moveA=movable(a),moveB=movable(b);if(!moveA&&!moveB)continue;
        const d=direction(b.x-a.x,b.z-a.z,{x:(i+j)%2?1:-1,z:0}),push=Math.min(minimum-distance,dt*8),share=moveA&&moveB?.5:1;
        if(moveA&&withinTerritory(s,a,{x:a.x-d.x*push*share,z:a.z-d.z*push*share}))moveDisc(s,a,-d.x*push*share,-d.z*push*share,false,locomotion(a));
        if(moveB&&withinTerritory(s,b,{x:b.x+d.x*push*share,z:b.z+d.z*push*share}))moveDisc(s,b,d.x*push*share,d.z*push*share,false,locomotion(b));
      }
    }

    function clearWalkingLine(s,a,b,r,kind,height){
      const count=Math.max(1,Math.ceil(groundDist(a,b)/.3));
      for(let i=1;i<=count;i++){const t=i/count,at={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};if(!withinTerritory(s,a,at)||!canOccupy(s,at.x,at.z,r,kind,navigationHeight(a,at.x,at.z)))return false;}
      return true;
    }

    function navigationPath(s,e,target){
      const kind=locomotion(e),b=s.bounds,w=Math.max(1,Math.floor(b.maxX-b.minX)),h=Math.max(1,Math.floor(b.maxZ-b.minZ)),ox=b.minX+.5,oz=b.minZ+.5;
      const index=(x,z)=>clamp(Math.round(z-oz),0,h-1)*w+clamp(Math.round(x-ox),0,w-1);
      const position=i=>({x:ox+i%w,z:oz+Math.floor(i/w)});
      const walkable=i=>{const p=position(i);return withinTerritory(s,e,p)&&canOccupy(s,p.x,p.z,e.radius,kind,navigationHeight(e,p.x,p.z));};
      function nearestValid(id){
        if(walkable(id))return id;
        const p=position(id);let best=-1,distance=Infinity;
        for(let z=-3;z<=3;z++)for(let x=-3;x<=3;x++){
          const nx=id%w+x,nz=Math.floor(id/w)+z;if(nx<0||nx>=w||nz<0||nz>=h)continue;
          const candidate=nz*w+nx;if(!walkable(candidate))continue;
          const n=position(candidate),d=Math.hypot(n.x-p.x,n.z-p.z);if(d<distance){best=candidate;distance=d;}
        }
        return best;
      }
      const start=nearestValid(index(e.x,e.z)),goal=nearestValid(index(target.x,target.z));if(start<0||goal<0)return[];
      const previous=new Int32Array(w*h);previous.fill(-2);previous[start]=-1;
      const queue=[start];let head=0;
      while(head<queue.length&&previous[goal]===-2){
        const id=queue[head++],x=id%w,z=Math.floor(id/w);
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const nx=x+dx,nz=z+dz;if(nx<0||nx>=w||nz<0||nz>=h)continue;
          const n=nz*w+nx;if(previous[n]!==-2||!walkable(n))continue;
          previous[n]=id;queue.push(n);
        }
      }
      if(previous[goal]===-2)return[];
      const route=[];for(let n=goal;n!==-1;n=previous[n])route.push(position(n));route.reverse();
      if(route.length&&groundDist(e,route[0])<.6)route.shift();return route;
    }

    function steerEnemy(s,e,target,speed,dt){
      const kind=locomotion(e);let destination=target;
      e.path=e.path||[];
      if(!withinTerritory(s,e,target)||!clearWalkingLine(s,e,target,e.radius,kind,e.y)){
        // Failed searches also obey the cooldown. An empty route must not cause
        // a whole arena BFS on every frame while the player is behind cover.
        if(e.repath<=EPS){e.path=navigationPath(s,e,target);e.repath=.75;}
        while(e.path.length&&groundDist(e,e.path[0])<.25)e.path.shift();
        if(e.path.length)destination=e.path[0];else return;
      }else{e.path=[];e.repath=0;}
      const d=direction(destination.x-e.x,destination.z-e.z),distance=Math.min(speed*dt,groundDist(e,destination));
      if(e.returning||withinTerritory(s,e,{x:e.x+d.x*distance,z:e.z+d.z*distance}))moveDisc(s,e,d.x*distance,d.z*distance,false,kind);
    }

    function rangedFlankTarget(s,e){
      const p=s.player,candidates=[];
      if(e.flankUntil>s.time&&e.flankTarget&&e.flankPlayer&&groundDist(p,e.flankPlayer)<2)return e.flankTarget;
      for(let i=0;i<12;i++){
        const angle=i*TAU/12,at={x:p.x+Math.cos(angle)*6.5,z:p.z+Math.sin(angle)*6.5};at.y=groundHeight(at.x,at.z);
        const d=direction(p.x-at.x,p.z-at.z),from=shotOrigin(s,{...e,...at,dirX:d.x,dirZ:d.z});
        if(withinTerritory(s,e,at)&&canOccupy(s,at.x,at.z,e.radius,'ground',at.y)&&visible(s,from,centre(p)))candidates.push(at);
      }
      candidates.sort((a,b)=>groundDist(e,a)-groundDist(e,b));
      e.flankTarget=candidates[0]||point(p);e.flankPlayer=point(p);e.flankUntil=s.time+.6;return e.flankTarget;
    }

    function shotOrigin(s,e){
      const from=centre(e);
      if(e.type==='archer'){
        from.x+=finite(e.dirX,1)*.55;from.y=e.y+1.55;from.z+=finite(e.dirZ)*.55;
      }else if(e.bossKind==='sweetheart'){
        from.x+=finite(e.dirX,1)*.7;from.y=e.y+2.05;from.z+=finite(e.dirZ)*.7;
      }else if(e.type==='swimmer'){
        const pond=s.ponds.find(q=>q.id===e.waterZoneId)||s.ponds[0];if(pond)from.y=pond.surface+.6;
      }
      return from;
    }

    function attackFields(s,e){
      return{targetId:e.id,targetType:e.type,sourceId:e.id,enemyType:e.type,attackKind:e.attackKind,attackName:e.attackName,
        moveId:e.moveId,strikeId:e.strikeId,strikeElapsed:e.strikeElapsed,strikeDuration:e.strikeDuration,strikeContact:e.strikeContact,contactReached:e.contactReached,
        comboIndex:e.comboIndex,comboTotal:e.comboTotal,comboName:e.comboName,telegraphShape:e.telegraphShape,
        range:e.attackRange,radius:e.attackRange,width:e.attackWidth,halfAngle:e.attackHalfAngle,
        dirX:e.dirX,dirZ:e.dirZ,direction:e.facing,heavy:e.type==='boss',aimX:e.aimX,aimY:e.aimY,aimZ:e.aimZ,
        shotAngles:e.shotAngles,shotOrigin:shotOrigin(s,e),bossKind:e.bossKind,telegraphOrigin:e.telegraphOrigin,harmless:e.harmless,jumpable:!!e.jumpable,unblockable:!!e.unblockable,parryable:!!e.parryable};
    }

    function finishCombo(s,e,interrupted=false){
      const rest=interrupted?Math.max(.65,finite(e.comboRecovery,1)*.75):finite(e.comboRecovery,1);
      e.comboActive=false;e.comboMoves=null;e.state='recover';e.timer=rest;e.recoveryDuration=rest;e.exposed=true;
      e.cooldown=rest+(e.type==='boss'?.55:.4);e.attackDone=true;e.exposedUntil=s.time+rest;
      e.attackTimer=0;if(interrupted)clearEnemyStrike(e);
    }

    function cancelCombo(s,e,reason){
      emit(s,'enemyAttackCancel',e,{...attackFields(s,e),reason},e.attackContext);
      finishCombo(s,e,true);
    }

    function covered(s,e){
      if(!ranged(e.attackKind))return false;
      const from=shotOrigin(s,e),aim={x:e.aimX,y:e.aimY,z:e.aimZ};
      return !visible(s,from,centre(s.player))||!visible(s,from,aim);
    }

    function beginMove(s,e){
      const moveId=e.comboMoves[e.comboIndex],move=MOVES[moveId],p=s.player;
      const d=direction(p.x-e.x,p.z-e.z,{x:e.dirX,z:e.dirZ});
      e.dirX=d.x;e.dirZ=d.z;e.facing=d.x<0?-1:1;
      e.attackKind=move.kind;e.attackName=move.name;e.telegraphShape=move.shape||'cone';
      e.unblockable=!!move.unblockable;e.parryable=!e.unblockable&&!move.harmless&&move.parryable!==false;
      e.telegraphOrigin=null;e.harmless=!!move.harmless;e.exposedUntil=0;e.jumpable=!!move.jumpable;
      e.attackRange=move.range;e.attackWidth=finite(move.width,.6);e.attackHalfAngle=finite(move.halfAngle,e.telegraphShape==='circle'?Math.PI:.08);
      e.shotAngles=move.angles?move.angles.slice():[0];e.aimX=p.x;e.aimY=p.y+.9;e.aimZ=p.z;
      e.state='windup';e.exposed=false;e.windupDuration=move.windup;e.timer=move.windup;e.attackTimer=0;e.attackDone=false;
      e.attackContext=context(s,'enemy',{owner:'enemy',sourceId:e.id,hitStopClass:'none',dirX:d.x,dirZ:d.z,attackKind:move.kind,unblockable:e.unblockable,parryable:e.parryable});
      const timing=strikeTiming(e,move);e.moveId=moveId;e.strikeId=e.attackContext.actionId;e.strikeElapsed=0;e.strikeDuration=timing[0];e.strikeContact=timing[1];e.contactReached=false;
      if(MOTION.includes(move.kind)){
        // Freeze the travel endpoint before warning starts; no homing during motion.
        const travel=move.kind==='charge'?Math.min(move.range,Math.max(3,groundDist(e,p)+1)):move.kind==='swoop'?move.range:Math.min(move.range,groundDist(e,p));
        e.attackRange=Math.max(.35,travel);e.aimX=e.x+d.x*e.attackRange;e.aimZ=e.z+d.z*e.attackRange;
        e.motionTargetY=['hop','charge'].includes(move.kind)?groundHeight(e.aimX,e.aimZ):Math.max(groundHeight(e.aimX,e.aimZ)+.12,p.y+.12);
        e.motionTargetClearance=e.motionTargetY-groundHeight(e.aimX,e.aimZ);
      }
      if(move.kind==='tideSplash')e.telegraphOrigin={x:p.x,y:groundHeight(p.x,p.z),z:p.z};
      if(move.kind==='relocate'){
        const destination=relocationTarget(s,e);
        if(!destination){cancelCombo(s,e,'noSafeStarPosition');return;}
        e.telegraphOrigin=destination;e.aimX=destination.x;e.aimY=destination.y;e.aimZ=destination.z;
      }
      emit(s,'windup',e,{...attackFields(s,e),duration:e.windupDuration,value:e.windupDuration},e.attackContext);
    }

    function beginCombo(s,e,moves,name,recovery){
      if(!hasAttackSlot(s,e,MOVES[moves[0]].kind))return false;
      e.comboMoves=moves;e.comboName=name;e.comboIndex=0;e.comboTotal=moves.length;e.comboRecovery=recovery;e.comboActive=true;
      e.patternSequence=finite(e.patternSequence)+1;beginMove(s,e);return true;
    }

    function afterMove(s,e,move){
      e.attackTimer=0;
      if(e.comboActive&&e.comboIndex+1<e.comboTotal){e.state='comboGap';e.timer=finite(move.gap,.3);e.comboGapDuration=e.timer;e.exposed=false;}
      else finishCombo(s,e);
    }

    function meleeHit(s,e,move){
      const p=s.player,origin=e.telegraphOrigin||e,dx=p.x-origin.x,dz=p.z-origin.z,distance=Math.hypot(dx,dz),r=finite(p.radius,.45);
      if(!visible(s,centre(e),centre(p)))return;
      // Only explicitly low attacks permit a jump clear. Thrusts and tall blade
      // arcs still overlap an airborne heroine and require spacing or a dodge.
      if(move.jumpable&&p.y-origin.y>.7)return;
      const hitHeight=finite(move.hitHeight,e.type==='boss'?3.2:2.35);
      let inside=false;
      if(e.telegraphShape==='circle')inside=distance<=e.attackRange+r&&p.y<origin.y+hitHeight&&p.y>=origin.y-1.2;
      else if(e.telegraphShape==='line'){
        const along=dx*e.dirX+dz*e.dirZ,across=Math.abs(dx*e.dirZ-dz*e.dirX);
        inside=along>=-r&&along<=e.attackRange+r&&across<=e.attackWidth/2+r&&Math.abs(p.y-e.y)<hitHeight;
      }else{
        const d=direction(dx,dz,{x:e.dirX,z:e.dirZ});
        inside=distance<=e.attackRange+r&&d.x*e.dirX+d.z*e.dirZ>=Math.cos(e.attackHalfAngle)&&Math.abs(p.y-e.y)<hitHeight;
      }
      if(inside)hurtPlayer(s,e,move.damage,e.attackContext);
    }

    function releaseMove(s,e){
      const move=MOVES[e.comboMoves[e.comboIndex]],kind=move.kind;
      if(covered(s,e)){cancelCombo(s,e,'cover');return;}
      if(ranged(kind)&&enemyShots(s)+(move.angles?.length||1)>MAX_ENEMY_SHOTS){cancelCombo(s,e,'shotBudget');return;}
      e.strikeElapsed=0;e.attackTimer=e.strikeDuration;e.attackSequence=finite(e.attackSequence)+1;
      if(MOTION.includes(kind)){
        e.state=kind;e.timer=move.motion;e.motionDuration=move.motion;e.motionFrom=point(e);e.motionFromClearance=Math.max(0,e.y-groundHeight(e.x,e.z));e.motionBlocked=false;
        e.diveDuration=move.motion;e.diveFrom=e.motionFrom;e.contactReached=true;
        emit(s,'enemySwing',e,{...attackFields(s,e),value:move.damage,damage:move.damage},e.attackContext);return;
      }
      e.state='strike';e.timer=e.strikeDuration;
    }

    function strikeContact(s,e,move){
      const kind=move.kind;
      // Cover and the shared shot budget can change during the release pose.
      if(covered(s,e)){cancelCombo(s,e,'cover');return;}
      if(ranged(kind)&&enemyShots(s)+(move.angles?.length||1)>MAX_ENEMY_SHOTS){cancelCombo(s,e,'shotBudget');return;}
      if(kind==='relocate'&&!validRelocation(s,e,e.telegraphOrigin)){cancelCombo(s,e,'occupiedStarPosition');return;}
      e.contactReached=true;e.attackDone=true;
      emit(s,'enemySwing',e,{...attackFields(s,e),value:move.damage,damage:move.damage},e.attackContext);
      if(kind==='relocate'){
        const to=e.telegraphOrigin;
        const from=point(e);e.x=to.x;e.z=to.z;refreshBase(e);e.y=e.baseY;e.path=[];
        emit(s,'bossRelocate',e,{targetId:e.id,bossKind:e.bossKind,from,to:point(e),duration:.24,harmless:true},e.attackContext);
      }else if(ranged(kind)){
        const from=shotOrigin(s,e),length=Math.max(1,groundDist(from,{x:e.aimX,z:e.aimZ}));
        for(const angle of e.shotAngles){
          const dx=e.dirX*Math.cos(angle)-e.dirZ*Math.sin(angle),dz=e.dirX*Math.sin(angle)+e.dirZ*Math.cos(angle);
          projectile(s,kind,from,{x:from.x+dx*length,y:e.aimY,z:from.z+dz*length},move.speed,move.damage,e.attackContext,{life:Math.min(2.5,move.range/move.speed),attackName:e.attackName,comboIndex:e.comboIndex});
        }
      }else meleeHit(s,e,move);
    }

    function strikeStep(s,e,dt){
      const move=MOVES[e.moveId],strikeId=e.strikeId;
      if(!move||!e.comboActive){clearEnemyStrike(e);e.state='idle';return;}
      if(!e.contactReached&&covered(s,e)){cancelCombo(s,e,'cover');return;}
      e.strikeElapsed=Math.min(e.strikeDuration,e.strikeElapsed+dt);
      e.timer=e.attackTimer=Math.max(0,e.strikeDuration-e.strikeElapsed);
      if(!e.contactReached&&e.strikeElapsed+EPS>=e.strikeContact){
        strikeContact(s,e,move);
        // A parry, death or cover cancellation clears this commitment inside
        // the contact call. Never restore its clock or advance its combo.
        if(s.phase==='dead'||!e.comboActive||e.state!=='strike'||e.strikeId!==strikeId)return;
      }
      if(e.attackTimer<=EPS)afterMove(s,e,move);
    }

    function motionHit(s,e,previous,move){
      if(e.attackDone||move.damage<=0)return;
      const p=s.player,old=p.previousPosition||p,a={x:previous.x-old.x,y:previous.y-old.y,z:previous.z-old.z};
      const b={x:e.x-p.x,y:e.y-p.y,z:e.z-p.z},dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;
      const t=den>EPS?clamp(-(a.x*dx+a.z*dz)/den,0,1):0;
      if(Math.hypot(a.x+dx*t,a.z+dz*t)<=e.attackWidth/2+finite(p.radius,.45)&&Math.abs(a.y+(b.y-a.y)*t)<finite(move.hitHeight,1.4)&&visible(s,centre(e),centre(p))){
        e.attackDone=true;hurtPlayer(s,e,move.damage,e.attackContext);
      }
    }

    function motionStep(s,e,dt){
      const move=MOVES[e.comboMoves[e.comboIndex]],previous=point(e);
      e.timer=Math.max(0,e.timer-dt);e.strikeElapsed=e.motionDuration-e.timer;e.attackTimer=e.timer;
      const t=clamp(e.strikeElapsed/e.motionDuration,0,1),from=e.motionFrom;
      refreshBase(e);const start=finite(e.motionFromClearance),clearance=move.kind==='charge'?0:move.kind==='hop'?Math.sin(t*Math.PI)*.85:
        move.kind==='swoop'?start+(finite(e.hoverHeight,1.8)-start)*t:start+(e.motionTargetClearance-start)*Math.min(1,t*1.8),y=e.groundY+clearance;
      // Height clearance is checked before descent, including low cover. Ground
      // hopping always uses ground collision even when the visual body is airborne.
      if(!['hop','charge'].includes(move.kind)&&!canOccupy(s,e.x,e.z,e.radius,'bat',y)){cancelCombo(s,e,'obstacle');return;}
      e.y=y;
      if(!e.motionBlocked){
        const x=from.x+(e.aimX-from.x)*t,z=from.z+(e.aimZ-from.z)*t;
        e.motionBlocked=!withinTerritory(s,e,{x,z})||moveDisc(s,e,x-e.x,z-e.z,true,locomotion(e));
      }
      motionHit(s,e,previous,move);if(s.phase==='dead'||!e.comboActive)return;
      if(move.kind==='charge'&&e.motionBlocked){
        emit(s,'chargeBlocked',e,{...attackFields(s,e),duration:2},e.attackContext);
        cancelCombo(s,e,'shieldCollision');e.timer=e.recoveryDuration=2;e.cooldown=2.5;e.exposedUntil=s.time+2;return;
      }
      if(e.timer<=EPS){if(move.kind==='hop')e.y=e.baseY;afterMove(s,e,move);}
    }

    function settleHeight(s,e,dt){
      if(e.type==='swimmer'){e.y=e.baseY+Math.sin(e.aiTime*2)*.12;return;}
      refreshBase(e);const target=e.baseY,next=Math.max(e.groundY,e.y+clamp(target-e.y,-dt*4,dt*4));
      if(e.type!=='bat'||canOccupy(s,e.x,e.z,e.radius,'bat',next))e.y=next;
    }

    function validRelocation(s,e,at){
      return !!at&&canOccupy(s,at.x,at.z,e.radius,'ground',groundHeight(at.x,at.z))&&groundDist(at,s.player)>=3.2&&
        !s.enemies.some(n=>n!==e&&activeEnemy(n)&&groundDist(n,at)<n.radius+e.radius+.5);
    }

    function relocationTarget(s,e){
      const p=s.player,start=finite(e.patternSequence)*2.39996;let best=null,bestScore=-Infinity;
      // Bounded candidate search once per commitment, never per animation frame.
      for(let i=0;i<16;i++){
        const angle=start+i*TAU/16,at={x:p.x+Math.cos(angle)*6,z:p.z+Math.sin(angle)*6};at.y=groundHeight(at.x,at.z);
        if(!validRelocation(s,e,at)||groundDist(at,e)<3||!visible(s,{...at,y:at.y+.9},centre(p)))continue;
        const score=groundDist(at,e)-i*.12;if(score>bestScore){best=at;bestScore=score;}
      }
      return best;
    }

    function choosePattern(s,e,distance){
      const n=finite(e.patternSequence);
      if(e.type==='guard')return n%3===2?beginCombo(s,e,['guardThrust'],'长锋突刺',1.15):beginCombo(s,e,['guardSlash','guardBackslash'],'双刃连斩',1.05);
      if(e.type==='slime')return beginCombo(s,e,['slimeHop','slimeCrush'],'跃进重压',1.15);
      if(e.type==='archer')return n%2?beginCombo(s,e,['arrowFirst','arrowSecond'],'连珠二矢',1.2):beginCombo(s,e,['arrowSingle'],'凝神穿云',1.05);
      if(e.type==='bat')return n%2?beginCombo(s,e,['batDive','batSwoop'],'俯冲折返',1.2):beginCombo(s,e,['batDive'],'俯冲啄击',.95);
      if(e.type==='swimmer')return n%3===2?beginCombo(s,e,['waterFan'],'三岔浪花',1.45):beginCombo(s,e,['waterFirst','waterSecond'],'双潮追射',1.25);
      if(e.type==='boss'){
        const kind=bossKind(s,e);
        if(kind==='sweetheart'){
          // Far: cakes or a hug. Near: lollipop sweep, bonk, or the party popper.
          if(distance>4.4)return n%2?beginCombo(s,e,['sweetHug'].concat(e.phase2?['sweetSweep']:[]),'抱抱冲锋',1.9):beginCombo(s,e,e.phase2?['sweetCakeFan','sweetCakeB']:['sweetCakeA','sweetCakeB','sweetCakeA'],'生日投喂',1.8);
          if(n%3===0)return beginCombo(s,e,e.phase2?['sweetSweep','sweetBonk']:['sweetSweep'],'棒棒糖连击',1.75);
          if(n%3===1)return beginCombo(s,e,['sweetPopper'].concat(e.phase2?['sweetCakeFan']:[]),'生日礼花',1.85);
          return beginCombo(s,e,['sweetBonk'],'爱心敲头',1.7);
        }
        if(kind==='ironWarden'){
          if(n%3===0)return beginCombo(s,e,e.phase2?['wardenCharge','wardenReturn']:['wardenCharge'],'誓盾追击',1.75);
          if(n%3===1)return beginCombo(s,e,e.phase2?['wardenSweep','wardenReturn']:['wardenSweep'],'余晖低扫',1.65);
          return beginCombo(s,e,e.phase2?['wardenThrust','wardenStomp']:['wardenThrust'],'贯誓重刺',1.85);
        }
        if(kind==='tideBeast'){
          if(n%2)return beginCombo(s,e,e.phase2?['tideSplash','tideSplash']:['tideSplash'],'潜流伏击',1.85);
          return beginCombo(s,e,e.phase2?['tidePulse','tideFan']:['tideFan'],'潮脊齐涌',1.75);
        }
        return beginCombo(s,e,(e.phase2||n%2===0)?['seerRelocate','seerFirst','seerSecond','seerThird']:['seerFirst','seerSecond','seerThird'],'三针星轨',1.8);
      }
      return false;
    }

    function idleStep(s,e,distance,dt){
      const p=s.player,d=direction(p.x-e.x,p.z-e.z,{x:e.dirX,z:e.dirZ});
      e.dirX=d.x;e.dirZ=d.z;e.facing=d.x<0?-1:1;settleHeight(s,e,dt);
      const sight=visible(s,shotOrigin(s,e),centre(p));
      if(e.type==='swimmer'){
        moveDisc(s,e,Math.cos(e.aiTime*.8)*dt*.55,Math.sin(e.aiTime*.6)*dt*.35,false,'swimmer');
        if(distance<14&&sight&&e.cooldown<=EPS&&choosePattern(s,e,distance))return;e.state='idle';
      }else if(e.type==='archer'){
        if(distance<3.5){e.state='chase';steerEnemy(s,e,{x:e.x-d.x*3,z:e.z-d.z*3},2.45,dt);}
        else if(distance<=14&&sight&&e.cooldown<=EPS&&choosePattern(s,e,distance))return;
        else if(distance>8||!sight){e.state='chase';steerEnemy(s,e,rangedFlankTarget(s,e),2.7,dt);}else e.state='idle';
      }else if(e.type==='bat'){
        if(distance<5.4&&sight&&e.cooldown<=EPS&&choosePattern(s,e,distance))return;
        if(distance>3||!sight){e.state='chase';steerEnemy(s,e,p,3.05,dt);}else e.state='idle';
      }else if(e.type==='boss'){
        const kind=bossKind(s,e),reach=kind==='ironWarden'?7.1:kind==='sweetheart'?11:13;
        if(distance<reach&&sight&&e.cooldown<=EPS&&choosePattern(s,e,distance))return;
        if(kind==='sweetheart'){
          if(distance>2.9||!sight){e.state='chase';steerEnemy(s,e,p,e.phase2?2.35:2,dt);}else e.state='idle';
        }else if(kind==='ironWarden'){
          if(distance>2.65||!sight){e.state='chase';steerEnemy(s,e,p,e.phase2?2.55:2.2,dt);}else e.state='idle';
        }else if(kind==='tideBeast'){
          if(distance>8||!sight){e.state='chase';steerEnemy(s,e,rangedFlankTarget(s,e),1.15,dt);}else e.state='idle';
        }else{
          if(distance<3.5){e.state='chase';steerEnemy(s,e,{x:e.x-d.x*3,z:e.z-d.z*3},2,dt);}
          else if(distance>10||!sight){e.state='chase';steerEnemy(s,e,rangedFlankTarget(s,e),1.85,dt);}else e.state='idle';
        }
      }else{
        const reach=e.type==='slime'?3.5:finite(e.patternSequence)%3===2?MOVES.guardThrust.range-.1:MOVES.guardSlash.range-.1;
        if(distance<=reach&&sight&&e.cooldown<=EPS&&choosePattern(s,e,distance))return;
        if(distance>1.65||!sight){e.state='chase';steerEnemy(s,e,p,e.type==='slime'?2.65:2.5,dt);}else e.state='idle';
      }
    }

    function step(s,dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      for(const e of s.enemies){
        if(e.state==='spawning'&&e.spawnTimed){e.spawnRemaining=Math.max(0,finite(e.spawnRemaining)-dt);if(e.spawnRemaining<=EPS){e.state='idle';e.spawnTimed=false;}continue;}
        if(!e.spawned||e.state==='spawning')continue;
        const old=point(e);
        for(const key of ['hitFlash','stunResistance','cooldown','repath','hitReactionTimer','parryStaggerTimer'])e[key]=Math.max(0,finite(e[key])-dt);
        e.vx=0;e.vz=0;
        if(e.dead){e.deadAge=finite(e.deadAge)+dt;e.comboActive=false;e.comboMoves=null;clearEnemyStrike(e);continue;}
        e.aiTime=finite(e.aiTime)+dt;refreshBase(e);
        const distance=groundDist(e,s.player),boss=e.type==='boss';
        if(s.mode==='wilds'){
          if(boss){
            if(!(e.bossKind==='sweetheart'?s.wilds.finalEntered:s.wilds.bossEntered)){e.state='dormant';e.aggro=false;continue;}
            e.aggro=true;
          }else{
            const lost=s.wilds.bossEntered||s.wilds.finalEntered||groundDist(s.player,s.camp)<5.8||groundDist(s.player,e.spawnAnchor)>finite(e.leash,12)||groundDist(e,e.spawnAnchor)>finite(e.leash,12)+.1;
            if(e.returning||e.aggro&&lost){returnHome(s,e,dt);e.vx=(e.x-old.x)/dt;e.vz=(e.z-old.z)/dt;continue;}
            if(lost){e.state='idle';settleHeight(s,e,dt);continue;}
            const nearbyAggro=s.enemies.filter(n=>n!==e&&!n.dead&&n.aggro&&n.type!=='boss').length;
            if(!e.aggro&&nearbyAggro<3&&distance<=finite(e.aggroRadius,6.5)&&visible(s,shotOrigin(s,e),centre(s.player)))e.aggro=true;
            if(!e.aggro){e.state='idle';settleHeight(s,e,dt);continue;}
          }
        }
        if(e.hitStun>0){
          if(e.comboActive)cancelCombo(s,e,'stagger');e.hitStun=Math.max(0,e.hitStun-dt);
          if(e.state==='recover')e.timer=Math.max(0,e.timer-dt);
          settleHeight(s,e,dt);continue;
        }
        if(e.pulledUntil>s.time&&e.type!=='boss'){if(e.comboActive)cancelCombo(s,e,'pull');continue;}
        // A heavy hit may have changed state before this AI step. Never resume a
        // stale remaining combo after an external interruption.
        if(e.comboActive&&e.state==='recover')finishCombo(s,e,true);
        if(s.mode!=='wilds'){
          if(distance<12||e.hp<e.maxHp)e.aggro=true;
          if(boss){bossKind(s,e);if(!s.bossActive&&(distance<11||e.aggro)){s.bossActive=true;emit(s,'bossAwake',e,{targetId:e.id});}if(!s.bossActive)continue;}
          if(!e.aggro&&distance>14){e.state='idle';continue;}
        }
        if(e.state==='windup'){
          if(covered(s,e))cancelCombo(s,e,'cover');
          else{e.timer=Math.max(0,e.timer-dt);if(e.timer<=EPS)releaseMove(s,e);}
        }else if(e.state==='strike')strikeStep(s,e,dt);
        else if(MOTION.includes(e.state))motionStep(s,e,dt);
        else if(e.state==='comboGap'){
          e.timer=Math.max(0,e.timer-dt);
          if(e.timer<=EPS){
            if(distance>17||!visible(s,shotOrigin(s,e),centre(s.player)))cancelCombo(s,e,'outOfSight');
            else{e.comboIndex++;beginMove(s,e);}
          }
        }else if(e.state==='recover'){
          settleHeight(s,e,dt);e.timer=Math.max(0,e.timer-dt);
          if(e.timer<=EPS){e.state='idle';e.exposed=false;}
        }else idleStep(s,e,distance,dt);
        e.vx=(e.x-old.x)/dt;e.vz=(e.z-old.z)/dt;if(s.phase==='dead')return;
      }
      separateEnemies(s,dt);
    }

    return{step};
  }
  return{create};
});
