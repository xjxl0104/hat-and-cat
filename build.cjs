const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname,out=path.resolve(process.argv[2]||path.join(root,'dist')),bundle=path.join(out,'草帽与猫-暮丘遗迹-v15.html');
const read=name=>fs.readFileSync(path.join(root,name),'utf8'),base64=name=>fs.readFileSync(path.join(root,name)).toString('base64'),safe=code=>code.replace(/<\/script/gi,'<\\/script');
let html=read('index.html');
const css=read('style.css').replaceAll('assets/fusion-pixel.woff2','data:font/woff2;base64,'+base64('assets/fusion-pixel.woff2'));
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>');
let compiled=0;
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,name)=>{const code=read(name);new vm.Script(code,{filename:name});compiled++;return '<script>'+safe(code)+'</script>';});
for(const name of ['hero-v3.png','cat-v3.png','enemies-v3.png','creatures-v1.png'])html=html.replaceAll('assets/'+name,'data:image/png;base64,'+base64('assets/'+name));
for(const name of ['gate-chip-v1.mp3','tide-chip-v1.mp3','spire-chip-v1.mp3','boss-chip-v1.mp3'])html=html.replaceAll('assets/audio/'+name,'data:audio/mpeg;base64,'+base64('assets/audio/'+name));
function textTree(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).map(e=>e.isDirectory()?textTree(dir+'/'+e.name):read(dir+'/'+e.name)).join('\n');}
const license=['vendor/THREE-LICENSE.txt','vendor/THREE-QUARKS-LICENSE.txt','assets/Fusion-Pixel-OFL.txt','assets/audio/CHIPTUNE-NOTES.txt','assets/kenney/selected/castle-kit/License.txt','assets/kenney/selected/nature-kit/License.txt','assets/kenney/manifest.json'].map(read).join('\n')+'\n'+textTree('assets/Fusion-Pixel-LICENSES');
html=html.replace('</body>','<script type="text/plain" id="third-party-licenses">'+safe(license)+'</script></body>');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(bundle,html);
console.log(JSON.stringify({bundle,bytes:Buffer.byteLength(html),compiledScripts:compiled,scene:'shared hilly terrain with embedded Kenney CC0 castle/nature geometry',execution:'syntax compilation and asset packaging only; no game execution'},null,2));


