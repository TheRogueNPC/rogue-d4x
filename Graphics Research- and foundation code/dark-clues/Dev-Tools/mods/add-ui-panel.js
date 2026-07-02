// ═══════════════════════════════════════════════════════════════════
// MOD: add-ui-panel.js — Canvas UI panel template
// Load after: rogue-api.js (needs Rogue.UI)
//
// Opens a simple canvas info panel when pressing 'I' during a game.
// Duplicate this file and adapt for any "show a panel with some buttons"
// need — see Dev-Tools/skills/workflows/add-ui-panel.md for the full guide.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    function getScene() {
        var Game = window.com_watabou_coogee_Game;
        return Game && Game.scene ? Game.scene : null;
    }

    function showMyPanel() {
        var scene = getScene();
        if (!scene) return;

        var ov = Rogue.UI.overlay('Info', 'This is a template canvas panel. Replace this text and the buttons below.', 360);
        Rogue.UI.description('Stacked content grows the panel automatically.', ov.__panel);
        Rogue.UI.button('Do the thing', ov.__panel, function() {
            if (window.__eventLogAdd) window.__eventLogAdd('[add-ui-panel] button clicked');
            Rogue.UI.dismiss(ov);
        });
        Rogue.UI.button('Close', ov.__panel, function() {
            Rogue.UI.dismiss(ov);
        });
    }

    // 'I' key opens the panel, only while in GameScene.
    ModLoader.hook('com.watabou.sevendrl.scenes.GameScene', 'onKey', function(keyCode, down) {
        if (down && keyCode === 73) { // 'I'
            showMyPanel();
            this.__suppressOrig = true;
        }
    }, null);

    if (window.devLog) window.devLog('[mod:add-ui-panel] loaded — press I in-game to open the template panel');
})();
