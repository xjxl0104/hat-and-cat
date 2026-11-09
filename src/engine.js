(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.HatGame=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const EPS=1e-7,TAU=Math.PI*2;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const finite=(n,f=0)=>Number.isFinite(n)?n:f;
  const point=a=>({x:finite(a.x),y:finite(a.y),z:finite(a.z)});
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
  const groundDist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  function direction(x,z,fallback={x:1,z:0}){const n=Math.hypot(x,z);return n>EPS?{x:x/n,z:z/n}:{x:fallback.x,z:fallback.z};}
  function centre(a){return{x:a.x,y:a.y+(a.type==='swimmer'?.35:.9),z:a.z};}
  function catPoint(a){return{x:a.x,y:finite(a.y),z:a.z};}
  function groundHeight(x,z){return globalThis.HatTerrain.heightAt(x,z);}
  function obstacleBottom(o){return finite(o.y)-.25;}
  function obstacleTop(o){return finite(o.y)+o.height;}
  const ATTACKS=[{duration:.4,windup:.11,active:.1,damage:24,lunge:.35,stamina:14,range:1.9,style:'risingCut',arc:.3,contactStart:.22},{duration:.43,windup:.13,active:.11,damage:29,lunge:.4,stamina:16,range:1.9,style:'returnCut',arc:-.18,contactStart:.25},{duration:.57,windup:.2,active:.13,damage:44,lunge:.6,stamina:21,range:1.9,style:'cleave',arc:1.1,contactStart:.33}];
  const GUARD={halfAngle:65*Math.PI/180,perfectWindow:.16,rearm:.55,breakDuration:.8,counterWindow:1.2};
  const ROLL={duration:.38,distance:3.9,recharge:.55,iframeDuration:.23};
  const SKILLS={
    blade:{id:'blade',name:'月牙三连',key:'鼠标左键',damage:24,description:'连续点击三次斩击，各消耗14/16/21体力；第三击击碎星痕，跳斩伤害提升。'},
    bolt:{id:'bolt',name:'蓄力短弓',key:'C切短弓 · 鼠标左/右键',damage:48,cooldown:.3,range:14,description:'C切换短弓后按住拉弓，松开发射；轻点快射，蓄满0.6秒造成48点伤害并穿透两敌，留下4秒星痕。'},
    cat:{id:'cat',name:'猫咪飞扑',key:'E',damage:34,cooldown:4.5,range:8,description:'猫咪扑向瞄准方向的一名敌人，优先追击星痕；消耗印记追加10点伤害。'},
    dash:{id:'dash',name:'月影翻滚',key:'Q',cooldown:ROLL.recharge,charges:2,description:'消耗25体力沿移动方向翻滚，短暂无敌；空格跳跃，Shift按住疾跑。'}
  };
  const PERKS={
    starSplit:{id:'starSplit',name:'三羽齐射',family:'star',icon:'⋔',description:'每次放箭额外射出两支扇形侧箭，各造成主箭55%伤害并留下星痕。',synergies:['gravityNova','catHunt']},
    starRicochet:{id:'starRicochet',name:'折返猎箭',family:'star',icon:'↗',description:'主箭命中后弹向附近另一敌人，造成65%伤害并留下星痕；每箭仅弹一次。',synergies:['returnCrescent','catHunt']},
    gravityNova:{id:'gravityNova',name:'聚风回旋',family:'blade',icon:'◎',description:'Q在风刃尽头吸拢敌人，再旋斩一次，造成16点伤害并使敌人失衡。',synergies:['starSplit','catHunt']},
    returnCrescent:{id:'returnCrescent',name:'回风双刃',family:'blade',icon:'☽',description:'Q风刃变宽并沿原路折返；回程造成18点伤害，重新留下星痕。',synergies:['starRicochet','gravityNova']},
    catHunt:{id:'catHunt',name:'连环飞扑',family:'cat',icon:'爪',description:'E命中后再跳向附近两名不同敌人，每次造成22点伤害，优先追击印记。',synergies:['gravityNova','starSplit','starRicochet']},
    catGuard:{id:'catGuard',name:'护主猫铃',family:'cat',icon:'◇',description:'E命中后，猫咪守护你3秒，完全挡住下一次伤害。',synergies:['catHunt','returnCrescent']}
  };
  const PERK_IDS=['starSplit','starRicochet','catHunt','catGuard'];
  for(const perk of Object.values(PERKS)){perk.synergies=perk.synergies.filter(id=>PERK_IDS.includes(id));perk.partners=perk.synergies;}
  const LEVELS=[{id:'golden-wake',name:'余晖荒庭',theme:'wilds',index:0}],ROOMS=[],ROOM_EDGES=[];
  function normalizeRect(r,index){return{...r,id:r.id||'obstacle-'+index,x:finite(r.x),y:finite(r.y,groundHeight(r.x,r.z)),z:finite(r.z),w:Math.max(.05,finite(r.w,1)),d:Math.max(.05,finite(r.d,1)),height:Math.max(.1,finite(r.height,3)),walkable:!!r.walkable};}
  function circleRect(x,z,r,o){const dx=x-clamp(x,o.x-o.w/2,o.x+o.w/2),dz=z-clamp(z,o.z-o.d/2,o.z+o.d/2);return dx*dx+dz*dz<r*r-EPS;}
  function canOccupy(s,x,z,r=.45,kind='ground',height=0){
    const b=s.bounds;if(x-r<b.minX||x+r>b.maxX||z-r<b.minZ||z+r>b.maxZ)return false;
    if(kind==='swimmer')return s.ponds.some(q=>x>=q.x-q.w/2+r&&x<=q.x+q.w/2-r&&z>=q.z-q.d/2+r&&z<=q.z+q.d/2-r);
    for(const o of s.obstacles){
      const top=obstacleTop(o),above=kind==='bat'?top<=height+.2:kind==='player'&&o.walkable&&height>=top-.025;
      if(!above&&circleRect(x,z,r,o))return false;
    }
    if(kind!=='bat')for(const pond of s.ponds)if(circleRect(x,z,r,pond))return false;
    return true;
  }
  function safePosition(s,pos,r=.45,kind='ground',height=finite(pos.y)){
    const lift=Math.max(0,height-groundHeight(pos.x,pos.z)),at=(x,z)=>({x,y:groundHeight(x,z)+lift,z});
    if(canOccupy(s,pos.x,pos.z,r,kind,height))return point(pos);
    for(let ring=.5;ring<30;ring+=.5)for(let j=0;j<24;j++){const a=j*TAU/24,p=at(pos.x+Math.cos(a)*ring,pos.z+Math.sin(a)*ring);if(canOccupy(s,p.x,p.z,r,kind,p.y))return p;}
    return at(-14,7);
  }
  function moveDisc(s,a,dx,dz,stopOnHit=false,kind='ground'){
    if(a===s.player)kind='player';
    const radius=a.radius||.45,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.14));let blocked=false;
    function advance(x,z){
      const oldGround=groundHeight(a.x,a.z),nextGround=groundHeight(x,z);let feet=a.y;
      // Slopes are support, not walls. Preserve jump/flight clearance while
      // ground walkers track the sampled surface at every collision substep.
      if(kind==='player'&&a.grounded){const support=supportHeight(s,x,z,a.y+.22,radius);if(support>=a.y-.22)feet=support;}
      else if(kind==='ground'||kind==='bat')feet=Math.max(nextGround,a.y+nextGround-oldGround);
      if(!canOccupy(s,x,z,radius,kind,feet))return false;
      a.x=x;a.z=z;a.y=feet;
      if(kind==='ground'||kind==='bat'){a.groundY=nextGround;a.baseY=nextGround+(kind==='bat'?finite(a.hoverHeight,1.8):0);}
      return true;
    }
    for(let i=0;i<n;i++){const sx=dx/n,sz=dz/n;if(advance(a.x+sx,a.z+sz))continue;blocked=true;if(stopOnHit)break;advance(a.x+sx,a.z);advance(a.x,a.z+sz);}
    return blocked;
  }
  function segmentContact(a,b,c,r){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,den=dx*dx+dy*dy+dz*dz,t=den>EPS?clamp(((c.x-a.x)*dx+(c.y-a.y)*dy+(c.z-a.z)*dz)/den,0,1):0;return Math.hypot(a.x+dx*t-c.x,a.y+dy*t-c.y,a.z+dz*t-c.z)<=r?t:null;}
  // Shot volumes describe the painted body, not the much smaller foot disc.
  // Reticle selection and projectile collision share this exact ellipsoid.
  // Profiles: body centre height, vertical radius, horizontal radius. Weapons,
  // the seer's halo/satellites and the beast's narrow tail are not body targets.
  const SHOT_VOLUMES={guard:[1.18,1.2,.65],slime:[1.18,1.2,.65],archer:[1.3,1.25,.6],bat:[1,.5,.7],swimmer:[.65,.6,.75],ironWarden:[2.4,2.15,1.15],sweetheart:[1.85,1.75,1.05],tideBeast:[1.75,1.55,2.65],starSeer:[2.85,1.8,1.05]};
  function projectileTargetPoint(e){return{x:e.x,y:finite(e.y)+(SHOT_VOLUMES[e.bossKind||e.type]?.[0]??.9),z:e.z};}
  function projectileTargetContact(a,b,e,padding=0){
    const profile=SHOT_VOLUMES[e.bossKind||e.type]||[.9,.58,Math.max(.58,e.radius||0)],rx=profile[2]+padding,ry=profile[1]+padding;
    const x=(a.x-e.x)/rx,y=(a.y-finite(e.y)-profile[0])/ry,z=(a.z-e.z)/rx,dx=(b.x-a.x)/rx,dy=(b.y-a.y)/ry,dz=(b.z-a.z)/rx;
    const aa=dx*dx+dy*dy+dz*dz,bb=2*(x*dx+y*dy+z*dz),cc=x*x+y*y+z*z-1;
    if(cc<=0)return 0;if(aa<EPS)return null;const discriminant=bb*bb-4*aa*cc;if(discriminant<0)return null;
    const t=(-bb-Math.sqrt(discriminant))/(2*aa);return t>=0&&t<=1?t:null;
  }
  function segmentBox(a,b,o,r=0){
    let lo=0,hi=1;const min={x:o.x-o.w/2-r,y:obstacleBottom(o)-r,z:o.z-o.d/2-r},max={x:o.x+o.w/2+r,y:obstacleTop(o)+r,z:o.z+o.d/2+r};
    for(const k of ['x','y','z']){const d=b[k]-a[k];if(Math.abs(d)<EPS){if(a[k]<min[k]||a[k]>max[k])return null;continue;}let u=(min[k]-a[k])/d,v=(max[k]-a[k])/d;if(u>v){const t=u;u=v;v=t;}lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return null;}return lo;
  }
  function wallContact(s,a,b,r=0){
    let hit=globalThis.HatTerrain.segmentContact(a,b,r);
    for(const o of s.obstacles){
      const t=segmentBox(a,b,o,r);if(t===null||(hit&&t>=hit.t))continue;
      const impact={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t},faces=[
        {gap:Math.abs(impact.x-(o.x-o.w/2-r)),normal:{x:-1,y:0,z:0}},
        {gap:Math.abs(impact.x-(o.x+o.w/2+r)),normal:{x:1,y:0,z:0}},
        {gap:Math.abs(impact.z-(o.z-o.d/2-r)),normal:{x:0,y:0,z:-1}},
        {gap:Math.abs(impact.z-(o.z+o.d/2+r)),normal:{x:0,y:0,z:1}},
        {gap:Math.abs(impact.y-(obstacleTop(o)+r)),normal:{x:0,y:1,z:0}},
        {gap:Math.abs(impact.y-(obstacleBottom(o)-r)),normal:{x:0,y:-1,z:0}}
      ];faces.sort((u,v)=>u.gap-v.gap);const normal=faces[0].normal;
      hit={t,obstacleId:o.id,obstacle:o,normal,point:impact,surfacePoint:{x:clamp(impact.x-normal.x*r,o.x-o.w/2,o.x+o.w/2),y:clamp(impact.y-normal.y*r,obstacleBottom(o),obstacleTop(o)),z:clamp(impact.z-normal.z*r,o.z-o.d/2,o.z+o.d/2)}};
    }return hit;
  }
  function visible(s,a,b){return wallContact(s,a,b,.04)===null;}
  function activeEnemy(e){return !!e&&e.spawned&&!e.dead&&e.state!=='spawning'&&e.state!=='dormant';}
  function context(s,skill,options={}){const id=++s.actionSerial;return{actionId:id,rootActionId:id,origin:'primary',generation:0,sourceSkill:skill,effectId:skill,owner:'player',hitStopClass:'none',staggerClass:'none',...options};}
  function secondary(ctx,effect,extra={}){return{...ctx,origin:'reaction',generation:1,effectId:effect,hitStopClass:'none',staggerClass:'none',...extra};}
  function emit(s,type,at,fields={},ctx){
    const c=ctx||s.currentContext||{actionId:0,rootActionId:0,origin:'primary'},e={type,eventId:++s.eventSerial,actionId:c.actionId||0,rootActionId:c.rootActionId||0,origin:c.origin||'primary',...point(at),...fields};
    if(e.targetId!==undefined&&e.target===undefined)e.target=e.targetId;if(c.sourceSkill&&!e.sourceSkill)e.sourceSkill=c.sourceSkill;s.events.push(e);return e;
  }
  function has(s,id){return s.perks.includes(id);}
  function getPerkInfo(s,id){const p=PERKS[id];if(!p)return null;const owns=Array.isArray(s?.perks)?s.perks:[];return{...p,partners:p.synergies,owned:owns.includes(id),synergyNames:p.synergies.filter(x=>owns.includes(x)).map(x=>PERKS[x].name),nextDescription:p.description};}
  function getSkillInfo(s,id){if(PERKS[id])return getPerkInfo(s,id);const p=SKILLS[id];return p?{...p,level:1,unlocked:true,maxed:true,maxLevel:1,nextDescription:p.description}:null;}
  function getChoices(s){
    const eligible=PERK_IDS.filter(id=>!has(s,id));if(!s.perks.length)return['starSplit','catHunt','catGuard'];
    const scored=eligible.map((id,i)=>({id,score:PERKS[id].synergies.filter(p=>has(s,p)).length*4+s.perks.filter(p=>PERKS[p]?.family===PERKS[id].family).length,tie:(i+s.levelIndex*3+s.boonCount)%PERK_IDS.length})).sort((a,b)=>b.score-a.score||a.tie-b.tie),result=[];
    if(scored.length)result.push(scored[0].id);const families=new Set(s.perks.map(id=>PERKS[id].family)),fresh=scored.find(a=>!result.includes(a.id)&&!families.has(PERKS[a.id].family));if(fresh)result.push(fresh.id);
    const alternate=scored.find(a=>!result.includes(a.id)&&PERKS[a.id].family!==PERKS[result[0]]?.family);if(alternate&&result.length<3)result.push(alternate.id);
    for(const item of scored)if(result.length<3&&!result.includes(item.id))result.push(item.id);return result;
  }
  function makePlayer(spawn){return{
    ...point(spawn),radius:.45,vx:0,vy:0,vz:0,facing:1,lastMoveX:1,lastMoveZ:0,aimDirX:1,aimDirZ:0,aimPoint:null,aimTargetId:null,aimElevation:0,hp:100,maxHp:100,grounded:true,
    attackTimer:0,attackCooldown:0,attackElapsed:0,attackPreviousElapsed:0,attackDuration:0,attackPhase:'idle',attackFacing:1,attackDirX:1,attackDirZ:0,attackBuffer:0,attackId:0,attackHits:[],attackContext:null,
    castTimer:0,castKind:null,castFacing:1,hurtTimer:0,dodgeTimer:0,dodgeCooldown:0,dodgeDirection:1,invulnerable:0,iFrames:{hurtUntil:0,dashUntil:0},combo:0,comboWindow:0,potions:3,damageBonus:0,
    stamina:100,maxStamina:100,staminaDelay:0,sprinting:false,sprintExhausted:false,jumpAttack:false,airSpeed:6.4,groundY:finite(spawn.y),healTimer:0,healDuration:1.1,landTimer:0,jumpBuffer:0,dashBuffer:0,
    dash:{id:0,charges:2,rechargeRemaining:0,elapsed:0,duration:ROLL.duration,dirX:1,dirZ:0,from:point(spawn),previous:point(spawn),active:false,nextAllowedAt:0,crossedEnemyIds:[],reflectedProjectileId:null,damageByTarget:{}},
    mirror:null,orbitStars:{count:0,expiresAt:0,grantActionId:0},actionBuffer:null,bowCharging:false,bowCharge:0,bowElapsed:0,bowRelease:null,catGuardUntil:0,catGuardCharges:0,
    weaponMode:'sword',weaponSwitchUntil:0,weaponInputBlocked:false,guardActive:false,guardDirX:1,guardDirZ:0,guardRaiseTimer:0,guardImpactTimer:0,guardBreakTimer:0,parryUntil:0,guardReadyAt:0,counterUntil:0,counterTargetId:null,attackCounter:false
  };}
  function makeCatMotion(p,s){const x=p.x-1,z=p.z+.7;return{position:{x,y:supportHeight(s,x,z,p.y+.22,.22),z},flight:null,availableAt:0};}
  function catMotionStep(s,dt){
    const cat=s.catMotion,p=s.player,f=cat.flight;
    if(f){const t=clamp((s.time-f.startedAt)/f.duration,0,1);cat.position={x:f.from.x+(f.to.x-f.from.x)*t,y:f.from.y+(f.to.y-f.from.y)*t+Math.sin(t*Math.PI)*.7,z:f.from.z+(f.to.z-f.from.z)*t};cat.position.y=Math.max(cat.position.y,supportHeight(s,cat.position.x,cat.position.z,cat.position.y,.22));}
    else{const amount=Math.min(1,dt*7);cat.position.x+=(p.x-1.1-cat.position.x)*amount;cat.position.z+=(p.z+.85-cat.position.z)*amount;
      const floor=supportHeight(s,cat.position.x,cat.position.z,Math.max(p.y,cat.position.y)+.22,.22),y=p.grounded?floor:Math.max(floor,p.y);cat.position.y=Math.max(floor,cat.position.y+(y-cat.position.y)*amount);}
  }
  function wildsData(){const area=globalThis.HatWilds;if(!area)throw new Error('HatWilds must load before HatGame.createGame.');return area;}
  function refreshWildsObstacles(s){
    s.obstacles=wildsData().obstacles.filter(o=>o.id!=='shortcut-barrier'||!s.wilds.shortcutOpen).map(normalizeRect);
    if(wildsData().bossGate&&(!s.wilds.bossDefeated||s.wilds.finalEntered&&!s.wilds.finalDefeated)){const y=Math.min(groundHeight(-2.9,-13.225),groundHeight(2.9,-13.225),groundHeight(-2.9,-12.775),groundHeight(2.9,-12.775));s.obstacles.push({id:'boss-mist',x:0,y,z:-13,w:5.8,d:.45,height:groundHeight(0,-13)+5.8-y,kind:'fog',walkable:false});}
  }
  function populateWilds(s){
    s.enemies=wildsData().enemies.map((source,i)=>{
      const boss=source.type==='boss',at=point(source),defeated=boss&&(source.bossKind==='sweetheart'?s.wilds.finalDefeated:s.wilds.bossDefeated);
      return{...source,...at,radius:boss?.95:.43,maxHp:source.hp,hp:defeated?0:source.hp,vx:0,vz:0,facing:-1,dirX:0,dirZ:1,
        state:defeated?'dead':boss?'dormant':'idle',spawned:true,spawnRemaining:0,spawnDuration:.7,spawnAnchor:point(at),
        timer:0,attackTimer:0,moveId:null,strikeId:0,strikeElapsed:0,strikeDuration:0,strikeContact:0,contactReached:false,hitFlash:0,dead:defeated,cooldown:.7+(i%3)*.22,attackDone:false,hitStun:0,stunResistance:0,deadAge:defeated?20:0,
        hitDirX:0,hitDirZ:1,hitReactionTimer:0,hitReactionDuration:0,hitReactionStrength:0,parryStaggerTimer:0,
        attackKind:'slash',phase2:false,attackSequence:0,groundY:groundHeight(at.x,at.z),baseY:at.y,aiTime:0,statuses:{},path:[],repath:0,aggro:false,returning:false};
    });
    s.levelKills=s.enemies.filter(e=>e.dead).length;s.bossActive=false;s.arena.active=false;s.arena.cleared=s.wilds.bossDefeated;
    s.encounter.phase='exploration';s.encounter.activeCount=0;s.encounter.enemiesRemaining=s.enemies.filter(e=>!e.dead).length;
  }
  function getFloorMap(s){return s.floorMap={floorIndex:0,rooms:[],edges:[],landmarks:wildsData().landmarks,bounds:s.bounds};}
  function createGame(){
    const area=wildsData(),s={mode:'wilds',levelIndex:0,level:{...area,index:0,theme:'wilds',length:56},roomId:'wilds',room:{id:'wilds',kind:'wilds',name:area.name,cleared:false},
      worldLength:56,bounds:{...area.bounds},obstacles:[],ponds:[],lane:{minZ:area.bounds.minZ,maxZ:area.bounds.maxZ},platforms:[],waterZones:[],
      wilds:{bossEntered:false,bossDefeated:false,finalEntered:false,finalDefeated:false,shortcutOpen:false,deathDrop:null,upgradeHealth:0,upgradeWeapon:0},wildsRevision:0,camp:{...area.camp},interaction:null,
      chests:area.chests.map(c=>({...c,opened:false,revealing:false})),pickups:[],arena:{active:false,cleared:false,enemyIds:[]},checkpoint:true,bossActive:false,exitUnlocked:false,
      encounter:{index:0,number:0,total:1,phase:'exploration',remaining:0,activeCount:0,enemiesRemaining:area.enemies.length,cleared:0},
      levelKills:0,requiredKills:area.enemies.length,projectiles:[],areaEffects:[],pendingChest:null,treasure:null,upgradeChoices:[],reactionQueue:[],reactionCounts:{},hitKeys:{},cleanupAt:0,
      doors:[],roomSnapshots:{},pendingRoomTransition:null,roomArrival:{until:0,blockedDoorId:null},phase:'ready',time:0,skills:{blade:1,bolt:1,cat:1,vitality:1},
      perks:[],boonCount:0,skillCooldowns:{bolt:0,nova:0,magic:0,starfall:0},catCooldown:0,autoLatch:'camp',autoHealAt:0,events:[],kills:0,coins:0,comboHits:0,comboTimeout:0,hitStop:0,
      eventSerial:0,actionSerial:0,projectileSerial:0,areaSerial:0,reactionSerial:0,diagnostics:{reactionOverflow:0},inputLatch:{},frozenInput:null,impactFrozen:false,hitStopActions:{}};
    refreshWildsObstacles(s);s.player=makePlayer(safePosition(s,area.spawn));s.catMotion=makeCatMotion(s.player,s);populateWilds(s);getFloorMap(s);refreshInteraction(s);return s;
  }
  function cancelAttack(p){p.attackPhase='idle';p.attackTimer=0;p.attackCooldown=0;p.attackBuffer=0;p.attackElapsed=0;p.attackDuration=0;p.attackContext=null;p.attackCounter=false;}
  function cancelBow(s){const p=s.player;p.bowCharging=false;p.bowCharge=0;p.bowElapsed=0;p.bowRelease=null;if(p.actionBuffer?.key==='bolt')p.actionBuffer=null;}
  function cancelGuard(s){const p=s.player;p.guardActive=false;p.guardRaiseTimer=0;p.parryUntil=0;}
  function clearEnemyStrike(e){
    e.moveId=null;e.strikeId=0;e.strikeElapsed=0;e.strikeDuration=0;e.strikeContact=0;e.contactReached=false;e.attackTimer=0;e.attackDone=true;e.attackContext=null;
    e.motionDuration=0;e.motionFrom=null;e.motionBlocked=false;
  }
  function clearBufferedInputs(s){const p=s.player;s.frozenInput=null;s.inputLatch={};p.weaponSwitchUntil=0;p.weaponInputBlocked=false;p.attackBuffer=0;p.actionBuffer=null;p.jumpBuffer=0;p.dashBuffer=0;}
  function cancelDrink(s,reason){const p=s.player;if(p.healTimer>0){p.healTimer=0;emit(s,'drinkCancel',p,{reason,targetId:'player'});}}
  function clearTransient(s){
    const p=s.player;s.projectiles=[];s.areaEffects=[];s.reactionQueue=[];s.reactionCounts={};s.hitKeys={};s.hitStopActions={};s.hitStop=0;s.impactFrozen=false;s.catMotion=makeCatMotion(p,s);
    for(const e of s.enemies){e.comboActive=false;e.comboMoves=null;clearEnemyStrike(e);if(!e.dead&&['windup','strike','hop','dive','swoop','charge','comboGap'].includes(e.state)){e.state='idle';e.timer=0;}}
    p.mirror=null;p.orbitStars={count:0,expiresAt:0,grantActionId:0};p.dash.active=false;p.iFrames.dashUntil=0;p.castTimer=0;p.castKind=null;p.castContext=null;
    p.catGuardUntil=0;p.catGuardCharges=0;p.healTimer=0;p.guardImpactTimer=0;p.guardBreakTimer=0;p.guardReadyAt=0;p.counterUntil=0;p.counterTargetId=null;
    clearBufferedInputs(s);cancelGuard(s);cancelBow(s);cancelAttack(p);
  }
  function resetAtCamp(s){
    const p=s.player;clearTransient(s);s.autoLatch='camp';s.wilds.bossEntered=false;s.wilds.finalEntered=false;refreshWildsObstacles(s);populateWilds(s);
    Object.assign(p,safePosition(s,wildsData().spawn));p.y=p.groundY=supportHeight(s,p.x,p.z,p.y,p.radius);p.grounded=true;p.vx=p.vy=p.vz=0;p.hp=p.maxHp;p.potions=3;p.stamina=p.maxStamina;p.staminaDelay=0;p.sprinting=false;p.sprintExhausted=false;p.jumpAttack=false;p.airSpeed=6.4;
    p.hurtTimer=0;p.landTimer=0;p.combo=0;p.comboWindow=0;p.iFrames={hurtUntil:s.time+.8,dashUntil:0};p.dash.charges=2;p.dash.rechargeRemaining=0;p.dash.nextAllowedAt=0;p.dash.from=point(p);p.dash.previous=point(p);p.previousPosition=point(p);
    s.skillCooldowns.bolt=0;s.skillCooldowns.nova=0;s.catCooldown=0;s.catMotion=makeCatMotion(p,s);s.pendingChest=null;s.treasure=null;s.upgradeChoices=[];s.comboHits=0;s.comboTimeout=0;s.hitStop=0;
    s.wildsRevision++;refreshInteraction(s);
  }
  function rest(s){
    if(!s||s.phase!=='play'||!s.player.grounded||groundDist(s.player,s.camp)>2.5||!sameInteractionSurface(s.player,s.camp)||!interactionReady(s.player))return false;
    resetAtCamp(s);s.phase='rest';s.player.vx=s.player.vz=0;emit(s,'rest',s.camp,{targetId:'camp'});return s;
  }
  function leaveRest(s){if(s?.phase==='rest'){s.phase='play';refreshInteraction(s);emit(s,'leaveRest',s.player);}return s;}
  function getCampInfo(s){const healthLevel=s.wilds.upgradeHealth,weaponLevel=s.wilds.upgradeWeapon;return{healthCost:40+30*healthLevel,weaponCost:60+45*weaponLevel,healthLevel,weaponLevel,healthCapped:healthLevel>=3,weaponCapped:weaponLevel>=3,maxLevel:3};}
  function upgradeAtCamp(s,kind){
    if(!s||s.phase!=='rest'||!['health','weapon'].includes(kind))return false;const info=getCampInfo(s),cost=info[kind+'Cost'];
    if(info[kind+'Capped']||s.coins<cost)return false;s.coins-=cost;
    if(kind==='health'){s.wilds.upgradeHealth++;s.player.maxHp=100+s.wilds.upgradeHealth*20;s.player.hp=s.player.maxHp;}
    else{s.wilds.upgradeWeapon++;s.player.damageBonus=s.wilds.upgradeWeapon*4;}
    emit(s,'campUpgrade',s.camp,{kind,cost,level:s.wilds[kind==='health'?'upgradeHealth':'upgradeWeapon']});return s;
  }
  function respawn(s){if(!s||s.phase!=='dead')return s;resetAtCamp(s);s.phase='play';emit(s,'respawn',s.player,{targetId:'player'});return s;}
  // Legacy shell entry points remain inert: this is a single continuous area.
  function requestRoom(){return false;}
  function enterRoom(){return false;}
  function nextLevel(s){return s;}
  function chooseUpgrade(s,id){
    if(!s||s.phase!=='upgrade'||!s.upgradeChoices.includes(id)||!PERKS[id]||has(s,id))return s;
    const chest=s.chests.find(c=>c.id===s.pendingChest&&!c.opened);if(!chest)return s;
    s.perks.push(id);s.boonCount++;chest.opened=true;chest.revealing=false;s.coins+=8;s.phase='play';s.pendingChest=null;s.treasure=null;s.upgradeChoices=[];s.events=[];
    emit(s,'chest',chest,{value:8,targetId:chest.id,kind:chest.kind,revealed:true});emit(s,'upgrade',chest,{value:1,targetId:id,skill:id,perkId:id,name:PERKS[id].name});return s;
  }

  function statusActive(s,e,id){return !!e.statuses[id]&&e.statuses[id].expiresAt>s.time;}
  function applyStatus(s,e,id,ttl,ctx){if(!activeEnemy(e))return;e.statuses[id]={expiresAt:s.time+ttl,appliedByActionId:ctx.actionId};emit(s,'statusApply',centre(e),{targetId:e.id,statusId:id,ttl},ctx);}
  function consumeStatus(s,e,id,perk,ctx){if(!statusActive(s,e,id))return false;delete e.statuses[id];emit(s,'statusConsume',centre(e),{targetId:e.id,statusId:id,consumerPerk:perk},ctx);return true;}
  function schedule(s,kind,ctx,data={},delay=0){
    const root=ctx.rootActionId,count=s.reactionCounts[root]?.count||0;
    if(count>=32||s.reactionQueue.length>=64){s.diagnostics.reactionOverflow++;return false;}
    s.reactionCounts[root]={count:count+1,time:s.time};s.reactionQueue.push({id:++s.reactionSerial,kind,ctx,data,dueAt:s.time+delay});return true;
  }
  function requestHitStop(s,ctx,duration){
    // One small pause for an entire action, including all targets and side arrows.
    // Reactions never own a pause, and a second impact cannot add to a pending one.
    const id=ctx?.rootActionId;if(!id||ctx.origin!=='primary'||s.hitStopActions[id]!==undefined)return;
    s.hitStopActions[id]=s.time;s.hitStop=Math.max(s.hitStop,Math.min(.085,duration));
  }
  function interruptEnemy(s,e,duration,reason,ctx){
    if(e.comboActive)emit(s,'enemyAttackCancel',e,{targetId:e.id,targetType:e.type,attackKind:e.attackKind,reason},ctx);
    e.comboActive=false;e.comboMoves=null;clearEnemyStrike(e);e.state='recover';
    e.hitStun=Math.max(e.hitStun,duration);e.timer=e.hitStun;
    e.recoveryDuration=e.timer;e.cooldown=Math.max(e.cooldown,e.timer+.3);e.exposed=true;e.exposedUntil=s.time+e.timer;
  }
  function setHitReaction(e,dir,strength,duration){e.hitDirX=dir.x;e.hitDirZ=dir.z;e.hitReactionStrength=strength;e.hitReactionDuration=duration;e.hitReactionTimer=duration;}
  function damageEnemy(s,e,amount,ctx){
    if(!activeEnemy(e)||s.phase!=='play'||amount<=0)return{appliedDamage:0,killed:false,survived:activeEnemy(e)};
    const key=ctx.rootActionId+'|'+ctx.effectId+'|'+e.id+'|'+(ctx.pathLeg||0);if(s.hitKeys[key]!==undefined)return{appliedDamage:0,killed:false,survived:true};s.hitKeys[key]=s.time;
    const at=centre(e),before=e.hp,heavy=ctx.staggerClass==='heavy',dir=direction(finite(ctx.dirX,e.x-s.player.x),finite(ctx.dirZ,e.z-s.player.z)),boss=e.type==='boss';
    const contactPoint=ctx.contactPoint||{x:at.x-dir.x*Math.min(e.radius,.5),y:at.y,z:at.z-dir.z*Math.min(e.radius,.5)};
    if(boss&&e.exposedUntil>s.time)amount=Math.round(amount*1.2);
    if(ctx.owner==='player')amount+=s.player.damageBonus;
    e.hp=Math.max(0,e.hp-amount);e.hitFlash=.09;e.aggro=true;e.returning=false;if(boss)s.bossActive=true;
    if(ctx.origin==='primary'){
      s.comboHits++;s.comboTimeout=2;
      const blade=ctx.sourceSkill==='blade',strength=(ctx.attackCounter?1.15:heavy?.95:blade?.55:.32)*(boss?.6:1);
      setHitReaction(e,dir,strength,heavy?.28:.18);
      // Resistance outlasts a full combo: every hit reads visually, but light
      // attacks cannot keep resetting the enemy's commitment indefinitely.
      if(blade&&e.stunResistance<=EPS&&(!boss||ctx.attackCounter)){
        interruptEnemy(s,e,ctx.attackCounter?.28:heavy?.24:.095,'stagger',ctx);e.stunResistance=heavy?1.15:.72;
        if(!boss)moveDisc(s,e,dir.x*(heavy?.58:.24),dir.z*(heavy?.58:.24),false,e.type==='bat'?'bat':e.type==='swimmer'?'swimmer':'ground');
      }
      if(blade)requestHitStop(s,ctx,ctx.attackCounter?.085:heavy?.08:.048);
    }
    emit(s,'hit',contactPoint,{contactPoint,value:before-e.hp,damage:before-e.hp,targetId:e.id,targetType:e.type,combo:ctx.combo||0,heavy:ctx.origin==='primary'&&heavy,attackCounter:!!ctx.attackCounter,dirX:dir.x,dirZ:dir.z,direction:dir.x<0?-1:1,hitStopClass:ctx.hitStopClass},ctx);
    if(e.hp<=0){
      e.y=e.groundY=supportHeight(s,e.x,e.z,e.y,e.radius);e.baseY=e.y;e.dead=true;e.deadAge=0;e.state='dead';e.comboActive=false;e.comboMoves=null;clearEnemyStrike(e);e.timer=0;e.statuses={};s.kills++;s.levelKills++;s.coins+=finite(e.reward,boss?160:18);
      emit(s,'kill',at,{value:1,targetId:e.id,targetType:e.type,heavy:boss,dirX:dir.x,dirZ:dir.z,direction:dir.x<0?-1:1},ctx);
      if(boss&&e.bossKind==='sweetheart'){s.wilds.finalDefeated=true;s.wilds.finalEntered=false;s.bossActive=false;s.arena.active=false;s.arena.cleared=true;refreshWildsObstacles(s);s.wildsRevision++;emit(s,'finalDefeated',e,{targetId:e.id,reward:e.reward,heavy:true},ctx);}
      else if(boss){s.wilds.bossDefeated=true;s.wilds.bossEntered=false;s.bossActive=false;s.arena.active=false;s.arena.cleared=true;s.exitUnlocked=true;s.room.cleared=true;refreshWildsObstacles(s);s.wildsRevision++;emit(s,'bossDefeated',e,{targetId:e.id,reward:e.reward},ctx);emit(s,'exitUnlocked',s.level.exit);}
      return{appliedDamage:before,killed:true,survived:false};
    }
    if(boss&&!e.phase2&&e.hp<=e.maxHp/2){e.phase2=true;emit(s,'bossPhase',e,{value:2,targetId:e.id,targetType:'boss'},ctx);}
    if(ctx.explicitStatusPayload)applyStatus(s,e,ctx.explicitStatusPayload.id,ctx.explicitStatusPayload.ttl,ctx);
    if(ctx.origin==='primary'){
      if(ctx.sourceSkill==='blade'&&ctx.combo===3&&consumeStatus(s,e,'moonMark','blade',ctx))schedule(s,'damage',secondary(ctx,'bladeShatter'),{targetId:e.id,damage:8});
    }
    return{appliedDamage:before-e.hp,killed:false,survived:true};
  }
  function guardHit(s,enemy,damage,ctx,dir){
    const p=s.player,projectileHit=!!ctx.projectile;
    if(!p.guardActive||p.guardBreakTimer>EPS||ctx.unblockable||ctx.blockable===false)return false;
    // Direction is the incoming travel vector. Shield faces the opposite vector.
    if(-dir.x*p.guardDirX-dir.z*p.guardDirZ<Math.cos(GUARD.halfAngle))return false;
    const at=ctx.contactPoint||{x:p.x+p.guardDirX*.55,y:p.y+1.55,z:p.z+p.guardDirZ*.55};
    const perfect=p.parryUntil>s.time&&ctx.parryable!==false,cost=perfect?6:projectileHit?11:enemy.type==='boss'?28:Math.max(14,Math.round(damage*.95));
    const fields={targetId:'player',sourceId:enemy.id,attackKind:ctx.attackKind||enemy.attackKind||'arrow',value:Math.min(p.stamina,cost),projectile:projectileHit,dirX:dir.x,dirZ:dir.z,contactPoint:point(at)};
    p.staminaDelay=Math.max(p.staminaDelay,.8);p.guardImpactTimer=.2;
    if(p.stamina+EPS<cost){
      p.stamina=0;cancelGuard(s);p.guardBreakTimer=GUARD.breakDuration;p.counterUntil=0;p.counterTargetId=null;p.attackBuffer=0;p.actionBuffer=null;p.jumpBuffer=0;p.dashBuffer=0;
      emit(s,'guardBreak',at,{...fields,duration:GUARD.breakDuration},ctx);requestHitStop(s,ctx,.05);return true;
    }
    p.stamina-=cost;
    if(perfect){
      p.parryUntil=0;p.guardImpactTimer=.26;p.counterUntil=s.time+GUARD.counterWindow;p.counterTargetId=projectileHit?null:enemy.id;
      // An arrow is absorbed at the shield. Its distant owner is never staggered.
      if(!projectileHit&&activeEnemy(enemy)){
        const duration=enemy.type==='boss'?.5:.65;interruptEnemy(s,enemy,duration,'parry',ctx);enemy.stunResistance=1.2;enemy.parryStaggerTimer=duration;
        setHitReaction(enemy,{x:-dir.x,z:-dir.z},1.1,.32);fields.staggeredTargetId=enemy.id;
      }
      emit(s,'parry',at,{...fields,duration:GUARD.counterWindow},ctx);requestHitStop(s,ctx,.06);
    }else{emit(s,'block',at,fields,ctx);requestHitStop(s,ctx,.025);}
    return true;
  }
  function hurtPlayer(s,enemy,damage,ctx={}){
    const p=s.player;if(s.phase!=='play'||s.time<p.iFrames.hurtUntil||s.time<p.iFrames.dashUntil)return false;
    const dir=ctx.projectile?direction(finite(ctx.dirX),finite(ctx.dirZ)):direction(p.x-finite(enemy.x,p.x-1),p.z-finite(enemy.z,p.z),{x:finite(ctx.dirX,1),z:finite(ctx.dirZ)});
    if(guardHit(s,enemy,damage,ctx,dir))return false;
    damage=Math.max(1,Math.round(damage*.8));
    if(p.catGuardCharges>0&&p.catGuardUntil>s.time){p.catGuardCharges=0;p.catGuardUntil=0;p.iFrames.hurtUntil=s.time+.16;emit(s,'catGuardBlock',centre(p),{targetId:'player',sourceId:enemy.id,damage},ctx);return false;}
    p.hp=Math.max(0,p.hp-damage);p.iFrames.hurtUntil=s.time+.65;p.invulnerable=.65;p.hurtTimer=.28;cancelDrink(s,'hurt');cancelAttack(p);cancelBow(s);cancelGuard(s);p.counterUntil=0;p.counterTargetId=null;p.combo=0;p.comboWindow=0;p.castTimer=0;p.castKind=null;p.castContext=null;p.actionBuffer=null;p.staminaDelay=Math.max(p.staminaDelay,.5);
    if(p.dash.active)finishDash(s,true);s.comboHits=0;s.comboTimeout=0;
    emit(s,'hurt',ctx.contactPoint||centre(p),{value:damage,damage,targetId:'player',sourceId:enemy.id,targetType:enemy.type,heavy:enemy.type==='boss',direction:dir.x<0?-1:1,dirX:dir.x,dirZ:dir.z,attackKind:ctx.attackKind,unblockable:!!ctx.unblockable},ctx);requestHitStop(s,ctx,enemy.type==='boss'?.055:.035);
    if(p.hp<=0){p.y=p.groundY=supportHeight(s,p.x,p.z,p.y+.03,p.radius);p.grounded=true;s.wilds.deathDrop=s.coins>0?{x:p.x,y:p.y,z:p.z,coins:s.coins}:null;s.coins=0;s.phase='dead';p.vx=0;p.vy=0;p.vz=0;p.sprinting=false;s.interaction=null;clearTransient(s);emit(s,'death',p,{targetId:'player'},ctx);}return true;
  }
  function nearby(s,at,radius,requireSight=true){return s.enemies.filter(e=>activeEnemy(e)&&dist(centre(e),at)<=radius&&(!requireSight||visible(s,at,centre(e)))).sort((a,b)=>dist(centre(a),at)-dist(centre(b),at)||a.id.localeCompare(b.id));}
  function projectile(s,kind,from,to,speed,damage,ctx,options={}){
    const len=Math.max(EPS,dist(from,to)),shot={id:'p-'+(++s.projectileSerial),kind,owner:ctx.owner||'player',...point(from),prevX:from.x,prevY:from.y,prevZ:from.z,vx:(to.x-from.x)/len*speed,vy:(to.y-from.y)/len*speed,vz:(to.z-from.z)/len*speed,speed,damage,radius:kind==='bossOrb'||kind==='cake'?.28:.15,life:3,ctx,sourceId:ctx.sourceId||'player',hits:[],pathLeg:0,...options};
    s.projectiles.push(shot);emit(s,'projectile',from,{value:damage,damage,kind,owner:shot.owner,projectileId:shot.id,sourceId:shot.sourceId,vx:shot.vx,vy:shot.vy,vz:shot.vz,dirX:shot.vx/speed,dirY:shot.vy/speed,dirZ:shot.vz/speed},ctx);return shot;
  }
  function projectileWorldContact(s,a,b,r){
    let hit=wallContact(s,a,b,r);
    function plane(axis,value,normal,id,accept=()=>true){
      const delta=b[axis]-a[axis];if(Math.abs(delta)<EPS)return;
      const t=(value-a[axis])/delta;if(t<0||t>1||(hit&&t>=hit.t))return;
      const impact={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};if(!accept(impact))return;
      hit={t,obstacleId:id,normal,point:impact,surfacePoint:{x:impact.x-normal.x*r,y:impact.y-normal.y*r,z:impact.z-normal.z*r}};
    }
    const inside=(p,q)=>Math.abs(p.x-q.x)<q.w/2&&Math.abs(p.z-q.z)<q.d/2;
    if(b.y<a.y){
      for(const q of s.ponds||[])plane('y',q.bottom+r,{x:0,y:1,z:0},q.id+'-bottom',p=>inside(p,q));
    }
    const bounds=s.bounds;
    if(b.x<a.x)plane('x',bounds.minX+r,{x:1,y:0,z:0},'boundary-west');
    if(b.x>a.x)plane('x',bounds.maxX-r,{x:-1,y:0,z:0},'boundary-east');
    if(b.z<a.z)plane('z',bounds.minZ+r,{x:0,y:0,z:1},'boundary-north');
    if(b.z>a.z)plane('z',bounds.maxZ-r,{x:0,y:0,z:-1},'boundary-south');
    return hit;
  }
  function projectilesStep(s,dt){
    // New projectiles created by a ricochet/reflection are advanced next step.
    const active=s.projectiles.slice();
    for(const shot of active){
      if(shot.life<=0)continue;
      if(shot.homingId){const t=s.enemies.find(e=>e.id===shot.homingId&&activeEnemy(e));if(t){const q=projectileTargetPoint(t),dx=q.x-shot.x,dy=q.y-shot.y,dz=q.z-shot.z,l=Math.hypot(dx,dy,dz)||1,k=Math.min(1,dt*7);shot.vx+=(dx/l*shot.speed-shot.vx)*k;shot.vy+=(dy/l*shot.speed-shot.vy)*k;shot.vz+=(dz/l*shot.speed-shot.vz)*k;const n=Math.hypot(shot.vx,shot.vy,shot.vz)||1;shot.vx*=shot.speed/n;shot.vy*=shot.speed/n;shot.vz*=shot.speed/n;}}
      const a=point(shot);shot.prevX=a.x;shot.prevY=a.y;shot.prevZ=a.z;
      let travel=shot.speed*dt;if(Number.isFinite(shot.legRemaining))travel=Math.min(travel,shot.legRemaining);
      const scale=shot.speed>EPS?travel/shot.speed:0,b={x:a.x+shot.vx*scale,y:a.y+shot.vy*scale,z:a.z+shot.vz*scale},wall=projectileWorldContact(s,a,b,shot.radius);
      shot.x=b.x;shot.y=b.y;shot.z=b.z;shot.life-=dt;
      if(shot.owner==='player'){
        const contacts=[];for(const e of s.enemies){
          if(!activeEnemy(e)||shot.hits.includes(e.id+'|'+shot.pathLeg))continue;
          const wind=shot.kind==='windCut'||shot.kind==='returnCrescent';if(wind&&Math.abs(centre(e).y-a.y)>2.5)continue;
          const t=wind?segmentContact({...a,y:0},{...b,y:0},{x:e.x,y:0,z:e.z},shot.hitRadius+e.radius):projectileTargetContact(a,b,e,shot.radius);
          if(t!==null&&(wall===null||t<wall.t)&&(!wind||visible(s,a,centre(e))))contacts.push({e,t});
        }
        contacts.sort((u,v)=>u.t-v.t);
        for(const {e,t} of contacts){
          shot.hits.push(e.id+'|'+shot.pathLeg);const at={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t},ctx={...shot.ctx,effectId:shot.ctx.effectId+'-'+shot.id,pathLeg:shot.pathLeg,dirX:shot.vx/shot.speed,dirZ:shot.vz/shot.speed,contactPoint:at};
          let amount=shot.pathLeg===1&&Number.isFinite(shot.returnDamage)?shot.returnDamage:shot.damage;
          // Bosses shrug off part of each orb so fights still need the sword and dodging.
          if(shot.magic&&e.type==='boss')amount=Math.max(1,Math.round(amount*.7));
          if(shot.kind==='windCut'||shot.kind==='returnCrescent'){
            ctx.explicitStatusPayload=shot.pathLeg===1?{id:'moonMark',ttl:4}:undefined;
            if(shot.pathLeg===0&&consumeStatus(s,e,'moonMark','nova',ctx))amount+=10;
          }
          damageEnemy(s,e,amount,ctx);emit(s,'projectileHit',at,{value:amount,damage:amount,targetId:e.id,kind:shot.kind,owner:'player',projectileId:shot.id,targetType:e.type,dirX:ctx.dirX,dirZ:ctx.dirZ,direction:ctx.dirX<0?-1:1},ctx);
          if(shot.kind==='bowArrow'&&shot.canRicochet&&has(s,'starRicochet')&&!shot.bounced){
            shot.bounced=true;const next=nearby(s,centre(e),4).filter(n=>n.id!==e.id&&!shot.hits.some(h=>h.startsWith(n.id+'|'))).sort((u,v)=>(statusActive(s,u,'moonMark')?1:0)-(statusActive(s,v,'moonMark')?1:0)||groundDist(u,e)-groundDist(v,e))[0];
            if(next&&visible(s,at,projectileTargetPoint(next)))projectile(s,'ricochetBolt',at,projectileTargetPoint(next),22,Math.round(shot.damage*.65),secondary(shot.ctx,'starRicochet',{explicitStatusPayload:{id:'moonMark',ttl:4}}),{life:.4,hits:shot.hits.slice()});
          }
          if(shot.kind==='bowArrow'&&shot.remainingHits>1){shot.remainingHits--;shot.damage=Math.round(shot.damage*.75);continue;}
          if(shot.kind!=='returnCrescent'&&shot.kind!=='windCut'){shot.life=0;break;}
        }
      }else{
        const p=s.player,old=p.previousPosition||p,relativeA={x:a.x-old.x,y:a.y-old.y,z:a.z-old.z},relativeB={x:b.x-p.x,y:b.y-p.y,z:b.z-p.z},t=segmentContact(relativeA,relativeB,{x:0,y:.9,z:0},shot.radius+.5);
        if(t!==null&&(wall===null||t<wall.t)){
          const at={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
          const source=s.enemies.find(e=>e.id===shot.sourceId)||{id:shot.sourceId,type:'archer'};
          const hitContext={...shot.ctx,projectile:true,attackKind:shot.kind,dirX:shot.vx/shot.speed,dirZ:shot.vz/shot.speed,contactPoint:at};
          hurtPlayer(s,source,shot.damage,hitContext);shot.life=0;emit(s,'projectileHit',at,{targetId:'player',kind:shot.kind,owner:'enemy',projectileId:shot.id},shot.ctx);
        }
      }
      if(wall!==null&&shot.life>0){
        Object.assign(shot,wall.point);shot.life=0;
        emit(s,'projectileHit',wall.surfacePoint,{kind:shot.kind,owner:shot.owner,projectileId:shot.id,targetId:'wall',obstacleId:wall.obstacleId,normal:wall.normal,normalX:wall.normal.x,normalY:wall.normal.y,normalZ:wall.normal.z,dirX:shot.vx/shot.speed,dirY:shot.vy/shot.speed,dirZ:shot.vz/shot.speed,vx:shot.vx,vy:shot.vy,vz:shot.vz,velocity:{x:shot.vx,y:shot.vy,z:shot.vz}},shot.ctx);
      }
      if(Number.isFinite(shot.legRemaining)&&shot.life>0){shot.legRemaining-=travel;if(shot.legRemaining<=EPS){if(shot.kind==='returnCrescent'&&shot.pathLeg===0){shot.pathLeg=1;shot.legRemaining=shot.returnRange;shot.vx=-shot.vx;shot.vy=-shot.vy;shot.vz=-shot.vz;}else shot.life=0;}}
      const bounds=s.bounds;if(shot.x<bounds.minX-1||shot.x>bounds.maxX+1||shot.z<bounds.minZ-1||shot.z>bounds.maxZ+1||shot.y<groundHeight(shot.x,shot.z)-4||shot.y>groundHeight(shot.x,shot.z)+40)shot.life=0;
      if(s.phase==='dead')break;
    }
    s.projectiles=s.projectiles.filter(p=>p.life>EPS);
  }
  function coneTargets(s,at,dir,radius,halfAngle=1.13){return s.enemies.filter(e=>{if(!activeEnemy(e)||Math.abs(e.y-at.y)>2.5||groundDist(e,at)>radius+e.radius)return false;const v=direction(e.x-at.x,e.z-at.z,dir);return v.x*dir.x+v.z*dir.z>=Math.cos(halfAngle)&&visible(s,{x:at.x,y:at.y+.9,z:at.z},centre(e));});}
  function reactionsStep(s){
    let guard=0;
    while(guard++<64){
      s.reactionQueue.sort((a,b)=>a.dueAt-b.dueAt||a.id-b.id);const task=s.reactionQueue[0];if(!task||task.dueAt>s.time+EPS)break;s.reactionQueue.shift();
      const {kind,ctx,data}=task;let e=data.targetId?s.enemies.find(n=>n.id===data.targetId&&activeEnemy(n)):null;
      if(kind==='damage'){if(e&&!e.dead)damageEnemy(s,e,data.damage,ctx);}
      else if(kind==='catStart'){
        const cat=s.catMotion;
        if(cat.flight||s.time+EPS<cat.availableAt){task.dueAt=Math.max(s.time+EPS*4,cat.flight?cat.flight.landsAt:cat.availableAt);s.reactionQueue.push(task);continue;}
        if(!e||e.dead)continue;
        const from=point(cat.position),to=catPoint(e);
        if(!visible(s,{...from,y:from.y+.9},centre(e)))continue;
        const duration=data.duration||.12,flightId=task.id;
        if(!schedule(s,'catLand',ctx,{...data,flightId},duration))continue;
        cat.flight={id:flightId,from,to,startedAt:s.time,landsAt:s.time+duration,duration};
        emit(s,'catLeap',from,{from,to,targetId:e.id,delay:0,duration,finisher:!!data.finisher},ctx);
      }else if(kind==='catLand'){
        const cat=s.catMotion;if(!cat.flight||cat.flight.id!==data.flightId)continue;
        const flight=cat.flight;cat.position=point(flight.to);cat.flight=null;cat.availableAt=s.time+.04;
        if(!e||e.dead||groundDist(e,cat.position)>1.8||!visible(s,{...flight.from,y:flight.from.y+.9},centre(e))||!visible(s,{...cat.position,y:cat.position.y+.9},centre(e)))continue;
        const mark=statusActive(s,e,'moonMark')?'moonMark':statusActive(s,e,'offBalance')?'offBalance':null,damage=data.damage+(mark?10:0);
        if(mark)consumeStatus(s,e,mark,'cat',ctx);
        const result=damageEnemy(s,e,damage,ctx);emit(s,'catClaw',centre(e),{targetId:e.id,finisher:false,value:result.appliedDamage},ctx);
        if(result.appliedDamage>0&&has(s,'catGuard')&&cat.lastGuardAction!==ctx.rootActionId){cat.lastGuardAction=ctx.rootActionId;s.player.catGuardUntil=s.time+3;s.player.catGuardCharges=1;emit(s,'catGuard',s.player,{targetId:'player',duration:3,guard:1},ctx);}
        if(result.appliedDamage>0&&data.bounces>0){
          const visited=[...(data.visited||[]),e.id],next=nearby(s,centre(e),4.5).filter(n=>!visited.includes(n.id)).sort((a,b)=>Number(statusActive(s,b,'moonMark')||statusActive(s,b,'offBalance'))-Number(statusActive(s,a,'moonMark')||statusActive(s,a,'offBalance'))||groundDist(a,e)-groundDist(b,e))[0];
          if(next)schedule(s,'catStart',secondary(ctx,'catHunt-'+data.bounces),{targetId:next.id,damage:22,bounces:data.bounces-1,visited,duration:.18},.06);
        }
      }
      if(s.phase!=='play')break;
    }
  }

  function startDash(s,move){
    const p=s.player,d=p.dash;if(d.active||d.charges<1||s.time<d.nextAllowedAt||p.guardBreakTimer>EPS||p.hurtTimer>0||!p.grounded||p.healTimer>0||p.castTimer>0||p.attackPhase==='windup'||p.attackPhase==='active'||p.attackPhase==='recovery'&&p.attackTimer>.12||!spendStamina(p,25,.7))return false;
    const dir=Math.hypot(move.x,move.z)>.05?direction(move.x,move.z):{x:p.aimDirX,z:p.aimDirZ},ctx=context(s,'dash',{dirX:dir.x,dirZ:dir.z,hitStopClass:'none'});
    cancelAttack(p);cancelBow(s);cancelGuard(s);p.castTimer=0;p.castKind=null;p.castContext=null;p.actionBuffer=null;
    d.id++;d.active=true;d.elapsed=0;d.charges--;if(d.rechargeRemaining<=0)d.rechargeRemaining=ROLL.recharge;d.dirX=dir.x;d.dirZ=dir.z;d.from=point(p);d.previous=point(p);d.crossedEnemyIds=[];d.reflectedProjectileId=null;d.damageByTarget={};d.ctx=ctx;d.blocked=false;d.iframeDuration=ROLL.iframeDuration;
    p.vy=0;p.iFrames.dashUntil=s.time+ROLL.iframeDuration;p.dashBuffer=0;
    emit(s,'dashStart',p,{dashId:d.id,dirX:dir.x,dirZ:dir.z,duration:ROLL.duration,distance:ROLL.distance,iframeDuration:ROLL.iframeDuration,from:point(p),roll:true},ctx);return true;
  }
  function finishDash(s,blocked=false){
    const p=s.player,d=p.dash;if(!d.active)return;d.active=false;d.endedAt=s.time;d.blocked=blocked;d.nextAllowedAt=s.time+.06;p.iFrames.dashUntil=Math.min(p.iFrames.dashUntil,s.time);
    emit(s,'dashEnd',p,{dashId:d.id,from:d.from,blocked,dirX:d.dirX,dirZ:d.dirZ},d.ctx);
  }
  function beginMelee(s){
    const p=s.player;if(p.weaponMode!=='sword')return false;const counter=p.counterUntil>s.time,next=counter?3:p.combo%3+1;
    if(!spendStamina(p,counter?18:ATTACKS[next-1].stamina,.55))return false;
    cancelGuard(s);p.combo=next;p.comboWindow=counter?0:1.1;p.attackDuration=ATTACKS[p.combo-1].duration;p.attackElapsed=0;p.attackTimer=p.attackDuration;p.attackCooldown=p.attackDuration;p.attackPhase='windup';p.attackBuffer=0;p.attackDirX=p.aimDirX;p.attackDirZ=p.aimDirZ;p.attackFacing=p.facing;p.attackHits=[];p.attackId++;p.jumpAttack=!p.grounded;p.attackCounter=counter;
    p.attackContext=context(s,'blade',{combo:p.combo,attackCounter:counter,dirX:p.attackDirX,dirZ:p.attackDirZ,staggerClass:p.combo===3||p.jumpAttack?'heavy':'light',hitStopClass:p.combo===3||p.jumpAttack?'heavy':'light'});
    if(counter){emit(s,'counterStrike',p,{targetId:p.counterTargetId,attackCounter:true,combo:3,dirX:p.attackDirX,dirZ:p.attackDirZ},p.attackContext);p.counterUntil=0;p.counterTargetId=null;}
    const fields={combo:p.combo,attackCounter:counter,jumpAttack:p.jumpAttack,direction:p.attackFacing,dirX:p.attackDirX,dirZ:p.attackDirZ,heavy:p.combo===3||p.jumpAttack,targetId:'player',targetType:'player'};
    emit(s,'attack',p,fields,p.attackContext);emit(s,'windup',p,{...fields,value:ATTACKS[p.combo-1].windup,duration:ATTACKS[p.combo-1].windup,range:ATTACKS[p.combo-1].range,radius:ATTACKS[p.combo-1].range,halfAngle:1.13},p.attackContext);
    return true;
  }
  function meleeStep(s,dt){
    const p=s.player;if(p.attackPhase==='idle')return;const spec=ATTACKS[p.combo-1],before=p.attackElapsed;p.attackPreviousElapsed=before;p.attackElapsed=Math.min(p.attackDuration,p.attackElapsed+dt);p.attackTimer=Math.max(0,p.attackDuration-p.attackElapsed);p.attackCooldown=p.attackTimer;
    if(before<spec.windup&&p.attackElapsed>=spec.windup){
      emit(s,'swing',p,{combo:p.combo,attackCounter:p.attackCounter,jumpAttack:p.jumpAttack,direction:p.attackFacing,dirX:p.attackDirX,dirZ:p.attackDirZ,heavy:p.combo===3||p.jumpAttack,targetId:'player'},p.attackContext);
    }
    p.attackPhase=p.attackElapsed<spec.windup?'windup':p.attackElapsed<spec.windup+spec.active?'active':p.attackTimer>EPS?'recovery':'idle';
  }
  function meleeContacts(s){
    const p=s.player;if(p.attackPhase!=='active')return;
    const spec=ATTACKS[p.combo-1],contactStart=p.jumpAttack?.33:spec.contactStart,progress=clamp((p.attackElapsed-spec.windup)/spec.active,0,1);if(progress<contactStart)return;
    const previous=Math.max(contactStart,clamp((p.attackPreviousElapsed-spec.windup)/spec.active,0,1));
    // Match the authored wrist's accelerating sweep. A narrow swept sector
    // reaches each target when the blade crosses it, instead of hitting the
    // entire forward cone at the first active frame.
    function bladeYaw(t){
      if(p.combo===3||p.jumpAttack)return 0;const whip=1-(1-t)*(1-t),a=p.combo===1?-1.02:1.62,b=p.combo===1?.03:-.04,c=p.combo===1?1.28:-1.33;
      return whip<.53?a+(b-a)*whip/.53:b+(c-b)*(whip-.53)/.47;
    }
    const yawA=bladeYaw(previous),yawB=bladeYaw(progress),width=p.combo===3||p.jumpAttack?.66:.5;
    for(const e of coneTargets(s,p,{x:p.attackDirX,z:p.attackDirZ},spec.range)){
      if(p.attackHits.includes(e.id))continue;const dx=e.x-p.x,dz=e.z-p.z,yaw=Math.atan2(p.attackDirZ*dx-p.attackDirX*dz,p.attackDirX*dx+p.attackDirZ*dz);
      if(yaw<Math.min(yawA,yawB)-width||yaw>Math.max(yawA,yawB)+width)continue;
      const dir=direction(dx,dz,{x:p.attackDirX,z:p.attackDirZ}),profile=SHOT_VOLUMES[e.bossKind||e.type]||[.9,.7,e.radius];
      const bodyY=e.y+profile[0],y=clamp(p.y+(p.jumpAttack?1.05:1.35),bodyY-profile[1]*.8,bodyY+profile[1]*.8);
      const surfaceRadius=profile[2]*Math.sqrt(Math.max(.2,1-Math.pow((y-bodyY)/profile[1],2)));
      const contactPoint={x:e.x-dir.x*surfaceRadius,y,z:e.z-dir.z*surfaceRadius};
      p.attackHits.push(e.id);damageEnemy(s,e,Math.round(spec.damage*(p.attackCounter?1.4:p.jumpAttack?1.25:1)),{...p.attackContext,dirX:dir.x,dirZ:dir.z,contactPoint});
    }
  }
  function beginBow(s){const p=s.player;if(p.weaponMode!=='bow'||!spendStamina(p,15,.45))return false;cancelGuard(s);p.bowCharging=true;p.bowElapsed=0;p.bowCharge=0;p.bowRelease=null;emit(s,'bowDraw',p,{dirX:p.aimDirX,dirZ:p.aimDirZ,duration:.6});return true;}
  function castBolt(s,charge=0){
    if(s.player.weaponMode!=='bow'){cancelBow(s);return;}
    const p=s.player,dir={x:p.aimDirX,z:p.aimDirZ},freeAim=!!p.aimPoint,from={x:p.x,y:p.y+(freeAim?1.45:.9),z:p.z},charged=charge>=.98,damage=Math.round(16+32*charge),ctx=context(s,'bolt',{dirX:dir.x,dirZ:dir.z,hitStopClass:'none',explicitStatusPayload:{id:'moonMark',ttl:4}});
    const candidates=freeAim?[]:nearby(s,from,14).map(e=>{const v=direction(e.x-p.x,e.z-p.z,dir);return{e,alignment:v.x*dir.x+v.z*dir.z};}).filter(candidate=>candidate.alignment>=.985);
    candidates.sort((a,b)=>b.alignment-a.alignment||groundDist(a.e,p)-groundDist(b.e,p));
    const target=freeAim?s.enemies.find(e=>e.id===p.aimTargetId&&activeEnemy(e)):candidates[0]?.e;
    // A screen-space aim point is a destination, not permission to spawn beyond cover.
    // Free aim never falls back to the old horizontal auto-target cone.
    const to=freeAim&&dist(from,p.aimPoint)>.2?point(p.aimPoint):target?projectileTargetPoint(target):{x:from.x+dir.x*14,y:from.y,z:from.z+dir.z*14};
    cancelBow(s);p.castTimer=.24;p.castKind='bolt';p.castFacing=p.facing;p.castContext=ctx;s.skillCooldowns.bolt=charged?.4:.32;p.staminaDelay=Math.max(p.staminaDelay,.45);
    emit(s,'bolt',p,{value:damage,damage,charge,charged,dirX:dir.x,dirZ:dir.z,elevation:Math.atan2(to.y-from.y,Math.max(.001,groundDist(from,to))),direction:p.facing,skill:'bolt',targetId:target?.id},ctx);
    projectile(s,'bowArrow',from,to,24+charge*8,damage,ctx,{remainingHits:charged?2:1,canRicochet:true,charge,life:.7,legRemaining:14});
    if(has(s,'starSplit'))for(const side of [-1,1]){const dx=to.x-from.x,dz=to.z-from.z,angle=side*.22,sideTo={x:from.x+dx*Math.cos(angle)-dz*Math.sin(angle),y:to.y,z:from.z+dx*Math.sin(angle)+dz*Math.cos(angle)};projectile(s,'bowArrow',from,sideTo,24+charge*8,Math.round(damage*.55),secondary(ctx,'starSplit-'+side),{remainingHits:1,canRicochet:false,charge,life:.7,legRemaining:14});}
  }
  function castNova(s){
    const p=s.player,dir={x:p.aimDirX,z:p.aimDirZ},from=centre(p),wanted={x:from.x+dir.x*6,y:from.y,z:from.z+dir.z*6},wall=wallContact(s,from,wanted,.18),range=wall?Math.max(.05,6*wall.t-.08):6,to={x:from.x+dir.x*range,y:from.y,z:from.z+dir.z*range},returning=has(s,'returnCrescent'),ctx=context(s,'nova',{dirX:dir.x,dirZ:dir.z,staggerClass:'heavy',hitStopClass:'none'});
    cancelBow(s);p.castTimer=.15;p.castKind='nova';p.castFacing=p.facing;p.castContext=ctx;s.skillCooldowns.nova=3.8;
    const shot=projectile(s,returning?'returnCrescent':'windCut',from,to,16,28,ctx,{radius:.18,hitRadius:returning?.9:.6,legRemaining:range,returnRange:range,returnDamage:18,life:1});
    emit(s,'windCut',from,{from,to,projectileId:shot.id,dirX:dir.x,dirZ:dir.z,range,width:returning?1.8:1.2,duration:range/16,returning,damage:28},ctx);
    if(has(s,'gravityNova'))s.areaEffects.push({id:'area-'+(++s.areaSerial),kind:'windWhirl',x:to.x,y:supportHeight(s,to.x,to.z,to.y),z:to.z,radius:2.4,phase:'travel',dueAt:s.time+range/16,duration:.24,ctx:secondary(ctx,'gravityNova',{staggerClass:'heavy',explicitStatusPayload:{id:'offBalance',ttl:1.5}}),pulls:[]});
  }
  // Pick the enemy the player most plausibly means: in front of the camera first, then nearest.
  function magicTarget(s,range){
    const p=s.player,dir={x:p.aimDirX,z:p.aimDirZ},aimed=s.enemies.find(e=>e.id===p.aimTargetId&&activeEnemy(e)&&groundDist(e,p)<=range);if(aimed)return aimed;
    return nearby(s,centre(p),range).map(e=>{const v=direction(e.x-p.x,e.z-p.z,dir),align=v.x*dir.x+v.z*dir.z;return{e,score:groundDist(e,p)*(align>.55?1:2.6)};}).sort((a,b)=>a.score-b.score)[0]?.e||null;
  }
  function castMagic(s){
    const p=s.player,target=magicTarget(s,18),from={x:p.x+p.aimDirX*.5,y:p.y+1.35,z:p.z+p.aimDirZ*.5},to=target?projectileTargetPoint(target):p.aimPoint&&dist(from,p.aimPoint)>.5?point(p.aimPoint):{x:from.x+p.aimDirX*16,y:from.y,z:from.z+p.aimDirZ*16};
    const dir=direction(to.x-p.x,to.z-p.z,{x:p.aimDirX,z:p.aimDirZ}),damage=Math.round(12*(1+.12*s.wilds.upgradeWeapon)),ctx=context(s,'bolt',{dirX:dir.x,dirZ:dir.z,hitStopClass:'none',explicitStatusPayload:{id:'moonMark',ttl:4}});
    p.aimDirX=dir.x;p.aimDirZ=dir.z;p.castTimer=.16;p.castKind='magic';p.castFacing=p.facing;p.castContext=ctx;s.skillCooldowns.magic=.55;
    emit(s,'magicCast',from,{dirX:dir.x,dirZ:dir.z,targetId:target?.id,skill:'magic'},ctx);
    projectile(s,'bowArrow',from,to,19,damage,ctx,{magic:true,homingId:target?.id,remainingHits:1,canRicochet:true,life:1.4,radius:.22});return true;
  }
  function castStarfall(s){
    const p=s.player,target=magicTarget(s,15),at=target?point(target):{x:p.x+p.aimDirX*5,y:p.y,z:p.z+p.aimDirZ*5},y=supportHeight(s,at.x,at.z,at.y+1),ctx=context(s,'nova',{staggerClass:'heavy',hitStopClass:'none',explicitStatusPayload:{id:'offBalance',ttl:1.5}});
    p.castTimer=.34;p.castKind='nova';p.castFacing=p.facing;p.castContext=ctx;s.skillCooldowns.starfall=8;
    s.areaEffects.push({id:'area-'+(++s.areaSerial),kind:'starfall',x:at.x,y,z:at.z,radius:3.6,dueAt:s.time+.8,ctx});
    emit(s,'starfallCast',{x:at.x,y,z:at.z},{radius:3.6,duration:.8,skill:'starfall',from:centre(p)},ctx);return true;
  }
  function autoAssist(s,move){
    const p=s.player;
    // Low health: drink once, then wait before considering another flask.
    if(p.hp<=p.maxHp*.4&&p.potions>0&&s.time>=s.autoHealAt&&p.hurtTimer<=EPS&&beginDrink(s)){s.autoHealAt=s.time+3;emit(s,'autoAssist',p,{kind:'heal'});}
    // The cat joins fights on its own.
    if(s.catCooldown<=EPS&&actionReady(p)&&s.enemies.some(e=>activeEnemy(e)&&e.aggro&&groundDist(e,p)<7.5)){const keep={x:p.aimDirX,z:p.aimDirZ},t=magicTarget(s,7.5);if(t){const v=direction(t.x-p.x,t.z-p.z);p.aimDirX=v.x;p.aimDirZ=v.z;if(castCat(s,true))s.catCooldown=5.5;else{p.aimDirX=keep.x;p.aimDirZ=keep.z;}}}
    // Walking into a low walkable ledge hops onto it.
    if(p.grounded&&move.length>.05&&p.jumpBuffer<=0&&actionReady(p)){const qx=p.x+move.x*.7,qz=p.z+move.z*.7;for(const o of s.obstacles){if(!o.walkable||Math.abs(qx-o.x)>o.w/2||Math.abs(qz-o.z)>o.d/2)continue;const rise=finite(o.y)+o.height-p.y;if(rise>.2&&rise<1.4){p.jumpBuffer=.16;break;}}}
  }
  function castCat(s,auto=false){
    const p=s.player,dir={x:p.aimDirX,z:p.aimDirZ},cat=s.catMotion,targets=nearby(s,centre(p),8).map(e=>{const v=direction(e.x-p.x,e.z-p.z,dir);return{e,alignment:v.x*dir.x+v.z*dir.z,marked:statusActive(s,e,'moonMark')||statusActive(s,e,'offBalance')};}).filter(item=>item.alignment>=.5&&visible(s,{...cat.position,y:cat.position.y+.9},centre(item.e)));
    targets.sort((a,b)=>Number(b.e.id===p.aimTargetId)-Number(a.e.id===p.aimTargetId)||Number(b.marked)-Number(a.marked)||b.alignment-a.alignment||groundDist(a.e,p)-groundDist(b.e,p));const target=targets[0]?.e;if(!target||!auto&&!spendStamina(p,12,.45))return false;
    const ctx=context(s,'cat',{dirX:dir.x,dirZ:dir.z,hitStopClass:'none'}),duration=clamp(groundDist(cat.position,target)/26,.16,.3);
    cancelBow(s);cancelGuard(s);s.catCooldown=4.5;if(!auto){p.castTimer=.12;p.castKind='cat';}p.castFacing=p.facing;p.castContext=ctx;
    emit(s,'cat',p,{value:34,damage:34,range:8,skill:'cat',targetId:target.id,from:point(cat.position),to:catPoint(target)},ctx);
    schedule(s,'catStart',ctx,{targetId:target.id,damage:34,bounces:has(s,'catHunt')?2:0,visited:[],duration});return true;
  }
  function areasStep(s,dt){
    for(const a of s.areaEffects){
      if(a.resolved)continue;
      if(a.kind==='starfall'){if(s.time+EPS<a.dueAt)continue;a.resolved=true;const hits=nearby(s,{x:a.x,y:a.y+.9,z:a.z},a.radius);emit(s,'starfall',a,{radius:a.radius,value:42,damage:42,skill:'starfall',hits:hits.length},a.ctx);for(const e of hits){const dir=direction(e.x-a.x,e.z-a.z);damageEnemy(s,e,Math.round(42*(1+.12*s.wilds.upgradeWeapon)),{...a.ctx,dirX:dir.x,dirZ:dir.z,contactPoint:centre(e)});}continue;}
      if(a.kind!=='windWhirl')continue;
      if(a.phase==='travel'){
        if(s.time+EPS<a.dueAt)continue;a.phase='pull';a.createdAt=s.time;a.dueAt=s.time+a.duration;
        for(const e of nearby(s,{x:a.x,y:a.y+.9,z:a.z},a.radius)){const dir=direction(e.x-a.x,e.z-a.z),pull=e.type==='boss'?0:Math.min(1.5,Math.max(0,groundDist(e,a)-.7));a.pulls.push({targetId:e.id,from:point(e),to:{x:e.x-dir.x*pull,y:e.y,z:e.z-dir.z*pull}});if(pull>0)e.pulledUntil=a.dueAt;}
        emit(s,'novaPull',a,{radius:a.radius,range:a.radius,duration:a.duration,targets:a.pulls.map(t=>({...t}))},a.ctx);
      }
      for(const pull of a.pulls){const e=s.enemies.find(n=>n.id===pull.targetId&&activeEnemy(n));if(!e||e.type==='boss')continue;const t=clamp((s.time-a.createdAt)/a.duration,0,1),x=pull.from.x+(pull.to.x-pull.from.x)*t,z=pull.from.z+(pull.to.z-pull.from.z)*t;moveDisc(s,e,x-e.x,z-e.z,false,e.type==='bat'?'bat':e.type==='swimmer'?'swimmer':'ground');}
      if(s.time+EPS<a.dueAt)continue;a.resolved=true;
      emit(s,'windWhirl',a,{radius:a.radius,range:a.radius,value:16,damage:16,duration:.2,skill:'nova'},a.ctx);
      for(const e of nearby(s,{x:a.x,y:a.y+.9,z:a.z},a.radius))damageEnemy(s,e,16,a.ctx);
    }
    s.areaEffects=s.areaEffects.filter(a=>!a.resolved);
  }
  function actionReady(p){return!p.dash.active&&p.guardBreakTimer<=EPS&&p.hurtTimer<=EPS&&p.castTimer<=EPS&&p.healTimer<=EPS&&p.attackPhase==='idle';}
  function chooseAction(s,input){
    const p=s.player;if(!actionReady(p))return false;
    if(input.cat&&s.catCooldown<=EPS&&castCat(s)){cancelAttack(p);return true;}
    if(p.weaponMode==='bow'&&input.bolt&&s.skillCooldowns.bolt<=EPS){if(p.bowRelease){castBolt(s,p.bowRelease.charge);return true;}else if(input.boltHeld)return beginBow(s);return false;}
    if(p.weaponMode==='sword'&&!p.bowCharging&&!p.bowRelease&&(input.attack||p.attackBuffer>0)&&p.attackPhase==='idle')return beginMelee(s);return false;
  }
  const ACTION_PRIORITY={nova:3,cat:2,bolt:1};
  function actionCooldown(s,key){return key==='cat'?s.catCooldown:s.skillCooldowns[key]||0;}
  function bufferSkill(s,key){
    const p=s.player,queued=p.actionBuffer;
    // A new press may replace an older, lower-priority request; holding a key
    // never extends this deadline or repeatedly inserts another request.
    if(actionCooldown(s,key)>.22)return;
    if(!queued||queued.expiresAt<=s.time||ACTION_PRIORITY[key]>=ACTION_PRIORITY[queued.key])p.actionBuffer={key,expiresAt:s.time+.22};
  }
  function processActions(s,input){
    const p=s.player;if(p.actionBuffer&&p.actionBuffer.expiresAt<=s.time)p.actionBuffer=null;
    if(p.bowRelease&&p.bowRelease.expiresAt<=s.time)cancelBow(s);
    if(p.actionBuffer?.key==='bolt'&&!input.boltHeld&&!p.bowRelease)p.actionBuffer=null;
    if(!actionReady(p))return;
    const queued=p.actionBuffer,live=['cat','bolt'].find(key=>(input[key]||(key==='bolt'&&p.bowRelease))&&actionCooldown(s,key)<=EPS),readyQueued=queued&&actionCooldown(s,queued.key)<=EPS;
    const key=readyQueued&&(!live||ACTION_PRIORITY[queued.key]>ACTION_PRIORITY[live])?queued.key:live;
    if(key){if(chooseAction(s,{[key]:true,boltHeld:input.boltHeld})&&p.actionBuffer?.key===key)p.actionBuffer=null;}
    else chooseAction(s,input);
  }

  let enemyAI=null;
  function enemiesStep(s,dt){
    if(!enemyAI){
      const provider=globalThis.HatEnemyAI;
      if(!provider?.create)throw new Error('HatEnemyAI must load before combat starts.');
      enemyAI=provider.create({EPS,TAU,clamp,finite,point,direction,groundDist,groundHeight,supportHeight,centre,visible,canOccupy,moveDisc,activeEnemy,context,emit,projectile,hurtPlayer,clearEnemyStrike});
    }
    enemyAI.step(s,dt);
  }
  function openChest(s,chest){
    const p=s.player;if(!chestAvailable(s,chest))return;
    const choices=chest.kind==='boon'?getChoices(s):[];if(chest.kind==='boon'&&!choices.length)return;
    const duration=chest.kind==='supply'?.6:.9;s.pendingChest=chest.id;s.upgradeChoices=choices;s.phase='treasure';s.hitStop=0;
    s.treasure={chestId:chest.id,kind:chest.kind,...point(chest),elapsed:0,progress:0,duration,revealed:false};chest.revealing=true;
    p.vx=0;p.vy=0;p.vz=0;cancelAttack(p);cancelBow(s);cancelGuard(s);clearBufferedInputs(s);p.castTimer=0;p.castKind=null;p.castContext=null;
    emit(s,'treasureOpen',chest,{chestId:chest.id,targetId:chest.id,kind:chest.kind,duration});
  }
  function advanceTreasure(s,dt){
    if(!s||s.phase!=='treasure')return s;s.events=[];
    if(!Number.isFinite(dt)||dt<=0)return s;
    const reveal=s.treasure,chest=s.chests.find(c=>c.id===reveal?.chestId);if(!reveal||!chest)return s;
    // Reveal time is separate from simulation time: projectiles, cat flights,
    // cooldowns, statuses and encounter warnings remain exactly where they were.
    reveal.elapsed=Math.min(reveal.duration,reveal.elapsed+Math.min(dt,.1));reveal.progress=reveal.elapsed/reveal.duration;
    if(!reveal.revealed&&reveal.elapsed>=.22){reveal.revealed=true;emit(s,'treasureReveal',chest,{chestId:chest.id,targetId:chest.id,kind:chest.kind,duration:reveal.duration});}
    if(reveal.elapsed+EPS<reveal.duration)return s;
    if(chest.kind==='boon'){s.phase='upgrade';emit(s,'upgradeReady',chest,{targetId:chest.id,chestId:chest.id});return s;}
    const p=s.player;chest.opened=true;chest.revealing=false;s.coins+=12;p.potions=Math.min(3,p.potions+1);const healed=Math.min(30,p.maxHp-p.hp);p.hp+=healed;
    s.phase='play';s.pendingChest=null;s.treasure=null;s.upgradeChoices=[];
    emit(s,'chest',chest,{value:12,targetId:chest.id,kind:'supply',revealed:true});if(healed)emit(s,'heal',p,{value:healed,targetId:'player'});return s;
  }
  function timers(s,dt){
    const p=s.player,d=p.dash;s.comboTimeout=Math.max(0,s.comboTimeout-dt);if(s.comboTimeout<=EPS)s.comboHits=0;
    for(const key of ['comboWindow','hurtTimer','castTimer','attackBuffer','jumpBuffer','dashBuffer','staminaDelay','landTimer','guardRaiseTimer','guardImpactTimer','guardBreakTimer'])p[key]=Math.max(0,p[key]-dt);
    if(p.counterUntil<=s.time){p.counterUntil=0;p.counterTargetId=null;}
    if(p.castTimer<=0){p.castKind=null;p.castContext=null;}if(p.comboWindow<=0&&p.attackPhase==='idle')p.combo=0;
    for(const id of ['bolt','nova','magic','starfall'])s.skillCooldowns[id]=Math.max(0,s.skillCooldowns[id]-dt);s.catCooldown=Math.max(0,s.catCooldown-dt);
    if(d.charges<2){d.rechargeRemaining-=dt;if(d.rechargeRemaining<=EPS){d.charges++;d.rechargeRemaining=d.charges<2?d.rechargeRemaining+ROLL.recharge:0;}}
    p.dodgeTimer=0;p.dodgeCooldown=Math.max(0,d.nextAllowedAt-s.time);p.invulnerable=Math.max(0,p.iFrames.hurtUntil-s.time,p.iFrames.dashUntil-s.time);
    if(p.mirror&&p.mirror.expiresAt<=s.time)p.mirror=null;
    if(p.catGuardUntil<=s.time)p.catGuardCharges=0;
    if(p.orbitStars.count&&p.orbitStars.expiresAt<=s.time){p.orbitStars.count=0;emit(s,'orbitStars',p,{count:0,ttl:0});}
    for(const e of s.enemies)for(const id of Object.keys(e.statuses))if(e.statuses[id].expiresAt<=s.time){delete e.statuses[id];emit(s,'statusExpire',centre(e),{targetId:e.id,statusId:id});}
    if(s.time>=s.cleanupAt){s.cleanupAt=s.time+2;for(const key of Object.keys(s.hitKeys))if(s.hitKeys[key]<s.time-8)delete s.hitKeys[key];for(const key of Object.keys(s.hitStopActions))if(s.hitStopActions[key]<s.time-8)delete s.hitStopActions[key];for(const key of Object.keys(s.reactionCounts))if(s.reactionCounts[key].time<s.time-8)delete s.reactionCounts[key];}
  }
  function spendStamina(p,amount,delay=.5){if(p.stamina+EPS<amount)return false;p.stamina=Math.max(0,p.stamina-amount);p.staminaDelay=Math.max(p.staminaDelay,delay);return true;}
  function supportHeight(s,x,z,maxFeet=Infinity,radius=.45){
    let support=groundHeight(x,z);for(const o of s.obstacles)if(o.walkable&&obstacleTop(o)<=maxFeet+.025&&circleRect(x,z,radius,o))support=Math.max(support,obstacleTop(o));return support;
  }
  function sameInteractionSurface(p,q,tolerance=.35){
    const playerOnTerrain=Math.abs(p.y-groundHeight(p.x,p.z))<.15,targetOnTerrain=Math.abs(finite(q.y)-groundHeight(q.x,q.z))<.15;
    return playerOnTerrain&&targetOnTerrain||!playerOnTerrain&&!targetOnTerrain&&Math.abs(p.y-finite(q.y))<tolerance;
  }
  function interactionReady(p){return actionReady(p)&&!p.bowCharging&&!p.bowRelease&&p.grounded;}
  function chestAvailable(s,c){
    const p=s.player;return !c.opened&&!c.revealing&&p.grounded&&groundDist(c,p)<=1.8&&sameInteractionSurface(p,c,.32)&&
      !s.enemies.some(e=>activeEnemy(e)&&e.type!=='boss'&&(groundDist(e,c)<=7.5||e.aggro&&groundDist(e,p)<10));
  }
  function refreshInteraction(s){
    const p=s.player,a=wildsData(),near=(q,r=2)=>groundDist(p,q)<=r&&sameInteractionSurface(p,q);
    s.interaction=null;if(!p.grounded||p.hp<=0||s.phase==='won')return;
    if(near(s.camp,2.5)){s.interaction={kind:'camp',label:'休息 · 恢复与强化'};return;}
    const drop=s.wilds.deathDrop;if(drop&&near(drop,1.8)){s.interaction={kind:'recover',label:'取回 '+drop.coins+' 余烬'};return;}
    const chest=s.chests.find(c=>chestAvailable(s,c));if(chest){s.interaction={kind:'chest',id:chest.id,label:'开启'+chest.name};return;}
    if(a.portal&&near(a.portal,2.6)){s.interaction={kind:'portal',label:'穿过月光之门 · 前往暮丘遗迹'};return;}
    if(a.shortcut&&!s.wilds.shortcutOpen&&near(a.shortcut.lever,2)){s.interaction={kind:'shortcut',label:'拉动机关 · 开启近路'};return;}
    if(a.bossGate&&!s.wilds.bossEntered&&!s.wilds.bossDefeated&&p.z>-12.9&&near(a.bossGate,2.3)){s.interaction={kind:'bossGate',label:'穿过雾门 · 挑战守誓者'};return;}
    if(a.exit&&s.wilds.bossDefeated&&!s.wilds.finalEntered&&near(a.exit,2)){s.interaction=s.wilds.finalDefeated?{kind:'exit',label:'吹灭生日蜡烛'}:{kind:'final',label:'触碰余晖祭坛'};return;}
  }
  function enterBoss(s){
    const a=wildsData(),p=s.player;clearTransient(s);Object.assign(p,point(a.bossGate.spawn));p.groundY=p.y;p.grounded=true;p.vx=p.vy=p.vz=0;p.previousPosition=point(p);p.iFrames.hurtUntil=s.time+.7;
    s.catMotion=makeCatMotion(p,s);s.wilds.bossEntered=true;s.bossActive=true;s.arena.active=true;s.arena.enemyIds=['boss'];s.interaction=null;
    // Outside patrols return home, so nothing can trail through the sealed gate.
    for(const e of s.enemies)if(e.type!=='boss'&&!e.dead){Object.assign(e,point(e.spawnAnchor));e.groundY=groundHeight(e.x,e.z);e.baseY=e.groundY+finite(e.hoverHeight);e.y=e.baseY;e.hp=e.maxHp;e.state='idle';e.aggro=false;e.returning=false;e.comboActive=false;e.comboMoves=null;clearEnemyStrike(e);e.path=[];e.statuses={};e.hitStun=0;e.timer=0;e.cooldown=1;}
    const boss=s.enemies.find(e=>e.type==='boss');boss.state='idle';boss.aggro=true;boss.cooldown=1.4;s.wildsRevision++;
    emit(s,'bossAwake',boss,{targetId:boss.id,name:boss.bossName});
  }
  // Birthday finale: the altar wakes one last, much gentler boss in the same sealed arena.
  function enterFinal(s){
    const a=wildsData(),p=s.player;clearTransient(s);Object.assign(p,point(a.bossGate.spawn));p.groundY=p.y;p.grounded=true;p.vx=p.vy=p.vz=0;p.previousPosition=point(p);p.iFrames.hurtUntil=s.time+1.2;
    s.catMotion=makeCatMotion(p,s);s.wilds.finalEntered=true;s.bossActive=true;s.arena.active=true;s.arena.cleared=false;s.arena.enemyIds=['sweetheart'];s.interaction=null;refreshWildsObstacles(s);
    for(const e of s.enemies)if(e.type!=='boss'&&!e.dead){Object.assign(e,point(e.spawnAnchor));e.groundY=groundHeight(e.x,e.z);e.baseY=e.groundY+finite(e.hoverHeight);e.y=e.baseY;e.hp=e.maxHp;e.state='idle';e.aggro=false;e.returning=false;e.comboActive=false;e.comboMoves=null;clearEnemyStrike(e);e.path=[];e.statuses={};e.hitStun=0;e.timer=0;e.cooldown=1;}
    const boss=s.enemies.find(e=>e.bossKind==='sweetheart');Object.assign(boss,point(boss.spawnAnchor));boss.hp=boss.maxHp;boss.phase2=false;boss.state='spawning';boss.spawnTimed=true;boss.spawnRemaining=boss.spawnDuration=1.35;boss.aggro=true;boss.cooldown=1.1;s.wildsRevision++;
    emit(s,'bossAwake',boss,{targetId:boss.id,name:boss.bossName,bossKind:'sweetheart'});
  }
  function explorationStep(s,input){
    refreshInteraction(s);const p=s.player,i=s.interaction,key=i?i.kind+':'+(i.id||''):null;
    if(!i){if(p.grounded&&p.hp>0)s.autoLatch=null;return;}
    const auto=key!==s.autoLatch&&!(i.kind==='camp'&&s.autoLatch==='camp');
    if(!(input.interact||auto)||!interactionReady(p))return;s.autoLatch=i.kind==='camp'?'camp':key;
    if(i.kind==='camp'){rest(s);return;}
    if(i.kind==='chest'){openChest(s,s.chests.find(c=>c.id===i.id));return;}
    if(i.kind==='recover'){const drop=s.wilds.deathDrop;s.coins+=drop.coins;emit(s,'emberRecovered',drop,{value:drop.coins});s.wilds.deathDrop=null;}
    if(i.kind==='shortcut'){s.wilds.shortcutOpen=true;refreshWildsObstacles(s);s.wildsRevision++;emit(s,'shortcutOpen',wildsData().shortcut.lever);}
    if(i.kind==='bossGate'){enterBoss(s);return;}
    if(i.kind==='final'){enterFinal(s);return;}
    // The game shell loads the next area; the engine only stops and announces it.
    if(i.kind==='portal'){s.phase='travel';p.vx=p.vz=0;s.hitStop=0;clearTransient(s);emit(s,'portal',p,{to:wildsData().portal.to});return;}
    if(i.kind==='exit'){s.phase='won';p.vx=p.vz=0;s.hitStop=0;clearTransient(s);emit(s,'win',p,{value:0});}
    refreshInteraction(s);
  }
  function beginDrink(s){
    const p=s.player;if(!interactionReady(p)||p.potions<=0||p.hp>=p.maxHp)return false;
    cancelGuard(s);p.potions--;p.healTimer=p.healDuration;p.staminaDelay=Math.max(p.staminaDelay,.5);p.sprinting=false;p.attackBuffer=0;
    emit(s,'drinkStart',p,{duration:p.healDuration,targetId:'player'});return true;
  }
  function verticalStep(s,p,before,dt){
    const floor=supportHeight(s,p.x,p.z,Math.max(before.y,p.y),p.radius);p.groundY=floor;
    if(p.y<=floor+.025&&(p.vy<=0||p.y<floor-EPS)){const landed=!p.grounded;p.y=floor;p.vy=0;p.grounded=true;if(landed){p.landTimer=.18;emit(s,'land',p,{targetId:'player',jumpAttack:!!p.jumpAttack});}}
    else p.grounded=false;
    if(p.grounded&&p.attackPhase==='idle')p.jumpAttack=false;
  }
  function captureInput(s,input){
    const pressed={},released=!input.bolt&&!!s.inputLatch.bolt;
    for(const key of ['dash','jump','heal','interact','attack','cat','bolt','guard','switchWeapon','magic','starfall']){
      const down=key==='dash'?!!(input.dash||input.dodge):!!input[key];pressed[key]=down&&!s.inputLatch[key];s.inputLatch[key]=down;
    }
    if(!input.guard)cancelGuard(s);
    return{pressed,boltReleased:released};
  }
  function switchWeapon(s,pressed){
    const p=s.player;
    if(pressed){
      cancelGuard(s);cancelBow(s);p.attackBuffer=0;
      if(p.weaponSwitchUntil>s.time){p.weaponSwitchUntil=0;emit(s,'weaponSwapCancel',p,{reason:'cancelled'});return false;}
      p.weaponSwitchUntil=s.time+1.25;
      if(!actionReady(p))emit(s,'weaponSwapQueued',p,{duration:1.25});
    }
    if(!p.weaponSwitchUntil)return false;
    if(p.weaponSwitchUntil<s.time){p.weaponSwitchUntil=0;emit(s,'weaponSwapCancel',p,{reason:'busy'});return false;}
    if(!actionReady(p))return false;
    cancelGuard(s);cancelBow(s);p.attackBuffer=0;p.weaponSwitchUntil=0;p.counterUntil=0;p.counterTargetId=null;p.combo=0;p.comboWindow=0;
    p.weaponMode=p.weaponMode==='sword'?'bow':'sword';emit(s,'weaponSwap',p,{mode:p.weaponMode,weaponMode:p.weaponMode,targetId:'player'});return true;
  }
  function guardStep(s,input,raised,dt){
    const p=s.player,allowed=input.guard&&p.weaponMode==='sword'&&p.grounded&&actionReady(p)&&!p.bowCharging&&!p.bowRelease&&!input.sprint&&p.stamina>EPS;
    if(!allowed){cancelGuard(s);return;}
    p.guardDirX=p.aimDirX;p.guardDirZ=p.aimDirZ;p.sprinting=false;
    if(!p.guardActive){
      p.guardActive=true;p.guardRaiseTimer=.18;
      const perfect=raised&&s.time+EPS>=p.guardReadyAt;p.parryUntil=perfect?s.time+GUARD.perfectWindow:0;
      // Resuming a held shield after an action never grants a fresh perfect window.
      if(raised)p.guardReadyAt=Math.max(p.guardReadyAt,s.time+GUARD.rearm);
      emit(s,'guardStart',p,{targetId:'player',dirX:p.guardDirX,dirZ:p.guardDirZ,perfect,duration:.18});
    }
    p.stamina=Math.max(0,p.stamina-5*dt);p.staminaDelay=Math.max(p.staminaDelay,.25);
    if(p.stamina<=EPS)cancelGuard(s);
  }
  function step(s,input,dt){
    if(!s||s.phase!=='play')return s;s.events=[];s.impactFrozen=false;if(!Number.isFinite(dt)||dt<=0)return s;dt=Math.min(dt,1/60);input=input||{};
    const sampled=captureInput(s,input),pending=s.frozenInput;
    if(pending){for(const key of Object.keys(sampled.pressed))sampled.pressed[key]||=!!pending.pressed[key];sampled.boltReleased||=pending.boltReleased;}
    if(s.hitStop>EPS){
      s.frozenInput=sampled;s.hitStop=Math.max(0,s.hitStop-dt);s.impactFrozen=true;return s;
    }
    s.frozenInput=null;s.time+=dt;timers(s,dt);
    const pressed=sampled.pressed;let boltReleased=sampled.boltReleased;
    const swapped=switchWeapon(s,pressed.switchWeapon);
    if(swapped){
      s.player.weaponInputBlocked=!!(input.attack||input.bolt||input.guard);
      input={...input,attack:false,bolt:false,guard:false};pressed.attack=pressed.bolt=pressed.guard=false;boltReleased=false;
    }
    if(s.player.weaponInputBlocked){
      if(!swapped&&!input.attack&&!input.bolt&&!input.guard)s.player.weaponInputBlocked=false;
      input={...input,attack:false,bolt:false,guard:false};pressed.attack=pressed.bolt=pressed.guard=false;boltReleased=false;
    }
    const p=s.player,d=p.dash;let mx=Number.isFinite(input.moveX)?input.moveX:(input.right?1:0)-(input.left?1:0),mz=Number.isFinite(input.moveZ)?input.moveZ:(input.down?1:0)-(input.up?1:0),length=Math.hypot(mx,mz);if(length>1){mx/=length;mz/=length;}
    if(length>.05){const v=direction(mx,mz);p.lastMoveX=v.x;p.lastMoveZ=v.z;}
    const aim=Number.isFinite(input.aimX)&&Number.isFinite(input.aimZ)?direction(input.aimX-p.x,input.aimZ-p.z,{x:p.lastMoveX,z:p.lastMoveZ}):direction(length>.05?mx:p.lastMoveX,length>.05?mz:p.lastMoveZ);
    p.aimDirX=aim.x;p.aimDirZ=aim.z;if(Math.abs(aim.x)>.05)p.facing=aim.x<0?-1:1;
    p.aimPoint=Number.isFinite(input.aimX)&&Number.isFinite(input.aimY)&&Number.isFinite(input.aimZ)?{x:input.aimX,y:clamp(input.aimY,-4,40),z:input.aimZ}:null;
    p.aimTargetId=p.aimPoint&&typeof input.aimTargetId==='string'?input.aimTargetId:null;
    p.aimElevation=p.aimPoint?Math.atan2(p.aimPoint.y-p.y-1.45,Math.max(.05,groundDist(p.aimPoint,p))):0;
    if(pressed.attack&&p.weaponMode==='sword'&&!p.bowCharging)p.attackBuffer=.4;
    if(pressed.jump)p.jumpBuffer=.16;if(pressed.dash)p.dashBuffer=.24;
    if(pressed.heal)beginDrink(s);
    const dashStarted=p.dashBuffer>0&&startDash(s,{x:mx,z:mz});
    if(p.jumpBuffer>0&&interactionReady(p)&&spendStamina(p,16,.4)){cancelGuard(s);p.jumpBuffer=0;p.airSpeed=p.sprinting?10.2:7.6;p.grounded=false;p.vy=8.9;p.landTimer=0;emit(s,'jump',p,{targetId:'player',velocity:p.vy});}
    if(!dashStarted){
      for(const key of ['cat','bolt'])if(pressed[key]&&(key!=='bolt'||p.weaponMode==='bow')&&(!actionReady(p)||p.actionBuffer||actionCooldown(s,key)>EPS))bufferSkill(s,key);
      if(p.bowCharging&&input.bolt){p.bowElapsed=Math.min(.6,p.bowElapsed+dt);p.bowCharge=clamp((p.bowElapsed-.12)/.48,0,1);}
      if(boltReleased&&p.weaponMode==='bow'){
        // A full click inside hitstop is still a paid quick shot on resume.
        if(p.bowCharging||pressed.bolt&&actionReady(p)&&spendStamina(p,15,.45)){p.bowRelease={charge:p.bowCharging?p.bowCharge:0,expiresAt:s.time+.22};p.bowCharging=false;}
        if(p.actionBuffer?.key==='bolt')p.actionBuffer=null;
      }
    }
    processActions(s,{attack:pressed.attack,boltHeld:!!input.bolt,cat:pressed.cat,bolt:pressed.bolt});
    if(!dashStarted&&actionReady(p)){if((input.magic||pressed.magic)&&s.skillCooldowns.magic<=EPS)castMagic(s);else if(pressed.starfall&&s.skillCooldowns.starfall<=EPS)castStarfall(s);}
    autoAssist(s,{x:mx,z:mz,length});
    guardStep(s,input,pressed.guard,dt);
    meleeStep(s,dt);const before=point(p);p.previousPosition=before;
    if(!p.grounded){p.y+=p.vy*dt;p.vy-=21*dt;}
    if(!input.sprint)p.sprintExhausted=false;
    const canSprint=input.sprint&&length>.05&&p.grounded&&interactionReady(p)&&!p.guardActive&&!p.sprintExhausted;
    p.sprinting=!!canSprint&&spendStamina(p,22*dt,.4);if(canSprint&&!p.sprinting)p.sprintExhausted=true;
    if(d.active){
      const slice=Math.min(dt,d.duration-d.elapsed);d.previous=before;const blocked=moveDisc(s,p,d.dirX*(ROLL.distance/ROLL.duration)*slice,d.dirZ*(ROLL.distance/ROLL.duration)*slice,true);d.elapsed+=slice;if(blocked||d.elapsed>=d.duration-EPS)finishDash(s,blocked);
    }else{
      const attacking=p.attackPhase!=='idle',speed=p.guardBreakTimer>EPS?0:p.healTimer>0?.65:p.hurtTimer>0?1.6:p.guardActive?2.1:p.bowCharging?2.8:attacking?2.1:p.castTimer>0?2.5:p.sprinting?10.2:!p.grounded?p.airSpeed:7.6;
      const spec=attacking?ATTACKS[p.combo-1]:null,surge=attacking&&p.attackPhase!=='recovery'?spec.lunge/(spec.windup+spec.active):0;
      moveDisc(s,p,(mx*speed+p.attackDirX*surge)*dt,(mz*speed+p.attackDirZ*surge)*dt);
    }
    verticalStep(s,p,before,dt);p.vx=(p.x-before.x)/dt;p.vz=(p.z-before.z)/dt;
    if(p.staminaDelay<=EPS&&!p.sprinting&&!d.active&&!p.guardActive&&p.guardBreakTimer<=EPS&&!p.bowCharging&&p.attackPhase==='idle'&&p.castTimer<=EPS&&p.healTimer<=EPS)p.stamina=Math.min(p.maxStamina,p.stamina+31*dt);
    p.invulnerable=Math.max(0,p.iFrames.hurtUntil-s.time,p.iFrames.dashUntil-s.time);
    catMotionStep(s,dt);meleeContacts(s);areasStep(s,dt);projectilesStep(s,dt);if(s.phase!=='play')return s;reactionsStep(s);enemiesStep(s,dt);if(s.phase!=='play')return s;
    // Complete a drink only after this frame's incoming hits had their chance to interrupt it.
    if(p.healTimer>0){p.healTimer=Math.max(0,p.healTimer-dt);if(p.healTimer<=EPS){p.healTimer=0;const healed=Math.min(55,p.maxHp-p.hp);p.hp+=healed;emit(s,'heal',p,{value:healed,targetId:'player'});}}
    s.encounter.activeCount=s.enemies.filter(e=>activeEnemy(e)&&e.aggro).length;s.encounter.enemiesRemaining=s.enemies.filter(e=>!e.dead).length;
    explorationStep(s,{interact:pressed.interact});return s;
  }
  return{LEVELS,ROOMS,ROOM_EDGES,SKILLS,PERKS,ATTACKS,ROLL,GUARD,createGame,step,advanceTreasure,nextLevel,requestRoom,enterRoom,getFloorMap,chooseUpgrade,getSkillInfo,getPerkInfo,getChoices,cancelBow,cancelGuard,clearBufferedInputs,projectileTargetContact,groundHeight,supportHeight,rest,leaveRest,getCampInfo,upgradeAtCamp,respawn};
});
