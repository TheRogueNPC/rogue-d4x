// ═══════════════════════════════════════════════════════════════════
// ENGINE — modules/watabou/engine.js
// Extracted from SevenDRL.js by extract-seven-drl.js
// Classes: Game, Scene, Text
//
// Core engine layer for the "Dark Clues" roguelike (Coogee framework).
// Manages the game lifecycle (entry, scene switching, exit), the scene
// graph (keyboard input, layout, per-frame updates, screen shake), and
// lightweight UI text utilities (read-only labels, editable inputs, font
// formatting).
// ═══════════════════════════════════════════════════════════════════

/**
 * @fileoverview Core engine classes for the Coogee / Dark Clues roguelike.
 *
 * This file contains three major components:
 *
 * **Game** — The top-level application container (extends Sprite).
 * Manages the display stage, scales content to fit the window, handles
 * exit/pause/resume lifecycle events, and provides static helpers for
 * scene switching (`switchScene`) and application exit (`quit`).
 *
 * **Scene** — Base class for all game scenes (extends Sprite).
 * Provides keyboard input handling (keyDown/keyUp signals, modifier
 * tracking), per-frame update ticks, layout callbacks, and a screen
 * shake effect. Subclasses override `layout()` to arrange their UI.
 *
 * **Text** — Static utility class for creating OpenFL TextFields.
 * Offers `get()` for read-only/auto-sized labels, `input()` for editable
 * text fields, `format()` for font resolution, and `activate()` for
 * wiring focus/blur/change event handlers.
 */

// ─── Game (com.watabou.coogee.Game) ─── line 3235 ───

/**
 * The top-level application class; manages stage setup, scene switching, and
 * the game lifecycle (exit, pause, resume).
 *
 * Game is a singleton: the constructor stores itself in `Game.instance` and
 * registers with the global Updater via `useEnterFrame`. It then prepares the
 * OpenFL stage (alignment, scale mode, resize/exit/activate/deactivate handlers)
 * and immediately switches to the provided initial scene.
 *
 * @class Game
 * @extends openfl_display_Sprite
 * @constructor
 * @param {Function} initScene - The constructor/class reference for the first
 *   Scene to display (e.g. `com_watabou_sevendrl_scenes_TitleScene`).
 *
 * @example
 * var game = new com_watabou_coogee_Game(TitleScene);
 */
var com_watabou_coogee_Game = function(initScene) {
	// Store the singleton reference
	com_watabou_coogee_Game.instance = this;
	openfl_display_Sprite.call(this);
	this.prepareStage();
	com_watabou_utils_Updater.useEnterFrame(this);
	com_watabou_coogee_Game.switchScene(initScene);
};

$hxClasses["com.watabou.coogee.Game"] = com_watabou_coogee_Game;
com_watabou_coogee_Game.__name__ = "com.watabou.coogee.Game";

/**
 * Get the current OpenFL Stage instance.
 * @returns {Stage} The stage the game is rendering to.
 */
com_watabou_coogee_Game.getStage = function() {
	return com_watabou_coogee_Game.instance.stage;
};

/**
 * Switch to a new scene (static convenience method).
 * Delegates to the singleton instance's `switchSceneImp`.
 *
 * @param {Function} scClass - Constructor/class reference of the scene to
 *   create and switch to.
 */
com_watabou_coogee_Game.switchScene = function(scClass) {
	com_watabou_coogee_Game.instance.switchSceneImp(scClass);
};

/**
 * Quit the application by calling `System.exit(0)`.
 * This terminates the OpenFL runtime and the browser/standalone window.
 */
com_watabou_coogee_Game.quit = function() {
	openfl_system_System.exit(0);
};

com_watabou_coogee_Game.__super__ = openfl_display_Sprite;

com_watabou_coogee_Game.prototype = $extend(openfl_display_Sprite.prototype,{
	/**
	 * Configure the OpenFL stage for the game:
	 * - Sets alignment to center (stage.align = 6).
	 * - Sets scale mode to no-scale / show-all (stage.scaleMode = 2).
	 * - Listens for window resize to re-layout.
	 * - Binds application exit, window activate/deactivate to lifecycle callbacks.
	 */
	prepareStage: function() {
		var _gthis = this;
		this.stage.align = 6;
		this.stage.set_scaleMode(2);
		this.stage.addEventListener("resize",function(e) {
			_gthis.layout();
		});
		this.stage.application.onExit.add($bind(this,this.onExit));
		this.stage.application.__window.onActivate.add($bind(this,this.onResume));
		this.stage.application.__window.onDeactivate.add($bind(this,this.onPause));
	}
	/**
	 * Called when the application is about to exit. Stops the global update loop.
	 * @param {number} code - Exit code (unused in base implementation).
	 */
	,onExit: function(code) {
		com_watabou_utils_Updater.stop();
	}
	/**
	 * Called when the application window regains focus.
	 * Subclasses may override to resume game logic or animations.
	 */
	,onResume: function() {
	}
	/**
	 * Called when the application window loses focus.
	 * Subclasses may override to pause game logic or animations.
	 */
	,onPause: function() {
	}
	/**
	 * Re-layout the current scene to fit the current stage dimensions.
	 *
	 * Reads `stage.stageWidth` and `stage.stageHeight`, computes a uniform
	 * scale via `getScale()`, applies it to the scene's scaleX/scaleY, and
	 * calls `scene.setSize()` with the logical (unscaled) dimensions.
	 */
	,layout: function() {
		if(com_watabou_coogee_Game.scene != null) {
			var w = this.stage.stageWidth;
			var h = this.stage.stageHeight;
			// ╔══ EXTENSION POINT: [Rendering] ─────────────────────────────
			// ║ What: Resolution / scaling customization
			// ║ How:  Replace or wrap `this.getScale(w,h)` to implement
			// ║       pixel-perfect scaling, letterboxing, dynamic resolution,
			// ║       or DPI-aware scaling. You can also modify w/h before use.
			// ╚═════════════════════════════════════════════════════════════════
			var scale = this.getScale(w,h);
			com_watabou_coogee_Game.scene.set_scaleX(com_watabou_coogee_Game.scene.set_scaleY(scale));
			com_watabou_coogee_Game.scene.setSize(w / scale,h / scale);
		}
	}
	/**
	 * Compute the scale factor to apply to the scene so it fits the stage.
	 * Base implementation always returns 1 (no scaling). Override in
	 * subclasses to support pixel-art scaling or letterboxing.
	 *
	 * @param {number} w - Stage width in pixels.
	 * @param {number} h - Stage height in pixels.
	 * @returns {number} The uniform scale factor to apply.
	 */
	,getScale: function(w,h) {
		return 1;
	}
	/**
	 * Internal scene-switching implementation.
	 *
	 * 1. Deactivates and removes the current scene (if any).
	 * 2. Creates a new instance of `scClass` (if non-null).
	 * 3. Adds it to the display list, runs layout, and activates it.
	 * 4. Returns focus to the stage (prevents text fields from stealing input).
	 *
	 * @param {Function} scClass - Constructor/class reference of the new scene,
	 *   or null to clear the current scene.
	 */
	,switchSceneImp: function(scClass) {
		// Tear down the current scene
		if(com_watabou_coogee_Game.scene != null) {
			com_watabou_coogee_Game.scene.deactivate();
			this.removeChild(com_watabou_coogee_Game.scene);
			com_watabou_coogee_Game.scene = null;
		}
		// Create and activate the new scene
		if(scClass != null) {
			// ╔══ EXTENSION POINT: [Scene] ─────────────────────────────
			// ║ What: Scene factory hook
			// ║ How:  Replace `Type.createInstance(scClass,[])` with a
			// ║       factory that passes constructor arguments, applies
			// ║       mixins, or wraps scenes in decorators/transitions.
			// ╚═════════════════════════════════════════════════════════════════
			com_watabou_coogee_Game.scene = Type.createInstance(scClass,[]);
			this.addChild(com_watabou_coogee_Game.scene);
			this.layout();
			com_watabou_coogee_Game.scene.activate();
		}
		// Ensure keyboard focus returns to the stage, not a text field
		this.stage.set_focus(this.stage);
	}
	,__class__: com_watabou_coogee_Game
});

// ─── Scene (com.watabou.coogee.Scene) ─── line 4192 ───

/**
 * Base class for all game scenes in the Coogee engine.
 *
 * A Scene is a display container that:
 * - Registers itself with the global Updater for per-frame `update` ticks.
 * - Listens for keyboard events on the stage and re-broadcasts them via
 *   a `keyEvent` signal (with keyCode and isDown arguments).
 * - Tracks modifier key state (`keyShift`, `keyCtrl`) for convenience.
 * - Handles the Escape key by calling `Game.quit()` (overridable via `onEsc`).
 * - Provides a `layout()` hook called whenever the scene is resized.
 * - Supports a screen-shake effect via `shake()`.
 *
 * Subclasses must override `layout()` to position their UI elements.
 *
 * @class Scene
 * @extends openfl_display_Sprite
 * @constructor
 *
 * @example
 * var MyScene = function() {
 *   com_watabou_coogee_Scene.call(this);
 *   // create children here
 * };
 * MyScene.prototype = $extend(com_watabou_coogee_Scene.prototype, {
 *   layout: function() {
 *     // position children based on this.rWidth, this.rHeight
 *   }
 * });
 */
var com_watabou_coogee_Scene = function() {
	/**
	 * Whether the Ctrl (or Ctrl/Control) key is currently held down.
	 * Updated automatically by onKeyDown / onKeyUp.
	 * @type {boolean}
	 */
	this.keyCtrl = false;

	/**
	 * Whether the Shift key is currently held down.
	 * Updated automatically by onKeyDown / onKeyUp.
	 * @type {boolean}
	 */
	this.keyShift = false;

	/**
	 * Logical height of the scene (set by `setSize`). Used by subclasses
	 * to lay out UI elements.
	 * @type {number}
	 */
	this.rHeight = 0.0;

	/**
	 * Logical width of the scene (set by `setSize`). Used by subclasses
	 * to lay out UI elements.
	 * @type {number}
	 */
	this.rWidth = 0.0;

	/**
	 * Signal dispatched every frame with the elapsed time since the last tick.
	 * Type: Signal1<number>.
	 * Subscribers receive `(elapsed: number)` in seconds.
	 * @type {Signal1}
	 */
	this.update = new msignal_Signal1();

	/**
	 * Signal dispatched on every keyDown and keyUp event.
	 * Type: Signal2<number, boolean> — (keyCode, isDown).
	 * @type {Signal2}
	 */
	this.keyEvent = new msignal_Signal2();

	// Call parent Sprite constructor
	openfl_display_Sprite.call(this);
};

$hxClasses["com.watabou.coogee.Scene"] = com_watabou_coogee_Scene;
com_watabou_coogee_Scene.__name__ = "com.watabou.coogee.Scene";

com_watabou_coogee_Scene.__super__ = openfl_display_Sprite;

com_watabou_coogee_Scene.prototype = $extend(openfl_display_Sprite.prototype,{
	/**
	 * Activate this scene: subscribe to the global update tick and begin
	 * listening for keyboard events on the stage.
	 */
	activate: function() {
		// ╔══ EXTENSION POINT: [Input] ─────────────────────────────────
		// ║ What: Input hook
		// ║ How:  Add mouse/touch/gamepad event listeners here alongside
		// ║       the keyboard listeners. Override to register custom
		// ║       input mappings or input-layer systems.
		// ╚═════════════════════════════════════════════════════════════════
		com_watabou_utils_Updater.get_tick().add($bind(this,this.onUpdate));
		this.stage.addEventListener("keyDown",$bind(this,this.onKeyDown));
		this.stage.addEventListener("keyUp",$bind(this,this.onKeyUp));
	}
	/**
	 * Deactivate this scene: unsubscribe from the update tick and remove
	 * keyboard event listeners.
	 */
	,deactivate: function() {
		com_watabou_utils_Updater.get_tick().remove($bind(this,this.onUpdate));
		this.stage.removeEventListener("keyDown",$bind(this,this.onKeyDown));
		this.stage.removeEventListener("keyUp",$bind(this,this.onKeyUp));
	}
	/**
	 * Called when the Escape key is pressed.
	 * Base implementation quits the game. Override to customize.
	 */
	,onEsc: function() {
		com_watabou_coogee_Game.quit();
	}
	/**
	 * Handle a keyDown event. Tracks Shift and Ctrl modifier state,
	 * dispatches the Escape action, and re-broadcasts via `keyEvent`.
	 * Prevents default browser behaviour unless a TextField is focused.
	 *
	 * @param {KeyboardEvent} e - The raw keyboard event from the stage.
	 */
	,onKeyDown: function(e) {
		// ╔══ EXTENSION POINT: [Input] ─────────────────────────────────
		// ║ What: Global key handler
		// ║ How:  Add cases to the switch below for global hotkeys
		// ║       (debug toggles, screenshot, dev console, etc.).
		// ║       Or wrap this method to intercept ALL key input.
		// ╚═════════════════════════════════════════════════════════════════
		switch(e.keyCode) {
		case 16:  // Shift
			this.keyShift = true;
			break;
		case 15:  // Ctrl (left)
		case 17:  // Ctrl (right)
			this.keyCtrl = true;
			break;
		case 27:  // Escape
			this.onEsc();
			break;
		}
		// Broadcast the key event (keyCode, isDown=true)
		this.keyEvent.dispatch(e.keyCode,true);
		// Prevent browser default (e.g. scrolling) unless a text field is active
		if(this.stage != null && !((this.stage.get_focus()) instanceof openfl_text_TextField)) {
			e.preventDefault();
		}
	}
	/**
	 * Handle a keyUp event. Updates modifier state and re-broadcasts via
	 * `keyEvent`. Prevents default behaviour when no TextField is focused.
	 *
	 * @param {KeyboardEvent} e - The raw keyboard event from the stage.
	 */
	,onKeyUp: function(e) {
		switch(e.keyCode) {
		case 16:  // Shift released
			this.keyShift = false;
			break;
		case 15:  // Ctrl released
		case 17:
			this.keyCtrl = false;
			break;
		}
		this.keyEvent.dispatch(e.keyCode,false);
		if(!((this.stage.get_focus()) instanceof openfl_text_TextField)) {
			e.preventDefault();
		}
	}
	/**
	 * Set the logical size of the scene and trigger a layout pass.
	 * Called by Game.layout() whenever the stage is resized.
	 *
	 * @param {number} w - Logical width (unscaled).
	 * @param {number} h - Logical height (unscaled).
	 */
	,setSize: function(w,h) {
		this.rWidth = w;
		this.rHeight = h;
		this.layout();
	}
	/**
	 * Get the current logical width.
	 * @returns {number} The logical width in unscaled pixels.
	 */
	,getWidth: function() {
		return this.rWidth;
	}
	/**
	 * Get the current logical height.
	 * @returns {number} The logical height in unscaled pixels.
	 */
	,getHeight: function() {
		return this.rHeight;
	}
	/**
	 * Layout hook called after `setSize()`. Override in subclasses to
	 * position and size child display objects based on `rWidth` and `rHeight`.
	 * Base implementation does nothing.
	 */
	,layout: function() {
	}
	/**
	 * Internal per-frame update handler. Dispatches the elapsed time to
	 * the `update` signal so that game logic can subscribe.
	 *
	 * @param {number} elapsed - Time in seconds since the last frame.
	 */
	,onUpdate: function(elapsed) {
		this.update.dispatch(elapsed);
	}
	/**
	 * Trigger a screen shake effect on this scene's display object.
	 *
	 * Uses a Tweener to gradually reduce random horizontal and vertical offsets
	 * from full amplitude to zero over `time` seconds. The shake uses the
	 * scene's current scale to determine amplitude.
	 *
	 * @param {number} [time=1] - Duration of the shake in seconds.
	 * @param {number} [ax=2] - Maximum horizontal shake amplitude in pixels.
	 * @param {number} [ay=-1] - Maximum vertical shake amplitude. If -1, uses
	 *   the same value as `ax`.
	 */
	,shake: function(time,ax,ay) {
		// ╔══ EXTENSION POINT: [Rendering] ─────────────────────────────
		// ║ What: Screen effect hook
		// ║ How:  Extend or replace the shake implementation below with
		// ║       additional effects: flash, blur, chromatic aberration,
		// ║       or composite post-processing pipelines.
		// ╚═════════════════════════════════════════════════════════════════
		if(ay == null) {
			ay = -1;
		}
		if(ax == null) {
			ax = 2;
		}
		if(time == null) {
			time = 1;
		}
		var _gthis = this;
		// If ay is -1, default to ax (square shake)
		if(ay == -1) {
			ay = ax;
		}
		// Run a Tweener that applies random offsets, decaying over time
		com_watabou_processes_Tweener.run(time,function(elapsed) {
			_gthis.set_x((1 - elapsed) * (Math.random() - 0.5) * _gthis.get_scaleX() * ax | 0);
			_gthis.set_y((1 - elapsed) * (Math.random() - 0.5) * _gthis.get_scaleY() * ay | 0);
		});
	}
	,__class__: com_watabou_coogee_Scene
});

// ─── Text (com.watabou.coogee.ui.utils.Text) ─── line 4286 ───

/**
 * Static utility class for creating and configuring OpenFL TextFields.
 *
 * Provides factory methods for:
 * - `get()` — Read-only, auto-sized text labels (optionally editable).
 * - `input()` — Editable text fields with border/background styling.
 * - `format()` — Create a TextFormat from a font asset ID or system font name.
 * - `activate()` — Wire focusIn/focusOut/enter/escape/change handlers to a
 *   TextField to make it behave as an in-place editor.
 *
 * This is a namespace-only class (no instances). All methods are static.
 *
 * @class Text
 */
var com_watabou_coogee_ui_utils_Text = function() { };

$hxClasses["com.watabou.coogee.ui.utils.Text"] = com_watabou_coogee_ui_utils_Text;
com_watabou_coogee_ui_utils_Text.__name__ = "com.watabou.coogee.ui.utils.Text";

/**
 * Create a text label (TextField) with the given content and format.
 *
 * If `onUpdate` or `onFinish` callbacks are provided, the field is made
 * editable (type = INPUT) and wired with event handlers via `activate()`.
 * Otherwise, the field is set to non-selectable (read-only label).
 *
 * @param {string} [txt=""] - The HTML text content to display.
 * @param {TextFormat} format - The text format (font, size, color, etc.).
 * @param {function} [onUpdate=null] - Optional callback fired on every text
 *   change. Receives no arguments.
 * @param {function} [onFinish=null] - Optional callback fired when the field
 *   loses focus (user finished editing). Receives no arguments.
 * @returns {TextField} The configured TextField instance.
 */
com_watabou_coogee_ui_utils_Text.get = function(txt,format,onUpdate,onFinish) {
	if(txt == null) {
		txt = "";
	}
	var tf = new openfl_text_TextField();
	if(onUpdate != null || onFinish != null) {
		// Editable mode — wire event handlers
		com_watabou_coogee_ui_utils_Text.activate(tf,onUpdate,onFinish);
	} else {
		// Read-only label — prevent text selection
		tf.set_selectable(false);
	}
	tf.set_autoSize(1);  // autoSize = LEFT
	tf.set_defaultTextFormat(format);
	tf.set_htmlText(txt);
	return tf;
};

/**
 * Create an editable text input field with visible border and background.
 *
 * The field is styled with a border colored to match the text color, a white
 * background, and auto-sizing. The `onUpdate` callback fires on every text
 * change.
 *
 * @param {string} [txt=""] - Initial text content.
 * @param {TextFormat} format - The text format (font, size, color, etc.).
 * @param {function} [onUpdate=null] - Optional callback fired on every text
 *   change.
 * @returns {TextField} The configured editable TextField.
 */
com_watabou_coogee_ui_utils_Text.input = function(txt,format,onUpdate) {
	if(txt == null) {
		txt = "";
	}
	var tf = new openfl_text_TextField();
	tf.set_type(1);  // type = INPUT (editable)
	tf.set_borderColor(tf.get_defaultTextFormat().color);
	tf.set_background(true);
	tf.set_border(true);
	// Fire the callback on every text change
	tf.addEventListener("change",function(e) {
		if(onUpdate != null) {
			onUpdate();
		}
	});
	tf.set_defaultTextFormat(format);
	// Set text with a space first to let autoSize measure height, then reset
	tf.set_text(txt != "" ? txt : " ");
	tf.set_autoSize(1);  // autoSize = LEFT
	tf.set_height(tf.get_height());  // Lock the measured height
	tf.set_autoSize(2);  // autoSize = NONE (fixed size)
	tf.set_text(txt);  // Set actual text content
	return tf;
};

/**
 * Create a TextFormat by resolving a font ID.
 *
 * If `id` is an asset path that exists in the OpenFL asset library, the
 * embedded font name is used. Otherwise, `id` is treated as a system font
 * name directly.
 *
 * @param {string} id - Font asset path or system font name.
 * @param {number} [size] - Font size in pixels. If undefined, uses the
 *   format's default.
 * @param {number} [color=0] - Text color as a 24-bit integer (default: 0 = black).
 * @returns {TextFormat} The configured text format.
 */
com_watabou_coogee_ui_utils_Text.format = function(id,size,color) {
	if(color == null) {
		color = 0;
	}
	// Resolve the font: if it exists as an asset, use its embedded name;
	// otherwise treat id as a system font name
	return new openfl_text_TextFormat(openfl_utils_Assets.exists(id) ? openfl_utils_Assets.getFont(id).name : id,size,color);
};

/**
 * Activate a TextField for in-place editing with keyboard and focus handling.
 *
 * Wires the following behaviours:
 * - **focusIn**: Shows a colored border (matching text color) for visual feedback.
 * - **focusOut**: Hides the border and optionally fires `onFinish`.
 * - **keyDown**: Enter (13) or Escape (27) commits the edit by returning focus
 *   to the stage and stops event propagation.
 * - **change**: Fires `onUpdate` on every text modification.
 *
 * @param {TextField} tf - The TextField to activate.
 * @param {function} [onUpdate=null] - Callback on text change.
 * @param {function} [onFinish=null] - Callback when editing ends (focus out).
 */
com_watabou_coogee_ui_utils_Text.activate = function(tf,onUpdate,onFinish) {
	tf.set_type(1);  // type = INPUT
	tf.addEventListener("focusIn",function(e) {
		// Show border on focus for visual feedback
		tf.set_borderColor(tf.get_defaultTextFormat().color);
		tf.set_border(true);
	});
	tf.addEventListener("focusOut",function(e) {
		// Hide border and signal editing finished
		tf.set_border(false);
		if(onFinish != null) {
			onFinish();
		}
	});
	tf.addEventListener("keyDown",function(e) {
		// Enter or Escape: commit the edit by returning focus to the stage
		if(e.keyCode == 13 || e.keyCode == 27) {
			tf.stage.set_focus(tf.stage);
			e.stopPropagation();
		}
	});
	tf.addEventListener("change",function(e) {
		// Notify on every text modification
		if(onUpdate != null) {
			onUpdate();
		}
	});
};

// -- Window exports (per module-manifest.json) --
// See modules/DECISIONS.md, Bug B: these were private module-scope
// vars with no export/import/window assignment anywhere.
window.com_watabou_coogee_Game = com_watabou_coogee_Game;
window.com_watabou_coogee_Scene = com_watabou_coogee_Scene;
window.com_watabou_coogee_ui_utils_Text = com_watabou_coogee_ui_utils_Text;



// ═══ END modules/watabou/engine.js ═══
