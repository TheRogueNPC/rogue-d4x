# Modding System

## Architecture

SevenDRL.js is a compiled Haxe bundle wrapped in an IIFE. All Haxe classes are inside the IIFE closure, NOT globally accessible. The mod loader patches class prototypes on `window` using flattened underscore names.

### Critical Rule: Class Resolution
Haxe `com.watabou.sevendrl.SevenDRL` becomes `window.com_watabou_sevendrl_SevenDRL`. Classes are only available on `window` AFTER `lime.embed()` runs. The mod loader polls for class availability.

### Object.create Pattern (No $extend)
`$extend` and `$hxClasses` are scoped inside the SevenDRL.js IIFE — they are NOT global. Custom class inheritance MUST use `Object.create()`:

```js
// WRONG: var MyClass = $extend(Base, { ... }); // ReferenceError
// RIGHT:
var Cls = function(game, pos) { Base.call(this, game, pos); };
Cls.__name__ = 'com.example.MyClass';
Cls.__super__ = Base;
Cls.prototype = Object.create(Base.prototype);
Cls.prototype.__class__ = Cls;
window['com_example_MyClass'] = Cls;
```

## Hook System (ModLoader)

### Available Methods
- `ModLoader.hook(className, method, beforeFn, afterFn)` — wrap a method
- `ModLoader.before(className, method, fn)` — shorthand for before-only
- `ModLoader.after(className, method, fn)` — shorthand for after-only
- `ModLoader.replace(className, method, fn)` — fully replace a method

### Hook Chain
- Last registered hook wraps previous ones (FIFO order)
- `before` handlers run outside-in (last hook registered runs first)
- `after` handlers run inside-out
- Set `this.__suppressOrig = true` in a before-handler to stop the chain

### Validation
Always verify the method exists before hooking:
```js
var v = ModLoader.validateMethod('com.watabou.sevendrl.SevenDRL', 'proceed');
if (!v.ok) console.log(v.reason, v.available);
```

### Method Listing
```js
ModLoader.listMethods('com.watabou.sevendrl.SevenDRL');
// → ['proceed', 'addChar', 'remove', 'explore', 'gameOver', ...]
```

## Manifest Order
Add mods to `Dev-Tools/mods/manifest.js`. Order matters — hooks registered later wrap earlier ones (the last-registered hook becomes the outermost wrapper). `Dev-Tools/mods/manifest.js` is the source of truth; current active order:

1. `asset-fixer.js` (must be first — patches before the game boots)
2. `loader.js` (bootstrapper — ModLoader itself)
3. `game.js`, `characters.js`, `scenes.js` (core game patches)
4. `debug.js`, `eventlog.js`, `zombies.js`
5. `rogue-api.js` (unified API — Plan.create override, exposes `Rogue.UI`)
6. `char-creator.js`, `pause-menu.js` (depend on `Rogue.UI`)
7. `ability.js`, `ability-pickup.js` (ability/aim canvas UI)
8. `play.js` (difficulty/character select, death retry — depends on `Rogue.UI`)
9. `hud-bars.js` (left-side stat column — depends on `Rogue.UI`/native visuals, loads after the ability mods so it can read their state)
10. `view-mode.js`
11. `ui/dev-toolbar.js`, `ui/inspector.js` (DOM dev tools, load last)

Any mod using `Rogue.UI` (canvas panels/buttons/etc.) must load after `rogue-api.js`.

## Registering Custom Classes
For custom mob subclasses, use `Rogue.Mob.define(def)` which handles `Object.create` and state classes automatically. For custom ability pickups, use `Object.create(Clue.prototype)` so `instanceof Clue` is true — the game's `ActionCollect` will auto-detect them.
