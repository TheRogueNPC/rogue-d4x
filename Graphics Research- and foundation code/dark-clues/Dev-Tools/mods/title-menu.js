// ═══════════════════════════════════════════════════════════════════
// Dev-Tools/mods/title-menu.js — Canvas title screen main menu
//
// Replaces TitleScene's native "click anywhere to start a new game"
// with a real menu: New Game / Continue / Options / Level Editor (DLC)
// / Character Creator (DLC). Built on Rogue.UI (rogue-api.js) — a
// child of TitleScene's own display list, same as everything else this
// session converted from DOM to canvas.
//
// TitleScene.activate() is hooked (before-hook, __suppressOrig) rather
// than replaced outright, so the native fade-in still happens — only
// the native body text / "click to continue" prompt and the stage-wide
// click-to-GameScene listener are skipped in favor of the menu below.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var TitleScene = 'com.watabou.sevendrl.scenes.TitleScene';
    var MENU_WIDTH = 280;

    // Dev-only unlock for testing the DLC-gated entries without a real
    // purchase flow (none exists yet — this is just the on/off switch a
    // future store integration would flip).
    window.__dlcUnlocked = window.__dlcUnlocked || false;
    window.__unlockDLC = function() { window.__dlcUnlocked = true; if (window.devLog) window.devLog('[title-menu] DLC unlocked for this session'); };

    function getScene() {
        var Game = window.com_watabou_coogee_Game;
        return Game && Game.scene ? Game.scene : null;
    }

    function showDlcLocked(name) {
        var ov = Rogue.UI.overlay(name + ' — DLC', 'This is a premium feature. Purchase the full version to unlock the ' + name + '.');
        Rogue.UI.button('Close', ov.__panel, function() { Rogue.UI.dismiss(ov); });
    }

    function openDlcOrLocked(name, url) {
        if (window.__dlcUnlocked) {
            window.open(url, '_blank');
        } else {
            showDlcLocked(name);
        }
    }

    function positionMenu(scene, panel) {
        panel.set_x((scene.rWidth - panel.__width) / 2);
        panel.set_y(scene.rHeight * 0.55);
    }

    function startNewGame() {
        var scene = getScene();
        if (!scene) return;
        scene.fader.fadeOut(function() {
            window.com_watabou_coogee_Game.switchScene(window.com_watabou_sevendrl_scenes_GameScene);
            window.__showDifficultySelect();
        });
    }

    function continueGame() {
        var scene = getScene();
        if (!scene) return;
        // No save system exists — "Continue" jumps straight into a new game
        // using the last-selected difficulty/character loadout (reapplied
        // automatically by play.js's GameScene.reset after-hook), skipping
        // the difficulty/character select screens "New Game" goes through.
        scene.fader.fadeOut(function() {
            window.com_watabou_coogee_Game.switchScene(window.com_watabou_sevendrl_scenes_GameScene);
        });
    }

    function buildTitleMenu(scene) {
        var panel = Rogue.UI.panel(null, null, MENU_WIDTH);
        scene.__menuPanel = panel;

        Rogue.UI.button('New Game', panel, startNewGame);

        if (window.__difficultySettings) {
            Rogue.UI.button('Continue', panel, continueGame);
        } else {
            Rogue.UI.description('(Continue unlocks after your first game)', panel);
        }

        Rogue.UI.button('Options', panel, function() {
            window.__pauseMenu.showOptions(function() {
                window.__pauseMenu.closePauseOv();
            });
        });
        Rogue.UI.button('Level Editor (DLC)', panel, function() {
            openDlcOrLocked('Level Editor', '/Dev-Tools/level-creator/index.html');
        });
        Rogue.UI.button('Character Creator (DLC)', panel, function() {
            openDlcOrLocked('Character Creator', '/Dev-Tools/char-creator/index.html');
        });

        positionMenu(scene, panel);
        scene.addChild(panel);
    }

    ModLoader.hook(TitleScene, 'activate', function() {
        this.__suppressOrig = true;
        var Scene = window.com_watabou_coogee_Scene;
        Scene.prototype.activate.call(this); // base scene activation only — skips TextScene's click-to-advance listener
        this.fader.fadeIn();
        if (this.tfText) this.tfText.set_visible(false);
        if (this.tfClick) this.tfClick.set_visible(false);
        buildTitleMenu(this);
    }, null);

    // Reposition the menu whenever the scene re-lays-out (e.g. window
    // resize) — same pattern hud-bars.js uses for its own canvas rows.
    ModLoader.after(TitleScene, 'layout', function() {
        if (this.__menuPanel) positionMenu(this, this.__menuPanel);
    });

    if (window.devLog) window.devLog('[mod:title-menu] canvas title menu ready — call __unlockDLC() to test locked entries');
})();
