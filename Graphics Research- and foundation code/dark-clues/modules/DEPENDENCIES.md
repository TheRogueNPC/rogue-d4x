# Module Dependency Graph

Extracted from SevenDRL.js cross-module analysis.

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

See `Dev-Tools/mods/manifest.js` for exact load order (19 mods + 2 UI tools).
`rogue-api.js` is the hub — most later mods depend on `Rogue.*`/`Rogue.UI`.
Canvas-vs-DOM split: `char-creator.js`, `pause-menu.js` (its canvas half),
`play.js`, `title-menu.js`, `hud-bars.js`, `ability.js`/`ability-pickup.js`'s
aim/indicator UI all build canvas (`Rogue.UI`/native visuals) — see
`Dev-Tools/skills/SYSTEM_MAP.md`'s "Canvas vs. DOM" section.

### Dev-Tools/mods/asset-fixer.js
Depends on: nothing; patches asset paths before the game boots — loads first

### Dev-Tools/mods/loader.js
Provides: `ModLoader` (hook/before/after/resolve/validate/list/inspect/find/flush)

### Dev-Tools/mods/game.js
Hooks into: SevenDRL (proceed, spawnMobs, spawnClues), Hero (collectClue)

### Dev-Tools/mods/characters.js
Hooks into: Hero (target, damage, die), Mob (damage, die), Clue (collect, target)

### Dev-Tools/mods/scenes.js
Hooks into: GameScene (reset, onKey, onGameOver, resize)

### Dev-Tools/mods/debug.js
Depends on: `__devToolsEnabled`; provides DBG commands via Proxy gate

### Dev-Tools/mods/eventlog.js
Provides: `__eventLog[]`, `__eventLogAdd()`

### Dev-Tools/mods/zombies.js
Depends on: `Rogue.Mob`; provides Zombie class

### Dev-Tools/mods/rogue-api.js
Provides: `Rogue.*` API (Mob/Grid/Room/Plan/Encounter/Ability/**UI**/Registry/
Util/cleanup); overrides `Plan.create()` unconditionally. `Rogue.UI` is the
canvas-building toolkit (panel/button/description/prompt/label/stack/
textInput/cycle/overlay/dismiss/gameWindow/toast) — every later canvas mod
depends on it.

### Dev-Tools/mods/char-creator.js
Depends on: `Rogue.UI`; canvas-native in-game character creator overlay
(name via native `Text.input`, theme via `Rogue.UI.cycle`, glyph picker)

### Dev-Tools/mods/pause-menu.js
Depends on: `Rogue.UI`; canvas pause/options panel + a separate small DOM
"Dev Bar" panel (Console/Toolbar/Dev Bar toggles). Exposes
`window.__pauseMenu = {showOptions, showMainMenu, pause, unpause, closePauseOv}`
so `title-menu.js` can reuse the same Options screen.

### Dev-Tools/mods/ability.js
Depends on: `ModLoader`; stock system, projectile fire, canvas aim prompt
(shared via `window.__showAimText`/`__hideAimText`)

### Dev-Tools/mods/ability-pickup.js
Depends on: `ability.js` (shared aim prompt), Clue prototype (`Object.create`
reuse so pickups pass `instanceof Clue`); chess piece pickups, per-type
charge system (`window.__abilityCharges`), centered canvas selection indicator

### Dev-Tools/mods/play.js
Depends on: `Rogue.UI`; difficulty/character select overlay, death retry,
"Mystery Deepens" intro message — all canvas. Exposes
`window.__showDifficultySelect` so `title-menu.js` can trigger it explicitly
right after switching to GameScene (no polling needed — see SYSTEM_MAP.md).

### Dev-Tools/mods/title-menu.js
Depends on: `Rogue.UI`, `window.__pauseMenu.showOptions`,
`window.__showDifficultySelect`; replaces TitleScene's native click-anywhere
with a canvas New Game/Continue/Options/DLC menu.

### Dev-Tools/mods/hud-bars.js
Depends on: `ability.js`/`ability-pickup.js` globals (`__chessAbilities`,
`__selectedAbilityIdx`, `__abilityCharges`, `__abilityStock`) for the
Skill/Charge rows; native `Indicator`/`StatePin`/`CardIndicator` classes
directly (no `Rogue.UI` dependency — predates it). Left-side stat column:
Power/Health/Armor/Skill/Charge/Clues.

### Dev-Tools/mods/view-mode.js
Depends on: `ModLoader`, canvas; top/iso/side overlay rendering

### Dev-Tools/ui/dev-toolbar.js
Depends on: `__devToolsEnabled`; floating toolbar

### Dev-Tools/ui/inspector.js
Depends on: `__devToolsEnabled`; live state panel

### Template mods (commented out in manifest.js by default)
`change-clues.js`, `add_mob_phantom.js`, `add-card.js`, `retheme.js`,
`add-sound.js`, `add-scene.js` — copy-paste starting points, see
`Dev-Tools/skills/EXTENDING.md` and the matching `Dev-Tools/skills/workflows/*.md`.

---

## Load Order (topological sort)

1. `modules/runtime/base.js` — Lime/OpenFL/Haxe runtime (must load first)
2. `modules/watabou/geom.js` — Color, GeomUtils, Rect
3. `modules/watabou/utils.js` — ArrayExtender, Random, MathUtils, etc.
4. `modules/watabou/processes.js` — Process, Sequence, Tweener
5. `modules/watabou/engine.js` — Game, Scene, Text
6. `modules/tracery/tracery.js` — Grammar, Symbol, TraceryNode
7. `modules/core/style.js` — Style
8. `modules/core/audio.js` — Sounds
9. `modules/core/visuals.js` — AsciiSprite, CharacterSprite, etc.
10. `modules/core/states.js` — State, StateIdle, StateWandering, StateChasing
11. `modules/core/pathfinding.js` — Pathfinder
12. `modules/core/game.js` — Grid, Plan, Room, Door, SevenDRL, etc.
13. `modules/core/characters.js` — Character, Hero, Mob, Hunter, etc.
14. `modules/core/actions.js` — Action, ActionMove, ActionAttack, etc.
15. `modules/core/scenes.js` — TextScene, GameScene, DeathScene, etc.
