(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HatAudio = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';
  // Local files are deliberately literal strings so a single-file build can
  // replace them with data URLs. create({urls}) / HAT_AUDIO_URLS also override them.
  const TRACKS = Object.freeze({
    gate: { url: 'assets/audio/gate-chip-v1.mp3', title: 'Lanterns at the Iron Gate', cue: 0 },
    tide: { url: 'assets/audio/tide-chip-v1.mp3', title: 'The Pump Below the Tide', cue: 0 },
    spire: { url: 'assets/audio/spire-chip-v1.mp3', title: 'Waltz of the Astral Spire', cue: 0 },
    boss: { url: 'assets/audio/boss-chip-v1.mp3', title: 'The Clockwork Pursuer', cue: 0 }
  });
  const LEVEL_TRACKS = ['gate', 'tide', 'spire'];
  const SCENES = { explore: .43, combat: .49, boss: .53, win: .31 };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function create(options) {
    options = options || {};
    let ctx = options.context || null, offline = false, initialized = false, unlocked = false;
    let music = true, sfx = true, paused = false, scene = 'explore', level = 0;
    let master, compressor, musicBus, sfxBus, reverbSend, capture, white, brown;
    let activeTrack = null, unlockPromise = null, activeVoices = 0, effectCount = 0;
    const tracks = {}, lastEffects = new Map(), errors = [];
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const between = (a, b) => a + (b - a) * random();
    const remember = error => { const text = String(error?.message || error); if (!errors.includes(text)) errors.push(text); };

    function ramp(param, value, seconds) {
      const now = ctx.currentTime;
      if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
      else { param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); }
      param.linearRampToValueAtTime(value, now + seconds);
    }

    function noiseBuffer(color) {
      const buffer = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const data = buffer.getChannelData(c); let previous = 0;
        for (let i = 0; i < data.length; i++) {
          const value = random() * 2 - 1;
          previous = (previous + value * .025) / 1.025;
          data[i] = color === 'brown' ? previous * 3.4 : value;
        }
      }
      return buffer;
    }

    function initialize() {
      if (initialized) return true;
      try {
        if (!ctx) { const Context = root.AudioContext || root.webkitAudioContext; if (!Context) throw Error('Web Audio is unavailable'); ctx = new Context({ latencyHint: 'interactive' }); }
        offline = typeof ctx.startRendering === 'function';
        master = ctx.createGain(); master.gain.value = .82;
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -9; compressor.knee.value = 12; compressor.ratio.value = 7;
        compressor.attack.value = .003; compressor.release.value = .16;
        compressor.connect(master); master.connect(ctx.destination);
        musicBus = ctx.createGain(); musicBus.gain.value = music ? 1 : 0; musicBus.connect(compressor);
        sfxBus = ctx.createGain(); sfxBus.gain.value = sfx ? .72 : 0; sfxBus.connect(compressor);
        const reverb = ctx.createConvolver(), impulse = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * .74), ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const data = impulse.getChannelData(c);
          for (let i = 0; i < data.length; i++) { const t = i / data.length; data[i] = i < ctx.sampleRate * .018 ? 0 : (random() * 2 - 1) * Math.pow(1 - t, 3.7) * .32; }
        }
        reverb.buffer = impulse; reverb.normalize = false;
        reverbSend = ctx.createGain(); reverbSend.gain.value = .095;
        reverbSend.connect(reverb); reverb.connect(sfxBus);
        white = noiseBuffer('white'); brown = noiseBuffer('brown');
        initialized = true;
        return true;
      } catch (error) { remember(error); return false; }
    }

    function trackFor(key) {
      if (tracks[key]) return tracks[key];
      const urls = options.urls || root.HAT_AUDIO_URLS || {}, data = TRACKS[key];
      const element = new root.Audio(urls[key] || data.url);
      element.preload = 'auto'; element.loop = true; element.volume = 1;
      const gain = ctx.createGain(); gain.gain.value = 0;
      const source = ctx.createMediaElementSource(element); source.connect(gain); gain.connect(musicBus);
      const track = tracks[key] = { key, element, gain, source, first: true, stopTimer: 0 };
      element.addEventListener('error', () => remember('Could not load music: ' + data.title));
      return track;
    }

    function updateMusicBus() { if (initialized) ramp(musicBus.gain, music ? (paused ? .16 : 1) : 0, .18); }

    function selectMusic() {
      if (!initialized || !unlocked || offline) return Promise.resolve(false);
      try {
        const key = scene === 'boss' ? 'boss' : LEVEL_TRACKS[level];
        const volume = SCENES[scene], next = trackFor(key);
        clearTimeout(next.stopTimer);
        if (activeTrack && activeTrack !== next) {
          const old = activeTrack; ramp(old.gain.gain, 0, .8);
          clearTimeout(old.stopTimer);
          old.stopTimer = setTimeout(() => { if (activeTrack !== old) old.element.pause(); }, 880);
        }
        activeTrack = next;
        if (next.first) { next.first = false; try { next.element.currentTime = TRACKS[key].cue; } catch (_) {} }
        ramp(next.gain.gain, volume, .65); updateMusicBus();
        if (!next.element.paused) return Promise.resolve(true);
        return Promise.resolve(next.element.play()).then(() => true, error => { remember(error); return false; });
      } catch (error) { remember(error); return Promise.resolve(false); }
    }

    function unlock() {
      if (unlockPromise) return unlockPromise;
      if (!initialize()) return Promise.resolve(false);
      unlocked = true;
      // Both resume and media play are invoked synchronously in the click call.
      let resume;
      try { resume = offline || ctx.state === 'running' ? Promise.resolve() : ctx.resume(); }
      catch (error) { remember(error); unlocked = false; return Promise.resolve(false); }
      const playback = selectMusic();
      unlockPromise = Promise.allSettled([resume, playback]).then(results => {
        if (results[0].status === 'rejected') { remember(results[0].reason); unlocked = false; }
        if (!offline && ctx.state !== 'running') unlocked = false;
        unlockPromise = null;
        return unlocked;
      });
      return unlockPromise;
    }

    function duck(strength, duration) {
      if (!music || paused || offline) return;
      const now = ctx.currentTime, param = musicBus.gain;
      if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now); else param.cancelScheduledValues(now);
      param.linearRampToValueAtTime(1 - strength, now + .012);
      param.setValueAtTime(1 - strength, now + .055);
      param.linearRampToValueAtTime(1, now + duration);
    }

    function layer(source, settings) {
      if (activeVoices > 90) return;
      const now = ctx.currentTime + Math.max(0, settings.delay || 0), duration = settings.duration, gain = ctx.createGain();
      const filter = ctx.createBiquadFilter(); filter.type = settings.filter || 'lowpass';
      filter.frequency.setValueAtTime(settings.frequency || 14000, now);
      if (settings.endFrequency) filter.frequency.exponentialRampToValueAtTime(Math.max(20, settings.endFrequency), now + duration);
      filter.Q.value = settings.q || .7;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (pan.pan) pan.pan.value = clamp(settings.pan || 0, -1, 1);
      const attack = Math.min(settings.attack || .004, duration * .2);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(settings.volume, now + attack);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      gain.gain.linearRampToValueAtTime(0, now + duration + .008);
      source.connect(filter); filter.connect(gain); gain.connect(pan); pan.connect(sfxBus);
      if (settings.wet !== false) pan.connect(reverbSend);
      activeVoices++;
      source.onended = () => { activeVoices--; source.disconnect(); filter.disconnect(); gain.disconnect(); pan.disconnect(); };
      source.start(now, settings.offset || 0); source.stop(now + duration + .012);
    }

    function noise(duration, volume, frequency, endFrequency, pan, color, q) {
      const source = ctx.createBufferSource(); source.buffer = color === 'brown' ? brown : white; source.loop = true;
      layer(source, { duration, volume, frequency, endFrequency, pan, q, filter: 'bandpass', offset: between(0, 1.5) });
    }

    function oscillator(frequency, endFrequency, duration, volume, pan, shape, delay = 0) {
      const source = ctx.createOscillator(); source.type = shape || 'sine';
      source.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
      if (endFrequency) source.frequency.exponentialRampToValueAtTime(endFrequency, ctx.currentTime + delay + duration);
      layer(source, { duration, volume, pan, frequency: 11000, delay });
    }

    function metal(base, volume, pan, duration) {
      [1, 1.47, 2.31, 3.93, 5.27].forEach((ratio, i) => oscillator(base * ratio, base * ratio * .985, duration / (1 + i * .3), volume / (1 + i * 1.3), pan + between(-.1, .1)));
    }

    function body(volume, pan, heavy) {
      oscillator(heavy ? 130 : 180, heavy ? 39 : 58, heavy ? .22 : .13, volume, pan);
      noise(heavy ? .18 : .095, volume * .65, 480, 115, pan, 'brown');
    }

    function bladeContact(event, pan, intensity, pitch) {
      const counter = !!event.attackCounter, heavy = counter || !!event.heavy || Number(event.combo) >= 3;
      // Dry, short edge + body first; the quiet inharmonic tail identifies steel.
      // The music tracks and their 8-bit mix remain independent of these layers.
      body((counter ? .49 : heavy ? .46 : .29) * intensity, pan, heavy);
      noise(counter ? .055 : heavy ? .065 : .039, (heavy ? .31 : .21) * intensity, (heavy ? 3200 : 4800) * pitch, heavy ? 560 : 1250, pan, 'white', .65);
      noise(heavy ? .15 : .08, heavy ? .15 : .08, heavy ? 900 : 1600, 260, pan, 'brown', .8);
      if (counter) {
        oscillator(820 * pitch, 640 * pitch, .12, .07, pan, 'triangle');
        oscillator(1230 * pitch, 980 * pitch, .085, .035, pan, 'triangle');
      } else metal((heavy ? 285 : event.combo === 2 ? 560 : 490) * pitch, heavy ? .055 : .037, pan, heavy ? .17 : .09);
      duck(counter ? .18 : heavy ? .14 : .07, heavy ? .18 : .1);
    }

    function shieldSound(type, pan, pitch) {
      if (type === 'guardStart') {
        noise(.045, .026, 900, 300, pan, 'brown');
        oscillator(230, 180, .045, .015, pan, 'triangle');
      } else if (type === 'block') {
        // Broad shield clang: lower and less tonal than the precise parry.
        body(.12, pan, false);noise(.038, .19, 5200, 1500, pan, 'white', .9);
        metal(310 * pitch, .085, pan, .19);duck(.07, .11);
      } else if (type === 'parry') {
        noise(.025, .23, 6400, 2600, pan, 'white', .8);
        metal(770 * pitch, .085, pan, .22);
        oscillator(1040, 1480, .095, .048, pan, 'triangle');
        body(.09, pan, false);duck(.12, .16);
      } else {
        // A broken guard falls in pitch, with no bright success chime.
        noise(.12, .24, 850, 130, pan, 'brown', .65);
        noise(.042, .14, 1800, 450, pan, 'white');
        oscillator(150 * pitch, 43, .21, .14, pan, 'triangle');
        metal(140 * pitch, .037, pan, .085);duck(.1, .18);
      }
    }

    function flourish(pan, large) {
      // A small struck-glass chord with inharmonic overtones, not a UI beep.
      const pitches = large ? [329.63, 493.88, 659.25, 830.61] : [659.25, 987.77];
      pitches.forEach((pitch, i) => metal(pitch, .055 / (1 + i * .3), pan + (i - 1) * .11, large ? .72 : .3));
      noise(.25, .075, 3500, 7800, pan, 'white');
    }

    function effect(event) {
      if (!unlocked || !initialized || !sfx || paused) return false;
      if (typeof event === 'string') event = { type: event };
      if (!event || typeof event.type !== 'string') return false;
      const aliases = { slash: 'swing', footstep: 'step', landing: 'land', enemyDeath: 'kill', shatter: 'kill', enemyAttack: 'enemySwing', victory: 'win', bossStart: 'arenaStart', pickupCoin: 'pickup' };
      const type = aliases[event.type] || event.type;
      const allowed = ['magicCast','starfallCast','starfall','attack','swing','hit','hurt','kill','windup','enemySwing','step','land','jump','dodge','cat','heal','pickup','checkpoint','chest','arenaStart','arenaClear','bossPhase','win','death','ui','bolt','nova','projectile','projectileHit','upgrade','stageClear','treasureOpen','treasureReveal','encounterSpawn','bowDraw','windCut','windWhirl','catGuardBlock','guardStart','block','parry','guardBreak','counterStrike','weaponSwap'];
      if (!allowed.includes(type)) return false;
      const now = ctx.currentTime, gap = type === 'step' ? .075 : type === 'hit' ? .018 : .035;
      if (now - (lastEffects.get(type) ?? -Infinity) < gap) return false;
      lastEffects.set(type, now);
      const intensity = clamp(Number(event.intensity) || 1, .35, 1.6);
      const pan = clamp((Number(event.pan) || 0) + between(-.045, .045), -1, 1);
      const heavy = !!event.heavy || !!event.attackCounter || Number(event.combo) >= 3 || ['slam','stomp'].includes(event.attackKind);
      const pitch = between(.91, 1.09), boss = event.targetType === 'boss';
      effectCount++;
      try {
        if (['guardStart','block','parry','guardBreak'].includes(type)) shieldSound(type, pan, pitch);
        else if (type === 'weaponSwap') { noise(.055,.045,1400,450,pan,'brown');oscillator(event.weaponMode==='bow'?260:190,140,.04,.018,pan,'triangle'); }
        else if (type === 'counterStrike') { noise(.06,.085,1300,3800,pan,'white');oscillator(450,670,.07,.028,pan,'triangle'); }
        else if (type === 'treasureOpen') { body(.10,pan,false); noise(.18,.16,420,6200,pan,'white',.8); oscillator(330,990,.2,.055,pan,'triangle'); }
        else if (type === 'treasureReveal') {
          [523.25,783.99,1046.5].forEach((frequency,i)=>{const source=ctx.createOscillator();source.type='triangle';source.frequency.setValueAtTime(frequency,ctx.currentTime+i*.08);layer(source,{duration:.34,delay:i*.08,volume:.045/(1+i*.2),pan,frequency:4500,attack:.008});});
          duck(.1,.35);
        }
        else if (type === 'encounterSpawn') { noise(.35,.12,1000,170,pan,'brown');if(event.boss)body(.4,pan,true); }
        else if (type === 'bowDraw') { noise(.16,.055,350,1100,pan,'brown',1.4);oscillator(140,220,.16,.025,pan,'triangle'); }
        else if (type === 'bolt') { noise(.07,.16,2600,750,pan,'white');oscillator(event.charged?290:370,90,.11,event.charged?.08:.05,pan,'triangle'); }
        else if (type === 'windCut') { noise(.16,.18,600,2300,pan,'brown',.6);metal(510,.025,pan,.12); }
        else if (type === 'magicCast') { oscillator(880*pitch,1320*pitch,.09,.03,pan,'triangle');oscillator(1320*pitch,1760*pitch,.07,.016,pan,'square');noise(.06,.05,5200,2600,pan,'white'); }
        else if (type === 'starfallCast') { [659.25,783.99,987.77,1318.5].forEach((f,i)=>oscillator(f,f*1.01,.16,.03,pan,'triangle',i*.07)); noise(.5,.06,3000,7000,pan,'white',.5); }
        else if (type === 'starfall') { body(.5,pan,true); noise(.45,.34,240,3200,pan,'brown',.4); [1046.5,1318.5,1568].forEach((f,i)=>oscillator(f,f*.98,.3,.03,pan,'triangle',.05+i*.04)); duck(.3,.3); }
        else if (type === 'windWhirl') { noise(.2,.10,1200,400,pan,'brown',.7); }
        else if (type === 'catGuardBlock') { metal(630,.06,pan,.16);oscillator(390,510,.12,.035,pan,'triangle'); }
        else if (type === 'nova') { body(.4,pan,true); noise(.42,.34,240,3600,pan,'brown',.4); metal(420,.10,pan-.2,.45); metal(840,.07,pan+.2,.38); duck(.3,.3); }
        else if (type === 'projectile') { if(event.owner==='enemy'){if(event.kind==='arrow'){noise(.08,.26,3600,900,pan,'white');oscillator(210,75,.075,.08,pan,'triangle');}else if(event.kind==='bossOrb'){body(.42,pan,true);noise(.23,.3,700,180,pan,'brown');}else{noise(.20,.22,1500,3800,pan,'brown',1.8);oscillator(480,280,.13,.05,pan,'sine');}} }
        else if (type === 'projectileHit') { if(event.kind==='bossOrb'){body(.32,pan,true);noise(.3,.24,2200,240,pan,'brown');}else if(event.kind==='water'){noise(.18,.16,2400,600,pan,'white');}else if(event.targetId==='wall'&&event.kind==='arrow'){noise(.065,.2,2500,600,pan,'white');metal(370,.045,pan,.12);}else noise(.055,.10,2200,900,pan,'white'); }
        else if (type === 'upgrade') { flourish(pan,false); }
        else if (type === 'stageClear') { flourish(pan,true); }
        else if (type === 'attack') noise(.045, .035, 950, 420, pan, 'brown');
        else if (type === 'swing') {
          const returning=Number(event.combo)===2;
          noise(heavy ? .18 : returning ? .11 : .095, (heavy ? .38 : .26) * intensity, (heavy ? 330 : returning ? 720 : 520) * pitch, (heavy ? 2200 : 3900) * pitch, pan, 'white', .6);
          noise(heavy ? .1 : .065, heavy ? .17 : .09, heavy ? 1100 : 2700, heavy ? 240 : 850, pan, 'brown');
          oscillator((event.attackCounter?710:heavy?170:540)*pitch,heavy?100:380,heavy?.1:.055,heavy?.035:.017,pan,'triangle');
          duck(heavy ? .13 : .06, .16);
        } else if (type === 'hit') {
          if(event.sourceSkill==='blade'||Number(event.combo)>0||event.attackCounter)bladeContact(event,pan,intensity,pitch);
          else{
            body((heavy ? .42 : .29) * intensity, pan, heavy);
            noise(heavy ? .12 : .07, .2 * intensity, 1800 * pitch, 510, pan, 'white', .55);
            metal((boss ? 275 : 470) * pitch, heavy ? .085 : .055, pan, heavy ? .2 : .11);
            duck(heavy ? .17 : .08, heavy ? .19 : .1);
          }
        } else if (type === 'hurt' || type === 'death') {
          body(type === 'death' ? .58 : .47, pan, true);
          noise(type === 'death' ? .65 : .22, .32, 1100, 80, pan, 'brown');
          metal(160 * pitch, .045, pan, .29); duck(.48, .42);
        } else if (type === 'kill') {
          body(boss ? .58 : .31, pan, boss);
          noise(.35, .4, 2700, 360, pan, 'white', .45);
          metal(750 * pitch, .075, pan - .12, .33); metal(1080 * pitch, .045, pan + .16, .22);
          duck(boss ? .5 : .25, .36);
        } else if (type === 'enemySwing') {
          if(['arrow','water','bossOrb'].includes(event.attackKind)){
            // Projectile emission owns the impact-sized cue; release adds a quiet click.
            noise(.055,.055,event.attackKind==='arrow'?1800:620,900,pan,'white');
          }else if(event.targetType==='slime'){
            oscillator(180,65,.16,.08,pan,'triangle');noise(.14,.15,780,180,pan,'brown');if(event.attackKind==='slimeSlam')body(.22,pan,false);
          }else{
            noise(heavy ? .38 : .18, heavy ? .52 : .31, heavy ? 270 : 390, 2100 * pitch, pan, 'brown', .55);
            metal((event.attackKind==='thrust'?440:240)*pitch,.045,pan,.14);if(heavy){body(.5,pan,true);noise(.28,.27,1700,120,pan,'white');}duck(heavy?.35:.13,.24);
          }
        } else if (type === 'windup') {
          const beat=Number(event.comboIndex)||0,kind=event.attackKind;
          if(event.unblockable){oscillator(165,105,.19,.06,pan,'triangle');metal(230,.034,pan,.16);noise(.12,.055,500,210,pan,'brown');}
          else if(kind==='arrow'){noise(.16,.08,600,1900,pan,'white',1.3);metal(410+beat*90,.025,pan,.13);}
          else if(kind==='water'||event.targetType==='slime'){oscillator(150,260+beat*50,.19,.035,pan,'triangle');noise(.13,.06,420,1050,pan,'brown');}
          else{noise(.18,.085,160,850,pan,'brown');oscillator((heavy?105:250)+beat*60,(heavy?145:330)+beat*80,.12,.03,pan,'triangle');}
        } else if (type === 'step') {
          noise(.065, .14 * intensity, 1500 * pitch, 430, pan, 'white'); body(.09 * intensity, pan, false);
        } else if (type === 'land') {
          body(.28 * intensity, pan, heavy); noise(.15, .24 * intensity, 1700, 240, pan, 'white');
        } else if (type === 'jump') {
          noise(.095, .16, 1250, 2800, pan, 'brown'); body(.085, pan, false);
        } else if (type === 'dodge' || type === 'cat') {
          noise(type === 'cat' ? .15 : .22, .28, 750 * pitch, 3900, pan, 'white', .5);
          noise(.1, .15, 420, 180, pan, 'brown');
        } else if (type === 'chest') { return true; }
        else if (['heal','pickup','checkpoint','arenaClear','win'].includes(type)) {
          flourish(pan, !['pickup','heal'].includes(type));
          if (type !== 'pickup') noise(.35, .08, 500, 2600, pan, 'brown');
        } else if (type === 'arenaStart' || type === 'bossPhase') {
          body(.55, pan, true); metal(102 * pitch, .13, pan, .65);
          noise(.65, .22, 140, 1000, pan, 'brown'); duck(.45, .55);
        } else if (type === 'ui') noise(.035, .09, 1400, 650, pan, 'brown');
        return true;
      } catch (error) { remember(error); return false; }
    }

    function setScene(value) { if (!Object.prototype.hasOwnProperty.call(SCENES, value)) return false; if (scene !== value) { scene = value; selectMusic(); } return true; }
    // Zero-based stage index. Repeated calls from the game loop do no audio work.
    function setLevel(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      const next = clamp(Math.floor(number), 0, LEVEL_TRACKS.length - 1);
      if (level !== next) { level = next; if (scene !== 'boss') selectMusic(); }
      return true;
    }
    function pause(value) { paused = !!value; if (initialized) { updateMusicBus(); ramp(sfxBus.gain, sfx && !paused ? .72 : 0, .08); } return paused; }
    function setMusic(value) { music = !!value; updateMusicBus(); return music; }
    function setSfx(value) { sfx = !!value; if (initialized) ramp(sfxBus.gain, sfx && !paused ? .72 : 0, .08); return sfx; }
    function getCaptureStream() {
      if (!initialize() || offline || !ctx.createMediaStreamDestination) return null;
      if (!capture) { capture = ctx.createMediaStreamDestination(); master.connect(capture); }
      return capture.stream;
    }
    function getState() {
      const key = activeTrack?.key || (scene === 'boss' ? 'boss' : LEVEL_TRACKS[level]);
      return { unlocked, music, sfx, paused, scene, level, title: TRACKS[key].title, musicStyle: '8-bit chiptune',
        contextState: ctx?.state || 'uninitialized', track: activeTrack?.key || null,
        playing: !!activeTrack && !activeTrack.element.paused, musicTime: activeTrack?.element.currentTime || 0,
        effectCount, activeVoices, errors: errors.slice() };
    }
    return { unlock, setScene, setLevel, pause, setMusic, setSfx, effect, getState, getCaptureStream };
  }
  return { create, TRACKS };
});

