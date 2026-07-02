// ═══════════════════════════════════════════════════════════════════
// STYLE — modules/core/style.js
// Extracted from SevenDRL.js by extract-seven-drl.js
// Classes: Style
// ═══════════════════════════════════════════════════════════════════

/**
 * Style — Static text-format definitions used across the Dark Clues UI.
 *
 * Every format is built with the engine's `Text.format` helper using
 * the `"default"` font and a white colour of `0xDDEEFF` (decimal 14544639).
 *
 * | Property        | Size | Purpose                                |
 * |-----------------|------|----------------------------------------|
 * | `formatTitle`   | 40pt | Main title / heading text              |
 * | `formatToast`   | 36pt | In-game toast / notification messages  |
 * | `formatText`    | 24pt | General body / description text        |
 * | `formatService` | 18pt | Small service / status-line text       |
 *
 * Both `formatToast` and `formatText` have their alignment set to
 * centre (value `0`) in `init()`.
 *
 * All properties are static and should be initialised once via
 * `Style.init()` before any UI rendering occurs.
 *
 * @class Style
 */
var com_watabou_sevendrl_Style = function() { };

$hxClasses["com.watabou.sevendrl.Style"] = com_watabou_sevendrl_Style;
com_watabou_sevendrl_Style.__name__ = "com.watabou.sevendrl.Style";

/**
 * Initialise all text format constants.
 *
 * Must be called once during startup (before any text fields are created)
 * so that the format objects are populated and ready for use.
 *
 * @returns {void}
 */
com_watabou_sevendrl_Style.init = function() {
	// ╔══ EXTENSION POINT: [Rendering] ─────────────────────────────
	// ║ What: SWAP POINT for fonts, colors, sizes
	// ║ How:  Replace the font name ("default"), sizes (40/18/36/24),
	// ║       or color (14544639 = 0xDDEEFF) below to re-theme the
	// ║       entire game UI. Each format can be customized independently.
	// ╚═════════════════════════════════════════════════════════════════
	// 40pt title format — large white heading text.
	com_watabou_sevendrl_Style.formatTitle = com_watabou_coogee_ui_utils_Text.format("default",40,14544639);

	// 18pt service format — small white status / label text.
	com_watabou_sevendrl_Style.formatService = com_watabou_coogee_ui_utils_Text.format("default",18,14544639);

	// 36pt toast format — medium-large white notification text.
	com_watabou_sevendrl_Style.formatToast = com_watabou_coogee_ui_utils_Text.format("default",36,14544639);

	// 24pt text format — standard white body text.
	com_watabou_sevendrl_Style.formatText = com_watabou_coogee_ui_utils_Text.format("default",24,14544639);
	// ╔══ EXTENSION POINT: [Rendering] ─────────────────────────────
	// ║ What: Theme customization (color constants)
	// ║ How:  The color 14544639 (0xDDEEFF) above defines the global
	// ║       text color. Change it per-format or define palette
	// ║       constants (e.g. STYLE_COLOR_PRIMARY, STYLE_COLOR_ACCENT)
	// ║       for a consistent theme system.
	// ╚═════════════════════════════════════════════════════════════════

	// Centre-align both toast and body text (align value 0 = centre).
	com_watabou_sevendrl_Style.formatToast.align = com_watabou_sevendrl_Style.formatText.align = 0;
};

// -- Static initializers relocated from runtime/base.js (modules/DECISIONS.md, Bug E) --
com_watabou_sevendrl_Style.BG = 1118498;
com_watabou_sevendrl_Style.FLOOR = 2236979;
com_watabou_sevendrl_Style.DARK = 7833736;
com_watabou_sevendrl_Style.LIGHT = 16772812;
com_watabou_sevendrl_Style.GHOST = 13430527;
com_watabou_sevendrl_Style.SPECTRE = 13434845;
com_watabou_sevendrl_Style.CLUE = 6710954;
com_watabou_sevendrl_Style.UI = 14544639;
com_watabou_sevendrl_Style.GAP = 20.0;


// -- Window exports (per module-manifest.json) --
// See modules/DECISIONS.md, Bug B: these were private module-scope
// vars with no export/import/window assignment anywhere.
window.com_watabou_sevendrl_Style = com_watabou_sevendrl_Style;



// ═══ END modules/core/style.js ═══
