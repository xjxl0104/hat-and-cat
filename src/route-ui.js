(function(root){'use strict';
function create(){
 const $=id=>document.getElementById(id),canvas=$('room-map'),ctx=canvas.getContext('2d');let arrivalTimer=0;
 function zone(s){const p=s.player;if(p.z<-13&&Math.abs(p.x)<10)return '失誓礼拜堂';if(p.x<-12&&p.z<-4)return '旧巡礼小径';if(p.x>9&&p.z<11)return '半埋遗迹';if(p.z>14)return '营火坡地';return '残石古道';}
 function objective(s){if(s.wilds.bossDefeated)return '守誓已终 · 走向礼拜堂尽头的余光';if(s.wilds.bossEntered)return '避开连招 · 低位横扫可跳过 · 收招时反击';if(s.wilds.deathDrop)return '取回遗失的余烬，或先回营火休整';if(s.wilds.shortcutOpen)return '近路已开启 · 前往礼拜堂挑战守誓者';if(s.player.z>10)return '循石路前行 · 东侧遗迹藏着旧日遗物';return '寻找近路与遗物 · 礼拜堂在北方';}
 function update(s,dt=0){
  const w=canvas.width,h=canvas.height,b=s.bounds,X=x=>7+(x-b.minX)/(b.maxX-b.minX)*(w-14),Y=z=>7+(z-b.minZ)/(b.maxZ-b.minZ)*(h-14);ctx.clearRect(0,0,w,h);ctx.fillStyle='#202b22';ctx.fillRect(0,0,w,h);
  const terrain=root.HatTerrain,palette=['#24322d','#2e3b31','#3a4538','#47503e','#555b46','#656550','#72725b'];
  for(let iz=0;iz<terrain.nz-1;iz++)for(let ix=0;ix<terrain.nx-1;ix++){const x=terrain.bounds.minX+ix*terrain.cell,z=terrain.bounds.minZ+iz*terrain.cell,y=terrain.heights[iz*terrain.nx+ix];ctx.fillStyle=palette[Math.max(0,Math.min(6,Math.floor(y+1)))];ctx.fillRect(X(x),Y(z),Math.ceil(terrain.cell/(b.maxX-b.minX)*(w-14)),Math.ceil(terrain.cell/(b.maxZ-b.minZ)*(h-14)));}
  ctx.strokeStyle='#8d896a62';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(X(-19),Y(21));ctx.lineTo(X(-5),Y(12));ctx.lineTo(X(-1),Y(-10));ctx.lineTo(X(0),Y(-27));ctx.stroke();ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(X(-5),Y(8));ctx.lineTo(X(15),Y(3));ctx.moveTo(X(-19),Y(19));ctx.lineTo(X(-19),Y(-10));ctx.lineTo(X(-1),Y(-10));ctx.stroke();
  for(const o of s.obstacles){ctx.fillStyle=o.kind==='fog'?'#bbae6f':'#68705b';ctx.fillRect(X(o.x-o.w/2),Y(o.z-o.d/2),Math.max(1,o.w/(b.maxX-b.minX)*(w-14)),Math.max(1,o.d/(b.maxZ-b.minZ)*(h-14)));}
  ctx.fillStyle='#cdb275';ctx.fillRect(X(s.camp.x)-2,Y(s.camp.z)-2,4,4);
  for(const c of s.chests)if(!c.opened){ctx.strokeStyle='#b59b66';ctx.strokeRect(X(c.x)-2,Y(c.z)-2,4,4);}
  if(s.wilds.deathDrop){const d=s.wilds.deathDrop;ctx.fillStyle='#d7d396';ctx.fillRect(X(d.x)-2,Y(d.z)-2,4,4);}
  for(const e of s.enemies){if(e.dead||e.spawned===false||Math.hypot(e.x-s.player.x,e.z-s.player.z)>10)continue;ctx.fillStyle=e.type==='boss'?'#cfa486':'#ac7760';ctx.fillRect(X(e.x)-1,Y(e.z)-1,2,2);}
  const p=s.player,px=X(p.x),py=Y(p.z);ctx.strokeStyle='#e8dec0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+(p.aimDirX||0)*6,py+(p.aimDirZ||-1)*6);ctx.stroke();ctx.fillStyle='#ede4c4';ctx.fillRect(px-1.5,py-1.5,3,3);
  $('route-room').textContent=zone(s);$('route-floor').textContent=s.wilds.shortcutOpen?'西侧近路 · 已开启':'西侧近路 · 尚未开启';$('objective-text').textContent=objective(s);
  arrivalTimer=Math.max(0,arrivalTimer-dt);$('room-arrival').classList.toggle('show',arrivalTimer>0&&s.phase==='play');
 }
 function arrive(s){$('arrival-floor').textContent='DUSK ON THE HIGH GROUND';$('arrival-name').textContent='暮丘遗迹';$('arrival-hint').textContent=s.wilds.bossDefeated?'守誓者已归于宁静':'越过荒草低谷，走向高地上的暮钟';arrivalTimer=3.5;}
 return{update,arrive};
}
root.HatRouteUI={create};
})(window);
