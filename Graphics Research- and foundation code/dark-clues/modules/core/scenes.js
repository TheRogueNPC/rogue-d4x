// ═══════════════════════════════════════════════════════════════════
// SCENES — modules/core/scenes.js
// Extracted from SevenDRL.js by extract-seven-drl.js
// Classes: TextScene, DeathScene, GameScene, TitleScene, VictoryScene
//
// Scene hierarchy:
//   Scene (base, from coogee engine)
//     ├── TextScene — Generic text screen with title, body, "click to continue"
//     │     ├── TitleScene  — Game title screen ("Dark Clues"), transitions to GameScene
//     │     ├── DeathScene  — "You died..." screen, transitions to TitleScene
//     │     └── VictoryScene — "Success!" screen, transitions to TitleScene
//     └── GameScene — Main gameplay scene: dungeon view, HUD, input, windows
// ═══════════════════════════════════════════════════════════════════

// ─── TextScene (com.watabou.sevendrl.scenes.TextScene) ─── line 7409 ───
/**
 * TextScene — Base scene for simple text screens.
 *
 * Displays a centered title, a body of text, and a "Click to continue..."
 * prompt at the bottom. A full-screen {@link Fader} overlay handles the
 * fade-in / fade-out transition between scenes.
 *
 * Subclasses (TitleScene, DeathScene, VictoryScene) only need to call
 * {@link setTitle} and {@link setText} in their constructors and set
 * {@link nextScene} to the target scene class.
 *
 * @class
 * @extends Scene
 */
var com_watabou_sevendrl_scenes_TextScene = function() {
	// Call the parent Scene constructor (coogee engine base)
	com_watabou_coogee_Scene.call(this);

	// Title text — formatted with the game's title style (large, centered)
	this.tfTitle = com_watabou_coogee_ui_utils_Text.get("Title",com_watabou_sevendrl_Style.formatTitle);
	this.addChild(this.tfTitle);

	// Body text — a CenteredText widget that wraps to 75% of screen width
	this.tfText = new com_watabou_sevendrl_visuals_CenteredText("Text",com_watabou_sevendrl_Style.formatText);
	this.addChild(this.tfText);

	// "Click to continue..." prompt — smaller service-style text
	this.tfClick = com_watabou_coogee_ui_utils_Text.get("Click to continue...",com_watabou_sevendrl_Style.formatService);
	this.addChild(this.tfClick);

	// Full-screen fader overlay used for fade-in/fade-out transitions
	this.fader = new com_watabou_sevendrl_visuals_Fader();
	this.addChild(this.fader);

	// ╔══ EXTENSION POINT: [Scene Chain Configuration] ────────────────
	// ║ What: TextScene constructor — configure the next scene target
	// ║ How:  Override nextScene to point to a different scene class.
	// ║       Can also add pre-transition setup or conditional routing.
	// ╚═════════════════════════════════════════════════════════════════
	// nextScene defaults to the concrete subclass's own type.
	// Subclasses override this to specify which scene to transition to on click.
	this.nextScene = js_Boot.getClass(this);
};
$hxClasses["com.watabou.sevendrl.scenes.TextScene"] = com_watabou_sevendrl_scenes_TextScene;
com_watabou_sevendrl_scenes_TextScene.__name__ = "com.watabou.sevendrl.scenes.TextScene";
com_watabou_sevendrl_scenes_TextScene.__super__ = com_watabou_coogee_Scene;
com_watabou_sevendrl_scenes_TextScene.prototype = $extend(com_watabou_coogee_Scene.prototype,{

	/**
	 * Called when the scene becomes active. Fades in the overlay and
	 * registers the click handler so the player can advance.
	 */
	activate: function() {
		com_watabou_coogee_Scene.prototype.activate.call(this);
		this.fader.fadeIn();
		this.stage.addEventListener("click",$bind(this,this.onClick));
	}

	/**
	 * Lays out all UI elements. Centers the title, body text, and
	 * "click to continue" prompt vertically and horizontally.
	 * The fader is sized to fill the entire screen.
	 * Early-exits if the stage dimensions are not yet available (NaN or 0).
	 */
	,layout: function() {
		// Guard: don't layout until we have valid dimensions
		var f = this.rWidth;
		if(isNaN(f) || this.rWidth == 0) {
			return;
		}

		// Body text uses 75% of screen width for readability
		this.tfText.setWidth(this.rWidth * 0.75);

		// Calculate total vertical block height: title + gap + body + gap + click prompt
		var height = this.tfTitle.get_height() + 20.0 + this.tfText.get_height() + 20.0 + this.tfClick.get_height();

		// Center the entire block vertically, then position each element
		this.tfTitle.set_x((this.rWidth - this.tfTitle.get_width()) / 2);
		this.tfTitle.set_y((this.rHeight - height) / 2);

		this.tfText.set_x((this.rWidth - this.tfText.get_width()) / 2);
		this.tfText.set_y(this.tfTitle.get_y() + this.tfTitle.get_height() + 20.0);

		this.tfClick.set_x((this.rWidth - this.tfClick.get_width()) / 2);
		this.tfClick.set_y(this.tfText.get_y() + this.tfText.get_height() + 20.0);

		// Fader covers the full screen
		this.fader.setSize(this.rWidth,this.rHeight);
	}

	/**
	 * Sets the title text and re-layouts.
	 * @param {string} txt - The title string to display
	 */
	,setTitle: function(txt) {
		this.tfTitle.set_text(txt);
		this.layout();
	}

	/**
	 * Sets the body text and re-layouts.
	 * @param {string} txt - The body text to display
	 */
	,setText: function(txt) {
		this.tfText.set_text(txt);
		this.layout();
	}

	/**
	 * Click handler — removes itself from listening (so it only fires once),
	 * fades out the scene, then switches to {@link nextScene}.
	 * @param {Event} e - The click event (unused)
	 */
	,onClick: function(e) {
		var _gthis = this;
		// Prevent double-firing by removing the listener immediately
		this.stage.removeEventListener("click",$bind(this,this.onClick));
		this.fader.fadeOut(function() {
			// ╔══ EXTENSION POINT: [Transition Hook] ─────────────────────
			// ║ What: TextScene.onClick — customize scene transition logic
			// ║ How:  Add pre/post-transition effects, save state, or
			// ║       swap to a different scene class before switchScene.
			// ╚═════════════════════════════════════════════════════════════════
			// After fade-out completes, switch to the target scene
			com_watabou_coogee_Game.switchScene(_gthis.nextScene);
		});
	}

	,__class__: com_watabou_sevendrl_scenes_TextScene
});

// ─── DeathScene (com.watabou.sevendrl.scenes.DeathScene) ─── line 7462 ───
/**
 * DeathScene — Displayed when the player's hero dies.
 *
 * Shows "You died..." with a melancholic message about the unsolved mystery.
 * Clicking anywhere fades out and returns to the {@link TitleScene}.
 *
 * @class
 * @extends TextScene
 */
var com_watabou_sevendrl_scenes_DeathScene = function() {
	com_watabou_sevendrl_scenes_TextScene.call(this);
	// ╔══ EXTENSION POINT: [Death Screen Customization] ────────────────
	// ║ What: DeathScene constructor — customize death screen content
	// ║ How:  Add custom epitaph, death stats, retry button, or
	// ║       death-specific animations/sounds here.
	// ╚═════════════════════════════════════════════════════════════════
	this.setTitle("You died...");
	this.setText("...and the mystery of the Manor remained unsolved.");
	// After clicking, return to the title screen
	this.nextScene = com_watabou_sevendrl_scenes_TitleScene;
};
$hxClasses["com.watabou.sevendrl.scenes.DeathScene"] = com_watabou_sevendrl_scenes_DeathScene;
com_watabou_sevendrl_scenes_DeathScene.__name__ = "com.watabou.sevendrl.scenes.DeathScene";
com_watabou_sevendrl_scenes_DeathScene.__super__ = com_watabou_sevendrl_scenes_TextScene;
com_watabou_sevendrl_scenes_DeathScene.prototype = $extend(com_watabou_sevendrl_scenes_TextScene.prototype,{
	__class__: com_watabou_sevendrl_scenes_DeathScene
});

// ─── GameScene (com.watabou.sevendrl.scenes.GameScene) ─── line 7474 ───
/**
 * GameScene — The main gameplay scene. This is the core of the roguelike.
 *
 * Responsibilities:
 * - Creates and owns the {@link SevenDRL} game instance
 * - Renders the dungeon via {@link PlanView} (top-down plan view of the map)
 * - Displays HUD elements: health {@link Indicator}, clue {@link Indicator},
 *   {@link CardIndicator}, toast messages, and popup windows
 * - Handles keyboard input (arrow keys, numpad, space, dot, Escape)
 * - Handles mouse/touch click input for movement and NPC inspection
 * - Manages clue discovery windows and game-over transitions
 *
 * Input mapping:
 * | Key           | Action                        |
 * |---------------|-------------------------------|
 * | Arrow keys    | Move in that direction        |
 * | Numpad 8/2/4/6| Move N/S/W/E                  |
 * | Numpad 1/3/7/9| Move diagonally               |
 * | Period (.)    | Wait a turn                   |
 * | Space         | Resume interrupted hero       |
 * | Escape        | Close popup window / quit     |
 * | Ctrl+Click    | Inspect NPC info              |
 *
 * @class
 * @extends Scene
 */
var com_watabou_sevendrl_scenes_GameScene = function() {
	com_watabou_coogee_Scene.call(this);

	// Wire the static output function so the game can show toast messages
	com_watabou_sevendrl_SevenDRL.out = $bind(this,this.out);

	// Register the keyboard handler
	this.keyEvent.add($bind(this,this.onKey));

	// Start ambient environmental sound
	// ╔══ EXTENSION POINT: [Ambient Audio SWAP POINT] ─────────────────
	// ║ What: GameScene constructor — swap or layer ambient audio
	// ║ How:  Replace or extend Sounds.enviro() with a different track,
	// ║       layered ambient sounds, or dynamic music system.
	// ╚═════════════════════════════════════════════════════════════════
	com_watabou_sevendrl_Sounds.enviro("ambience");

	// Fader overlay for scene transitions (fade-out on game over)
	this.fader = new com_watabou_sevendrl_visuals_Fader();

	// Initialize all game objects (hero, map, HUD, etc.)
	this.reset();
};
$hxClasses["com.watabou.sevendrl.scenes.GameScene"] = com_watabou_sevendrl_scenes_GameScene;
com_watabou_sevendrl_scenes_GameScene.__name__ = "com.watabou.sevendrl.scenes.GameScene";
com_watabou_sevendrl_scenes_GameScene.__super__ = com_watabou_coogee_Scene;
com_watabou_sevendrl_scenes_GameScene.prototype = $extend(com_watabou_coogee_Scene.prototype,{

	/**
	 * Called when the scene becomes active. Adds the fader and fades in.
	 */
	activate: function() {
		com_watabou_coogee_Scene.prototype.activate.call(this);
		this.addChild(this.fader);
		this.fader.fadeIn();
	}

	/**
	 * Lays out all HUD and overlay elements based on current screen dimensions.
	 * Positions: plan view fills screen, toast at bottom-center, window centered,
	 * health indicator top-left, clue indicator top-right, card indicator top-center.
	 */
	,layout: function() {
		// Plan view (dungeon map) fills the entire screen
		this.view.setSize(this.rWidth,this.rHeight);

		// Toast message: centered horizontally, pinned to the bottom
		if(this.toast != null) {
			this.toast.set_x((this.rWidth - this.toast.get_width()) / 2);
			this.toast.set_y(this.rHeight - this.toast.get_height());
		}

		// Popup window: centered both horizontally and vertically
		if(this.window != null) {
			this.window.set_x((this.rWidth - this.window.get_width()) / 2);
			this.window.set_y((this.rHeight - this.window.get_height()) / 2);
		}

		// Left HUD stack - vertical column at x=8
		this.health.set_x(8);
		this.health.set_y(8);

		if (this.armor) {
			this.armor.set_x(8);
			this.armor.set_y(40);
		}

		if (this.abilityInd) {
			this.abilityInd.set_x(8);
			this.abilityInd.set_y(72);
		}

		// Clue indicator: top-right corner
		this.clues.set_x(this.rWidth - 8);
		this.clues.set_y(8);

		// Card indicator: top-center
		this.card.set_x((this.rWidth - this.card.get_width()) / 2);
		this.card.set_y(8);

		// Fader covers the full screen
		this.fader.setSize(this.rWidth,this.rHeight);
	}

	/**
	 * Raw key-down handler. If the hero is still animating (not ready),
	 * interrupts the animation instead of processing the key normally.
	 * Otherwise, delegates to the parent Scene's key handling.
	 * @param {KeyboardEvent} e - The keyboard event
	 */
	,onKeyDown: function(e) {
		if(!this.game.hero.isReady) {
			// ╔══ EXTENSION POINT: [Interrupt Behavior Hook] ───────────────
			// ║ What: onKeyDown — customize hero interrupt behavior
			// ║ How:  Add queued actions, cancel-specific-anims logic, or
			// ║       override the interrupt() call for smoother input.
			// ╚═════════════════════════════════════════════════════════════════
			// Hero is mid-animation — interrupt it so input is responsive
			this.game.hero.interrupt();
		} else {
			com_watabou_coogee_Scene.prototype.onKeyDown.call(this,e);
		}
	}

	/**
	 * Escape key handler. If a popup window is open, closes it.
	 * Otherwise, delegates to the parent Scene (which typically exits).
	 */
	,onEsc: function() {
		if(this.window != null) {
			this.hideWindow();
		} else {
			com_watabou_coogee_Scene.prototype.onEsc.call(this);
		}
	}

	/**
	 * Processed keyboard handler — maps key codes to game actions.
	 * Only fires on key-down events (not key-up).
	 *
	 * @param {number} key - The keyCode of the pressed key
	 * @param {boolean} down - true if key-down, false if key-up
	 */
	,onKey: function(key,down) {
		if(down) {
			// ╔══ EXTENSION POINT: [Input Extension Point] ─────────────────
			// ║ What: onKey — add new key bindings to the switch statement
			// ║ How:  Add new case blocks in the switch for additional keys.
			// ║       Each case receives the keyCode and can call step(),
			// ║       hero actions, or UI toggles.
			// ╚═════════════════════════════════════════════════════════════════
			switch(key) {
			case 32:
				// Space — resume the hero after an interruption
				this.game.hero.resume();
				break;

			// ── Movement keys (arrow keys + numpad equivalents) ──
			// step(di, dj) where di = row delta, dj = col delta
			// Grid: i = row (down is positive), j = column (right is positive)

			case 38: // Arrow Up
			case 104: // Numpad 8 — Move North (up one row)
				this.step(-1,0);
				break;

			case 39: // Arrow Right
			case 102: // Numpad 6 — Move East (right one column)
				this.step(0,1);
				break;

			case 40: // Arrow Down
			case 98: // Numpad 2 — Move South (down one row)
				this.step(1,0);
				break;

			case 97: // Numpad 1 — Move Southwest (down-left)
				this.step(1,-1);
				break;

			case 99: // Numpad 3 — Move Southeast (down-right)
				this.step(1,1);
				break;

			case 37: // Arrow Left
			case 100: // Numpad 4 — Move West (left one column)
				this.step(0,-1);
				break;

			case 103: // Numpad 7 — Move Northwest (up-left)
				this.step(-1,-1);
				break;

			case 105: // Numpad 9 — Move Northeast (up-right)
				this.step(-1,1);
				break;

			case 190: // Period key — Wait a turn (do nothing, let enemies act)
				this.game.hero.wait();
				break;
			}
		}
	}

	/**
	 * Initializes or resets the entire game state. Creates a fresh
	 * {@link SevenDRL} instance and sets up all visual components:
	 * - PlanView (dungeon map renderer)
	 * - Health indicator (red, max 16 HP)
	 * - Clue indicator (blue, tracks found clues)
	 * - Card indicator (shows current ability card)
	 *
	 * Also wires up event listeners for HP changes, card changes,
	 * clue discovery, and game over.
	 */
	,reset: function() {
		var _gthis = this;

		// Create the core game engine instance
		// ╔══ EXTENSION POINT: [Game Initialization Hook] ────────────────
		// ║ What: reset() — customize game instance creation
		// ║ How:  Pre-configure SevenDRL options, inject custom systems,
		// ║       or load saved state before/after creating the instance.
		// ╚═════════════════════════════════════════════════════════════════
		this.game = new com_watabou_sevendrl_SevenDRL();

		// Listen for clue discoveries to show popup windows
		this.game.clueFound.add($bind(this,this.onClueFound));

		// Remove the old plan view if resetting (not first init)
		if(this.view != null) {
			this.removeChild(this.view);
		}

		// PlanView renders the dungeon map and handles tile clicks
		// ╔══ EXTENSION POINT: [UI Customization Point] ──────────────────
		// ║ What: reset() PlanView setup — customize the dungeon renderer
		// ║ How:  Replace or wrap the PlanView constructor to use a
		// ║       different map renderer, minimap, or camera system.
		// ╚═════════════════════════════════════════════════════════════════
		this.view = new com_watabou_sevendrl_PlanView(this.game);
		this.view.click.add($bind(this,this.onClick));
		this.addChild(this.view);

		// Health indicator: max HP = 16, color 16772812 (gold/yellow), fill direction = true
		this.health = new com_watabou_sevendrl_visuals_Indicator(this.game.hero.hp,16772812,true);
		this.health.setLevel(this.game.hero.hp);
		this.addChild(this.health);

		// Armor indicator: tracks hero armor, cool blue-grey
		this.armor = new com_watabou_sevendrl_visuals_Indicator(6,2236979,true);
		this.armor.setLevel(0);
		this.addChild(this.armor);

		// Clue indicator: tracks discovered clues out of maxClues, color 6710954 (blue)
		this.clues = new com_watabou_sevendrl_visuals_Indicator(this.game.maxClues,6710954,false);
		this.clues.setLevel(this.game.gotClues);
		this.addChild(this.clues);

		// Card indicator shows the hero's current ability card (e.g. attack, defend)
		this.card = new com_watabou_sevendrl_visuals_CardIndicator();
		this.card.setCard(this.game.hero.card);
		this.addChild(this.card);

		// When hero HP changes, update the health bar
		this.game.hero.hpChanged.add(function(level) {
			_gthis.health.setLevel(level);
		});

		// When hero's active card changes, update the card display
		this.game.hero.cardChanged.add(function(card) {
			_gthis.card.setCard(card);
		});

		// When the game ends (win or lose), trigger the end sequence
		this.game.over.add($bind(this,this.onGameOver));

		// Position all HUD elements
		this.layout();

		// Start the first turn of the game
		this.game.proceed();
	}

	/**
	 * Converts a directional step (row/col delta) into a grid cell click.
	 * This bridges keyboard movement to the same handler used for mouse clicks.
	 *
	 * @param {number} di - Row delta: -1 = up, 0 = same row, +1 = down
	 * @param {number} dj - Column delta: -1 = left, 0 = same col, +1 = right
	 */
	,step: function(di,dj) {
		// ╔══ EXTENSION POINT: [Movement Input Hook] ─────────────────────
		// ║ What: step() — customize keyboard-triggered movement
		// ║ How:  Add pre/post-move hooks, animation overrides, or
		// ║       pathfinding modifications before calling onClick().
		// ╚═════════════════════════════════════════════════════════════════
		this.onClick(this.game.hero.pos.j + dj,this.game.hero.pos.i + di);
	}

	/**
	 * Handles a click/tap on the dungeon map at grid position (j, i).
	 * - If Ctrl is held, inspects the character at that cell and shows their info.
	 * - Otherwise, if the hero is alive, targets that cell and advances the game.
	 *
	 * @param {number} j - Column coordinate (x-axis)
	 * @param {number} i - Row coordinate (y-axis)
	 */
	,onClick: function(j,i) {
		var cell = this.game.plan.grid.cell(i,j);
		if(this.keyCtrl) {
			// Ctrl+click: show info about the character at this cell
			var ch = this.game.getChar(cell);
			if(ch != null) {
				this.out(ch.getInfo());
			}
		} else if(this.game.hero.isAlive()) {
			// ╔══ EXTENSION POINT: [Click-to-Action Resolution] ─────────────
			// ║ What: onClick — customize what happens when clicking the map
			// ║ How:  Intercept or extend the hero.target() call to add
			// ║       path preview, hover tooltips, or custom action menus.
			// ╚═════════════════════════════════════════════════════════════════
			// Normal click: send the hero toward the clicked cell
			this.game.hero.target(cell);
			// Advance the game loop (hero acts, then enemies act)
			this.game.proceed();
		}
	}

	/**
	 * Displays a toast (temporary message) at the bottom of the screen.
	 * Replaces any existing toast. Used for game output messages like
	 * "The door is locked" or NPC dialogue.
	 *
	 * @param {string} txt - The message text to display
	 */
	,out: function(txt) {
		// Remove previous toast if any
		this.removeChild(this.toast);
		// ╔══ EXTENSION POINT: [Toast Message Hook] ─────────────────────
		// ║ What: out() — customize toast message creation and display
		// ║ How:  Wrap or replace the Toast constructor call to add
		// ║       custom styling, sounds, queueing, or notification systems.
		// ╚═════════════════════════════════════════════════════════════════
		// Create a new toast, centered horizontally, pinned to bottom
		this.toast = new com_watabou_sevendrl_visuals_Toast(txt,this.rWidth);
		this.toast.set_x((this.rWidth - this.toast.get_width()) / 2);
		this.toast.set_y(this.rHeight - this.toast.get_height());
		this.addChild(this.toast);
	}

	/**
	 * Shows a centered popup window with a title and body text.
	 * Used for clue discovery messages and important game events.
	 * The window is 75% of screen width and centered on screen.
	 * Clicking the window closes it.
	 *
	 * @param {string} title   - The window title (e.g. "New clue")
	 * @param {string} text    - The body text content
	 */
	,showWindow: function(title,text) {
		// Close any existing window first
		this.hideWindow();
		// ╔══ EXTENSION POINT: [Modal Dialog Hook] ──────────────────────
		// ║ What: showWindow — customize popup window creation
		// ║ How:  Wrap or replace the Window constructor call to add
		// ║       custom styling, buttons, images, or modal behaviors.
		// ╚═════════════════════════════════════════════════════════════════
		this.window = new com_watabou_sevendrl_visuals_Window(title,text,this.rWidth * 0.75);
		this.window.set_x((this.rWidth - this.window.get_width()) / 2);
		this.window.set_y((this.rHeight - this.window.get_height()) / 2);
		// Clicking anywhere on the window dismisses it
		this.window.click.add($bind(this,this.hideWindow));
		this.addChild(this.window);
	}

	/**
	 * Closes and removes the current popup window if one is open.
	 */
	,hideWindow: function() {
		if(this.window != null) {
			this.removeChild(this.window);
			this.window = null;
		}
	}

	/**
	 * Called when the game ends (hero dies or wins).
	 * Waits 1 second, then fades out the scene and transitions to
	 * either VictoryScene or DeathScene depending on whether the hero survived.
	 */
	,onGameOver: function() {
		var _gthis = this;
		// Wait 1 second before starting the transition (let the final state sink in)
		com_watabou_utils_Updater.wait(1.0,function() {
			// ╔══ EXTENSION POINT: [Game-Over Customization] ───────────────
			// ║ What: onGameOver — customize the end-of-game sequence
			// ║ How:  Show stats screen, save score, play death music,
			// ║       add retry button, or transition to a custom scene.
			// ╚═════════════════════════════════════════════════════════════════
			// Add the fader on top of everything and stop ambient sound
			_gthis.addChild(_gthis.fader);
			com_watabou_sevendrl_Sounds.enviro(null);

			// Fade to black, then switch to the appropriate end scene
			_gthis.fader.fadeOut(function() {
				com_watabou_coogee_Game.switchScene(_gthis.game.hero.isAlive() ? com_watabou_sevendrl_scenes_VictoryScene : com_watabou_sevendrl_scenes_DeathScene);
			});
		});
	}

	/**
	 * Called when a clue is discovered. Shows a popup window with the
	 * clue text. If all clues have been found, the message includes a
	 * special prompt to confront the Curse of the Manor.
	 *
	 * @param {Object} clue - The discovered clue object, with a .text property
	 */
	,onClueFound: function(clue) {
		// ╔══ EXTENSION POINT: [Clue Discovery Hook] ─────────────────────
		// ║ What: onClueFound — customize behavior when a clue is found
		// ║ How:  Add journal entries, achievement unlocks, sound effects,
		// ║       screen shake, or particle effects before/after showWindow.
		// ╚═════════════════════════════════════════════════════════════════
		// Capitalize the clue text and add a period
		var clueText = com_watabou_utils_StringUtils.capitalize(clue.text + ".");

		if(this.game.gotClues >= this.game.maxClues) {
			// All clues found — show the final clue with the victory prompt
			this.showWindow("Final clue",clueText + " Now that you understand what's happened here," + " you need to confront the Curse of the Manor and banish it!");
		} else {
			// Normal clue — just show the clue text
			this.showWindow("New clue",clueText);
		}

		// Update the clue progress indicator
		this.clues.setLevel(this.game.gotClues);
	}

	,__class__: com_watabou_sevendrl_scenes_GameScene
});

// ─── TitleScene (com.watabou.sevendrl.scenes.TitleScene) ─── line 7645 ───
/**
 * TitleScene — The game's title screen.
 *
 * Displays "Dark Clues" as the title and the instruction:
 * "Solve the mystery by collecting all the clues and then banish the Curse."
 *
 * Clicking anywhere fades out and transitions to {@link GameScene}
 * to start a new game.
 *
 * @class
 * @extends TextScene
 */
var com_watabou_sevendrl_scenes_TitleScene = function() {
	com_watabou_sevendrl_scenes_TextScene.call(this);
	// ╔══ EXTENSION POINT: [Title Screen Customization] ────────────────
	// ║ What: TitleScene constructor — customize title screen content
	// ║ How:  Add custom text, logo, menu options, animations, or music
	// ║       on the title screen. Override setTitle/setText or add sprites.
	// ╚═════════════════════════════════════════════════════════════════
	this.setTitle("Dark Clues");
	this.setText("Solve the mystery by collecting all the clues and then banish the Curse.");
	// Clicking the title screen starts a new game
	this.nextScene = com_watabou_sevendrl_scenes_GameScene;
};
$hxClasses["com.watabou.sevendrl.scenes.TitleScene"] = com_watabou_sevendrl_scenes_TitleScene;
com_watabou_sevendrl_scenes_TitleScene.__name__ = "com.watabou.sevendrl.scenes.TitleScene";
com_watabou_sevendrl_scenes_TitleScene.__super__ = com_watabou_sevendrl_scenes_TextScene;
com_watabou_sevendrl_scenes_TitleScene.prototype = $extend(com_watabou_sevendrl_scenes_TextScene.prototype,{
	__class__: com_watabou_sevendrl_scenes_TitleScene
});

// ─── VictoryScene (com.watabou.sevendrl.scenes.VictoryScene) ─── line 7657 ───
/**
 * VictoryScene — Displayed when the player successfully banishes the Curse.
 *
 * Shows "Success!" with a congratulatory message about solving the Manor
 * mystery. Clicking anywhere fades out and returns to {@link TitleScene}.
 *
 * @class
 * @extends TextScene
 */
var com_watabou_sevendrl_scenes_VictoryScene = function() {
	com_watabou_sevendrl_scenes_TextScene.call(this);
	// ╔══ EXTENSION POINT: [Victory Screen Customization] ──────────────
	// ║ What: VictoryScene constructor — customize victory screen content
	// ║ How:  Add custom text, images, animations, or sound effects on
	// ║       game win. Override setTitle/setText or add child sprites.
	// ╚═════════════════════════════════════════════════════════════════
	this.setTitle("Success!");
	this.setText("You solved the mystery of the Manor and banished its Curse. " + "This is all there is, the game is over. Congratulations!");
	// After clicking, return to the title screen
	this.nextScene = com_watabou_sevendrl_scenes_TitleScene;
};
$hxClasses["com.watabou.sevendrl.scenes.VictoryScene"] = com_watabou_sevendrl_scenes_VictoryScene;
com_watabou_sevendrl_scenes_VictoryScene.__name__ = "com.watabou.sevendrl.scenes.VictoryScene";
com_watabou_sevendrl_scenes_VictoryScene.__super__ = com_watabou_sevendrl_scenes_TextScene;
com_watabou_sevendrl_scenes_VictoryScene.prototype = $extend(com_watabou_sevendrl_scenes_TextScene.prototype,{
	__class__: com_watabou_sevendrl_scenes_VictoryScene
});

// -- Window exports (per module-manifest.json) --
// See modules/DECISIONS.md, Bug B: these were private module-scope
// vars with no export/import/window assignment anywhere.
window.com_watabou_sevendrl_scenes_TextScene = com_watabou_sevendrl_scenes_TextScene;
window.com_watabou_sevendrl_scenes_DeathScene = com_watabou_sevendrl_scenes_DeathScene;
window.com_watabou_sevendrl_scenes_GameScene = com_watabou_sevendrl_scenes_GameScene;
window.com_watabou_sevendrl_scenes_TitleScene = com_watabou_sevendrl_scenes_TitleScene;
window.com_watabou_sevendrl_scenes_VictoryScene = com_watabou_sevendrl_scenes_VictoryScene;



// ═══ END modules/core/scenes.js ═══
