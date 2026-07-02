# Entry Point & Architecture — What Loads When

## The Short Answer

**You load from `Dev-Tools/index.html`, NOT the bare `index.html`.**

The game runs in **two states**:

| State | Entry | What Runs | Edit What? |
|---|---|---|---|
| **Bare Game** | `index.html` | SevenDRL.js only (no mods) | Never used for dev |
| **Dev Tools** | `Dev-Tools/index.html` | SevenDRL.js + ModLoader + all mods | This is how you work |

---

## Boot Sequence (Dev Tools)

```
1. Browser loads Dev-Tools/index.html
   ├─ <script src="/mp3_patch.js">           — audio shim (first, always)
   ├─ <script src="/SevenDRL.js">            — game bundle (IIFE, 80k lines)
   │  └─ Classes stay IIFE-scoped until step 4
   │
2. Dev-Tools/index.html runs JavaScript:
   ├─ initConsole()                         — set up console UI
   ├─ loadModsFromManifest()                — read Dev-Tools/mods/manifest.js
   │  └─ Fetch + execute each mod in order
   │     (ModLoader queues patches if classes aren't on window yet)
   │
3. Game loop starts:
   ├─ lime.embed() called from SevenDRL.js
   │  └─ Exports all Haxe classes to window (e.g. window.com_wababou_sevendrl_Game)
   │  └─ Runs Game.main() → creates Main → TitleScene
   │
4. ModLoader.flush()
   ├─ Retries all queued patches now that classes are available
   ├─ Hooks, befores, afters all attach
   │
5. TitleScene appears
   ├─ Title menu (canvas-based, via title-menu.js mod)
   ├─ Player selects difficulty/character
   ├─ New Game → GameScene boots
```

**Key insight:** Mods load BEFORE `lime.embed()` runs, so ModLoader queues patches. Once classes appear on `window`, everything attaches.

---

## What "Modules" Are (Not the Entry Point)

The `modules/` directory is a **read-only reference mirror**:

```
modules/
├── core/
│   ├── characters.js      ← Copy of Mob/Hero/Clue from SevenDRL.js
│   ├── game.js            ← Copy of SevenDRL game logic
│   ├── visuals.js         ← Copy of Indicator/CardIndicator/etc.
│   └── ...
├── watabou/               ← Copy of coogee engine classes
├── tracery/               ← Copy of grammar engine
└── DEPENDENCIES.md        ← Dependency graph
```

**These files are EXTRACTED from SevenDRL.js for reading only.**

**Editing `modules/` files does NOTHING at runtime.** The actual code lives in `SevenDRL.js`, compiled from Haxe.

---

## SevenDRL.js: The Single Source of Truth

**`SevenDRL.js` is a compiled Haxe bundle. Never edit it directly.**

Instead:
- **Read it** for understanding (how does Mob work? Search `com_watabou_sevendrl_characters_Mob`)
- **Patch it** via mods (hook methods, wrap classes, add behavior)
- **Reference modules/** when reading gets unwieldy (it's commented, sevenDRL.js is minified)

### How Mods Patch SevenDRL.js

```js
// Mod file (Dev-Tools/mods/my-mod.js)
ModLoader.hook('com.watabou.sevendrl.characters.Mob', 'damage', function(value) {
    arguments[0] = value / 2;  // all mobs take half damage
}, null);
```

This takes the *existing* method on `Mob.prototype` and wraps it. No recompilation needed.

---

## What Loads When: Timeline

```
t=0ms      Browser loads Dev-Tools/index.html
t=10ms     mp3_patch.js runs
t=20ms     SevenDRL.js runs (IIFE executes, classes stay local)
t=30ms     index.html's <script> runs: initConsole(); loadModsFromManifest()
t=40ms     Mod 1 (loader.js) loads → ModLoader available
t=50ms     Mods 2-19 load in sequence → patches queued in ModLoader.patches
t=100ms    lime.embed() called from inside SevenDRL.js
t=101ms    Game.main() runs → Main() → TitleScene constructed
t=102ms    TitleScene.activate() runs
t=103ms    ModLoader.flush() retries all queued patches → NOW they attach
           (classes are on window, so hooks work)
t=110ms    TitleScene displays → player sees title menu
```

**Critical window:** Between t=50ms (mods loaded) and t=103ms (classes appear), mods are queued but not executing. This is normal. ModLoader handles it.

---

## Files You Should Know

### Core Infrastructure (Read, Don't Edit)
- `SevenDRL.js` — compiled game (never edit; read for understanding)
- `index.html` — bare game (only for testing without mods; not for dev)
- `runtime/base.js` — Haxe runtime (never edit)

### Development Entry (Always Use This)
- `Dev-Tools/index.html` — **your entry point**
- `Dev-Tools/mods/manifest.js` — mod load order (edit to enable/disable mods)
- `Dev-Tools/mods/loader.js` — ModLoader system (read to understand hooks)

### Reference Only (Don't Edit)
- `modules/core/*.js` — mirrors of SevenDRL.js source (for reading)
- `modules/watabou/*.js` — engine code mirrors (for reading)
- `modules/DEPENDENCIES.md` — who calls what

### Where Work Happens
- `Dev-Tools/mods/*.js` — your feature mods (edit freely)
- `Dev-Tools/skills/*.md` — documentation (edit/maintain)
- `assets/` — game content (JSON, audio, fonts)

### Don't Touch
- `SevenDRL.js` — compiled bundle, never edit
- `modules/` — read-only reference
- `runtime/base.js` — Haxe runtime
- Bare `index.html` — for comparison only, not for dev

---

## If You Edit the Wrong Thing

### Edit SevenDRL.js directly
**Result:** Changes lost on next compile. If someone runs `haxe build.hxml` (nobody ever will), your edits vanish.

**Fix:** Never do this. Use mods instead.

### Edit modules/
**Result:** No effect. The game runs from SevenDRL.js, not modules.

**Fix:** Edit the mod that *patches* the behavior you want to change, or create a new mod.

### Use bare index.html
**Result:** Game runs with NO mods. You see the native engine, not your dev work.

**Fix:** Always use `Dev-Tools/index.html`.

### Don't uncomment a mod in manifest.js
**Result:** Mod doesn't load. Your feature doesn't appear.

**Fix:** Uncomment the line in `manifest.js`, then reload.

---

## The One-Line Rule

**All changes are mods. Mods patch SevenDRL.js via ModLoader. Everything else is read-only reference.**

---

## New Developer Checklist

- [ ] Load the game via `Dev-Tools/index.html` (never bare `index.html`)
- [ ] Know that `SevenDRL.js` is the actual game (read it, never edit it)
- [ ] Know that `modules/` is reference only (read it, never edit it)
- [ ] Know that all your work goes in `Dev-Tools/mods/*.js`
- [ ] Know that to enable a feature, uncomment it in `manifest.js`
- [ ] Know that ModLoader patches methods, it doesn't replace classes
- [ ] Read `SYSTEM_MAP.md` for the full boot sequence
- [ ] Read `modding.md` for hook patterns (before/after/hook)
- [ ] Ask: "Is this a mod?" before editing anything
- [ ] Ask: "Does manifest.js have this uncommented?" before debugging missing features

---

## Reference

- `SYSTEM_MAP.md` — full boot sequence diagram
- `modding.md` — ModLoader API and patterns
- `API_REFERENCE.md` — what classes/methods are available
- `Dev-Tools/mods/manifest.js` — load order
