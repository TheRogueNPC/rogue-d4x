# Debugging Guide

## Quick Diagnostics

### DBG.findGame()
Returns status of game instance, hero, scene, mod loader state, and pending patches. Use FIRST when things don't work.

### Common Issues

**"ModLoader not ready"**
- Check browser console for JS errors in mod files
- Verify `manifest.js` has correct paths
- Ensure `SevenDRL.js` has `$hxClasses` export line (see generator patch)
- Check `lime.embed()` completed (look for "lime.embed() done" or "ApplicationMain.main() done" messages)

**"Class not on window"**
- Class names use underscore-flat format: `com.watabou.sevendrl.SevenDRL` → `com_watabou_sevendrl_SevenDRL`
- Classes only available after `lime.embed()` — mods loaded before that must poll
- `ModLoader.validateMethod()` shows available methods

**"Patches pending"**
- `ModLoader.patches` has queue of deferred patches
- Check `flush()` runs after `lime.embed()`
- Use `ModLoader.find('partialName')` to see if class exists

**Hero/clue globals not set**
- `sevendrl` and `hero` globals are set by game.js hooks, NOT by the game itself
- Click the game canvas to trigger `proceed()` hook which sets these
- `DBG.findGame()` shows whether these are populated

### Console Shorthands
```
d                   → alias for DBG
sevendrl            → current game instance
hero                → current hero
ModLoader           → hook toolkit
toggleInspector()   → show/hide inspector panel
```

### Game State Inspection
```js
DBG.status()       → level, hero HP, clue count, boss status
DBG.mobs()         → list of mobs with HP, position, state
DBG.rooms()        → room structure, corridors, dead ends
DBG.plan()         → dungeon overview
DBG.grid()         → ASCII grid (hero, mobs, clues, walls)
DBG.log(20)        → last 20 event log entries
```

### Dev Tools Enable/Disable
- `window.__devToolsEnabled = true/false` — gates all DBG commands
- Toggle via the small DOM "Dev Bar" panel shown alongside the canvas Options
  screen (Escape → Options, from `pause-menu.js`)
- When disabled: DBG commands return blocked message, toolbar/inspector/console hidden
- The dev console specifically can be shown/hidden at any time with
  **Shift+F12**, independent of the Dev Bar state

### Random.Int Doesn't Exist
The game has NO `Random.Int(max)` static. Use:
```js
// Inline PRNG (game's own method):
seed = seed * 48271.0 % 2147483647 | 0;

// ArrayExtender helpers:
com_watabou_utils_ArrayExtender.random(arr);
com_watabou_utils_ArrayExtender.difference(arr1, arr2);

// Rogue API fallback:
Math.floor(Math.random() * max);
```

### Grid Coordinates
- `(h+1) × (w+1)` nodes at intersection points
- `h × w` cells in squares between nodes
- `cells[row][col]` where `row = i`, `col = j`
- Level Creator uses `[col, row]` (j, i) convention
- `grid.cell(i, j)` takes (row, col) parameters

### View Mode Issues
- Canvas overlay must have `z-index:990` to not block game UI
- Canvas has `pointer-events:none` — hero/mob interaction only works in top-down
- If overlay doesn't appear, check `Rogue.cleanup()` didn't remove `#dc-view-overlay`
- If animation stutters, `cancelAnimationFrame` may not have been called from previous mode switch
- **Event-driven rendering**: if view appears stuck, game signals (hpChanged, roomChanged, charAdded) may not fire — check `_signature.revision` in console
- **Fog-of-war**: if rooms are invisible, check `hero.getFOV()` returns correct cells and `game.visited` has the room
- **Palette drift**: if colors change when cycling views, `_paletteCache` may be stale — call `_paletteCache = {}` in console to reset
- **Missing walls/doors in side view**: `buildRoomGeo()` requires `window.com_watabou_sevendrl_Dir` loaded — verify rogue-api.js loaded before view-mode.js
- **Window/door carving not appearing**: check `plan.windows[]` and `room.doors` ObjectMap are populated after generation
- **Inverse hit-test (iso)**: `__viewIsoCellFromPoint(px, py)` returns null if grid unavailable — ensure game is running

### Custom Plan Not Loading
- Check `assets/plan.json` exists and is valid JSON
- `Plan.create` override is unconditional — runs every time a plan is generated
- `Rogue.Plan._applyCustomPlan()` is one-shot (data cleared after use)
- Use `Rogue.Plan.setCustomPlan(data)` for persistence across resets
