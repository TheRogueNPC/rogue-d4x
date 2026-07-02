# Extending — how to grow the mod/template/doc system itself

This doc is about extending the *tooling*, not the *game*. If you want to
add a mob/scene/ability/etc., go to `Dev-Tools/skills/workflows/` — this
page is for when no workflow doc covers what you're doing yet, or when
you're adding a new piece of the documentation/template system.

## The convention every template mod follows

Every file in `Dev-Tools/mods/` that exists purely as a copy-paste starting
point (not an active mod) follows the same shape:

```js
// ═══════════════════════════════════════════════════════════════════
// MOD: your-mod.js — one-line description
// Load after: <whatever it ModLoader.resolve()s or assumes is on window>
//
// This is a TEMPLATE — uncomment in manifest.js to activate. / [or:]
// Uncomment the body below to activate.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';
    // ... ModLoader.resolve() everything, Object.create() for inheritance
    // (NEVER $extend()/$hxClasses — see modding.md), guard with
    // `if (!Cls) { devLog(...); return; }` when a class might not be
    // ready yet, hook real methods (never 'constructor' — see SYSTEM_MAP.md)
    if (window.devLog) window.devLog('[mod:your-mod] loaded — <what happened>');
})();
```

It's registered in `manifest.js`'s "Template mods" section, **commented
out** — the convention is the manifest entry stays commented (so the file
never loads by default), not that the file's own body is comment-wrapped.
A handful of older templates wrap their body in `/* */` too (belt-and-
suspenders) — either is fine, but the manifest comment is what actually
matters for whether it loads.

## Adding a new workflow doc

1. Check `Dev-Tools/skills/workflows/` first — if an existing doc is 80%
   there, extend it rather than fork a near-duplicate (this repo had two
   near-identical `add-scene.md`/`add-scene-live.md` docs giving
   *contradictory* advice before being merged into one — don't recreate
   that).
2. Pair it with a working `.js` template in `Dev-Tools/mods/` whenever the
   workflow involves more than a couple lines of code — "duplicate this
   file and adapt it" is the actual deliverable an AI assistant or modder
   wants, not just prose.
3. **Test the template before committing to the doc.** Every template in
   this repo as of this writing has been loaded live via
   `fetch(path).then(r=>r.text()).then(eval)` in the dev console and
   confirmed it doesn't throw — do the same for anything new. Several
   pre-existing templates (`add_mob_phantom.js`, `add-card.js`, `add-
   scene.js`) had real bugs (`$extend` ReferenceErrors, a `ModLoader.hook`
   on `'constructor'` that silently does nothing because patching
   `prototype.constructor` doesn't affect what `new Cls()` calls) that sat
   undetected because nobody had actually run them.
4. Link it from `SKILL.md`'s Workflows list and cross-reference related
   docs (`API_REFERENCE.md`, `rogue-api.md`, etc.) the same way the
   existing docs do — these are meant to be navigated by jumping between
   them, not read as one linear document.

## Adding a new top-level skill doc (like this one)

Only do this for genuinely new categories of reference — when in doubt,
extend `SYSTEM_MAP.md` or `API_REFERENCE.md` instead of adding a new file.
If you do add one:
1. Add it to the file tree in `SYSTEM_MAP.md`.
2. Add it to `SKILL.md`'s file tree AND its "Where to go next" /
   "Workflows" pointers.
3. Cross-link it from anything it overlaps with.

## When you find a stale or wrong doc

Fix it in place rather than writing a competing doc next to it (see point 1
above). If you're not sure whether something is current, check it against
the actual running code — every doc in `Dev-Tools/skills/` as of this
writing was either freshly verified against `SevenDRL.js`/live page state,
or explicitly flagged where it couldn't be. Don't trust a doc's own
confidence; trust the source and the running page.

## Known gaps (intentionally not built — see why before building them)

- **PNG/SVG character portraits** — `findVisual()` in `play.js` and the
  visuals field in character JSON exist, but nothing renders them; every
  shipped character uses `glyph` only. Building this means wiring
  `openfl.display.Loader`/`BitmapData` (see `API_REFERENCE.md`'s Assets
  section) — not done because no character ships with image art yet.
- **Real DLC purchase flow** — `title-menu.js`'s Level Editor/Character
  Creator entries are gated behind `window.__dlcUnlocked` (default false,
  flip with `__unlockDLC()` for testing) with no backend — there's nowhere
  to sell anything yet. The gate exists so a real store integration has
  somewhere to plug in later.
- **Save/resume across sessions** — "Continue" in the title menu reuses the
  last difficulty/loadout *this session*, it doesn't persist across a page
  reload. There's no save-game system in this engine at all currently.
