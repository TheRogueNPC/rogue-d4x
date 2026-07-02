// ═══════════════════════════════════════════════════════════════════
// VISUALS — modules/core/visuals.js
// Extracted from SevenDRL.js by extract-seven-drl.js
// Classes: AsciiSprite, CardIndicator, StatePin, CenteredText, CharacterSprite, Fader, Indicator, Unit, Toast, Window
//
// Visual component library for the Dark Clues roguelike.
// Built on top of OpenFL (Haxe→JS transpilation target). Each class
// is a display-object (Sprite or Bitmap) that encapsulates its own
// rendering, animation, and lifecycle helpers.
//
// Inheritance tree:
//   openfl.display.Sprite
//     ├─ AsciiSprite          – single ASCII glyph with fade/despawn/die
//     │   └─ CharacterSprite  – adds move() and engage() for character movement
//     ├─ CardIndicator        – three-state power pin strip
//     ├─ StatePin             – individual on/off animated pin
//     ├─ Indicator            – row of colored Units (health / clue bar)
//     ├─ Unit                 – single filled/unfilled rectangle
//     └─ Window               – modal popup with title, body, click-to-close
//   openfl.display.Bitmap
//     └─ Fader                – full-screen fade overlay
//   openfl.text.TextField
//     ├─ CenteredText         – text field that self-centers to a max width
//     │   └─ Toast            – auto-fading message that self-destructs
// ═══════════════════════════════════════════════════════════════════

// ─── AsciiSprite (com.watabou.sevendrl.visuals.AsciiSprite) ─── line 7669 ───
/**
 * Base visual element for rendering a single ASCII character on screen.
 *
 * Wraps a `TextField` inside a `Sprite` and provides animation helpers
 * for common roguelike visual effects: fade-in / fade-out (smoothstep),
 * despawn (scale + fade), and die (scale + fade + random rotation).
 *
 * Two static text formats are lazily initialised on first use:
 *   - `formatDefault` – the game's default proportional font
 *   - `formatMono`    – the game's monospace font
 *
 * @class AsciiSprite
 * @extends openfl.display.Sprite
 *
 * @param {string}  ch   - The ASCII character (or string) to display.
 * @param {boolean} mono - If true (default), use the monospace font.
 */
var com_watabou_sevendrl_visuals_AsciiSprite = function(ch,mono) {
	if(mono == null) {
		mono = true;
	}
	openfl_display_Sprite.call(this);

	// Lazily create the two shared TextFormat instances (default & mono).
	// These are stored as static properties so every AsciiSprite shares
	// the same format objects, avoiding repeated font look-ups.
	if(com_watabou_sevendrl_visuals_AsciiSprite.formatDefault == null) {
		// ╔══ EXTENSION POINT: [Font SWAP POINT] ───────────────────────
		// ║ What: AsciiSprite constructor — swap default & mono fonts
		// ║ How:  Replace Assets.getFont("default") and Assets.getFont("mono")
		// ║       with custom font names, or add additional font formats.
		// ╚═════════════════════════════════════════════════════════════════
		com_watabou_sevendrl_visuals_AsciiSprite.formatDefault = new openfl_text_TextFormat(openfl_utils_Assets.getFont("default").name);
		com_watabou_sevendrl_visuals_AsciiSprite.formatMono = new openfl_text_TextFormat(openfl_utils_Assets.getFont("mono").name);
	}

	// Create and configure the internal TextField that holds the glyph.
	this.tf = new openfl_text_TextField();
	this.tf.set_defaultTextFormat(mono ? com_watabou_sevendrl_visuals_AsciiSprite.formatMono : com_watabou_sevendrl_visuals_AsciiSprite.formatDefault);
	this.tf.set_autoSize(1);          // autoSize = LEFT (shrink to fit text)
	this.tf.set_text(ch);             // set the character to render
	this.addChild(this.tf);          // add TextField as a child display object
	this.setScale(1);                // default scale; also centres the TF

	// This sprite does not respond to mouse events.
	this.mouseEnabled = this.mouseChildren = false;
};
$hxClasses["com.watabou.sevendrl.visuals.AsciiSprite"] = com_watabou_sevendrl_visuals_AsciiSprite;
com_watabou_sevendrl_visuals_AsciiSprite.__name__ = "com.watabou.sevendrl.visuals.AsciiSprite";
com_watabou_sevendrl_visuals_AsciiSprite.__super__ = openfl_display_Sprite;
com_watabou_sevendrl_visuals_AsciiSprite.prototype = $extend(openfl_display_Sprite.prototype,{

	/**
	 * Set the text colour of the glyph.
	 * @param {number} c - ARGB colour value.
	 */
	setColor: function(c) {
		// ╔══ EXTENSION POINT: [Color Customization] ────────────────────
		// ║ What: setColor() — customize glyph color application
		// ║ How:  Add color blending, gradients, or color-cycling
		// ║       effects instead of a flat text color.
		// ╚═════════════════════════════════════════════════════════════════
		this.tf.set_textColor(c);
	}

	/**
	 * Scale the internal TextField uniformly and re-centre it within
	 * this sprite's local origin so the glyph always appears centred.
	 *
	 * The scaling is relative to the TF's current intrinsic size, so
	 * calling setScale(1) resets the glyph to its natural size.
	 *
	 * @param {number} scale - Uniform scale factor (1 = natural size).
	 */
	,setScale: function(scale) {
		// ╔══ EXTENSION POINT: [Size Customization] ─────────────────────
		// ║ What: setScale() — customize glyph sizing behavior
		// ║ How:  Override the scale calculation to use fixed sizes,
		// ║       size classes, or dynamic scaling based on context.
		// ╚═════════════════════════════════════════════════════════════════
		this.tf.set_scaleX(this.tf.set_scaleY(scale * Math.min(this.tf.get_scaleX() / this.tf.get_width(),this.tf.get_scaleY() / this.tf.get_height())));
		this.tf.set_x(-this.tf.get_width() / 2);
		this.tf.set_y(-this.tf.get_height() / 2);
	}

	/**
	 * Position this sprite on the tile grid.
	 * Tile coordinates (i, j) are converted to pixel coordinates by
	 * adding 0.5 so the sprite centres on the tile.
	 *
	 * @param {number} i - Row index (y-axis, 0 = top).
	 * @param {number} j - Column index (x-axis, 0 = left).
	 */
	,setPos: function(i,j) {
		this.set_x(j + 0.5);
		this.set_y(i + 0.5);
	}

	/**
	 * Remove this sprite from its parent display list.
	 * Safe to call even if the sprite is already detached.
	 */
	,remove: function() {
		if(this.parent != null) {
			this.parent.removeChild(this);
		}
	}

	/**
	 * Animate the glyph from fully transparent to fully opaque.
	 * Uses a smoothstep easing (ease-in-out) over 0.2 seconds.
	 * Cancels any in-progress fade before starting.
	 */
	,fadeIn: function() {
		var _gthis = this;
		this.cancelFading();
		this.set_visible(true);
		// ╔══ EXTENSION POINT: [Animation Customization] ─────────────────
		// ║ What: fadeIn/fadeOut — customize glyph fade animations
		// ║ How:  Change the Tweener duration (currently 0.2s) and the
		// ║       smoothstep easing for custom fade effects.
		// ╚═════════════════════════════════════════════════════════════════
		// Smoothstep: t*t*(3 - 2t) — produces a gentle S-curve
		this.fading = com_watabou_processes_Tweener.run(0.2,function(e) {
			_gthis.set_alpha(e * e * (3 - 2 * e));
		});
		this.fading.onComplete(function() {
			_gthis.fading = null;
		});
	}

	/**
	 * Animate the glyph from fully opaque to fully transparent.
	 * Uses a smoothstep easing (ease-in-out) over 0.2 seconds.
	 * Hides the sprite when the fade completes.
	 */
	,fadeOut: function() {
		var _gthis = this;
		this.cancelFading();
		this.set_visible(true);
		// Inverse smoothstep: 1 - (smoothstep(t)) for a smooth fade-out
		this.fading = com_watabou_processes_Tweener.run(0.2,function(e) {
			var x = 1 - e;
			_gthis.set_alpha(x * x * (3 - 2 * x));
		});
		this.fading.onComplete(function() {
			_gthis.set_visible(false);
			_gthis.fading = null;
		});
	}

	/**
	 * Despawn animation: the glyph fades out while scaling up, creating
	 * a "puff" effect. The sprite is removed from its parent when done.
	 *
	 * Uses a sqrt easing so the scale ramps up quickly at first,
	 * then the fade catches up at the end.
	 *
	 * Duration: 0.4 seconds.
	 */
	,despawn: function() {
		var _gthis = this;
		// ╔══ EXTENSION POINT: [Despawn Animation Hook] ─────────────────
		// ║ What: despawn() — customize the despawn animation
		// ║ How:  Replace the Tweener animation with custom effects:
		// ║       shrink, dissolve, teleport sparkles, etc.
		// ╚═════════════════════════════════════════════════════════════════
		com_watabou_processes_Tweener.run(0.4,function(e) {
			e = Math.sqrt(e);
			_gthis.set_alpha(1 - e);               // fade out
			_gthis.set_scaleX(_gthis.set_scaleY(1 + e * 7));  // scale up to 8×
		}).onComplete($bind(this,this.remove));
	}

	/**
	 * Death animation: same as despawn but adds a random spin.
	 * The rotation angle is chosen randomly from [-45°, +45°] using
	 * the seeded RNG so the visual is deterministic per seed.
	 *
	 * Duration: 0.4 seconds.
	 */
	,die: function() {
		var _gthis = this;
		// ╔══ EXTENSION POINT: [Death Animation Hook] ───────────────────
		// ║ What: die() — customize the death animation for characters
		// ║ How:  Replace the Tweener animation with custom effects:
		// ║       blood splat, shatter, dissolve, or particle burst.
		// ╚═════════════════════════════════════════════════════════════════
		// Generate a random rotation angle in the range [-45, +45] degrees.
		// Averages three independent RNG draws to smooth the distribution.
		var angle = 45 * (((com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 + (com_watabou_utils_Random.seed = com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647) / 3 * 2 - 1);
		com_watabou_processes_Tweener.run(0.4,function(e) {
			e = Math.sqrt(e);
			_gthis.set_alpha(1 - e);               // fade out
			_gthis.set_scaleX(_gthis.set_scaleY(1 + e * 7));  // scale up to 8×
			_gthis.set_rotation(e * angle);        // rotate by the random angle
		}).onComplete($bind(this,this.remove));
	}

	/**
	 * Cancel any in-progress fade animation (fadeIn or fadeOut).
	 * Called internally before starting a new fade.
	 */
	,cancelFading: function() {
		if(this.fading != null) {
			this.fading.stop();
			this.fading = null;
		}
	}
	,__class__: com_watabou_sevendrl_visuals_AsciiSprite
});

// ─── CardIndicator (com.watabou.sevendrl.visuals.CardIndicator) ─── line 7757 ───
/**
 * UI indicator that shows the current action card's power level.
 *
 * Displays a "Power" label followed by three {@link StatePin} instances
 * (pin1, pin2, pin3). When an {@link ActionCard} is set:
 *   - WEAK card:   pin1 on, pin2 off, pin3 off  (1 pin lit)
 *   - NORMAL card: pin1 on, pin2 on, pin3 off  (2 pins lit)
 *   - STRONG card: pin1 on, pin2 on, pin3 on   (3 pins lit)
 *
 * @class CardIndicator
 * @extends openfl.display.Sprite
 */
var com_watabou_sevendrl_visuals_CardIndicator = function() {
	openfl_display_Sprite.call(this);

	// "Power" label — coloured in a muted grey-brown (0x777F78)
	var label = com_watabou_coogee_ui_utils_Text.get("Power",com_watabou_sevendrl_Style.formatText);
	label.set_textColor(7833736);
	label.set_y((30 - label.get_height()) / 2);  // vertically centre within a 30px tall bar
	this.addChild(label);

	// Three pins laid out horizontally, each offset by the previous pin's width + 8px gap.
	this.pin1 = new com_watabou_sevendrl_visuals_StatePin("1");
	this.pin1.set_x(label.get_x() + label.get_width() + 8);
	this.addChild(this.pin1);

	this.pin2 = new com_watabou_sevendrl_visuals_StatePin("2");
	this.pin2.set_x(this.pin1.get_x() + this.pin1.get_width() + 8);
	this.addChild(this.pin2);

	this.pin3 = new com_watabou_sevendrl_visuals_StatePin("3");
	this.pin3.set_x(this.pin2.get_x() + this.pin2.get_width() + 8);
	this.addChild(this.pin3);
};
$hxClasses["com.watabou.sevendrl.visuals.CardIndicator"] = com_watabou_sevendrl_visuals_CardIndicator;
com_watabou_sevendrl_visuals_CardIndicator.__name__ = "com.watabou.sevendrl.visuals.CardIndicator";
com_watabou_sevendrl_visuals_CardIndicator.__super__ = openfl_display_Sprite;
com_watabou_sevendrl_visuals_CardIndicator.prototype = $extend(openfl_display_Sprite.prototype,{

	/**
	 * Update the indicator to reflect the given action card's power.
	 *
	 * Pin 1 is always on (every card has at least 1 power).
	 * Pin 2 lights up for NORMAL and STRONG cards.
	 * Pin 3 lights up only for STRONG cards.
	 *
	 * @param {string} card - An ActionCard enum value
	 *                        (e.g. ActionCard.WEAK, NORMAL, STRONG).
	 */
	setCard: function(card) {
		// ╔══ EXTENSION POINT: [Card Visuals SWAP POINT] ────────────────
		// ║ What: setCard() — swap or extend the card indicator visuals
		// ║ How:  Replace the pin1/pin2/pin3.on() calls with custom
		// ║       sprites, animations, or additional card state visuals.
		// ╚═════════════════════════════════════════════════════════════════
		this.pin1.on(true);
		this.pin2.on(card == com_watabou_sevendrl_ActionCard.NORMAL || card == com_watabou_sevendrl_ActionCard.STRONG);
		this.pin3.on(card == com_watabou_sevendrl_ActionCard.STRONG);
	}
	,__class__: com_watabou_sevendrl_visuals_CardIndicator
});

// ─── StatePin (com.watabou.sevendrl.visuals.StatePin) ─── line 7784 ───
/**
 * A single on/off indicator pin with animated transitions.
 *
 * Renders a 30×30 rounded rectangle. The "base" layer is always visible
 * in a dark colour (0x222223). A lighter overlay layer (0xDDDDFF) fades
 * in when the pin is "on" and fades out when "off", producing a soft
 * glowing indicator effect.
 *
 * Used internally by {@link CardIndicator}.
 *
 * @class StatePin
 * @extends openfl.display.Sprite
 */
var com_watabou_sevendrl_visuals_StatePin = function(txt) {
	openfl_display_Sprite.call(this);

	// Dark base rectangle (always visible).
	this.get_graphics().beginFill(2236979);  // 0x222223 — near-black
	this.get_graphics().drawRoundRect(0,0,30,30,4);

	// Light overlay rectangle (toggled on/off via alpha animation).
	this.light = new openfl_display_Sprite();
	this.light.get_graphics().beginFill(14544639);  // 0xDDDDFF — pale blue-white
	this.light.get_graphics().drawRoundRect(0,0,30,30,4);
	this.state = this.light.set_visible(false);  // starts off (hidden)
	this.addChild(this.light);
};
$hxClasses["com.watabou.sevendrl.visuals.StatePin"] = com_watabou_sevendrl_visuals_StatePin;
com_watabou_sevendrl_visuals_StatePin.__name__ = "com.watabou.sevendrl.visuals.StatePin";
com_watabou_sevendrl_visuals_StatePin.__super__ = openfl_display_Sprite;
com_watabou_sevendrl_visuals_StatePin.prototype = $extend(openfl_display_Sprite.prototype,{

	/**
	 * Set the pin's on/off state with an animated transition.
	 *
	 * If the requested state differs from the current state, any running
	 * animation is cancelled and a new 0.2-second smoothstep tween is
	 * started:
	 *   - Turning on:  alpha animates 0 → 1 (smoothstep).
	 *   - Turning off: alpha animates 1 → 0 (smoothstep), then the
	 *     light layer is hidden when the tween completes.
	 *
	 * @param {boolean} value - true = on (lit), false = off (dark).
	 */
	on: function(value) {
		var _gthis = this;
		if(value != this.state) {
			this.state = value;
			if(this.tweener != null) {
				this.tweener.stop();
			}
			this.light.set_visible(true);
			if(this.state) {
				// ╔══ EXTENSION POINT: [Pin Animation Customization] ────────
				// ║ What: StatePin.on() — customize pin on/off transition
				// ║ How:  Change the Tweener duration (currently 0.2s), easing,
				// ║       or add glow/pulse effects for the on state.
				// ╚═════════════════════════════════════════════════════════════════
				// Fade in with smoothstep easing
				this.tweener = com_watabou_processes_Tweener.run(0.2,function(e) {
					_gthis.light.set_alpha(e * e * (3 - 2 * e));
				});
			} else {
				// Fade out with smoothstep easing, then hide the layer
				this.tweener = com_watabou_processes_Tweener.run(0.2,function(e) {
					_gthis.light.set_alpha(1 - e * e * (3 - 2 * e));
				});
				this.tweener.onComplete(function() {
					_gthis.light.set_visible(false);
				});
			}
		}
	}
	,__class__: com_watabou_sevendrl_visuals_StatePin
});

// ─── CenteredText (com.watabou.sevendrl.visuals.CenteredText) ─── line 9584 ───
/**
 * A TextField subclass that auto-centres its text within a given width.
 *
 * After calling {@link CenteredText#setWidth}, the field will:
 *   - If the text fits on one line: shrink width to the actual text width.
 *   - If the text wraps to multiple lines: iteratively narrow the width
 *     by 4px steps until the minimum number of lines is achieved, then
 *     locks the dimensions.
 *
 * Mouse interaction is disabled — this is purely a display element.
 *
 * @class CenteredText
 * @extends openfl.text.TextField
 *
 * @param {string}              txt    - The initial text content.
 * @param {openfl.text.TextFormat} format - The text format to apply.
 */
var com_watabou_sevendrl_visuals_CenteredText = function(txt,format) {
	openfl_text_TextField.call(this);
	this.set_defaultTextFormat(format);
	this.set_text(txt);
	this.set_wordWrap(true);
	this.mouseEnabled = false;
};
$hxClasses["com.watabou.sevendrl.visuals.CenteredText"] = com_watabou_sevendrl_visuals_CenteredText;
com_watabou_sevendrl_visuals_CenteredText.__name__ = "com.watabou.sevendrl.visuals.CenteredText";
com_watabou_sevendrl_visuals_CenteredText.__super__ = openfl_text_TextField;
com_watabou_sevendrl_visuals_CenteredText.prototype = $extend(openfl_text_TextField.prototype,{

	/**
	 * Adjust this text field's width so that it wraps to the narrowest
	 * possible rectangle while keeping the same number of lines.
	 *
	 * For single-line text the width snaps to the actual text width + 4px
	 * padding. For multi-line text the width is iteratively reduced by
	 * `step` pixels until the line count would change, then stepped back
	 * one increment and the final dimensions are locked.
	 *
	 * @param {number} maxWidth - The maximum allowed width in pixels.
	 */
	setWidth: function(maxWidth) {
		this.set_autoSize(1);       // autoSize = LEFT — allow text to set height
		this.set_width(maxWidth);   // constrain to max width

		var nLines = this.get_numLines();
		if(nLines > 1) {
			// Multi-line: find the narrowest width that keeps nLines.
			// Shrinks by 4px at a time until line count changes.
			var step = 4;
			while(true) {
				this.set_width(this.get_width() - step);
				if(!(this.get_numLines() == nLines)) {
					break;
				}
			}
			// Step back one increment so we don't exceed nLines
			this.set_width(this.get_width() + step);

			// Lock the calculated dimensions
			var w = this.get_width();
			var h = Math.ceil(this.get_height());
			this.set_autoSize(2);   // autoSize = NONE — fixed dimensions
			this.set_width(w);
			this.set_height(h);
		} else {
			// Single line: shrink to actual text width with small padding
			this.set_width(this.get_textWidth() + 4);
		}
	}
	,__class__: com_watabou_sevendrl_visuals_CenteredText
});

// ─── CharacterSprite (com.watabou.sevendrl.visuals.CharacterSprite) ─── line 9619 ───
/**
 * An AsciiSprite subclass that represents a game character on the map.
 *
 * Ties a visual sprite to a {@link Character} model object and provides
 * two animation styles for movement:
 *   - {@link CharacterSprite#move}    – smooth linear interpolation (0.2s).
 *   - {@link CharacterSprite#engage}  – lunge animation with an elastic
 *                                        in-and-back curve (0.2s).
 *
 * The character's `sprite` property is set to this instance on creation,
 * establishing a two-way binding between the model and the view.
 *
 * @class CharacterSprite
 * @extends AsciiSprite
 *
 * @param {Character} character - The game character model this sprite represents.
 * @param {string}    ch        - The ASCII glyph to render (e.g. '@' for the player).
 * @param {boolean}   [mono=true] - If true, use the monospace font.
 */
var com_watabou_sevendrl_visuals_CharacterSprite = function(character,ch,mono) {
	if(mono == null) {
		mono = true;
	}
	com_watabou_sevendrl_visuals_AsciiSprite.call(this,ch,mono);
	this.character = character;
	character.sprite = this;  // two-way binding: model ↔ view
};
$hxClasses["com.watabou.sevendrl.visuals.CharacterSprite"] = com_watabou_sevendrl_visuals_CharacterSprite;
com_watabou_sevendrl_visuals_CharacterSprite.__name__ = "com.watabou.sevendrl.visuals.CharacterSprite";
com_watabou_sevendrl_visuals_CharacterSprite.__super__ = com_watabou_sevendrl_visuals_AsciiSprite;
com_watabou_sevendrl_visuals_CharacterSprite.prototype = $extend(com_watabou_sevendrl_visuals_AsciiSprite.prototype,{

	/**
	 * Immediately snap the sprite to the character's current tile position.
	 * No animation — the sprite teleports.
	 */
	place: function() {
		this.setPos(this.character.pos.i,this.character.pos.j);
	}

	/**
	 * Animate the sprite from one tile position to another (linear).
	 *
	 * Interpolates both row (i) and column (j) coordinates using the
	 * tweener's progress value `e` (0 → 1 over 0.2 seconds).
	 *
	 * @param {{i: number, j: number}} from - Starting tile position.
	 * @param {{i: number, j: number}} to   - Ending tile position.
	 * @returns {Tweener} The running tweener instance.
	 */
	,move: function(from,to) {
		var _gthis = this;
		// ╔══ EXTENSION POINT: [Movement Speed Customization] ────────────
		// ║ What: move() — customize character movement animation speed
		// ║ How:  Change the Tweener duration (currently 0.2s) and easing
		// ║       function for faster/slower or stylized movement.
		// ╚═════════════════════════════════════════════════════════════════
		return com_watabou_processes_Tweener.run(0.2,function(e) {
			var a = from.i;
			var p = e;
			if(p == null) {
				p = 0.5;
			}
			var a1 = from.j;
			var p1 = e;
			if(p1 == null) {
				p1 = 0.5;
			}
			_gthis.setPos(a + (to.i - a) * p,a1 + (to.j - a1) * p1);
		});
	}

	/**
	 * Engage animation: a quick lunge toward the target and back.
	 *
	 * The sprite moves halfway to the target, then returns — creating
	 * a "thrust" or "attack" feel. Uses an elastic easing:
	 *   `pow(sin(t * π) if t < 0.5, 2) * 0.5`
	 * which produces a sharp peak at the midpoint.
	 *
	 * @param {{i: number, j: number}} from - Starting tile position.
	 * @param {{i: number, j: number}} to   - Target tile position.
	 * @returns {Tweener} The running tweener instance.
	 */
	,engage: function(from,to) {
		var _gthis = this;
		// ╔══ EXTENSION POINT: [Attack Animation Customization] ──────────
		// ║ What: engage() — customize attack/lunge animation
		// ║ How:  Change the Tweener duration (currently 0.2s), easing,
		// ║       or replace with a completely different animation style.
		// ╚═════════════════════════════════════════════════════════════════
		return com_watabou_processes_Tweener.run(0.2,function(e) {
			e = Math.pow(e < 0.5 ? e * 2 : 2 - 2 * e,2) * 0.5;
			var a = from.i;
			var p = e;
			if(p == null) {
				p = 0.5;
			}
			var a1 = from.j;
			var p1 = e;
			if(p1 == null) {
				p1 = 0.5;
			}
			_gthis.setPos(a + (to.i - a) * p,a1 + (to.j - a1) * p1);
		});
	}
	,__class__: com_watabou_sevendrl_visuals_CharacterSprite
});

// ─── Fader (com.watabou.sevendrl.visuals.Fader) ─── line 14073 ───
/**
 * Full-screen overlay used for scene transitions.
 *
 * Renders a single-pixel {@link Bitmap} that is stretched to cover the
 * viewport via {@link Fader#setSize}. Supports smooth fade-in (opaque →
 * transparent) and fade-out (transparent → opaque) over 0.6 seconds.
 *
 * Typical usage:
 *   1. Place the Fader as the topmost child of the scene.
 *   2. Call `fadeOut()` to black out the screen (e.g. before a scene change).
 *   3. In the completion callback, swap scenes.
 *   4. Call `fadeIn()` to reveal the new scene.
 *
 * @class Fader
 * @extends openfl.display.Bitmap
 */
var com_watabou_sevendrl_visuals_Fader = function() {
	openfl_display_Bitmap.call(this,com_watabou_sevendrl_visuals_Fader.pixel);
};
$hxClasses["com.watabou.sevendrl.visuals.Fader"] = com_watabou_sevendrl_visuals_Fader;
com_watabou_sevendrl_visuals_Fader.__name__ = "com.watabou.sevendrl.visuals.Fader";
com_watabou_sevendrl_visuals_Fader.__super__ = openfl_display_Bitmap;
com_watabou_sevendrl_visuals_Fader.prototype = $extend(openfl_display_Bitmap.prototype,{

	/**
	 * Stretch this bitmap to the given dimensions so it covers the screen.
	 *
	 * @param {number} w - Width in pixels (typically the stage width).
	 * @param {number} h - Height in pixels (typically the stage height).
	 */
	setSize: function(w,h) {
		this.set_width(w);
		this.set_height(h);
	}

	/**
	 * Fade the screen from opaque black to transparent, revealing the
	 * content beneath.
	 *
	 * Any running fade is cancelled first. The overlay is made visible,
	 * then its alpha is tweened from 1 → 0 over 0.6 seconds.
	 *
	 * @param {Function} [onComplete] - Optional callback invoked when the
	 *                                   fade-in finishes.
	 * @returns {Tweener} The running tweener instance.
	 */
	,fadeIn: function(onComplete) {
		var _gthis = this;
		this.cancel();
		this.set_visible(true);
		// ╔══ EXTENSION POINT: [Transition Speed Customization] ──────────
		// ║ What: Fader.fadeIn — customize scene fade-in duration/easing
		// ║ How:  Change Tweener.run() duration (currently 0.6s) and the
		// ║       easing function for custom transition effects.
		// ╚═════════════════════════════════════════════════════════════════
		this.tweener = com_watabou_processes_Tweener.run(0.6,function(e) {
			_gthis.set_alpha(1 - e);   // alpha goes from 1 (opaque) to 0 (transparent)
		});
		this.tweener.onComplete(function() {
			if(onComplete != null) {
				onComplete();
			}
		});
		return this.tweener;
	}

	/**
	 * Fade the screen from transparent to opaque black, hiding the
	 * content beneath.
	 *
	 * Any running fade is cancelled first. The overlay is made visible,
	 * then its alpha is tweened from 0 → 1 over 0.6 seconds. The overlay
	 * is hidden after the fade completes.
	 *
	 * @param {Function} [onComplete] - Optional callback invoked when the
	 *                                   fade-out finishes.
	 * @returns {Tweener} The running tweener instance.
	 */
	,fadeOut: function(onComplete) {
		var _gthis = this;
		this.cancel();
		this.set_visible(true);
		// ╔══ EXTENSION POINT: [Transition Speed Customization] ──────────
		// ║ What: Fader.fadeOut — customize scene fade-out duration/easing
		// ║ How:  Change Tweener.run() duration (currently 0.6s) and the
		// ║       easing function for custom transition effects.
		// ╚═════════════════════════════════════════════════════════════════
		this.tweener = com_watabou_processes_Tweener.run(0.6,function(e) {
			_gthis.set_alpha(e);       // alpha goes from 0 (transparent) to 1 (opaque)
		});
		this.tweener.onComplete(function() {
			_gthis.set_visible(false); // hide overlay after fade-out
			if(onComplete != null) {
				onComplete();
			}
		});
		return this.tweener;
	}

	/**
	 * Cancel any in-progress fade animation.
	 * Safe to call when no animation is running.
	 */
	,cancel: function() {
		if(this.tweener != null) {
			this.tweener.stop();
			this.tweener = null;
		}
	}
	,__class__: com_watabou_sevendrl_visuals_Fader
});

// ─── Indicator (com.watabou.sevendrl.visuals.Indicator) ─── line 14121 ───
/**
 * A horizontal or vertical bar of coloured {@link Unit} rectangles.
 *
 * Used for HUD elements such as health bars or clue counters. Each unit
 * is spaced 28px apart. The layout direction depends on `l2r`:
 *   - `true`:  units extend to the right (left-to-right, for health).
 *   - `false`: units extend to the left (right-to-left, for clues).
 *
 * Call {@link Indicator#setLevel} to update which units are "lit".
 *
 * @class Indicator
 * @extends openfl.display.Sprite
 *
 * @param {number} max   - Total number of units (maximum possible value).
 * @param {number} color - ARGB colour for the "on" state of each unit.
 * @param {boolean} l2r  - If true, units are laid out left-to-right;
 *                          if false, right-to-left.
 */
var com_watabou_sevendrl_visuals_Indicator = function(max,color,l2r) {
	openfl_display_Sprite.call(this);
	var _g = [];
	var _g1 = 0;
	var _g2 = max;
	while(_g1 < _g2) {
		var i = _g1++;
		var unit = new com_watabou_sevendrl_visuals_Unit(color);
		// Position units in a row; l2r determines direction
		unit.set_x(l2r ? i * 28 : -(i + 1) * 28);
		this.addChild(unit);
		_g.push(unit);
	}
	this.units = _g;
};
$hxClasses["com.watabou.sevendrl.visuals.Indicator"] = com_watabou_sevendrl_visuals_Indicator;
com_watabou_sevendrl_visuals_Indicator.__name__ = "com.watabou.sevendrl.visuals.Indicator";
com_watabou_sevendrl_visuals_Indicator.__super__ = openfl_display_Sprite;
com_watabou_sevendrl_visuals_Indicator.prototype = $extend(openfl_display_Sprite.prototype,{

	/**
	 * Update the lit/unlit state of each unit.
	 *
	 * Units at indices 0 through `value - 1` are turned on; the rest
	 * are turned off. This creates a "fill from the left" visual where
	 * more units = higher value.
	 *
	 * @param {number} value - The current value (e.g. current HP or clue count).
	 */
	setLevel: function(value) {
		// ╔══ EXTENSION POINT: [HUD Update Hook] ────────────────────────
		// ║ What: Indicator.setLevel — customize HUD bar update behavior
		// ║ How:  Add animations, sound effects, or threshold callbacks
		// ║       when the indicator level changes.
		// ╚═════════════════════════════════════════════════════════════════
		var _g = 0;
		var _g1 = this.units.length;
		while(_g < _g1) {
			var i = _g++;
			this.units[i].on(i < value);
		}
	}
	,__class__: com_watabou_sevendrl_visuals_Indicator
});

// ─── Unit (com.watabou.sevendrl.visuals.Unit) ─── line 14149 ───
/**
 * A single coloured rectangle used as a building block inside an {@link Indicator}.
 *
 * Renders a 20×30 rounded rectangle. When "on" it is filled with the
 * configured colour; when "off" it uses the dark default (0x222223).
 * The graphics are fully redrawn on each state change to avoid
 * alpha stacking issues.
 *
 * @class Unit
 * @extends openfl.display.Sprite
 *
 * @param {number} color - ARGB colour to use when this unit is "on".
 */
var com_watabou_sevendrl_visuals_Unit = function(color) {
	openfl_display_Sprite.call(this);
	this.color = color;
};
$hxClasses["com.watabou.sevendrl.visuals.Unit"] = com_watabou_sevendrl_visuals_Unit;
com_watabou_sevendrl_visuals_Unit.__name__ = "com.watabou.sevendrl.visuals.Unit";
com_watabou_sevendrl_visuals_Unit.__super__ = openfl_display_Sprite;
com_watabou_sevendrl_visuals_Unit.prototype = $extend(openfl_display_Sprite.prototype,{

	/**
	 * Set this unit's visual state.
	 *
	 * Clears and redraws the rectangle with either the "on" colour
	 * (this.color) or the "off" colour (0x222223 — dark).
	 *
	 * @param {boolean} value - true = lit (on colour), false = dark (off colour).
	 */
	on: function(value) {
		this.get_graphics().clear();
		var tmp = value ? this.color : 2236979;  // 0x222223 = off colour
		// ╔══ EXTENSION POINT: [Indicator Color SWAP POINT] ─────────────
		// ║ What: Unit.on() — swap indicator fill colors
		// ║ How:  Replace the beginFill color values or use gradients,
		// ║       patterns, or animated color transitions instead.
		// ╚═════════════════════════════════════════════════════════════════
		this.get_graphics().beginFill(tmp);
		this.get_graphics().drawRoundRect(0,0,20,30,4);
	}
	,__class__: com_watabou_sevendrl_visuals_Unit
});

// ─── Toast (com.watabou.sevendrl.visuals.Toast) ─── line 14165 ───
/**
 * A temporary on-screen message that automatically fades out and removes itself.
 *
 * Extends {@link CenteredText} with a timed lifecycle:
 *   - 0–3 seconds (75% of the 4s total): fully visible (alpha = 1).
 *   - 3–4 seconds: fades out using smoothstep easing.
 *   - After 4 seconds: removed from the display list.
 *
 * Toast messages are fire-and-forget — once created, they handle their
 * own cleanup.
 *
 * @class Toast
 * @extends CenteredText
 *
 * @param {string} txt      - The message text to display.
 * @param {number} maxWidth - Maximum width in pixels; the text field will
 *                            auto-centre within this width.
 */
var com_watabou_sevendrl_visuals_Toast = function(txt,maxWidth) {
	var _gthis = this;
	com_watabou_sevendrl_visuals_CenteredText.call(this,txt,com_watabou_sevendrl_Style.formatToast);
	this.setWidth(maxWidth);

	// ╔══ EXTENSION POINT: [Message Duration Customization] ────────────
	// ║ What: Toast constructor — customize toast display duration
	// ║ How:  Change the Tweener.run() duration (currently 4s) and the
	// ║       fade-out threshold (currently 0.75) to control timing.
	// ╚═════════════════════════════════════════════════════════════════
	// 4-second lifecycle: 3s fully visible, then 1s fade out.
	com_watabou_processes_Tweener.run(4.,function(e) {
		var tmp;
		if(e < 0.75) {
			// First 75% of the animation: fully opaque
			tmp = 1;
		} else {
			// Last 25%: fade out with smoothstep
			// Remap e from [0.75, 1.0] → [0, 1] for the fade
			var x = 1 - (4. * e - 3.0) / 1.0;
			tmp = x * x * (3 - 2 * x);
		}
		_gthis.set_alpha(tmp);
	}).onComplete(function() {
		// Remove the toast from its parent when the animation finishes
		if(_gthis.parent != null) {
			_gthis.parent.removeChild(_gthis);
		}
	});
};
$hxClasses["com.watabou.sevendrl.visuals.Toast"] = com_watabou_sevendrl_visuals_Toast;
com_watabou_sevendrl_visuals_Toast.__name__ = "com.watabou.sevendrl.visuals.Toast";
com_watabou_sevendrl_visuals_Toast.__super__ = com_watabou_sevendrl_visuals_CenteredText;
com_watabou_sevendrl_visuals_Toast.prototype = $extend(com_watabou_sevendrl_visuals_CenteredText.prototype,{
	__class__: com_watabou_sevendrl_visuals_Toast
});

// ─── Window (com.watabou.sevendrl.visuals.Window) ─── line 14190 ───
/**
 * Modal popup window with a title, body text, and "click to close" prompt.
 *
 * Renders a dark rectangle with a light border. Content is vertically
 * stacked and horizontally centred:
 *   1. Title text (styled with formatTitle)
 *   2. Body text (styled with formatText, auto-wrapped to maxWidth)
 *   3. "Click to close..." prompt (styled with formatService)
 *
 * Clicking anywhere on the window fires the {@link Window#click} signal.
 * The caller can listen to this signal to dismiss the window and proceed
 * with game logic.
 *
 * @class Window
 * @extends openfl.display.Sprite
 *
 * @param {string} title    - The window title.
 * @param {string} text     - The body message.
 * @param {number} maxWidth - Maximum width for the body text wrapping.
 */
var com_watabou_sevendrl_visuals_Window = function(title,text,maxWidth) {
	// Signal dispatched when the window is clicked.
	// ╔══ EXTENSION POINT: [Popup Event Hook] ─────────────────────────
	// ║ What: Window constructor — customize window signal dispatch
	// ║ How:  Add additional signals (onOpen, onClose), extend the click
	// ║       signal, or add custom event listeners to the window.
	// ╚═════════════════════════════════════════════════════════════════
	this.click = new msignal_Signal0();
	var _gthis = this;
	openfl_display_Sprite.call(this);

	// Title — created via the Coogee UI utility with the game's title format.
	this.tfTitle = com_watabou_coogee_ui_utils_Text.get(title,com_watabou_sevendrl_Style.formatTitle);
	this.addChild(this.tfTitle);

	// Body text — uses CenteredText so it auto-centres within maxWidth.
	this.tfText = new com_watabou_sevendrl_visuals_CenteredText(text,com_watabou_sevendrl_Style.formatText);
	this.tfText.setWidth(maxWidth);
	this.addChild(this.tfText);

	// "Click to close..." hint at the bottom.
	this.tfClick = com_watabou_coogee_ui_utils_Text.get("Click to close...",com_watabou_sevendrl_Style.formatService);
	this.addChild(this.tfClick);

	// Compute overall dimensions from the content children.
	var width = Math.max(this.tfTitle.get_width(),Math.max(this.tfText.get_width(),this.tfClick.get_width())) + 40.;  // 40px horizontal padding
	var height = this.tfTitle.get_height() + this.tfText.get_height() + this.tfClick.get_height() + 80.;  // 80px vertical padding

	// Centre each text element horizontally within the computed width.
	this.tfTitle.set_x((width - this.tfTitle.get_width()) / 2);
	this.tfTitle.set_y(20.0);

	this.tfText.set_x((width - this.tfText.get_width()) / 2);
	this.tfText.set_y(this.tfTitle.get_y() + this.tfTitle.get_height() + 20.0);

	this.tfClick.set_x((width - this.tfClick.get_width()) / 2);
	this.tfClick.set_y(this.tfText.get_y() + this.tfText.get_height() + 20.0);

	// Draw the window background: dark fill (0x111112) with a light border (0xDDDDFF).
	this.get_graphics().lineStyle(4,14544639,null,null,null,2,1);   // 4px border in 0xDDDDFF
	this.get_graphics().beginFill(1118498);                          // fill 0x111112 (near-black)
	this.get_graphics().drawRect(0,0,width,height);

	// Listen for clicks and dispatch the signal.
	this.addEventListener("click",function(e) {
		_gthis.click.dispatch();
	});
};
$hxClasses["com.watabou.sevendrl.visuals.Window"] = com_watabou_sevendrl_visuals_Window;
com_watabou_sevendrl_visuals_Window.__name__ = "com.watabou.sevendrl.visuals.Window";
com_watabou_sevendrl_visuals_Window.__super__ = openfl_display_Sprite;
com_watabou_sevendrl_visuals_Window.prototype = $extend(openfl_display_Sprite.prototype,{
	__class__: com_watabou_sevendrl_visuals_Window
});

// -- Static initializers relocated from runtime/base.js (modules/DECISIONS.md, Bug E) --
com_watabou_sevendrl_visuals_StatePin.W = 30;
com_watabou_sevendrl_visuals_StatePin.H = 30;
com_watabou_sevendrl_visuals_Fader.TIME = 0.6;
com_watabou_sevendrl_visuals_Fader.pixel = new openfl_display_BitmapData(1,1,false,1118498);
com_watabou_sevendrl_visuals_Indicator.GAP = 8;
com_watabou_sevendrl_visuals_Unit.W = 20;
com_watabou_sevendrl_visuals_Unit.H = 30;
com_watabou_sevendrl_visuals_Toast.TIME0 = 3.0;
com_watabou_sevendrl_visuals_Toast.TIME1 = 1.0;
com_watabou_sevendrl_visuals_Toast.TIME = 4.;


// -- Window exports (per module-manifest.json) --
// See modules/DECISIONS.md, Bug B: these were private module-scope
// vars with no export/import/window assignment anywhere.
window.com_watabou_sevendrl_visuals_AsciiSprite = com_watabou_sevendrl_visuals_AsciiSprite;
window.com_watabou_sevendrl_visuals_CardIndicator = com_watabou_sevendrl_visuals_CardIndicator;
window.com_watabou_sevendrl_visuals_StatePin = com_watabou_sevendrl_visuals_StatePin;
window.com_watabou_sevendrl_visuals_CenteredText = com_watabou_sevendrl_visuals_CenteredText;
window.com_watabou_sevendrl_visuals_CharacterSprite = com_watabou_sevendrl_visuals_CharacterSprite;
window.com_watabou_sevendrl_visuals_Fader = com_watabou_sevendrl_visuals_Fader;
window.com_watabou_sevendrl_visuals_Indicator = com_watabou_sevendrl_visuals_Indicator;
window.com_watabou_sevendrl_visuals_Unit = com_watabou_sevendrl_visuals_Unit;
window.com_watabou_sevendrl_visuals_Toast = com_watabou_sevendrl_visuals_Toast;
window.com_watabou_sevendrl_visuals_Window = com_watabou_sevendrl_visuals_Window;



// ═══ END modules/core/visuals.js ═══
