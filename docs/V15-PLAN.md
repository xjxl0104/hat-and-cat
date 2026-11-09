# Enemy motion implementation plan — v15

Goal: address the user's remaining stiff enemy motion in the existing small area. Preserve heroine, companion, controls, terrain, open art assets, music and damage values. Adjust guard reach to the actual sword and add readable strike time before contact.

Source findings: regular enemies cycle two to four billboard frames and rotate/scale the whole sheet; Warden limbs are camera-facing planes. AI resolves damage immediately at windup end and switches directly to recovery, while a separate visual attackTimer starts. This permits snapping and contact before a readable strike.

User instruction overrides runtime/TDD workflows: no browser, game, server, rendering, tests or simulated game modules. Static reads, syntax compilation and resource packaging only. Do not claim observed animation quality or frame rate.

## Work and interfaces

- [x] Create isolated v15 from the exact v14 packaged source list. Preserve old outputs.
- [x] Enemy rig owner: enemy-rig-kit.js builds bounded merged pixel parts; pixel-enemies.js implements guard, archer, bat with actual articulated limbs, weapon/bow/wing movement, distance-based gait, terrain feet and directional reactions.
- [x] Boss owner: pixel-warden.js adds independent head, torso, hips, arms, boots, sword, shield and cape with charge/sweep/thrust/stomp/return poses and continuous recovery.
- [x] Timing owner: enemy-ai.js owns strike phase, strikeId, strikeElapsed, strikeDuration, strikeContact, moveId; contact resolves once inside actual motion. engine.js clears canceled strikes. render-state.js interpolates same-strike clocks.
- [x] Root: actors.js routes active enemy types to articulated rigs while retaining health/status UI and compatible legacy fallback. Shared factory create({THREE,scene,kind}) returns update(enemy,game,dt), dispose(), optional emit and getBladeSegment.
- [x] Root: battle-fx.js samples actual enemy weapon endpoints; warning remains through precontact strike. No replacement whole-screen effects or growing generic sword rings.
- [x] Cross-review phase transitions, cancellation, hitstop, pose blending, physical contact and disposal. Syntax compile, embed resources, preserve v14 hashes, create HTML/ZIP/HANDOFF with runtime limitations.

Kit contract: HatEnemyRigKit.create({THREE,scene}) -> root (Group already in scene), material (opaque vertex-color lit material), group(parent,x,y,z), blocks(parent,boxList), dispose. Box entries [x,y,z,w,h,d,colorHex]. Rig roots use exact actor world position; body-local +Z forward, yaw atan2(dirX,dirZ). Mesh pieces are made once, not every frame.

Blade contract: stable {base,tip:Vector3,visible,active,attackId,kind,progress}; router adds entityId. attackId is strikeId only (zero after cancellation). dt=0 preserves pose/clock except a newly received contact, reaction or cancellation, which may resample the authoritative pose once without advancing clocks. No quaternion interpolation with a destination aliased as its own target. No independent visual root lunges.

