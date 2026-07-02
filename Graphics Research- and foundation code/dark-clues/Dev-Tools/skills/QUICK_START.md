# Quick Start — the essentials in 5 minutes

You want to add something to the game. Here's the shortest path:

## The Pattern (every workflow follows this)

1. **Duplicate a template** from `Dev-Tools/mods/` that matches what you're building
2. **Adapt it** — change names, numbers, logic
3. **Uncomment in `manifest.js`** to load it
4. **Reload the page** (Ctrl+Shift+R)
5. **Test** — use `DBG` commands in the console (see below) and walk the game

## Which template to duplicate?

| I want to... | Duplicate this | Doc |
|---|---|---|
| Add a new enemy | `add_mob_phantom.js` | `add-mob.md` |
| Add a new player ability | `add-card.js` or rework `ability-pickup.js` | `add-ability.md` |
| Add a collectible item | `add-pickup.js` | `add-pickup.md` |
| Trigger when hero enters a room | `add-encounter.js` | `add-encounter.md` |
| Show a popup/settings screen | `add-ui-panel.js` | `add-ui-panel.md` |
| Add a whole new game screen | `add-scene.js` | `add-scene-live.md` |
| Change colors/fonts | `retheme.js` | `retheme.md` / `STYLE.md` |
| Add a sound effect | `add-sound.js` | `add-sound.md` |
| Modify clue text | `change-clues.js` | `iterate-clues.md` |

## Console inspection (open F12, type into the console)

```js
// What's on the field right now?
DBG.mobs()           // list all mobs, positions, HP
DBG.rooms()          // list rooms, sizes, levels
DBG.plan()           // show the full floor plan
DBG.hero()           // hero stats
DBG.grid()           // print the grid to console

// Trigger game events for testing
DBG.kill(mob)        // kill a specific mob
DBG.clue(count)      // spawn N clues
DBG.levelUp()        // increase level
DBG.hurt(n)          // take n damage
DBG.heal(n)          // heal n HP
DBG.win()            // instant victory
DBG.die()            // instant death

// Inspect the class/signal system
ModLoader.list()     // all loaded mods
ModLoader.inspect('com.watabou.sevendrl.characters.Mob')  // Mob methods + hierarchy
window.hero          // current hero object (read .hp, .maxHP, .deck, .pos, etc.)
window.game          // game instance (.level, .plan, .queue, .hero, etc.)

// Listen to an event
game.clueFound.add(function(clue) { console.log('Clue:', clue.text); });
hero.hpChanged.add(function(hp) { console.log('HP:', hp); });
```

## The Four Patterns

### Pattern 1: Spawn something on room entry

```js
Rogue.Encounter.define({
    name: 'my_encounter',
    minLevel: 1,
    maxLevel: 5,
    roomSize: 'large',
    onEnter: function(game, room) {
        var MyMob = window['com.watabou.sevendrl.characters.MyMob'.replace(/\./g, '_')];
        return Rogue.Encounter.spawnInRoom(game, room, MyMob, 2);  // 2 of them
    }
});
```

### Pattern 2: Hook into game logic

```js
ModLoader.hook('com.watabou.sevendrl.characters.Mob', 'damage', function(value) {
    if (this.isSpecial) arguments[0] = value / 2;  // half damage
}, null);
```

### Pattern 3: Show a UI panel

```js
var ov = Rogue.UI.overlay('My Panel', 'Some text', 300);
Rogue.UI.button('Click me', ov.__panel, function() {
    console.log('Clicked!');
    Rogue.UI.dismiss(ov);
});
```

### Pattern 4: Define a new mob/ability/etc.

```js
Rogue.Mob.define({
    name: 'Goblin',
    hp: 2,
    visual: 'g',
    color: 0x00FF00,
    info: 'A small goblin.',
    damage: 1,
    state: 'chasing'
});
```

## Critical rules (break these and your mod breaks silently)

| Rule | Why | What to do |
|---|---|---|
| Never use `$extend()` in mods | It's IIFE-scoped, throws ReferenceError | Use `Object.create()` instead |
| Never use `$hxClasses[...]` in mods | Same reason | Use `window.com_watabou_sevendrl_...` or `ModLoader.resolve()` |
| Never hook `'constructor'` | Patching `prototype.constructor` has no effect on what `new Cls()` calls | Hook `'activate'` or a real method instead |
| Canvas UI only (no DOM elements in-game) | Doesn't auto-cleanup on scene reset | Use `Rogue.UI` (builds Sprites) not `document.createElement` |
| Always call `setWidth()` on CenteredText | It doesn't auto-size — stays 100×100 without it | `tf.setWidth(2000)` immediately after construction |

## Boot sequence (when stuff becomes available)

1. `index.html` loads → `SevenDRL.js` runs (compiled game code, IIFE-scoped)
2. `lime.embed()` → runs the game loop, exports classes to `window`
3. **Mods load** (in manifest.js order)
   - `loader.js` → `ModLoader` available
   - `rogue-api.js` → `Rogue.*` available
   - Your mods → use both
4. Game boots → `Clue.reset()` runs (inits grammar, signals, etc.)
5. `TitleScene` appears
6. Player selects difficulty/character
7. `GameScene` constructor runs → `GameScene.reset()` → game is live

So in your mod, you can safely use `ModLoader.resolve()` / `Rogue.*` / `window.com_wababou_...` names right away — they're all registered before your mod file runs.

## Debugging a broken mod

1. **Check console** (F12) — any JS errors?
2. **Check Dev Console** (Shift+F12 then click the Dev Bar tab if it's off) — does it say `[mod:your-mod] loaded`?
3. **Test live** — open DevTools, copy-paste your mod code (wrapped in `(function() { eval('YOUR CODE'); })()`) and see what breaks immediately
4. **Search for the error** in `debugging.md`
5. **Use DBG commands** to inspect state and confirm your hook ran

## Next steps

- Pick a workflow doc from the table above — it has the full explanation + a working template
- Edit the template (change names, behavior)
- Reload and test with `DBG` commands
- If it works, you're done; if not, read the full workflow doc for the details

## Reference

- `SYSTEM_MAP.md` — boot sequence, what runs when, full file tree
- `GLOBALS_REFERENCE.md` — what's on `window`, when it's safe to access, lifespan
- `SIGNALS_REFERENCE.md` — game events you can hook, hook patterns for non-signaled events
- `rogue-api.md` — full `Rogue.*` API (Mob, Encounter, Ability, UI, Grid, etc.)
- `API_REFERENCE.md` — Lime/OpenFL/coogee/visuals classes and methods
- `modding.md` — deep dive into ModLoader, Object.create patterns, before/after/hook
- `debugging.md` — troubleshooting, DBG command reference, common errors
- `EXTENDING.md` — how to add a new workflow/template/doc to keep tooling current
