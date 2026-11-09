/* Magic presentation: homing star orbs, the Q starfall, and small assist cues.
   Pure display: reads interpolated game state and engine events, never writes them. */
(function(root){'use strict';
function create({THREE:T,scene,reduced=false}){
 const group=new T.Group();group.name='Magic FX';scene.add(group);
 const PINK=new T.Color('#ff7fc8'),VIOLET=new T.Color('#a98bff'),GOLD=new T.Color('#ffd36b'),MINT=new T.Color('#8ff0c4'),WHITE=new T.Color('#fff6e8');
 const CAP=reduced?260:720,pos=new Float32Array(CAP*3),col=new Float32Array(CAP*3),size=new Float32Array(CAP),alpha=new Float32Array(CAP),parts=[];
 for(let i=0;i<CAP;i++)parts.push({life:0,max:1,x:0,y:0,z:0,vx:0,vy:0,vz:0,g:0,drag:0,s:1,c:new T.Color()});
 const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pos,3));pg.setAttribute('color',new T.BufferAttribute(col,3));pg.setAttribute('size',new T.BufferAttribute(size,1));pg.setAttribute('alpha',new T.BufferAttribute(alpha,1));
 const pm=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{scale:{value:300}},
  vertexShader:'attribute float size;attribute float alpha;attribute vec3 color;varying vec3 vC;varying float vA;uniform float scale;void main(){vC=color;vA=alpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=max(1.,size*scale/-mv.z);gl_Position=projectionMatrix*mv;}',
  // Square-ish, stepped falloff keeps the sparkles pixel-art rather than airbrushed.
  fragmentShader:'varying vec3 vC;varying float vA;void main(){vec2 q=abs(gl_PointCoord-.5)*2.;float d=max(q.x,q.y)*.55+min(q.x,q.y)*.6;float a=floor((1.-d)*4.)/4.;if(a<=0.)discard;gl_FragColor=vec4(vC*(1.+a*.6),a*vA);}'});
 const points=new T.Points(pg,pm);points.frustumCulled=false;group.add(points);let cursor=0;
 function spark(x,y,z,c,o={}){
  const p=parts[cursor];cursor=(cursor+1)%CAP;const sp=o.speed??2,a=Math.random()*Math.PI*2,u=Math.random()*2-1,r=Math.sqrt(1-u*u);
  p.x=x;p.y=y;p.z=z;p.vx=(o.vx??0)+Math.cos(a)*r*sp;p.vy=(o.vy??0)+u*sp*(o.flat?0.25:1);p.vz=(o.vz??0)+Math.sin(a)*r*sp;
  p.g=o.g??-1.5;p.drag=o.drag??2.2;p.s=o.size??.16;p.max=p.life=o.life??(.45+Math.random()*.35);p.c.copy(c);
 }
 function burst(x,y,z,c,n,o){for(let i=0;i<(reduced?Math.ceil(n/2):n);i++)spark(x,y,z,i%3?c:WHITE,o);}
 // Canvas textures: a soft star and a rune circle.
 function canvas(n,draw){const c=document.createElement('canvas');c.width=c.height=n;draw(c.getContext('2d'),n);const t=new T.CanvasTexture(c);t.magFilter=T.NearestFilter;t.minFilter=T.NearestFilter;t.colorSpace=T.SRGBColorSpace;return t;}
 function starPath(g,cx,cy,R,r,k=5){g.beginPath();for(let i=0;i<k*2;i++){const a=-Math.PI/2+i*Math.PI/k,m=i%2?r:R;g.lineTo(cx+Math.cos(a)*m,cy+Math.sin(a)*m);}g.closePath();}
 const starTex=canvas(32,(g,n)=>{g.fillStyle='rgba(255,255,255,.35)';starPath(g,16,16,15,7);g.fill();g.fillStyle='#fff';starPath(g,16,16,11,5);g.fill();});
 const glowTex=canvas(32,(g,n)=>{for(let r=16;r>0;r-=3){g.fillStyle='rgba(255,255,255,'+(.12+(16-r)/16*.5)+')';g.fillRect(16-r,16-r,r*2,r*2);}});
 const runeTex=canvas(128,(g,n)=>{
  g.strokeStyle='#fff';g.fillStyle='#fff';g.lineWidth=3;g.beginPath();g.arc(64,64,60,0,7);g.stroke();g.lineWidth=2;g.beginPath();g.arc(64,64,50,0,7);g.stroke();
  starPath(g,64,64,48,19);g.stroke();g.beginPath();g.arc(64,64,18,0,7);g.stroke();
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;g.fillRect(64+Math.cos(a)*55-2,64+Math.sin(a)*55-2,i%3?3:5,i%3?3:5);}
  for(let i=0;i<5;i++){const a=-Math.PI/2+i/5*Math.PI*2;g.beginPath();g.arc(64+Math.cos(a)*34,64+Math.sin(a)*34,4,0,7);g.fill();}
 });
 const add=(color,opacity=1)=>new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending});
 // Orbs: core + halo sprite per live magic projectile.
 const orbs=new Map(),orbGeo=new T.IcosahedronGeometry(.16,0);
 function orb(){const g=new T.Group(),core=new T.Mesh(orbGeo,add('#fff2fb')),shell=new T.Mesh(orbGeo,add('#ff8fd0',.55));shell.scale.setScalar(1.7);const halo=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:'#ff9ad6',transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.9}));halo.scale.setScalar(1.8);const star=new T.Sprite(new T.SpriteMaterial({map:starTex,color:'#fff0a8',transparent:true,depthWrite:false,blending:T.AdditiveBlending}));star.scale.setScalar(.85);g.add(core,shell,halo,star);g.scale.setScalar(1.5);g.userData={core,shell,halo,star,t:0,last:new T.Vector3()};group.add(g);return g;}
 // Starfall: rune circle, falling stars, and shockwave rings.
 const effects=[],ringGeo=new T.PlaneGeometry(1,1),shockGeo=new T.RingGeometry(.86,1,40);
 function decal(x,y,z,r,color,opacity){const m=new T.Mesh(ringGeo,new T.MeshBasicMaterial({map:runeTex,color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(x,y+.06,z);m.scale.setScalar(r*2);group.add(m);return m;}
 function starfallCast(e){
  const x=e.x,y=e.y,z=e.z,r=e.radius||3.6,d=e.duration||.8,circle=decal(x,y,z,r,'#ffb3e6',0),inner=decal(x,y,z,r*.55,'#ffe28a',0),stars=[];
  const n=reduced?4:8;for(let i=0;i<n;i++){const a=i/n*Math.PI*2+Math.random(),rr=i?Math.sqrt(Math.random())*r*.85:0,tx=x+Math.cos(a)*rr,tz=z+Math.sin(a)*rr;
   const s=new T.Sprite(new T.SpriteMaterial({map:starTex,color:i%2?'#ffe28a':'#ffc2ea',transparent:true,depthWrite:false,blending:T.AdditiveBlending}));s.scale.setScalar(i?.9:1.4);s.visible=false;group.add(s);
   stars.push({s,tx,tz,ty:y,from:new T.Vector3(tx-4+Math.random()*2,y+14+Math.random()*3,tz-3+Math.random()*2),at:d*(.35+.65*(i/n))+(i?Math.random()*.08:0),landed:false});}
  if(e.from)burst(e.from.x,e.from.y+.6,e.from.z,PINK,14,{speed:2.2,vy:2,g:-.5,size:.14});
  effects.push({kind:'starfall',t:0,d,x,y,z,r,circle,inner,stars});
 }
 function shock(x,y,z,r,color,life=.45){const m=new T.Mesh(shockGeo,add(color,.9));m.rotation.x=-Math.PI/2;m.position.set(x,y+.08,z);m.scale.setScalar(.2);group.add(m);effects.push({kind:'shock',t:0,d:life,m,r});}
 function flash(x,y,z,color,intensity,life){const l=new T.PointLight(color,0,9,2);l.position.set(x,y,z);group.add(l);effects.push({kind:'flash',t:0,d:life,l,intensity});}
 function starfallLand(e){const r=e.radius||3.6;shock(e.x,e.y,e.z,r*1.15,'#ffd36b',.5);shock(e.x,e.y,e.z,r*.7,'#ff8fd0',.38);flash(e.x,e.y+1.4,e.z,'#ffc2e6',9,.45);
  burst(e.x,e.y+.5,e.z,GOLD,46,{speed:6,vy:3.5,g:-6,size:.2,life:.8});burst(e.x,e.y+.3,e.z,PINK,30,{speed:4.2,flat:true,g:-1,size:.16,life:.7});}
 function emit(e){
  if(!e)return;
  if(e.type==='magicCast'){const dx=e.dirX||0,dz=e.dirZ||0;burst(e.x+dx*.25,e.y,e.z+dz*.25,PINK,8,{speed:1.6,vx:dx*2,vz:dz*2,g:0,size:.12,life:.3});}
  else if(e.type==='starfallCast'){starfallCast(e);if(e.from){const c=decal(e.from.x,e.from.y-.85,e.from.z,1.1,'#ffd36b',.0);effects.push({kind:'cast',t:0,d:.6,m:c});}}
  else if(e.type==='starfall')starfallLand(e);
  else if(e.type==='autoAssist'&&e.kind==='heal'){for(let i=0;i<(reduced?8:18);i++){const a=i*.9;spark(e.x+Math.cos(a)*.5,e.y+.1+i*.06,e.z+Math.sin(a)*.5,MINT,{speed:.3,vy:1.6,g:.4,drag:.5,size:.13,life:.9});}}
  else if(e.type==='cat'&&e.to){burst(e.to.x,(e.to.y||0)+.5,e.to.z,GOLD,10,{speed:2.6,size:.12});}
 }
 const tmp=new T.Vector3();
 function update(view,dt,camera){
  const live=new Set();
  for(const p of view?.projectiles||[]){if(!p.magic||p.dead||p.life<=0)continue;live.add(p.id);let o=orbs.get(p.id);if(!o){o=orb();o.userData.last.set(p.x,p.y,p.z);orbs.set(p.id,o);}
   o.position.set(p.x,p.y,p.z);const u=o.userData;u.t+=dt;u.shell.rotation.set(u.t*6,u.t*4,0);u.core.rotation.set(-u.t*5,u.t*7,0);u.star.material.rotation=u.t*5;u.halo.scale.setScalar(1.8+.25*Math.sin(u.t*30));
   // Trail: sparkles along the segment travelled this frame.
   tmp.set(p.x,p.y,p.z);const steps=reduced?1:3;for(let i=0;i<steps;i++){const k=i/steps;spark(u.last.x+(tmp.x-u.last.x)*k,u.last.y+(tmp.y-u.last.y)*k,u.last.z+(tmp.z-u.last.z)*k,i%2?PINK:VIOLET,{speed:.35,g:.2,drag:3,size:.2,life:.4});}u.last.copy(tmp);}
  for(const [id,o] of orbs)if(!live.has(id)){const p=o.position;burst(p.x,p.y,p.z,PINK,16,{speed:3.2,g:-2,size:.14});flash(p.x,p.y,p.z,'#ff9ad6',3,.18);group.remove(o);o.traverse(c=>c.material?.dispose());orbs.delete(id);}
  for(let i=effects.length-1;i>=0;i--){const f=effects[i];f.t+=dt;const k=Math.min(1,f.t/f.d);
   if(f.kind==='starfall'){
    f.circle.material.opacity=Math.min(1,f.t*4)*(k<1?.95:Math.max(0,1-(f.t-f.d)*3));f.circle.rotation.z=f.t*1.4;f.inner.material.opacity=f.circle.material.opacity*.8;f.inner.rotation.z=-f.t*2.2;const pulse=1+.04*Math.sin(f.t*24);f.circle.scale.setScalar(f.r*2*pulse);
    for(const s of f.stars){const q=Math.min(1,f.t/s.at);s.s.visible=f.t>s.at*.25&&!s.landed;if(s.s.visible){const e=(q-.25)/.75,ee=Math.max(0,e)*Math.max(0,e);s.s.position.set(s.from.x+(s.tx-s.from.x)*ee,s.from.y+(s.ty+.4-s.from.y)*ee,s.from.z+(s.tz-s.from.z)*ee);s.s.material.rotation+=dt*8;spark(s.s.position.x,s.s.position.y,s.s.position.z,GOLD,{speed:.25,g:0,drag:2,size:.2,life:.35});}
     if(q>=1&&!s.landed){s.landed=true;burst(s.tx,s.ty+.3,s.tz,GOLD,10,{speed:3,vy:2.5,g:-5,size:.15});shock(s.tx,s.ty,s.tz,1,'#ffe28a',.3);}}
    if(f.t>f.d+.35){for(const m of [f.circle,f.inner,...f.stars.map(s=>s.s)]){group.remove(m);m.material.dispose();}effects.splice(i,1);}
    continue;}
   if(f.kind==='cast'){f.m.material.opacity=Math.sin(k*Math.PI)*.95;f.m.rotation.z=f.t*3;f.m.scale.setScalar(1.6+k*.8);}
   else if(f.kind==='shock'){f.m.scale.setScalar(.2+f.r*(1-(1-k)*(1-k)));f.m.material.opacity=.9*(1-k);}
   else if(f.kind==='flash')f.l.intensity=f.intensity*(1-k);
   if(k>=1){const m=f.m||f.l;group.remove(m);m.material?.dispose();m.dispose?.();effects.splice(i,1);}
  }
  for(let i=0;i<CAP;i++){const p=parts[i];if(p.life>0){p.life-=dt;const dr=Math.exp(-p.drag*dt);p.vx*=dr;p.vz*=dr;p.vy=p.vy*dr+p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}
   const a=Math.max(0,p.life/p.max);pos[i*3]=p.x;pos[i*3+1]=p.y;pos[i*3+2]=p.z;col[i*3]=p.c.r;col[i*3+1]=p.c.g;col[i*3+2]=p.c.b;size[i]=p.s*(.5+a*.5);alpha[i]=p.life>0?Math.min(1,a*1.6):0;}
  for(const k of ['position','color','size','alpha'])pg.attributes[k].needsUpdate=true;
  // The scene renders 320 px tall, so size is in world units projected onto that buffer.
  if(camera)pm.uniforms.scale.value=160/Math.tan((camera.fov||50)*Math.PI/360);
 }
 function reset(){for(const [,o] of orbs)group.remove(o);orbs.clear();for(const f of effects)for(const m of [f.m,f.l,f.circle,f.inner,...(f.stars||[]).map(s=>s.s)])if(m)group.remove(m);effects.length=0;for(const p of parts)p.life=0;}
 return{emit,update,reset};
}
root.HatMagicFX={create};
})(typeof globalThis!=='undefined'?globalThis:this);
