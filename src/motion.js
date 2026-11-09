(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.HatMotion=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // No DOM, renderer, randomness or game-state mutation. Sample once per draw.
  // const m=HatMotion.create({heroFrames:{run:[1,2,3,4,5,6]},hero:{cols:4,rows:4}});
  // const pose=m.hero(player,simDt,{frozen:hitStop});
  // Group stays at actor.x/actor.y; sprite.position.set(pose.x,pose.y,z).
  // sprite.scale.set(pose.flipX*pose.scaleX,pose.scaleY,1); rotation.z=pose.rot.
  // texture.repeat.set(pose.repeatX,pose.repeatY); offset.set(pose.u,pose.v).
  // Default hero: 3.5m image height, sprite center 1.47m above its foot anchor.
  // Per-kind {height,width,center,nativeFacing,strideLength,frames,cols,rows} and
  // per-sample {height,width,center,rollRadius} overrides support different sprites.
  // center may be a number or (frame,actor)=>meters for individually trimmed frames.
  // rollRadius measures the painted tucked silhouette, never the full canvas.
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const number=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
  const direction=v=>v<0?-1:1;
  const nearAngle=(angle,current)=>angle+Math.round((current-angle)/TAU)*TAU;
  const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const timing=[{windup:.055,active:.07,duration:.26},{windup:.07,active:.08,duration:.31},{windup:.11,active:.10,duration:.43}];
  const defaults={
    hero:{cols:4,rows:4,height:3.5,width:3.5,center:1.47,rollRadius:.96,nativeFacing:1,strideLength:2.2,
      frames:{idle:[0],run:[1,2,3,4,5,6],ascent:[7],fall:[8],land:[8],windup:[9],active:[10],recovery:[11],heavyWindup:[12],heavyActive:[13],heavyRecovery:[11],dodge:[14,15],hurt:[8],dead:[8]}},
    enemy:{cols:4,rows:2,height:3.3,width:3.3,center:1.32,nativeFacing:-1,strideLength:1.8,bossFrameOffset:4,
      frames:{idle:[0],run:[0,1],ascent:[1],fall:[0],land:[0],windup:[2],active:[3],recovery:[0],hurt:[0],dead:[3]}},
    cat:{cols:4,rows:2,height:1.4,width:1.867,center:.512,nativeFacing:1,strideLength:1.1,
      frames:{idle:[0],run:[1,2,3,4,5,6],ascent:[2],fall:[2],land:[0],dash:[7],hurt:[0],dead:[0]}}
  };
  function create(options={}){
    const configs={},tracks=new Map(),latest={},attackTimings=options.attackTimings||timing;
    for(const kind of Object.keys(defaults)){
      const custom=options[kind]||{},base=defaults[kind];
      configs[kind]={...base,...custom,frames:{...base.frames,...(options[kind+'Frames']||{}),...(custom.frames||{})}};
      if(kind==='hero'){
        configs[kind].cols=custom.cols||options.cols||4;
        configs[kind].rows=custom.rows||options.rows||4;
      }
      configs[kind].cols=Math.max(1,Math.floor(number(configs[kind].cols,4)));
      configs[kind].rows=Math.max(1,Math.floor(number(configs[kind].rows,4)));
    }
    function frameFor(cfg,state,progress=0,offset=0,override){
      let list=override??cfg.frames[state]??cfg.frames.idle;
      if(!Array.isArray(list))list=[list];
      if(!list.length)list=[0];
      const index=Math.min(list.length-1,Math.floor(clamp(progress,0,.999999)*list.length));
      return clamp(Math.floor(number(list[index])+offset),0,cfg.cols*cfg.rows-1);
    }
    function update(kind,actor,dt=0,settings={}){
      if(!configs[kind]||!actor)return null;
      const cfg=configs[kind],id=String(actor.id??kind),key=kind+':'+id;
      let track=tracks.get(key),first=!track;
      if(!track){
        track={time:0,stride:0,lastX:number(actor.x),lastY:number(actor.y),speed:0,grounded:actor.grounded!==false,land:0,rot:0,sx:1,sy:1,offsetX:0,footLift:0,rolling:false,rollBase:0,reactionTimer:0,parryTimer:0,pose:null};
        tracks.set(key,track);
      }
      latest[kind]=id;
      dt=Math.max(0,Math.min(.1,number(dt)));
      // A contact may arrive in the same render as the first frozen step.
      // Pose that new reaction once, then hold it until simulation resumes.
      const newReaction=number(actor.hitReactionTimer)>track.reactionTimer+.000001||number(actor.parryStaggerTimer)>track.parryTimer+.000001;
      if((settings.frozen||dt===0)&&track.pose&&!newReaction)return {...track.pose};
      const elapsed=settings.frozen?0:dt;
      const height=Math.max(.01,number(settings.height,cfg.height));
      const width=Math.max(.01,number(settings.width,cfg.width));
      const x=number(actor.x),y=number(actor.y),dx=first?0:x-track.lastX;
      const teleport=Math.abs(dx)>Math.max(2,elapsed*30);
      const distance=teleport?0:Math.abs(dx);
      const velocity=first?number(actor.vx):elapsed>0&&!teleport?dx/elapsed:0;
      const acceleration=elapsed>0?(velocity-track.speed)/elapsed:0;
      const vy=number(actor.vy,elapsed>0?(y-track.lastY)/elapsed:0);
      const grounded=actor.grounded===undefined?Math.abs(vy)<.15:!!actor.grounded;
      if(!first)track.time+=elapsed;
      track.land=Math.max(0,track.land-elapsed);
      const landed=!first&&!track.grounded&&grounded;
      if(landed)track.land=.12;
      let state='idle',progress=0,dir=direction(actor.facing),offsetX=0,footLift=0,rot=0,sx=1,sy=1,rollStage=null,rollProgress=null,rollFrames;
      const attack=kind==='hero'&&actor.attackPhase&&actor.attackPhase!=='idle'&&number(actor.attackTimer)>0;
      const rolling=kind==='hero'&&number(actor.dodgeTimer)>0;
      const moving=(first?Math.abs(velocity)>.15:distance>.00001)&&grounded;
      const canRun=moving&&!attack&&!rolling&&!actor.dead&&number(actor.hurtTimer)<=0;
      if(grounded&&!attack&&!rolling)rot=-clamp(velocity/6,-1.3,1.3)*.025-clamp(acceleration/60,-1,1)*.065;
      if(canRun){
        const strideLength=Math.max(.1,number(cfg.strideLength,2.2)*height/cfg.height);
        track.stride+=distance/strideLength;
        state='run';progress=track.stride%1;
        footLift=(1-Math.cos(progress*TAU*2))*height*.0025;
      }
      if(!grounded){state=vy>.2?'ascent':'fall';sy=vy>.2?1.014:.99;rot=-dir*.022;}
      if(grounded&&!moving){sy=1+Math.sin(track.time*2.4)*.0025;}
      if(track.land>0&&!attack&&!rolling){state='land';sy=1-.045*Math.sin(track.land/.12*Math.PI);sx=1+(1-sy)*.3;}
      if(kind==='cat'&&number(actor.dash)>0){state='dash';rot=-dir*.065;sx=1.035;sy=.97;}
      if(kind==='enemy'){
        const thrust=actor.attackKind==='thrust',crush=['slam','slimeSlam'].includes(actor.attackKind),reverse=number(actor.comboIndex)%2?-1:1;
        if(actor.state==='windup'){
          state='windup';progress=1-clamp(number(actor.timer)/number(actor.windupDuration,.75),0,1);
          const pull=ease(progress);rot=dir*(thrust?.10:crush?.075:.13*reverse)*pull;offsetX=-dir*height*(thrust?.05:.018)*pull;
          if(actor.type==='slime'){sx=1+.15*pull;sy=1-.18*pull;}else if(crush){sy=1-.045*pull;offsetX=-dir*height*.025*pull;}
        }else if(number(actor.attackTimer)>0){
          state='active';progress=1-clamp(number(actor.attackTimer)/.24,0,1);const strike=1-ease(progress);rot=-dir*(thrust?.09:crush?.13:.15*reverse)*strike;offsetX=dir*height*(thrust?.07:.035)*strike;
          if(actor.type==='slime'){sx=1+.18*strike;sy=1-.16*strike;}
        }else if(['recover','comboGap'].includes(actor.state)){
          state='recovery';progress=1-clamp(number(actor.timer)/Math.max(.01,number(actor.state==='comboGap'?actor.comboGapDuration:actor.recoveryDuration,.8)),0,1);rot=-dir*.04*(1-progress);sy=1-.018*(1-progress);
        }else if(['dive','swoop','hop'].includes(actor.state)){state='active';rot=-dir*(actor.type==='bat'?.2:.08);sx=1.06;sy=.94;}
        if(!['chase','windup','recover','comboGap','dive','swoop','hop'].includes(actor.state)&&!number(actor.attackTimer))state='idle';
        if(number(actor.hitReactionTimer)>0||number(actor.parryStaggerTimer)>0){
          state='hurt';const life=clamp(number(actor.hitReactionTimer)/Math.max(.01,number(actor.hitReactionDuration,.24)),0,1),kick=life*life*clamp(number(actor.hitReactionStrength,.5),0,1.3);
          const stagger=clamp(number(actor.parryStaggerTimer)/(actor.type==='boss'?.5:.65),0,1),held=ease(Math.min(1,stagger*2));
          const screenX=clamp(number(settings.hitScreenX,-dir),-1,1),depth=Math.abs(clamp(number(settings.hitDepth),-1,1));
          // Rotate about the existing painted foot baseline. Recoil follows
          // the incoming world vector projected by actors, not enemy facing.
          rot=-screenX*(.24*kick+.16*held);offsetX=screenX*height*(.022*kick+.012*held);
          sx=1+.025*kick;sy=1-(.045+.035*depth)*kick-.075*held;
        }else if(number(actor.hitStun)>0&&number(actor.hitFlash)>0){state='hurt';const reaction=clamp(actor.hitFlash/.18,0,1);rot=dir*reaction*.065;sx=1+reaction*.02;sy=1-reaction*.025;}
      }
      if(attack){
        dir=direction(actor.attackFacing??actor.facing);
        const combo=clamp(Math.floor(number(actor.combo,1)),1,3),spec=attackTimings[combo-1],heavy=combo===3;
        const attackElapsed=number(actor.attackElapsed);
        const phase=actor.attackPhase;
        state=(heavy?'heavy':'')+(heavy?phase[0].toUpperCase()+phase.slice(1):phase);
        if(!cfg.frames[state])state=phase;
        if(phase==='windup'){
          progress=clamp(attackElapsed/spec.windup,0,1);rot=dir*(heavy?.065:.035)*ease(progress);offsetX=-dir*height*.018*ease(progress);
        }else if(phase==='active'){
          progress=clamp((attackElapsed-spec.windup)/spec.active,0,1);rot=-dir*(heavy?.075:.045)*(1-progress*.35);offsetX=dir*height*(heavy?.065:.035);sx=heavy?1.025:1.015;sy=heavy?.975:.99;
        }else{
          progress=clamp((attackElapsed-spec.windup-spec.active)/(spec.duration-spec.windup-spec.active),0,1);rot=-dir*.025*(1-ease(progress));offsetX=dir*height*.018*(1-ease(progress));
        }
      }
      if(number(actor.hurtTimer)>0&&!rolling){state='hurt';rot=dir*.09*clamp(actor.hurtTimer/.24,0,1);offsetX=-dir*height*.012;}
      if(rolling){
        dir=direction(actor.dodgeDirection??actor.facing);
        if(!track.rolling)track.rollBase=nearAngle(0,track.rot);
        progress=clamp(1-number(actor.dodgeTimer)/number(actor.dodgeDuration,.32),0,1);
        rollProgress=progress;
        rollStage=progress+1e-8<.12?'entry':progress<.88-1e-8?'tuck':'exit';
        const turn=rollStage==='entry'?0:rollStage==='exit'?1:ease((progress-.12)/.76);
        state='dodge';rot=track.rollBase-dir*TAU*turn;sy=.98;sx=.98;
        if(rollStage==='exit'){const rise=ease((progress-.88)/.12);sy+=rise*.02;sx+=rise*.02;}
        const dodgeFrames=Array.isArray(cfg.frames.dodge)?cfg.frames.dodge:[cfg.frames.dodge??14];
        const stageName='dodge'+rollStage[0].toUpperCase()+rollStage.slice(1);
        rollFrames=cfg.frames[stageName]??[dodgeFrames[rollStage==='tuck'?Math.min(1,dodgeFrames.length-1):0]];
      }
      if(actor.dead){state='dead';progress=clamp(number(actor.deadAge)/.5,0,1);rot=-dir*progress*.4;sy=1-progress*.1;}
      const blend=first||elapsed===0||newReaction?1:1-Math.exp(-elapsed*(attack?42:rolling?55:30));
      const angle=rolling?rot:nearAngle(rot,track.rot);
      if(rolling)track.rot=angle;else track.rot+=(angle-track.rot)*blend;
      track.sx+=(sx-track.sx)*blend;track.sy+=(sy-track.sy)*blend;
      track.offsetX+=(offsetX-track.offsetX)*blend;track.footLift+=(footLift-track.footLift)*blend;
      const offset=kind==='enemy'&&actor.type==='boss'?number(cfg.bossFrameOffset):0;
      const frame=frameFor(cfg,state,progress,offset,rollFrames);
      const centerSpec=settings.center??cfg.center;
      const center=Math.max(0,number(typeof centerSpec==='function'?centerSpec(frame,actor):centerSpec,number(cfg.center,1.47)));
      // Rotate/scale around the painted foot baseline rather than the plane center.
      // A rolling silhouette instead uses its bounding support radius to stay above ground.
      const tucked=rollStage==='tuck';
      const localX=tucked?track.offsetX:track.offsetX-center*track.sy*Math.sin(track.rot);
      const rollRadius=Math.max(.01,number(settings.rollRadius,number(cfg.rollRadius,Math.min(width,height)*.24)));
      const localY=tucked?rollRadius:
        track.footLift+center*track.sy*Math.cos(track.rot);
      track.pose={frame,x:localX,y:localY,rot:track.rot,scaleX:track.sx,scaleY:track.sy,dir,flipX:dir*direction(cfg.nativeFacing),
        u:(frame%cfg.cols)/cfg.cols,v:1-(Math.floor(frame/cfg.cols)+1)/cfg.rows,repeatX:1/cfg.cols,repeatY:1/cfg.rows,
        cols:cfg.cols,rows:cfg.rows,state,rollStage,rollProgress,stride:track.stride,landed,footLift:track.footLift,center,height,width,opacity:actor.dead?1-progress:1};
      track.lastX=x;track.lastY=y;track.speed=velocity;track.grounded=grounded;track.rolling=rolling;track.reactionTimer=number(actor.hitReactionTimer);track.parryTimer=number(actor.parryStaggerTimer);
      return {...track.pose};
    }
    function getPose(kind='hero',id){
      const pose=tracks.get(kind+':'+String(id??latest[kind]??kind))?.pose;
      return pose?{...pose}:null;
    }
    function reset(kind,id){
      if(kind===undefined){tracks.clear();for(const key of Object.keys(latest))delete latest[key];return;}
      for(const key of tracks.keys())if(key.startsWith(kind+':')&&(id===undefined||key===kind+':'+String(id)))tracks.delete(key);
      if(id===undefined||latest[kind]===String(id))delete latest[kind];
    }
    return {hero:(actor,dt,settings)=>update('hero',actor,dt,settings),enemy:(actor,dt,settings)=>update('enemy',actor,dt,settings),cat:(actor,dt,settings)=>update('cat',actor,dt,settings),pose:update,getPose,reset};
  }
  return {create};
});
