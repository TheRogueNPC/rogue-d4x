// ═══════════════════════════════════════════════════════════════════
// Dev-Tools/mods/scenes.js — Scene/view extensions
// Hook points: GameScene init, key input, click, scene transitions
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var GameScene  = 'com.watabou.sevendrl.scenes.GameScene';
    var TitleScene = 'com.watabou.sevendrl.scenes.TitleScene';
    var DeathScene = 'com.watabou.sevendrl.scenes.DeathScene';

    // ╔══ EXTENSION POINT: GameScene Initialization ──────────────────
    ModLoader.hook(GameScene, 'reset', null, function() {
        if (window.devLog) window.devLog('GameScene reset');
        // Cancel any pending auto-dismiss timeout from the scene being
        // replaced — without this, the timeout fires later against a dead
        // scene whose .stage is null (the bug behind the removeEventListener
        // crash on game restart).
        if (_hideTimeout) {
            clearTimeout(_hideTimeout);
            _hideTimeout = null;
        }
        // Native reset() never calls hideWindow() — if a popup (clue text,
        // "You died", "Mystery Deepens", etc.) was open at the moment of
        // reset, it just stays attached to the scene as a leftover child,
        // overlapping the freshly-reset dungeon underneath it. This is the
        // "toast persists into other views" bug — clear it proactively on
        // every reset, in-place replay or otherwise.
        if (this.hideWindow) this.hideWindow();
        _dismissKeyCount = 0;
        // Add custom HUD elements here:
        // this.addChild(new com.watabou.coogee.ui.utils.Text(...));
    });

    // ╔══ AUTO-DISMISS: Popup fades after 5s; click, or 3 key presses ──
    var _hideTimeout = null;
    var _dismissKeyCount = 0;
    ModLoader.hook(GameScene, 'showWindow', null, function() {
        if (_hideTimeout) clearTimeout(_hideTimeout);
        _dismissKeyCount = 0;
        var _scene = this;
        // Click-to-dismiss: hide on any canvas click
        if (_scene.stage && !_scene.__dc_clickDismiss) {
            _scene.__dc_clickDismiss = function() { _scene.hideWindow(); };
            _scene.stage.addEventListener('click', _scene.__dc_clickDismiss);
        }
        // Fade out after 5 seconds
        _hideTimeout = setTimeout(function() {
            // _scene may have been torn down (game restart/reset) by the
            // time this fires — its .stage goes null but the timeout was
            // never cancelled, so guard every step instead of assuming the
            // scene is still alive.
            if (_scene.hideWindow) _scene.hideWindow();
            _hideTimeout = null;
            if (_scene.__dc_clickDismiss) {
                if (_scene.stage) _scene.stage.removeEventListener('click', _scene.__dc_clickDismiss);
                _scene.__dc_clickDismiss = null;
            }
        }, 5000);
    });

    // Any 3 key presses while a popup is open dismiss it (click already
    // does it in 1; this gives keyboard-only players a way to clear a
    // popup without forcing a specific key, while still requiring enough
    // presses that an incidental keystroke doesn't dismiss it by accident).
    ModLoader.hook(GameScene, 'onKey', function(keyCode, down) {
        if (!down || !this.window) return;
        _dismissKeyCount++;
        if (_dismissKeyCount >= 3) {
            _dismissKeyCount = 0;
            this.hideWindow();
        }
    });

    // ╔══ EXTENSION POINT: Game Over Screen ──────────────────────────
    var _origOnGameOver = null;
    ModLoader.hook(GameScene, 'onGameOver', function(won, msg) {
        if (window.devLog) window.devLog('GameScene.onGameOver | won:', won, 'msg:', msg);
    });

    // ╔══ EXTENSION POINT: Key Input ─────────────────────────────────
    ModLoader.hook(GameScene, 'onKey', function(keyCode, down) {
        if (!down) return;
        // ╔══ Custom key bindings ───────────────────────────────────
        // Key codes for reference:
        // H=72, M=77, I=73, D=68, G=71, T=84, F5=116, F12=123
        // WASD: W=87, A=65, S=83, D=68, arrows: 38,37,40,39
        // Pause: P=80, Space=32
        if (keyCode === 72) { // H — help / status
            if (this.game && this.game.sevendrl) {
                var g = this.game.sevendrl;
                if (window.devLog) window.devLog('STATUS | level:', g.level, 'HP:', g.hero ? g.hero.hp : '?', 'clues:', g.clues ? g.clues.length : 0);
            }
        }
        if (keyCode === 77) { // M — show mob positions
            if (this.game && this.game.sevendrl) {
                var g = this.game.sevendrl;
                if (g.queue) {
                    var chars = [];
                    for (var i = 0; i < g.queue.length; i++) {
                        var c = g.queue[i];
                        chars.push((c.getName ? c.getName() : '?') + '@' + c.pos);
                    }
                    if (window.devLog) window.devLog('Characters:', chars.join(', '));
                }
            }
        }
        // WASD movement (nudge one cell)
        if ([87, 38].indexOf(keyCode) != -1) { this.step(-1, 0); return; }  // W / Up
        if ([83, 40].indexOf(keyCode) != -1) { this.step(1, 0);  return; }  // S / Down
        if ([65, 37].indexOf(keyCode) != -1) { this.step(0, -1); return; }  // A / Left
        if ([68, 39].indexOf(keyCode) != -1) { this.step(0, 1);  return; }  // D / Right
        // P — pause toggle
        if (keyCode === 80 && window.DBG) { DBG.pause(); return; }
        // L — show last 10 event log entries
        if (keyCode === 76 && window.DBG) {
            var entries = window.__eventLog || [];
            var last = entries.slice(-10);
            if (window.devLog) window.devLog('── Event log (last ' + last.length + ') ──\n' + last.join('\n'));
            return;
        }
    });

    // ╔══ EXTENSION POINT: Click Handling ────────────────────────────
    ModLoader.hook(GameScene, 'onClick', function(cell, ctrl) {
        if (window.devLog) window.devLog('click | cell:', cell, 'ctrl:', ctrl);
    });

    // ╔══ EXTENSION POINT: Scene Transitions ─────────────────────────
    ModLoader.hook(TitleScene, 'onClick', function() {
        if (window.devLog) window.devLog('TitleScene clicked — starting game');
    });

    ModLoader.hook(DeathScene, 'onClick', function() {
        if (window.devLog) window.devLog('DeathScene clicked — returning to title');
    });

    // ╔══ EXTENSION POINT: Viewport Responsiveness ──────────────────
    // The game already listens for stage resize events (line 3259),
    // but Lime's ApplicationMain.onWindowResize is empty (line 685).
    // This ensures the game relayouts even when the browser window
    // resizes before OpenFL's stage resize event fires.
    var _resizeTimer = null;
    window.addEventListener('resize', function() {
        if (_resizeTimer) clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(function() {
            var Game = window.com_watabou_coogee_Game;
            if (Game && Game.instance && Game.instance.layout) {
                Game.instance.layout();
                if (window.devLog) window.devLog('Resize — game relayout');
            }
        }, 200);
    });

    if (window.devLog) window.devLog('[mod:scenes] loaded — key/click/scene hooks active');
})();