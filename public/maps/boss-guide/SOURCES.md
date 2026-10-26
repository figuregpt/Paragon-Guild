# Arthion guide map provenance

This guide is a local draft. No deployment or public push is authorized yet.

The Fireland, Red Forest and Mount Sohan base images reuse unchanged Gameforge Wiki assets listed in `public/maps/SOURCES.md`. Boss positions come exclusively from the user's nine Arthion screenshots, supplied 26 October 2026. Coordinates in `lib/game-guide.ts` are percentages of the terrain bounds, not invented in-game coordinates or live tracking.

| Reference | Boss | Terrain bounds in supplied image | Points |
| --- | --- | --- | --- |
| 1 | Magma Golem | x25 y40, 256 × 256 | 6 |
| 2 | Flame King | x36 y49, 256 × 256 | 6 |
| 3 | Thornspike Stump | x18 y36, 191 × 191 | 5 |
| 4 | Nightmare Tree | Incorrect reference, awaiting replacement | 0 |
| 5 | Giant Red Tree Ghost | x15 y41, 191 × 191 | 5 |
| 6 | Giant Ghost Tree | x2 y23, 286 × 279 | 5 |
| 7 | Ember Tiger | x22 y40, 256 × 256 | 4 |
| 8 | Dark Crystal Golem | x19 y41, 256 × 256 | 3 |
| 9 | Plague Carrier | x7 y25, 256 × 256 | 5 |

The user confirmed reference 4 (Nightmare Tree) was incorrect. Do not reuse reference 5's points for it.

`ghost-forest-arthion-reference.png` is the user's original, unchanged screenshot 6. The viewer crops the window chrome with CSS and places interactive controls over the reference's numbered positions. This is a temporary backdrop, disclosed in the UI; it must be replaced with a clean matching Arthion map when available. Do not substitute the old `/maps/ghost-forest.png` terrain: Arthion reworked this map in patch 1.2.7, then adjusted boss spawns in 1.3.0.

Official context:
- https://arthion.to/forum/patch-notes/107-patch-notes-1-2-7
- https://arthion.to/forum/patch-notes/123-patch-notes-1-3-0

Direct boss drops and dew recipes have not been supplied. Six chest references were supplied separately and are documented in `public/guide/loot/SOURCES.md`. Keep chest contents separate from direct boss drops. Do not fill unknown data with generic Metin2 tables or interpret an unknown loot list as an empty drop table.
