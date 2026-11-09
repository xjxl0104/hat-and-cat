# Kenney source assets

These are actual model sources downloaded from the original author, not procedural stand-ins.

- Castle Kit 2.0: https://kenney.nl/assets/castle-kit
- Nature Kit 2.1: https://kenney.nl/assets/nature-kit
- Fantasy Town Kit 2.0: https://kenney.nl/assets/fantasy-town-kit (added 2026-11-09 for the map detail pass)
- Author: Kenney, https://kenney.nl
- License: Creative Commons Zero / CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/

`selected/castle-kit/License.txt`, `selected/nature-kit/License.txt` and `selected/fantasy-town-kit/License.txt` preserve the packs' original license notices. Selected OBJ/MTL files and Castle Kit's original color atlas are retained unchanged. `manifest.json` records the official source URLs, official download endpoints, SHA-256 hashes of both original ZIP downloads, hashes of each selected OBJ and MTL, and the generated library hash.

The scene uses all 19 selected models: eight castle wall, pillar, window, arch, tower and banner models; eleven nature tree, grass, bush, rock, cliff, column and moss models. Their combined source geometry contains 4,248 triangles. Repeated models are instanced. Decorative trees remain out of camera ray lists; nearby solid border geology is camera-only. Gameplay solids always come from `HatWilds` / engine obstacles.

## Offline conversion

From the project directory, run `node tools/convert-kenney.cjs`. This tool only reads assets and writes `src/asset-library.js` and `manifest.json`; it never imports or runs the game. It works using these retained selected files alone. Full downloaded pack folders, if present, are accepted as an alternative source.

Conversion triangulates original OBJ faces, preserves their geometry and flat normals, samples the original material colors, and centers the models in X/Z with the base at Y=0. At scene construction, those colors are remapped to a restrained dusk palette. `src/wilds-world.js` scales each model using its recorded source dimensions and batches repeated placements with `THREE.InstancedMesh`.

Load `src/asset-library.js` before `src/wilds-world.js`. The generated library is plain local JavaScript (`HatArtAssets`); no runtime download, texture request, OBJ loader, GLTF loader, or server is required.

For a fresh original download, visit the official pack page and select Download / Continue without donating. The author's signed-download endpoint requires the same browsing session and same-origin referrer. No authentication or payment is needed.
