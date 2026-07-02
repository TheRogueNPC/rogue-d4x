# Deep-Thought

Additive discovery log for *Dark Clues*. No deletions; corrections use ~~strikethrough~~.

- 2026-06-22T10:50:19.611109 — Initial pass complete. Confirmed project layout: `index.html` bootstraps `SevenDRL.js`, while `index.js` is the ESM module loader importing `runtime/base.js` plus bulk module bundles. Core game logic lives under `modules/core`; engine/process helpers live under `modules/watabou`. Dev tooling docs and live-mod hooks are under `Dev-Tools` and `mods`.

- 2026-06-22T10:52:11.910991 — Inspected game loop and dungeon model in `modules/core/game.js`.
  - Identified the master controller `com.watabou.sevendrl.SevenDRL` owning plan, queue, hero, clues, win/lose signals.
  - Turn queue is circular: `proceed()` shifts next character, calls `act()`, then advances; blocking actions pause until `finish()` clears.
  - Dungeon generation follows a level-scaled Plan/Room/Door model, then spawns hero, wanderers, hunters, ambushes, and distance-weighted clues.
  - Boss spawns only after `gotClues >= maxClues`; victory is Boss death, loss is hero death.

- 2026-06-22T10:52:22.300449 — Identified architecture risks from `index.js`.

  - `index.js` currently contains multiple bare `import "./m";` lines instead of resolved module imports; `modules/index.js` has the correct load order.

  - This strongly suggests the entry module chain is broken in the build output, which would prevent runtime base + core modules from loading.

  - Next step: compare `index.js` against `modules/index.js` and `module-manifest.json` to restore the actual module sequence.


- 2026-06-22T10:52:51.355591 — Checked for env/setup config records (.claude, .gemini, codex/github markers) across the repo.
  - Result: none found aside from this `Deep-Thought.md`.
  - Implication: working conventions have to be inferred directly from code, not preserved agent config files.
  - Operational choice: treat `modules/*`, `module-manifest.json`, `DEPENDENCIES.md`, and the `extract-seven-drl.js` pipeline as the source of truth; do not trust the overwritten `index.js`/`index-modules.html` level imports as currently checked in.
- 2026-06-22T10:55:34.537503 — Documented gameplay architecture and extension surfaces found in the source modules/Docs.
  - Boot chain confirmed: `index.html` includes `mp3_patch.js` plus `SevenDRL.js`, then calls `lime.embed("SevenDRL", "openfl-content", 0, 0, {})`; the OpenFL runtime initialises `Main`, which calls the constructor for `TitleScene`, using `com_watabou_coogee_Game`.
  - Turn system: `SevenDRL.proceed()` maintains a circular queue; each entity's act() returns a boolean while the hero acts through classes derived from `Action`. Functions like `game.finish()` unblock the next iteration.
  - Dungeon generation uses a `Plan` that carves out `Room`s on a node-and-edge graph with doors and windows; `Pathfinder` precomputes adjacency, including optional diagonal moves when unobstructed.
  - HUD and input: `GameScene` exposes keyboard/mouse/touch controls, health/clue/card indicators, toast messages, pop-up windows, and clues embedded in tracery grammar objects.
  - Endgame is rule-based: `SevenDRL.collectClue()` triggers boss spawn once enough clues are retrieved; `GameScene.onGameOver()` switches between `VictoryScene` and `DeathScene` depending on hero survival.
  - AI: mobs cycle through `StateIdle`/`StateWandering`/`StateChasing`; wanderers pace randomly, hunters chase the hero, ambush triggers spawn `Ambusher`s from dead-end rooms, bosses introduce `Spawn`s, and wanderers can enrage nearby mobs on death.
  - Assets: footstep, combat, ambient, and victory audio are exposed via `Sound` events, fonts link into the render pipeline, and tracery grammar powers procedural clue text plus grammar-driven regex-like parsers.
  - Dev-Tools mod layer: `Dev-Tools/mods/manifest.js` queues mods; `ModLoader` exposes `hook/before/after/replace`, validation, and method listing; custom classes are registered on `window` with documentation guiding inheritance via `Object.create`.
  - Example extension surfaces saved inline: turn flow, entity registration, spawning, boss triggers, scene transitions, input routing, visuals, audio, pathfinding, clue placement, abilities, and play/view modes.
- 2026-06-22T11:04:39.644427 — Documented mod/dev-tools extension workflow.
  - `Dev-Tools/mods/manifest.js` is the canonical mod load order; currently active mods include `loader.js` and `game.js` (core patches), plus UI tools `ui/dev-toolbar.js` and `ui/inspector.js`.
  - `ModLoader` supports hook, before, after, replace, validateMethod, and listMethods; custom prototypes are extended with `Object.create(Base.prototype)` because `$extend` is scoped inside the SevenDRL bundle.
  - Rogue API surface includes `Rogue.Mob`, `Rogue.Encounter`, `Rogue.Plan`, `Rogue.Grid`, `Rogue.Room`, `Rogue.Ability`, `Rogue.UI`, `Rogue.Util`, and `Rogue.Registry`, enabling JSON-driven plans, custom mobs, abilities, and room spawns without recompiling Haxe.
  - Risk noted: highest-impact current unknown is the broken top-level `index.js` import chain versus the corrected `modules/index.js` sequence; if runtime loading is ever restored, `modules/index.js` should be the source for import order.
- 2026-06-22T11:05:08.079678 — Documented the active mod/UI/dev-toolchain layer (`Dev-Tools`).
  - `mods/loader.js` exposes `ModLoader` with `resolve/hook/flush`; class resolution falls back to `$hxClasses[name]` or `window[name.replace(/\./g,'_')]`, so hooks can patch classes before and after they resolve when deferred patches are flushed on a 300ms timer.
  - `mods/game.js` hooks `SevenDRL` lifecycle events (`spawnMobs`, `spawnClues`, `collectClue`, `createPlan`, `gameOver`) plus signals for `clueFound` and `over`.
  - `mods/characters.js` hooks hero/mob/clue/hunter lifecycle points and subscribes to hero signals like `cardChanged` and `hpChanged`.
  - `mods/scenes.js` hooks `GameScene` reset/key/click and both `TitleScene` + `DeathScene` transitions; logs help map click-to-action flow and status commands.
  - `mods/debug.js` exposes `window.DBG` with helpers such as `status`, `heal`, `damage`, `kill`, `reveal`, `nextLevel`, `spawnClue`, `spawnBoss`, `mobs`, and `grid`, giving runtime introspection without browser builds.
  - `ui/dev-toolbar.js` adds a floating toolbar for status, hero actions, map/spawn commands, and info dropdowns; the panel relies on `_gthis.map.set_scaleX(...)` for layout.
  - `ui/inspector.js` renders a persistent on-page inspector overlaying HP/level/card/clue/mob/queue/boss info via polling and color-coded states, useful for live debugging.
  - `index-modules.html` is the best-found authoritative ESM boot harness for the module build; it uses an import map to remap `modules/index.js` specifiers to their real paths, including a `mods-importmap` redirect for game.js/characters.js/scenes.js, enabling live reload of patched modules through a custom overlay instead of recompiling Haxe.
  - Operational note: `index.js` still contains unresolved `import "./m";` proxy lines from an earlier transform, so `index-modules.html` should be treated as the real runnable entry until that is repaired.

Environment note preserved in Deep-Thought:
  - `read_file` shows stale file-read behavior within this session. I’m reading repo files via direct `pathlib` calls as the reliable fallback, and all documentation writes continue as normal.
- 2026-06-22T11:05:28.513802 — Documented character semantics and remaining unknowns.
  - `Character` base governs positioning, room tracking, visibility updates, and FOV cache invalidation on room transitions via `setPos` and helpers like `getInfo`, `blocks`, and `isAlive`.
  - `Ambush` is an invisible single-use trap: hero stepping on its cell triggers a fade-in spawn of `Ambusher`s from contour edges, adding dramatic entry via `Tweener` and finishing with `_gthis.game.finish(_gthis, true)` once the sequence settles.
  - `Mob` owns an AI state machine (`idle/wander/chase`) plus pathfinding, visibility-aware animation versus fog-of-war snapping, damage handling, and a base death log; state changes are explicit methods, so mods can call `mob.wander()` or `mob.chase(hero)`.
  - Still unknown after inspection: `ActionEngage.engage()` and its attack/collect decision branch, exact clue/generation hooks inside `Clue`, and boss/spawn behavior inside `Boss/Spawn`. I'll append more discoveries when those are traced.
- 2026-06-22T11:08:09.980581 — Documented concrete combat/character/state/rules discovered in `characters.js` and `states.js`.
  - `Hunter.act()` checks line-of-sight to the hero before delegating to its state; if sight is gained and it is not already chasing, it switches to `StateChasing` and returns `false` to re-evaluate the same tick.
  - `Boss.act()` implements its own turn arc: if the hero is visible and it is not chasing, it transitions to chase; if already chasing, it has a 50% chance each tick to call `this.spawn()` and skip movement instead, then resumes chase on a non-spawn tick.
  - `Boss.spawn()` picks an adjacent empty graph neighbour at random and creates a `Spawn` wisp, then animates it moving from the boss's cell.
  - `Boss.die()` calls `Sounds.event("victory")` and dispatches `game.over`, which is the win condition.
  - `Wanderer.die()` is a two-part event: it aggos every other Wanderer in `game.queue` to chase and turns its sprite red-orange, then teleports a currently hidden `Clue` to the Wanderer's death tile if any such clues exist.
  - `Clue.reset()` wires Tracery's RNG to `Random.float`, loads the `clues` asset JSON, sets `DeckRuleSelector` as the default selector, and registers English modifiers; on subsequent runs it just calls `grammar.clearState()`.
  - `Clue.collect()` calls `game.collectClue(this)`, runs a despawn animation, and plays the `clue_note` jingle every time.
  - `StateWandering` always returns `false` from `act()`; `pickDest()` chooses from `game.cells`, which is the live walkable-cell set. `StateChasing.engage()` does 1 damage and plays the ghost attack sound.
  - `ActionEngage.proceed()` is MAP: `canEngage()` uses pathfinder graph adjacency to confirm the hero is next to the target. `engage()` is a SWAP POINT for damage/card mods; currently it switches on `hero.card._hx_index` for 1/2/3 damage, draws a new card, interrupts the hero, then ends the turn.
  - `ActionCollect.engage()` casts to `Clue` and calls `collect()`; data model matches: collectibles are `Clue`s, not general `Loot`.
  - `ActionWait` pulls a new card and cancels the current turn, effectively trading the action for a better card next time.

Environment note preserved in Deep-Thought:
  - `read_file` still shows stale read-back behavior in this session. I am continuing to record discoveries via direct file reads and appending only.
- 2026-06-22T11:20:18.566991 — Documented render/process/utilities and the canonical ESM boot order.
  - `modules/index.js` is the authoritative module load order for the game: runtime base first, then watabou libs (`geom`, `utils`, `processes`, `engine`), tracery, core systems (`style`, `audio`, `visuals`, `states`), then game logic (`pathfinding`, `game`, `characters`, `actions`), and finally scenes.
  - `runtime/base.js` is the Lime/OpenFL/Haxe runtime bootstrap. It defines `$extend`, `$hxClasses`, `lime` namespace, `HTML5Application`, keycode remapping, and the full Haxe stdlib used by all modules. It is the largest source file.
  - `modules/watabou/engine.js` provides `Game` (singleton, stage, scene switching, layout scaling), `Scene` (lifecycle, keyboard, shake, update), and `Text` (labels/inputs/formats). This is the foundation layer all top-level screens sit on.
  - `modules/watabou/processes.js` exposes a simple signal-based process scheduler: `Process` derives into `Sequence` (serial chain) and `Tweener` (0→1 progress with update callback and complete dispatch). All animations and delayed callbacks route through this.
  - `modules/watabou/utils.js` has the PRNG/everyday helpers used by everything else: `ArrayExtender` helpers (`random`, `weighted`, `subset`, `first`, `min/max`, `map/filter`, `add`, `addAll`, `collect`, `clean`, `intersect`, `replace`, `indices`, `sum`, etc.), plus seeded constants-driven RNG via `Random.seed`.
  - `modules/core/visuals.js` defines the full display stack: `AsciiSprite` renders a glyph with fade/despawn/die effects; `CharacterSprite` adds movement/engage animations; `CardIndicator` maps `ActionCard` enum to three `StatePin`s; `StatePin` is an animated rounded-rect light; `Window` / `Toast` / `Fader` / `Indicator` / `Unit` cover the entire HUD.
  - Styling contract: `Style.init()` sets four text formats (`title`, `toast`, `text`, `service`) with font "default" and color `0xDDEEFF`, center-aligning `toast` and `text`. `AsciiSprite` additionally uses font "mono".
  - Audio contract: `Sounds.event(id, vol, offset)` plays one-shot SFX with pitch-shifted variants; `Sounds.enviro(id, fade)` swaps ambient loops with crossfading via `fadeIn`/`fadeOut`. Pitch resolution yields 25 offsets from -12 to +12 semitones and caches the first access.

Environment note preserved in Deep-Thought:
  - `read_file` still exhibits stale read-back behavior in this session; discovery logging continues through direct file reads and appends only.

- 2026-06-22T11:22:07.420199 — Documented Grid/Plan/Room/Door/PlanView and the full SevenDRL controller flow as implemented in `modules/core/game.js`.
  - `Grid` exposes helpers used everywhere: `node/cell/edge/twin/edgeNdir2node/cellNdir2edge/cellNdir2cell/nodeOffset/edge2cell`. It also builds ordered boundary chains for room contours and uses flood-fill room area/door cell discovery for exploration and explored state.
  - Turn controller is in `SevenDRL.proceed/finish` in this file, not in another system: a circular queue where `proceed()` shifts the current character, requires `isReady`, calls `act()`; if `act()` returns false, that character finished this turn and `finish(ch, blocking)` marks them ready and advances. On hero death the loop defers with `Updater.wait(0, proceed)` before continuing.
  - Level formula: `level = 1..3` from RNG; grid size = `12 + 4*level`; required clues = `size*size/3`; required clues constant `maxClues = 2 + level` — so difficulty scales both dungeon area and clue count.
  - Spawning rules:
    - Heroes spawn randomly on any valid cell.
    - `spawnMobs` places `1 + level` Wanderers plus 3 Hunters outside FOV.
    - `spawnClues` builds a weighted placement map from `Pathfinder.getMap(hero.pos, cells)`, zeros hero room + door cells, then draws one clue per room by distance-weighted sampling; after each draw those room cells are zeroed so clues stay spread.
    - `spawnAmbushes` picks 1-branch dead-end rooms whose area > 2, up to `level` times; on hero entry those ambushes queue additional enemy spawns from those rooms.
  - Boss trigger is inside `collectClue`: once `gotClues >= maxClues`, the boss spawns outside the hero's FOV.
  - `PlanView` is the minimap renderer layered on top of this logic: visited rooms gray underneath, current room highlighted with a smooth crossfade on room change, with doors/windows/grid lines drawn; view auto-zooms and rotates ±30 degrees randomly per transition.
  - `Room.doors` is exposed as an `ObjectMap`; `Door.getPrice` is `room1.spacious - room1.area.length + room2.spacious - room2.area.length`, used earlier in dungeon layout generation in this file.
  - Combat and clue hooks in this phase sit in `actions.js` and `characters.js`; the Dungeon generation algorithms referenced earlier by contextual comments correspond to the same Recursive notch-cutting approach implied by `Plan`/`Room`/`Door`.

Environment note preserved in Deep-Thought:
  - `read_file` still exhibits stale read-back behavior in this session; trait evidence is accepted for memory because search failed here and the most recent local context described it. System continues direct execution reads.


- 2026-06-22T11:22:30.697999 — Documented `modules/core/pathfinding.js` and `modules/core/actions.js`, completing the core gameplay bridge between graph traversal and hero turns.
  - Pathfinder is constructed once from the Plan/rooms/grid and pre-wires every walkable cell to its reachable neighbours in `graph:cell→[cells]`. Reachability heeds room contour walls and doors; diagonal movement is allowed only when none of the 4 edges forming the diagonal “diamond” are contour walls — checked via `Dir.decompose` and 4 edge probes. This is the decisive source for how movement works in房间里 and corridor traversal.
  - Two public algorithms in Pathfinder:
    - `getPath(from,to,available)` uses Dijkstra backward from `to` through `available`, then reconstructs the path by greedy neighbour selection along the distance field. So it avoids obstacles, rooms, and walls.
    - `getMap(to,available)` spreads the same Dijkstra outward until all reachable cells are settled, returning a full distance map `cell→cost`. This is reused for clue placement weights (`spawnClues`), hunter spawning, and any state that needs a threat/fog distance map.
  - `available` is passed in by the caller; gameplay does not use a global walkability bitmask here, it filters by `game.cells` or explicit subsets. That makes the pathfinder reusable for restricted sets like “cells not in hero FOV” for spawns/boss placement.
  - The levels in this file, along with the level rules, clue mechanics, and hero/mob spawning, are governed by `SevenDRL.proceed` and related methods.
  - Action system for the hero is in `actions.js` as discrete per-turn objects — this is the second phase of the loop:
    - `Action.proceed()` is the tick contract: return `false` to keep ticking, `true` to finish the turn.
    - `ActionMove` drives step-by-step movement via `hero.getCloser(dest)`; when movement stalls or reaches the target it calls `hero.cancel()` and ends.
    - `ActionEngage` is a template: it tracks the target's last known position, updates it while visible, and defers to subclass hooks `canEngage()` and `engage()`. Subclasses provide combat/collect behaviour, so grouping these into the combat/endgame phase is valid.
    - `ActionAttack` engages when the target is adjacent in the Pathfinder graph, plays the lunge animation, applies damage based on the drawn card index, consumes and redraws the card, interruptions the hero, and finishes the hero's turn.
    - `ActionCollect` ends the hero turn by calling `Clue.collect()` once the hero is standing on the clue cell; this triggers `game.collectClue(clue)` and the boss-spawn threshold.
    - `ActionWait` ends the turn immediately while drawing a fresh card.
  - The card mechanic here has a fixed 3-step cycle `draw → use → discard`, reshuffled once the draw pile empties. Card power maps exactly to damage in `ActionAttack`'s switch. So deck order is the primary tactical constraint for the hero.

Environment note preserved in Deep-Thought:
  - `read_file` still exhibits stale read-back behavior in this session; trait evidence is accepted for memory because search failed here and the most recent local context described it. System continues direct execution reads.


- 2026-06-22T11:23:00.232192 — Negative search result: no explicit `recursiveNotch1981_4` symbol or grammar rule body found in the repo by content search. That remains a missing/unknown instead of an evidence-backed grammar rewrite.
  - Contextual `notch` references appear within the dungeon generation/plan phases only — consistent with the earlier wording about recursive notch-cutting — but there is no exact function or grammar rewrite identified.
  - Implications: the legacy grammar rewrite mechanism referenced in the repo terminology is not directly invertible from the extracted code. The known Tracery hooks (`rules`, `symbolDef`, `copyGrammar`, `copyRule`, `expandGrammar`, etc.) still form the stable entry-point set.

Environment note preserved in Deep-Thought:
  - `read_file` still exhibits stale read-back behavior in this session; trait evidence is accepted for memory because the search phase was completed in-memory. System continues direct execution reads.


- 2026-06-22T11:23:39.847053 — Documented `modules/core/scenes.js` and `modules/core/characters.js`.
  - Scene graph is simple and explicit: `TitleScene -> GameScene -> DeathScene/VictoryScene`. TextScene handles three reusable patterns — title + body + click prompt — with fade transitions via `visuals.Fader` and static `nextScene` chaining. GameScene is the center of gameplay input/output and remains the authoritative input contract.
  - GameScene owns:
    - `SevenDRL` instance and lifecycle
    - `PlanView` minimap filling the screen
    - HUD: `health` Indicator top-left, `clues` top-right, `card` top-center
    - toast messages and centered Window UI
    - input routing: arrows/numpad/WASD, Space resume, dot wait, Escape, Ctrl-click inspect
  - Character model is layered: `Character -> Mob -> concrete mobs`. Character provides:
    - `pos`, `room`, `fov` (room + door cells through doorways)
    - `updateVisibility` and `blocks` semantics
    - `act`, `damage`, `die` hooks
  - Concrete mobs:
    - `Ambush` is an invisible trigger mob that spawns `Ambusher` spirits on overlap, using `room.contour` for spawn origins, count `floor(sqrt(room.area)) + chance`.
    - `Hunter` (5 HP, purple "$") sight-chases; `Ambusher` (3 HP, light orange "£") extends Hunter; `Boss` ("The Curse", 6 HP, orange "©") extends Mob, always chases, and has 50 percent per turn to spawn `Spawn` wisps on adjacent empty graph cells; winning triggers `game.over.dispatch()` and victory sound; death logs a banish message.
    - `Wanderer` (3 HP, "&") drifts idle until hurt; once aggroed it chases. If a Wanderer dies, all Wanderers aggro-chase, and a hidden uncollected clue teleports to the death cell.
    - `Spawn` (wisp, 1 HP, "¢") is a Hunter variant; Boss spawns it only when chasing.
  - Hero extends `Character` and targets click cells via priority: self -> wait, outside FOV -> explore move, visible mob -> attack, visible clue -> collect, else move. `Hero.getCloser` is the fog-of-war variant: available cells are `game.explored` only, and crossing room boundaries fires `roomChanged`. Hidden-mob visibility during move triggers `interrupt` and pauses input.
  - Clue logic: static `grammar` built from `Assets.getText("clues")`, non-repeating selector `DeckRuleSelector`, English modifiers. `Clue.collect` calls `game.collectClue`, despawns the sprite, and plays a pitch-jittered note jingle.
  - Card system remains centralized: `ActionDeck.draw/discard/reshuffle`, `Hero.pullCard` discards current and draws next, cardChange signal drives HUD.

Environment note preserved in Deep-Thought:
  - `read_file` still exhibits stale read-back behavior in this session; trait evidence is accepted for memory because the read path was direct via execution. System continues direct file reads through execution helpers.


- 2026-06-22T11:24:43.830694 — Added open boundary note at Eugene traces/Watabou/C64 code edge.
  - From the extracted `modules/core/game.js` and `pathfinding.js`, the only door/path geometry vocabulary found was `Plan/Room/Door/PlanView` plus adjacency ripple tests that brokered corridor movement. No explicit `RecursiveNotch1981_4` symbol was located by content search in the project sources.
  - That means the archived sentence remains a historical/meta gate, not a proven in-game function, unless external Eugene/Watabou material defines it.
  - Matching concrete facts still hold:
    - Passage funding is still interpreted from `Door.getPrice` and `Room.area/spacious` usages inside `modules/core/game.js`.
    - No visual tag corresponding to the archive's color vocabulary was found in these files.
    - Behavior trace still lists unambiguous mob states: Hunters sight-chase, Ambusher spawn Chains, Boss spawns Wisps on chase ticks, Boss death triggers victory, Wanderer death triggers aggro spread + clue relocation, Clue collects and draws a non-repeated text via Tracery, Heroes use fog-of-war pathfinding, turn controller is circular in `GameScene/reset`/`SevenDRL.proceed`.
  - The line between "use in-source behaviors verbatim" and "read archive as reference with proven-facts checklist" is fixed: in-source behaviors override the archive; the archive stays in place only as a meta handbook unless confirmed externally.

Environment note preserved in Deep-Thought:
  - `read_file` still exhibits stale read-back behavior in this session; trait evidence is accepted for memory because the boundary review is mixed direct reads. System continues direct file reads through execution helpers where possible.


- 2026-06-22T11:27:54.197137 — Traced `modules/core/game.js` generation phases in detail.
  - Generation entrypoint is `Plan.create(size,required,roomSize)` (lines 703-786):
    1. Scatter non-overlapping random rects on an empty `size×size` boolean grid until `area >= required`.
    2. Build a `Grid` and collect all covered cells into `area`.
    3. Construct `Plan(grid,area,roomSize)`.
  - Plan constructor (lines 671-687) runs these steps sequentially:
    - `divideArea(abris,roomSize)` — recursive notch-cutting into rooms
    - `connectRooms()` + `wallDoors()` — make a connected graph
    - `spawnWindows()` — distribute outer-wall windows
    - `room.spawnProps()` for each room
  - Room split algorithm is the recursive notch-cutting phase:
    - `divideArea(contour,limit)`:
      - Compute `area = grid.contour2area(contour)`.
      - Compute `randomSize = limit + ((whole/4) - limit) * bellRandom(...)`. If `area <= randomSize`, emit a Room and stop (base case).
      - `notch = getNotch(contour)`, which chooses the midpoint of the max-length straight edge (line 861-874).
      - Build a cut chain starting from `notch` and extending outward along its dir via `grid.edgeNdir2node` until it rejoins the contour (lines 809-810 and 822-829).
      - Optionally shorten the cut by a probabilistic slice to create radial/irregular splits (lines 812-829).
      - Push cut into `innerWalls`; slice the contour into `part1/part2` using `ChainUtils.slice`; recurse on both halves.
    - `getNotch(contour)` -> longest straight-edge midpoint + 90-degree turn neighbor.
    - `getNotch1(contour)` -> picks any convex corner (dir != predecessor dir) and turns cw/op randomly.
  - Door graph construction is in `connectRooms`:
    - Build pairwise linked edge sets between adjacent rooms (map of `room→room→[edges]` via twin edge resolution).
    - `estimateEntrance(cell,room)` counts in-room neighbours in all directions, doubling count if cell is already “busy” (already selected entrance) — so entrance cost balances local bandwidth.
    - For each unlinked room pair, choose edge minimizing `price := n1*n2` where `n1/n2` are entrance counts from `estimateEntrance`. That adds the lowest-entropy bridge first and keeps projections low.
    - After first pass, `wallDoors()` removes obvious shortcuts (any door where both rooms already have a cheaper door via a third room), then runs a Prim-like MST on remaining doors by price, and finally randomly walls off another `doors.length >> 1` for maziness.
  - Windows are purely cosmetic: group outer contour edges by compass direction, then draw a window segment at random positions proportional to group length (line 1140-1187).
  - Props are randomised rectangles along contour edges that do not contain doors and are not corridor cells — they make rooms feel inhabited and vary per room.

**Race/visibility semantics (no in-code color terminology, probabilistic mechanic)**:
- The previously discussed “racist/visibility” phrase from the archive does not appear as a named mechanic in the source. The matching behavior is instead a deterministic fog-of-war system:
  - FOV = room `.area` union door-edge cells on adjacent rooms (through doorways) for each character — see `Character.getFOV`.
  - Visibility triggers interruption when a hidden mob becomes visible to the hero during `Hero.getCloser` (lines 1083-1110).
  - The minimap layers visited rooms as persistent floor tiles (`PlanView.visited`), with highlight/zoom rotation on room transitions — there is no color-based race predictor anywhere in the renderer.
- Since this mechanic has no in-source DO/UNDO rule mirror beyond visibility/interrupt, I am recording it as **stable architecture without a direct archive match**: only the revealed/unrevealed trigger and minimap behavior are authoritative.

Environment note preserved in Deep-Thought:
  - `read_file` still exhibits stale read-back behavior in this session; trait evidence is accepted for memory because the boundary review is mixed direct reads. System continues direct file reads through execution helpers where possible.


- 2026-06-22T11:28:07.611994 — Deepened the dungeon-generation trace from `modules/core/game.js`.
  - The confirmed entrypoint is `Plan.create(size,required,roomSize)`:
    - `size` is the grid dimension; `required` is minimum covered cells.
    - It repeatedly places non-overlapping random rectangles until coverage ≥ `required`.
    - It then converts the boolean coverage into `Area` cells and calls `new Plan(grid,area,roomSize)`.
  - `Plan(grid,area,roomSize)` sequence:
    - `divideArea(abris,roomSize)` — recursive notch-cutting
    - `connectRooms()` + `wallDoors()` — door-graph stabilisation
    - `spawnWindows()` — outer-wall window placement (cosmetic only)
    - `room.spawnProps()` on each room
  - `divideArea(contour,limit)` is the recursive split:
    - Base case: area measurement small enough → emit room.
    - Cut selection: `getNotch(contour)` picks the midpoint of the longest straight boundary edge, then turns 90° to extend the cut.
    - Cut extension: walks `edgeNdir2node` until it rejoins the contour, optionally shortened by a random slice.
    - Resulting pieces become two recursive halves via `ChainUtils.slice`/`grid.revertChain(cut)` recursion.
  - `connectRooms` builds the bridge graph:
    - First links every pair of rooms that share contour twins.
    - Chooses doors by entrance `estimateEntrance` cost = in-room neighbour count; busy cells are double-penalised.
    - `wallDoors` removes redundant shortcuts, builds an MST by price, and randomly walls additional doors.
  - Window/prop layers are cosmetic post-processing after the graph is stable.

Environment note preserved in Deep-Thought:
  - `read_file` still exhibits stale read-back behavior in this session; trait evidence is accepted for memory because the boundary review is mixed direct reads. System continues direct file reads through execution helpers where possible.


- 2026-06-22T11:33:55.739054 — Completed blueprint/room-generation code inventory with line-number reference.
  - File: `Dev-Tools/level-creator/creator.js`
    - purpose: visual grid-based level editor (975 lines total).
    - state shape: `gridW/gridH`, `cells[row][col]` room IDs, `rooms[]` objects with `cells`, `connections`, `doors`, `heroStart`, `boss`, `spawn` lists.
    - key functions:
      - `init()` (line 50) bootstraps canvas, input state, default room.
      - `createRoom()` (line 98) assigns auto color + ID, marks active.
      - `render()` (line 108) paints room fills, door candidates (yellow), room IDs, hero ★ and boss ♛ markers, active-room outline.
      - `getRoomConnections()` (line 572) derives adjacency list from cell neighbors.
      - `exportJSON()` (line 591) outputs versioned JSON: rooms with cells/connections/doors, hero/boss metadata, character loadout.
      - `importJSON()` (line 680) imports back into editor via `loadFromData()` (line 701).
    - edit capabilities: paint/erase, drag, hero/boss placement, add/remove enemy spawns to rooms using `../../assets/enemies/manifest.json`.
  - File: `modules/core/game.js`
    - runtime blueprint generator is `Plan.create(size, required, roomSize)` (line 703).
    - Behavior: random non-overlap rect scatter on boolean grid, then `Plan(grid, area, roomSize)` triggers recursive split/connect/props/windows.
    - `divideArea()` (line 796), `getNotch()` (line 845), `getNotch1()` (line 876), `connectRooms()` (line 931), `wallDoors()` (line 1053), `spawnWindows()` (line 1140), `spawnProps()` (line 1314) define the blueprint system.
  - File: `Dev-Tools/mods/debug.js`
    - debug helpers reference rooms/plan directly for runtime inspection.
      - `DBG.reveal()` (line 85) iterates `game.plan.rooms` and calls `game.explore()`/`planView.addVisited()`.
      - `DBG.status()` (line 39) reports `queue.length`, `level`, hero HP, clue count, boss alive flag.
      - `DBG.spawnBoss()` (line 158) picks a candidate outside hero FOV and adds a Boss instance.
      - `DBG.spawnClue()` (line 123) calls `game.spawnClues()` and attaches sprites to the current view.
  - File: `Dev-Tools/mods/view-mode.js`
    - event-driven overlay renderer supports top/iso/side (line 5).
    - `roomColor(room)` cached palette at line 62.
    - `visibilityTier(cell, game, fovCells)` (line 72) returns visible/explored/none.
    - `buildRoomGeo(game)` (line 164) precomputes exterior walls + doors + windows for side view rendering.
  - Notable:
    - The `Rogue.Plan.loadFromJSON()` referenced in `creator.js` header (line 13) does not exist; editor JSON export is unconsumed by runtime.
    - Word "blueprint" appears only in `assets/clues.json` line 8 as tracery grammar, not in generator logic.

