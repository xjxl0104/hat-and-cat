(function(root){'use strict';
// View-only ambient life, never touched by gameplay: fireflies over the meadow,
// campfire embers, golden motes in the chapel and leaves from the two big trees.
function create({THREE:T,scene,reduced=false}){
 const H=(x,z)=>root.HatTerrain.heightAt(x,z),rand=Math.random,TAU=Math.PI*2;
 const scale=reduced?.5:1,N={firefly:Math.round(70*scale),mote:Math.round(56*scale),ember:Math.round(26*scale)},LEAVES=Math.round(34*scale);
 const glowKinds=[['firefly','#e8ff8a',.07],['mote','#ffd98a',.05],['ember','#ff9a3c',.06]];
 const glow=[];for(const [kind,color,size] of glowKinds)for(let i=0;i<N[kind];i++)glow.push({kind,color:new T.Color(color),size,phase:rand()*TAU,x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,max:1,alpha:0});
 const positions=new Float32Array(glow.length*3),colors=new Float32Array(glow.length*3),sizes=new Float32Array(glow.length),alphas=new Float32Array(glow.length);
 glow.forEach((p,i)=>{colors.set([p.color.r,p.color.g,p.color.b],i*3);sizes[i]=p.size;});
 const geometry=new T.BufferGeometry(),position=new T.BufferAttribute(positions,3),alpha=new T.BufferAttribute(alphas,1);position.setUsage(T.DynamicDrawUsage);alpha.setUsage(T.DynamicDrawUsage);
 geometry.setAttribute('position',position);geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setAttribute('size',new T.BufferAttribute(sizes,1));geometry.setAttribute('alpha',alpha);
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,uniforms:{scale:{value:266}},
  vertexShader:'attribute vec3 color;attribute float size;attribute float alpha;uniform float scale;varying vec3 vColor;varying float vAlpha;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);float d=-mv.z;gl_PointSize=clamp(size*scale/max(d,.1),1.5,7.0);vColor=color;vAlpha=alpha*(1.0-smoothstep(24.0,44.0,d));gl_Position=projectionMatrix*mv;}',
  fragmentShader:'varying vec3 vColor;varying float vAlpha;void main(){vec2 q=abs(gl_PointCoord-.5);if(max(q.x,q.y)>.5)discard;float core=step(max(q.x,q.y),.26);gl_FragColor=vec4(vColor*(.55+core*.45),vAlpha*(.55+core*.45));}'});
 const points=new T.Points(geometry,material);points.frustumCulled=false;points.renderOrder=22;scene.add(points);
 const leafMesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({roughness:1,flatShading:true}),LEAVES);leafMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);leafMesh.frustumCulled=false;scene.add(leafMesh);
 const goldenTrees=[{x:-24,z:11,r:3.4,top:7.5},{x:23,z:17,r:4.4,top:9.5}],trees=()=>root.HatWilds?.leafTrees||goldenTrees,lake=()=>root.HatWilds?.id==='firefly-lake',leafColors=['#e39a3c','#f4c25a','#c7552e','#d97b2c'].map(c=>new T.Color(c));
 const leaves=Array.from({length:LEAVES},(_,i)=>({tree:null,i,x:0,y:0,z:0,spin:0,rx:0,ry:0,phase:rand()*TAU,rest:0,landed:false}));
 const dummy=new T.Object3D();let started=false,area='';
 function spawn(p,anywhere){
  // At the lake fireflies fill the whole map and hover low over the water.
  if(p.kind==='firefly'&&lake()){p.x=-26+rand()*52;p.z=-30+rand()*56;p.base=Math.max(H(p.x,p.z),root.HatWilds.waterLevel)+.3+rand()*1.6;p.y=p.base;p.max=p.life=6+rand()*8;}
  else if(p.kind==='mote'&&lake()){const g=root.HatWilds.portal;p.x=g.x-3+rand()*6;p.z=g.z-2+rand()*3;p.floor=H(p.x,p.z);p.y=p.floor+(anywhere?rand()*4:.2);p.vy=.15+rand()*.2;p.max=p.life=6+rand()*5;}
  else if(p.kind==='firefly'){p.x=-25+rand()*50;p.z=-9+rand()*35;if(p.z<10&&p.x>-12&&p.x<12&&p.z<-11)p.z+=6;p.base=H(p.x,p.z)+.35+rand()*1.5;p.y=p.base;p.max=p.life=6+rand()*8;}
  else if(p.kind==='mote'){p.x=-8+rand()*16;p.z=-30+rand()*15;p.floor=H(p.x,p.z);p.y=p.floor+(anywhere?rand()*5:.2);p.vy=.12+rand()*.18;p.max=p.life=8+rand()*6;}
  else{const c=root.HatWilds.camp;p.x=c.x+(rand()-.5)*.5;p.z=c.z+(rand()-.5)*.5;p.y=H(c.x,c.z)+.4+(anywhere?rand()*2:0);p.vy=.7+rand()*.8;p.vx=(rand()-.5)*.3;p.max=p.life=1.4+rand()*1.3;}
 }
 function dropLeaf(l,anywhere){const list=trees(),t=l.tree=list[l.i%list.length],a=rand()*TAU,r=Math.sqrt(rand())*t.r;l.x=t.x+Math.cos(a)*r;l.z=t.z+Math.sin(a)*r;l.y=H(t.x,t.z)+t.top*(anywhere?.3+rand()*.7:.75+rand()*.25);l.spin=2+rand()*4;l.rx=rand()*TAU;l.ry=rand()*TAU;l.landed=false;l.rest=0;}
 function update(game,dt,time,camera,heightPx=320){
  if(area!==root.HatWilds?.id){area=root.HatWilds?.id;started=false;}
  if(!started){for(const p of glow)spawn(p,true);for(const l of leaves)dropLeaf(l,true);started=true;}
  material.uniforms.scale.value=heightPx*.5/Math.tan((camera?.fov||62)*Math.PI/360);
  dt=Math.min(.05,Math.max(0,dt||0));
  glow.forEach((p,i)=>{
   p.life-=dt;if(p.life<=0)spawn(p,false);const age=1-p.life/p.max,fade=Math.min(1,age*6,(1-age)*4);
   if(p.kind==='firefly'){p.x+=Math.sin(time*.6+p.phase)*dt*.35;p.z+=Math.cos(time*.5+p.phase*1.3)*dt*.35;p.y=p.base+Math.sin(time*1.1+p.phase)*.3;p.alpha=fade*(.35+.65*Math.max(0,Math.sin(time*2.4+p.phase*3)));}
   else if(p.kind==='mote'){p.y+=p.vy*dt;p.x+=Math.sin(time*.4+p.phase)*dt*.2;p.alpha=fade*.7;}
   else{p.y+=p.vy*dt;p.x+=(p.vx+Math.sin(time*3+p.phase)*.25)*dt;p.alpha=fade*(.8+.2*Math.sin(time*20+p.phase));}
   positions[i*3]=p.x;positions[i*3+1]=p.y;positions[i*3+2]=p.z;alphas[i]=p.alpha;
  });
  position.needsUpdate=alpha.needsUpdate=true;
  leaves.forEach((l,i)=>{
   if(!l.landed){l.y-=dt*(.45+.15*Math.sin(time*2+l.phase));l.x+=Math.sin(time*1.3+l.phase)*dt*.5;l.z+=Math.cos(time*1.1+l.phase)*dt*.3;l.rx+=l.spin*dt;const floor=H(l.x,l.z)+.03;if(l.y<=floor){l.y=floor;l.landed=true;l.rx=Math.PI/2;}}
   else if((l.rest+=dt)>4)dropLeaf(l,false);
   const s=l.landed?Math.max(0,1-Math.max(0,l.rest-3)):1;dummy.position.set(l.x,l.y,l.z);dummy.rotation.set(l.rx,l.ry,l.rx*.6);dummy.scale.set(.15*s,.025,.11*s);dummy.updateMatrix();leafMesh.setMatrixAt(i,dummy.matrix);leafMesh.setColorAt(i,leafColors[i%leafColors.length]);
  });
  leafMesh.instanceMatrix.needsUpdate=true;if(leafMesh.instanceColor)leafMesh.instanceColor.needsUpdate=true;
 }
 function dispose(){scene.remove(points,leafMesh);geometry.dispose();material.dispose();leafMesh.geometry.dispose();leafMesh.material.dispose();leafMesh.dispose();}
 return{update,dispose};
}
root.HatAmbience={create};
})(typeof window!=='undefined'?window:globalThis);
