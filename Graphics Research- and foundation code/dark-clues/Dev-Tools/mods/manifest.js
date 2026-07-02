// ═══════════════════════════════════════════════════════════════════
// Dev-Tools/mods/manifest.js — Mod Loader Manifest
// Add .js mods to ACTIVE list below. Order matters.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.MOD_MANIFEST = [
        // ═══ Asset path fixer (must be first — patches before game boots) ═══
        "/Dev-Tools/mods/asset-fixer.js",

        // ═══ Core (always load, order matters) ═══
        "/Dev-Tools/mods/loader.js",
        "/Dev-Tools/mods/game.js",
        "/Dev-Tools/mods/characters.js",
        "/Dev-Tools/mods/scenes.js",
        "/Dev-Tools/mods/debug.js",
        "/Dev-Tools/mods/eventlog.js",
        "/Dev-Tools/mods/zombies.js",
        "/Dev-Tools/mods/rogue-api.js",       // Unified modder API (Mob, Encounter, Ability, UI)
        "/Dev-Tools/mods/char-creator.js",    // Character creator overlay
        "/Dev-Tools/mods/pause-menu.js",
        "/Dev-Tools/mods/ability.js",
        "/Dev-Tools/mods/ability-pickup.js",  // Chess piece ability pickups
        "/Dev-Tools/mods/play.js",
        "/Dev-Tools/mods/title-menu.js",      // Canvas title screen menu (New Game/Continue/Options/DLC)
        "/Dev-Tools/mods/hud-bars.js",         // Canvas-native left-side status bars
        "/Dev-Tools/mods/view-mode.js",       // Top-down / Isometric / Side view modes

        // ═══ UI Tools (toggle via toolbar buttons) ═══
        "/Dev-Tools/ui/dev-toolbar.js",
        "/Dev-Tools/ui/inspector.js",

        // ═══ Template mods (uncomment to activate) ═══
        // Each template pairs with a workflow doc in Dev-Tools/skills/workflows/
        // Copy template → adapt → uncomment here → reload → test with DBG commands.
        // See Dev-Tools/skills/QUICK_START.md for the 5-minute quickstart.
        // "/Dev-Tools/mods/add_mob_phantom.js", // Custom mob (workflows/add-mob.md)
        // "/Dev-Tools/mods/add-card.js",        // Card damage modifier (workflows/add-card.md)
        // "/Dev-Tools/mods/add-encounter.js",   // Room-entry encounter (workflows/add-encounter.md)
        // "/Dev-Tools/mods/add-pickup.js",      // Collectible item (workflows/add-pickup.md)
        // "/Dev-Tools/mods/add-ui-panel.js",    // Canvas UI panel (workflows/add-ui-panel.md)
        // "/Dev-Tools/mods/add-scene.js",       // Custom game screen (workflows/add-scene-live.md)
        // "/Dev-Tools/mods/add-sound.js",       // Sound effects (workflows/add-sound.md)
        // "/Dev-Tools/mods/retheme.js",         // Colors/fonts (workflows/retheme.md)
        // "/Dev-Tools/mods/change-clues.js",    // Clue text (workflows/iterate-clues.md + change-clues.md)

        // ── Your custom mods go here ──
    ];

    if (window.devLog) window.devLog('[manifest] ' + window.MOD_MANIFEST.length + ' mods queued');
})();