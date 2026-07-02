# Workflow: Iterate Clue Grammar Live

## Prerequisites
- Game running, F12 console open
- Click game canvas to activate `window.sevendrl`
- `Dev-Tools/mods/change-clues.js` loaded (uncomment in `manifest.js`) — only
  needed for the `addClueRule()` shorthand below; raw `grammar.pushRules()`
  works without it

## Overview

Two approaches:
**A) Runtime only** — test via dev console (no file changes)
**B) Persistent** — edit `assets/clues.json`

## Steps (Approach A — Runtime Testing)

### 1. Access the grammar

```js
// The Clue class stores grammar as a static
var Clue = ModLoader.resolve("com.watabou.sevendrl.characters.Clue");
var grammar = Clue.grammar;  // static property

// Or from an existing clue:
var grammar = window.sevendrl.clues[0]._grammar || Clue.grammar;
```

### 2. Add a test clue rule

```js
grammar.pushRules("clue", ["a {glowing|cracked} crystal orb"]);
```

### 3. Force clues to regenerate

```
DBG.rerollClues()
```

### 4. Check results

```
window.sevendrl.clues.forEach(function(c,i) { devLog(i + ":", c.text); });
```

### 5. Test with deeper nesting

```js
grammar.pushRules("clue", ["a #weapon# stuck in a #thing#"]);
grammar.pushRules("weapon", ["sword", "dagger", "axe"]);
grammar.pushRules("thing", ["tree stump", "stone pedestal", "wall crack"]);
DBG.rerollClues();
```

### 6. Weighted rules

```js
grammar.pushRules("clue", ["0.3?-{a rare golden idol|a common brick}"]);
// 0.3? = 30% chance to include the {choice}
```

### 7. Test without affecting clues

```js
grammar.flatten("#clue#");
```

### 8. Shorthand: `addClueRule()` (requires `change-clues.js` loaded)

```js
addClueRule("a {glowing|cracked} crystal orb")
DBG.rerollClues()
```
Equivalent to `grammar.pushRules("clue", [rule])` — a one-liner for quick
console testing once `change-clues.js` is uncommented in the manifest.

### 9. Create an entirely new symbol set

```js
grammar.pushRules("rumor", [
    "they say the #monster# lives in the #place#",
    "no one has returned from the #place# in years"
]);
grammar.pushRules("monster", ["beast", "phantom", "shadow", "witch"]);
grammar.pushRules("place", ["north wing", "old chapel", "buried crypt"]);
grammar.flatten("#rumor#")  // test without touching clue text
```

## Steps (Approach B — Persistent File)

### 1. Edit `assets/clues.json`

Located at server root (`/assets/clues.json`). Add/modify Tracery grammar rules.

### 2. Hard refresh

**Ctrl+Shift+R** — the game reloads and picks up the new JSON.

## Reference
- `assets/clues.json` — grammar source file
- `Dev-Tools/mods/change-clues.js` — runtime injection mod, defines `addClueRule()`
- `ModLoader.find("Clue")` — locate Clue class
- `modules/tracery/tracery.js` — Grammar, Symbol, TraceryNode classes
- `modules/IN_OUT_GLOSSARY.md` §1 — asset loading chain