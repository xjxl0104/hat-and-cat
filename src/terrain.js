(function(root){'use strict';
// One sampled surface owns both the rendered triangles and all ground queries.
// Grid cells use a,c,b and b,c,d; never interpolate this grid bilinearly.
const bounds={minX:-28,maxX:28,minZ:-32,maxZ:28},cell=2,nx=29,nz=31;
const heights=new Float32Array(nx*nz),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ramp=(v,a,b)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
// Every area shares this grid; switching areas refills the same heights array,
// so modules holding a reference to HatTerrain or its heights stay valid.
const shapes={
 'golden-wake'(x,z){
  const hill=4.8*(1-ramp(z,-12,12));
  const east=2.4*ramp(x,6,13)*(1-ramp(x,23,28))*ramp(z,-9,-3)*(1-ramp(z,9,15));
  const camp=.55*(1-ramp(x,-20,-12))*ramp(z,10,17);
  const hollow=1.05*Math.exp(-((x-5)*(x-5)/80+(z-19)*(z-19)/34));
  const ripple=.12*Math.sin(x*.37)*Math.sin(z*.29)*ramp(z,-13,-5)*(1-ramp(z,22,28));
  return hill+east+camp-hollow+ripple;
 },
 // Chapter one: a moonlit lake in the west, a river running east with one
 // wooden bridge (x 4..10 stays dry), and a low hill holding the moon gate.
 'firefly-lake'(x,z){
  const lake=2.4*(1-ramp(Math.hypot((x+12)/11,(z+1)/8.5),.72,1.08));
  const bridge=ramp(x,2.5,4.5)*(1-ramp(x,9.5,11.5));
  const river=2.1*(1-ramp(Math.abs(z+6),1.6,3.6))*ramp(x,-6,-2)*(1-bridge);
  const hill=2.2*(1-ramp(z,-22,-13))*(1-ramp(Math.abs(x),9,16));
  const rise=.8*ramp(z,18,27)+.5*ramp(Math.abs(x),18,27);
  const ripple=.14*Math.sin(x*.41)*Math.sin(z*.33);
  return hill+rise+ripple-Math.max(lake,river);
 }
};
let current='';
function use(id){if(!shapes[id])throw Error('Unknown terrain '+id);if(id===current)return;current=id;for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++)heights[iz*nx+ix]=shapes[id](bounds.minX+ix*cell,bounds.minZ+iz*cell);}
use('golden-wake');
function sample(x,z){
 const gx=clamp((x-bounds.minX)/cell,0,nx-1),gz=clamp((z-bounds.minZ)/cell,0,nz-1);
 const ix=Math.min(nx-2,Math.floor(gx)),iz=Math.min(nz-2,Math.floor(gz)),u=gx-ix,v=gz-iz,i=iz*nx+ix;
 return {u,v,a:heights[i],b:heights[i+1],c:heights[i+nx],d:heights[i+nx+1]};
}
function heightAt(x,z){const s=sample(x,z);return s.u+s.v<=1?s.a+(s.b-s.a)*s.u+(s.c-s.a)*s.v:s.d+(s.c-s.d)*(1-s.u)+(s.b-s.d)*(1-s.v);}
function normalAt(x,z,out={}){const s=sample(x,z),dx=(s.u+s.v<=1?s.b-s.a:s.d-s.c)/cell,dz=(s.u+s.v<=1?s.c-s.a:s.d-s.b)/cell,n=Math.hypot(dx,1,dz);out.x=-dx/n;out.y=1/n;out.z=-dz/n;return out;}
function segmentContact(a,b,padding=0){
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy,dz)/.35));
 const gap=t=>a.y+dy*t-heightAt(a.x+dx*t,a.z+dz*t)-padding;
 let previous=0,hit=gap(0)<=0?0:null;
 for(let i=1;hit===null&&i<=steps;i++){const t=i/steps;if(gap(t)<=0){let lo=previous,hi=t;for(let j=0;j<9;j++){const mid=(lo+hi)/2;if(gap(mid)>0)lo=mid;else hi=mid;}hit=hi;}previous=t;}
 if(hit===null)return null;
 const x=a.x+dx*hit,z=a.z+dz*hit;return {t:hit,point:{x,y:a.y+dy*hit,z},surfacePoint:{x,y:heightAt(x,z),z},normal:normalAt(x,z),obstacleId:'terrain',obstacle:null};
}
root.HatTerrain={bounds,cell,nx,nz,heights,heightAt,normalAt,segmentContact,use,get area(){return current;}};
})(typeof globalThis!=='undefined'?globalThis:this);
