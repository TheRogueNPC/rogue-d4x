# Dungeon Duel — agent.md

## Purpose
This document defines the agent contract for building, testing, and extending **Dungeon Duel (D4X)**, a two-player tactical overlord-vs-overlord dungeon-extraction game with mutable terrain, path routing, event-card variance, and anti-stalemate systems.[page:1]

The agent should treat the game as a deterministic, turn-based simulation first, and a terminal-rendered presentation layer second.[page:1]

## Product framing
Dungeon Duel is a competitive game where both players shape a shared dungeon by placing terrain, rooms, and event effects while trying to guide their own Chosen pawns to a Golden Path and extract through a Flag tile before the opponent does.[page:1]

The design has two linked modes of play: building the route and surviving the incursion/extraction phase, with active sabotage through actions like Break, Block, Swap, Flip, Stun, and Shove.[page:1]

## Core design truths
- The board is **contested**, not privately owned by either player.[page:1]
- The terrain is **mutable** throughout play; the board should never feel solved or static.[page:1]
- The rules are intentionally anti-stalemate: destruction, cooldown timing, death-triggered terrain loss, and shifting path status should keep the game moving.[page:1]
- The simulation must support scaling board sizes from 4x4 to 16x16, with party size increasing from 1 to 4 pawns depending on board size.[page:1]
- Movement is cardinal only: north, east, south, west; no diagonal movement exists in base rules.[page:1]

## Agent goals
The agent should:
- Preserve the spec’s tactical identity: route-building plus extraction pressure plus disruption timing.[page:1]
- Prioritize deterministic rule resolution over visual polish.[page:1]
- Keep game-state transitions explicit, serializable, and testable.[page:1]
- Separate pure simulation logic from terminal UI, AI decision logic, and content/deck definitions.[page:1]
- Ensure every subsystem reinforces the no-stalemate mandate from the spec.[page:1]

## Non-goals
The agent should not:
- Introduce diagonal movement unless the rules are explicitly revised.[page:1]
- Convert the game into a pure deck battler, auto-battler, or roguelike run structure.[page:1]
- Hide state mutations behind rendering code or side effects.[page:1]
- Add “fun” randomness that overrides deterministic resolution order once inputs are committed.[page:1]

## Game loop model
Implement the game loop in this sequence:
1. **Dungeon Phase**: players alternately place or modify terrain and rooms.[page:1]
2. **Path Emergence**: detect when a valid connected route of length `k` creates a Golden Path candidate.[page:1]
3. **Incursion Phase**: pawns enter and move on legal tiles, triggering hostile event effects when applicable.[page:1]
4. **Disruption Phase**: resource-limited powers may alter board state or pawn positioning.[page:1]
5. **Resolve & Reset**: process kills, terrain destruction, cooldown ticks, bans, and respawn/re-entry rules.[page:1]
6. **Extraction Check**: first player to extract their full party through the Flag wins; repeated wipes can trigger attrition victory.[page:1]

## Required board model
Represent the board as a grid supporting these sizes and implied party counts:

| Board size | Party size |
|---|---|
| 4x4 | 1 |
| 8x8 | 2 |
| 12x12 | 3 |
| 16x16 | 4 |

Source: core rules spec.[page:1]

The board must support at minimum these tile types:
- Empty
- Corridor
- Room
- Gate
- Key
- Redirect
- Blocked
- Flag
- Void[page:1]

Rooms may also carry an attached EventCard payload, including Gear, Terrain, Trap, Monster, or Omen behavior.[page:1]

## Turn structure contract
Each full turn contains both players’ phases followed by resolution:
1. Phase A: active player declares Block or Break first if using it, then places a terrain tile, moves a pawn, or uses a special action subject to charges/cooldowns.[page:1]
2. Phase B: opposing player mirrors the same structure.[page:1]
3. Resolution: apply expiring bans, tick cooldowns, and check win/loss conditions.[page:1]

The agent must enforce declaration ordering, especially that Block/Break declaration precedes any placement or movement within that phase.[page:1]

## Resource action constraints
The following action constraints are explicitly present in the spec and should be encoded as data, not hardcoded conditionals spread across the codebase:[page:1]

| Action | Constraint summary |
|---|---|
| Break | Starts with 2 charges, gains +1 every 4 turns up to cap 2; has a 2-turn self-ban after use; removes enemy tile; applies a 2-turn one-way ban on that cell to victim and a 1-phase ban to breaker.[page:1] |
| Block | 1 use/effect window in listed rules; declared pre-movement; bans placement for both players for 1 full turn.[page:1] |
| Swap | 2 uses per game; recharges in 2 turns; cannot create the winning 4th according to the visible spec text.[page:1] |

The visible page excerpt confirms additional special actions exist: Flip, Stun, and Shove; treat them as first-class actions in the model even if their detailed numbers are defined elsewhere in the full spec.[page:1]

## Win and failure conditions
The agent must support these victory/failure checks:
- Primary victory: first Overlord to deliver their full party through the Flag tile wins.[page:1]
- Secondary anti-stall victory: if a party is wiped 3 times, the opposing Overlord may win by attrition.[page:1]
- Pawn death must destroy 2 tiles and reset that pawn to the nearest edge, or force a new entry point if no edge tiles remain.[page:1]

## Architecture expectations
Use a layered architecture with these modules:
- `core/` — rules engine, turn resolver, board/path validation, combat/effects resolution.
- `state/` — canonical game state, serialization, replay snapshots, versioned schema.
- `content/` — terrain definitions, event cards, monsters, traps, gear, omen data.
- `ai/` — heuristic or search-based decision agents; never allowed to mutate state except through legal action APIs.
- `ui/terminal/` — renderer, input mapping, logs, debug overlays.
- `tests/` — unit, scenario, property, and regression tests.

## Data model guidance
The agent should define explicit types for:
- `GameState`
- `PlayerState`
- `Pawn`
- `Tile`
- `TileCoord`
- `TileConnectionMask` or equivalent routing descriptor
- `EventCard`
- `Action`
- `Phase`
- `CooldownState`
- `BanState`
- `WinState`
- `CombatResolution`
- `PathState` including Golden Path status[page:1]

Favor immutable updates or reducer-style state transitions so every action can be replayed and audited.[page:1]

## Pathfinding and validation
The Golden Path is central to the game’s identity, so path evaluation must be a dedicated subsystem rather than an incidental helper.[page:1]

Implement:
- Connectivity validation for pipe-style terrain routing.[page:1]
- Entry-edge to possible-exit path search.[page:1]
- Detection of valid path length `k` according to the active scenario/rules configuration.[page:1]
- Revalidation after terrain mutation, destruction, redirection, or death-triggered tile loss.[page:1]
- Path lock/flag behavior for Golden Path emergence.[page:1]

## Event and combat handling
Enemy-modified tiles may force event resolution when entered, including traps, monsters, terrain effects, or gear interactions depending on the attached room/event state.[page:1]

Combat and event logic should be fully data-driven where possible, with deterministic resolution order and structured logs for debugging.[page:1]

## Anti-stalemate enforcement
Every implementation decision should be checked against the spec’s anti-stalemate intent.[page:1]

The agent should actively preserve:
- Terrain destruction on death.[page:1]
- Timed expiry windows for disruptive effects.[page:1]
- Cooldown-based sabotage instead of infinite spam.[page:1]
- Shifting board topology through placement, removal, and forced repositioning.[page:1]
- Secondary attrition victory to prevent infinite loops.[page:1]

If a proposed feature increases static board states, permanent lockouts, or low-interaction loops, reject or redesign it.[page:1]

## Terminal UI expectations
The renderer should make tactical state legible rather than decorative.[page:1]

Prioritize:
- Readable board coordinates and tile identities.
- Clear ownership/modification indicators.
- Pawn positions, statuses, cooldowns, bans, and pending effects.
- Golden Path visibility and extraction progress.
- A chronological action log for resolution review.
- Fast restart/replay tools for iteration and balancing.

## AI agent behavior
Any gameplay agent built against this file should operate through legal move generation plus evaluation, not by cheating hidden state mutations.[page:1]

Good AI priorities:
- Maintain or create path pressure toward extraction.[page:1]
- Deny opponent route completion at key timing windows.[page:1]
- Trade charges for tempo, not random disruption.[page:1]
- Exploit event-card leverage when stepping onto or baiting enemy-modified tiles.[page:1]
- Avoid self-locking moves that worsen anti-stalemate conditions.[page:1]

## Testing requirements
Minimum test coverage should include:
- Board initialization for each supported size.[page:1]
- Cardinal movement legality and out-of-bounds rejection.[page:1]
- Terrain placement and mutation rules.[page:1]
- Golden Path detection and invalidation after changes.[page:1]
- Break, Block, and Swap charge/cooldown behavior from visible spec rules.[page:1]
- Death-triggered tile destruction and edge reset logic.[page:1]
- Attrition victory after 3 wipes.[page:1]
- Deterministic replay: same seed plus same actions equals same outcome.

Add scenario tests for “nearly winning” states, because the spec explicitly notes restrictions such as Swap not being allowed to create the winning fourth state in the visible rules excerpt.[page:1]

## Implementation priorities
Build in this order:
1. Canonical state schema.
2. Board and tile connectivity rules.
3. Turn/phase engine.
4. Path emergence and win-condition checks.
5. Resource action framework.
6. Event-card and combat resolution.
7. Terminal renderer.
8. AI agents and balance tooling.

## Definition of done
A feature is complete only when:
- It is represented in canonical state.
- It resolves deterministically.
- It is covered by automated tests.
- It is visible or inspectable in terminal debug output.
- It does not undermine the spec’s anti-stalemate goals.[page:1]

## Handoff note
Use this file as the stable implementation contract for coding agents, planning agents, and testing agents. When the full spec adds more detail for Event Cards, combat values, or special-action tuning, extend the data tables and tests without changing the architectural assumptions above.[page:1]
