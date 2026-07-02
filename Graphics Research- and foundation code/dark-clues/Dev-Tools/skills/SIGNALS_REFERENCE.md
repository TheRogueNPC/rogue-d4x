# Signals Reference — game events you can subscribe to

The game uses the `msignal` library for event dispatch — simple pub/sub on
typed signal objects. This doc lists every signal in the game and when it fires.

## Hero signals (`window.hero.*`)

Dispatched **synchronously** during the action that triggers them. Subscribe
via `.add(callback)` / `.addOnce(callback)` / `.remove(callback)`.

| Signal | Type | Fired when | Callback args |
|---|---|---|---|
| `hero.hpChanged` | Signal1 | Hero takes/heals damage | `(newHP)` |
| `hero.deckChanged` | Signal0 | Hero draws a new card | (none) |
| `hero.roomChanged` | Signal0 | Hero enters a new room | (none) |
| `hero.cardChanged` | Signal1 | Hero plays a card (during engage) | `(card)` - the ActionCard played |
| `hero.targetChanged` | Signal1 | Hero targets something (clicks on a mob) | `(target)` - the Character targeted |
| `hero.actionChanged` | Signal1 | Hero's action changes (move → wait, etc.) | `(action)` |

Usage example:
```js
window.hero.hpChanged.add(function(newHP) {
    console.log('Hero HP now:', newHP);
});
```

## Game signals (`window.game.*`)

| Signal | Type | Fired when | Callback args |
|---|---|---|---|
| `game.clueFound` | Signal1 | Hero collects a clue | `(clue)` - the Clue instance |
| `game.mobDied` | Signal1 | Any mob is defeated | `(mob)` - the Mob instance |
| `game.over` | Signal0 | Game ends (victory or death) | (none) |

Usage example:
```js
window.game.clueFound.add(function(clue) {
    if (window.__eventLogAdd) window.__eventLogAdd('Found a clue: ' + clue.text);
});
```

## Scene signals (SceneX.layout, onKey, activate, deactivate)

Scenes don't expose signals directly, but you can hook their methods:

```js
ModLoader.after('com.watabou.sevendrl.scenes.GameScene', 'activate', function() {
    // Called once per scene entry, after layout(), before player input
});

ModLoader.hook('com.watabou.sevendrl.scenes.GameScene', 'onKey', function(keyCode, down) {
    // Called on every key press/release; keyCode is JS keyCode (65='A', 13=Enter, etc.)
    if (down && keyCode === 73) { // 'I' key
        // respond to input
    }
});

ModLoader.after('com.watabou.sevendrl.scenes.GameScene', 'layout', function() {
    // Called on window resize + scene entry; position/size UI relative to rWidth/rHeight
});
```

## Custom signals (mod-created)

You can create your own signals for other mods to hook:

```js
window.mySignal = new msignal_Signal1();  // takes 1 argument
window.mySignal.dispatch(value);           // fire it
window.mySignal.add(callback);             // subscribe

// Or Signal0 (no arguments):
window.myEvent = new msignal_Signal0();
window.myEvent.dispatch();
```

## Signals NOT exposed (you cannot hook these directly)

Some important game logic doesn't fire signals:
- **Mob spawn** — hook `spawnMobs()` instead (see `add-encounter.md`)
- **Clue generation** — hook `spawnClues()` or `Clue.constructor()` instead
- **Ability activation** — hook the ability's `onActivate` callback in `Rogue.Ability.registerAbility()`
- **Room generation** — hook `GameScene.constructor` or `Plan.init()` instead
- **Action execution** — hook `ActionX.act()` / `engage()` / `collect()` instead

## Hook patterns for non-signaled events

For events without signals, use ModLoader hooks on the relevant methods:

| Event | Hook target | Method | Args |
|---|---|---|---|
| Before mob spawns | `com.watabou.sevendrl.SevenDRL` | `spawnMobs` | (none, `this` = game) |
| After mob spawns | (same, but `after` hook) | `spawnMobs` | (none, `this` = game) |
| Before clue spawns | `com.watabou.sevendrl.SevenDRL` | `spawnClues` | (none, `this` = game) |
| Before damage applied | `com.watabou.sevendrl.characters.Mob` (or `Hero`) | `damage` | `(value)` — modify `arguments[0]` to rescale |
| Before room changes | `com.watabou.sevendrl.characters.Hero` | `setRoom` | `(newRoom)` |
| After room changes | (same, but `after` hook) | `setRoom` | (none, room already changed) |

Example: respond before hero takes damage

```js
ModLoader.hook('com.watabou.sevendrl.characters.Hero', 'damage', function(value) {
    if (window.__eventLogAdd) window.__eventLogAdd('Hero takes ' + value + ' damage');
}, null);
```

## msignal types

- `Signal0` — no arguments
- `Signal1` — one argument
- `Signal2` — two arguments (if you need more, use an object: `Signal1` with `{a, b, c}`)

```js
// Dispatch with argument:
window.mySignal.dispatch(someValue);

// Subscribe and unsubscribe:
mySignal.add(handler);
mySignal.addOnce(handler);  // fires once, then auto-removes
mySignal.remove(handler);
mySignal.removeAll();
```

## Lifetime — when to remove listeners

Canvas UI signals persist until scene reset (no cleanup needed — they fire
during a running scene). If you add a listener in a before-hook that runs
repeatedly, remove it explicitly to avoid duplicates:

```js
var handler = function(val) { /* ... */ };

// Subscribe once:
game.clueFound.add(handler);

// Later, when done:
game.clueFound.remove(handler);
```

For permanent listeners that should survive scene resets and continue listening
across the whole session, it's usually safe to `.add()` once during mod load and
leave it — the signal object itself persists on `game`/`hero`.

## Reference

- `GLOBALS_REFERENCE.md` — what's on `window` and when it's safe to access
- `debugging.md` — console inspection commands
- `modding.md` — ModLoader hook patterns (before/after/hook differences)
