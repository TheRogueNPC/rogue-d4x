// ═══════════════════════════════════════════════════════════════════
// Dev-Tools/mods/hud-bars.js — Canvas-native left-side status bars
//
// Stacks Power / Health / Armor / Skill / Charge / Clues vertically on
// the left edge of the screen. Every visual piece here is the SAME
// native class the game's own HUD already uses — com_watabou_sevendrl_
// visuals' Indicator/Unit (the exact class behind scene.health/scene.
// armor/scene.clues) and StatePin (the class behind scene.card's pins)
// — just instantiated with l2r=true (the same left-anchored mode
// scene.health/scene.armor already use at x=8) and repositioned into
// one column. No custom Sprite-drawing code: this file is positioning/
// labeling glue around classes that already exist in modules/core/
// visuals.js.
//
// scene.card (the native "Power" CardIndicator) isn't rebuilt — it's
// repositioned into this column directly, same as native CardIndicator
// already lays itself out left-to-right (label then pins).
//
// Health/Armor/Charge/Clues ARE rebuilt as our own Indicators rather
// than reusing the native instances, because Indicator bakes its
// l2r direction in at construction time (the unit offsets are computed
// once in the constructor loop) — native scene.clues is built with
// l2r=false (right-anchored), which can't be redirected to grow
// leftward after the fact. Rebuilding with l2r=true keeps every bar on
// the same native Indicator/Unit class, just with the constructor arg
// this column actually needs.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var GameScene = 'com.watabou.sevendrl.scenes.GameScene';
    var MARGIN_LEFT = 8;
    var MARGIN_TOP = 8;
    var ROW_GAP = 10;
    var LABEL_GAP = 10;
    var ROW_H = 30; // fixed height of both Unit and StatePin

    function getScene() {
        var Game = window.com_watabou_coogee_Game;
        return Game && Game.scene && Game.scene.game ? Game.scene : null;
    }

    // Same helper CardIndicator uses to build its "Power" label.
    // Not Text.get() — that calls set_htmlText() under the hood, so labels
    // containing "<" / ">" (e.g. "<Skill>:") get parsed as an (unknown,
    // dropped) HTML tag instead of rendered literally. CenteredText uses
    // plain set_text(), so brackets render as-is; setWidth() is still
    // required immediately after construction (see rogue-api.js's uiText()
    // for why — CenteredText's own constructor never sizes itself).
    function makeLabel(text) {
        var tf = new window.com_watabou_sevendrl_visuals_CenteredText(text, window.com_watabou_sevendrl_Style.formatService);
        tf.setWidth(2000);
        return tf;
    }

    // ── Row: a label + a native Indicator (row of Unit), left-anchored ──
    // This IS an Indicator — the same class scene.health/scene.armor are
    // — constructed with l2r=true so it grows rightward from x=8, same
    // convention native health/armor already use.
    function Row(labelStr, color) {
        this.label = makeLabel(labelStr);
        this.color = color;
        this.indicator = null;
        this.sprite = new window.openfl_display_Sprite();
        this.sprite.addChild(this.label);
    }
    Row.prototype.update = function(scene, max, level, y) {
        var Indicator = window.com_watabou_sevendrl_visuals_Indicator;
        if (!this.indicator || this.indicator.units.length !== max) {
            if (this.indicator) this.sprite.removeChild(this.indicator);
            this.indicator = new Indicator(max, this.color, true);
            this.sprite.addChild(this.indicator);
        }
        this.indicator.setLevel(level);
        this.label.set_x(MARGIN_LEFT);
        this.label.set_y(y + (ROW_H - this.label.get_height()) / 2);
        this.indicator.set_x(MARGIN_LEFT + this.label.get_width() + LABEL_GAP);
        this.indicator.set_y(y);
        if (this.sprite.parent !== scene) scene.addChild(this.sprite);
    };

    // ── Skill row: a label + native StatePin instances (the same class
    // backing scene.card's pin1/pin2/pin3), one per unlocked ability slot ──
    function SkillRow(labelStr) {
        this.label = makeLabel(labelStr);
        this.pins = [];
        this.sprite = new window.openfl_display_Sprite();
        this.sprite.addChild(this.label);
    }
    SkillRow.prototype.update = function(scene, count, selectedIdx, y) {
        var StatePin = window.com_watabou_sevendrl_visuals_StatePin;
        while (this.pins.length < count) {
            var pin = new StatePin(String(this.pins.length + 1));
            this.sprite.addChild(pin);
            this.pins.push(pin);
        }
        while (this.pins.length > count) {
            this.sprite.removeChild(this.pins.pop());
        }
        this.label.set_x(MARGIN_LEFT);
        this.label.set_y(y + (ROW_H - this.label.get_height()) / 2);
        var x = MARGIN_LEFT + this.label.get_width() + LABEL_GAP;
        for (var i = 0; i < count; i++) {
            this.pins[i].set_x(x);
            this.pins[i].set_y(y);
            this.pins[i].on(i === selectedIdx);
            x += 38;
        }
        if (this.sprite.parent !== scene) scene.addChild(this.sprite);
    };

    // ── The rows ──────────────────────────────────────────────────────
    var rows = null;
    function buildRows() {
        rows = {
            health: new Row('[Health]:', 0xFFD93D),  // gold
            armor:  new Row('{Armor}:', 0x6FA8DC),    // blue-grey
            skill:  new SkillRow('<Skill>:'),
            charge: new Row('(Charge):', 0xFF8800),   // orange, matches the Q-fire aim prompt
            clues:  new Row(':Clues:', 0x6677CC)       // blue, matches native clue color family
        };
    }

    // scene.card is native CardIndicator (label "Power" + pin1/pin2/pin3
    // StatePins) — already laid out left-to-right internally, so this
    // just moves the whole thing into our column instead of rebuilding it.
    function positionPower(scene, y) {
        var card = scene.card;
        if (!card) return;
        card.set_x(MARGIN_LEFT);
        card.set_y(y);
    }

    function refreshAll() {
        var scene = getScene();
        if (!scene) return;
        if (!rows) buildRows();
        var hero = scene.game.hero;
        var y = MARGIN_TOP;

        positionPower(scene, y);
        y += ROW_H + ROW_GAP;

        rows.health.update(scene, hero.maxHP || 6, hero.hp, y);
        y += ROW_H + ROW_GAP;

        // No armor mechanic exists yet (hero.armor is initialized to 0 and
        // never changed anywhere in the game) — wired up and ready to
        // reflect one the moment something sets hero.armor.
        rows.armor.update(scene, Math.max(hero.armorMax || 6, hero.armor || 0), hero.armor || 0, y);
        y += ROW_H + ROW_GAP;

        var unlocked = window.__chessAbilities || [];
        var selectedIdx = window.__selectedAbilityIdx;
        rows.skill.update(scene, unlocked.length, selectedIdx, y);
        y += ROW_H + ROW_GAP;

        // Variable-length by design: the bar's length IS the charge count,
        // not a fixed-max meter — ready for future step-abilities with
        // their own, different charge economies without structural change.
        var selected = selectedIdx >= 0 ? unlocked[selectedIdx] : null;
        var charges = window.__abilityCharges || {};
        // No chess piece selected — Q still fires ability.js's own generic
        // projectile using the shared stock pool, so reflect that instead.
        var chargeCount = selected ? (charges[selected] || 0) : (window.__abilityStock || 0);
        rows.charge.update(scene, chargeCount, chargeCount, y);
        y += ROW_H + ROW_GAP;

        rows.clues.update(scene, scene.game.maxClues || 0, scene.game.gotClues || 0, y);
    }
    window.__refreshHudBars = refreshAll;

    // ── Hide the native bars this replaces ───────────────────────────
    // Hidden, not removed: nothing else has to change how it talks to
    // this.health/this.armor/this.abilityInd/this.clues — they still
    // exist and still update, they just don't render. scene.card is NOT
    // hidden — we reposition it into our column instead of duplicating it.
    function hideNativeBars(scene) {
        if (scene.health) scene.health.set_visible(false);
        if (scene.armor) scene.armor.set_visible(false);
        if (scene.abilityInd) scene.abilityInd.set_visible(false);
        if (scene.clues) scene.clues.set_visible(false);
    }

    // ── Wire into the same events everything else already uses ──────
    ModLoader.after(GameScene, 'reset', function() {
        if (!this.game) return;
        hideNativeBars(this);
        refreshAll();
    });
    ModLoader.after(GameScene, 'layout', function() {
        hideNativeBars(this);
        refreshAll();
    });
    ModLoader.after('com.watabou.sevendrl.characters.Hero', 'damage', refreshAll);
    ModLoader.after('com.watabou.sevendrl.characters.Mob', 'die', refreshAll);
    ModLoader.hook('com.watabou.sevendrl.characters.Hero', 'getCloser', null, refreshAll);
    ModLoader.after('com.watabou.sevendrl.SevenDRL', 'collectClue', refreshAll);
    window.addEventListener('dc-ability-given', refreshAll);

    if (window.devLog) window.devLog('[mod:hud-bars] canvas-native left-side stat bars (native Indicator/StatePin/CardIndicator) ready');
})();
