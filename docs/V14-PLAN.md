# 暮丘遗迹 implementation plan

Goal: replace the flat primitive scenery with licensed castle/nature art, real walkable height differences, coherent lighting, continuous sword motion and recovering shoulder camera.

Architecture: a single HatTerrain grid owns rendered triangles, support heights, terrain occlusion and projectile contact. HatWilds supplies world elevations. Obstacles always store base y and relative height. Offline assets are selected from primary Kenney CC0 packages, converted to bounded reusable geometry, and embedded in the distributable HTML. Preserve the existing controls, combat timing, pixel heroine and cat.

User constraint: do not launch the game, browser, server, renderer, tests or module simulations. Perform source review, syntax compilation and asset/package integrity inspection only. Runtime appearance and gameplay remain explicitly unverified.

## Responsibilities and sequence

- [x] Trace flat-ground, camera and unlit-material assumptions in v13 source. Copy to isolated v14 directory; preserve existing deliverables.
- [x] Define and implement HatTerrain: bounds, cell, nx, nz, heights, heightAt(x,z), normalAt(x,z,out), segmentContact(a,b,padding). Grid triangles a,c,b and b,c,d; piecewise planar heightAt uses matching diagonal.
- [x] Rebase spawn, objects, gates and enemies in wilds-data. Obstacles extend down to lowest sampled footprint but retain their original top height above their centre.
- [x] Engine owner: update ground support, actors, AI, cat motion, box vertical ranges, projectiles and terrain LOS. Keep airborne state separate from terrain elevation; movement on slopes must remain grounded.
- [x] Asset owner: download official licensed source packs; retain license and source hashes. Use real selected meshes for architecture, foliage and rocks. Build terrain mesh directly from shared samples. Keep physical occluders aligned with authoritative boxes.
- [x] Camera owner: remove gameplay-bound clipping, handle pivot overlap/corners and blocked boom recovery, add terrain clearance, investigate stale pointer movement and lock transitions.
- [x] Root: blend current articulated transforms into windup and recovery without modifying hit timing; enable modest directional shadows and light-responsive pixel materials. Conform warning geometry and local ground effects to terrain.
- [x] Root: embed assets/licenses, update title, player instructions and handoff. Static syntax compilation only; inspect all integration call sites and output archive hashes. Report remaining runtime limitations.

## Art direction

Warm evening rim on weathered, cool stone; dark desaturated grass and layered rock. A lower meadow/hollow rises along a clear pilgrimage route to a chapel at 4.8 m. Eastern relic terrace rises another 2.4 m locally. Reuse a small set of actual castle and nature meshes with a restrained common palette. Keep open fighting lanes and no screen-wide flashes or expensive postprocessing.

## Acceptance by source review

Every world height consumer uses HatTerrain or an explicitly elevated obstacle top. No y=0 floor collision remains in the current area. Query boxes and art share bases and extents. All active scripts parse. Every external asset referenced by the final HTML is embedded; license text and asset provenance travel with the source archive. No claim of visual/gameplay validation without running the game.

