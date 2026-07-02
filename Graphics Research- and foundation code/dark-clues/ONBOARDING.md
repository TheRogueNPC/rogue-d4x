# Onboarding: New Developer Guide

Welcome to Dark Clues. This guide tells you everything you need to know to start
contributing without breaking things.

## The Architecture in 30 Seconds

**Dark Clues is a Haxe roguelike compiled to JavaScript.**

- **SevenDRL.js** (~80k lines) is the compiled game. Never edit it.
- **Mods** (in `Dev-Tools/mods/`) patch SevenDRL.js at runtime via ModLoader hooks.
- **Modules** (in `modules/`) are read-only mirrors of SevenDRL.js source for reference.
- **You work entirely in mods.** That's it.

```
┌─────────────────────────────────────────────────────────────┐
│ Your Browser                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Dev-Tools/index.html (load HERE)                          │
│  ↓                                                          │
│  SevenDRL.js (compiled game, IIFE-scoped)                  │
│  ↓                                                          │
│  ModLoader (patches things at runtime)                     │
│  ↓                                                          │
│  Your mods (Dev-Tools/mods/*.js)                           │
│  ├─ progression-system.js                                  │
│  ├─ ability.js                                             │
│  ├─ hud-bars.js                                            │
│  └─ (your new mods here)                                   │
│                                                             │
│  Result: Enhanced game with your features                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Critical Facts (Memorize These)

1. **Load via `Dev-Tools/index.html`, NOT bare `index.html`**
   - Bare `index.html` = game with no mods (for testing only)
   - Dev-Tools = game with all your mods (what you use for work)

2. **Never edit SevenDRL.js**
   - It's compiled, 80k lines of minified code
   - Changes get lost if anyone runs the Haxe compiler
   - Patch it via mods instead

3. **Never edit `modules/`**
   - These are read-only reference files
   - The real code runs from SevenDRL.js, not modules
   - Use modules to understand the code, not to change it

4. **All your work goes in `Dev-Tools/mods/`**
   - Create a `.js` file here for each feature
   - Use ModLoader.hook() to patch existing behavior
   - Uncomment in `manifest.js` to load it

5. **ModLoader is your interface to the game**
   - `ModLoader.resolve(className)` → get a class
   - `ModLoader.hook(className, method)` → patch a method
   - `ModLoader.before() / .after()` → add lifecycle hooks
   - See `modding.md` for the full API

---

## Before You Start

### What You Need to Know Exists

- **SevenDRL.js** — the game (read to understand, never edit)
- **modules/** — reference mirrors (read when confused, never edit)
- **Dev-Tools/mods/** — where you write code
- **Dev-Tools/index.html** — how to load the game
- **ModLoader** — how to patch the game
- **Rogue.UI** — canvas UI builder (instead of DOM)
- **window.__eventLog** — event log visible in console

### Where to Find Things

| Question | Answer |
|---|---|
| How does Mob work? | Read `modules/core/characters.js` or grep SevenDRL.js for `com_watabou_sevendrl_characters_Mob` |
| How do I patch a method? | See `modding.md` → ModLoader.hook pattern |
| How do I add a mob? | See `workflows/add-mob.md` |
| How do I add a UI panel? | See `workflows/add-ui-panel.md` |
| How do I debug something? | See `debugging.md` → DBG commands |
| What's on `window`? | See `GLOBALS_REFERENCE.md` |
| What are the game events? | See `SIGNALS_REFERENCE.md` |

### Common Gotchas

| Mistake | Why It's Wrong | Fix |
|---|---|---|
| Editing SevenDRL.js directly | Compiled bundle; changes lost on recompile; defeats the point of mods | Use a mod instead |
| Editing modules/*.js | Read-only reference; real code is in SevenDRL.js | Patch via mod |
| Using bare index.html | No mods load; you see only the native game | Use Dev-Tools/index.html |
| Using `$extend()` in a mod | It's IIFE-scoped, throws ReferenceError | Use `Object.create()` instead |
| Using `$hxClasses[...]` in a mod | Same IIFE-scope issue | Use `window.com_wababou_...` or `ModLoader.resolve()` |
| Hooking `'constructor'` | Doesn't work; patching prototype.constructor doesn't affect what `new Cls()` calls | Hook `'activate'` or a real method instead |
| Building canvas UI with DOM | Doesn't auto-cleanup on scene reset; breaks roguelike flow | Use `Rogue.UI` instead |
| Calling `CenteredText()` without `setWidth()` | Field stays at 100×100 instead of sizing to text | Call `tf.setWidth(2000)` immediately after |

---

## Your First 30 Minutes

### 1. Boot the Game (2 min)

```bash
cd dark-clues
# Start the dev server (if not already running)
node start-devtools.bat  # or however you launch it
```

Open http://localhost:8080/Dev-Tools/index.html in your browser.

You should see:
- Title screen (canvas menu)
- Game playable
- Dev console at bottom-right (if you enabled dev tools)

### 2. Verify You Can Add a Mob (10 min)

```bash
node Dev-Tools/scripts/generate-feature.js mob "TestMob" 2 0xFF0000 "Test creature"
```

This creates `Dev-Tools/mods/test-mob.js` with full boilerplate.

Edit the file:
- Change `visual: 't'` to `visual: 'T'`
- Change `color: 0xff0000` to something else (e.g., `0x00FF00`)

Uncomment in `Dev-Tools/mods/manifest.js`:
```js
// Add somewhere in the template mods section:
"/Dev-Tools/mods/test-mob.js",
```

Reload the game (Ctrl+Shift+R).

In the console, type:
```js
DBG.mobs()
```

You should see "TestMob" in the list. **Success!** You just added a feature.

### 3. Delete the Test Mob (2 min)

```bash
rm Dev-Tools/mods/test-mob.js
```

Comment out the line you uncommented in `manifest.js`.

### 4. Read Three Docs (15 min)

1. **ENTRY_POINT.md** (5 min) — you're reading it, covers what loads when
2. **QUICK_START.md** (5 min) — patterns for adding features
3. **modding.md** (5 min) — ModLoader API reference

---

## Essential Docs (Bookmark These)

| Doc | Use When | Time |
|---|---|---|
| `ENTRY_POINT.md` | Understanding the boot sequence, what to edit, what not to edit | 5 min |
| `QUICK_START.md` | Starting a new feature, unsure where to begin | 5 min |
| `modding.md` | Using ModLoader, understanding hooks | 10 min |
| `GLOBALS_REFERENCE.md` | Wondering what's on `window` and when it's safe to access | 10 min |
| `SIGNALS_REFERENCE.md` | Needing to listen to a game event | 10 min |
| `API_REFERENCE.md` | Looking up an OpenFL/Lime class or method | reference |
| `debugging.md` | Something broke; console shows an error | 5-10 min |
| `workflows/add-*.md` | Implementing a specific feature type | 10-20 min per type |

---

## The Rule: If You're Unsure, It's Probably a Mod

```
Question: "Should I edit X?"

If X is...                          → Answer:
─────────────────────────────────────────────────────
SevenDRL.js                         → NO, never
modules/                            → NO, never (read-only)
index.html (bare)                   → NO, avoid for dev
Dev-Tools/index.html                → YES, only to fix loading
Dev-Tools/mods/                     → YES, this is where you work
Dev-Tools/skills/                   → YES, update docs
assets/                             → YES, if adding content (JSON, audio)

If you're adding behavior:          → Create a mod
If you're patching existing code:   → Create a mod
If you're adding UI:                → Create a mod
If you're changing how something works: → Create a mod

The only exception: docs. Edit docs freely.
```

---

## Your Development Workflow

**For every feature:**

1. **Understand the requirement**
   - Read the feature request or GitHub issue

2. **Find the relevant docs**
   - Is it a mob? → `workflows/add-mob.md`
   - Is it an ability? → `workflows/add-ability.md`
   - Is it a UI panel? → `workflows/add-ui-panel.md`
   - Don't see your type? → `EXTENDING.md` on adding new workflows

3. **Generate boilerplate** (if available)
   ```bash
   node Dev-Tools/scripts/generate-feature.js <type> <args>
   ```

4. **Customize**
   - Open the generated `.js` file
   - Find `SWAP POINT` comments
   - Edit those sections

5. **Register**
   - Uncomment in `manifest.js`

6. **Reload**
   - Ctrl+Shift+R in the browser

7. **Test**
   - Use `DBG` commands to verify it loaded
   - Play the game to test behavior
   - Check the console for errors

8. **Polish**
   - Tweak values (damage, HP, cost)
   - Test edge cases
   - Check balance

9. **Document**
   - Add comments in your code explaining non-obvious logic
   - Update relevant workflow docs if you found a pattern that should be documented

---

## Troubleshooting: "Something Doesn't Work"

### Checklist

- [ ] Reloaded the page (Ctrl+Shift+R, hard refresh)
- [ ] Checked the browser console (F12) for JS errors
- [ ] Checked the Dev Console (Shift+F12) for mod load messages
- [ ] Confirmed the mod is uncommented in `manifest.js`
- [ ] Verified you're using `Dev-Tools/index.html`, not bare `index.html`
- [ ] Ran `DBG.mobs()` (or equivalent) to confirm the feature loaded
- [ ] Read `debugging.md` for the error message

### Common Errors

| Error | Cause | Fix |
|---|---|---|
| `ReferenceError: $extend is not defined` | Using `$extend()` in a mod | Use `Object.create()` instead |
| `ReferenceError: $hxClasses is not defined` | Using `$hxClasses[...]` in a mod | Use `window.com_watabou_...` or `ModLoader.resolve()` |
| Feature doesn't appear | Not uncommented in manifest.js | Uncomment the line, reload |
| "Cannot read properties of null (reading 'x')" | Accessing something before it's ready | Check ENTRY_POINT.md for timeline |
| Text field shows as 100×100 box | `CenteredText` without `setWidth()` | Add `tf.setWidth(2000)` right after construction |

---

## Review Checklist Before Submitting Work

- [ ] Tested in Dev-Tools/index.html (not bare index.html)
- [ ] Used ModLoader patterns (see modding.md)
- [ ] No direct edits to SevenDRL.js or modules/
- [ ] All new code is in Dev-Tools/mods/
- [ ] Uncommented in manifest.js (or documented why not)
- [ ] DBG commands confirm the feature loaded
- [ ] Tested gameplay: ability works, mob spawns, UI appears, etc.
- [ ] No console errors
- [ ] Code is commented where non-obvious
- [ ] Docs updated if you added a new pattern

---

## Questions?

- **"How do I X?"** → Search `Dev-Tools/skills/workflows/` for a guide
- **"What's this error?"** → Read `debugging.md`
- **"Can I edit Y?"** → See "The Rule" above
- **"Where's the code for Z?"** → `modules/` for reading, `SevenDRL.js` for understanding, `Dev-Tools/mods/` for changing it

---

## Next Steps

1. ✓ Understand the architecture (read ENTRY_POINT.md — you just did)
2. ✓ Boot the game (Dev-Tools/index.html)
3. ✓ Add a test mob (generate-feature.js mob "Test" ...)
4. ✓ Delete the test mob (clean up)
5. → Read QUICK_START.md (patterns for real features)
6. → Pick a feature type from workflows/ and implement your first real feature

**You're ready. Build something.**
