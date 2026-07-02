(function() {
    'use strict';

    var PIECES = {
        pawn:   { name:'Pawn',   desc:'Forward shot (1 dmg)',  cost:1, range:4, dmg:1,  hits:1, color:0x888888 },
        knight: { name:'Knight', desc:'L-jump + damage (2)',   cost:2, range:2, dmg:2,  hits:1, color:0xCC8800 },
        bishop: { name:'Bishop', desc:'Line pierce (1 each)',  cost:2, range:5, dmg:1,  hits:0, color:0x8844CC },
        rook:   { name:'Rook',   desc:'Line shot (3 dmg)',     cost:3, range:6, dmg:3,  hits:1, color:0x4488CC },
        queen:  { name:'Queen',  desc:'8-dir burst (2 each)',  cost:4, range:3, dmg:2,  hits:0, color:0xCC4466 },
        king:   { name:'King',   desc:'+1 max HP (passive)',   cost:0, range:0, dmg:0,  hits:0, color:0xFFDD00 }
    };
    var PIECE_KEYS = ['pawn','knight','bishop','rook','queen'];
    window.__chessPieces = window.__chessPieces || {};
    PIECE_KEYS.forEach(function(k){ window.__chessPieces[k] = { name: PIECES[k].name, cost: PIECES[k].cost }; });

    // Each chess ability now has its OWN charge count, filled only by
    // picking up that specific piece type — it no longer draws from the
    // shared window.__abilityStock pool (that pool still exists for
    // ability.js's separate generic Q-fire mechanic, used when no chess
    // piece is selected). __chessAbilities is the list of UNIQUE unlocked
    // types (Tab cycles through it); __abilityCharges tracks how many uses
    // each type has left. Each pickup of a type grants +1 charge.
    window.__chessAbilities = [];
    window.__selectedAbilityIdx = -1;
    window.__abilityCharges = window.__abilityCharges || {};

    function getSelected() {
        var arr = window.__chessAbilities;
        var idx = window.__selectedAbilityIdx;
        if (!arr || idx < 0 || idx >= arr.length) return null;
        return arr[idx];
    }

    function chargesOf(type) { return window.__abilityCharges[type] || 0; }

    function cycleAbility() {
        var arr = window.__chessAbilities;
        if (!arr || !arr.length) return;
        window.__selectedAbilityIdx = (window.__selectedAbilityIdx + 1) % arr.length;
        updateIndicator();
        var sel = arr[window.__selectedAbilityIdx];
        var p = PIECES[sel];
        if (window.__eventLogAdd) window.__eventLogAdd('Ability: ' + p.name + ' x' + chargesOf(sel));
    }

    // Canvas-native, not DOM — same reasoning as ability.js's aim prompt
    // (see comment there): this is in-game UI, so it lives in the scene's
    // own display tree instead of a separate, manually-managed DOM overlay.
    var _indSprite = null;
    var _indText = null;
    var IND_COLOR = 0xDDDDDD;
    var IND_PAD_X = 14, IND_PAD_Y = 4;

    function getScene() {
        var Game = window.com_watabou_coogee_Game;
        return Game && Game.scene ? Game.scene : null;
    }

    function updateIndicator() {
        // hud-bars.js's <Skill>/(Charge) bars track the exact same state
        // this floating indicator does — refresh them together rather
        // than hooking every individual call site that already calls
        // updateIndicator() (pickup, cycle, select, fire, debug-grant).
        if (window.__refreshHudBars) window.__refreshHudBars();
        var scene = getScene();
        if (!scene) return;
        if (window.__selectedAbilityIdx >= 0 && window.__chessAbilities && window.__chessAbilities.length) {
            var sel = window.__chessAbilities[window.__selectedAbilityIdx];
            var p = PIECES[sel] || { name: sel || '—' };
            var text = p.name + ' x' + chargesOf(sel);

            if (!_indSprite) {
                var Sprite = window.openfl_display_Sprite;
                var CenteredText = window.com_watabou_sevendrl_visuals_CenteredText;
                var Style = window.com_watabou_sevendrl_Style;
                _indSprite = new Sprite();
                _indText = new CenteredText('', Style.formatService);
                _indText.set_textColor(IND_COLOR);
            }
            _indText.set_text(text);
            var w = _indText.get_width() + IND_PAD_X * 2;
            var h = _indText.get_height() + IND_PAD_Y * 2;
            _indSprite.get_graphics().clear();
            _indSprite.get_graphics().lineStyle(1, IND_COLOR, 1);
            _indSprite.get_graphics().beginFill(0x000000, 0.8);
            _indSprite.get_graphics().drawRect(0, 0, w, h);
            if (_indText.parent !== _indSprite) _indSprite.addChild(_indText);
            _indText.set_x(IND_PAD_X);
            _indText.set_y(IND_PAD_Y);
            _indSprite.set_x((scene.rWidth - w) / 2);
            _indSprite.set_y((scene.rHeight - h) / 2);
            if (_indSprite.parent !== scene) scene.addChild(_indSprite);
        } else {
            hideIndicator();
        }
    }

    function createPickupClass() {
        var Clue = window.com_watabou_sevendrl_characters_Clue;
        var CharacterSprite = window.com_watabou_sevendrl_visuals_CharacterSprite;

        var Cls = function(game, pos) {
            Clue.call(this, game, pos);
            this.isAbilityPickup = true;
            this.text = 'Ability';
            this.abilityType = com_watabou_utils_ArrayExtender.random(PIECE_KEYS);
        };
        Cls.__name__ = 'com.watabou.sevendrl.characters.AbilityPickup';
        Cls.__super__ = Clue;
        Cls.prototype = Object.create(Clue.prototype);
        Cls.prototype.__class__ = Cls;

        Cls.prototype.createSprite = function() {
            this.sprite = new CharacterSprite(this, '!');
            this.sprite.tf.set_textColor(0xFFD700);
            this.sprite.setScale(0.8);
        };
        Cls.prototype.blocks = function() { return false; };
        Cls.prototype.getInfo = function() {
            var a = PIECES[this.abilityType];
            return 'Ability: ' + a.name + ' — ' + a.desc;
        };
        Cls.prototype.collect = function() {
            var type = this.abilityType;
            var a = PIECES[type];
            var hero = this.game.hero;

            if (type === 'king') {
                hero.maxHP = (hero.maxHP || 6) + 1;
                hero.hp = Math.min(hero.hp + 1, hero.maxHP);
                if (hero.hpChanged) hero.hpChanged.dispatch(hero.hp);
                if (window.__eventLogAdd) window.__eventLogAdd('King: +1 max HP');
            } else {
                // +1 charge of THIS specific type. Only add to the unlocked
                // list the first time — duplicate pickups just add charge,
                // they don't duplicate the Tab-cycle entry.
                window.__abilityCharges[type] = (window.__abilityCharges[type] || 0) + 1;
                if (window.__chessAbilities.indexOf(type) === -1) {
                    window.__chessAbilities.push(type);
                }
                if (window.__selectedAbilityIdx < 0) window.__selectedAbilityIdx = 0;
            }

            this.game.remove(this);
            this.sprite.despawn();
            updateIndicator();
            autoHideIndicatorSoon();

            var scene = window.com_watabou_coogee_Game.scene;
            if (scene && typeof scene.out === 'function') scene.out('Picked up: ' + a.name);
            if (scene && scene.showWindow) {
                scene.showWindow(type === 'king' ? 'Passive: King' : 'Ability: ' + a.name,
                    a.desc + '\nPress Tab to select, Q+direction to fire');
            }
            if (window.__eventLogAdd) window.__eventLogAdd('Picked up: ' + a.name);
        };
        return Cls;
    }

    // ────────────────────────────────────────────────────────────────
    //  Spawn: hook spawnClues to place 1-2 ability pickups per level
    // ────────────────────────────────────────────────────────────────
    function hookSpawn(Cls) {
        window.ModLoader.after('com.watabou.sevendrl.SevenDRL', 'spawnClues', function() {
            var R = window.com_watabou_utils_Random;
            if (!R) return;
            var count = 1 + ((R.seed = R.seed * 48271.0 % 2147483647 | 0) % 3 === 0 ? 1 : 0);
            var AE = window.com_watabou_utils_ArrayExtender;
            for (var i = 0; i < count; i++) {
                var cells = AE ? AE.difference(this.cells, this.hero.getFOV()) : this.cells.slice();
                cells = cells.filter(function(c) { return c !== this.hero.pos && !this.getChar(c); }, this);
                if (!cells.length) break;
                var pos = AE ? AE.random(cells) : cells[0];
                var p = new Cls(this, pos);
                p.setPos(pos);
                this.queue.push(p);
            }
            if (window.devLog) window.devLog('[ability-pickup] spawned ' + count + ' pickups');
        });
    }

    // ────────────────────────────────────────────────────────────────
    //  Fire: projectile / burst helpers
    // ────────────────────────────────────────────────────────────────
    function fireBullet(game, si, sj, di, dj, range, dmg, color, callback) {
        var AsciiSprite = window.com_watabou_sevendrl_visuals_AsciiSprite;
        var Tweener = window.com_watabou_processes_Tweener;
        var view = window.com_watabou_coogee_Game.scene.view;
        var grid = game.plan.grid;
        var ti = si, tj = sj, targetMob = null;

        for (var n = 1; n <= range; n++) {
            var ci = si + di * n, cj = sj + dj * n;
            var cell = grid.cell(ci, cj);
            if (!cell || game.cells.indexOf(cell) === -1) break;
            ti = ci; tj = cj;
            var ch = game.getChar(cell);
            if (ch && !(ch instanceof window.com_watabou_sevendrl_characters_Clue)
                && !(ch instanceof window.com_watabou_sevendrl_characters_Boss)) {
                targetMob = ch; break;
            }
        }

        var sprite = new AsciiSprite('*', true);
        sprite.setColor(color);
        sprite.setScale(1.1);
        view.map.addChild(sprite);
        sprite.setPos(si, sj);

        Tweener.run(0.2, function(e) {
            var ee = e * e * (3 - 2 * e);
            sprite.setPos(si + (ti - si) * ee, sj + (tj - sj) * ee);
        }).onComplete(function() {
            if (targetMob) { targetMob.hp = dmg; targetMob.damage(dmg); }
            sprite.remove();
            if (callback) callback();
        });
    }

    function firePierce(game, si, sj, di, dj, range, dmg, color, callback) {
        var AsciiSprite = window.com_watabou_sevendrl_visuals_AsciiSprite;
        var Character = window.com_watabou_sevendrl_characters_Character;
        var grid = game.plan.grid;
        var targets = [];
        var endI = si, endJ = sj;

        for (var n = 1; n <= range; n++) {
            var ci = si + di * n, cj = sj + dj * n;
            var cell = grid.cell(ci, cj);
            if (!cell || game.cells.indexOf(cell) === -1) break;
            endI = ci; endJ = cj;
            var ch = game.getChar(cell);
            if (ch && !(ch instanceof window.com_watabou_sevendrl_characters_Clue)
                && !(ch instanceof window.com_watabou_sevendrl_characters_Boss)) {
                targets.push(ch);
            }
        }

        var sprite = new AsciiSprite('*', true);
        sprite.setColor(color);
        sprite.setScale(1.1);
        window.com_watabou_coogee_Game.scene.view.map.addChild(sprite);
        sprite.setPos(si, sj);

        var Tweener = window.com_watabou_processes_Tweener;
        Tweener.run(0.2, function(e) {
            var ee = e * e * (3 - 2 * e);
            sprite.setPos(si + (endI - si) * ee, sj + (endJ - sj) * ee);
        }).onComplete(function() {
            for (var t = 0; t < targets.length; t++) {
                targets[t].hp = dmg;
                targets[t].damage(dmg);
            }
            sprite.remove();
            if (callback) callback();
        });
    }

    function fire(game, abilityType, di, dj) {
        var piece = PIECES[abilityType];
        if (!piece || piece.cost < 1) return false;
        // Per-type charges, not the shared window.__abilityStock pool —
        // each pickup of this exact piece grants its own use.
        if (chargesOf(abilityType) < 1) return false;

        window.__abilityCharges[abilityType]--;
        updateIndicator();

        var hero = game.hero;
        if (!hero || !hero.pos) return false;
        var si = hero.pos.i, sj = hero.pos.j;
        var finishCalled = false;

        function finishTurn() {
            if (finishCalled) return;
            finishCalled = true;
            game.finish(hero, true);
        }

        switch (abilityType) {
            case 'pawn':
                fireBullet(game, si, sj, di, dj, piece.range, piece.dmg, piece.color, finishTurn);
                break;
            case 'knight':
                fireBullet(game, si, sj, di, dj, piece.range, piece.dmg, piece.color, finishTurn);
                break;
            case 'bishop':
                firePierce(game, si, sj, di, dj, piece.range, piece.dmg, piece.color, finishTurn);
                break;
            case 'rook':
                fireBullet(game, si, sj, di, dj, piece.range, piece.dmg, piece.color, finishTurn);
                break;
            case 'queen': {
                var dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
                var completed = 0;
                for (var d = 0; d < dirs.length; d++) {
                    (function(dd, dj2) {
                        fireBullet(game, si, sj, dd, dj2, piece.range, piece.dmg, piece.color, function() {
                            completed++;
                            if (completed === dirs.length) finishTurn();
                        });
                    })(dirs[d][0], dirs[d][1]);
                }
                break;
            }
        }

        if (window.__eventLogAdd) window.__eventLogAdd(piece.name + ' ' + di + ',' + dj);
        return true;
    }



    // ────────────────────────────────────────────────────────────────
    //  Aim UI — shares ability.js's canvas-native aim prompt instead of
    //  maintaining a second, near-identical DOM overlay with its own id.
    // ────────────────────────────────────────────────────────────────
    function showAim(key) {
        var pName = PIECES[key] ? PIECES[key].name + ' x' + chargesOf(key) : 'AIM';
        if (window.__showAimText) window.__showAimText(pName + ': W/A/S/D or Arrows   (ESC cancel)');
    }
    function hideAim() { if (window.__hideAimText) window.__hideAimText(); }

    function autoHideIndicatorSoon() { clearTimeout(window.__dc_indicatorTimer); window.__dc_indicatorTimer = setTimeout(hideIndicator, 1800); }
    function hideIndicator() { if (_indSprite && _indSprite.parent) _indSprite.parent.removeChild(_indSprite); }

    // ────────────────────────────────────────────────────────────────
    //  Key hooks (runs after ability.js since this loads after it)
    // ────────────────────────────────────────────────────────────────
    function hookKeys() {
        var _aiming = false;

        window.ModLoader.hook('com.watabou.sevendrl.scenes.GameScene', 'onKey', function(keyCode, down) {
            if (!down) return;

            // Tab to cycle abilities
            if (keyCode === 9 && window.__chessAbilities && window.__chessAbilities.length > 0) {
                cycleAbility();
                this.__suppressOrig = true;
                return;
            }

            // Number row 1-5 selects that ability by slot
            if (keyCode >= 49 && keyCode <= 53 && window.__chessAbilities && window.__chessAbilities.length > 0) {
                var slot = keyCode - 49;
                if (slot < window.__chessAbilities.length) {
                    window.__selectedAbilityIdx = slot;
                    updateIndicator();
                    var active = window.__chessAbilities[window.__selectedAbilityIdx];
                    var np = PIECES[active] || {};
                    if (window.__eventLogAdd) window.__eventLogAdd('Ability: ' + (np.name || active) + ' x' + chargesOf(active) + ' — ' + (np.desc || ''));
                } else {
                    if (window.__eventLogAdd) window.__eventLogAdd('No ability in slot ' + (slot + 1));
                }
                this.__suppressOrig = true;
                return;
            }

            // Q to enter aim
            if (keyCode === 81 && !_aiming) {
                var key = getSelected();
                if (!key) return;
                var p = PIECES[key];
                if (p.cost < 1) return;
                if (chargesOf(key) < 1) {
                    if (window.__eventLogAdd) window.__eventLogAdd('No charges left for ' + p.name + ' — pick up another to recharge');
                    return;
                }
                _aiming = true;
                showAim(key);
                this.__suppressOrig = true;
                return;
            }

            // Direction during aim
            if (_aiming) {
                var dir = null;
                switch (keyCode) {
                    case 87: case 38: dir = [-1, 0]; break;
                    case 83: case 40: dir = [1, 0]; break;
                    case 65: case 37: dir = [0, -1]; break;
                    case 68: case 39: dir = [0, 1]; break;
                    case 27: break;
                }
                if (dir) {
                    fire(this.game, getSelected(), dir[0], dir[1]);
                    _aiming = false;
                    hideAim();
                } else if (keyCode === 27) {
                    _aiming = false;
                    hideAim();
                }
                this.__suppressOrig = true;
            }
        });
    }

    // ────────────────────────────────────────────────────────────────
    //  Cleanup on game reset
    // ────────────────────────────────────────────────────────────────
    function hookCleanup() {
        window.ModLoader.after('com.watabou.sevendrl.scenes.GameScene', 'reset', function() {
            if (!this.game) return;
            window.__chessAbilities = [];
            window.__selectedAbilityIdx = -1;
            window.__abilityCharges = {};
            // _indSprite itself is reusable across scenes (a plain Sprite,
            // not tied to one) — just drop it from whatever scene it was
            // last attached to. ability.js's own reset hook handles the
            // shared aim prompt.
            hideIndicator();
        });
    }

    // ────────────────────────────────────────────────────────────────
    //  Init
    // ────────────────────────────────────────────────────────────────
    (function init() {
        if (!window.com_watabou_sevendrl_characters_Clue) { setTimeout(init, 50); return; }
        var Cls = createPickupClass();
        hookSpawn(Cls);
        hookKeys();
        hookCleanup();
        // debug.js's DBG.abilityGive() dispatches this event after pushing
        // directly into window.__chessAbilities (bypassing collect(), which
        // is the only other place that calls updateIndicator()) — without
        // this listener, debug-granted abilities never show in the UI.
        window.addEventListener('dc-ability-given', function() {
            updateIndicator();
            autoHideIndicatorSoon();
        });
        if (window.devLog) window.devLog('[mod:ability-pickup] chess piece system ready');
    })();
})();
