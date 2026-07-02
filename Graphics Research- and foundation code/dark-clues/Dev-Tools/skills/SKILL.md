# Dark Clues — Dev-Tools Skill

## Overview

Dev-Tools provides a **live editing** environment for the Dark Clues roguelike. No Haxe compiler — all extensions are applied at runtime via JavaScript injection.

```
Dev-Tools/
├── index.html              # Boot: console → mod loader → lime.embed wrapper
├── start-devtools.bat      # One-click launcher
├── mods/
│   ├── loader.js           # ModLoader v2 — hook toolkit
│   ├── manifest.js         # Mod activation list (order matters)
│   ├── game.js             # SevenDRL hooks (proceed, collectClue, spawnClues)
│   ├── characters.js       # Hero/Mob/Boss/Clue hooks
│   ├── scenes.js           # GameScene/TitleScene/DeathScene hooks
│   ├── debug.js            # DBG.{} REPL (+ Proxy gate for dev tools toggle)
│   ├── eventlog.js         # Event log system
│   ├── zombies.js          # Custom Zombie mob example (Rogue.Mob pattern)
│   ├── rogue-api.js        # Unified modder API (Mob, Grid, Room, Plan, Encounter, Ability, UI, Registry)
│   ├── char-creator.js     # In-game character creator — canvas overlay (Rogue.UI + native Text.input)
│   ├── pause-menu.js       # ESC pause overlay (canvas) + Options (zoom/sound/View, canvas) + Dev Bar panel (DOM)
│   ├── ability.js          # Ability stock system, projectile firing, indicator bar
│   ├── ability-pickup.js   # Chess-piece ability pickups (Pawn-King)
│   ├── play.js             # Difficulty selector, character select, death retry, intro message — all canvas
│   ├── hud-bars.js         # Left-side stat column: Power/Health/Armor/Skill/Charge/Clues (native Indicator/StatePin)
│   └── view-mode.js        # Top-down / Isometric / Side view modes
├── ui/
│   ├── dev-toolbar.js      # Floating action toolbar (spawn, buttons, __devToolsEnabled check)
│   └── inspector.js        # Live game state panel (__devToolsEnabled check)
├── level-creator/
│   ├── index.html          # Visual dungeon editor with game-native CSS
│   └── creator.js          # Grid editor, room paint, encounters, JSON export/import
├── char-creator/
│   ├── index.html          # Character + Enemy designer with game-native CSS
│   └── creator.js          # Form, visual upload, glyph picker, export/import
└── skills/
    ├── SKILL.md            ← This file
    ├── QUICK_START.md      ← 5-min start: patterns, templates, console commands
    ├── SYSTEM_MAP.md       ← Boot sequence, scene graph, canvas/DOM rule
    ├── GLOBALS_REFERENCE.md ← What's on window, lifespan, when to access
    ├── SIGNALS_REFERENCE.md ← Game events, hook patterns
    ├── API_REFERENCE.md    ← Lime/OpenFL/coogee/visuals classes + methods
    ├── GRAMMAR_MAP.md       ← Tracery clue-grammar syntax
    ├── EXTENDING.md          ← How to add a new workflow/template/skill doc
    ├── dev-tools-workflow.md ← Level Creator + Character Creator
    ├── modding.md
    ├── rogue-api.md
    ├── view-mode.md
    ├── debugging.md
    └── workflows/            ← One doc per "I want to add X" task
```

## CRITICAL Architecture

### IIFE Scoping

`SevenDRL.js` wraps everything in an IIFE — `$hxClasses` and all class constructors are **local `var`s** inside the closure, NOT on `window`. Classes only become accessible after `lime.embed()` runs and populates window.

**Resolution:** Use flattened underscore names via `ModLoader.resolve()`:
```js
ModLoader.resolve("com.watabou.sevendrl.SevenDRL");
// → window.com_watabou_sevendrl_SevenDRL
```

### Synchronous Initialization

`lime.embed()` runs the ENTIRE game synchronously — class creation, constructor calls (`spawnMobs`, `spawnClues`), first `proceed()` tick — all before returning. Mod patches applied AFTER `lime.embed()` returns.

### Closure Bug — always IIFE loop bodies

`var` is function-scoped. All closures in a `for` loop share the same `var` (last iteration's value). Use IIFE or `let`:
```js
for (var i = 0; i < patches.length; i++) {
  (function(patch) {
    // patch is correctly captured
  })(patches[i]);
}
```

### Hook Chain

Last `ModLoader.hook()` registered wraps previous ones. `before` runs outside-in, `after` runs inside-out. Set `this.__suppressOrig = true` in a before-handler to stop the chain.

### Object.create (no $extend)

`$extend` is scoped inside SevenDRL.js IIFE — NOT global. Custom class inheritance must use `Object.create(Base.prototype)`.

### Random.Int doesn't exist

The game has no `Random.Int(max)` static. Use inline PRNG (`seed = seed * 48271.0 % 2147483647 | 0`) or `ArrayExtender.random()`/`pick()`.

### Canvas vs. DOM — the rule

**Dev-tooling is DOM. In-game-world UI is canvas.** The dev console, inspector,
and toolbar (`ui/dev-toolbar.js`, `ui/inspector.js`, plus the small Dev Bar
panel in `pause-menu.js`) are correctly DOM — they're outside the game's own
display tree by design. Everything the *player* sees during a run (HUD bars,
popups, the pause/options/difficulty/character-creator/death screens) is
canvas: a child of `GameScene` (or whichever scene is current) built from
`openfl.display.Sprite`/`TextField`, not `document.createElement`. A DOM
overlay doesn't get positioned, scaled, or cleaned up the way the rest of the
scene's display list does — it needs its own manual lifecycle, which is
exactly the bug class that motivated this rule (popups outliving the scene
that showed them; see `Dev-Tools/skills/debugging.md`).

Two non-obvious traps when building canvas UI here:
- `com.watabou.sevendrl.visuals.CenteredText`'s constructor never calls
  `setWidth()`/`autoSize` itself — without calling `.setWidth(...)`
  immediately after construction, it keeps OpenFL's default ~100×100
  TextField box instead of sizing to its text. Every native usage
  (`Window.tfText`, `Toast`) calls `setWidth()` right after construction;
  `Rogue.UI`'s internal `uiText()` helper does the same.
- `com.watabou.coogee.ui.utils.Text.get()` calls `set_htmlText()` under the
  hood, so a label containing `<`/`>` (e.g. `"<Skill>:"`) gets parsed as an
  unknown HTML tag and silently dropped. Use `CenteredText` + `setWidth()`
  for any label that might contain those characters — `Rogue.UI.label()`
  and `hud-bars.js`'s label helper both do this.

Build canvas UI out of `Rogue.UI` (see `rogue-api.md`) rather than hand-
rolling `Sprite`/`graphics` calls — it already wraps the native
`Indicator`/`Unit`/`StatePin`/`CardIndicator`/`CenteredText`/`Text.input`
classes the game's own HUD is built from.

## Key Systems

### Dev Tools Gate
- `window.__devToolsEnabled = true/false` — controls all dev commands
- `DBG` wrapped in ES6 Proxy — commands return "Dev tools disabled" when off
- Toolbar and inspector check `__devToolsEnabled` before building
- Toggle via "Dev Bar" button in the DOM dev panel (shown alongside the
  canvas Options screen, opened from the pause menu). The dev console can
  also be shown/hidden at any time — regardless of Dev Bar state — with
  **Shift+F12**.

### Custom Plans
- `Rogue.Plan.loadFromJSON(json)` builds a live Plan from level-creator JSON
- `Rogue.Plan.autoLoad('assets/plan.json')` fetches at game start
- `Plan.create` unconditionally overridden to check `_customPlanData` on every call
- Hero repositioning + boss spawn on `GameScene.reset` after-hook

### Encounter System
- `Rogue.Encounter.define(def)` — register room-entry triggers
- Subscribes to `hero.roomChanged` signal via GameScene.reset hook
- Level Creator: per-room enemy spawns in export JSON

### Ability System
- Stock from kills + steps - damage penalty
- Q+direction projectile fire with aim overlay
- Chess-piece pickups (Pawn→King) via Clue prototype reuse
- Dynamic difficulty-scaling (stock cap, cost, step rate)

### Character Loadout
- Loaded from `assets/characters/manifest.json`
- Difficulty overlay shows character cards with glyph/visual previews
- Character stats (HP bonus, stock bonus, glyph) applied via `applyDifficulty()`

## ModLoader API (v2)

```js
ModLoader.hook(className, method, beforeFn, afterFn)
ModLoader.before(className, method, fn)
ModLoader.after(className, method, fn)
ModLoader.replace(className, method, fn)
ModLoader.validateMethod(className, method)
ModLoader.listMethods(className)
ModLoader.addHooks(spec)
```

## Rogue API

```js
Rogue.Mob.define(def)              // custom mob class factory
Rogue.Mob.spawn(cls, game, n)      // spawn at random unseen locations
Rogue.Encounter.define(def)        // room-entry trigger
Rogue.Encounter.spawnInRoom(g, r, cls, n)
Rogue.Plan.loadFromJSON(json)      // build plan from level-creator JSON
Rogue.Plan.toJSON()                // export live plan
Rogue.Plan.autoLoad(url)           // fetch custom plan
Rogue.Plan.setCustomPlan(data)     // persist plan across resets
Rogue.Grid.cellAt(i,j)             // cell inspection
Rogue.Grid.dump()                  // ASCII grid
Rogue.Room.getAll()                // room list
Rogue.Room.printAll()              // pretty-printed rooms
Rogue.Ability.getStock()           // current stock
Rogue.Ability.setStock(n)          // clamped
Rogue.Util.random.pick(arr)        // random array element
Rogue.UI.panel(title, body, width) // canvas panel Sprite (not DOM) with tracked layout
Rogue.UI.overlay(title, body, w)   // full-screen dim overlay + centered panel, auto-added to the scene
Rogue.UI.button/description/prompt/label(text, parent) // stack canvas content into a panel
Rogue.UI.textInput(text, parent)   // native Text.input() TextField — real OS-level text editing
Rogue.UI.cycle(label, options, idx, parent, onChange) // canvas "‹ value ›" picker, click to advance
Rogue.cleanup(preserveStock)       // remove leftover dev-only DOM ids, reset globals
Rogue.Registry.mob(key, def)       // data-driven mob definition
Rogue.Registry.spawn(key, game, n) // spawn from registry
```

See `Dev-Tools/skills/rogue-api.md` for full reference.

## Key Files

| File | Purpose |
|------|---------|
| `mods/loader.js` | ModLoader v2 — resolve, hook, validate, list, inspect, find, flush |
| `mods/manifest.js` | Toggle mods on/off by (un)commenting paths |
| `mods/rogue-api.js` | Unified API: Mob, Grid, Room, Plan, Encounter, Ability, UI (canvas), Registry, cleanup |
| `mods/debug.js` | REPL: all DBG commands + Proxy gate for dev tools toggle |
| `mods/play.js` | Difficulty overlay, character select, death retry, intro message — canvas via Rogue.UI |
| `mods/hud-bars.js` | Left-side stat column built from native Indicator/StatePin/CardIndicator |
| `mods/view-mode.js` | Top/iso/side canvas overlay rendering engine |
| `mods/ability-pickup.js` | Chess piece pickup collectibles (Clue prototype reuse) |
| `level-creator/index.html` | Visual dungeon editor (standalone DOM tool, not in-game) |
| `char-creator/index.html` | Character + enemy designer (standalone DOM tool, not in-game) |

## Rules

1. **Never edit `SevenDRL.js`** — all changes go in `Dev-Tools/mods/`
2. **Always validate** — `ModLoader.validateMethod()` before hooking unknown methods
3. **IIFE closures** — always wrap loop bodies in IIFE when using `var`
4. **Serve via HTTP** — `file://` blocks XHR; use `start-devtools.bat`
5. **Hard refresh** — Ctrl+Shift+R to bypass cache
6. **Canvas for in-game UI, DOM for dev-tooling** — see "Canvas vs. DOM" above. The standalone `level-creator/` and `char-creator/` *designer tools* (separate pages, not loaded inside the game) are DOM — that rule only applies to UI that lives inside a running game scene.
7. **Game-native aesthetic** — canvas UI: `0x111122` bg / `0xDDDDDD` text / `0x555555` borders (the hex equivalents of the DOM dev-tooling's `#111122`/`#ddd`/`#555`), `Style.formatService`/`formatText`/`formatTitle` for fonts

## Quick Start

```bash
dark-clues\start-devtools.bat
# → opens http://localhost:8080/Dev-Tools/index.html
# Press F12 for dev console, Shift+F12 to bring it back if the Dev Bar is off
# Click the game canvas to activate dev tools
```

## Reference docs

**Start here:**
- `QUICK_START.md` — templates, patterns, console inspection, the 4 critical rules
- `SYSTEM_MAP.md` — orientation: boot sequence, scene graph, canvas/DOM rule, full file tree

**For adding features:**
- `GLOBALS_REFERENCE.md` — what's on `window`, when to access it, lifespan guarantees
- `SIGNALS_REFERENCE.md` — game events you can subscribe to, hook patterns for non-signaled events
- `API_REFERENCE.md` — Lime/OpenFL/coogee/visuals classes mods use, real signatures
- `rogue-api.md` — full `Rogue.*` API (Mob, Encounter, Ability, UI, Grid, etc.)

**For game systems:**
- `GRAMMAR_MAP.md` — Tracery clue-grammar syntax (symbols, choices, weighted/conditional rules, modifiers)
- `dev-tools-workflow.md` — Level Creator + Character Creator tools (DOM-based, for designing content)
- `view-mode.md` — isometric/side/top views

**For ecosystem:**
- `modding.md` — mod architecture, hook chain, Object.create pattern, `$extend` vs. `Object.create`
- `debugging.md` — common issues, diagnostics, troubleshooting, `DBG` command reference
- `EXTENDING.md` — how to add a new workflow/template/skill doc; known intentional gaps

## Workflows (`Dev-Tools/skills/workflows/`)

One doc per "I want to add X," most paired with a working template in
`Dev-Tools/mods/` you can duplicate directly:

| Doc | Covers |
|---|---|
| `live-mod.md` | The base pattern every workflow below builds on |
| `add-mob.md` | New enemy type — `Rogue.Mob.define()` or hand-written class |
| `add-ability.md` | New player ability — shared stock pool or your own charge economy |
| `add-pickup.md` | Collectible item (`Object.create(Clue.prototype)` trick) |
| `add-encounter.md` | Room-entry triggers (`Rogue.Encounter`) |
| `add-ui-panel.md` | Canvas UI panel/popup (`Rogue.UI`) |
| `add-scene-live.md` | A whole new screen/scene |
| `add-card.md` | Action-card damage modifiers (and why a real new card value is unsafe) |
| `add-character.md` | New playable character / loadout fields |
| `add-sound.md` | Custom sound effects |
| `retheme.md` | Colors/fonts |
| `iterate-clues.md` | Clue grammar — live testing, persistence, `addClueRule()` |
| `inspect-state.md` | Console/DBG/toolbar live state inspection |
| `debug-crash.md` | Diagnosing a broken mod |
| `change-clues.md` | The `change-clues.js` template specifically |
