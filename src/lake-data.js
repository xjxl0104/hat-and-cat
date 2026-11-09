(function(root){'use strict';
// Chapter one: the firefly lakeside. Same grid as the ruins; HatAreas swaps the
// active terrain and HatWilds together, so the engine always sees one area.
const T=root.HatTerrain,golden=root.HatWilds;
const lake={
 id:'firefly-lake',name:'萤火湖畔',subtitle:'沿湖走过月光木桥，穿过月光之门',chapter:1,
 bounds:{minX:-28,maxX:28,minZ:-32,maxZ:28},spawn:{x:-2,y:0,z:24.5},
 camp:{id:'camp',name:'湖畔营火',x:-2,y:0,z:22},
 portal:{x:0,y:0,z:-24.6,to:'golden-wake'},
 waterLevel:-.45,
 route:[[-2,22],[2,14],[6,5],[7,-1],[7,-11],[4,-17],[0,-23]],
 // Night palette: the world builder and game lights read these over the dusk defaults.
 theme:{sky:'#0d1230',fog:'#202a55',fogNear:24,fogFar:100,ambient:'#7d93e6',ground:'#1c1830',key:'#b4c6ff',accent:'#9fd0ff',
  keyIntensity:1.7,ambientIntensity:1.25,exposure:1.05,keyPosition:[22,40,-30],rimColor:'#c7a8ff',rimIntensity:.55,
  skyStops:['#070a24','#131a4a','#24306a','#3a3f7a','#5b5590'],sunDir:[.45,.42,-.79],sunTint:[.62,.74,1],skyGround:[.1,.1,.22],starFrom:.08,starCut:.991,
  sunDisc:'#eef3ff',sunGlow:'#9fb8ff',sunSize:4.2,
  colors:{ridgeFar:'#2c3468',ridgeMid:'#212854',ridgeNear:'#171c3d',cloudLit:'#4c5c9e',cloudShade:'#262f63'}},
 leafTrees:[{x:16,z:21,r:3,top:6.5},{x:-21,z:15,r:3,top:6}],
 obstacles:[
  // Kenney CC0 props that block the way.
  {id:'camp-tent',x:-6.4,z:25.2,w:2,d:2,height:1.7,kind:'prop',model:'nature-kit/tent_smallOpen',rot:.4},
  {id:'camp-wood',x:2.6,z:25.6,w:1.2,d:1.6,height:1,kind:'prop',model:'nature-kit/log_stack',rot:-.3},
  {id:'east-rock',x:14.5,z:17.5,w:2.2,d:2.2,height:2.3,kind:'prop',model:'nature-kit/rock_tallB',rot:.6},
  {id:'west-rock',x:-21,z:22,w:2,d:2,height:2,kind:'prop',model:'nature-kit/rock_tallB',rot:2.1},
  {id:'hill-rock',x:-9,z:-21,w:2.2,d:2.2,height:2.4,kind:'prop',model:'nature-kit/rock_tallB',rot:1.1},
  {id:'east-tree',x:16,z:21,w:1.2,d:1.2,height:6,kind:'prop',model:'nature-kit/tree_oak',rot:.4},
  {id:'west-tree',x:-21,z:15,w:1.2,d:1.2,height:5.6,kind:'prop',model:'nature-kit/tree_oak',rot:2.4},
  // Lanterns light the path at night, beside the paving.
  {id:'lantern-camp',x:1.4,z:18,w:.4,d:.4,height:2.3,kind:'lantern'},
  {id:'lantern-shore',x:8.6,z:5.4,w:.4,d:.4,height:2.3,kind:'lantern'},
  {id:'lantern-bridge-s',x:10.8,z:-2.6,w:.4,d:.4,height:2.3,kind:'lantern'},
  {id:'lantern-bridge-n',x:3.4,z:-9.8,w:.4,d:.4,height:2.3,kind:'lantern'},
  {id:'lantern-hill',x:7,z:-17.5,w:.4,d:.4,height:2.3,kind:'lantern'},
  {id:'lantern-gate',x:-3,z:-21.6,w:.4,d:.4,height:2.3,kind:'lantern'}
 ],
 ponds:[],
 chests:[{id:'relic-lake-east',kind:'boon',x:21,y:0,z:12,name:'湖畔遗物'},{id:'relic-lake-north',kind:'boon',x:-17,y:0,z:-19,name:'萤火遗物'}],
 enemies:[
  {id:'lake-guard-a',type:'guard',x:3,z:11,hp:70,aggroRadius:6.5,leash:11,reward:14},
  {id:'lake-bat-a',type:'bat',x:-3,z:6,hp:40,aggroRadius:6,leash:10,reward:12},
  {id:'lake-guard-b',type:'guard',x:17,z:9,hp:85,aggroRadius:6,leash:10,reward:18},
  {id:'bridge-archer',type:'archer',x:12,z:-13,hp:60,aggroRadius:9,leash:11,reward:18},
  {id:'bridge-captain',type:'guard',x:6.5,z:-12.5,hp:150,aggroRadius:6.5,leash:9,reward:35},
  {id:'lake-bat-b',type:'bat',x:-6,z:-15,hp:45,aggroRadius:6,leash:10,reward:12},
  {id:'gate-guard',type:'guard',x:3,z:-20,hp:110,aggroRadius:6,leash:9,reward:28}
 ],
 landmarks:[{id:'camp',x:-2,z:22,name:'营火'},{id:'bridge',x:7,z:-6,name:'月光木桥'},{id:'portal',x:0,z:-24.6,name:'月光之门'}]
};
// Water blocks walking: one box per run of submerged grid cells, topped just
// above the surface so magic and arrows still fly over it.
function water(){
 const out=[],c=T.cell,wet=(x,z)=>T.heightAt(x,z)<lake.waterLevel+.4;
 for(let z=T.bounds.minZ+c/2;z<T.bounds.maxZ;z+=c){let start=null;
  for(let x=T.bounds.minX+c/2;x<=T.bounds.maxX+c/2;x+=c){const w=x<T.bounds.maxX&&wet(x,z);
   if(w&&start===null)start=x;if(!w&&start!==null){const x0=start-c/2,x1=x-c/2;out.push({id:'water-'+out.length,x:(x0+x1)/2,z,w:x1-x0,d:c,height:2.95,kind:'water',y:lake.waterLevel-2.6,fixed:true});start=null;}}}
 return out;
}
T.use('firefly-lake');
lake.obstacles.push(...water());
const H=T.heightAt;
for(const p of [lake.spawn,lake.camp,lake.portal,...lake.landmarks])p.y=H(p.x,p.z);
for(const o of lake.obstacles){
 if(o.fixed)continue;const anchor=H(o.x,o.z),base=Math.min(anchor,H(o.x-o.w/2,o.z-o.d/2),H(o.x+o.w/2,o.z-o.d/2),H(o.x-o.w/2,o.z+o.d/2),H(o.x+o.w/2,o.z+o.d/2));
 o.y=base;o.height+=anchor-base;o.groundY=anchor;
}
for(const e of lake.enemies){e.hoverHeight=e.type==='bat'?1.8:0;e.y=H(e.x,e.z)+e.hoverHeight;}
for(const c of lake.chests)c.y=H(c.x,c.z);
const areas={'golden-wake':golden,'firefly-lake':lake};
root.HatAreas={areas,first:'firefly-lake',use(id){if(!areas[id])throw Error('Unknown area '+id);T.use(id);root.HatWilds=areas[id];return areas[id];}};
root.HatAreas.use('firefly-lake');
})(typeof globalThis!=='undefined'?globalThis:this);
