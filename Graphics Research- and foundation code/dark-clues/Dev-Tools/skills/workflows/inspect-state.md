# Workflow: Inspect Game State Live

## Prerequisites
- Game running at `http://localhost:8080/Dev-Tools/index.html`
- Click the game canvas first (activates `sevendrl`/`hero` globals)

## Common Pitfall — "No hero / No game"

If you see `index.html:85 No hero` or similar, it means the globals haven't
been set yet. The `proceed` hook (which sets `window.sevendrl` and
`window.hero`) only fires AFTER the first user click on the canvas.

→ **Click the game canvas** to start the turn loop.

## Steps

### 1. Basic status check

In the F12 dev console, type:
```
DBG.status()
```
Returns: `{ level, hero, clues, mobs, charQueue, boss }`

### 2. List all mobs on the level

```
DBG.mobs()
```
Returns an array with name, HP, position, and AI state for each mob.

### 3. Check hero details

```
window.hero
```
— inspect the hero object in the console tree.

Useful properties:
- `hero.hp` / `hero.maxHP` — health
- `hero.pos` — cell index (row-major)
- `hero.card` — current action card index (0=WEAK, 1=NORMAL, 2=STRONG)
- `hero.fov` — field-of-view array

### 4. View the dungeon grid

```
DBG.grid()
```
Prints an ASCII map: `.` = floor, `#` = wall, `+` = door.

### 5. Find classes by name

```
DBG.classes("Hero")
```
— list all Haxe classes matching "Hero" (a quick complement to the
`ModLoader.find()`/`inspect()` discovery tools below).

### 6. Discover class methods

Use the new ModLoader v2 discovery tools:

```js
// List all methods on a class
ModLoader.listMethods("com.watabou.sevendrl.SevenDRL")

// Inspect class hierarchy
ModLoader.inspect("com.watabou.sevendrl.characters.Hero")

// Find classes matching a pattern
ModLoader.find("Clue")
```

### 7. Check active signals

```js
var g = window.sevendrl;
if (g.clueFound) devLog("clueFound signal exists:", !!g.clueFound);
if (g.over) devLog("game.over signal:", g.over);
if (g.charAdded) devLog("charAdded signal:", g.charAdded);

var h = window.hero;
if (h.cardChanged) devLog("cardChanged signal:", h.cardChanged);
if (h.hpChanged) devLog("hpChanged signal:", h.hpChanged);
if (h.roomChanged) devLog("roomChanged signal:", h.roomChanged);
```

### 8. Subscribe to a live signal

```
window.hero.hpChanged.add(function(hp) { devLog("HP changed:", hp); })
```

### 9. Use the UI toolbar

Click `[ ]` (top-left) to expand the dev toolbar:
- **Status** — quick game state dump
- **Mobs** — list all enemies
- **Toggle Inspector** — live panel (HP, card, clues, boss)
- **Heal / DMG / Kill** — manipulate hero
- **Reveal / Next Level** — map exploration

The inspector panel (bottom-left) updates 4x/sec:
- Hero HP (green=healthy, orange=warn, red=danger)
- Current action card
- Clue counts (total + discovered)
- Mob count, turn queue size
- Boss alive/vanquished status
- Hero grid position

## Quick Reference

| Command | What it shows |
|---------|---------------|
| `DBG.status()` | Full game state summary |
| `DBG.mobs()` | All mobs with stats |
| `DBG.grid()` | ASCII dungeon map |
| `DBG.classes("query")` | Matching Haxe classes (DBG shorthand) |
| `ModLoader.find("Hero")` | Matching Haxe classes (ModLoader v2) |
| `DBG.help()` | All DBG commands |
| `ModLoader.inspect(cls)` | Class hierarchy + methods |
| `ModLoader.listMethods(cls)` | All prototype methods |
| `window.sevendrl` | The game instance |
| `window.sevendrl.plan` | Current level plan |
| `window.sevendrl.plan.rooms` | Array of rooms |
| `window.hero` | The hero character |
| `window.hero.pos` | Hero's cell position |
| `window.sevendrl.charQueue` | Turn queue |

## If globals aren't set

Type: `DBG.findGame()` for diagnostic info. If the game is waiting for input,
click the canvas to trigger `proceed()`. Once `window.sevendrl` is set, all
commands work.

## Reference
- `Dev-Tools/mods/debug.js` — all DBG commands
- `Dev-Tools/mods/loader.js` — ModLoader v2 discovery tools
- `modules/IN_OUT_GLOSSARY.md` §7 (Event Signals) — signal reference
- `Dev-Tools/mods/loader.js` — ModLoader v2 discovery tools