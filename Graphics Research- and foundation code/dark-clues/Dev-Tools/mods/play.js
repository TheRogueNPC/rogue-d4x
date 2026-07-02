(function() {
    'use strict';

    var DIFFICULTIES = {
        easy:   { hp:6,  maxStock:6, cost:2, stepRate:6, killHP:true,  killStock:true  },
        medium: { hp:5,  maxStock:3, cost:3, stepRate:4, killHP:false, killStock:true  },
        hard:   { hp:3,  maxStock:3, cost:3, stepRate:3, killHP:false, killStock:false }
    };
    window.__difficulty = 'easy';
    window.__difficultySettings = DIFFICULTIES.easy;

    // Suppress body text on TitleScene — we show it after difficulty selection
    ModLoader.before('com.watabou.sevendrl.scenes.TextScene', 'setText', function(txt) {
        var TS = window.com_watabou_sevendrl_scenes_TitleScene;
        if (TS && this instanceof TS) { this.__suppressOrig = true; }
    });

    function applyDifficulty() {
        var d = window.__difficultySettings || DIFFICULTIES.easy;
        var loadout = window.__characterLoadout || {};
        var hp = Math.min(d.hp + (loadout.hpBonus || 0), 9);
        var G = window.com_watabou_coogee_Game;
        if (G && G.scene && G.scene.game && G.scene.game.hero) {
            var h = G.scene.game.hero;
            h.hp = hp;
            h.maxHP = hp;
            if (loadout.name) {
                h.getName = function() { return loadout.name; };
            }
            if (h.hpChanged) h.hpChanged.dispatch(h.hp);
            var Indicator = window.com_watabou_sevendrl_visuals_Indicator;
            if (G.scene.health) { G.scene.removeChild(G.scene.health); }
            G.scene.health = new Indicator(hp, 16772812, true);
            G.scene.health.setLevel(hp);
            G.scene.addChild(G.scene.health);
            if (loadout.stockBonus) {
                window.__abilityStock = Math.min(d.maxStock, loadout.stockBonus);
                if (window.__updateAbilityBar) window.__updateAbilityBar();
            }
            G.scene.layout();
        }
    }

    // ── Game-native panel builder ──
    // All overlays below are canvas Sprites (Rogue.UI, from rogue-api.js)
    // attached to the current scene's display list — not DOM. mkGamePanel
    // additionally takes a promptText line (Rogue.UI.panel only does
    // title+body), so it stays as a thin wrapper around Rogue.UI here.
    function mkGamePanel(titleText, bodyText, promptText, width) {
        var panel = Rogue.UI.panel(titleText, bodyText, width);
        if (promptText) Rogue.UI.prompt(promptText, panel);
        return panel;
    }

    function mkGameBtn(label, parent, fn) {
        return Rogue.UI.button(label, parent, fn);
    }

    // ── Character registry (loaded from assets/characters/) ──
    var CHARACTERS = [];
    var SELECTED_CHAR_IDX = 0;

    function findVisual(visuals) {
        if (!visuals || visuals.length === 0) return null;
        for (var t = 0; t < visuals.length; t++) {
            if (visuals[t].type === 'png') return visuals[t];
        }
        for (var t = 0; t < visuals.length; t++) {
            if (visuals[t].type === 'svg') return visuals[t];
        }
        return visuals[0];
    }

    function loadCharacters(callback) {
        CHARACTERS = [];
        var triedURLs = ['/assets/characters/manifest.json', '/assets/characters/manifest/manifest.json'];
        var loadIdx = 0;

        function tryNext() {
            if (loadIdx >= triedURLs.length) { finish(); return; }
            fetch(triedURLs[loadIdx++])
                .then(function(r) { if (!r.ok) throw Error('no manifest'); return r.json(); })
                .then(function(manifest) {
                    if (!Array.isArray(manifest)) { finish(); return; }
                    var remaining = manifest.length;
                    if (remaining === 0) { finish(); return; }
                    for (var i = 0; i < manifest.length; i++) {
                        (function(m) {
                            var path = '/assets/characters/' + (m.file || m.name + '.json');
                            fetch(path)
                                .then(function(r) { return r.json(); })
                                .then(function(cd) { CHARACTERS.push(cd); remaining--; if (remaining <= 0) finish(); })
                                .catch(function() { remaining--; if (remaining <= 0) finish(); });
                        })(manifest[i]);
                    }
                })
                .catch(tryNext);
        }
        function finish() {
            if (CHARACTERS.length === 0) {
                CHARACTERS.push({ name: 'Detective', hpBonus: 0, stockBonus: 0, colorScheme: 'default', visuals: [] });
            }
            if (callback) callback();
        }
        tryNext();
    }

    // ── Difficulty overlay ──
    // Canvas-native: a dim full-screen overlay (Rogue.UI.overlay) holding a
    // wide panel with a row of character cards + difficulty buttons. Card
    // highlight states reuse the same clear-and-redraw-graphics pattern the
    // native StatePin uses for its own on/off transitions.
    var CARD_W = 76, CARD_H = 76, CARD_GAP = 6;
    var CARD_BORDER_DEFAULT = 0x555555, CARD_BORDER_HOVER = 0x00FF00, CARD_BORDER_SELECTED = 0x00FFFF;
    var CARD_BG = 0x111122, CARD_BG_SELECTED = 0x1A1A3E;

    function redrawCharCard(card, selected, hover) {
        var border = selected ? CARD_BORDER_SELECTED : (hover ? CARD_BORDER_HOVER : CARD_BORDER_DEFAULT);
        var bg = selected ? CARD_BG_SELECTED : CARD_BG;
        card.get_graphics().clear();
        card.get_graphics().lineStyle(2, border, 1);
        card.get_graphics().beginFill(bg, 1);
        card.get_graphics().drawRoundRect(0, 0, CARD_W, CARD_H, 4);
    }

    function showDifficultySelect() {
        if (window.__diffOverlay) return;

        var ov = Rogue.UI.overlay('Dark Clues', null, 580);
        window.__diffOverlay = ov;
        var panel = ov.__panel;
        var Style = window.com_watabou_sevendrl_Style;
        var CenteredText = window.com_watabou_sevendrl_visuals_CenteredText;

        Rogue.UI.label('◈ CHARACTER', panel, 0x00FFFF);

        var charRow = new window.openfl_display_Sprite();
        charRow.set_x(20);
        Rogue.UI.stack(charRow, panel, CARD_H + 6);

        var charInfo = new CenteredText('', Style.formatService);
        charInfo.setWidth(2000); // CenteredText needs setWidth() to size itself at all — see rogue-api.js's uiText()
        charInfo.set_textColor(0x888888);
        Rogue.UI.stack(charInfo, panel);

        Rogue.UI.label('◈ DIFFICULTY', panel, 0x00FFFF);

        var cards = [];

        function populateCharRow() {
            while (charRow.get_numChildren() > 0) charRow.removeChildAt(0);
            cards = [];
            for (var i = 0; i < CHARACTERS.length; i++) {
                var ch = CHARACTERS[i];
                var card = new window.openfl_display_Sprite();
                card.set_x(i * (CARD_W + CARD_GAP));
                redrawCharCard(card, i === SELECTED_CHAR_IDX, false);

                // No character in assets/characters/*.json currently ships
                // png/svg art (findVisual() always falls through to glyph) —
                // image portraits would need openfl.display.Loader/BitmapData
                // wiring with no live data to test against yet, so every
                // card renders its glyph for now.
                var glyphTf = new CenteredText(ch.glyph || '◈', Style.formatText);
                glyphTf.setWidth(2000); // CenteredText needs setWidth() to size itself at all — see rogue-api.js's uiText()
                glyphTf.set_textColor(0x00FF00);
                glyphTf.set_x((CARD_W - glyphTf.get_width()) / 2);
                glyphTf.set_y(8);
                card.addChild(glyphTf);

                var nameTf = new CenteredText(ch.name, Style.formatService);
                nameTf.setWidth(CARD_W - 6);
                nameTf.set_x((CARD_W - nameTf.get_width()) / 2);
                nameTf.set_y(CARD_H - nameTf.get_height() - 6);
                card.addChild(nameTf);

                (function(idx, c) {
                    c.addEventListener('mouseover', function() { if (idx !== SELECTED_CHAR_IDX) redrawCharCard(c, false, true); });
                    c.addEventListener('mouseout', function() { if (idx !== SELECTED_CHAR_IDX) redrawCharCard(c, false, false); });
                    c.addEventListener('click', function() { selectCharacter(idx); });
                })(i, card);

                charRow.addChild(card);
                cards.push(card);
            }
        }

        function selectCharacter(idx) {
            SELECTED_CHAR_IDX = idx;
            var ch = CHARACTERS[idx];
            window.__characterLoadout = {
                name: ch.name,
                hpBonus: ch.hpBonus || 0,
                stockBonus: ch.stockBonus || 0,
                colorScheme: ch.colorScheme || 'default',
                glyph: ch.glyph || '@'
            };
            for (var i = 0; i < cards.length; i++) redrawCharCard(cards[i], i === idx, false);
            charInfo.set_text('HP +' + (ch.hpBonus || 0) + ' · Stock +' + (ch.stockBonus || 0) +
                ' · ' + ((ch.colorScheme || 'default').charAt(0).toUpperCase() + (ch.colorScheme || 'default').slice(1)));
            charInfo.setWidth(2000); // recompute shrink-to-fit width for the new text
            charInfo.set_x((panel.__width - charInfo.get_width()) / 2);
        }

        // Load characters then populate
        loadCharacters(function() {
            populateCharRow();
            if (CHARACTERS.length > 0) selectCharacter(0);
        });

        function showIntroMessage() {
            var msgOv = Rogue.UI.overlay('Dark Clues', 'Collect all the clues to discover the secret of the mansion.');
            Rogue.UI.prompt('Click to begin...', msgOv.__panel);
            msgOv.addEventListener('click', function() {
                Rogue.UI.dismiss(msgOv);
                setTimeout(applyDifficulty, 100);
            });
        }

        function mkDiff(label, id, desc) {
            mkGameBtn(label, panel, function() {
                window.__difficulty = id;
                window.__difficultySettings = DIFFICULTIES[id];
                Rogue.UI.dismiss(ov);
                window.__diffOverlay = null;
                showIntroMessage();
            });
            Rogue.UI.description(desc, panel);
        }

        mkDiff('Easy', 'easy',
            '6 HP · 6 stock (2 per) · 1 stock/6 steps · HP + stock on kill');
        mkDiff('Medium', 'medium',
            '5 HP · 3 stock (3 per) · 1 stock/4 steps · stock on kill');
        mkDiff('Hard', 'hard',
            '3 HP · 3 stock (3 per) · 1 stock/3 steps · no recovery');
    }

    // Exposed so title-menu.js can call this directly right after
    // switchScene(GameScene) — GameScene's own constructor runs reset()
    // synchronously before switchScene() returns (confirmed in SevenDRL.js:
    // switchSceneImp calls Type.createInstance then .activate(), and
    // GameScene's constructor calls this.reset() at the end), so there's no
    // timing/polling needed: by the time switchScene() returns, the scene
    // is fully built and ready for the difficulty overlay to attach to.
    window.__showDifficultySelect = showDifficultySelect;

    // ── Infinite replay ──
    ModLoader.hook('com.watabou.sevendrl.scenes.GameScene', 'onGameOver', function() {
        var _scene = this;
        if (!_scene.game.hero.isAlive()) return;

        this.__suppressOrig = true;

        var texts = [];
        var Clue = window.com_watabou_sevendrl_characters_Clue;
        var count = 0;
        for (var i = 0; i < _scene.game.queue.length; i++) {
            var ch = _scene.game.queue[i];
            if (ch instanceof Clue && ch.discovered) { texts.push(ch.text); count++; }
        }
        var clueBody = count > 0
            ? 'Clues gathered:\n\n' + texts.join('\n\n')
            : 'All clues have been collected.';

        var ov = Rogue.UI.overlay('The Mystery Deepens', clueBody, 480);
        Rogue.UI.prompt('Click to continue...', ov.__panel);

        ov.addEventListener('click', function() {
                Rogue.UI.dismiss(ov);
                if (window.__eventLogAdd) window.__eventLogAdd('New level — mystery deepens');
                var oldHP = _scene.game.hero ? _scene.game.hero.hp : null;
                var oldStock = window.__abilityStock || 0;
                _scene.reset();
                if (_scene.game.hero && oldHP !== null) {
                    var d = window.__difficultySettings || DIFFICULTIES.easy;
                    var loadout = window.__characterLoadout || {};
                    _scene.game.hero.hp = Math.min(oldHP, d.hp + (loadout.hpBonus || 0));
                    _scene.game.hero.maxHP = d.hp + (loadout.hpBonus || 0);
                    if (loadout.name) {
                        _scene.game.hero.getName = function() { return loadout.name; };
                    }
                    if (_scene.game.hero.hpChanged) _scene.game.hero.hpChanged.dispatch(_scene.game.hero.hp);
                }
                window.__abilityStock = Math.min(
                    (window.__difficultySettings || DIFFICULTIES.easy).maxStock,
                    oldStock
                );
                if (window.__updateAbilityBar) window.__updateAbilityBar();
        });
    });

    // ── Death retry ──
    ModLoader.hook('com.watabou.sevendrl.scenes.TextScene', 'onClick', function() {
        var DeathScene = window.com_watabou_sevendrl_scenes_DeathScene;
        if (!(this instanceof DeathScene)) return;

        this.__suppressOrig = true;

        var ov = Rogue.UI.overlay('You died...', 'The mystery of the Manor remained unsolved.');
        var panel = ov.__panel;

        mkGameBtn('Retry', panel, function() {
            Rogue.UI.dismiss(ov);
            window.com_watabou_coogee_Game.switchScene(
                window.com_watabou_sevendrl_scenes_GameScene
            );
        });

        mkGameBtn('Quit', panel, function() {
            Rogue.UI.dismiss(ov);
            window.com_watabou_coogee_Game.switchScene(
                window.com_watabou_sevendrl_scenes_TitleScene
            );
        });
    });

    // ── Apply difficulty + character loadout after game reset ──
    ModLoader.after('com.watabou.sevendrl.scenes.GameScene', 'reset', function() {
        if (!this.game || !this.game.hero) return;
        var d = window.__difficultySettings || DIFFICULTIES.easy;
        var loadout = window.__characterLoadout || {};
        var hp = Math.min(d.hp + (loadout.hpBonus || 0), 9);
        this.game.hero.hp = hp;
        this.game.hero.maxHP = hp;
        if (loadout.name) {
            this.game.hero.getName = function() { return loadout.name; };
        }
        var Indicator = window.com_watabou_sevendrl_visuals_Indicator;
        if (this.health) this.removeChild(this.health);
        this.health = new Indicator(hp, 16772812, true);
        this.health.setLevel(hp);
        this.addChild(this.health);
        if (this.game.hero.hpChanged) this.game.hero.hpChanged.dispatch(hp);
        if (loadout.stockBonus) {
            window.__abilityStock = Math.min(
                (window.__difficultySettings || DIFFICULTIES.easy).maxStock,
                loadout.stockBonus
            );
            if (window.__updateAbilityBar) window.__updateAbilityBar();
        }
        this.layout();
    });

    if (window.devLog) window.devLog('[mod:play] — difficulty, replay, death retry');
})();
