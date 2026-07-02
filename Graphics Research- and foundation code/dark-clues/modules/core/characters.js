// ═══════════════════════════════════════════════════════════════════
// CHARACTERS — modules/core/characters.js
// Extracted from SevenDRL.js by extract-seven-drl.js
//
// All character classes for the Dark Clues roguelike.
// Each entity that occupies a tile on the dungeon grid extends from
// the base Character class.  The class hierarchy is:
//
//   Character (abstract base)
//   ├── Ambush       – invisible trigger that spawns Ambushers
//   ├── Mob          – base enemy with HP, AI states, pathfinding
//   │   ├── Hunter       – vengeful spirit, wanders then chases
//   │   ├── Ambusher     – spawned by Ambush, weaker Hunter
//   │   ├── Boss         – "The Curse", final boss
//   │   ├── Spawn        – wisp spawned by Boss
//   │   └── Wanderer     – lost spirit, aggro-spread on death
//   ├── Clue         – collectible text clue (Tracery grammar)
//   └── Hero         – the player character
//
// Identifier key (minified → full name):
//   game      – the main Game instance managing the dungeon
//   pos       – grid position (an object with .i column and .j row)
//   room      – the Room object the character currently occupies
//   fov       – field of view cache (array of visible cells)
//   sprite    – CharacterSprite visual representation on screen
//   hp        – hit points (health)
//   state     – AI state machine (StateIdle / StateWandering / StateChasing)
//   deck      – ActionDeck holding the hero's attack cards
//   card      – the currently drawn ActionCard
//   queue     – the game's turn queue (array of living characters)
//   pf        – pathfinder instance (game.pf)
//   cells     – array of all walkable cells on the map
//   explored  – array of cells the hero has revealed
//   isReady   – whether the character is idle and awaiting its next turn
//   aggroed   – whether a Wanderer has been damaged / provoked
//   discovered – whether a Clue has been revealed to the player
// ═══════════════════════════════════════════════════════════════════

// ─── Character (com.watabou.sevendrl.characters.Character) ───
/**
 * Abstract base class for every entity that lives on the dungeon grid.
 *
 * **Role in the game:** Provides shared infrastructure for positioning,
 * visibility (FOV), turn ordering, damage, death, and sprite management.
 * Every Mob, Hero, Clue, and Ambush inherits from this class.
 *
 * **Key properties:**
 * @property {Game}  game  - Reference to the main game instance
 * @property {Object} pos  - Grid position with .i (column) and .j (row)
 * @property {Room}  room  - The Room this character currently occupies (auto-updated on move)
 * @property {Array}  fov   - Cached field-of-view cells (invalidated when room changes)
 * @property {CharacterSprite} sprite - Visual representation on screen
 * @property {boolean} isReady - True when the character has finished its turn
 *
 * **Related classes:**
 * - Uses `com.watabou.sevendrl.plan.Room` for room/FOV queries
 * - Uses `com.watabou.sevendrl.visuals.CharacterSprite` for rendering
 * - `Hero` and `Mob` are the main concrete subclasses
 * - `Ambush` and `Clue` are special non-blocking characters
 */
var com_watabou_sevendrl_characters_Character = function(game,pos) {
	this.game = game;
	this.createSprite();
	if(pos != null) {
		this.setPos(pos);
	}
	this.isReady = true;
};
$hxClasses["com.watabou.sevendrl.characters.Character"] = com_watabou_sevendrl_characters_Character;
com_watabou_sevendrl_characters_Character.__name__ = "com.watabou.sevendrl.characters.Character";
com_watabou_sevendrl_characters_Character.prototype = {
	/** Returns the fully-qualified Haxe class name as a string. */
	toString: function() {
		var c = js_Boot.getClass(this);
		return c.__name__;
	}
	/** Returns a short description shown in the UI (overridden by subclasses). */
	,getInfo: function() {
		return "Character";
	}
// ╔══ EXTENSION POINT: Custom Visuals ────────────────────────────
// ║ What: Override createSprite() to provide custom character visuals
// ║ How:  Return a new CharacterSprite(this, "char", hidden) with your glyph and colour
// ║ See:  CharacterSprite class — glyph, color, hidden parameters
// ╚═════════════════════════════════════════════════════════════════
	/** Creates the visual sprite.  Must be overridden — throws if called on the abstract base. */
	,createSprite: function() {
		throw haxe_Exception.thrown("Abstract");
	}
	/**
	 * Moves this character to a new grid position.
	 * Automatically updates the current room reference and invalidates the FOV cache
	 * when the character crosses a room boundary.
	 *
	 * On first placement (prevPos is null) the sprite is snapped to the grid and
	 * non-hero characters start hidden until the hero can see them.
	 *
	 * @param {Object} pos - New grid position {i, j}
	 */
	,setPos: function(pos) {
		var prevPos = this.pos;
		this.pos = pos;
		var newRoom = this.game.plan.getRoom(pos);
		if(newRoom != this.room) {
			this.room = newRoom;
			this.fov = null; // invalidate FOV when changing rooms
		}
		if(prevPos == null) {
			// Initial placement — snap sprite to grid coordinates
			var _this = this.sprite;
			_this.setPos(_this.character.pos.i,_this.character.pos.j);
			// Non-hero characters start invisible until hero sees them
			if(!((this) instanceof com_watabou_sevendrl_characters_Hero)) {
				this.sprite.set_visible(this.game.hero.sees(pos));
			}
		}
	}
	/**
	 * Returns the cached field-of-view for this character.
	 * FOV = all cells in the character's current room PLUS door cells
	 * that connect to adjacent rooms (so characters can see through doorways).
	 * The cache is invalidated whenever the character changes rooms.
	 *
	 * @returns {Array} Array of grid cells visible to this character
	 */
	,getFOV: function() {
		if(this.fov == null) {
			// Start with all cells in the current room
			this.fov = this.room.area.slice();
			// Add door-edge cells from adjacent rooms (line of sight through doorways)
			var door = this.room.doors.iterator();
			while(door.hasNext()) {
				var door1 = door.next();
				// Find the room on the other side of the door
				var room = this.room;
				var room1 = room == door1.room1 ? door1.room2 : room == door1.room2 ? door1.room1 : null;
				// Add the door's edge cell from the adjacent room's perspective
				com_watabou_utils_ArrayExtender.add(this.fov,door1.plan.grid.edge2cell(room1 == door1.room1 ? door1.edge1 : room1 == door1.room2 ? door1.edge2 : null));
			}
		}
		return this.fov;
	}
	/**
	 * Checks whether a given cell is within this character's field of view.
	 * @param {Object} cell - Grid position to test
	 * @returns {boolean} True if the cell is visible
	 */
	,sees: function(cell) {
		return this.getFOV().indexOf(cell) != -1;
	}
	/**
	 * Called when visibility changes for this character (hero enters/leaves its room).
	 * Fades the sprite in or out accordingly.
	 *
	 * @param {boolean} before - Was the character visible before this update?
	 * @param {boolean} after  - Is the character visible after this update?
	 */
	,updateVisibility: function(before,after) {
		if(after != before) {
			if(after) {
				this.sprite.fadeIn();
			} else {
				this.sprite.fadeOut();
			}
		}
	}
	/**
	 * Returns true if this character blocks movement for the given character.
	 * By default every character blocks everyone except itself.
	 *
	 * @param {Character} ch - The character attempting to move
	 * @returns {boolean}
	 */
	,blocks: function(ch) {
		return ch != this;
	}
// ╔══ EXTENSION POINT: Custom Turn Behavior ──────────────────────
// ║ What: Override act() to define what this character does each turn
// ║ How:  Return false to continue acting, true to yield the turn
// ║ See:  State classes (StateIdle, StateWandering, StateChasing) for AI examples
// ╚═════════════════════════════════════════════════════════════════
	/**
	 * Executes this character's turn.  Returns false to continue the turn,
	 * or true to yield the turn back to the queue.
	 * Base implementation returns false (no-op turn).
	 */
	,act: function() {
		return false;
	}
// ╔══ EXTENSION POINT: Custom Damage Logic ───────────────────────
// ║ What: Hook for shields, resistance, damage reduction, or reflective damage
// ║ How:  Call super.damage(processedValue) after applying modifiers
// ║ See:  Mob.damage() and Hero.damage() for concrete examples
// ╚═════════════════════════════════════════════════════════════════
	/**
	 * Applies damage to this character.  Base implementation does nothing;
	 * overridden by Mob and Hero to subtract HP and potentially die.
	 *
	 * @param {number} [value=1] - Amount of damage
	 */
	,damage: function(value) {
		if(value == null) {
			value = 1;
		}
	}
// ╔══ EXTENSION POINT: Death Effects ─────────────────────────────
// ║ What: Hook for death effects, loot drops, permadeath saves, or death events
// ║ How:  Call super.die() for default animation, then add your logic
// ║ See:  Boss.die() (victory), Wanderer.die() (aggro spread), Hero.die() (game-over)
// ╚═════════════════════════════════════════════════════════════════
	/**
	 * Plays the death animation, then removes this character from the game.
	 * Overridden by Mob (logs a banish message) and Boss (triggers victory).
	 */
	,die: function() {
		this.sprite.die();
		this.game.remove(this);
	}
	/**
	 * Returns whether this character is still in the game's turn queue.
	 * @returns {boolean}
	 */
	,isAlive: function() {
		return this.game.queue.indexOf(this) != -1;
	}
	,__class__: com_watabou_sevendrl_characters_Character
};

// ─── Ambush (com.watabou.sevendrl.characters.Ambush) ───
/**
 * Invisible trigger placed on room tiles that spawns Ambusher mobs
 * when the hero steps onto the same cell.
 *
 * **Role in the game:** Ambush is a trap-like entity.  It is not visible
 * to the player and does not block movement.  When the hero enters the
 * Ambush's cell, the `ambush()` method fires: the Ambush removes itself
 * and spawns 1–N "disturbed spirit" (Ambusher) mobs that immediately
 * chase the hero.  The number of ambushers scales with room size
 * (√area, rounded).
 *
 * **Key properties:**
 * - Inherits all Character properties
 * - No HP — it is a one-shot trigger, not a living entity
 * - `room` determines which room's contour edges are used as spawn points
 *
 * **Related classes:**
 * - Extends `com.watabou.sevendrl.characters.Character`
 * - Spawns `com.watabou.sevendrl.characters.Ambusher` instances
 * - Reads `room.contour` for wall edges (spawn-from-offscreen positions)
 *
 * **Visual:** Displays as a space character `" "` in dark magenta (0x222223),
 * effectively invisible during normal play.
 */
var com_watabou_sevendrl_characters_Ambush = function(game,pos) {
	com_watabou_sevendrl_characters_Character.call(this,game,pos);
};
$hxClasses["com.watabou.sevendrl.characters.Ambush"] = com_watabou_sevendrl_characters_Ambush;
com_watabou_sevendrl_characters_Ambush.__name__ = "com.watabou.sevendrl.characters.Ambush";
com_watabou_sevendrl_characters_Ambush.__super__ = com_watabou_sevendrl_characters_Character;
com_watabou_sevendrl_characters_Ambush.prototype = $extend(com_watabou_sevendrl_characters_Character.prototype,{
	/** Creates a near-invisible sprite: a space character in very dark magenta. */
	createSprite: function() {
		this.sprite = new com_watabou_sevendrl_visuals_CharacterSprite(this," ",true);
		this.sprite.tf.set_textColor(2236979);
	}
	/** Ambush does not block movement — the hero must walk onto it to trigger it. */
	,blocks: function(ch) {
		return false;
	}
	/** Returns empty info — Ambush is invisible to the player. */
	,getInfo: function() {
		return "";
	}
	/**
	 * Turn logic: checks if the hero is on the same cell.
	 * If so, triggers the ambush and returns true (turn consumed).
	 * Otherwise returns false (no-op).
	 */
	,act: function() {
		if(this.pos == this.game.hero.pos) {
			this.ambush();
			return true;
		} else {
			return false;
		}
	}
	/**
	 * Core ambush logic:
	 * 1. Removes itself from the game and the screen.
	 * 2. Scans the room's contour edges to find valid spawn cells
	 *    (cells adjacent to the room that are not occupied by the hero or a Mob).
	 * 3. For each valid cell, records a "from" cell (outside the room) that the
	 *    Ambusher will animate from — this creates the effect of spirits
	 *    materializing through the walls.
	 * 4. Calculates number of ambushers = floor(√area) + probabilistic +1.
	 * 5. Randomly selects that many spawn cells and creates Ambusher instances.
	 * 6. Tweens the Ambusher sprites from transparent to opaque over 0.2s.
	 * 7. On completion, resumes the game turn.
	 */
	,ambush: function() {
		var _gthis = this;
		this.isReady = false;
		this.game.remove(this);
		this.sprite.remove();
		var grid = this.game.plan.grid;
		var from = new haxe_ds_ObjectMap();
		// Scan room contour edges to find spawn-from positions
		var _g = 0;
		var _g1 = this.room.contour;
		while(_g < _g1.length) {
			var edge = _g1[_g];
			++_g;
			// Twin edge = the edge on the opposite side of this wall segment
			var twin = grid.edges.h[edge.b.__id__].h[edge.a.__id__];
			var cell = grid.edge2cell(edge);
			// Only consider cells not occupied by the hero or existing mobs
			if(cell != this.game.hero.pos && this.game.getChar(cell,com_watabou_sevendrl_characters_Mob) == null) {
				// If cell already mapped, 50% chance to overwrite (randomizes spawn origins)
				if(from.h.__keys__[cell.__id__] == null || (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 < 0.5) {
					var fr = grid.edge2cell(twin);
					if(fr != null) {
						from.set(cell,fr);
					}
				}
			}
		}
		// Number of ambushers scales with room area: floor(sqrt(area)) + probabilistic bonus
		var f = Math.sqrt(this.room.area.length);
		var chance = f - (f | 0); // fractional part determines probability of +1
		if(chance == null) {
			chance = 0.5;
		}
		var nAmbushers = (f | 0) + ((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 < chance ? 1 : 0);
		// Randomly select nAmbushers cells from available spawn positions
		var cells = com_watabou_utils_ArrayExtender.subset(com_watabou_utils_ArrayExtender.keys2array(from),nAmbushers);
		// Create each Ambusher, set it chasing the hero, animate it appearing
		var _g = [];
		var _g1 = 0;
		while(_g1 < cells.length) {
			var to = cells[_g1];
			++_g1;
// ╔══ EXTENSION POINT: Ambush Mob Type ───────────────────────────
// ║ What: Swap the mob type spawned by an ambush trigger
// ║ How:  Replace `new Ambusher(...)` with your custom mob class constructor
// ║ See:  Hunter, Ambusher, Boss, Spawn, Wanderer for mob type examples
// ╚═════════════════════════════════════════════════════════════════
			var ambusher = new com_watabou_sevendrl_characters_Ambusher(this.game,to);
			ambusher.chase(this.game.hero);
			ambusher.sprite.move(from.h[to.__id__],to);
			this.game.addChar(ambusher);
			_g.push(ambusher);
		}
		var ambushers = _g;
		// Fade in all ambushers over 0.2 seconds using smoothstep easing
		com_watabou_processes_Tweener.run(0.2,function(e) {
			e = e * e * (3 - 2 * e); // smoothstep interpolation
			var _g = 0;
			while(_g < ambushers.length) {
				var a = ambushers[_g];
				++_g;
				a.sprite.set_alpha(e);
			}
		}).onComplete(function() {
			_gthis.game.finish(_gthis,true);
		});
	}
	,__class__: com_watabou_sevendrl_characters_Ambush
});

// ─── Mob (com.watabou.sevendrl.characters.Mob) ───
/**
 * Base class for all enemy entities in the game.
 *
 * **Role in the game:** Provides HP tracking, a state machine for AI
 * behaviour (idle / wandering / chasing), pathfinding toward targets,
 * damage/death handling, and sprite visibility updates.
 *
 * **Key properties:**
 * @property {number} hp    - Hit points (default 1, overridden by subclasses)
 * @property {State}  state - Current AI state object (has .act() method)
 *
 * **State machine:**
 * - `StateIdle`    – does nothing
 * - `StateWandering` – picks a random cell and pathfinds toward it
 * - `StateChasing` – follows a target character, attacks when adjacent
 *
 * **Related classes:**
 * - Extends `com.watabou.sevendrl.characters.Character`
 * - Subclassed by `Hunter`, `Ambusher`, `Boss`, `Spawn`, `Wanderer`
 * - Uses `com.watabou.sevendrl.characters.State*` for AI logic
 * - Uses `game.pf` (pathfinder) for navigation
 */
// ╔══ EXTENSION POINT: Custom Mob HP ─────────────────────────────
// ║ What: Set custom base HP for this mob type (default 1)
// ║ How:  Change `this.hp = 1` to desired value before super call
// ║ See:  Hunter (5), Ambusher (3), Boss (6), Spawn (1), Wanderer (3)
// ╚═════════════════════════════════════════════════════════════════
var com_watabou_sevendrl_characters_Mob = function(game,pos) {
	this.hp = 1;
	com_watabou_sevendrl_characters_Character.call(this,game,pos);
};
$hxClasses["com.watabou.sevendrl.characters.Mob"] = com_watabou_sevendrl_characters_Mob;
com_watabou_sevendrl_characters_Mob.__name__ = "com.watabou.sevendrl.characters.Mob";
com_watabou_sevendrl_characters_Mob.__super__ = com_watabou_sevendrl_characters_Character;
com_watabou_sevendrl_characters_Mob.prototype = $extend(com_watabou_sevendrl_characters_Character.prototype,{
	/** Delegates the turn to the current AI state. */
	act: function() {
		return this.state.act();
	}
	/** Sets the mob to idle state (does nothing on its turn). */
	,idle: function() {
		this.state = new com_watabou_sevendrl_characters_StateIdle(this);
	}
	/** Sets the mob to wandering state (picks random destinations). */
	,wander: function() {
		this.state = new com_watabou_sevendrl_characters_StateWandering(this);
	}
	/** Sets the mob to chasing state, pursuing the given character. */
	,chase: function(ch) {
		this.state = new com_watabou_sevendrl_characters_StateChasing(this,ch);
	}
	/** Returns an info string for the UI. */
	,getInfo: function() {
		return "This is a " + this.getName() + ".";
	}
	/** Returns the display name of this mob type (overridden by subclasses). */
	,getName: function() {
		return "mob";
	}
// ╔══ EXTENSION POINT: Pathfinding Integration ───────────────────
// ║ What: Integrate custom pathfinding, movement costs, or terrain effects
// ║ How:  Modify the `available` cells list or intercept path before movement
// ║ See:  Hero.getCloser() for fog-of-war pathfinding variant
// ╚═════════════════════════════════════════════════════════════════
	/**
	 * Pathfinds toward a target cell, moving one step closer per call.
	 *
	 * Algorithm:
	 * 1. Build an "available" list from all walkable cells.
	 * 2. Remove cells occupied by characters that block this mob.
	 * 3. If `approach` is true, add the target cell itself (allows moving
	 *    onto the target's tile, needed for adjacent combat).
	 * 4. Use the pathfinder to get a path; take the first step.
	 * 5. Animate the move if either the previous or new position is visible
	 *    to the hero; otherwise snap the sprite instantly (fog-of-war).
	 *
	 * @param {Object} to       - Destination grid cell
	 * @param {boolean} [approach=false] - If true, allow stepping onto the target cell
	 * @returns {boolean} True if a move was made, false if no path exists
	 */
	,getCloser: function(to,approach) {
		if(approach == null) {
			approach = false;
		}
		var _gthis = this;
		var available = this.game.cells.slice();
		// Remove cells blocked by other characters
		var _g = 0;
		var _g1 = this.game.queue;
		while(_g < _g1.length) {
			var ch = _g1[_g];
			++_g;
			if(ch.blocks(this)) {
				HxOverrides.remove(available,ch.pos);
			}
		}
		// If approaching, allow the target cell as a valid destination
		if(approach) {
			com_watabou_utils_ArrayExtender.add(available,to);
		}
		var path = this.game.pf.getPath(this.pos,to,available);
		if(path != null && path.length > 0) {
			var prevPos = this.pos;
			this.setPos(path.shift());
			// Check visibility before and after the move
			var before = this.game.hero.sees(prevPos);
			var after = this.game.hero.sees(this.pos);
			this.updateVisibility(before,after);
			if(before || after) {
				// Animate the move if visible to the hero
				this.isReady = false;
				this.sprite.move(prevPos,this.pos).onComplete(function() {
					_gthis.game.finish(_gthis,false);
				});
			} else {
				// Not visible — snap sprite instantly (fog-of-war shortcut)
				var _this = this.sprite;
				_this.setPos(_this.character.pos.i,_this.character.pos.j);
			}
			return true;
		} else {
			return false;
		}
	}
	/**
	 * Applies damage to this mob.  Reduces HP and triggers death if HP <= 0.
	 * @param {number} [value=1] - Damage amount
	 */
	,damage: function(value) {
		if(value == null) {
			value = 1;
		}
		this.hp -= value;
		if(this.hp <= 0) {
			this.die();
		}
	}
	/**
	 * Death handler: plays death animation, removes from game, and logs
	 * a banish message to the message log.
	 */
	,die: function() {
		com_watabou_sevendrl_characters_Character.prototype.die.call(this);
		var tmp = "The " + this.getName() + " is banished.";
		com_watabou_sevendrl_SevenDRL.out(tmp);
	}
	,__class__: com_watabou_sevendrl_characters_Mob
});

// ─── Hunter (com.watabou.sevendrl.characters.Hunter) ───
/**
 * A vengeful spirit enemy that wanders the dungeon and chases the hero
 * when it gains line of sight.
 *
 * **Role in the game:** The Hunter is the "standard" aggressive mob.
 * It starts in the wandering state, moving to random cells.  When it
 * spots the hero, it switches to chasing and pursues relentlessly.
 * It has 5 HP, making it a mid-tier threat.
 *
 * **Key properties:**
 * @property {number} hp - 5 hit points
 *
 * **Behaviour:**
 * - On each turn, if it sees the hero and is not already chasing,
 *   it switches to StateChasing.  The chase state returns false to
 *   re-evaluate immediately (so it moves toward the hero the same turn).
 * - Otherwise delegates to its current state (wander / chase).
 *
 * **Related classes:**
 * - Extends `com.watabou.sevendrl.characters.Mob`
 * - `Ambusher` and `Spawn` extend Hunter (sharing its sight-chase logic)
 *
 * **Visual:** `$` character in purple (0xCD34CD).
 */
var com_watabou_sevendrl_characters_Hunter = function(game,pos) {
// ╔══ EXTENSION POINT: Hunter Customization ──────────────────────
// ║ What: Customize Hunter stats (HP, name, sprite) and initial AI state
// ║ How:  Change hp, call a different state setter, or override act() in a subclass
// ║ See:  Ambusher (3 hp), Spawn (1 hp) for stat overrides
// ╚═════════════════════════════════════════════════════════════════
	com_watabou_sevendrl_characters_Mob.call(this,game,pos);
	this.hp = 5;
	this.wander();
};
$hxClasses["com.watabou.sevendrl.characters.Hunter"] = com_watabou_sevendrl_characters_Hunter;
com_watabou_sevendrl_characters_Hunter.__name__ = "com.watabou.sevendrl.characters.Hunter";
com_watabou_sevendrl_characters_Hunter.__super__ = com_watabou_sevendrl_characters_Mob;
com_watabou_sevendrl_characters_Hunter.prototype = $extend(com_watabou_sevendrl_characters_Mob.prototype,{
	/** Creates the sprite: `$` in purple. */
	createSprite: function() {
		this.sprite = new com_watabou_sevendrl_visuals_CharacterSprite(this,"$",false);
		this.sprite.tf.set_textColor(13434845);
	}
	/** Display name for the message log. */
	,getName: function() {
		return "vengeful spirit";
	}
	/**
	 * Override: before acting, check if the hero is visible.
	 * If so and not already chasing, switch to chase mode (returns false
	 * to re-evaluate on the next act cycle immediately).
	 */
	,act: function() {
		if(this.sees(this.game.hero.pos) && !((this.state) instanceof com_watabou_sevendrl_characters_StateChasing)) {
			this.chase(this.game.hero);
			return false;
		} else {
			return this.state.act();
		}
	}
	,__class__: com_watabou_sevendrl_characters_Hunter
});

// ─── Ambusher (com.watabou.sevendrl.characters.Ambusher) ───
/**
 * A weaker spirit spawned by an Ambush trigger when the hero enters a room.
 *
 * **Role in the game:** Ambushers are created in groups by the Ambush class.
 * They have only 3 HP (vs Hunter's 5) and are given a direct chase command
 * on the hero the moment they spawn.  They behave identically to Hunters
 * once active (sight → chase).
 *
 * **Key properties:**
 * @property {number} hp - 3 hit points (weaker than Hunter)
 *
 * **Related classes:**
 * - Extends `com.watabou.sevendrl.characters.Hunter`
 * - Created by `com.watabou.sevendrl.characters.Ambush.ambush()`
 *
 * **Visual:** `£` character in orange (0xCD0000→light).
 */
var com_watabou_sevendrl_characters_Ambusher = function(game,pos) {
	com_watabou_sevendrl_characters_Hunter.call(this,game,pos);
	this.hp = 3;
};
$hxClasses["com.watabou.sevendrl.characters.Ambusher"] = com_watabou_sevendrl_characters_Ambusher;
com_watabou_sevendrl_characters_Ambusher.__name__ = "com.watabou.sevendrl.characters.Ambusher";
com_watabou_sevendrl_characters_Ambusher.__super__ = com_watabou_sevendrl_characters_Hunter;
com_watabou_sevendrl_characters_Ambusher.prototype = $extend(com_watabou_sevendrl_characters_Hunter.prototype,{
	/** Creates the sprite: `£` in light orange. */
	createSprite: function() {
		this.sprite = new com_watabou_sevendrl_visuals_CharacterSprite(this,"£",false);
		this.sprite.tf.set_textColor(13430527);
	}
	/** Display name for the message log. */
	,getName: function() {
		return "disturbed spirit";
	}
	,__class__: com_watabou_sevendrl_characters_Ambusher
});

// ─── Boss (com.watabou.sevendrl.characters.Boss) ───
/**
 * The final boss of the game — "The Curse".
 *
 * **Role in the game:** The Curse is the ultimate enemy.  It always
 * chases the hero on sight and can spawn wisps (Spawn) on adjacent
 * empty cells with a 50% chance each turn.  Banishing the Curse
 * (reducing its HP to 0) wins the game.
 *
 * **Key properties:**
 * @property {number} hp - 6 hit points (highest of any mob)
 *
 * **Behaviour (act):**
 * 1. If the hero is visible and not already chasing → switch to chase.
 * 2. If already chasing → 50% chance to spawn a wisp instead of moving.
 * 3. If hero not visible → delegate to current state (chase last known pos).
 *
 * **spawn() logic:** Looks at the pathfinder graph for adjacent cells
 * to the Boss's current position, picks an unoccupied one, and creates
 * a Spawn (wisp) there.
 *
 * **Related classes:**
 * - Extends `com.watabou.sevendrl.characters.Mob`
 * - Spawns `com.watabou.sevendrl.characters.Spawn` (wisps)
 * - On death: plays victory sound and fires `game.over` signal
 *
 * **Visual:** `©` character in orange (0xCD0000→light).
 */
var com_watabou_sevendrl_characters_Boss = function(game,pos) {
	com_watabou_sevendrl_characters_Mob.call(this,game,pos);
	this.hp = 6;
	this.chase(game.hero);
};
$hxClasses["com.watabou.sevendrl.characters.Boss"] = com_watabou_sevendrl_characters_Boss;
com_watabou_sevendrl_characters_Boss.__name__ = "com.watabou.sevendrl.characters.Boss";
com_watabou_sevendrl_characters_Boss.__super__ = com_watabou_sevendrl_characters_Mob;
com_watabou_sevendrl_characters_Boss.prototype = $extend(com_watabou_sevendrl_characters_Mob.prototype,{
	/** Creates the sprite: `©` in orange. */
	createSprite: function() {
		this.sprite = new com_watabou_sevendrl_visuals_CharacterSprite(this,"©",false);
		this.sprite.tf.set_textColor(13430527);
	}
	/** Info text shown when the player examines the Curse. */
	,getInfo: function() {
		return "This is the Curse. Banish it to win the game.";
	}
	/** Display name for the message log. */
	,getName: function() {
		return "Curse";
	}
	/**
	 * Boss turn logic:
	 * - If hero is visible and not chasing → switch to chase (returns false to re-evaluate).
	 * - If already chasing → 50% chance to spawn a wisp instead of moving.
	 * - Otherwise → delegate to current state.
	 */
	,act: function() {
		if(this.sees(this.game.hero.pos)) {
			if(!((this.state) instanceof com_watabou_sevendrl_characters_StateChasing)) {
				this.chase(this.game.hero);
				return false;
// ╔══ EXTENSION POINT: Boss Special Abilities ────────────────────
// ║ What: Hook for boss-specific abilities (summons, spells, phase transitions)
// ║ How:  Replace or wrap this.spawn() with custom ability logic
// ║ See:  Spawn class for wisp creation, Boss.spawn() for adjacency logic
// ╚═════════════════════════════════════════════════════════════════
			} else if((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 < 0.5) {
				this.spawn();
				return false;
			} else {
				return this.state.act();
			}
		} else {
			return this.state.act();
		}
	}
	/**
	 * Spawns a wisp (Spawn) on a random adjacent empty cell.
	 * Uses the pathfinder graph to find neighbours of the Boss's current position,
	 * filters out occupied cells, then picks one at random.
	 */
	,spawn: function() {
		var _gthis = this;
		// Find adjacent cells via pathfinder graph
		var _g = [];
		var _g1 = 0;
		var _g2 = this.game.pf.graph.h[this.pos.__id__];
		while(_g1 < _g2.length) {
			var v = _g2[_g1];
			++_g1;
			// Only include cells that don't already have a character
			if(_gthis.game.getChar(v) == null) {
				_g.push(v);
			}
		}
		var cells = _g;
		if(cells.length > 0) {
			var pos = com_watabou_utils_ArrayExtender.random(cells);
			var wisp = new com_watabou_sevendrl_characters_Spawn(this.game,pos);
			this.game.addChar(wisp);
			wisp.sprite.move(this.pos,pos);
		}
	}
	/**
	 * Death handler: plays standard death, then triggers the victory sound
	 * and dispatches the game-over signal (player wins).
	 */
	,die: function() {
		com_watabou_sevendrl_characters_Mob.prototype.die.call(this);
// ╔══ EXTENSION POINT: Victory Hook ──────────────────────────────
// ║ What: Hook for victory logic — loot drops, level transitions, cutscenes
// ║ How:  Add code before game.over.dispatch() or replace the dispatch call
// ║ See:  Hero.die() for the defeat counterpart
// ╚═════════════════════════════════════════════════════════════════
		com_watabou_sevendrl_Sounds.event("victory");
		this.game.over.dispatch();
	}
	,__class__: com_watabou_sevendrl_characters_Boss
});

// ─── Spawn (com.watabou.sevendrl.characters.Spawn) ───
/**
 * A wisp spawned by the Boss ("The Curse") during combat.
 *
 * **Role in the game:** Wisps are fragile (1 HP) but persistent enemies
 * created by the Boss's `spawn()` method.  They inherit Hunter behaviour:
 * they wander when not chasing, and chase the hero on sight.  They serve
 * to crowd the battlefield and pressure the player during the boss fight.
 *
 * **Key properties:**
 * @property {number} hp - 1 hit point (dies in a single hit)
 *
 * **Related classes:**
 * - Extends `com.watabou.sevendrl.characters.Hunter`
 * - Created by `com.watabou.sevendrl.characters.Boss.spawn()`
 *
 * **Visual:** `¢` character in orange (0xCD0000→light).
 */
var com_watabou_sevendrl_characters_Spawn = function(game,pos) {
	com_watabou_sevendrl_characters_Hunter.call(this,game,pos);
	this.hp = 1;
};
$hxClasses["com.watabou.sevendrl.characters.Spawn"] = com_watabou_sevendrl_characters_Spawn;
com_watabou_sevendrl_characters_Spawn.__name__ = "com.watabou.sevendrl.characters.Spawn";
com_watabou_sevendrl_characters_Spawn.__super__ = com_watabou_sevendrl_characters_Hunter;
com_watabou_sevendrl_characters_Spawn.prototype = $extend(com_watabou_sevendrl_characters_Hunter.prototype,{
	/** Creates the sprite: `¢` in orange. */
	createSprite: function() {
		this.sprite = new com_watabou_sevendrl_visuals_CharacterSprite(this,"¢",false);
		this.sprite.tf.set_textColor(13430527);
	}
	/** Display name for the message log. */
	,getName: function() {
		return "wisp of the Curse";
	}
	,__class__: com_watabou_sevendrl_characters_Spawn
});

// ─── Clue (com.watabou.sevendrl.characters.Clue) ───
/**
 * A collectible text clue scattered throughout the dungeon.
 *
 * **Role in the game:** Clues are the game's objective items.  The player
 * must find and collect clues to "solve the mystery."  Each Clue generates
 * a random flavour-text string using a Tracery grammar (loaded from
 * "clues" asset).  Clues are placed on the grid like characters but do
 * not block movement and have no HP.
 *
 * **Key properties:**
 * @property {string}  text       - The generated clue text (Tracery output)
 * @property {boolean} discovered - Whether the hero has seen this clue at least once
 *
 * **Grammar system:**
 * - Static `grammar` property holds the shared Tracery `Grammar` instance
 * - `Clue.reset()` initializes or clears the grammar state between runs
 * - Uses `DeckRuleSelector` for card-deck-like non-repeating selection
 * - `ModsEngBasic` provides English text modifiers
 *
 * **Related classes:**
 * - Extends `com.watabou.sevendrl.characters.Character`
 * - Collected via `com.watabou.sevendrl.characters.ActionCollect`
 * - Uses `com.watabou.tracery.Grammar` for text generation
 *
 * **Visual:** `?` character in dark green (0x66660A), scaled to 70% size.
 */
var com_watabou_sevendrl_characters_Clue = function(game,pos) {
	this.discovered = false;
	com_watabou_sevendrl_characters_Character.call(this,game,pos);
	// Generate random clue text from the Tracery grammar
// ╔══ EXTENSION POINT: Root Clue Symbol ──────────────────────────
// ║ What: Swap the Tracery root symbol used to generate clue text
// ║ How:  Replace "#clue#" with your own grammar root symbol (e.g. "#rumor#")
// ║ See:  Tracery grammar keys — define your root symbol in the clues JSON
// ╚═════════════════════════════════════════════════════════════════
	this.text = com_watabou_sevendrl_characters_Clue.grammar.flatten("#clue#");
};
$hxClasses["com.watabou.sevendrl.characters.Clue"] = com_watabou_sevendrl_characters_Clue;
com_watabou_sevendrl_characters_Clue.__name__ = "com.watabou.sevendrl.characters.Clue";
/**
 * Static initializer: loads or resets the Tracery grammar for clue text generation.
 * Called once at game start to parse "clues" JSON, or between runs to clear state.
 */
com_watabou_sevendrl_characters_Clue.reset = function() {
	if(com_watabou_sevendrl_characters_Clue.grammar == null) {
		// First-time init: wire Tracery RNG to game's RNG, load clues JSON,
		// set deck-rule selector (no repeats until deck exhausted), add English mods
		com_watabou_tracery_Tracery.rng = com_watabou_utils_Random.float;
// ╔══ EXTENSION POINT: Clue Grammar Source ───────────────────────
// ║ What: Swap the JSON file that defines the clue text grammar
// ║ How:  Replace openfl_utils_Assets.getText("clues") with your own JSON path
// ║ See:  Tracery grammar format — keys become symbols, values are expansion rules
// ╚═════════════════════════════════════════════════════════════════
		com_watabou_sevendrl_characters_Clue.grammar = new com_watabou_tracery_Grammar(JSON.parse(openfl_utils_Assets.getText("clues")));
// ╔══ EXTENSION POINT: Rule Selection Strategy ───────────────────
// ║ What: Swap the clue text selection algorithm (non-repeating, weighted, etc.)
// ║ How:  Replace com_watabou_tracery_DeckRuleSelector with a custom selector
// ║ See:  Tracery defaultSelector — must implement pick(array) → element
// ╚═════════════════════════════════════════════════════════════════
		com_watabou_sevendrl_characters_Clue.grammar.defaultSelector = com_watabou_tracery_DeckRuleSelector;
		com_watabou_sevendrl_characters_Clue.grammar.addModifiers(com_watabou_tracery_ModsEngBasic.get());
	} else {
		// Subsequent runs: clear grammar state (reset deck counters etc.)
		com_watabou_sevendrl_characters_Clue.grammar.clearState();
	}
};
com_watabou_sevendrl_characters_Clue.__super__ = com_watabou_sevendrl_characters_Character;
com_watabou_sevendrl_characters_Clue.prototype = $extend(com_watabou_sevendrl_characters_Character.prototype,{
	/** Creates the sprite: `?` in dark green, scaled to 70%. */
	createSprite: function() {
		this.sprite = new com_watabou_sevendrl_visuals_CharacterSprite(this,"?");
		this.sprite.tf.set_textColor(6710954);
		this.sprite.setScale(0.7);
	}
	/** Clues do not block movement — the hero walks onto them to collect. */
	,blocks: function(ch) {
		return false;
	}
	/** Info text shown when the player examines a clue. */
	,getInfo: function() {
		return "This is a clue. Collect it to solve the mystery.";
	}
	/**
	 * Called when the hero moves onto this clue's cell.
	 * Registers the clue with the game, plays the despawn animation,
	 * and triggers the musical jingle.
	 */
	,collect: function() {
		this.game.collectClue(this);
		this.sprite.despawn();
		this.playJingle();
	}
	/**
	 * Plays a 3-note musical jingle when a clue is collected.
	 * Each note is a random pitch from the "clue_note" sound bank.
	 * The timing between notes alternates between 0.25s and 0.5s
	 * (randomly chosen pattern) for variety.
	 */
	,playJingle: function() {
		var type = (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 < 0.5;
		com_watabou_sevendrl_Sounds.event("clue_note",1,Math.floor((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * 13));
		com_watabou_utils_Updater.wait(type ? 0.25 : 0.5,function() {
			com_watabou_sevendrl_Sounds.event("clue_note",1,Math.floor((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * 13));
			com_watabou_utils_Updater.wait(!type ? 0.25 : 0.5,function() {
				com_watabou_sevendrl_Sounds.event("clue_note",1,Math.floor((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * 13));
			});
		});
	}
	/**
	 * Override: Clue visibility is gated by the `discovered` flag.
	 * Once the hero sees a clue, it stays visible forever (no fade-out).
	 * Before first discovery, it follows normal visibility rules.
	 */
	,updateVisibility: function(before,after) {
		if(!this.discovered) {
			this.discovered = after;
			com_watabou_sevendrl_characters_Character.prototype.updateVisibility.call(this,before,after);
		}
	}
	,__class__: com_watabou_sevendrl_characters_Clue
});

// ─── Hero (com.watabou.sevendrl.characters.Hero) ───
/**
 * The player character — the entity controlled by the player.
 *
 * **Role in the game:** The Hero navigates the dungeon, fights enemies,
 * and collects clues.  It has a card-based combat system: three cards
 * (WEAK=1, NORMAL=2, STRONG=3 damage) are drawn from a deck each turn.
 * The player clicks a cell to target: move, attack, collect, or wait.
 *
 * **Key properties:**
 * @property {number} hp        - Hit points (starts at 6)
 * @property {ActionCard} card  - Currently drawn attack card
 * @property {ActionDeck} deck  - Deck of attack cards (reshuffles when exhausted)
 * @property {Action} action    - Current queued action (move / attack / collect / wait)
 * @property {boolean} paused   - True when waiting for player input (interruptible)
 * @property {Signal1} cardChanged - Fires when a new card is drawn
 * @property {Signal1} hpChanged   - Fires when HP changes (passes new HP value)
 * @property {Signal1} roomChanged - Fires when the Hero enters a new room
 *
 * **Card system:**
 * - Deck starts with [WEAK, NORMAL, STRONG]
 * - After each move or attack, the current card is discarded and a new one drawn
 * - When the deck is exhausted, discarded cards are reshuffled in
 *
 * **Target resolution (target method):**
 * - Same cell → ActionWait
 * - Not visible → ActionMove (explore into fog of war)
 * - Visible mob → ActionAttack
 * - Visible clue → ActionCollect
 * - Empty visible cell → ActionMove
 *
 * **Related classes:**
 * - Extends `com.watabou.sevendrl.characters.Character`
 * - Uses `com.watabou.sevendrl.ActionDeck` / `ActionCard` for combat
 * - Actions: `ActionMove`, `ActionAttack`, `ActionCollect`, `ActionWait`
 *
 * **Visual:** `@` character in bright yellow (0xFFD40C).
 */
var com_watabou_sevendrl_characters_Hero = function(game,pos) {
	this.cardChanged = new msignal_Signal1();
	this.hpChanged = new msignal_Signal1();
	this.roomChanged = new msignal_Signal1();
	this.armor = 0;
// ╔══ EXTENSION POINT: Custom Hero HP ────────────────────────────
// ║ What: Set custom starting HP for the hero (default 6)
// ║ How:  Change `this.hp = 6` to desired value or scale by difficulty
// ║ See:  Hero.hpChanged signal for UI updates on HP change
// ╚═════════════════════════════════════════════════════════════════
	this.hp = 6;
	com_watabou_sevendrl_characters_Character.call(this,game,pos);
// ╔══ EXTENSION POINT: Starting Card Deck ────────────────────────
// ║ What: Swap the hero's starting deck of attack cards
// ║ How:  Replace the ActionCard array with your own cards (add new card types if needed)
// ║ See:  ActionCard enum (WEAK=1, NORMAL=2, STRONG=3), ActionDeck for draw/discard
// ╚═════════════════════════════════════════════════════════════════
	// Initialize the card deck with WEAK (1 dmg), NORMAL (2 dmg), STRONG (3 dmg)
	this.deck = new com_watabou_sevendrl_ActionDeck([com_watabou_sevendrl_ActionCard.WEAK,com_watabou_sevendrl_ActionCard.NORMAL,com_watabou_sevendrl_ActionCard.STRONG]);
	this.pullCard();
};
$hxClasses["com.watabou.sevendrl.characters.Hero"] = com_watabou_sevendrl_characters_Hero;
com_watabou_sevendrl_characters_Hero.__name__ = "com.watabou.sevendrl.characters.Hero";
com_watabou_sevendrl_characters_Hero.__super__ = com_watabou_sevendrl_characters_Character;
com_watabou_sevendrl_characters_Hero.prototype = $extend(com_watabou_sevendrl_characters_Character.prototype,{
	/** Info text for the UI. */
	getInfo: function() {
		return "This is you.";
	}
	/** Creates the sprite: `@` in bright yellow. */
	,createSprite: function() {
		this.sprite = new com_watabou_sevendrl_visuals_CharacterSprite(this,"@",false);
		this.sprite.tf.set_textColor(16772812);
	}
	/**
	 * Draws the next card from the deck.
	 * Discards the current card first (if any), then draws a new one
	 * and notifies listeners via the cardChanged signal.
	 */
	,pullCard: function() {
		if(this.card != null) {
			this.deck.discard(this.card);
		}
		this.card = this.deck.get();
		this.cardChanged.dispatch(this.card);
	}
	/**
	 * Resolves a click/tap on a grid cell into an action.
	 *
	 * Decision tree:
	 * 1. Cell == hero's position → wait (ActionWait)
	 * 2. Cell not in hero's FOV → move toward it (ActionMove, explore fog)
	 * 3. Cell contains a Mob → attack it (ActionAttack)
	 * 4. Cell contains a Clue → collect it (ActionCollect)
	 * 5. Empty cell in FOV → move to it (ActionMove)
	 *
	 * After setting the action, resumes the game turn.
	 *
	 * @param {Object} cell - Target grid cell {i, j}
	 */
// ╔══ EXTENSION POINT: New Target Types ──────────────────────────
// ║ What: Add new target types — NPCs, items, doors, traps, interactables
// ║ How:  Insert new `else if` branches in this chain before the empty-cell fallback
// ║ See:  ActionAttack, ActionCollect, ActionMove for action creation patterns
// ╚═════════════════════════════════════════════════════════════════
	,target: function(cell) {
		var tmp;
		if(cell == this.pos) {
			// Clicking self = wait
			tmp = new com_watabou_sevendrl_characters_ActionWait(this);
		} else if(!this.sees(cell)) {
			// Clicking outside FOV = explore (move toward it)
			tmp = new com_watabou_sevendrl_characters_ActionMove(this,cell);
		} else {
			// In FOV — check for mob first, then clue, then empty
			var ch = this.game.getChar(cell,com_watabou_sevendrl_characters_Mob);
			if(ch != null) {
				tmp = new com_watabou_sevendrl_characters_ActionAttack(this,ch);
			} else {
				var clue = this.game.getChar(cell,com_watabou_sevendrl_characters_Clue);
				tmp = clue != null ? new com_watabou_sevendrl_characters_ActionCollect(this,clue) : new com_watabou_sevendrl_characters_ActionMove(this,cell);
			}
		}
		this.action = tmp;
		this.resume();
	}
	/**
	 * Hero's turn execution.
	 * Returns true (yield turn) if paused or no action is set,
	 * otherwise delegates to the action's proceed() method.
	 */
	,act: function() {
		if(this.paused || this.action == null) {
			return true;
		}
		return this.action.proceed();
	}
// ╔══ EXTENSION POINT: Hero Pathfinding ──────────────────────────
// ║ What: Hero-specific pathfinding using explored cells (fog of war)
// ║ How:  Modify available cells, add interruption logic, or custom movement costs
// ║ See:  Mob.getCloser() for basic pathfinding, Hero.roomChanged for boundary events
// ╚═════════════════════════════════════════════════════════════════
	/**
	 * Pathfinds toward a destination cell, moving one step per call.
	 *
	 * Enhanced version of Mob.getCloser with additional logic:
	 * - Uses `explored` cells instead of all `cells` (respects fog of war)
	 * - Tracks visibility of all mobs before and after the move
	 * - Interrupts the hero if a previously hidden mob becomes visible
	 * - Fires roomChanged signal when crossing room boundaries
	 * - Plays footstep sound with randomized pitch
	 * - Pulls a new card after completing the move
	 *
	 * @param {Object} to       - Destination grid cell
	 * @param {boolean} [approach=false] - If true, allow stepping onto the target cell
	 * @returns {boolean} True if a move was made
	 */
	,getCloser: function(to,approach) {
		if(approach == null) {
			approach = false;
		}
		var _gthis = this;
		// Build available cells from explored tiles only (fog of war)
		var available = this.game.explored.slice();
		// Remove cells occupied by characters that block movement (only if visible)
		var _g = 0;
		var _g1 = this.game.queue;
		while(_g < _g1.length) {
			var ch = _g1[_g];
			++_g;
			if(ch.blocks(this) && this.sees(ch.pos)) {
				HxOverrides.remove(available,ch.pos);
			}
		}
		if(approach) {
			com_watabou_utils_ArrayExtender.add(available,to);
		}
		var path = this.game.pf.getPath(this.pos,to,available);
		if(path != null && path.length > 0) {
			var newPos = path.shift();
			var curPos = this.pos;
			var curRoom = this.room;
			// Snapshot: which mobs are currently visible to the hero?
			var _g = new haxe_ds_ObjectMap();
			var _g1 = 0;
			var _g2 = this.game.queue;
			while(_g1 < _g2.length) {
				var mob = _g2[_g1];
				++_g1;
				_g.set(mob,this.sees(mob.pos));
			}
			var wasVisible = _g;
			// Move to the new position
			this.setPos(newPos);
			// Fire room change event if we crossed into a new room
			if(this.room != curRoom) {
				this.roomChanged.dispatch(this.room);
			}
			// Update visibility for all characters; interrupt if a mob appears
			var _g = 0;
			var _g1 = this.game.queue;
			while(_g < _g1.length) {
				var ch = _g1[_g];
				++_g;
				var isVisible = this.sees(ch.pos);
				// If a mob just became visible (was hidden before), interrupt hero
				if(isVisible && !wasVisible.h[ch.__id__] && ((ch) instanceof com_watabou_sevendrl_characters_Mob)) {
					this.interrupt();
				}
				ch.updateVisibility(wasVisible.h[ch.__id__],isVisible);
			}
			this.isReady = false;
			// Play footstep sound with randomised pitch (averages 4 random values for bell curve)
			com_watabou_sevendrl_Sounds.event("footstep",1 - Math.abs(((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647) / 2 - 1),Math.floor(-4 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * 9));
			// Animate the move, then pull a new card and finish the turn
			this.sprite.move(curPos,newPos).onComplete(function() {
				_gthis.pullCard();
				_gthis.game.finish(_gthis,false);
			});
			return true;
		} else {
			return false;
		}
	}
	/**
	 * Wait action: creates an ActionWait and resumes the game.
	 * The hero skips its turn and draws a new card.
	 */
	,wait: function() {
		this.action = new com_watabou_sevendrl_characters_ActionWait(this);
		this.resume();
	}
	/**
	 * Pauses the hero, preventing automatic turn progression.
	 * Called when a previously hidden mob becomes visible during movement.
	 */
	,interrupt: function() {
		this.paused = true;
	}
	/**
	 * Cancels the current action without executing it.
	 */
	,cancel: function() {
		this.action = null;
	}
	/**
	 * Unpauses the hero and tells the game to continue processing turns.
	 */
	,resume: function() {
		this.paused = false;
		this.game.proceed();
	}
	/**
	 * Applies damage to the hero.  Dispatches the hpChanged signal
	 * with the new HP value, and triggers death if HP <= 0.
	 *
	 * @param {number} [value=1] - Damage amount
	 */
	,damage: function(value) {
		if(value == null) {
			value = 1;
		}
		var tmp = this;
		this.hpChanged.dispatch(tmp.hp -= value);
		if(this.hp <= 0) {
			this.die();
		}
	}
	/**
	 * Death handler: plays death animation, logs "You die...",
	 * plays death sound, and fires the game-over signal (player loses).
	 */
	,die: function() {
		com_watabou_sevendrl_characters_Character.prototype.die.call(this);
		com_watabou_sevendrl_Sounds.event("death",2);
// ╔══ EXTENSION POINT: Death Hook ────────────────────────────────
// ║ What: Hook for hero death — stats tracking, retry logic, permadeath saves
// ║ How:  Add code before game.over.dispatch() or replace with a custom game-over flow
// ║ See:  Boss.die() for the victory counterpart
// ╚═════════════════════════════════════════════════════════════════
		com_watabou_sevendrl_SevenDRL.out("You die...");
		this.game.over.dispatch();
	}
	,__class__: com_watabou_sevendrl_characters_Hero
});

// ─── Wanderer (com.watabou.sevendrl.characters.Wanderer) ───
/**
 * A lost spirit that wanders the dungeon, becoming aggressive when damaged.
 *
 * **Role in the game:** Wanderers are neutral-by-default enemies.  They
 * drift aimlessly (wandering state) and do not chase the hero unless
 * provoked.  Once damaged, they "aggro" — their sprite colour changes
 * and they begin chasing the hero on sight.  On death, they spread
 * aggression to all other Wanderers in the game AND teleport a random
 * uncollected clue to their death position (helping the player find clues
 * that were out of reach).
 *
 * **Key properties:**
 * @property {number} hp      - 3 hit points
 * @property {boolean} aggroed - Whether this Wanderer has been provoked
 *
 * **Aggro mechanics:**
 * - `aggro()` sets `aggroed = true` and changes sprite colour to orange
 * - `damage()` always calls `aggro()` after applying damage
 * - `act()` checks aggro + sight before switching to chase
 * - `die()` makes ALL other Wanderers chase and aggro, and moves a clue
 *
 * **Related classes:**
 * - Extends `com.watabou.sevendrl.characters.Mob`
 * - Interacts with `com.watabou.sevendrl.characters.Clue` on death
 *
 * **Visual:** `&` character in green (0x777788) when neutral,
 * changes to orange (0xCD0000→light) when aggroed.
 */
var com_watabou_sevendrl_characters_Wanderer = function(game,pos) {
	this.aggroed = false;
	com_watabou_sevendrl_characters_Mob.call(this,game,pos);
	this.hp = 3;
	this.wander();
};
$hxClasses["com.watabou.sevendrl.characters.Wanderer"] = com_watabou_sevendrl_characters_Wanderer;
com_watabou_sevendrl_characters_Wanderer.__name__ = "com.watabou.sevendrl.characters.Wanderer";
com_watabou_sevendrl_characters_Wanderer.__super__ = com_watabou_sevendrl_characters_Mob;
com_watabou_sevendrl_characters_Wanderer.prototype = $extend(com_watabou_sevendrl_characters_Mob.prototype,{
	/**
	 * Activates aggression: marks this Wanderer as provoked and changes
	 * its sprite colour from green to orange (visual alert to the player).
	 */
	aggro: function() {
		this.aggroed = true;
		this.sprite.tf.set_textColor(13430527);
	}
	/** Creates the sprite: `&` in green (neutral colour). */
	,createSprite: function() {
		this.sprite = new com_watabou_sevendrl_visuals_CharacterSprite(this,"&",false);
		this.sprite.tf.set_textColor(7833736);
	}
	/** Display name for the message log. */
	,getName: function() {
		return "lost spirit";
	}
	/**
	 * Turn logic: if aggroed and the hero is visible (and not already chasing),
	 * switches to chase mode.  Always delegates to the current state's act().
	 *
	 * Note: unlike Hunter, the aggro check happens BEFORE delegating,
	 * so the Wanderer may chase and act in the same turn.
	 */
	,act: function() {
		if(this.aggroed && this.sees(this.game.hero.pos) && !((this.state) instanceof com_watabou_sevendrl_characters_StateChasing)) {
			this.chase(this.game.hero);
		}
		return this.state.act();
	}
	/**
	 * Override: applies damage via Mob.damage(), then triggers aggro
	 * if this Wanderer hasn't been provoked yet.
	 *
	 * @param {number} [value=1] - Damage amount
	 */
	,damage: function(value) {
		if(value == null) {
			value = 1;
		}
		com_watabou_sevendrl_characters_Mob.prototype.damage.call(this,value);
		if(!this.aggroed) {
			this.aggro();
		}
	}
	/**
	 * Death handler with two special effects:
	 *
	 * 1. **Aggro spread:** All other Wanderers in the game immediately
	 *    switch to chasing the hero and become aggroed — killing one
	 *    lost spirit enrages the rest.
	 *
	 * 2. **Clue relocation:** A random uncollected clue that is NOT
	 *    currently visible to the hero is teleported to this Wanderer's
	 *    death position and made visible.  This helps the player find
	 *    clues that were in unreachable or unexplored areas.
	 */
	,die: function() {
		var _gthis = this;
		com_watabou_sevendrl_characters_Mob.prototype.die.call(this);
// ╔══ EXTENSION POINT: Extensible Death Event ────────────────────
// ║ What: Hook for cascading death effects — faction aggro, chain reactions, events
// ║ How:  Add logic after the Wanderer aggro loop or replace with a generic event bus
// ║ See:  Wanderer.aggro() for the aggro state change
// ╚═════════════════════════════════════════════════════════════════
		// Spread aggro: all other Wanderers start chasing the hero
		var _g = 0;
		var _g1 = this.game.queue;
		while(_g < _g1.length) {
			var ch = _g1[_g];
			++_g;
			if(((ch) instanceof com_watabou_sevendrl_characters_Wanderer)) {
				var w = js_Boot.__cast(ch , com_watabou_sevendrl_characters_Wanderer);
				w.chase(this.game.hero);
				w.aggro();
			}
		}
// ╔══ EXTENSION POINT: Item Displacement ─────────────────────────
// ║ What: Hook for relocating items on death — teleport loot, scatter pickups, etc.
// ║ How:  Replace the clue relocation logic with custom item movement rules
// ║ See:  Clue.setPos() for position updates, Clue.sprite for visual snaps
// ╚═════════════════════════════════════════════════════════════════
		// Clue relocation: find all uncollected clues
		var _g = [];
		var _g1 = 0;
		var _g2 = this.game.queue;
		while(_g1 < _g2.length) {
			var v = _g2[_g1];
			++_g1;
			if(((v) instanceof com_watabou_sevendrl_characters_Clue)) {
				_g.push(v);
			}
		}
		var clues = _g;
		// Filter to only clues NOT visible to the hero (hidden clues)
		var _g = [];
		var _g1 = 0;
		var _g2 = clues;
		while(_g1 < _g2.length) {
			var v = _g2[_g1];
			++_g1;
			if(!_gthis.game.hero.sees(v.pos)) {
				_g.push(v);
			}
		}
		clues = _g;
		// Teleport a random hidden clue to this Wanderer's death position
		if(clues.length > 0) {
			var cl = com_watabou_utils_ArrayExtender.random(clues);
			cl.setPos(this.pos);
			var _this = cl.sprite;
			_this.setPos(_this.character.pos.i,_this.character.pos.j);
			cl.sprite.set_visible(true);
		}
	}
	,__class__: com_watabou_sevendrl_characters_Wanderer
});

// -- Window exports (per module-manifest.json) --
// See modules/DECISIONS.md, Bug B: these were private module-scope
// vars with no export/import/window assignment anywhere.
window.com_watabou_sevendrl_characters_Character = com_watabou_sevendrl_characters_Character;
window.com_watabou_sevendrl_characters_Ambush = com_watabou_sevendrl_characters_Ambush;
window.com_watabou_sevendrl_characters_Mob = com_watabou_sevendrl_characters_Mob;
window.com_watabou_sevendrl_characters_Hunter = com_watabou_sevendrl_characters_Hunter;
window.com_watabou_sevendrl_characters_Ambusher = com_watabou_sevendrl_characters_Ambusher;
window.com_watabou_sevendrl_characters_Boss = com_watabou_sevendrl_characters_Boss;
window.com_watabou_sevendrl_characters_Spawn = com_watabou_sevendrl_characters_Spawn;
window.com_watabou_sevendrl_characters_Clue = com_watabou_sevendrl_characters_Clue;
window.com_watabou_sevendrl_characters_Hero = com_watabou_sevendrl_characters_Hero;
window.com_watabou_sevendrl_characters_Wanderer = com_watabou_sevendrl_characters_Wanderer;



// ═══ END modules/core/characters.js ═══
