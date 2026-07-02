# Dark Clues — IN/OUT Glossary

Every point where data enters (IN), leaves (OUT), or can be swapped/extended
in the Dark Clues engine. Use this alongside `../GLOSSARY.md` and the
`// ╔══ EXTENSION POINT` markers in each module.

---

## Quick Reference

| Symbol | Meaning |
|--------|---------|
| **IN** | Data/code enters the system from outside |
| **OUT** | Data/code leaves the system to external consumers |
| **SWAP** | Asset or logic can be replaced with custom content |
| **HOOK** | Custom code can be inserted at this point |
| **SIGNAL** | Event that other code can subscribe to |

---

## 1. ASSET PIPELINE

### Fonts

| Type | Asset ID | File | Where Loaded | How to Swap |
|------|----------|------|-------------|-------------|
| **SWAP** | `"default"` | `assets/ShareTech-Regular.ttf` | `AsciiSprite` constructor (`visuals.js`) | Replace TTF in `assets/`, update manifest in `SevenDRL.js:3498` |
| **SWAP** | `"mono"` | `assets/ShareTechMono-Regular.ttf` | `AsciiSprite` constructor (`visuals.js`) | Same as above |
| **IN** | `"default"` | Font loaded by `Assets.getFont("default")` | `Style.init()` (`style.js`) | Change font ID in `Text.format()` calls |
| **IN** | `"mono"` | Font loaded by `Assets.getFont("mono")` | `AsciiSprite` constructor | Change font ID in constructor |

**Font registration chain:**
```
index.html <style> @font-face → SevenDRL.js:3495-3496 asset registration
  → Assets.registerLibrary("default", library) → Assets.getFont("default"/"mono")
```

### Sounds

| Type | Asset ID | File | Triggered By | How to Swap |
|------|----------|------|-------------|-------------|
| **SWAP** | `"ambience"` | `assets/ambience.ogg` | `GameScene` constructor (`scenes.js`) | Replace OGG, update manifest |
| **SWAP** | `"footstep"` | `assets/footstep.ogg` | `Hero.getCloser()` (`characters.js`) | Replace OGG, update manifest |
| **SWAP** | `"clue_note"` | `assets/bass.ogg` | `Clue.playJingle()` (`characters.js`) | Replace OGG, update manifest |
| **SWAP** | `"hero_attack"` | `assets/hero_attack.ogg` | `ActionAttack.engage()` (`actions.js`) | Replace OGG, update manifest |
| **SWAP** | `"ghost_attack"` | `assets/ghost_attack.ogg` | `StateChasing.engage()` (`states.js`) | Replace OGG, update manifest |
| **SWAP** | `"death"` | `assets/death.ogg` | `Hero.die()` (`characters.js`) | Replace OGG, update manifest |
| **SWAP** | `"victory"` | `assets/victory.ogg` | `Boss.die()` (`characters.js`) | Replace OGG, update manifest |

**Sound playback chain:**
```
Sounds.event(id, vol, offset)
  → getResampled(id, offset)  // pitch-shift cache (-12..+12 semitones)
    → Assets.getSound(id).play()
```

### View Mode Rendering Chain

```
view-mode.js → event-driven render loop (requestAnimationFrame + render signature)
  │
  ├─ Bump triggers: hero.move, hero.roomChanged, charAdded, game.over,
  │   GameScene.reset, window resize
  │
  ├─ window.__viewMode === 'top'
  │   └─ show native PlanView (set_visible(true)), hide canvas overlay
  │
  ├─ window.__viewMode === 'iso'
  │   └─ hide native PlanView, show canvas overlay
  │       └─ renderIso(game):
  │           ├─ buildRoomGeo() — precompute contour/door/window edge maps
  │           ├─ fog-of-war: 3 tiers (visible=1.0, explored=0.35, none=0)
  │           ├─ diamond projection: sx=(j-i)*HALF_W, sy=(j+i)*HALF_H
  │           ├─ foot-Y depth sort (i+j) for both cells and entities
  │           ├─ draw diamond floor tiles (alpha by visibility tier)
  │           ├─ overlay characters from game.queue (foot-Y sorted)
  │           ├─ palette cache shared across view switches (room.id key)
  │           └─ hero-centered camera offset
  │
  └─ window.__viewMode === 'side'
      └─ hide native PlanView, show canvas overlay
          └─ renderSide(game):
              ├─ buildRoomGeo() — contour analysis for wall extrusion
              ├─ fog-of-war: 3 tiers (visible=1.0, explored=0.35, none=0)
              ├─ floor pass: fillRect at (j*TILE, i*TILE) per visible tier
              ├─ wall pass: extrude SOUTH contour edges into wall quads
              │   ├─ no door/window: full TILE×WALL_HEIGHT wall
              │   ├─ has door: carve 30%/40%/30% (L-gap-R) segments
              │   ├─ has window: short wall + window pane + cap
              │   └─ EAST contour edges: thin 1px wall edge
              ├─ character pass: overlay from game.queue (visibility gate)
              ├─ hero-centered camera offset
              └─ palette cache shared across view switches

Inverse projection hit-tests (public API, for future click-to-move):
  __viewIsoCellFromPoint(px, py)
    → diamond inverse: col = (rx/HW + ry/HH)/2, row = (ry/HH - rx/HW)/2
    → corrected for camera offset → grid.cell(row, col)

  __viewSideCellFromPoint(px, py)
    → col = round(offX / TILE), row = round(offY / TILE)
    → corrected for camera offset → grid.cell(row, col)
```

### Dev-Tools Assets (Mod System)

| Type | Asset ID | File | Where Loaded | How to Swap |
|------|----------|------|-------------|-------------|
| **SWAP** | Manifest | `Dev-Tools/mods/manifest.js` | `index.html` after SevenDRL.js | Edit load order array |
| **SWAP** | Loader | `Dev-Tools/mods/loader.js` | Line 2 of manifest | Replace ModLoader toolkit |
| **SWAP** | Custom plan | `assets/plan.json` | `rogue-api.js` autoLoad via XHR/fetch | Replace JSON with level-creator export |
| **SWAP** | Enemy manifest | `assets/enemies/manifest.json` | `level-creator/creator.js` init | Add/remove enemy entries |
| **SWAP** | Enemy defs | `assets/enemies/*.json` | Level creator on demand via XHR | Create new enemy JSON files |
| **SWAP** | Character manifest | `assets/characters/manifest.json` | `play.js` difficulty overlay boot | Add/remove character entries |
| **IN** | Canvas overlay | `#dc-view-overlay` | `view-mode.js` ensureOverlay() | CSS/style in mod code |
| **IN** | Dev toolbar | `#dc-dev-toolbar` | `ui/dev-toolbar.js` | Edit toolbar buttons |
| **IN** | Inspector | `#dc-inspector` | `ui/inspector.js` | Edit live state panel |
| **IN** | Char creator | `#dc-char-creator-overlay` | `char-creator.js` | Edit creator form |
| **IN** | Pause menu | `#dc-pause-overlay` | `pause-menu.js` | Edit pause options |

### Dev-Tools Mod Hook Chain

| Mod file | Depends On (window globals) | Provides / Hooks |
|----------|-----------------------------|------------------|
| `loader.js` | — | `ModLoader` (hook/before/after/resolve/validate) |
| `game.js` | `ModLoader` | Game loop hooks (proceed, spawnMobs, spawnClues, collectClue) |
| `characters.js` | `ModLoader`, game classes | Hero/Mob/Clue hooks (target, damage, die) |
| `scenes.js` | `ModLoader`, scene classes | Scene hooks (nudge movement, resize, event log) |
| `debug.js` | `ModLoader`, `__devToolsEnabled` | DBG commands + Proxy gate |
| `eventlog.js` | — | `__eventLog[]`, `__eventLogAdd()` |
| `zombies.js` | `Rogue.Mob` | Custom Zombie mob example |
| `rogue-api.js` | `ModLoader`, game classes | `Rogue.*` API + `Plan.create` override |
| `char-creator.js` | `Rogue.UI`, `Rogue.Util` | In-game character creator overlay |
| `pause-menu.js` | `ModLoader` | ESC pause overlay (zoom, view, dev tools) |
| `ability.js` | `ModLoader` | Stock system + projectile fire + indicator |
| `ability-pickup.js` | `ability.js`, Clue prototype | Chess piece pickups |
| `play.js` | `Rogue.*`, `ModLoader` | Difficulty/character select + death retry |
| `view-mode.js` | `ModLoader`, canvas API, `com.watabou.sevendrl.Dir` | Iso/side canvas overlay (event-driven, fog-of-war 3-tier, wall carving, door/window extrusion, palette cache, hit-test API) |
| `dev-toolbar.js` | `__devToolsEnabled` | Floating toolbar UI |
| `inspector.js` | `__devToolsEnabled` | Live state inspector panel |

**Mod load order:** `Dev-Tools/mods/manifest.js` — 15 mods loaded in dependency order, then 2 UI tools.

**To add a new sound:**
1. Place `.ogg` file in `assets/`
2. Add entry to manifest JSON in `SevenDRL.js:3498`
3. Call `Sounds.event("your_sound_id")` from game code

### JSON Data

| Type | Asset ID | File | Where Loaded | How to Swap |
|------|----------|------|-------------|-------------|
| **SWAP** | `"clues"` | `assets/clues.json` | `Clue.reset()` (`characters.js`) | Replace JSON, update manifest |
| **IN** | — | `clues.json` parsed by `JSON.parse()` | `Clue.reset()` | Edit JSON grammar rules |

**Grammar loading chain:**
```
Assets.getText("clues")
  → JSON.parse() → new Grammar(raw)
    → Grammar.loadFromRawObj() → Symbol → RuleSet → RuleSelector
```

**To customize clue text:**
1. Edit `assets/clues.json` directly
2. Or call `Clue.grammar.pushRules("clue", ["your new rule"])` at runtime
3. Or change root symbol: `grammar.flatten("#your_symbol#")` in `Clue` constructor

---

## 2. SCENE FLOW

### Scene Transitions (State Machine)

```
                    ┌─────────────┐
    ┌──────────────>│ TitleScene   │<──────────────┐
    │               │ "Dark Clues" │               │
    │               └──────┬──────┘               │
    │                      │ click                 │
    │                      v                       │
    │               ┌─────────────┐               │
    │               │ GameScene   │               │
    │               │ (main play) │               │
    │               └──┬──────┬──┘               │
    │                  │      │                   │
    │     hero dies    │      │  boss dies        │
    │                  v      v                   │
    │          ┌────────┐  ┌──────────┐          │
    │          │Death   │  │Victory   │          │
    │          │Scene   │  │Scene     │          │
    │          └───┬────┘  └────┬─────┘          │
    │              │ click      │ click           │
    └──────────────┴────────────┴─────────────────┘
```

| Type | From | To | Trigger | File:Line |
|------|------|----|---------|-----------|
| **IN** | Boot | `TitleScene` | `Main()` constructor | `game.js` |
| **HOOK** | `TitleScene` | `GameScene` | Native: user click. **As actually wired by `Dev-Tools/mods/title-menu.js`:** native click-anywhere is suppressed; "New Game"/"Continue" buttons in a canvas menu call `switchScene` instead | `scenes.js:553` (`nextScene`), `Dev-Tools/mods/title-menu.js` |
| **HOOK** | `GameScene` | `VictoryScene` | Boss defeated | `scenes.js:509` |
| **HOOK** | `GameScene` | `DeathScene` | Hero dies | `scenes.js:509` |
| **HOOK** | `DeathScene` | `TitleScene` | User click | `scenes.js:521` (`nextScene`) |
| **HOOK** | `VictoryScene` | `TitleScene` | User click | `scenes.js:553` (`nextScene`) |

Note: every transition above calls `Game.switchScene()`, which always
constructs a **brand-new** instance of the target scene class
(`Type.createInstance`) — nothing persists across it except `window`
globals. See `Dev-Tools/skills/SYSTEM_MAP.md`.

**To add a new scene:**
1. Create a class extending `TextScene` (for text screens) or `Scene` (for interactive)
2. Set `this.nextScene = YourNewScene` in constructor
3. Insert into the transition chain by modifying `nextScene` of adjacent scenes

**To change the starting scene:**
- Modify `game.js`: `Main` constructor → `Game.call(this, YourScene)`

---

## 3. CHARACTER SPAWNING

### Spawn Pipeline

```
SevenDRL constructor
  ├─ Hero (random cell)
  ├─ spawnMobs()
  │   ├─ Wanderer × (level × 2)
  │   ├─ Hunter × 3
  │   └─ placed outside hero FOV
  ├─ spawnAmbushes()
  │   └─ Ambush × level (at dead-end doors)
  ├─ spawnClues()
  │   └─ Clue × (2 + level) (distance-weighted)
  └─ Boss (after all clues collected)
```

| Type | Character | Where Spawned | Count | File:Line |
|------|-----------|---------------|-------|-----------|
| **IN** | `Hero` | `SevenDRL` constructor | 1 | `game.js` |
| **SWAP** | `Wanderer` | `spawnMobs()` | `level × 2` | `game.js` |
| **SWAP** | `Hunter` | `spawnMobs()` | 3 | `game.js` |
| **SWAP** | `Ambush` | `spawnAmbushes()` | `level` | `game.js` |
| **SWAP** | `Ambusher` | `Ambush.ambush()` | `sqrt(room.area)` | `characters.js` |
| **SWAP** | `Clue` | `spawnClues()` | `2 + level` | `game.js` |
| **SWAP** | `Boss` | `collectClue()` | 1 (on all clues found) | `game.js` |
| **SWAP** | `Spawn` | `Boss.spawn()` | 1 (random adjacent) | `characters.js` |

**To add a new mob type:**
1. Create class extending `Mob` (or `Hunter` for aggressive)
2. Override: `createSprite()`, `getName()`, `act()`, optionally `die()`
3. Add to `mobs[]` array in `spawnMobs()` (`game.js`)
4. If it needs a new state, create class extending `State`

**To change spawn counts:**
- Edit `spawnMobs()` in `game.js` — modify the loops
- Edit `spawnClues()` — change `maxClues` formula
- Edit `spawnAmbushes()` — change `nAmbushes` formula

---

## 4. INPUT SYSTEM

### Input Chain

```
Browser Event (keydown/keyup/click)
  → OpenFL Stage event (keyDown/keyUp)
    → Scene.onKeyDown/onKeyUp (modifier tracking: keyShift, keyCtrl)
      → keyEvent.dispatch(keyCode, down)
        → GameScene.onKey(key, down)  [game-specific handling]
          → hero.target(cell) or hero.wait()
```

| Type | Input | Handler | Action | File:Line |
|------|-------|---------|--------|-----------|
| **IN** | Arrow keys | `GameScene.onKey()` | Step in direction | `scenes.js` |
| **IN** | Numpad 1-9 | `GameScene.onKey()` | Step in direction | `scenes.js` |
| **IN** | Period (`.`) | `GameScene.onKey()` | Wait a turn | `scenes.js` |
| **IN** | Space | `GameScene.onKey()` | Resume interrupted hero | `scenes.js` |
| **IN** | Escape | `Scene.onKeyDown()` | Close window / quit | `engine.js` |
| **IN** | Mouse click | `PlanView.click` | Move/attack/collect | `scenes.js:374` |
| **IN** | Ctrl+click | `GameScene.onClick()` | Inspect character info | `scenes.js` |

**To add a new key binding:**
- Edit `GameScene.onKey()` switch statement in `scenes.js`
- Add a new `case` with the key code

**To add touch/gesture support:**
- Hook into `Scene.onKeyDown`/`onKeyUp` in `engine.js`
- Or add event listeners in `GameScene.activate()`

---

## 5. ACTION SYSTEM

### Action Resolution Chain

```
hero.target(cell)
  ├─ cell == hero.pos     → ActionWait
  ├─ !hero.sees(cell)     → ActionMove (pathfind to cell)
  ├─ cell has Mob         → ActionAttack (engage when adjacent)
  ├─ cell has Clue        → ActionCollect (engage when on cell)
  └─ otherwise            → ActionMove
```

| Type | Action | Trigger | Effect | File:Line |
|------|--------|---------|--------|-----------|
| **HOOK** | `ActionWait` | Target self | Skip turn, draw card | `actions.js` |
| **HOOK** | `ActionMove` | Target distant cell | Pathfind one step | `actions.js` |
| **HOOK** | `ActionAttack` | Target visible mob | Deal card-based damage | `actions.js` |
| **HOOK** | `ActionCollect` | Target visible clue | Collect clue text | `actions.js` |
| **HOOK** | (new action) | Add to `target()` chain | Custom behavior | `characters.js:1000` |

**Damage formula (from card):**
```
WEAK   (index 0) → 1 damage
NORMAL (index 1) → 2 damage
STRONG (index 2) → 3 damage
```

**To add a new action:**
1. Create class extending `Action` or `ActionEngage`
2. Override `proceed()` (for Action) or `canEngage()`/`engage()` (for ActionEngage)
3. Add a branch in `Hero.target()` to create your action

---

## 6. CARD SYSTEM

### Card Pipeline

```
Hero constructor
  → new ActionDeck([WEAK, NORMAL, STRONG])
    → shuffle into draw pile

Each turn:
  hero.pullCard()
    → deck.discard(current card)
    → deck.get()  // draw from pile (reshuffle discard if empty)
    → cardChanged.dispatch(card)  // SIGNAL
```

| Type | Card | Damage | Visual | File:Line |
|------|------|--------|--------|-----------|
| **SWAP** | `WEAK` | 1 | 1 pin lit | `characters.js:952` |
| **SWAP** | `NORMAL` | 2 | 2 pins lit | `characters.js:952` |
| **SWAP** | `STRONG` | 3 | 3 pins lit | `characters.js:952` |

**To add a new card type:**
1. Add entry to `ActionCard` enum in `runtime/base.js`
2. Add to deck constructor: `new ActionDeck([WEAK, NORMAL, STRONG, YOUR_CARD])`
3. Add damage case in `ActionAttack.engage()` switch
4. Add visual case in `CardIndicator.setCard()` pin logic

**SIGNAL: `hero.cardChanged`** — fires when new card drawn. Subscribe for UI updates.

---

## 7. EVENT SIGNALS

### Game Signals

| Type | Signal | Dispatched When | File:Line |
|------|--------|-----------------|-----------|
| **SIGNAL** | `game.over` | Hero dies OR Boss dies | `game.js` |
| **SIGNAL** | `game.charAdded` | Any character added to queue | `game.js` |
| **SIGNAL** | `game.clueFound` | Hero collects a clue | `game.js` |

### Hero Signals

| Type | Signal | Dispatched When | File:Line |
|------|--------|-----------------|-----------|
| **SIGNAL** | `hero.cardChanged` | New card drawn | `characters.js` |
| **SIGNAL** | `hero.hpChanged` | Hero takes damage | `characters.js` |
| **SIGNAL** | `hero.roomChanged` | Hero enters new room | `characters.js` |

### Scene Signals

| Type | Signal | Dispatched When | File:Line |
|------|--------|-----------------|-----------|
| **SIGNAL** | `view.click` | Player clicks a tile | `scenes.js` |
| **SIGNAL** | `window.click` | Player clicks popup | `scenes.js` |
| **SIGNAL** | `Scene.keyEvent` | Any key pressed/released | `engine.js` |
| **SIGNAL** | `Scene.update` | Frame tick | `engine.js` |

**To subscribe to signals:**
```js
game.clueFound.add(function(clue) { /* your code */ });
hero.hpChanged.add(function(newHP) { /* your code */ });
game.over.add(function() { /* your code */ });
```

**To add new signals:**
1. Create in constructor: `this.mySignal = new Signal1()`
2. Dispatch at appropriate point: `this.mySignal.dispatch(data)`
3. Subscribe externally: `game.mySignal.add(handler)`

---

## 8. UI OUTPUT

### Text Output

| Type | Method | Purpose | File:Line |
|------|--------|---------|-----------|
| **OUT** | `SevenDRL.out(text)` | Show toast message (auto-fading) | `scenes.js:454` |
| **OUT** | `GameScene.showWindow(title, text)` | Show modal popup | `scenes.js:473` |
| **OUT** | `Clue.text` | Procedurally generated clue string | `characters.js` |

### HUD Elements

| Type | Element | Updated By | File:Line |
|------|---------|------------|-----------|
| **OUT** | Health indicator | `hero.hpChanged` signal | `scenes.js` |
| **OUT** | Clue counter | `onClueFound()` | `scenes.js` |
| **OUT** | Card indicator | `hero.cardChanged` signal | `scenes.js` |
| **OUT** | PlanView (dungeon) | Redrawn on game state change | `game.js` |

---

## 9. STYLE / THEMING

### Color Constants

| Type | Name | Value | Purpose | File |
|------|------|-------|---------|------|
| **SWAP** | `BG` | `0x1118498` | Background color | `style.js` |
| **SWAP** | `FLOOR` | `0x2236979` | Floor tile color | `style.js` |
| **SWAP** | `DARK` | `0x7833736` | Wall/dark color | `style.js` |
| **SWAP** | `LIGHT` | `0x16772812` | Visible tile color | `style.js` |
| **SWAP** | `GHOST` | `0x13430527` | Ghost entity color | `style.js` |
| **SWAP** | `SPECTRE` | `0x13434845` | Spectre entity color | `style.js` |
| **SWAP** | `CLUE` | `0x6710954` | Clue item color | `style.js` |
| **SWAP** | `UI` | `0x14544639` | UI text color (gold) | `style.js` |
| **SWAP** | `GAP` | `20.0` | Spacing constant | `style.js` |

### Text Formats

| Type | Name | Size | Color | Purpose | File |
|------|------|------|-------|---------|------|
| **SWAP** | `formatTitle` | 40px | Gold | Title screens | `style.js` |
| **SWAP** | `formatService` | 18px | Gold | Help text | `style.js` |
| **SWAP** | `formatToast` | 36px | Gold | Toast messages | `style.js` |
| **SWAP** | `formatText` | 24px | Gold | Body text | `style.js` |

**To retheme:**
1. Modify color constants in `style.js`
2. Change font sizes/colors in `Style.init()`
3. Update sprite colors in character `createSprite()` methods
4. Replace font files in `assets/`

---

## 10. LIFECYCLE HOOKS

### Game Lifecycle

| Type | Hook | When | File:Line |
|------|------|------|-----------|
| **HOOK** | `Main()` constructor | Game boot | `game.js` |
| **HOOK** | `SevenDRL()` constructor | New game started | `game.js` |
| **HOOK** | `GameScene.reset()` | Game (re)initialized | `scenes.js` |
| **HOOK** | `GameScene.onGameOver()` | Game over (1s delay) | `scenes.js` |
| **HOOK** | `Hero.die()` | Hero death | `characters.js` |
| **HOOK** | `Boss.die()` | Boss death (victory) | `characters.js` |
| **HOOK** | `game.over.dispatch()` | End-of-game signal | `game.js` |

### Turn Lifecycle

| Type | Hook | When | File:Line |
|------|------|------|-----------|
| **HOOK** | `game.proceed()` | Start next turn | `game.js` |
| **HOOK** | `game.finish(char, acted)` | End character's turn | `game.js` |
| **HOOK** | `hero.act()` | Hero's turn tick | `characters.js` |
| **HOOK** | `mob.act()` | Mob's turn tick | `characters.js` |

---

## 11. FILE MANIFEST

### Asset Files

```
dark-clues/
├── index.html              # Entry point, loads SevenDRL.js
├── SevenDRL.js             # Compiled Haxe bundle (80,886 lines)
├── assets/
│   ├── clues.json          # Tracery grammar for clue text
│   ├── ambience.ogg        # Ambient background loop
│   ├── footstep.ogg        # Hero movement sound
│   ├── bass.ogg            # Clue pickup jingle (asset ID: "clue_note")
│   ├── hero_attack.ogg     # Hero attack sound
│   ├── ghost_attack.ogg    # Mob attack sound
│   ├── death.ogg           # Hero death sound
│   ├── victory.ogg         # Boss defeat sound
│   ├── ShareTech-Regular.ttf      # Default font
│   └── ShareTechMono-Regular.ttf  # Monospace font
├── Dev-Tools/              # Mod system & tooling
│   ├── mods/               # 15 mods + manifest + loader
│   ├── ui/                 # Dev toolbar + inspector
│   ├── level-creator/      # Dungeon editor (HTML/JS)
│   ├── char-creator/       # Character & enemy designer (HTML/JS)
│   └── skills/             # 5 agent skill references
├── assets/
│   ├── enemies/            # Enemy JSON definitions + manifest
│   ├── characters/         # Character JSON definitions + manifest
│   └── plan.json           # Custom plan export target
└── modules/                # Extracted & documented modules
    ├── index.js            # Load order
    ├── IN_OUT_GLOSSARY.md  # This file
    ├── DEPENDENCIES.md     # Cross-module dependency graph
    ├── core/
    │   ├── game.js         # Main, SevenDRL, Plan, Grid, Room, Door
    │   ├── characters.js   # Character, Hero, Mob, all mob types
    │   ├── actions.js      # Action, ActionMove, ActionAttack, etc.
    │   ├── states.js       # State, StateIdle, StateWandering, StateChasing
    │   ├── scenes.js       # TextScene, GameScene, TitleScene, etc.
    │   ├── visuals.js      # AsciiSprite, CharacterSprite, UI components
    │   ├── pathfinding.js  # Pathfinder (Dijkstra)
    │   ├── audio.js        # Sounds manager
    │   └── style.js        # Style constants and text formats
    ├── watabou/
    │   ├── utils.js        # ArrayExtender, Random, MathUtils, etc.
    │   ├── geom.js         # Color, GeomUtils, Rect
    │   ├── processes.js    # Process, Sequence, Tweener
    │   └── engine.js       # Game, Scene, Text (Coogee engine)
    ├── tracery/
    │   └── tracery.js      # Grammar, Symbol, TraceryNode, ModsEngBasic
    └── runtime/
        └── base.js         # 405 Lime/OpenFL/Haxe runtime classes
```

---

## 12. QUICK-START: Common Customizations

### "I want to add a new mob"
1. Create class in `characters.js` extending `Mob`
2. Override `createSprite()`, `getName()`, `act()`
3. Add to `mobs[]` in `spawnMobs()` (`game.js`)
4. Add sprite color in `createSprite()` → `tf.textColor`

### "I want to change the clue text"
1. Edit `assets/clues.json` — add/modify grammar rules
2. Or change root symbol in `Clue` constructor: `grammar.flatten("#your_symbol#")`
3. Or add runtime rules: `Clue.grammar.pushRules("clue", ["new rule"])`

### "I want to add a new scene"
1. Create class extending `TextScene` (text) or `Scene` (interactive)
2. Set `this.nextScene` to chain to next scene
3. Modify `nextScene` of adjacent scenes to insert yours

### "I want to change the HUD"
1. Edit `GameScene.reset()` — modify indicator creation
2. Add new UI elements as children of the scene
3. Subscribe to signals (`hpChanged`, `cardChanged`, etc.) for live updates

### "I want different sounds"
1. Replace `.ogg` files in `assets/` (keep same filenames)
2. Or add new sounds to manifest in `SevenDRL.js:3498`
3. Call `Sounds.event("your_id")` from game code

### "I want to retheme the colors"
1. Edit color constants in `style.js`
2. Update sprite colors in character `createSprite()` methods
3. Update `Unit` colors in `Indicator` constructors

### "I want to add a new card type"
1. Add to `ActionCard` enum in `runtime/base.js`
2. Add to deck constructor in `Hero`
3. Add damage case in `ActionAttack.engage()`
4. Add visual case in `CardIndicator.setCard()`
