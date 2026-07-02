// ═══════════════════════════════════════════════════════════════════
// MOD: retheme.js — Customize colors, fonts, and visual style
// Hooks into Style.init() and character createSprite() methods.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ── Example: Warm amber/sepia theme ────────────
    // Uncomment and adjust values to apply.
    var THEME = {
        BG:      0x1A0F0A,  // very dark brown (background)
        FLOOR:   0x4A3520,  // medium brown (floor tiles)
        DARK:    0x2A1A0F,  // dark brown (walls/shadow)
        LIGHT:   0x6B4F30,  // lighter brown (lit tiles)
        GHOST:   0xCC6633,  // orange (ghost entities)
        SPECTRE: 0xDD8844,  // amber (spectre entities)
        CLUE:    0xFFCC44,  // gold (clue items)
        UI:      0xFFDD88,  // warm gold (UI text)
        FONT:    0xFFDD88,  // warm gold (body text)
        TITLE:   0xFFCC44,  // gold (title text)
        DEATH:   0xFF3333,  // red (death screen)
    };

    // ╔══ EXTENSION POINT: Style Override ───────────────────────────
    // ║ Replaces font size/color after Style.init()
    // ╚════════════════════════════════════════════════════════════════
    ModLoader.hook(com_watabou_sevendrl_Style, 'init', null, function() {
        // Override text format colors
        var fmt = function(name, size, color) {
            return com_watabou_coogee_ui_utils_Text.format("default", size, color);
        };

        com_watabou_sevendrl_Style.formatTitle   = fmt("default", 40, THEME.TITLE);
        com_watabou_sevendrl_Style.formatService  = fmt("default", 18, THEME.UI);
        com_watabou_sevendrl_Style.formatToast    = fmt("default", 36, THEME.UI);
        com_watabou_sevendrl_Style.formatText     = fmt("default", 24, THEME.FONT);

        if (window.devLog) window.devLog('[retheme] Style overridden — warm amber theme');
    });

    // ╔══ EXTENSION POINT: Sprite Colors ────────────────────────────
    // ║ Each mob type sets its glyph color in createSprite().
    // ║ We patch after construction to override colors.
    // ╚════════════════════════════════════════════════════════════════

    // ── Example: Change Wanderer glyph color ─────
    ModLoader.hook('com.watabou.sevendrl.characters.Wanderer', 'createSprite', null, function() {
        if (this.sprite && this.sprite.tf) {
            this.sprite.tf.set_textColor(THEME.GHOST);
        }
    });

    if (window.devLog) window.devLog('[mod:retheme] loaded — uncomment THEME to activate');
})();