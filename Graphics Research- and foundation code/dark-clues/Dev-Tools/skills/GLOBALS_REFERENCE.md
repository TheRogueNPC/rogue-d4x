# Global Reference — `window` state for mods

This is the contract between the game and mods: what you can read/write on
`window`, when it's safe to do so, and what guarantees the game makes about
lifespan (does it persist across scene resets? across game restarts?).

## Per-Game State (cleared on `Clue.reset()`, not on scene reset)

| Global | Type | Purpose | Access Pattern |
|---|---|---|---|
| `window.__difficultySettings` | Object | Player's selected difficulty, bound to hero stats | `{ hpBonus, stockBonus }` |
| `window.__characterLoadout` | Object | Player's character selection / custom build | `{ name, bonuses, ... }` (see `char-creator.js`'s `DEFAULTS`) |
| `window.__abilityStock` | number | Shared Q-fire ability pool | `Rogue.Ability.getStock()`, `setStock(n)`, `addStock(n)`, `consume(n)` |
| `window.__abilityCharges` | Object | Per-type ability charge counts (chess pieces) | `{ pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 }` read directly or via `Rogue.Ability.getCharges(type)` |
| `window.__selectedAbilityIdx` | number | Currently selected chess-piece type index | `0-4` = pawn/knight/bishop/rook/queen; `ability-pickup.js` manages this |
| `window.__chessAbilities` | Array | Registered chess-piece ability definitions | Array of `{ type, label, ... }`, read by `hud-bars.js` for Skill row |
| `window.__eventLog` | Array | Event log entries `[{turn, msg}, ...]` | Push via `__eventLogAdd(msg)` |

## Per-Scene State (reset every `GameScene.reset()`)

| Global | Type | Purpose | Access Pattern |
|---|---|---|---|
| `window.hero` | Hero | Current player character | Read/write stats: `hp`, `maxHP`, `deck`, `pos`, etc. |
| `window.game` | SevenDRL | Game instance (difficulty, plan, queue, etc.) | Read `.level`, `.plan`, `.queue`, `.hero`, etc. |

## Persistent Across Session (survive page reload, except `sessionStorage` is cleared)

None currently — there's no save system. "Continue" in the title menu reuses
`__difficultySettings`/`__characterLoadout` from *this session only*.

## Modder Hooks / Callbacks

| Global | Registered by | Called when | What to do |
|---|---|---|---|
| `window.__openCharCreator()` | `char-creator.js` | User wants to build a custom loadout | Call it, waits for result in `window.__characterLoadout` |
| `window.__showDifficultySelect()` | `play.js` | After switching to GameScene, show the difficulty overlay | Call it right after `switchScene(GameScene)` — no polling needed |
| `window.__showAimText(...)` | `ability.js` | Before firing a projectile ability, show an aim prompt | `__showAimText('projectile', callback)` displays canvas UI, calls `callback(direction)` on exit |
| `window.__hideAimText()` | `ability.js` | Hide the aim prompt | Call when the prompt should close (user cancelled, etc.) |
| `window.__unlockDLC()` | `title-menu.js` | Flip the DLC gate for testing | `window.__dlcUnlocked = true` enables Level Editor / Character Creator in title menu |
| `window.DBG` | `debug.js` | Live inspection commands in console | `DBG.mobs()`, `DBG.rooms()`, `DBG.plan()`, etc. (see `debugging.md`) |

## Dev Tooling Only (DOM-based, not in-game)

| Global | Purpose |
|---|---|
| `window.devLog(...)` | Log to the Dev Console (bottom-right panel when toolbar enabled) |
| `window.__devToolsEnabled` | Boolean, true if dev tools are active (toggles with Shift+F12) |
| `window.ModLoader` | The mod-hooking system (resolve, hook, before, after, validate, list, flush, etc.) |

## Rogue Namespace (`window.Rogue.*`)

Exposed by `rogue-api.js` as the unified modder API. Full reference: see
`rogue-api.md`. Quick index:

```
Rogue.Mob        — create mobs via Rogue.Mob.define()
Rogue.Encounter  — room-entry triggers
Rogue.Ability    — shared stock pool + abilities registry
Rogue.Room       — grid/room helpers
Rogue.Grid       — cell/pathfinding helpers
Rogue.Plan       — floor plan data + manipulation
Rogue.Registry   — register custom content by key
Rogue.UI         — canvas UI builders (panel, button, overlay, etc.)
Rogue.Util       — helpers (cls, random, cleanup, etc.)
Rogue.onReady()  — defer setup until game is ready
```

## Class Access (via ModLoader.resolve or direct window reference)

Classes are flattened names on `window` after boot (e.g.,
`window.com_watabou_sevendrl_characters_Mob`). See `API_REFERENCE.md` for
the detailed list. Common ones:

```
window.com_watabou_sevendrl_SevenDRL          — game loop / main class
window.com_watabou_sevendrl_characters_Hero   — player
window.com_watabou_sevendrl_characters_Mob    — base enemy
window.com_watabou_sevendrl_characters_Clue   — collectible / pickup base
window.com_watabou_sevendrl_scenes_GameScene  — main play scene
window.com_watabou_sevendrl_Sounds            — audio
window.com_watabou_sevendrl_Style             — text formats (formatTitle, formatText, etc.)
window.openfl_display_Sprite                  — canvas display-list node
window.openfl_text_TextField                  — text field
window.com_watabou_utils_Random               — seeded RNG
window.com_watabou_utils_ArrayExtender        — array helpers (pick, shuffle, etc.)
window.com_watabou_processes_Tweener          — animation / easing
```

## When Safe to Access

| Timing | Safe to read | Safe to write | Notes |
|---|---|---|---|
| During `Game.reset()` / `Clue.reset()` | Game classes (Mob, Scene, etc.) | Game state only, not scene state | Clues/mobs not yet spawned |
| During `GameScene.reset()` | Everything | Scene content, scene-relative state | Hero/mobs spawned and added to queue |
| During `spawnMobs()` / `spawnClues()` after-hook | Game, grid, cells | Mobs/clues list (via `game.queue.push()`) | Spawned after native pipeline; won't call onEnter/collect yet |
| During `GameScene.onKey()` / `activate()` hook | Everything | Everything scene-local | Safe for full UI/state changes |
| During `Mob.damage()` / `Hero.damage()` before-hook | `arguments[0]` is the incoming damage | Modify `arguments[0]` to rescale damage | Called synchronously, no async safety issues |
| During scene transitions (Game.switchScene) | Old scene state for cleanup | New scene state (don't touch old scene) | Old scene will be garbage-collected |

## Lifespan Guarantees

- **Per-game state** (`__difficultySettings`, `__characterLoadout`, `__abilityStock`, `__abilityCharges`, `__eventLog`) — persist until `Clue.reset()` (New Game or Continue after death)
- **Per-scene state** (`hero`, `game`) — `hero` is recreated on reset, `game` persists but its `.hero` reference updates
- **Rogue namespace** — persists across the entire session, never cleared
- **ModLoader hooks** — persist until page reload; mods are never "unloaded"

## Examples

### Reading game state safely

```js
var hero = window.hero;
var currentHP = hero ? hero.hp : 'no hero yet';
var level = window.game ? window.game.level : 0;
var stock = window.__abilityStock;
```

### Modifying state during a hook

```js
ModLoader.hook('com.watabou.sevendrl.characters.Mob', 'damage', function(value) {
    // `this` is the mob taking damage; value is the incoming damage
    if (this.isSpecial) arguments[0] = value / 2;  // half damage for special mobs
}, null);
```

### Registering a custom ability

```js
Rogue.Ability.registerAbility(70, {  // keyCode 'F'
    label: 'Fireball',
    cost: 2,
    onActivate: function(game) {
        if (window.__eventLogAdd) window.__eventLogAdd('Fireball cast!');
    }
});
```

## Reference

- `rogue-api.md` — the full `Rogue.*` API
- `API_REFERENCE.md` — all Lime/OpenFL classes and their methods
- `SYSTEM_MAP.md` — boot sequence (when things become available)
- `debugging.md` — inspection commands and troubleshooting
