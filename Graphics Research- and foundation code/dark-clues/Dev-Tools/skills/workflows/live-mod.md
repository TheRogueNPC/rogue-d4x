# Workflow: Create a Live Mod

## Prerequisites
- Game running at `http://localhost:8080/Dev-Tools/index.html`
- F12 dev console open

## Overview

A "live mod" is a `.js` file in `Dev-Tools/mods/` that uses `ModLoader.hook()`
to extend the game at runtime. Edit → save → hard refresh (Ctrl+Shift+R).

## CRITICAL: Understand the Architecture First

Before writing a mod, you MUST understand these constraints (learned from hard
debugging — see `skills/SKILL.md` for full details):

1. **`$hxClasses` is NOT global** — it's a `var` inside SevenDRL.js's IIFE.
   Always use `ModLoader.resolve("com...ClassName")` → `window.com_...ClassName`.
   NEVER reference `$hxClasses` — it will throw ReferenceError.

2. **Methods called in the constructor (spawnMobs, spawnClues) run BEFORE patches**
   — `lime.embed()` runs ALL game init synchronously. Our patches are applied
   AFTER it returns. Hook `proceed` (fires on every game tick) or user-triggered
   methods like `onClick` for reliable capture.

3. **Always validate method names** — hooking a non-existent method silently
   queues a patch that never applies. Use `ModLoader.validateMethod()` first.

## Steps

### 1. Discover what to hook

In the F12 console (after clicking the game canvas to activate globals):

```js
// List all methods on a class
ModLoader.listMethods("com.watabou.sevendrl.SevenDRL")
// → ["explore", "cell", "addChar", "proceed", "spawnMobs", "spawnClues",
//    "collectClue", "gameOver", "finish", "remove", ...]

// Validate a method exists before writing mod code
ModLoader.validateMethod("com.watabou.sevendrl.SevenDRL", "proceed")
// → { ok: true }

// Search for a class
ModLoader.find("Hero")
// → ["com.watabou.sevendrl.characters.Hero"]
```

### 2. Create the mod file

`Dev-Tools/mods/my-mod.js`:

```js
(function() {
    'use strict';

    // Always validate target before hooking
    var check = ModLoader.validateMethod("com.watabou.sevendrl.SevenDRL", "proceed");
    if (!check.ok) {
        devLog("[my-mod] SKIPPED: " + check.reason);
        return;  // class not available yet — will retry via ModLoader.flush()
    }

    // Use shorthand: ModLoader.after() for post-hook only
    ModLoader.after("com.watabou.sevendrl.SevenDRL", "proceed", function() {
        var h = this.hero;
        devLog("[my-mod] turn processed | hero HP: " + h.hp + "/" + h.maxHP);
    });

    devLog("[my-mod] loaded");
})();
```

### 3. Register in manifest

Edit `Dev-Tools/mods/manifest.js`:

```js
"/Dev-Tools/mods/my-mod.js",       // ← absolute path from server root
```

### 4. Hard refresh

**Ctrl+Shift+R** (not F5 — F5 may serve cached files). Check for:
```
[my-mod] loaded
```

## ModLoader API (v2)

### Shorthands (preferred over raw hook)

```js
ModLoader.after(className, method, fn)     // fn(this, result, args) after original
ModLoader.before(className, method, fn)    // fn(this, args) before original
ModLoader.replace(className, method, fn)   // fn(this, args) → replaces method entirely
```

### Raw hook (full control)

```js
ModLoader.hook(className, method, beforeFn, afterFn)
```

### Batch registration

```js
ModLoader.addHooks({
    "com.watabou.sevendrl.SevenDRL": {
        proceed: { after: function() { devLog("turn"); } },
        gameOver: { before: function(won) { devLog("over:", won); } }
    },
    "com.watabou.sevendrl.characters.Hero": {
        die: { before: function() { devLog("hero died!"); } }
    }
});
```

### Utility

```js
ModLoader.resolve("com.watabou.sevendrl.SevenDRL")  // → window class
ModLoader.validateMethod(cls, method)                 // → { ok } or { ok: false, reason, available }
ModLoader.listMethods(cls)                            // → ["explore", "proceed", ...]
ModLoader.inspect(cls)                                // → { name, superclass, methods, statics }
ModLoader.find("pattern")                             // → ["com...Clue", "com...Hero", ...]
```

## Timing & Activation

```
Page load
  ↓
Mods load (hook calls queue patches — classes not on window yet)
  ↓
lime.embed() runs (game initializes synchronously)
  ↓
lime.embed returns → ModLoader.flush() patches all prototypes
  ↓
User clicks canvas → proceed() fires → HOOK ACTIVATED
```

The `proceed` hook fires on EVERY game tick after the first click.
Methods called in the constructor (`spawnMobs`, `spawnClues`) are missed on
first load but fire on subsequent calls (restart, new level).

## Common Patterns

### Capture globals on first proceed() call

```js
ModLoader.after("com.watabou.sevendrl.SevenDRL", "proceed", function() {
    if (!window.myVar) window.myVar = this;  // first call = capture
});
```

### Subscribe to game signals

```js
(function wait() {
    if (window.sevendrl) {
        window.sevendrl.clueFound.add(function(clue) {
            devLog("Clue found: " + clue.text);
        });
        return;
    }
    setTimeout(wait, 500);
})();
```

## Reference
- `Dev-Tools/skills/SKILL.md` — full architecture doc
- `Dev-Tools/mods/loader.js` — ModLoader source
- `Dev-Tools/mods/debug.js` — DBG API reference
- `modules/IN_OUT_GLOSSARY.md` — every hookable point
- `modules/DEPENDENCIES.md` — class dependency graph