# Module Dependency Graph

## modules/core/actions.js
Depends on:
- modules/core/audio.js
- modules/watabou/utils.js
- modules/core/characters.js

## modules/core/audio.js
Depends on:
- modules/watabou/processes.js

## modules/core/characters.js
Depends on:
- modules/watabou/utils.js
- modules/watabou/processes.js
- modules/core/visuals.js
- modules/core/game.js
- modules/core/states.js
- modules/core/audio.js
- modules/tracery/tracery.js
- modules/core/actions.js

## modules/core/game.js
Depends on:
- modules/watabou/engine.js
- modules/core/style.js
- modules/core/scenes.js
- modules/watabou/utils.js
- modules/watabou/geom.js
- modules/watabou/processes.js
- modules/core/pathfinding.js
- modules/core/characters.js

## modules/core/pathfinding.js
Depends on:
- modules/core/game.js
- modules/watabou/utils.js

## modules/core/scenes.js
Depends on:
- modules/watabou/engine.js
- modules/core/style.js
- modules/core/visuals.js
- modules/core/game.js
- modules/core/audio.js
- modules/watabou/utils.js

## modules/core/states.js
Depends on:
- modules/watabou/utils.js
- modules/core/audio.js

## modules/core/style.js
Depends on:
- modules/watabou/engine.js

## modules/core/visuals.js
Depends on:
- modules/watabou/processes.js
- modules/watabou/utils.js
- modules/watabou/engine.js
- modules/core/style.js

## modules/tracery/tracery.js
Depends on:
- modules/watabou/utils.js

## modules/watabou/engine.js
Depends on:
- modules/watabou/utils.js
- modules/watabou/processes.js

## modules/watabou/geom.js
Depends on:
- modules/watabou/utils.js

## modules/watabou/processes.js
Depends on:
- modules/watabou/utils.js

## modules/watabou/utils.js
Depends on:
- modules/watabou/geom.js

---

## Dev-Tools Mods (runtime hook chain)

### Dev-Tools/mods/loader.js
Provides: `ModLoader` (hook/before/after/resolve/validate/list/inspect/find/flush)

### Dev-Tools/mods/game.js
Hooks into:
- `com.watabou.sevendrl.SevenDRL` (proceed, spawnMobs, spawnClues)
- `com.watabou.sevendrl.characters.Hero` (collectClue)

### Dev-Tools/mods/characters.js
Hooks into:
- `com.watabou.sevendrl.characters.Hero` (target, damage, die)
- `com.watabou.sevendrl.characters.Mob` (damage, die)
- `com.watabou.sevendrl.characters.Clue` (collect, target)

### Dev-Tools/mods/scenes.js
Hooks into:
- `com.watabou.sevendrl.scenes.GameScene` (reset, onKey, onGameOver, resize)

### Dev-Tools/mods/debug.js
Depends on: `__devToolsEnabled`
Provides: DBG commands via ModLoader Proxy gate

### Dev-Tools/mods/eventlog.js
Provides: `__eventLog[]`, `__eventLogAdd()`

### Dev-Tools/mods/zombies.js
Depends on: `Rogue.Mob` (from rogue-api.js)
Provides: Custom Zombie mob class

### Dev-Tools/mods/rogue-api.js
Depends on: game classes on window
Provides: `Rogue.*` API (Mob, Grid, Room, Plan, Encounter, Ability, UI, Util, Registry)
Overrides: `Plan.create()` unconditionally

### Dev-Tools/mods/char-creator.js
Depends on: `Rogue.UI`, `Rogue.Util`
Hooks into: GameScene (reset, onKey for toggle)
Provides: In-game character creator overlay

### Dev-Tools/mods/pause-menu.js
Depends on: `ModLoader`
Hooks into: GameScene (reset, onKey for ESC)
Provides: ESC pause with Options (zoom, view, dev tools)

### Dev-Tools/mods/ability.js
Depends on: `ModLoader`
Provides: Stock system, projectile firing, indicator bar
Hooks into: GameScene (reset, onKey for ability firing)

### Dev-Tools/mods/ability-pickup.js
Depends on: `ability.js`, Clue prototype
Provides: Chess piece ability pickups on the map

### Dev-Tools/mods/play.js
Depends on: `Rogue.*`
Hooks into: GameScene (reset), difficulty overlay boot
Provides: Character select, death retry

### Dev-Tools/mods/view-mode.js
Depends on: `ModLoader`, canvas API
Hooks into: GameScene (reset for re-apply), Rogue.cleanup
Provides: Top/iso/side canvas overlay rendering

### Dev-Tools/ui/dev-toolbar.js
Depends on: `__devToolsEnabled`
Provides: Floating toolbar (view cycle, debug, abilities)

### Dev-Tools/ui/inspector.js
Depends on: `__devToolsEnabled`
Provides: Live state panel (rooms, queue, hero, grid)

