# Workflow: Debug Crashes and Hook Failures

## Prerequisites
- Browser DevTools open (F12 → Console tab)
- Game running, mods loaded

## Symptom: "$hxClasses is not defined"

**Cause:** `$hxClasses` is a `var` inside SevenDRL.js's IIFE, NOT on window.
Any code referencing `$hxClasses` outside the IIFE throws ReferenceError
(in strict mode).

**Fix:** Use `window[flatName]` instead:

```js
// WRONG:
$hxClasses["com.watabou.sevendrl.characters.Hero"]

// RIGHT:
window.com_watabou_sevendrl_characters_Hero
// or:
ModLoader.resolve("com.watabou.sevendrl.characters.Hero")
```

## Symptom: "Class not found" / Hooks silently do nothing

**Cause 1:** Hooking a non-existent method (e.g., `createPlan` which isn't
on the SevenDRL prototype). The hook queues a patch that never applies.

**Diagnosis:**
```js
ModLoader.validateMethod("com.watabou.sevendrl.SevenDRL", "createPlan")
// → { ok: false, reason: 'Method not found', available: ["explore","proceed",...] }

ModLoader.listMethods("com.watabou.sevendrl.SevenDRL")
// → all real methods
```

**Fix:** Only hook methods that exist. Use `validateMethod()` first.

**Cause 2:** The mod loaded BEFORE `lime.embed()` exported classes (normal),
but `ModLoader.flush()` was never called.

**Fix:** `flush()` is called automatically by the `lime.embed` wrapper in
`index.html`. If you call `lime.embed` manually, also call `ModLoader.flush()`
right after.

## Symptom: All hooks run the SAME callback (last registered one)

**Cause:** Classic JS closure bug — `var p` and `var orig` in the `flush()`
loop are function-scoped, so all closures capture the last iteration's values.

**Diagnosis:** If `proceed` and `gameOver` both trigger `gameOver`'s callback,
this is the bug.

**Fix:** Already fixed in `loader.js` v2 by wrapping the loop body in an IIFE.
If you write your own loops that create closures, always use an IIFE or `let`.

```js
// WRONG:
for (var i = 0; i < arr.length; i++) {
    var p = arr[i];
    someObj.method = function() { p.fn(); };  // all share LAST p
}

// RIGHT:
for (var i = 0; i < arr.length; i++) {
    (function(p) {
        someObj.method = function() { p.fn(); };  // each has own p
    })(arr[i]);
}
```

## Symptom: "No hero" / "No game" / "No plan" messages

**Cause:** `window.sevendrl` and `window.hero` are not set yet. These
globals are captured by the `proceed` hook, which fires on the first user
click (game turn).

**Diagnosis:** Check if globals exist:
```js
window.sevendrl  // undefined = not captured yet
window.hero      // undefined = not captured yet
```

**Fix:** Click the game canvas. This triggers `onClick` → `hero.target(cell)`
→ `game.proceed()` → our hook fires → globals set.

## Symptom: "sevendrl is not defined" (ReferenceError)

**Cause:** Accessing `sevendrl` without `window.` prefix in strict mode
when the variable hasn't been declared yet.

```js
// WRONG (throws ReferenceError before globals are set):
if (!sevendrl) { ... }

// RIGHT (safe — reads undefined instead of throwing):
if (!window.sevendrl) { ... }
```

## Symptom: Asset files return 404 (ambience.ogg, clues.json, etc.)

**Cause 1:** The page is opened via `file://` protocol (double-clicking the
HTML file). The game uses HTTP requests to load assets, which are blocked
on `file://`.

**Fix:** Always serve via HTTP. Run `start-devtools.bat` and use
`http://localhost:8080/Dev-Tools/index.html`.

**Cause 2:** The page path resolves assets relative to the Dev-Tools
subdirectory. `assets/ambience.ogg` becomes `Dev-Tools/assets/ambience.ogg`.

**Fix:** `<base href="/">` in HTML makes all relative URLs resolve from
server root. Assets at `/assets/ambience.ogg` load correctly.

## Symptom: Mod changes don't appear after edit

**Cause:** Browser cache. F5 often doesn't invalidate cache for individual
script files.

**Fix:** Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac).
Or open DevTools → Network → check "Disable cache" → reload.

The manifest.js script tag also has `?v=DEVTOOLS` cache buster, and individual
mod paths get `?v=Date.now()` appended.

## Symptom: `ModLoader.patches` never empties

**Cause:** A patch targets a class or method that doesn't exist on window.
The flush timer retries every 500ms but can never apply it.

**Diagnosis:** Check what's remaining:
```js
ModLoader.patches  // array of { className, method, before, after }
```

Use `ModLoader.validateMethod()` on each pending class/method to find the
broken one.

## Symptom: Game doesn't render / blank canvas

**Cause 1:** `lime.embed` target element not found. Check that
`<div id="openfl-content">` exists.

**Cause 2:** An error in a mod script prevents the game from initializing.
Check F12 console for errors. Common culprit: accessing `$hxClasses`.

**Fix:** Comment out mods one by one in manifest.js to isolate the problem.

## Reference
- `Dev-Tools/skills/SKILL.md` — architecture doc with IIFE/lime.embed details
- `Dev-Tools/mods/loader.js` — ModLoader v2 source
- `Dev-Tools/mods/debug.js` — DBG commands for runtime inspection
