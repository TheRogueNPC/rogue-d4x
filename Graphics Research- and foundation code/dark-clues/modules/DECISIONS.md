# Module System — Decision Log

Started 2026-06-23, continuing the modularization effort already begun by
`extract-seven-drl.js`. Backup taken first: `../dark-clues-BACKUP-20260623-123755`
(sibling directory, full copy, 1208 files verified to match).

## Ground truth established before touching anything

1. `runtime/base.js` (project root, 2.4MB) already exists — it is NOT missing.
   `modules/DEPENDENCIES.md`/`IN_OUT_GLOSSARY.md` describe it as load-order
   layer 0. `modules/index.js` does `import "./runtime/base.js"`, which
   resolves to `modules/runtime/base.js` (doesn't exist) unless an import map
   redirects it. `Dev-Tools/index-modules.html` already has such a map.

2. `node --check` on every module/runtime/SevenDRL.js file passes RIGHT NOW
   (verified 2026-06-23 12:4x). The syntax errors documented in `error-log.md`
   (2026-06-22 14:04) and "Known Outstanding Issues" in `FIXES.md` — leading
   commas in `characters.js`/`states.js`, unicode arrows in `processes.js`,
   the SevenDRL.js ":" token error at line 6465 — are already resolved by a
   prior pass. Do not re-fix what's already fixed; this log supersedes those
   two files' "outstanding issues" sections.

3. `Dev-Tools/index-modules.html`'s import map redirected `game.js`,
   `characters.js`, `scenes.js` to `./mods-importmap/{file}.js` — that
   directory is EMPTY. This was a stopgap from when those 3 real files had
   syntax bugs (now fixed). FIXED: redirected those 3 entries back to the
   real `../modules/core/*.js` files, matching the other 10 entries.

4. Root-level `index-modules.html` (project root, not Dev-Tools/) has
   `../`-relative paths that only make sense one directory deeper — it's a
   stale duplicate of the Dev-Tools/ copy. Not fixing it; `Dev-Tools/`
   version is the one with a matching import map and `mods-importmap` dir
   reference point. Leaving the root copy alone (out of scope, not deleting
   user files without being asked).

## The real break: two structural bugs, not syntax

### Bug A — `DocumentClass` orphaned in `runtime/base.js`

`runtime/base.js:3242-3252` defines:
```js
var DocumentClass = function(current) {
    current.addChild(this);
    com_watabou_sevendrl_Main.call(this);   // <-- Main does not exist in this file
    ...
};
DocumentClass.__super__ = com_watabou_sevendrl_Main;
DocumentClass.prototype = $extend(com_watabou_sevendrl_Main.prototype, {...});
```
`com_watabou_sevendrl_Main` was correctly extracted to `modules/core/game.js`
(`module-manifest.json` confirms `com.watabou.sevendrl.Main` lives there).
`DocumentClass` itself does NOT exist in `game.js`. Nothing else defines it.
The moment `ApplicationMain.start()` (runtime/base.js:957) runs
`new DocumentClass(current)`, this throws `ReferenceError: com_watabou_sevendrl_Main
is not defined` inside runtime/base.js's own closure. This is almost
certainly the originating crash, consistent with the user's account
("a UI realignment task caused a ':' issue, then it spiraled").

**Fix:** move the `DocumentClass` block out of `runtime/base.js` into the end
of `modules/core/game.js` (where `Main` actually lives), export it to
`window.DocumentClass`, and change `runtime/base.js:957` to call
`window.DocumentClass` instead of the bare (now-removed) identifier.

### Bug B — zero cross-module visibility (no exports anywhere)

`modules/core/*.js`, `modules/watabou/*.js`, `modules/tracery/*.js` declare
every class as a bare top-level `var ClassName = function(){...}` with
**zero** `export`, `import`, or `window.X = X` statements anywhere (checked
all 13 files). As ES modules these are completely private to each file's own
module scope:
- Cross-module references break (`characters.js` needs `SevenDRL`/`Game` from
  `game.js`; `actions.js` needs `Character` from `characters.js`; etc.)
- The entire `Dev-Tools/mods/*.js` system (15 mods) is built around
  `window.com_watabou_*` flat globals — none of it can hook anything.

**Fix:** append a window-export block to each of the 13 files, generated
from `module-manifest.json` (dotted Haxe name -> `window[flatName] = flatName`).
This is the same fix already applied to `SevenDRL.js` earlier today for the
same underlying reason (classes never escaping their closure to `window`),
just done per-file with a known class list instead of a generic `$hxClasses`
dump.

### Bug C — `runtime/base.js`'s class definitions are lazy, but consumers need them eager

`runtime/base.js` keeps the *exact* `lime.embed()`/`$hx_script` lazy-invocation
wrapper from the original compiled bundle: none of its ~405 runtime classes
(`openfl_display_Sprite`, `lime_utils_Assets`, etc.) actually exist until
something calls `lime.embed("SevenDRL")`. In the original monolith this was
fine — every class (engine + game) lived in the SAME deferred closure, so
nothing needed them before embed-time. Now that `modules/core/game.js` etc.
are separate, eagerly-loaded ES modules that reference those runtime classes
by bare name AT THEIR OWN LOAD TIME (e.g. `$extend(openfl_display_Sprite.prototype, ...)`),
they load before `lime.embed()` is ever called — `openfl_display_Sprite` is
undefined at that point. Chicken-and-egg.

**Fix:** force `runtime/base.js` to invoke its own deferred `$hx_script`
eagerly, exactly once, at file-load time (`$hx_script(window, window)`),
combined with the same `$hxClasses` dump-to-window patch used on `SevenDRL.js`
today. This populates every runtime class onto `window` immediately rather
than waiting for an external embed call. The page's boot script must then
call `ApplicationMain.main(); ApplicationMain.create({parameters:{}})`
directly (classes already exist on window) instead of `lime.embed("SevenDRL", ...)`
— calling the old `lime.embed` path would re-run `$hx_script` a SECOND time,
creating a second, distinct set of class objects and breaking `instanceof`
checks against anything already constructed with the first set.

### Bug D — `modules/index.js` import paths assume it lives at project root, and the import-map "fix" for that was itself broken

`modules/index.js` writes `import "./runtime/base.js";` and `import "./modules/watabou/geom.js";` etc — paths that are only correct if this file lived at the project root. It actually lives in `modules/`, so those resolve to `modules/runtime/base.js` (doesn't exist) and `modules/modules/watabou/geom.js` (doubled, doesn't exist). Confirmed via live network trace: every nested import 503'd at exactly those wrong doubled paths.

`Dev-Tools/index-modules.html` tried to "fix" this with an import map redirecting `"./runtime/base.js"` -> `"../runtime/base.js"` etc. This does not work: import map keys starting with `./` are resolved relative to the **document** (the HTML file), not relative to whichever module does the importing. So the key `"./runtime/base.js"`, as written, can only ever intercept an import of that exact literal specifier text — which it should in theory (specifier text match is literal, not URL-resolved, per spec) — but empirically, live in Chrome, it did not intercept anything; every request hit the raw, unmapped, doubled path. Whatever the precise spec subtlety, the import-map approach was unreliable in practice and added a fragile indirection layer for no benefit once the real fix is available.

There is also a second, unrelated, fully corrupted file: project-root `index.js` (not `modules/index.js`) contains 14 literal `import "./m";` placeholder lines — clearly mangled by the same kind of bad automated edit that hit SevenDRL.js. Nothing references this file (Dev-Tools/index-modules.html imports `modules/index.js`, not root `index.js`). Left untouched — out of scope, not deleting user files without being asked, and nothing depends on it.

**Fix:** rewrote `modules/index.js` with paths relative to its own real location (`../runtime/base.js`, `./watabou/geom.js`, `./core/game.js`, etc). Removed the import map from `Dev-Tools/index-modules.html` entirely — no longer needed.

## Execution order (this session)

1. [done] Backup
2. [done] node --check ground truth
3. [done] Fix Dev-Tools/index-modules.html import map (mods-importmap -> real files) — superseded by step 10, map removed entirely
4. [done] Move DocumentClass: runtime/base.js -> modules/core/game.js
5. [done] Patch runtime/base.js: $hxClasses dump + eager $hx_script self-invocation
6. [done] Add window-export blocks to all 13 modules/* files per module-manifest.json
   (also found + removed a duplicated Wanderer class in states.js that didn't
   belong there per DEPENDENCIES.md and would have thrown ReferenceError on
   its own load — Mob, which it depends on, lives in characters.js, loaded later)
7. [ ] Update Dev-Tools/index-modules.html boot script (ApplicationMain direct call, not lime.embed) — deferred, testing lime.embed path first since the original code's `||` fallback guards should make it safe
8. [done] Found Bug D live (network trace) — fixed modules/index.js paths directly, removed broken import map
9. [ ] Test live in browser again — read actual console output, not just "did it launch"
10. [ ] Iterate on whatever the real error says, not on theory
