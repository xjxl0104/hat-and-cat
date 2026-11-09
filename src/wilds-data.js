(function(root){'use strict';
// Authoritative small-area layout shared by combat, rendering and map UI.
root.HatWilds={
 id:'golden-wake',name:'暮丘遗迹',subtitle:'越过荒草低谷，走向高地上的暮钟',
 bounds:{minX:-28,maxX:28,minZ:-32,maxZ:28},spawn:{x:-19,y:0,z:21},
 camp:{id:'camp',name:'旅人的营火',x:-19,y:0,z:19},
 bossGate:{x:0,y:0,z:-12.2,spawn:{x:0,y:0,z:-16},width:5.6},
 bossArena:{minX:-9,maxX:9,minZ:-31,maxZ:-14},
 shortcut:{id:'shortcut-barrier',x:-19,y:0,z:-5,lever:{x:-19,y:0,z:-8},name:'荒庭近路'},
 exit:{x:0,y:0,z:-29},
 obstacles:[
  {id:'west-wall-a',x:-24.5,z:-5,w:7,d:1,height:4,kind:'ruin'},
  {id:'west-wall-b',x:-14,z:-5,w:6,d:1,height:4,kind:'ruin'},
  {id:'shortcut-barrier',x:-19,z:-5,w:4,d:.65,height:4,kind:'gate'},
  {id:'chapel-west',x:-10,z:-23,w:1.5,d:18,height:7,kind:'chapel'},
  {id:'chapel-east',x:10,z:-23,w:1.5,d:18,height:7,kind:'chapel'},
  {id:'chapel-back',x:0,z:-31.5,w:21.5,d:1,height:9,kind:'chapel'},
  {id:'chapel-front-west',x:-6.7,z:-13,w:7.6,d:1,height:6,kind:'chapel'},
  {id:'chapel-front-east',x:6.7,z:-13,w:7.6,d:1,height:6,kind:'chapel'},
  {id:'chapel-pillar-w',x:-6.5,z:-24,w:1.6,d:1.6,height:4.7,kind:'pillar'},
  {id:'chapel-pillar-e',x:6.5,z:-24,w:1.6,d:1.6,height:4.7,kind:'pillar'},
  {id:'road-stone',x:-9,z:5,w:3.2,d:3,height:2.2,kind:'rock'},
  {id:'road-pillar',x:1,z:8,w:1.7,d:1.7,height:4.2,kind:'pillar'},
  {id:'ruin-plinth',x:15,z:3,w:5,d:5,height:1.05,walkable:true,kind:'plinth'},
  {id:'ruin-wall',x:20,z:2,w:1,d:9,height:3.3,kind:'ruin'},
  {id:'ruin-arch-a',x:12,z:8,w:1.3,d:1.3,height:3.8,kind:'pillar'},
  {id:'ruin-arch-b',x:18,z:8,w:1.3,d:1.3,height:3.8,kind:'pillar'},
  {id:'meadow-cover',x:-4,z:16,w:3.4,d:1.3,height:.8,walkable:true,kind:'low-wall'},
  {id:'west-tree',x:-24,z:11,w:1.5,d:1.5,height:6,kind:'tree'},
  {id:'east-tree',x:23,z:17,w:1.9,d:1.9,height:8,kind:'tree'},
  {id:'broken-cart',x:8,z:17,w:3,d:1.8,height:1.1,walkable:true,kind:'cart'},
  // Warm lanterns line the old road beside the paving, never on it.
  {id:'lantern-camp',x:-14.4,z:18.4,w:.4,d:.4,height:2.3,kind:'lantern'},
  {id:'lantern-meadow',x:-11.8,z:9.2,w:.4,d:.4,height:2.3,kind:'lantern'},
  {id:'lantern-bend',x:-3.2,z:4.9,w:.4,d:.4,height:2.3,kind:'lantern'},
  {id:'lantern-climb',x:-4.7,z:-4.6,w:.4,d:.4,height:2.3,kind:'lantern'},
  {id:'lantern-gate-w',x:-3.6,z:-11.9,w:.4,d:.4,height:2.3,kind:'lantern'},
  {id:'lantern-gate-e',x:3.6,z:-11.9,w:.4,d:.4,height:2.3,kind:'lantern'}
 ],
 ponds:[],
 chests:[{id:'relic-ruin',kind:'boon',x:15,y:1.05,z:3,name:'废墟遗物'},{id:'relic-shortcut',kind:'boon',x:-23,y:0,z:-10,name:'守路人的遗物'}],
 enemies:[
  {id:'watcher',type:'guard',x:-8,z:12,hp:85,aggroRadius:6.8,leash:13,reward:18},
  {id:'road-archer',type:'archer',x:5,z:7,hp:65,aggroRadius:9,leash:12,reward:22},
  {id:'road-sword',type:'guard',x:-2,z:0,hp:95,aggroRadius:7,leash:12,reward:22},
  {id:'ruin-bat',type:'bat',x:17,y:1.8,z:13,hp:50,aggroRadius:6,leash:11,reward:15},
  {id:'ruin-keeper',type:'guard',x:12,z:-1,hp:120,aggroRadius:6.5,leash:11,reward:35},
  {id:'shortcut-guard',type:'guard',x:-16,z:-10,hp:105,aggroRadius:6,leash:10,reward:28},
  {id:'chapel-knight',type:'guard',x:-2,z:-8,hp:135,aggroRadius:6.2,leash:9,reward:40},
  {id:'boss',type:'boss',bossKind:'ironWarden',bossName:'余晖守誓者',x:0,z:-25,hp:460,aggroRadius:0,leash:19,reward:160},
  // Birthday finale, woken by the altar after the Warden. Modelled on the player's boyfriend.
  {id:'sweetheart',type:'boss',bossKind:'sweetheart',bossName:'钰淞 · 生日最终 Boss',x:0,z:-24,hp:320,aggroRadius:0,leash:19,reward:99}
 ],
 landmarks:[{id:'camp',x:-19,z:19,name:'营火'},{id:'ruins',x:15,z:3,name:'断墙遗迹'},{id:'shortcut',x:-19,z:-5,name:'近路门'},{id:'chapel',x:0,z:-22,name:'暮钟礼拜堂'}]
};
// Elevations are world coordinates; obstacle height is always relative to y.
const W=root.HatWilds,H=root.HatTerrain.heightAt;
for(const p of [W.spawn,W.camp,W.bossGate,W.bossGate.spawn,W.shortcut,W.shortcut.lever,W.exit,...W.landmarks])p.y=H(p.x,p.z);
for(const o of W.obstacles){
 const anchor=H(o.x,o.z),base=Math.min(anchor,H(o.x-o.w/2,o.z-o.d/2),H(o.x+o.w/2,o.z-o.d/2),H(o.x-o.w/2,o.z+o.d/2),H(o.x+o.w/2,o.z+o.d/2));
 o.y=base;o.height+=anchor-base;o.groundY=anchor;
}
for(const e of W.enemies){e.hoverHeight=e.type==='bat'?1.8:0;e.y=H(e.x,e.z)+e.hoverHeight;}
for(const c of W.chests){c.y=H(c.x,c.z);for(const o of W.obstacles)if(o.walkable&&Math.abs(c.x-o.x)<=o.w/2&&Math.abs(c.z-o.z)<=o.d/2)c.y=Math.max(c.y,o.y+o.height);}
})(typeof globalThis!=='undefined'?globalThis:this);
