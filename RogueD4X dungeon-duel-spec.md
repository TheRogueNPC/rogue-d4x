# DUNGEON DUEL (D4X)

## **A Tactical Overlord vs. Overlord Dungeon-Extraction Game**

### **Technical & Design Specification (TypeScript/JavaScript, Terminal Renderer)**

**Version 1.0 — Prepared July 2026**

---

## **1\. EXECUTIVE SUMMARY**

**Dungeon Duel is a two-player tactical simulation in which each player acts as a rival Dungeon Overlord. Each Overlord secretly and openly shapes a shared dungeon — laying rooms, corridors, traps, monsters, and gear — while trying to guide their own party of Chosen pawns to a golden extraction path, all while sabotaging the opposing Overlord's progress.**

**The game evolved from a minimalist 4x4 alignment puzzle into a full asymmetric duel that fuses:**

- **Procedural path/pipe-routing construction**  
- **Resource-gated destruction and denial (break/block/swap/flip)**  
- **Turn-based tactical pawn movement and combat**  
- **Deck-driven terrain, trap, monster, and gear variance**  
- **A two-act structure: BUILD the path, then ESCAPE the dungeon**  
  **It is designed to produce zero stalemates by ensuring the board is never static: tiles are destroyed on death, paths are contested and rerouted, and every major system (movement, combat, terrain) injects state change on a regular cadence.**  
  ---

  ## **2\. GAME SUMMARY — WHAT IT IS**

  **Two Overlords face off across a dungeon board (4x4, 8x8, 12x12, or 16x16). Neither side "owns" the dungeon outright — it is a contested, mutable space. Each Overlord controls a party of Chosen pawns (1 to 4, scaling with board size) that must reach a Golden Path and extract through a Flag tile.**  
  **The dungeon is built from Terrain Tiles (pipe-style connectors: straights, elbows, junctions, gates, keys, redirects) and Dungeon Rooms (which can be modified by Event Cards). Event Cards come from four decks — Gear, Terrain, Traps, Monsters — plus a fifth wildcard deck, Omens, for one-shot dungeon-wide phenomena.**  
  **Players do not merely race. They actively interfere: breaking tiles, blocking squares, swapping pawn positions, flipping regions of influence, stunning enemy pawns, and shoving them off the path into the void, forcing a costly re-entry.**

### **2.1 How It's Played (High-Level Loop)**

1. **Dungeon Phase — Players alternately place/modify terrain tiles and rooms, attach Event Cards, and shape the pipe-routing network.**  
2. **Path Emergence — Once a valid connected route of length k exists from an entry edge to a possible exit, a Golden Path is flagged and locked in.**  
3. **Incursion Phase — Pawns enter and move along legal tiles. Entering an enemy-modified tile forces resolution of its Event Card (trap, monster, etc.).**  
4. **Disruption Phase — Both Overlords may spend limited-charge powers (Break, Block, Swap, Flip, Stun, Shove) to hinder the rival party or protect their own.**  
5. **Resolve & Reset — Monster kills reward the killer; pawn death destroys 2 tiles and resets that pawn to the nearest edge (or forces a new entry point if no edge tiles remain).**  
6. **Extraction — First Overlord to deliver their full party through the Flag tile wins. If a party is wiped 3 times, the opposing Overlord may win by attrition (secondary win condition, prevents infinite stalling).**

### **2.2 What Makes It Unique**

- **Two-Act Design: Building and escaping require different skills (construction vs. tactical execution), keeping both halves of the game meaningfully distinct.**  
- **Contested, Mutable Terrain: The board is never "finished" — pipe routing, destruction, and Event Cards keep reshaping it continuously.**  
- **Resource-Timed Sabotage: Break/Block/Swap/Flip/Stun/Shove all have distinct cooldowns and one-time-use budgets, creating a rich timing metagame rather than spam-based interference.**  
- **Scaling Party Size: Larger boards grant more Chosen pawns, turning the same ruleset into anything from a tight 1v1 duel to a small squad-tactics skirmish.**  
- **Anti-Stalemate by Design: Death destroys terrain, breaks have expiry windows, and Golden Path status can shift — the system is engineered against static draws.**  
  ---

  ## **3\. CORE RULES SPEC**

### **3.1 Board & Tiles**

- **Board sizes: 4x4 (1 pawn/party), 8x8 (2), 12x12 (3), 16x16 (4).**  
- **Tile types: `Empty`, `Corridor`, `Room`, `Gate`, `Key`, `Redirect`, `Blocked`, `Flag`, `Void`.**  
- **Rooms may carry an attached `EventCard` (Gear / Terrain / Trap / Monster / Omen).**  
- **Movement is cardinal only (N/E/S/W) — no diagonals.**

### **3.2 Turn Structure (per Turn \= both players' Phases)**

1. **Phase A (Active Player) a. Declare Block/Break (must precede any placement or movement this phase). b. Place a Terrain Tile OR move a Pawn OR use a special action (Swap/Flip/ Stun/Shove), subject to charge/cooldown availability.**  
2. **Phase B (Opposing Player) — mirrors Phase A.**  
3. **Resolution — apply expiring bans, tick cooldowns, check win/loss conditions.**

### **3.3 Resource Actions**

| Action | Charges | Cooldown | Notes |
| :---- | :---- | :---- | :---- |
| **Break** | **2 start, \+1/4 turns, cap 2** | **2-turn self-ban after use** | **Removes enemy tile; applies 2-turn one-way ban on that cell to victim, 1-phase ban to breaker** |
| **Block** | **1** | **1 turn effect** | **Declared pre-movement; bans placement for both players for 1 full turn** |
| **Swap** | **2 uses/game** | **Recharge 2 turns** | **Cannot create the winning 4th; cannot block an imminent 3-join** |
| **Flip** | **1 use/game** | **—** | **Converts all adjacent tiles/pawns to caller's control (Go-style influence)** |
| **Stun** | **Unlimited, costs a turn** | **—** | **Opposing pawn frozen 2 turns** |
| **Shove** | **Unlimited, costs a turn** | **—** | **Push adjacent enemy pawn 1 square away; can eject into Void** |

### **3.4 Death & Reset**

- **Losing a combat vs. a Monster (or failing a Trap check) destroys the pawn.**  
- **On death: 2 adjacent tiles are destroyed; the pawn respawns at the nearest edge tile owned by that player, or must create a new entry point if none exist. By using a break \- will automatically grant the player that tile space and move the pawn.**   
- **Killing a Monster grants the killer a Gear card reward.**

### **3.5 Win Conditions**

1. **Extraction Win — deliver all party pawns through the Flag tile.**  
2. **Attrition Win — opposing party wiped 3 times cumulatively.**  
3. **Optional Sudden-Death — after N turns with no progress, shrink the board edge-in by one ring per turn (forces resolution, guarantees no infinite draw).**  
   ---

   ## **4\. TECHNICAL DESIGN SPEC (TypeScript / JavaScript)**

### **4.1 Architecture Overview**

**src/**

  **core/**

    **Board.ts**

    **Tile.ts**

    **Pawn.ts**

    **Overlord.ts**

    **GameEngine.ts**

    **TurnManager.ts**

    **EventResolver.ts**

  **cards/**

    **Card.ts**

    **Deck.ts**

    **decks/GearDeck.ts**

    **decks/TerrainDeck.ts**

    **decks/TrapDeck.ts**

    **decks/MonsterDeck.ts**

    **decks/OmenDeck.ts**

  **actions/**

    **BreakAction.ts**

    **BlockAction.ts**

    **SwapAction.ts**

    **FlipAction.ts**

    **StunAction.ts**

    **ShoveAction.ts**

  **pathing/**

    **PathValidator.ts**

    **GoldenPathTracker.ts**

    **PipeRouter.ts**

  **render/**

    **TerminalRenderer.ts**

    **GlyphMap.ts**

    **ColorTheme.ts**

  **input/**

    **InputHandler.ts**

    **CommandParser.ts**

  **state/**

    **GameState.ts**

    **StateSnapshot.ts**

    **EventBus.ts**

  **index.ts**

### **4.2 Core Data Models**

**type Coord \= { x: number; y: number };**

**type TileType \=**

  **| "empty" | "corridor" | "room" | "gate"**

  **| "key" | "redirect" | "blocked" | "flag" | "void";**

**interface Tile {**

  **pos: Coord;**

  **type: TileType;**

  **ownerId?: string;          // which Overlord placed/controls it**

  **connections: Direction\[\];  // pipe-routing: which sides connect**

  **eventCardId?: string;      // attached Event Card, if any**

  **blockedUntilTurn?: number; // Block/Break temporal bans**

  **banned?: { playerId: string; untilTurn: number }\[\];**

**}**

**type Direction \= "N" | "E" | "S" | "W";**

**interface Pawn {**

  **id: string;**

  **ownerId: string;**

  **pos: Coord;**

  **hp: number;**

  **atk: number;**

  **stunnedUntilTurn?: number;**

  **gear: Card\[\];**

  **alive: boolean;**

**}**

**interface Overlord {**

  **id: string;**

  **name: string;**

  **party: Pawn\[\];**

  **breaksAvailable: number;**

  **breakCooldownUntil: number;**

  **blocksAvailable: number;**

  **swapsUsed: number;**

  **flipUsed: boolean;**

  **deaths: number;**

**}**

**interface Card {**

  **id: string;**

  **family: "gear" | "terrain" | "trap" | "monster" | "omen";**

  **name: string;**

  **glyph: string;**

  **onEnter?: (ctx: EventContext) \=\> EventResult;**

  **onAttach?: (ctx: EventContext) \=\> void;**

**}**

### **4.3 Key Classes**

**class Board {**

  **tiles: Tile\[\]\[\];**

  **width: number;**

  **height: number;**

  **getTile(pos: Coord): Tile;**

  **setTile(pos: Coord, tile: Partial\<Tile\>): void;**

  **neighbors(pos: Coord): Coord\[\];**

  **destroyTile(pos: Coord): void;**

  **isWalkable(pos: Coord, playerId: string, turn: number): boolean;**

**}**

**class PipeRouter {**

  **// Validates that a chain of tiles forms a legal, fully connected route**

  **isConnected(board: Board, from: Coord, to: Coord): boolean;**

  **findGoldenPath(board: Board, entry: Coord, length: number): Coord\[\] | null;**

**}**

**class GoldenPathTracker {**

  **path: Coord\[\] | null;**

  **flagPos: Coord | null;**

  **evaluate(board: Board): void; // called every Resolution step**

  **lockPath(path: Coord\[\]): void;**

**}**

**class EventResolver {**

  **resolveTileEntry(pawn: Pawn, tile: Tile, ctx: GameContext): EventResult;**

  **resolveCombat(attacker: Pawn, monster: MonsterInstance): CombatResult;**

  **applyDeath(pawn: Pawn, board: Board): void; // destroys 2 tiles, resets pawn**

**}**

**class TurnManager {**

  **currentTurn: number;**

  **activePlayerId: string;**

  **advancePhase(): void;**

  **tickCooldowns(overlords: Overlord\[\]): void;**

  **checkTemporalBans(board: Board): void;**

**}**

**abstract class SpecialAction {**

  **abstract canUse(ctx: GameContext): boolean;**

  **abstract execute(ctx: GameContext): void;**

**}**

**class BreakAction extends SpecialAction { /\* removes tile, applies bans \*/ }**

**class BlockAction extends SpecialAction { /\* 1-turn global ban \*/ }**

**class SwapAction extends SpecialAction { /\* adjacent swap, no 4th, no 3-join block \*/ }**

**class FlipAction extends SpecialAction { /\* converts adjacent tiles/pawns \*/ }**

**class StunAction extends SpecialAction { /\* freeze enemy pawn 2 turns \*/ }**

**class ShoveAction extends SpecialAction { /\* push pawn, may eject to Void \*/ }**

**class Deck\<T extends Card\> {**

  **cards: T\[\];**

  **draw(): T;**

  **shuffle(): void;**

  **discard(card: T): void;**

**}**

**class GameEngine {**

  **board: Board;**

  **overlords: \[Overlord, Overlord\];**

  **turnManager: TurnManager;**

  **pathTracker: GoldenPathTracker;**

  **eventResolver: EventResolver;**

  **eventBus: EventBus;**

  **start(): void;**

  **step(command: PlayerCommand): GameState;**

  **checkWinConditions(): WinResult | null;**

**}**

### **4.4 Event / Hook System**

**Use a lightweight pub/sub `EventBus` so systems stay decoupled and reactive.**

**type GameEvent \=**

  **| { type: "TURN\_START"; turn: number; playerId: string }**

  **| { type: "TILE\_PLACED"; tile: Tile }**

  **| { type: "TILE\_DESTROYED"; pos: Coord }**

  **| { type: "PAWN\_MOVED"; pawnId: string; from: Coord; to: Coord }**

  **| { type: "PAWN\_ENTERED\_ENEMY\_TILE"; pawnId: string; tile: Tile }**

  **| { type: "COMBAT\_RESOLVED"; result: CombatResult }**

  **| { type: "PAWN\_DIED"; pawnId: string }**

  **| { type: "GOLDEN\_PATH\_LOCKED"; path: Coord\[\]; flag: Coord }**

  **| { type: "EXTRACTED"; pawnId: string }**

  **| { type: "GAME\_OVER"; winnerId: string; reason: string };**

**class EventBus {**

  **private handlers: Map\<string, ((e: GameEvent) \=\> void)\[\]\>;**

  **on(type: GameEvent\["type"\], handler: (e: GameEvent) \=\> void): void;**

  **emit(event: GameEvent): void;**

**}**

**Recommended hook wiring:**

- **`TILE_DESTROYED` \-\> `GoldenPathTracker.evaluate()` (path may need re-validation)**  
- **`PAWN_DIED` \-\> `EventResolver.applyDeath()` \-\> emits `TILE_DESTROYED` x2**  
- **`GOLDEN_PATH_LOCKED` \-\> `TerminalRenderer.flashFlag()`**  
- **`COMBAT_RESOLVED` \-\> reward Gear card draw on kill**

### **4.5 Core Functions (Free Functions / Utilities)**

**function computeLegalMoves(pawn: Pawn, board: Board, turn: number): Coord\[\];**

**function resolveEventCard(card: Card, ctx: EventContext): EventResult;**

**function applyBreak(board: Board, target: Coord, actorId: string, turn: number): void;**

**function applyBlock(board: Board, target: Coord, turn: number): void;**

**function applySwap(board: Board, a: Coord, b: Coord): boolean; // false if illegal (would win / blocks 3-join)**

**function applyFlip(board: Board, origin: Coord, actorId: string): Coord\[\]; // returns flipped cells**

**function applyStun(pawn: Pawn, turn: number): void;**

**function applyShove(board: Board, pusher: Pawn, target: Pawn): ShoveResult;**

**function checkGoldenPath(board: Board, entry: Coord, k: number): Coord\[\] | null;**

**function checkExtraction(overlord: Overlord, flagPos: Coord): boolean;**

**function checkAttrition(overlord: Overlord, deathThreshold: number): boolean;**

---

## **5\. TERMINAL RENDERER (Grid & Glyphs)**

### **5.1 Glyph Map**

**const GLYPHS: Record\<string, string\> \= {**

  **empty:      "·",**

  **corridor:   "─",**

  **corridorNS: "│",**

  **elbow:      "└",**

  **junction:   "┼",**

  **gate:       "▓",**

  **key:        "♦",**

  **redirect:   "↻",**

  **blocked:    "▒",**

  **void:       "░",**

  **flag:       "▲",**

  **pawnP1:     "①",**

  **pawnP2:     "②",**

  **monster:    "☠",**

  **trap:       "✕",**

  **gear:       "†",**

  **omen:       "?",**

**};**

### **5.2 Color Theme (ANSI)**

**const ANSI \= {**

  **reset:  "\\x1b\[0m",**

  **dim:    "\\x1b\[2m",**

  **p1:     "\\x1b\[36m",  // cyan**

  **p2:     "\\x1b\[35m",  // magenta**

  **danger: "\\x1b\[31m",  // red**

  **boon:   "\\x1b\[32m",  // green**

  **gold:   "\\x1b\[33m",  // yellow — golden path / flag**

  **void:   "\\x1b\[90m",  // gray**

**};**

### **5.3 Example Render Function**

**class TerminalRenderer {**

  **render(board: Board, overlords: Overlord\[\]): string {**

    **let out \= "";**

    **for (let y \= 0; y \< board.height; y++) {**

      **let row \= "";**

      **for (let x \= 0; x \< board.width; x++) {**

        **const tile \= board.getTile({ x, y });**

        **row \+= this.tileToGlyph(tile) \+ " ";**

      **}**

      **out \+= row \+ "\\n";**

    **}**

    **return out;**

  **}**

  **tileToGlyph(tile: Tile): string {**

    **const pawnHere \= this.findPawnAt(tile.pos);**

    **if (pawnHere) return this.colorize(pawnHere.ownerId);**

    **if (tile.type \=== "flag") return \`${ANSI.gold}${GLYPHS.flag}${ANSI.reset}\`;**

    **if (tile.type \=== "void") return \`${ANSI.void}${GLYPHS.void}${ANSI.reset}\`;**

    **return GLYPHS\[tile.type\] ?? GLYPHS.empty;**

  **}**

**}**

### **5.4 Sample Frame**

**Turn 14  |  P1 breaks:1  blocks:0  swaps:1  flip:USED  |  P2 breaks:2 blocks:1 swaps:0 flip:READY**

  **· ─ ┼ ▓**

  **│ ① · ↻**

  **▒ · ☠ ▲**

  **░ · ─ ②**

**Legend: ① P1 pawn  ② P2 pawn  ☠ monster  ▲ flag  ▓ gate  ♦ key**

        **↻ redirect  ▒ blocked  ░ void  † gear  ✕ trap  ? omen**

**Recommended CLI conventions:**

- **Redraw the full frame each turn (clear screen), not append-scroll — prevents stale-state confusion.**  
- **Print a one-line event ticker above the board ("P2 SHOVED P1's pawn into the Void\!").**  
- **Print a fixed-width status bar below the board with charge counters.**  
  ---

  ## **6\. DYNAMIC DESIGN PARADIGM — MAKING IT REACTIVE, FUN, SNAPPY**

### **6.1 Architectural Paradigm**

- **Event-driven core, not polling. Every state change should emit an event; systems (renderer, path tracker, AI, logger) subscribe rather than being manually called in sequence. This keeps new features (new card types, new powers) pluggable without touching the engine core.**  
- **Single source of truth (`GameState`) — immutable snapshots per turn. Never mutate board/pawn state directly from the renderer or input layer; always dispatch an action \-\> reducer-style state transition \-\> new snapshot. This makes replay, undo, and network play trivial later.**  
- **Small, composable action classes (`SpecialAction` subclasses) over one giant switch statement. Each action owns its own legality check and effect.**

### **6.2 Do's**

- **Do telegraph danger one full phase before it lands (e.g., a Trap "arms" visibly before it triggers) — surprise should come from *strategy*, not from hidden information the player couldn't have reasoned about.**  
- **Do keep cooldown/charge state always visible in the status bar — resource timing is the core skill expression of this game.**  
- **Do make destruction visually loud (flash, distinct glyph, ticker message) since it's the primary anti-stalemate mechanic — players must *feel* the board changing.**  
- **Do batch simultaneous effects (e.g., a death that destroys 2 tiles) into one atomic state transition \+ one combined event, not two silent ones.**  
- **Do keep the terminal frame redraw fast (\<16ms) — snappiness in a text renderer comes from update latency, not animation frames.**  
- **Do give both players symmetric information about cooldowns/charges even if terrain/cards are asymmetric — hidden clocks feel unfair, hidden cards feel exciting.**

### **6.3 Don'ts**

- **Don't let any single action (Break, Flip, Shove) resolve a game outright without a response window — every powerful action should leave at least one reactive turn for the opponent.**  
- **Don't allow silent state mutation outside the reducer/action-class layer — this is the \#1 source of desync bugs in tactics engines.**  
- **Don't overload one turn with more than one "big" decision point — if Break, Swap, and pawn movement all require deep thought, force sequencing (declare disruption before movement, as already specified) rather than simultaneous choice paralysis.**  
- **Don't let RNG (card draws, monster spawns) replace positional skill — RNG should reshuffle *opportunities*, not directly decide outcomes.**  
- **Don't let the terminal renderer scroll — always clear and redraw; scrolling logs break the "board as a living space" feel.**  
- **Don't hardcode board-size-specific logic in the engine — party size and board dimensions should be configuration, not branching code paths.**

### **6.4 Feel & Pacing Advice**

- **Treat Break/Stun/Shove as "big beat" moments — pair them with a short ticker flourish (e.g., `>>> P2 SHOVES P1's pawn into the VOID <<<`) so the terminal medium still delivers a dopamine hit despite lacking real animation.**  
- **Keep the Golden Path lock-in as a ceremonial moment — clear separation between Build phase and Incursion phase in the UI (a distinct banner or screen transition) reinforces the two-act structure you designed.**  
- **Use color sparingly but meaningfully: gold for the path/flag, red only for imminent lethal danger, gray for void/dead terrain. Restraint keeps the ANSI palette readable and prevents visual noise.**  
- **Favor short, punchy status text over paragraphs in the ticker — tactics games feel snappier when feedback is terse and immediate.**

### **6.5 Testing / Anti-Stalemate Validation**

- **Add an automated simulation harness that runs N random-agent games and logs turn counts, checking that no game exceeds a sane turn ceiling — this empirically proves the "0 stalemates" design goal rather than assuming it.**  
- **Track a "board entropy" metric (tiles changed per turn) during playtesting; if entropy trends toward zero for multiple consecutive turns, that's a signal the sudden-death shrink rule should trigger sooner.**  
  ---

  ## **7\. SUMMARY TABLE — SYSTEM AT A GLANCE**

| Layer | Responsibility | Key Classes |
| :---- | :---- | :---- |
| **Board/Terrain** | **Tile state, pipe routing, destruction** | **`Board`, `Tile`, `PipeRouter`** |
| **Path** | **Golden Path detection & locking** | **`GoldenPathTracker`** |
| **Pawns** | **Movement, combat, death/reset** | **`Pawn`, `EventResolver`** |
| **Actions** | **Break/Block/Swap/Flip/Stun/Shove** | **`SpecialAction` subclasses** |
| **Cards** | **Gear/Terrain/Trap/Monster/Omen decks** | **`Card`, `Deck<T>`** |
| **Turn Flow** | **Phases, cooldown ticking, bans** | **`TurnManager`** |
| **State** | **Snapshots, event bus** | **`GameState`, `EventBus`** |
| **Presentation** | **Terminal grid/glyph rendering** | **`TerminalRenderer`, `GlyphMap`** |
| **Input** | **Command parsing** | **`InputHandler`, `CommandParser`** |

  ---

  ***End of specification.***

  