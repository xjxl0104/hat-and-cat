/* Asset conversion only: never imports or executes game code. Node built-ins. */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const base=path.resolve(__dirname,'..'),assetRoot=path.join(base,'assets','kenney');
const previousManifest=fs.existsSync(path.join(assetRoot,'manifest.json'))?JSON.parse(fs.readFileSync(path.join(assetRoot,'manifest.json'),'utf8')):null;
const selected={
 'castle-kit':['wall-half','wall-pillar','wall','tower-square-mid-windows','tower-square-top','tower-square-arch','tower-square-base-border','flag-banner-long'],
 'nature-kit':['tree_oak_fall','tree_detailed_dark','tree_pineTallA_detailed','grass_large','plant_bushSmall','rock_largeA','rock_largeC','rock_tallA','cliff_rock','statue_columnDamaged','hanging_moss']
};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function png(file){
 const b=fs.readFileSync(file);let p=8,w,h,depth,type,palette,parts=[];
 while(p<b.length){const n=b.readUInt32BE(p),t=b.toString('ascii',p+4,p+8),d=b.subarray(p+8,p+8+n);p+=n+12;if(t==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);depth=d[8];type=d[9];}if(t==='PLTE')palette=d;if(t==='IDAT')parts.push(d);}
 if(depth!==8||![2,3,6].includes(type))throw Error('Unsupported source PNG '+type+'/'+depth);
 const channels=type===6?4:type===2?3:1,stride=w*channels,raw=zlib.inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(h*stride);
 const paeth=(a,b,c)=>{const q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<h;y++){const filter=raw[y*(stride+1)];for(let x=0;x<stride;x++){const a=x>=channels?pixels[y*stride+x-channels]:0,u=y?pixels[(y-1)*stride+x]:0,c=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0;pixels[y*stride+x]=(raw[y*(stride+1)+x+1]+(filter===1?a:filter===2?u:filter===3?Math.floor((a+u)/2):filter===4?paeth(a,u,c):0))&255;}}
 return (u,v)=>{const x=Math.max(0,Math.min(w-1,Math.floor(u*w))),y=Math.max(0,Math.min(h-1,Math.floor((1-v)*h))),i=y*stride+x*channels;if(type===3){const k=pixels[i]*3;return [...palette.subarray(k,k+3)].map(v=>v/255);}return [...pixels.subarray(i,i+3)].map(v=>v/255);};
}
function convert(obj,mtl){
 const vertices=[],uvs=[],positions=[],colors=[],normals=[],mat={};let current='';
 for(const line of mtl.split(/\r?\n/)){const [key,...v]=line.trim().split(/\s+/);if(key==='newmtl'){current=v.join(' ');mat[current]={rgb:[.6,.6,.6]};}else if(key==='Kd'&&mat[current])mat[current].rgb=v.map(Number);else if(key==='map_Kd'&&mat[current])mat[current].texture=png(path.join(path.dirname(obj),v.join(' ')));}
 let materialName='';
 for(const line of fs.readFileSync(obj,'utf8').split(/\r?\n/)){
  const [key,...v]=line.trim().split(/\s+/);
  if(key==='v')vertices.push(v.slice(0,3).map(Number));else if(key==='vt')uvs.push(v.slice(0,2).map(Number));else if(key==='usemtl')materialName=v.join(' ');else if(key==='f'){
   const refs=v.map(s=>s.split('/').map(Number)),m=mat[materialName]||{rgb:[.6,.6,.6]};
   for(let j=1;j<refs.length-1;j++){const tri=[refs[0],refs[j],refs[j+1]],pts=tri.map(r=>vertices[r[0]>0?r[0]-1:vertices.length+r[0]]),a=pts[0],b=pts[1],c=pts[2],u=b.map((v,i)=>v-a[i]),w=c.map((v,i)=>v-a[i]),n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],len=Math.hypot(...n)||1;
    for(let k=0;k<3;k++){positions.push(...pts[k]);normals.push(...n.map(v=>Math.round(v/len*10000)/10000));const uv=uvs[tri[k][1]-1];colors.push(...(m.texture&&uv?m.texture(...uv):m.rgb).map(v=>Math.round(v*255)));}
   }
  }
 }
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<positions.length;i++){const a=i%3;min[a]=Math.min(min[a],positions[i]);max[a]=Math.max(max[a],positions[i]);}
 // Unit bounds are centered in X/Z and sit on Y=0, so placement cannot float.
 const size=max.map((v,i)=>v-min[i]),center=[(min[0]+max[0])/2,min[1],(min[2]+max[2])/2];
 for(let i=0;i<positions.length;i++)positions[i]=Math.round((positions[i]-center[i%3])*100000)/100000;
 return {size:size.map(v=>Math.round(v*100000)/100000),positions,normals,colors};
}
const models={},manifest={author:'Kenney',license:'CC0-1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',conversion:'Original triangulated OBJ geometry; bottom centered; original colors sampled/baked as RGB vertex colors. Runtime uses a muted custom material palette.',packs:[],models:[]};
for(const [pack,names] of Object.entries(selected)){
 const packDir=path.join(assetRoot,pack),fullSource=path.join(packDir,'Models','OBJ format'),archive=path.join(assetRoot,pack+'.zip'),retained=path.join(assetRoot,'selected',pack),source=fs.existsSync(path.join(retained,names[0]+'.obj'))?retained:fullSource;fs.mkdirSync(retained,{recursive:true});if(source!==retained)fs.copyFileSync(path.join(packDir,'License.txt'),path.join(retained,'License.txt'));
 manifest.packs.push({name:pack,url:'https://kenney.nl/assets/'+pack,downloadEndpoint:'https://kenney.nl/download-link/'+Buffer.from('assets/'+pack).toString('hex'),archiveSha256:fs.existsSync(archive)?sha(fs.readFileSync(archive)):previousManifest?.packs.find(p=>p.name===pack)?.archiveSha256});
 for(const name of names){const obj=path.join(source,name+'.obj'),mtl=path.join(source,name+'.mtl'),id=pack+'/'+name;models[id]=convert(obj,fs.readFileSync(mtl,'utf8'));if(source!==retained)for(const ext of ['obj','mtl'])fs.copyFileSync(path.join(source,name+'.'+ext),path.join(retained,name+'.'+ext));manifest.models.push({id,sourceObjSha256:sha(fs.readFileSync(obj)),sourceMtlSha256:sha(fs.readFileSync(mtl)),vertices:models[id].positions.length/3,triangles:models[id].positions.length/9,size:models[id].size,usedIn:'src/wilds-world.js'});}
 const tex=path.join(source,'Textures','colormap.png');if(source!==retained&&fs.existsSync(tex)){fs.mkdirSync(path.join(retained,'Textures'),{recursive:true});fs.copyFileSync(tex,path.join(retained,'Textures','colormap.png'));}
}
const output="/* Kenney CC0 geometry; see assets/kenney/manifest.json and retained licenses. */\n(function(root){'use strict';root.HatArtAssets="+JSON.stringify(models)+";})(typeof globalThis!=='undefined'?globalThis:this);\n";
fs.writeFileSync(path.join(base,'src','asset-library.js'),output);manifest.generatedSha256=sha(Buffer.from(output));fs.writeFileSync(path.join(assetRoot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({models:manifest.models.length,triangles:manifest.models.reduce((n,a)=>n+a.triangles,0),generatedBytes:Buffer.byteLength(output),sizes:manifest.models.map(({id,size})=>({id,size}))},null,2));
