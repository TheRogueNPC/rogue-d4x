# View Mode System

## Overview
Three rendering modes for dungeon exploration:
- **Top-down**: native game PlanView (default)
- **Isometric**: diamond-tile projection via canvas overlay
- **Side**: 2D side-view cross section via canvas overlay

## Controls
- `/Dev-Tools/mods/view-mode.js` auto-loads
- Toggle via Options menu → View ◀▶ button
- Or call from console: `window.__cycleViewMode()`
- Or set directly: `window.__setViewMode('iso')`, `'side'`, `'top'`

## Architecture
- Canvas overlay (`#dc-view-overlay`) positioned `fixed; inset:0; z-index:990; pointer-events:none`
- **Event-driven** render loop: `requestAnimationFrame` runs but expensive geometry pass only fires when `_signature.revision` bumps (hero move, room change, char added/removed, game over, window resize)
- Native `PlanView` is hidden (`set_visible(false)`) for iso/side, shown for top
- On `GameScene.reset`, view mode is re-applied

## Features

### Shared Palette Cache
Room colors keyed by `room.id` across all view switches — no recoloring drift when cycling `top → iso → top`.

### Fog-of-War (3 Tiers)
| Tier | Alpha | Render |
|------|-------|--------|
| `visible` | 1.0 | Full color floor + walls + characters |
| `explored` | 0.35 | Desaturated floor, no characters |
| `none` | 0 | Not rendered |

### Precomputed Geometry (`buildRoomGeo`)
Cached per plan generation. For each room, computes:
- `downWalls[]` — cells with SOUTH-facing contour edges (wall candidates)
- `rightWalls[]` — cells with EAST-facing contour edges
- `doors[cellKey]` — whether a door exists at that cell
- `windows[cellKey]` — whether a window exists at that cell

Cache invalidated on `GameScene.reset`.

## Isometric Rendering
- Diamond-tile projection: `sx = (j-i)*HALF_W`, `sy = (j+i)*HALF_H`
- Depth sorting by foot-Y `(i + j)` for both cells and entities
- Rooms colored by shared palette cache
- Fog-of-war applied per cell via `visibilityTier()`
- Characters rendered as Share Tech glyphs at diamond centers
- Camera follows hero position with offset

## Side Rendering
- Floor pass: `fillRect` at `(j*TILE, i*TILE)` per visible/explored cell
- Wall pass: extrudes SOUTH contour edges into vertical wall quads:
  - **No door/window**: full `TILE×WALL_HEIGHT` wall with border
  - **Has door**: carved 30%/40%/30% segments (left wall, gap, right wall) with door-sill indicator
  - **Has window**: short wall segment + window pane (blue tint, cross) + wall cap
- EAST contour edges: thin 1px wall strip on right room boundary
- Characters rendered at floor level (visibility gated)
- Camera follows hero position

## Hit-Test API (for future click-to-move)
- `window.__viewIsoCellFromPoint(px, py)` — inverse diamond projection → `grid.cell(row, col)`
- `window.__viewSideCellFromPoint(px, py)` — inverse TILE projection → `grid.cell(row, col)`
- Currently exposed as public API; overlay remains `pointer-events:none`

## Cleanup
- `Rogue.cleanup()` stops the render loop, hides the overlay, clears palette cache + geometry cache
- On dev tools disable, forces back to top-down mode

## Caveats
- Canvas overlay has `pointer-events:none` — game interaction only works in top-down mode
- Isometric view uses hero `getFOV()` for visible tier, `game.visited` room.area for explored tier
- Hero's current room is always rendered even if not "visited" by game logic
- Room colors match the level creator palette for consistency (shared `ROOM_COLORS` array)
- `buildRoomGeo()` depends on `window.com_watabou_sevendrl_Dir` — ensure loaded after rogue-api.js
