// ═══════════════════════════════════════════════════════════════════
// STATES — modules/core/states.js
// Extracted from SevenDRL.js by extract-seven-drl.js
// Classes: State, StateIdle, StateWandering, StateChasing, Wanderer
//
// Mob AI state machine for Dark Clues.
// Each mob has a current State that determines its behaviour on
// every tick. States can transition between each other (e.g.
// wandering → chasing when the hero is spotted).
// The Wanderer class is a special mob type with unique death effects.
// ═══════════════════════════════════════════════════════════════════

// ─── State ────────────────────────────────────────────────────────
/**
 * Base class for all mob AI states.
 *
 * A state defines what a mob does on each turn tick. Subclasses
 * override {@link act} to implement specific behaviour.
 *
 * @class State
 * @param {Mob} mob - The mob that owns this state.
 */
var com_watabou_sevendrl_characters_State = function(mob) {
	/** @type {Mob} The mob controlled by this state. */
	this.mob = mob;
};
$hxClasses["com.watabou.sevendrl.characters.State"] = com_watabou_sevendrl_characters_State;
com_watabou_sevendrl_characters_State.__name__ = "com.watabou.sevendrl.characters.State";
com_watabou_sevendrl_characters_State.prototype = {
	/**
	 * Execute one tick of this state's behaviour.
	 * Must be overridden by subclasses.
	 *
	 * @returns {boolean} `true` if the mob's turn is finished,
	 *   `false` if it needs more ticks.
	 */
	act: function() {
// ╔══ EXTENSION POINT: AI State Base ──────────────────────────────
// ║ What: Base class for custom AI states
// ║ How:  Subclass State and override act() to define new mob behaviours
// ╚═════════════════════════════════════════════════════════════════
		return false;
	}
	,__class__: com_watabou_sevendrl_characters_State
};

// ─── StateIdle ────────────────────────────────────────────────────
/**
 * Idle state — the mob does nothing and skips its turn.
 *
 * Used for mobs that should stay dormant until triggered by an
 * external event (e.g. a Wanderer that hasn't been aggroed yet).
 * Inherits the base act() which returns false (turn ends immediately).
 *
 * @class StateIdle
 * @extends State
 * @param {Mob} mob - The mob in idle state.
 */
var com_watabou_sevendrl_characters_StateIdle = function(mob) {
	com_watabou_sevendrl_characters_State.call(this,mob);
};
$hxClasses["com.watabou.sevendrl.characters.StateIdle"] = com_watabou_sevendrl_characters_StateIdle;
com_watabou_sevendrl_characters_StateIdle.__name__ = "com.watabou.sevendrl.characters.StateIdle";
com_watabou_sevendrl_characters_StateIdle.__super__ = com_watabou_sevendrl_characters_State;
com_watabou_sevendrl_characters_StateIdle.prototype = $extend(com_watabou_sevendrl_characters_State.prototype,{
	__class__: com_watabou_sevendrl_characters_StateIdle
});

// ─── StateWandering ───────────────────────────────────────────────
/**
 * Wandering state — the mob picks a random cell and walks toward it.
 *
 * On each tick:
 *   1. If no destination is set, pick a random cell from the level.
 *   2. Try to pathfind one step closer to the destination.
 *   3. If no path exists, clear the destination (next tick picks a new one).
 *
 * This creates aimless roaming behaviour for passive mobs.
 *
 * @class StateWandering
 * @extends State
 * @param {Mob} mob - The mob that wanders.
 */
var com_watabou_sevendrl_characters_StateWandering = function(mob) {
	com_watabou_sevendrl_characters_State.call(this,mob);
};
$hxClasses["com.watabou.sevendrl.characters.StateWandering"] = com_watabou_sevendrl_characters_StateWandering;
com_watabou_sevendrl_characters_StateWandering.__name__ = "com.watabou.sevendrl.characters.StateWandering";
com_watabou_sevendrl_characters_StateWandering.__super__ = com_watabou_sevendrl_characters_State;
com_watabou_sevendrl_characters_StateWandering.prototype = $extend(com_watabou_sevendrl_characters_State.prototype,{
	/**
	 * Move one step toward the current random destination.
	 * If stuck or arrived, clear the destination so a new one is chosen next tick.
	 *
	 * @returns {boolean} Always `false` — wandering never ends the mob's turn early.
	 */
	act: function() {
		this.pickDest();
		if(!this.mob.getCloser(this.dest)) {
			// Can't get closer — reset so a new destination is chosen next tick
			this.dest = null;
		}
		return false;
	}
	/**
	 * Choose a random destination if one isn't already set.
	 * Picks uniformly from all walkable cells on the level.
	 */
	,pickDest: function() {
		if(this.dest == null) {
// ╔══ EXTENSION POINT: Movement Pattern ───────────────────────────
// ║ What: SWAP POINT for movement patterns
// ║ How:  Replace random(game.cells) with patrol routes, weighted selection, or swarm logic
// ╚═════════════════════════════════════════════════════════════════
			this.dest = com_watabou_utils_ArrayExtender.random(this.mob.game.cells);
		}
	}
	,__class__: com_watabou_sevendrl_characters_StateWandering
});

// ─── StateChasing ─────────────────────────────────────────────────
/**
 * Chasing state — the mob pursues a target and attacks when adjacent.
 *
 * Behaviour per tick:
 *   1. If the target is alive AND visible:
 *      - Update last known position.
 *      - If adjacent → attack (engage).
 *      - Else → move closer.
 *      - If stuck → fall back to wandering.
 *   2. If the target is not visible or dead:
 *      - Move toward the last known position.
 *      - If already there or stuck → wander aimlessly.
 *
 * @class StateChasing
 * @extends State
 * @param {Mob}      mob    - The mob that chases.
 * @param {Character} target - The character being chased (usually the hero).
 */
var com_watabou_sevendrl_characters_StateChasing = function(mob,target) {
	com_watabou_sevendrl_characters_State.call(this,mob);
	/** @type {Character} The target this mob is chasing. */
	this.target = target;
	/** @type {Pos} Last known position of the target (for tracking through fog). */
	this.lastPos = target.pos;
};
$hxClasses["com.watabou.sevendrl.characters.StateChasing"] = com_watabou_sevendrl_characters_StateChasing;
com_watabou_sevendrl_characters_StateChasing.__name__ = "com.watabou.sevendrl.characters.StateChasing";
com_watabou_sevendrl_characters_StateChasing.__super__ = com_watabou_sevendrl_characters_State;
com_watabou_sevendrl_characters_StateChasing.prototype = $extend(com_watabou_sevendrl_characters_State.prototype,{
	/**
	 * Chase the target: pursue, attack, or fall back to wandering.
	 *
	 * @returns {boolean} `true` if the mob's turn is consumed by an attack,
	 *   `false` if it just moved or wandered.
	 */
	act: function() {
// ╔══ EXTENSION POINT: Chase AI Logic ─────────────────────────────
// ║ What: Extendable AI decision tree
// ║ How:  Add new branches for flanking, retreating, special abilities, or combo attacks
// ╚═════════════════════════════════════════════════════════════════
		if(this.target.isAlive() && this.mob.sees(this.target.pos)) {
			// Target is alive and visible — track live position
			this.lastPos = this.target.pos;
			if(this.canEngage()) {
				// Adjacent — attack the target
				return this.engage();
			} else if(this.mob.getCloser(this.target.pos,true)) {
				// Not adjacent — move one step closer
				return false;
			} else {
				// Can't path to target — fall back to wandering
				this.mob.wander();
				return false;
			}
		} else if(this.mob.getCloser(this.lastPos)) {
			// Target not visible — move toward last known position
			return false;
		} else {
			// At last known position but target gone — wander
			this.mob.wander();
			return false;
		}
	}
	/**
	 * Check if the mob is adjacent to the target in the pathfinding graph.
	 *
	 * @returns {boolean} `true` if the target occupies a neighbouring cell.
	 */
	,canEngage: function() {
// ╔══ EXTENSION POINT: Range Customization ────────────────────────
// ║ What: Range customization for mob attacks
// ║ How:  Replace adjacency graph check with distance-based, ranged, or AoE engagement
// ╚═════════════════════════════════════════════════════════════════
		return this.mob.game.pf.graph.h[this.mob.pos.__id__].indexOf(this.target.pos) != -1;
	}
	/**
	 * Attack the target: deal damage, play animation, end turn.
	 *
	 * The mob deals 1 damage (default) to the target, plays the attack
	 * animation, and then finishes its turn.
	 *
	 * @returns {boolean} Always `true` — the mob's turn is consumed.
	 */
	,engage: function() {
		var _gthis = this;
// ╔══ EXTENSION POINT: Mob Attack Effects ─────────────────────────
// ║ What: Hook for mob attack effects
// ║ How:  Add poison, bleed, knockback, or custom damage types before/after damage()
// ╚═════════════════════════════════════════════════════════════════
		// Deal damage to the target (default 1 damage)
		this.target.damage();
		// Lock the mob until animation completes
		this.mob.isReady = false;
		// Play attack animation, finish turn on completion
		this.mob.sprite.engage(this.mob.pos,this.target.pos).onComplete(function() {
			_gthis.mob.game.finish(_gthis.mob,true);
		});
		// Play ghost attack sound with random pitch variation
		com_watabou_sevendrl_Sounds.event("ghost_attack",1,Math.floor(-2 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * 5));
		return true;
	}
	,__class__: com_watabou_sevendrl_characters_StateChasing
});

// -- Window exports (per module-manifest.json) --
// See modules/DECISIONS.md, Bug B: these were private module-scope
// vars with no export/import/window assignment anywhere.
window.com_watabou_sevendrl_characters_State = com_watabou_sevendrl_characters_State;
window.com_watabou_sevendrl_characters_StateIdle = com_watabou_sevendrl_characters_StateIdle;
window.com_watabou_sevendrl_characters_StateWandering = com_watabou_sevendrl_characters_StateWandering;
window.com_watabou_sevendrl_characters_StateChasing = com_watabou_sevendrl_characters_StateChasing;




// ═══ END modules/core/states.js ═══
