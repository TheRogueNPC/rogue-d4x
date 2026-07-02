// ═══════════════════════════════════════════════════════════════════
// MOD: add-sound.js — Register and use custom sound effects
// Requires: .ogg file placed in ../assets/
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ╔══ Extension Point: Register custom sound assets ────────────
    // ║ The game's asset manifest is baked into SevenDRL.js.
    // ║ For new sounds, we patch the asset resolution at runtime.
    // ╚════════════════════════════════════════════════════════════════
    //
    // Usage:
    //   1. Put your .ogg file in: dark-clues/assets/my_sound.ogg
    //   2. Call this to register it:
    //      registerSound("my_sound", "assets/my_sound.ogg")
    //   3. Play it from game code:
    //      com_watabou_sevendrl_Sounds.event("my_sound")

    window.__soundRegistry = {};

    // Patch asset loading to resolve custom sound IDs
    var _origGetSound = openfl_utils_Assets.getSound;
    if (_origGetSound) {
        openfl_utils_Assets.getSound = function(id) {
            if (window.__soundRegistry[id]) {
                return _origGetSound.call(this, window.__soundRegistry[id]);
            }
            return _origGetSound.call(this, id);
        };
        if (window.devLog) window.devLog('[add-sound] Assets.getSound patched for custom IDs');
    }

    // Helper to register a custom sound
    window.registerSound = function(id, filepath) {
        window.__soundRegistry[id] = filepath;
        if (window.devLog) window.devLog('Sound registered:', id, '->', filepath);
    };

    // ╔══ Example: Register a custom sound ─────────────────────────
    // ║ Uncomment if you have the .ogg file in assets/
    // ╚════════════════════════════════════════════════════════════════
    // registerSound("level_up",   "assets/level_up.ogg");
    // registerSound("teleport",   "assets/teleport.ogg");
    // registerSound("item_pickup","assets/item_pickup.ogg");

    if (window.devLog) window.devLog('[mod:add-sound] loaded — use registerSound(id, path)');
    if (window.devLog) window.devLog('  Then play: Sounds.event("your_id") from any mod');
})();