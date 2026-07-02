(function() {
    'use strict';

    var RANGE = 4;

    function diff() { return window.__difficultySettings || { maxStock:6, cost:3, stepRate:6, killHP:true, killStock:true }; }

    window.__abilityStock = 0;
    window.__stepCounter = 0;

    // ── Helpers ──
    function getScene() {
        var Game = window.com_watabou_coogee_Game;
        return Game && Game.scene ? Game.scene : null;
    }

    // ── Ability Indicator UI (reuses game's Indicator class) ──
    function getMaxStock() { return diff().maxStock; }
    function updateAbilityBar() {
        // hud-bars.js's (Charge) bar falls back to the generic stock pool
        // when no chess piece is selected — keep it in sync here too.
        if (window.__refreshHudBars) window.__refreshHudBars();
        var scene = getScene();
        if (!scene || !scene.abilityInd) return;
        var maxS = getMaxStock();
        var stock = Math.min(maxS, Math.max(0, window.__abilityStock || 0));
        scene.abilityInd.setLevel(stock);
        var ratio = maxS > 0 ? stock / maxS : 0;
        for (var i = 0; i < scene.abilityInd.units.length; i++) {
            var u = scene.abilityInd.units[i];
            if (i < stock) {
                u.color = ratio < 0.35 ? 0x888888 : (ratio < 0.65 ? 0xFF8800 : 0xFF2200);
            }
            u.on(i < stock);
        }
    }

    // Add ability indicator to GameScene after reset
    ModLoader.after('com.watabou.sevendrl.scenes.GameScene', 'reset', function() {
        if (!this.game) return;
        window.__abilityStock = 0;
        window.__stepCounter = 0;
        var Indicator = window.com_watabou_sevendrl_visuals_Indicator;
        if (this.abilityInd) { this.removeChild(this.abilityInd); this.abilityInd = null; }
        var maxS = getMaxStock();
        // l2r=true: this bar is anchored at x=8 (left edge, set below), same
        // convention as health/armor. l2r=false lays units out at NEGATIVE
        // x-offsets (-(i+1)*28) — meant for right-anchored bars like the
        // clue indicator (set_x(rWidth-8)). Passing false here pushed every
        // unit pip off-screen to the left, making the whole bar invisible.
        this.abilityInd = new Indicator(maxS, 0x888888, true);
        this.abilityInd.setLevel(0);
        this.addChild(this.abilityInd);
        this.layout();
    });

    function abilityOut(msg) {
        try {
            var scene = getScene();
            if (!scene) return;
            if (typeof scene.out === 'function') {
                scene.out(msg);
            } else if (typeof scene.showWindow === 'function') {
                scene.showWindow('Power', msg);
            }
        } catch (e) {
            if (window.__eventLogAdd) window.__eventLogAdd('[abilityOut err] ' + (e && e.message ? e.message : 'unknown'));
        }
    }

    function refreshPowerUI() {
        updateAbilityBar();
        var scene = getScene();
        if (!scene || !scene.card || !scene.card.set_text) return;
        var sel = window.__chessAbilities && window.__selectedAbilityIdx >= 0 ? window.__chessAbilities[window.__selectedAbilityIdx] : null;
        // window.PIECES never existed — ability-pickup.js keeps its full PIECES
        // table private and only exposes a reduced {name,cost} view as
        // window.__chessPieces. That mismatch meant this line threw
        // (uncaught, since it's evaluated before the try below) the moment
        // any chess piece was selected, on every damage/kill/step/layout event.
        var piece = sel ? window.__chessPieces[sel] : null;
        try { scene.card.set_text(piece ? piece.name : 'Power'); } catch(e) {}
    }

    // Reuse ability indicator as secondary Power/Skill bar in the HUD
    ModLoader.after('com.watabou.sevendrl.scenes.GameScene', 'reset', function() {
        if (!this.abilityInd) return;
        this.abilityInd.set_x(8);
        this.abilityInd.set_y(72);
        refreshPowerUI();
    });

    ModLoader.after('com.watabou.sevendrl.scenes.GameScene', 'layout', function() {
        if (this.abilityInd) {
            this.abilityInd.set_x(8);
            this.abilityInd.set_y(72);
        }
        refreshPowerUI();
    });

    ModLoader.after('com.watabou.sevendrl.characters.Mob', 'die', function() {
        var Boss = window.com_watabou_sevendrl_characters_Boss;
        if (this instanceof Boss) return;
        window.__abilityStock = Math.min(getMaxStock(), (window.__abilityStock || 0) + 1);
        window.__stepCounter = 0;
        refreshPowerUI();
    });

    ModLoader.hook('com.watabou.sevendrl.characters.Hero', 'getCloser', null, function(result) {
        if (!result) return result;
        window.__stepCounter = (window.__stepCounter || 0) + 1;
        if (window.__stepCounter >= diff().stepRate) {
            window.__stepCounter = 0;
            window.__abilityStock = Math.min(getMaxStock(), (window.__abilityStock || 0) + 1);
            refreshPowerUI();
        }
        return result;
    });

    // (A 'collectFire' hook used to live here, hooking a GameScene method
    // that has never existed in any build of this game — modules/core/
    // scenes.js, SevenDRL.js, none of them define it. It could never
    // resolve, so ModLoader.flush() retried it forever every 500ms,
    // spamming "FLUSH SKIPPED" + "Deferred: 1 patches still pending" into
    // the console for the entire session. Firing already happens directly
    // through the onKey-driven Q mechanic below — this was vestigial from
    // an earlier design. Removed rather than fixed; nothing called it.)

    // ── Damage penalty (lose 1 stock on actual hit) ──
    // Uses before+after to detect if HP actually changed (god mode bypass detection)
    // NOTE: this used to be duplicated by a near-identical Mob-die / getCloser /
    // Hero-damage block further up in this file (each registering its own
    // ModLoader hook on the SAME method). That meant every kill granted 2
    // stock instead of 1, and every step counted twice toward the stepRate
    // threshold. Consolidated into the single set of hooks above + this one.
    ModLoader.hook('com.watabou.sevendrl.characters.Hero', 'damage', function(value) {
        this.__preDmgHP = this.hp;
    }, function() {
        if (this.hp < this.__preDmgHP && window.__abilityStock > 0) {
            window.__abilityStock--;
            refreshPowerUI();
        }
        delete this.__preDmgHP;
    });

    // ── Aim UI ──
    // Canvas-native, not DOM: this is in-game UI (shown over the dungeon
    // during a core gameplay mechanic), so it belongs in the same display
    // tree as everything else the game renders — Window/Toast/Indicator
    // already do this. A DOM overlay sits outside that system entirely:
    // it doesn't move/scale with the canvas, doesn't get cleaned up when
    // the scene is replaced (display-list children do, automatically),
    // and needs its own manual lifecycle management (which is exactly the
    // class of bug fixed earlier this session — popups outliving the
    // scene they were shown on). ability-pickup.js's own (former) aim
    // prompt shared this exact problem; both now go through this one
    // shared canvas sprite (exposed below) instead of two separate DOM
    // elements with two separate ids.
    var _aiming = false;
    var _aimSprite = null;
    var _aimText = null;
    var AIM_COLOR = 0xFF8800;
    var AIM_PAD_X = 24, AIM_PAD_Y = 12;

    function buildAimSprite() {
        var Sprite = window.openfl_display_Sprite;
        var CenteredText = window.com_watabou_sevendrl_visuals_CenteredText;
        var Style = window.com_watabou_sevendrl_Style;
        _aimSprite = new Sprite();
        _aimText = new CenteredText('', Style.formatService);
        _aimText.set_textColor(AIM_COLOR);
    }

    function showAimText(text) {
        if (!_aimSprite) buildAimSprite();
        var scene = getScene();
        if (!scene) return;
        _aimText.set_text(text);
        var w = _aimText.get_width() + AIM_PAD_X * 2;
        var h = _aimText.get_height() + AIM_PAD_Y * 2;
        _aimSprite.get_graphics().clear();
        _aimSprite.get_graphics().lineStyle(2, AIM_COLOR, 1);
        _aimSprite.get_graphics().beginFill(0x111122, 0.92);
        _aimSprite.get_graphics().drawRect(0, 0, w, h);
        if (_aimText.parent !== _aimSprite) _aimSprite.addChild(_aimText);
        _aimText.set_x(AIM_PAD_X);
        _aimText.set_y(AIM_PAD_Y);
        _aimSprite.set_x((scene.rWidth - w) / 2);
        _aimSprite.set_y((scene.rHeight - h) / 2);
        if (_aimSprite.parent !== scene) scene.addChild(_aimSprite);
    }

    function hideAimText() {
        if (_aimSprite && _aimSprite.parent) _aimSprite.parent.removeChild(_aimSprite);
    }

    function showAim() {
        showAimText('AIM: W/A/S/D or Arrows   (ESC cancel)');
    }
    function hideAim() {
        hideAimText();
    }

    // Shared with ability-pickup.js so chess-piece aim doesn't need its
    // own duplicate DOM-based prompt.
    window.__showAimText = showAimText;
    window.__hideAimText = hideAimText;

    // The sprite is a child of whichever scene showed it — if that scene
    // gets reset/replaced while aiming, drop the reference so the next
    // showAimText() call rebuilds against the current scene instead of
    // re-adding a sprite still parented to a dead one.
    ModLoader.after('com.watabou.sevendrl.scenes.GameScene', 'reset', function() {
        hideAimText();
    });

    // ── Fire projectile ──
    function fire(g, di, dj) {
        var hero = g.hero;
        if (!hero || !hero.pos) return;
        var si = hero.pos.i, sj = hero.pos.j;
        var ti = si, tj = sj;
        var targetMob = null;
        var Boss = window.com_watabou_sevendrl_characters_Boss;
        var grid = g.plan.grid;

        for (var n = 1; n <= RANGE; n++) {
            var ci = si + di * n, cj = sj + dj * n;
            var cell = grid.cell(ci, cj);
            if (!cell || g.cells.indexOf(cell) === -1) break;
            ti = ci; tj = cj;
            var ch = g.getChar(cell);
            if (ch && !(ch instanceof Boss)) { targetMob = ch; break; }
        }

        window.__abilityStock = Math.max(0, (window.__abilityStock || 0) - diff().cost);
        updateAbilityBar();

        var AsciiSprite = window.com_watabou_sevendrl_visuals_AsciiSprite;
        var sprite = new AsciiSprite('*', true);
        sprite.setColor(0xFF6600);
        sprite.setScale(1.1);

        var view = window.com_watabou_coogee_Game.scene.view;
        view.map.addChild(sprite);
        sprite.setPos(si, sj);

        var Tweener = window.com_watabou_processes_Tweener;
        Tweener.run(0.22, function(e) {
            var ee = e * e * (3 - 2 * e);
            sprite.setPos(si + (ti - si) * ee, sj + (tj - sj) * ee);
        }).onComplete(function() {
            if (targetMob) { targetMob.hp = 1; targetMob.damage(1); }
            sprite.remove();
            if (window.__eventLogAdd) window.__eventLogAdd('Projectile ' + di + ',' + dj + (targetMob ? ' hit' : ' miss'));
            g.finish(g.hero, true);
        });
    }

    // ── Hook: onKey ──
    ModLoader.hook('com.watabou.sevendrl.scenes.GameScene', 'onKey', function(keyCode, down) {
        if (!down) return;

        if (keyCode === 81 && !_aiming) {
            if ((window.__abilityStock || 0) >= diff().cost) {
                _aiming = true;
                showAim();
                this.__suppressOrig = true;
            }
            return;
        }

        if (_aiming) {
            var dir = null;
            switch (keyCode) {
                case 87: case 38: dir = [-1, 0]; break;
                case 83: case 40: dir = [1, 0]; break;
                case 65: case 37: dir = [0, -1]; break;
                case 68: case 39: dir = [0, 1]; break;
                case 27: break;
            }
            if (dir) { fire(this.game, dir[0], dir[1]); _aiming = false; hideAim(); }
            else if (keyCode === 27) { _aiming = false; hideAim(); }
            this.__suppressOrig = true;
        }
    }, null);

    window.__updateAbilityBar = updateAbilityBar;

    if (window.devLog) window.devLog('[mod:ability] v2 — stock/step/damage');
})();