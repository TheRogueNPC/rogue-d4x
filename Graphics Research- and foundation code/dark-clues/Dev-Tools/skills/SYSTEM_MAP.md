# System Map — Start Here

The single orientation doc for the whole project. Read this first; it links
out to the deeper references instead of repeating them.

## What this project is

A compiled Haxe/OpenFL roguelike (`SevenDRL.js`, ~80k lines, never edit
directly) extended entirely at runtime by JavaScript "mods" that monkey-patch
its class prototypes — no Haxe recompilation, ever. `Dev-Tools/` is that mod
system: load the game through `Dev-Tools/index.html`, not the bare game
`index.html`, to get it.

## Boot sequence

```
Dev-Tools/index.html
  1. <script src="/mp3_patch.js">       — audio format shim, loads first
  2. <script src="/SevenDRL.js">        — compiled game IIFE runs, but its
                                           classes stay IIFE-local until step 4
  3. initConsole(); loadModsFromManifest()
       reads Dev-Tools/mods/manifest.js → window.MOD_MANIFEST
       fetches every listed mod .js file in parallel, executes each as it
       arrives (each mod's own IIFE runs immediately on load)
       — mods that need a class not yet on `window` call ModLoader.hook()
         anyway; loader.js queues the patch in ModLoader.patches and
         retries it via flush() every 500ms (capped at 10 tries — see
         debugging.md) until lime.embed() exports it
  4. lime.embed(...) — runs the ENTIRE game synchronously: constructs
       Main → Game → TitleScene, dumps every Haxe class from the internal
       $hxClasses table onto `window` as flattened underscore names
       (com.watabou.sevendrl.SevenDRL → window.com_watabou_sevendrl_SevenDRL)
  5. ModLoader.flush() — deferred patches from step 3 resolve now that
       classes exist on window
```

Why this order matters and what breaks if you get it wrong:
`modding.md`'s "Critical Rule: Class Resolution" and `debugging.md`'s
"ModLoader not ready" section.

## Scene graph

```
TitleScene ──(New Game / Continue)──> GameScene ──(hero dies)──> DeathScene ──(click)──┐
     ^                                    │                                            │
     │                                    └──(boss dies)──> VictoryScene ──(click)──┐  │
     └─────────────────────────────────────────────────────────────────────────────┴──┘
```

Every transition is `Game.switchScene(targetClass)`, which **always
constructs a brand-new instance** of the target scene (`Type.createInstance`)
— nothing persists across a scene switch except `window` globals you set
yourself. Mid-game level transitions ("Mystery Deepens") don't go through
`switchScene` at all — they call `scene.reset()` directly on the *same*
`GameScene` instance, which is why `GameScene.reset` is the hook point for
"new level started," not scene construction.

Full transition table + signals + spawn pipeline: `modules/IN_OUT_GLOSSARY.md`.
Module-to-module dependency graph: `modules/DEPENDENCIES.md`. Raw class index
(510 compiled classes, file:line for every one): `GLOSSARY.md`.

TitleScene's own menu (New Game/Continue/Options/DLC entries) is built by
`Dev-Tools/mods/title-menu.js`, not the native game — see "Canvas vs DOM"
below and `rogue-api.md`.

## Canvas vs. DOM — the one rule that matters most

**Dev-tooling is DOM. Everything the player sees during a run is canvas.**

| Layer | Examples | Why |
|---|---|---|
| DOM | dev console, inspector, dev-toolbar, the small "Dev Bar" panel | Outside the game's display tree by design — meta tooling, not game content |
| Canvas | HUD bars, pause/options/title menu, difficulty/character select, death/victory/mystery popups, ability aim prompts | Children of the current `Scene`'s own display list — get positioned, scaled, and **destroyed automatically** when the scene resets/switches, exactly like the native health bar or clue indicator do |

A DOM overlay sitting on top of the canvas doesn't participate in any of
that lifecycle — it needs its own manual show/hide/cleanup, which was the
root cause of an entire class of bug fixed earlier in this project (popups
outliving the scene that showed them). Build canvas UI out of `Rogue.UI`
(see `rogue-api.md`) rather than hand-rolling `Sprite`/`graphics` calls.

Two non-obvious CenteredText/Text.get traps before you build anything new:
see "Canvas vs. DOM" in `SKILL.md` — `setWidth()` is mandatory, and
`Text.get()` silently eats `<`/`>` characters via `set_htmlText()`.

## File tree (annotated)

```
dark-clues/
├── index.html               # bare game entry — NOT what you want for dev work
├── SevenDRL.js               # compiled bundle — NEVER EDIT
├── runtime/base.js           # Lime/OpenFL/Haxe runtime — NEVER EDIT
├── modules/                  # extracted, commented MIRROR of SevenDRL.js for
│                              # reading/reference (NOT the live code path —
│                              # editing these files does nothing at runtime)
│   ├── DEPENDENCIES.md       # module/mod dependency graph
│   ├── IN_OUT_GLOSSARY.md    # IN/OUT/SWAP/HOOK/SIGNAL map of the whole engine
│   ├── DECISIONS.md          # why past fixes were made the way they were
│   ├── core/                 # game.js, characters.js, actions.js, states.js,
│   │                          # scenes.js, visuals.js, pathfinding.js, audio.js, style.js
│   ├── watabou/               # engine.js (coogee Game/Scene), utils.js, geom.js, processes.js
│   └── tracery/tracery.js     # grammar engine — see GRAMMAR_MAP.md
├── assets/                   # clues.json, *.ogg, fonts, characters/, enemies/, plan.json
├── GLOSSARY.md                # raw auto-generated index of all 510 compiled classes
└── Dev-Tools/                 # ← THE ACTUAL DEVELOPMENT WORKFLOW
    ├── index.html             # boot: console → ModLoader → manifest mods → lime.embed
    ├── mods/
    │   ├── manifest.js         # load order — edit this to add/remove mods
    │   ├── loader.js           # ModLoader — hook/before/after/resolve/validate
    │   ├── asset-fixer.js      # path patches, must load first
    │   ├── game.js / characters.js / scenes.js / debug.js / eventlog.js / zombies.js
    │   ├── rogue-api.js        # Rogue.* — the modder API hub, everything below depends on it
    │   ├── char-creator.js     # canvas character creator overlay (Rogue.UI)
    │   ├── pause-menu.js       # canvas pause/options + DOM Dev Bar panel
    │   ├── ability.js / ability-pickup.js  # stock system, chess-piece pickups
    │   ├── play.js             # difficulty/character select, death retry, intro
    │   ├── title-menu.js       # canvas title screen menu
    │   ├── hud-bars.js         # left-side stat column (native Indicator/StatePin/CardIndicator)
    │   ├── view-mode.js        # top/iso/side canvas overlay rendering
    │   └── (template mods, commented out — see EXTENDING.md)
    ├── ui/dev-toolbar.js, ui/inspector.js   # DOM dev tooling
    ├── level-creator/, char-creator/         # standalone DOM designer tools (not in-game)
    └── skills/                 # you are here
        ├── SKILL.md            # day-to-day rules + quick reference
        ├── SYSTEM_MAP.md        # this file
        ├── API_REFERENCE.md     # Lime/OpenFL/coogee/visuals classes mods actually use
        ├── GRAMMAR_MAP.md        # Tracery clue-grammar syntax
        ├── EXTENDING.md           # how to add a new workflow/template/skill doc
        ├── modding.md / rogue-api.md / debugging.md / view-mode.md
        └── workflows/*.md         # one doc per "I want to add X" task
```

## Where to go next

**First time?** → `QUICK_START.md` (5 minutes, templates, console commands)

**Adding something to the game?**
- Copy a template from `workflows/add-*.md` that matches
- Follow the workflow; test with `DBG` commands

**Need specific info?**
- Lime/OpenFL/coogee/visuals methods → `API_REFERENCE.md`
- Rogue modder API → `rogue-api.md`
- What's on `window`, when to access → `GLOBALS_REFERENCE.md`
- Game events & hooks → `SIGNALS_REFERENCE.md`
- What hooks into what (mod dependency graph) → `modules/DEPENDENCIES.md`
- Clue grammar syntax → `GRAMMAR_MAP.md`

**Something's wrong?**
- `debugging.md` — common issues, DBG commands, diagnostics
- `modding.md` — hook patterns, Object.create vs. $extend, ModLoader deep dive

**Extending the tooling?**
- `EXTENDING.md` — add a new workflow/template/doc (how we keep this stuff current)
