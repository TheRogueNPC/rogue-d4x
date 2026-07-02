// ═══════════════════════════════════════════════════════════════════
// ACTIONS — modules/core/actions.js
// Extracted from SevenDRL.js by extract-seven-drl.js
// Classes: Action, ActionMove, ActionEngage, ActionAttack, ActionCollect, ActionWait
//
// Hero action system for Dark Clues.
// Each action represents one hero turn. The game loop calls proceed()
// repeatedly until it returns true (action complete) or false (needs
// another tick, e.g. mid-animation or mid-pathfinding).
// ═══════════════════════════════════════════════════════════════════

/**
 * Base class for all hero actions.
 *
 * Every hero turn is represented by an Action instance. The game loop
 * ticks the action by calling {@link proceed} each frame until the
 * action signals completion.
 *
 * @class Action
 * @param {Hero} hero - The hero performing this action.
 */
var com_watabou_sevendrl_characters_Action = function(hero) {
	/** @type {Hero} The hero this action belongs to. */
	this.hero = hero;
};
$hxClasses["com.watabou.sevendrl.characters.Action"] = com_watabou_sevendrl_characters_Action;
com_watabou_sevendrl_characters_Action.__name__ = "com.watabou.sevendrl.characters.Action";
com_watabou_sevendrl_characters_Action.prototype = {
	/**
	 * Execute one tick of this action.
	 *
	 * @returns {boolean} `true` if the action is finished (hero turn ends),
	 *   `false` if the action needs more ticks (e.g. still moving or animating).
	 */
	proceed: function() {
// ╔══ EXTENSION POINT: Action Base ─────────────────────────────────
// ║ What: Base class for custom hero actions
// ║ How:  Subclass Action and override proceed() to create new turn types
// ╚═════════════════════════════════════════════════════════════════
		return false;
	}
	,__class__: com_watabou_sevendrl_characters_Action
};

// ─── ActionMove ───────────────────────────────────────────────────
/**
 * Move the hero one step toward a destination cell.
 *
 * Each tick calls hero.getCloser(dest) to pathfind one step.
 * When the hero reaches the destination (or can no longer pathfind),
 * the action completes and the hero's turn ends.
 *
 * @class ActionMove
 * @extends Action
 * @param {Hero} hero - The hero performing the move.
 * @param {Pos}  dest - The target cell to move toward.
 */
var com_watabou_sevendrl_characters_ActionMove = function(hero,dest) {
	com_watabou_sevendrl_characters_Action.call(this,hero);
	/** @type {Pos} The destination cell the hero is moving toward. */
	this.dest = dest;
};
$hxClasses["com.watabou.sevendrl.characters.ActionMove"] = com_watabou_sevendrl_characters_ActionMove;
com_watabou_sevendrl_characters_ActionMove.__name__ = "com.watabou.sevendrl.characters.ActionMove";
com_watabou_sevendrl_characters_ActionMove.__super__ = com_watabou_sevendrl_characters_Action;
com_watabou_sevendrl_characters_ActionMove.prototype = $extend(com_watabou_sevendrl_characters_Action.prototype,{
	/**
	 * Attempt to move one step closer to the destination.
	 *
	 * If getCloser returns true the hero moved successfully and the action
	 * needs another tick. If it returns false the hero is stuck or has
	 * arrived — the action finishes.
	 *
	 * @returns {boolean} `true` when the action is complete.
	 */
	proceed: function() {
// ╔══ EXTENSION POINT: Movement ────────────────────────────────────
// ║ What: Movement customization point
// ║ How:  Override to add pathfinding logic, movement costs, or terrain effects
// ╚═════════════════════════════════════════════════════════════════
		if(this.hero.getCloser(this.dest)) {
			return false;
		} else {
			this.hero.cancel();
			return true;
		}
	}
	,__class__: com_watabou_sevendrl_characters_ActionMove
});

// ─── ActionEngage ─────────────────────────────────────────────────
/**
 * Base class for actions that interact with a target (attack, collect, etc.).
 *
 * The hero first moves toward the target. Once adjacent and visible,
 * the subclass decides whether engagement is possible via {@link canEngage}
 * and performs the interaction via {@link engage}.
 *
 * Subclasses must override canEngage() and engage().
 *
 * @class ActionEngage
 * @extends Action
 * @param {Hero}      hero - The hero performing the action.
 * @param {Character} ch   - The target character (mob or clue) to engage.
 */
var com_watabou_sevendrl_characters_ActionEngage = function(hero,ch) {
	com_watabou_sevendrl_characters_Action.call(this,hero);
	/** @type {Character} The target character to engage with. */
	this.ch = ch;
	/** @type {Pos} Last known position of the target (updates when visible). */
	this.pos = ch.pos;
};
$hxClasses["com.watabou.sevendrl.characters.ActionEngage"] = com_watabou_sevendrl_characters_ActionEngage;
com_watabou_sevendrl_characters_ActionEngage.__name__ = "com.watabou.sevendrl.characters.ActionEngage";
com_watabou_sevendrl_characters_ActionEngage.__super__ = com_watabou_sevendrl_characters_Action;
com_watabou_sevendrl_characters_ActionEngage.prototype = $extend(com_watabou_sevendrl_characters_Action.prototype,{
	/**
	 * Move toward the target, and engage when in range.
	 *
	 * If the target is visible, the hero tracks its live position.
	 * When adjacent and canEngage() returns true, engage() fires.
	 * Otherwise the hero keeps moving closer.
	 * If the target is out of sight, the hero moves toward the last
	 * known position.
	 *
	 * @returns {boolean} `true` when the action is complete.
	 */
	proceed: function() {
		if(this.hero.sees(this.ch.pos)) {
			// Target is visible — update tracked position to live position
			this.pos = this.ch.pos;
// ╔══ EXTENSION POINT: Engage Template ────────────────────────────
// ║ What: Template method pattern — override canEngage() and engage()
// ║ How:  Subclass ActionEngage to create custom interaction types (collect, talk, etc.)
// ╚═════════════════════════════════════════════════════════════════
			if(this.canEngage()) {
				// Adjacent and ready — perform the engagement
				this.engage();
				return true;
			} else if(this.hero.getCloser(this.pos,true)) {
				// Still moving toward the target
				return false;
			} else {
				// Can't get closer — action ends (target unreachable)
				return true;
			}
		} else if(this.hero.getCloser(this.pos)) {
			// Target not visible — move toward last known position
			return false;
		} else {
			// Reached last known position but target gone — give up
			return true;
		}
	}
	/**
	 * Determine whether the hero is in range to engage the target.
	 * Must be overridden by subclasses.
	 *
	 * @returns {boolean} `true` if engagement is possible right now.
	 */
	,canEngage: function() {
		return false;
	}
	/**
	 * Perform the engagement action (attack, collect, etc.).
	 * Must be overridden by subclasses.
	 */
	,engage: function() {
	}
	,__class__: com_watabou_sevendrl_characters_ActionEngage
});

// ─── ActionAttack ─────────────────────────────────────────────────
/**
 * Attack a mob when the hero is adjacent to it.
 *
 * Damage is determined by the hero's current card:
 *   - Weak card   (index 0) → 1 damage
 *   - Normal card (index 1) → 2 damage
 *   - Strong card (index 2) → 3 damage
 *
 * After the attack animation completes, a new card is drawn and the
 * hero's turn ends.
 *
 * @class ActionAttack
 * @extends ActionEngage
 * @param {Hero} hero - The attacking hero.
 * @param {Mob}  ch   - The mob to attack.
 */
var com_watabou_sevendrl_characters_ActionAttack = function(hero,ch) {
	com_watabou_sevendrl_characters_ActionEngage.call(this,hero,ch);
};
$hxClasses["com.watabou.sevendrl.characters.ActionAttack"] = com_watabou_sevendrl_characters_ActionAttack;
com_watabou_sevendrl_characters_ActionAttack.__name__ = "com.watabou.sevendrl.characters.ActionAttack";
com_watabou_sevendrl_characters_ActionAttack.__super__ = com_watabou_sevendrl_characters_ActionEngage;
com_watabou_sevendrl_characters_ActionAttack.prototype = $extend(com_watabou_sevendrl_characters_ActionEngage.prototype,{
	/**
	 * Check if the hero is adjacent to the target mob.
	 *
	 * Uses the pathfinding graph to determine if the target's position
	 * is a direct neighbour of the hero's position.
	 *
	 * @returns {boolean} `true` if the target is in an adjacent cell.
	 */
	canEngage: function() {
		return this.hero.game.pf.graph.h[this.hero.pos.__id__].indexOf(this.ch.pos) != -1;
	}
	/**
	 * Execute the attack: play animation, deal damage, draw new card.
	 *
	 * The hero is marked as not-ready during the animation. Once the
	 * sprite animation completes, damage is applied based on the
	 * current card power, a new card is drawn, and the turn finishes.
	 */
	,engage: function() {
		var _gthis = this;
		// Prevent the hero from acting again until animation finishes
		this.hero.isReady = false;
		// Play the attack lunge animation, then deal damage on complete
		this.hero.sprite.engage(this.hero.pos,this.pos).onComplete(function() {
			var dmg;
// ╔══ EXTENSION POINT: Damage Calculation ─────────────────────────
// ║ What: SWAP POINT for damage calculation, card effects
// ║ How:  Replace the switch block with custom damage formulas, status effects, or card modifiers
// ╚═════════════════════════════════════════════════════════════════
			// Card power: Weak=1, Normal=2, Strong=3
			switch(_gthis.hero.card._hx_index) {
			case 0:
				dmg = 1;
				break;
			case 1:
				dmg = 2;
				break;
			case 2:
				dmg = 3;
				break;
			}
			_gthis.ch.damage(dmg);
			// Draw a new card for the next turn
			_gthis.hero.pullCard();
			// Interrupt any ongoing hero behaviour
			_gthis.hero.interrupt();
			// End the hero's turn
			_gthis.hero.game.finish(_gthis.hero,true);
		});
		// Play attack sound with slight random pitch variation
// ╔══ EXTENSION POINT: Attack Sound ───────────────────────────────
// ║ What: Hook for attack sound effects
// ║ How:  Replace or extend the Sounds.event call with custom SFX, combos, or conditional sounds
// ╚═════════════════════════════════════════════════════════════════
		com_watabou_sevendrl_Sounds.event("hero_attack",1,Math.floor(-2 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * 5));
	}
	,__class__: com_watabou_sevendrl_characters_ActionAttack
});

// ─── ActionCollect ────────────────────────────────────────────────
/**
 * Collect a clue when the hero is standing on it.
 *
 * Unlike ActionAttack which requires adjacency, ActionCollect requires
 * the hero to be on the exact same cell as the clue.
 *
 * @class ActionCollect
 * @extends ActionEngage
 * @param {Hero} hero - The hero collecting the clue.
 * @param {Clue} ch   - The clue to collect.
 */
var com_watabou_sevendrl_characters_ActionCollect = function(hero,ch) {
	com_watabou_sevendrl_characters_ActionEngage.call(this,hero,ch);
};
$hxClasses["com.watabou.sevendrl.characters.ActionCollect"] = com_watabou_sevendrl_characters_ActionCollect;
com_watabou_sevendrl_characters_ActionCollect.__name__ = "com.watabou.sevendrl.characters.ActionCollect";
com_watabou_sevendrl_characters_ActionCollect.__super__ = com_watabou_sevendrl_characters_ActionEngage;
com_watabou_sevendrl_characters_ActionCollect.prototype = $extend(com_watabou_sevendrl_characters_ActionEngage.prototype,{
	/**
	 * Check if the hero is standing on the clue's cell.
	 *
	 * @returns {boolean} `true` if hero and clue share the same position.
	 */
	canEngage: function() {
		return this.hero.pos == this.ch.pos;
	}
	/**
	 * Collect the clue by calling its collect() method.
	 * The clue is cast to the Clue type and collected.
	 */
	,engage: function() {
// ╔══ EXTENSION POINT: Pickup Effects ─────────────────────────────
// ║ What: Hook for item pickup effects
// ║ How:  Add visual/audio feedback, inventory logic, or stat buffs before/after collect()
// ╚═════════════════════════════════════════════════════════════════
		(js_Boot.__cast(this.ch , com_watabou_sevendrl_characters_Clue)).collect();
	}
	,__class__: com_watabou_sevendrl_characters_ActionCollect
});

// ─── ActionWait ───────────────────────────────────────────────────
/**
 * Skip the hero's turn and draw a new card.
 *
 * Used when the player chooses to wait in place. The hero pulls a
 * fresh card from the deck (potentially changing attack power for
 * the next turn) and the current turn ends.
 *
 * @class ActionWait
 * @extends Action
 * @param {Hero} hero - The hero waiting.
 */
var com_watabou_sevendrl_characters_ActionWait = function(hero) {
	com_watabou_sevendrl_characters_Action.call(this,hero);
};
$hxClasses["com.watabou.sevendrl.characters.ActionWait"] = com_watabou_sevendrl_characters_ActionWait;
com_watabou_sevendrl_characters_ActionWait.__name__ = "com.watabou.sevendrl.characters.ActionWait";
com_watabou_sevendrl_characters_ActionWait.__super__ = com_watabou_sevendrl_characters_Action;
com_watabou_sevendrl_characters_ActionWait.prototype = $extend(com_watabou_sevendrl_characters_Action.prototype,{
	/**
	 * Pull a new card and end the hero's turn.
	 *
	 * @returns {boolean} Always returns `false` (action completes immediately).
	 */
	proceed: function() {
// ╔══ EXTENSION POINT: Wait / Defend ──────────────────────────────
// ║ What: Extendable for defend/charge mechanics
// ║ How:  Replace pullCard() with shield logic, charge蓄力, or conditional card draw
// ╚═════════════════════════════════════════════════════════════════
		this.hero.pullCard();
		this.hero.cancel();
		return false;
	}
	,__class__: com_watabou_sevendrl_characters_ActionWait
});

// -- Window exports (per module-manifest.json) --
// See modules/DECISIONS.md, Bug B: these were private module-scope
// vars with no export/import/window assignment anywhere.
window.com_watabou_sevendrl_characters_Action = com_watabou_sevendrl_characters_Action;
window.com_watabou_sevendrl_characters_ActionMove = com_watabou_sevendrl_characters_ActionMove;
window.com_watabou_sevendrl_characters_ActionEngage = com_watabou_sevendrl_characters_ActionEngage;
window.com_watabou_sevendrl_characters_ActionAttack = com_watabou_sevendrl_characters_ActionAttack;
window.com_watabou_sevendrl_characters_ActionCollect = com_watabou_sevendrl_characters_ActionCollect;
window.com_watabou_sevendrl_characters_ActionWait = com_watabou_sevendrl_characters_ActionWait;



// ═══ END modules/core/actions.js ═══
