(function(){'use strict';
const $=id=>document.getElementById(id),T=window.THREE,G=window.HatGame,canvas=$('scene');
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});}catch(error){$('loading').hidden=true;$('unsupported').hidden=false;return;}
renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(62,1,.12,180),ambient=new T.HemisphereLight('#a9bac9','#353a2b',.72),sunlight=new T.DirectionalLight('#ffe0b2',2.35);scene.add(ambient);sunlight.position.set(-27,38,17);sunlight.target.position.set(0,2,-5);scene.add(sunlight,sunlight.target);
// One bounded shadow map, no bloom/SSAO/post-processing or multiple shadow lights.
sunlight.castShadow=true;sunlight.shadow.mapSize.set(1024,1024);Object.assign(sunlight.shadow.camera,{left:-43,right:43,top:43,bottom:-43,near:1,far:110});sunlight.shadow.camera.updateProjectionMatrix();sunlight.shadow.bias=-.00025;sunlight.shadow.normalBias=.075;
const manager=new T.LoadingManager();let spriteError=false;const spritesReady=new Promise(resolve=>{manager.onLoad=resolve;manager.onError=()=>{spriteError=true;};});
const world=window.HatWildsWorld.create({THREE:T,scene}),actors=window.HatActors.create({THREE:T,scene,camera,manager}),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,fx=window.HatBattleFX.create({THREE:T,scene,camera,reduced,getBladeSegment:()=>actors.getBladeSegment?.(),getEnemyBladeSegments:()=>actors.getEnemyBladeSegments?.()}),audio=window.HatAudio.create(),routeUI=window.HatRouteUI.create(),renderState=window.HatRenderState.create();
const shoulder=window.HatShoulderCamera.create({THREE:T,camera,getOccluders:()=>world.getOccluders(),getCameraOccluders:()=>world.getCameraOccluders()}),shoulderHUD=window.HatShoulderHUD.create({THREE:T,camera});
let game=G.createGame(),loading=true,loadTicket=0,acc=0,last=performance.now(),lastPhase='',noticeTime=0,clock=0,stepTime=0,boonKey='',hudTime=0,resumePhase='play',revision=game.wildsRevision;
const numbers=[],numberPosition=new T.Vector3(),numberLocal=new T.Vector3(),inverseCamera=new T.Quaternion();
function notify(text,seconds=2.7){$('notice').textContent=text;$('notice').classList.add('show');noticeTime=seconds;}
const recorder=window.HatRecorder.create({canvas,audio,getState:()=>game,notify});
function captureMode(locked,mode){document.body.dataset.mouseMode=mode;$('look-hint').textContent=locked?'鼠标转向 · Esc 暂停':mode==='edge'?'移动鼠标转向 · 停在画面边缘可持续转向':'点击画面接管视角';}
const controls=window.HatControls.create({canvas,getPhase:()=>loading?'loading':game.phase,onStart:start,onPause:togglePause,onChoose:choose,onCancel:cancelRangedInput,aimPoint:()=>shoulder.aim(game),onLook:(dx,dy)=>shoulder.look(dx,dy),onCaptureChange:captureMode});
function cancelRangedInput(reason){const switchUntil=game.player.weaponSwitchUntil;G.cancelBow(game);G.cancelGuard?.(game);G.clearBufferedInputs?.(game);if(reason==='weaponSwitch')game.player.weaponSwitchUntil=switchUntil;game.inputLatch.bolt=false;game.inputLatch.guard=false;}
function clearInput(){G.cancelBow(game);G.cancelGuard?.(game);G.clearBufferedInputs?.(game);for(const key of Object.keys(game.inputLatch))game.inputLatch[key]=false;game.player.attackBuffer=0;game.player.actionBuffer=null;game.player.jumpBuffer=0;game.player.dashBuffer=0;game.player.sprinting=false;controls.clear();acc=0;}
function resize(){camera.aspect=Math.max(.45,innerWidth/innerHeight);camera.updateProjectionMatrix();renderer.setSize(Math.round(320*camera.aspect),320,false);}
addEventListener('resize',resize);resize();
function hidePanels(){for(const id of ['intro','result','camp-panel','upgrade-panel'])$(id).hidden=true;}
function syncPhase(){
 if(game.phase===lastPhase)return;lastPhase=game.phase;document.body.className=game.phase==='play'?'playing':game.phase;
 if(game.phase==='play'){audio.pause(false);$('overlay').classList.remove('result-mode');canvas.focus();return;}
 controls.release();clearInput();
 if(game.phase==='ready'){hidePanels();$('intro').hidden=false;$('overlay').classList.remove('result-mode');audio.pause(true);return;}
 if(game.phase==='treasure'){audio.pause(false);hidePanels();return;}
 audio.pause(true);hidePanels();$('overlay').classList.add('result-mode');
 if(game.phase==='upgrade')showUpgrade();else if(game.phase==='rest')showCamp();else if(['paused','dead','won'].includes(game.phase))showResult();
}
function start(){if(loading||game.phase!=='ready')return;game.phase='play';audio.unlock();audio.setLevel(0);clearInput();syncPhase();controls.capture();routeUI.arrive(game);notify('右键举盾 · 迎击瞬间精准格挡 · C 切换弓箭',3.5);}
function togglePause(){if(loading)return;if(game.phase==='rest'){leaveCamp();return;}if(['play','treasure'].includes(game.phase)){resumePhase=game.phase;game.phase='paused';syncPhase();}else if(game.phase==='paused')resume();}
function resume(){if(loading||game.phase!=='paused')return;game.phase=resumePhase;audio.unlock();clearInput();syncPhase();if(game.phase==='play')controls.capture();}
function resetPresentation(resetCamera=false){actors.reset(game);fx.reset();renderState.reset(game);for(const n of numbers)n.el.remove();numbers.length=0;world.update(game,0,clock);scene.updateMatrixWorld(true);if(resetCamera)shoulder.reset(game);revision=game.wildsRevision;}
function syncRevision(){if(revision===game.wildsRevision)return;const teleport=game.events.some(e=>['rest','respawn','bossAwake'].includes(e.type));resetPresentation(teleport);}
async function loadArea(){const ticket=++loadTicket;loading=true;clearInput();$('loading').hidden=false;$('loading-label').textContent='正在走进暮丘遗迹…';
 try{await Promise.all([world.load(game),spritesReady]);if(ticket!==loadTicket)return;if(spriteError)throw Error('角色图像未能载入');const theme=world.theme(0);sunlight.color.set(theme.key);ambient.color.set(theme.ambient);resetPresentation(true);clock=0;loading=false;$('loading').hidden=true;last=performance.now();lastPhase='';boonKey='';syncPhase();audio.setLevel(0);hud();}
 catch(error){if(ticket!==loadTicket)return;$('loading').hidden=true;$('unsupported').hidden=false;$('unsupported').textContent='场景载入失败：'+error.message+'。请重新打开完整 HTML 文件。';}
}
async function restart(){if(loading)return;audio.pause(true);controls.release();game=G.createGame();game.phase='play';clearInput();controls.capture();await loadArea();audio.unlock();routeUI.arrive(game);}
function respawn(){if(loading||game.phase!=='dead')return;game.events=[];G.respawn(game);clearInput();syncRevision();audio.unlock();syncPhase();effects(game.events);controls.capture();notify(game.wilds.deathDrop?'余烬留在倒下之处。取回它，再继续前行。':'在营火醒来。猫还在身边。',3.2);}
function leaveCamp(){if(game.phase!=='rest')return;game.events=[];G.leaveRest(game);clearInput();audio.unlock();syncPhase();effects(game.events);controls.capture();}
function showCamp(){hidePanels();$('camp-panel').hidden=false;const info=G.getCampInfo(game);$('camp-coins').textContent=game.coins;
 for(const kind of ['health','weapon']){const level=info[kind+'Level'],cost=info[kind+'Cost'],capped=info[kind+'Capped'];$(kind+'-upgrade-info').textContent='强化 '+level+' / '+info.maxLevel+' · '+(kind==='health'?'生命上限 +20':'武器伤害 +4')+'\n'+(capped?'已达到本区域上限':'花费 '+cost+' 余烬');$('upgrade-'+kind).disabled=capped||game.coins<cost;}
 $('leave-camp').focus();
}
function campUpgrade(kind){if(game.phase!=='rest')return;game.events=[];if(G.upgradeAtCamp(game,kind)){showCamp();hud();notify(kind==='health'?'营火温养了你的生命。':'剑锋已磨砺。',1.8);}}
function showResult(){const phase=game.phase,copy={paused:['THE FIRE CAN WAIT','暂停旅途','留意体力与敌人的收招空档。猫会在这里等你。'],dead:['THE EMBERS REMAIN','余火未熄','携带的余烬留在倒下的地方。再次倒下会覆盖旧的遗失余烬。'],won:game.wilds.finalDefeated?['HAPPY BIRTHDAY','生日快乐！','守誓者归于宁静，最终 Boss 也乖乖认输了。\n草帽、猫和他一起陪你吹灭蜡烛——愿新的一岁，每天都有余晖与甜。']:['AN OATH, AT LAST, RELEASED','守誓终归余晖','礼拜堂重归宁静。草帽、猫与你，一起走到了这片荒庭的尽头。']}[phase];
 $('result').hidden=false;$('result-eyebrow').textContent=copy[0];$('result-title').textContent=copy[1];$('result-copy').textContent=copy[2];$('resume').hidden=phase!=='paused';$('respawn').hidden=phase!=='dead';$('result-stats').innerHTML='<span><b>'+game.kills+'</b>击败敌人</span><span><b>'+game.perks.length+'</b>携带遗物</span><span><b>'+Math.floor(game.time/60)+':'+String(Math.floor(game.time%60)).padStart(2,'0')+'</b>旅途时间</span>';
 (phase==='dead'?$('respawn'):phase==='paused'?$('resume'):$('restart')).focus();
}
function showUpgrade(){const choices=$('upgrade-choices');choices.replaceChildren();choices.dataset.count=game.upgradeChoices.length;$('upgrade-panel').hidden=false;const family={star:'弓箭遗物',cat:'猫咪遗物'};
 game.upgradeChoices.forEach((id,index)=>{const info=G.getPerkInfo(game,id),button=document.createElement('button');button.className='upgrade-card';const partners=info.synergyNames.length?'已能联动：'+info.synergyNames.join(' / '):'搭配方向：'+info.partners.slice(0,2).map(p=>G.PERKS[p].name).join(' / ');button.innerHTML='<small>'+family[info.family]+'</small><i class="skill-icon '+info.family+'">'+info.icon+'</i><h3>'+info.name+'</h3><span class="upgrade-rank">带在身边 · 自动生效</span><p>'+info.description+'</p><div class="synergy-hint">'+partners+'</div><div class="choose-label"><span>带上遗物</span><b>'+(index+1)+' →</b></div>';button.onclick=()=>choose(index);choices.append(button);});choices.firstElementChild?.focus();
}
function choose(index){if(game.phase!=='upgrade')return;const id=game.upgradeChoices[index];if(!id)return;G.chooseUpgrade(game,id);audio.pause(false);effects(game.events);clearInput();syncPhase();controls.capture();}
function damageNumber(e){if(numbers.length>=6)numbers.shift().el.remove();const el=document.createElement('span');el.className='damage-number'+(e.heavy?' heavy':'');el.textContent=Math.round(e.value||e.damage||0);$('damage-numbers').append(el);numbers.push({el,x:e.x,y:e.y+.6,z:e.z,age:0,life:.58,drift:(Math.random()-.5)*.4});}
function effects(events){const aliases={dashStart:'dodge',mirrorSlash:'swing',guardReflect:'projectileHit',starBurst:'projectileHit',crescentLaunch:'bolt',bossAwake:'arenaStart',finalDefeated:'arenaClear',bossDefeated:'arenaClear',emberRecovered:'pickup',shortcutOpen:'checkpoint',rest:'checkpoint',drinkStart:'ui'};
 for(const e of events){fx.emit(e,game);actors.emit(e);audio.effect({...e,type:aliases[e.type]||e.type,intensity:e.origin==='reaction'?.4:1,pan:Math.max(-.8,Math.min(.8,((e.x??game.player.x)-game.player.x)/14))});
  if(e.type==='hit'&&e.origin!=='reaction'&&(e.heavy||e.value>=35))damageNumber(e);
  if(e.type==='upgrade')notify('获得遗物「'+G.PERKS[e.perkId].name+'」',2.8);
  if(e.type==='treasureOpen'){noticeTime=0;$('notice').classList.remove('show');}
  if(e.type==='heal')notify('恢复 '+e.value+' 点生命',1.3);
  if(e.type==='drinkCancel')notify('饮用被打断',1.2);
  if(e.type==='shortcutOpen')notify('旧巡礼小径 · 近路已开启',3);
  if(e.type==='emberRecovered')notify('找回 '+e.value+' 余烬',2);
  if(e.type==='bossAwake')notify(e.bossKind==='sweetheart'?'等一下！最后的 Boss 从天而降……\n棒棒糖可以格挡反击 · 红叉招式请跳开或闪避':'余晖守誓者\n剑招可以精准格挡，红色十字招式请闪避或跳开。',3.6);
  if(e.type==='finalDefeated')notify('他认输啦！\n去祭坛吹灭生日蜡烛吧。',4);
  if(e.type==='bossDefeated')notify('誓约已尽\n走向礼拜堂尽头的余光。',4);
  if(e.type==='weaponSwap')notify(game.player.weaponMode==='bow'?'短弓 · 按住左键或右键蓄箭，松开发射':'剑盾 · 左键斩击，右键举盾',1.5);
  if(e.type==='weaponSwapQueued')notify('当前动作结束后切换武器',1.25);
  if(e.type==='weaponSwapCancel')notify(e.reason==='cancelled'?'已取消武器切换':'这次未能切换武器 · 再按 C',1.5);
 }
}
function buildInput(first){const input=controls.read(first),move=shoulder.movement(Number(input.right)-Number(input.left),Number(input.up)-Number(input.down));input.moveX=move.x;input.moveZ=move.z;if(game.player.weaponMode==='bow'){input.bolt=!!(input.secondary||input.attack);input.attack=false;input.guard=false;}else{input.guard=!!input.secondary;input.bolt=false;}delete input.secondary;return input;}
function defenseHUD(){
 const p=game.player,bow=p.weaponMode==='bow',counter=p.counterUntil>game.time,broken=p.guardBreakTimer>0,perfect=p.guardActive&&p.parryUntil>game.time;
 $('weapon-mode').textContent=bow?'短弓':'剑与圆盾';$('weapon-selector').classList.toggle('bow-mode',bow);$('weapon-action').textContent=bow?'按住左 / 右键蓄箭 · 松开发射':'左键斩击 · 右键正面格挡';
 $('primary-title').textContent=bow?'射箭':counter?'反击':'斩击';$('primary-hint').textContent=bow?'按住蓄力':counter?'破绽一击':'三段剑势';$('secondary-title').textContent=bow?'蓄箭':'格挡';
 $('secondary-cd').textContent=bow?(p.bowCharging?'蓄力 '+Math.round(p.bowCharge*100)+'%':'松开发射'):broken?'防御崩溃':perfect?'精准窗口':p.guardActive?'消耗体力':'按住举盾';$('defense-ability').classList.toggle('cooling',broken);$('defense-ability').classList.toggle('perfect',perfect);
 const text=broken?'防御崩溃':counter?'精准格挡 · 左键反击':p.guardImpactTimer>0?'格挡成功':perfect?'迎击':p.guardActive?'正面防御':'';
 $('combat-state').textContent=text;$('combat-state').hidden=game.phase!=='play'||!text;$('combat-state').className=broken?'broken':counter?'counter':perfect?'perfect':'';
 $('stamina-bar').classList.toggle('guarding',!!p.guardActive);$('stamina-bar').classList.toggle('broken',broken);
}
function hud(elapsed=0){const p=game.player,boss=game.enemies.find(e=>e.type==='boss'&&!e.dead&&e.state!=='dormant')||game.enemies.find(e=>e.type==='boss');$('health-label').textContent=Math.ceil(p.hp)+' / '+p.maxHp;$('health-bar').style.width=(p.hp/p.maxHp*100)+'%';$('stamina-bar').style.width=(p.stamina/p.maxStamina*100)+'%';$('stamina-label').textContent=Math.ceil(p.stamina);$('movement-state').textContent=p.guardBreakTimer>0?'破防':p.guardActive?'举盾':p.healTimer>0?'正在饮用':!p.grounded?'腾空':p.dash.active?'闪避':p.sprinting?'疾跑':p.stamina<20?'体力不足':'步行';$('potions').textContent=p.potions;$('coins').textContent=game.coins;$('flask-status').textContent=p.healTimer>0?'饮用中 · '+p.healTimer.toFixed(1)+'s':p.potions?'手动饮用 · 受击会打断':'已耗尽 · 回营火补充';
 const ability=(id,timer,label)=>{$(id+'-cd').textContent=timer>.01?timer.toFixed(1)+'s':label;$(id+'-ability').classList.toggle('cooling',timer>.01);};ability('cat',game.catCooldown,'指向破绽');$('dash-cd').textContent=p.stamina<25?'体力不足':'25 体力';$('dash-ability').classList.toggle('cooling',p.stamina<25||p.dash.active);
 $('boss-hud').hidden=!game.bossActive||!boss||boss.dead;$('boss-name').textContent=boss?.bossName||'余晖守誓者';$('boss-hud').classList.toggle('sweet',boss?.bossKind==='sweetheart');$('boss-action').textContent=boss&&!boss.dead?(boss.state==='windup'?(boss.attackName||'正在蓄势')+(boss.comboTotal>1?' · '+((boss.comboIndex||0)+1)+' / '+boss.comboTotal:''):boss.state==='comboGap'?'连招尚未结束':boss.exposed&&boss.exposedUntil>game.time?'收招空档 · 可以反击':''):'';$('boss-bar').style.width=(boss?boss.hp/boss.maxHp*100:0)+'%';$('interact-prompt').hidden=!game.interaction||game.phase!=='play';$('interact-label').textContent=game.interaction?.label||'';
 const key=game.perks.join(',');if(key!==boonKey){boonKey=key;$('boon-list').replaceChildren();for(const id of game.perks){const info=G.getPerkInfo(game,id),chip=document.createElement('span');chip.textContent=info.name;chip.className=info.family;chip.title=info.description;$('boon-list').append(chip);}}$('boon-list').hidden=!game.perks.length;
 const yaw=shoulder.getState().yaw,headings=['北 N','东北 NE','东 E','东南 SE','南 S','西南 SW','西 W','西北 NW'];$('compass-heading').textContent=headings[(Math.round(yaw/(Math.PI/4))+8)%8];routeUI.update(game,elapsed);$('music').title=audio.getState().title;$('record').textContent=recorder.isRecording()?'停止录制':'录制 20s';
}
function draw(combatDt,revealDt,view){const visualDt=Math.max(combatDt,revealDt);clock+=visualDt;world.update(game,visualDt,clock);shoulder.update(view,combatDt);inverseCamera.copy(camera.quaternion).invert();actors.update(view,game.impactFrozen?0:combatDt);fx.update(view,combatDt,revealDt);defenseHUD();
 for(let i=numbers.length-1;i>=0;i--){const n=numbers[i];n.age+=combatDt;if(n.age>=n.life){n.el.remove();numbers.splice(i,1);continue;}numberPosition.set(n.x+n.drift*n.age,n.y+n.age*.9,n.z);numberLocal.copy(numberPosition).sub(camera.position).applyQuaternion(inverseCamera);numberPosition.project(camera);n.el.hidden=numberLocal.z>=0||Math.abs(numberPosition.x)>1||Math.abs(numberPosition.y)>1;n.el.style.left=(numberPosition.x*.5+.5)*100+'%';n.el.style.top=(-numberPosition.y*.5+.5)*100+'%';n.el.style.opacity=Math.min(.85,(n.life-n.age)*5);}
 if(combatDt>0&&!game.impactFrozen){const p=view.player;stepTime+=combatDt;if(p.grounded&&Math.hypot(p.vx,p.vz)>.1&&!p.dash.active&&stepTime>(p.sprinting?.23:.34)){stepTime=0;audio.effect({type:'step',intensity:.5});}}
 shoulderHUD.update(view,shoulder.aim(view));const inspect=window.__hat?.inspect;if(inspect){camera.position.set(inspect[0],inspect[1],inspect[2]);camera.lookAt(inspect[3],inspect[4],inspect[5]);}renderer.render(scene,camera);recorder.render();
}
function frame(now){
 requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden)return;
 const startedPlaying=!loading&&game.phase==='play';let simDt=0,revealDt=0;
 if(startedPlaying){controls.update(dt);shoulder.update(game,0);acc+=dt;let first=true;while(acc>=1/60&&game.phase==='play'){renderState.capture(game);G.step(game,buildInput(first),1/60);syncRevision();effects(game.events);simDt+=1/60;acc-=1/60;first=false;}}else acc=0;
 if(!loading&&game.phase==='treasure'&&simDt===0){G.advanceTreasure(game,dt);effects(game.events);revealDt=dt;}
 if(!loading){syncPhase();const combatDt=game.phase==='ready'?dt:startedPlaying?(game.phase==='play'?dt:simDt):0,view=game.phase==='play'&&startedPlaying?renderState.sample(game,Math.max(0,acc*60)):game;draw(combatDt,revealDt,view);
  audio.setScene(game.phase==='won'?'win':game.bossActive?'boss':game.enemies.some(e=>!e.dead&&e.aggro)?'combat':'explore');hudTime+=dt;if(hudTime>.12){hud(hudTime);hudTime=0;}}
 if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').classList.remove('show');}
}
$('start').onclick=start;$('pause').onclick=togglePause;$('resume').onclick=resume;$('restart').onclick=restart;$('respawn').onclick=respawn;$('leave-camp').onclick=leaveCamp;$('upgrade-health').onclick=()=>campUpgrade('health');$('upgrade-weapon').onclick=()=>campUpgrade('weapon');
let musicEnabled=true,sfxEnabled=true;$('music').onclick=()=>{musicEnabled=!musicEnabled;audio.unlock();audio.setMusic(musicEnabled);$('music').textContent=musicEnabled?'♫ 8-bit 开':'♫ 8-bit 关';$('music').setAttribute('aria-pressed',String(musicEnabled));};$('sound').onclick=()=>{sfxEnabled=!sfxEnabled;audio.unlock();audio.setSfx(sfxEnabled);$('sound').textContent=sfxEnabled?'音效 开':'音效 关';$('sound').setAttribute('aria-pressed',String(sfxEnabled));};
$('record').onclick=async()=>{if(loading||!['ready','play','paused'].includes(game.phase))return;if(recorder.isRecording()){await recorder.stop();return;}if(game.phase==='ready')start();if(game.phase==='paused')resume();await recorder.start(20);canvas.focus();};$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else $('game-shell').requestFullscreen?.().catch(()=>{});};$('credits-button').onclick=()=>$('credits').showModal();$('credits-close').onclick=()=>$('credits').close();canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(game.phase==='play')togglePause();notify('画面连接中断，请重新打开文件。',20);});
// Local inspection only: ?debug exposes live state for manual QA.
if(/[?&]debug\b/.test(location.search))window.__hat={get game(){return game;},G,fx,camera,shoulder,actors,scene,renderer};
loadArea();requestAnimationFrame(frame);
})();
