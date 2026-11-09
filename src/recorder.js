(function(root){
  'use strict';
  // Real-time capture only: the caller renders immediately after renderer.render().
  // No simulation stepping, playback acceleration, microphone, or camera access.
  function create({canvas,audio,getState,notify=()=>{}}){
    const composite=document.createElement('canvas');composite.width=1280;composite.height=720;
    const ctx=composite.getContext('2d',{alpha:false});
    let session=null,pending=false,generation=0,lastCompletion=Promise.resolve(null),objectUrl=null;
    let panel,status,pauseButton,link;
    const now=()=>root.performance.now();
    const say=message=>{try{notify(message);}catch(_) {}};
    function ui(){
      if(panel)return;
      panel=document.createElement('div');panel.id='record-controls';panel.setAttribute('aria-label','真实录像控制');
      Object.assign(panel.style,{position:'fixed',right:'12px',bottom:'12px',zIndex:'1000',background:'#10232f',color:'#fff2d3',padding:'10px',border:'1px solid #b8a776',borderRadius:'5px',font:'14px sans-serif',display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap',maxWidth:'calc(100vw - 24px)'});
      status=document.createElement('span');status.setAttribute('role','status');panel.appendChild(status);
      function button(label,action){const b=document.createElement('button');b.type='button';b.textContent=label;Object.assign(b.style,{padding:'6px 10px',background:'#35525d',color:'#fff2d3',border:'1px solid #82968f',borderRadius:'3px',font:'inherit'});b.addEventListener('click',action);panel.appendChild(b);return b;}
      pauseButton=button('暂停录制',()=>isPaused()?resume():pause());
      button('结束并下载',()=>stop());button('取消录制',()=>cancel());
      document.body.appendChild(panel);
      link=document.getElementById('record-download');
      if(!link){link=document.createElement('a');link.id='record-download';document.body.appendChild(link);}
      link.textContent='下载真实游戏录像（含音频）';link.hidden=true;
      Object.assign(link.style,{position:'fixed',right:'12px',bottom:'12px',zIndex:'1000',padding:'12px 16px',background:'#173c42',color:'#ffdf8a',border:'1px solid #b8a776',borderRadius:'4px',font:'15px sans-serif'});
    }
    function elapsed(s){return s.elapsed+(s.recorder.state==='recording'?now()-s.segmentStart:0);}
    function arm(s){clearTimeout(s.timer);s.timer=setTimeout(()=>{if(session===s)stop();},Math.max(0,s.duration-elapsed(s)));}
    function isRecording(){return pending||!!session;}
    function isPaused(){return !!session&&session.recorder.state==='paused';}
    function clean(s){clearTimeout(s.timer);for(const track of s.ownedTracks){try{track.stop();}catch(_) {}}}
    function finalize(s){
      if(s.finalized)return;s.finalized=true;clean(s);
      if(session===s)session=null;
      if(panel)panel.hidden=true;
      if(s.cancelled){s.resolve(null);say('录像已取消');return;}
      const blob=new Blob(s.chunks,{type:s.recorder.mimeType||s.mimeType});
      if(!blob.size){s.resolve(null);say('未获得录像数据，请重新录制');return;}
      if(objectUrl)root.URL.revokeObjectURL(objectUrl);
      objectUrl=root.URL.createObjectURL(blob);link.href=objectUrl;link.download='草帽与猫-真实试玩-'+new Date().toISOString().replace(/[:.]/g,'-')+'.webm';link.hidden=false;
      say('真实录像已完成，可点击下载');s.resolve(blob);
      // A local development evidence sink only. Never upload on file/public/localhost hosts.
      if(root.location?.hostname==='127.0.0.1'&&typeof root.fetch==='function'){
        root.fetch('/__proof',{method:'POST',headers:{'Content-Type':blob.type||'video/webm'},body:blob}).then(response=>{
          if(!response.ok)throw new Error('HTTP '+response.status);
          say('真实录像已保存到本地验收目录');
        }).catch(()=>say('本地自动保存失败；仍可点击下载录像'));
      }
    }
    async function start(seconds=20){
      if(isRecording())return false;
      const duration=Number(seconds)*1000;
      if(!Number.isFinite(duration)||duration<=0){say('录制时长必须大于零');return false;}
      if(!ctx||!root.MediaRecorder||!root.MediaStream||typeof composite.captureStream!=='function'){say('此浏览器不支持真实画面录制，请使用新版 Chrome 或 Edge');return false;}
      const types=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus'];
      const mimeType=types.find(type=>root.MediaRecorder.isTypeSupported(type));
      if(!mimeType){say('此浏览器不支持带 Opus 音频的 WebM 录制');return false;}
      pending=true;const token=++generation;let ownedTracks=[];
      try{
        // The audio mixer owns its original stream. Only clones belong to this recorder.
        const audioStream=await audio?.getCaptureStream?.();
        if(token!==generation)return false;
        const sourceTracks=audioStream?.getAudioTracks?.().filter(t=>t.readyState!=='ended')||[];
        if(!sourceTracks.length)throw new Error('游戏音轨尚未就绪，请先开启游戏声音');
        if(!(canvas?.width>0&&canvas?.height>0))throw new Error('游戏画面尚未就绪');
        ui();
        const audioTracks=sourceTracks.map(track=>{const copy=track.clone();ownedTracks.push(copy);return copy;});
        const videoStream=composite.captureStream(30),videoTracks=videoStream.getVideoTracks();
        ownedTracks.push(...videoStream.getTracks());
        if(!videoTracks.length)throw new Error('未能采集游戏画面');
        const stream=new root.MediaStream([...videoTracks,...audioTracks]);
        const recorder=new root.MediaRecorder(stream,{mimeType,videoBitsPerSecond:6000000,audioBitsPerSecond:160000});
        let resolve;lastCompletion=new Promise(done=>{resolve=done;});
        const s={recorder,mimeType,ownedTracks,chunks:[],duration,elapsed:0,segmentStart:now(),timer:0,cancelled:false,finalized:false,resolve};
        session=s;pending=false;panel.hidden=false;link.hidden=true;pauseButton.textContent='暂停录制';
        recorder.ondataavailable=e=>{if(e.data?.size)s.chunks.push(e.data);};
        recorder.onstop=()=>finalize(s);
        recorder.onerror=()=>{s.cancelled=true;say('录制发生错误，请重试');if(recorder.state!=='inactive')recorder.stop();else finalize(s);};
        render();if(session!==s||s.finalized)return false;
        recorder.start(250);s.segmentStart=now();arm(s);
        say('正在录制真实画面与游戏音频，可继续正常操作');return true;
      }catch(error){
        if(token!==generation)return false;
        if(session){session.cancelled=true;finalize(session);}
        else for(const track of ownedTracks){try{track.stop();}catch(_) {}}
        pending=false;say(error.message||'无法开始录像');return false;
      }
    }
    function stop(){
      if(pending){pending=false;generation++;return Promise.resolve(null);}
      const s=session;if(!s)return lastCompletion;
      clearTimeout(s.timer);
      if(s.recorder.state!=='inactive')s.recorder.stop();else finalize(s);
      return lastCompletion;
    }
    function cancel(){
      if(pending){pending=false;generation++;return Promise.resolve(null);}
      if(!session)return Promise.resolve(null);
      session.cancelled=true;return stop();
    }
    function pause(){const s=session;if(!s||s.recorder.state!=='recording')return false;s.elapsed=elapsed(s);s.recorder.pause();clearTimeout(s.timer);pauseButton.textContent='继续录制';status.textContent='录制已暂停（游戏继续运行）';return true;}
    function resume(){const s=session;if(!s||s.recorder.state!=='paused')return false;s.recorder.resume();s.segmentStart=now();pauseButton.textContent='暂停录制';arm(s);return true;}
    function engineApi(){return root.HatEngine||root.HatGame||{};}
    function perkInfo(state,id){const api=engineApi();return api.getPerkInfo?.(state,id)||api.PERKS?.[id]||{id,name:id};}
    function skillLine(state,id,key,name){
      const cooldown=Math.max(0,Number(id==='cat'?state.catCooldown:state.skillCooldowns?.[id])||0);
      return key+' '+name+' · '+(cooldown>0?'冷却 '+cooldown.toFixed(1)+'s':'就绪');
    }
    function dashLine(state){
      const p=state.player||{};
      return 'Q 闪避 · 25体力 · '+(p.dash?.active?'闪避中':p.stamina>=25?'可用':'体力不足');
    }
    function ownedPerksOverlay(state){
      const perks=Array.isArray(state.perks)?state.perks:[],names=perks.map(id=>perkInfo(state,id).name||id);
      ctx.fillStyle='rgba(6,15,26,.82)';ctx.fillRect(20,174,480,90);
      ctx.font='bold 15px sans-serif';ctx.fillStyle='#ffe2a0';ctx.fillText('已有遗物 · '+perks.length,34,198);
      ctx.font='14px sans-serif';ctx.fillStyle='#d8e5ee';wrap(names.length?names.join(' · '):'尚未获得 · 探索荒庭中的遗物宝箱',34,221,452,19,2);
    }
    function wrap(text,x,y,width,lineHeight,maxLines=3){
      let line='',row=0;
      for(const character of String(text||'')){
        if(line&&ctx.measureText(line+character).width>width){ctx.fillText(line,x,y+row*lineHeight);line='';if(++row>=maxLines)return;}
        line+=character;
      }
      if(line)ctx.fillText(line,x,y+row*lineHeight);
    }
    function upgradeOverlay(state){
      const choices=state.upgradeChoices?.slice(0,3)||[];if(!choices.length)return;
      ctx.fillStyle='rgba(6,15,26,.94)';ctx.fillRect(260,274,760,276);ctx.font='bold 22px sans-serif';ctx.fillStyle='#ffe2a0';ctx.fillText('荒庭遗物 · 选择一项',284,310);
      for(let i=0;i<choices.length;i++){
        const id=choices[i],info=perkInfo(state,id),x=284+i*242;
        const partners=Array.isArray(info.synergyNames)?info.synergyNames:(info.synergies||[]).filter(partner=>state.perks?.includes(partner)).map(partner=>perkInfo(state,partner).name||partner);
        ctx.fillStyle='#203b46';ctx.fillRect(x,332,224,194);ctx.fillStyle='#ffe2a0';ctx.font='bold 18px sans-serif';ctx.fillText((i+1)+'. '+(info.name||id),x+12,360,200);
        ctx.font='14px sans-serif';ctx.fillStyle='#d9dfd7';wrap(info.description||info.nextDescription||'',x+12,389,200,19,4);
        ctx.font='13px sans-serif';ctx.fillStyle='#c8efd8';wrap(partners.length?'连携：'+partners.join('、'):'新遗物 · 死亡后保留',x+12,483,200,18,2);
      }
    }
    function render(){
      const s=session;if(!s||s.finalized||s.recorder.state==='paused')return;
      try{
        const state=getState?.()||{},p=state.player||{},boss=state.enemies?.find(e=>e.type==='boss');
        ctx.save();ctx.fillStyle='#060d16';ctx.fillRect(0,0,1280,720);
        const scale=Math.min(1280/canvas.width,720/canvas.height),w=canvas.width*scale,h=canvas.height*scale;
        ctx.imageSmoothingEnabled=false;ctx.drawImage(canvas,(1280-w)/2,(720-h)/2,w,h);
        ctx.fillStyle='rgba(6,15,26,.82)';ctx.fillRect(20,18,390,144);
        ctx.font='bold 19px sans-serif';ctx.fillStyle='#f7eacb';ctx.fillText('草帽与猫 · 剑盾余晖',34,44);
        ctx.font='16px sans-serif';ctx.fillStyle='#c6d6d8';ctx.fillText('武器 '+(p.weaponMode==='bow'?'短弓':'剑与圆盾')+' · C 切换',34,67,362);
        ctx.font='17px sans-serif';ctx.fillStyle='#f7eacb';ctx.fillText('HP '+Math.ceil(Number(p.hp)||0)+' / '+(Number(p.maxHp)||0)+'    连击 '+(Number(state.comboHits)||0),34,94);
        ctx.fillStyle='#263a40';ctx.fillRect(34,106,362,9);ctx.fillStyle='#70dca0';ctx.fillRect(34,106,362*Math.max(0,Math.min(1,(Number(p.hp)||0)/(Number(p.maxHp)||1))),9);
        ctx.font='16px sans-serif';ctx.fillStyle='#d2dfcd';ctx.fillText('体力 '+Math.ceil(Number(p.stamina)||0)+' / 100    余烬 '+(Number(state.coins)||0)+'    药瓶 '+(p.potions||0),34,143,362);
        if(state.bossActive&&boss){ctx.fillStyle='rgba(6,15,26,.82)';ctx.fillRect(426,20,430,55);ctx.fillStyle='#f7d1af';ctx.font='17px sans-serif';ctx.fillText('守门者  '+Math.ceil(boss.hp)+' / '+boss.maxHp,441,43);ctx.fillStyle='#392834';ctx.fillRect(441,53,400,9);ctx.fillStyle='#ed7067';ctx.fillRect(441,53,400*Math.max(0,Math.min(1,boss.hp/(boss.maxHp||1))),9);}
        ctx.fillStyle='rgba(6,15,26,.82)';ctx.fillRect(882,57,378,109);ctx.font='16px sans-serif';ctx.fillStyle='#bcebea';ctx.fillText(dashLine(state),896,84,350);ctx.fillStyle='#c4d4ff';ctx.fillText(p.weaponMode==='bow'?'左 / 右键 蓄箭，松开发射':p.guardBreakTimer>0?'防御崩溃':p.counterUntil>state.time?'精准格挡 · 左键反击':p.guardActive?'右键 正面举盾':'右键 格挡 · C 换弓',896,115,350);ctx.fillStyle='#ffe0b0';ctx.fillText(skillLine(state,'cat','E','猫咪'),896,146,350);
        ownedPerksOverlay(state);
        if(state.phase==='upgrade')upgradeOverlay(state);
        ctx.fillStyle='rgba(6,15,26,.8)';ctx.fillRect(20,648,1240,55);ctx.font='16px sans-serif';ctx.fillStyle='#d4dfd8';ctx.fillText('WASD 移动 · 左键 挥剑 · 右键 魔法弹 · 空格 翻滚 · Q 流星雨',34,671,1212);
        ctx.font='11px sans-serif';ctx.fillStyle='#97aaa9';ctx.fillText('Original 8-bit score · Pulse lead / Arpeggio / Triangle bass / Noise drums · '+(audio?.getState?.()?.title||'草帽与猫'),34,694);
        const phase={ready:'准备',play:'荒庭探索',rest:'营火休整',paused:'游戏暂停',treasure:'遗物亮相',upgrade:'选择遗物',dead:'余火未熄',won:'守誓终归余晖'}[state.phase]||String(state.phase||'');
        const seconds=(elapsed(s)/1000).toFixed(1);ctx.font='16px sans-serif';ctx.fillStyle='#ffe39c';ctx.fillText(phase+' · REC '+seconds+'s',900,42,350);
        status.textContent='● 录制 '+seconds+' / '+(s.duration/1000)+' 秒';
      }catch(error){cancel();say('画面采集失败：'+(error.message||'未知错误'));}
      finally{ctx.restore();}
    }
    return {start,stop,isRecording,render,pause,resume,isPaused,cancel};
  }
  root.HatRecorder={create};
})(typeof window!=='undefined'?window:globalThis);

