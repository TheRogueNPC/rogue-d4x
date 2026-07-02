// ═══════════════════════════════════════════════════════════════════
// MOD: add-pickup.js — Collectible pickup item template
// Load after: loader.js, game.js, characters.js
//
// Built on Object.create(Clue.prototype) so `instanceof Clue` is true —
// the native ActionCollect action (and Hero.target()'s branch that
// creates it) auto-detects anything that passes that check. No new
// Action class, no Hero.target() patching needed.
//
// See Dev-Tools/skills/workflows/add-pickup.md for the full writeup.
// This is a TEMPLATE — uncomment in manifest.js to activate.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var Clue = ModLoader.resolve('com.watabou.sevendrl.characters.Clue');
    var CharacterSprite = ModLoader.resolve('com.watabou.sevendrl.visuals.CharacterSprite');
    if (!Clue || !CharacterSprite) {
        if (window.devLog) window.devLog('[add-pickup] SKIPPED: Clue/CharacterSprite not available yet');
        return;
    }

    // ── 1. Define the pickup class ──────────────────────────────────
    var HealthPotion = function(game, pos) {
        Clue.call(this, game, pos);
    };
    HealthPotion.__name__ = 'com.watabou.sevendrl.characters.HealthPotion';
    HealthPotion.__super__ = Clue;
    HealthPotion.prototype = Object.create(Clue.prototype);
    HealthPotion.prototype.__class__ = HealthPotion;

    HealthPotion.prototype.createSprite = function() {
        this.sprite = new CharacterSprite(this, '!');
        this.sprite.tf.set_textColor(0xFF4444);
        this.sprite.setScale(0.8);
    };
    HealthPotion.prototype.blocks = function() { return false; };
    HealthPotion.prototype.getInfo = function() { return 'A small vial of healing draught.'; };

    HealthPotion.prototype.collect = function() {
        var hero = this.game.hero;
        hero.hp = Math.min(hero.hp + 2, hero.maxHP);
        if (hero.hpChanged) hero.hpChanged.dispatch(hero.hp);
        if (window.__eventLogAdd) window.__eventLogAdd('Picked up a Health Potion (+2 HP)');
        this.sprite.despawn();
        this.game.queue.splice(this.game.queue.indexOf(this), 1);
    };

    window.com_watabou_sevendrl_characters_HealthPotion = HealthPotion;

    // ── 2. Spawn one per level, in an unseen walkable cell ───────────
    ModLoader.after('com.watabou.sevendrl.SevenDRL', 'spawnClues', function() {
        var AE = window.com_watabou_utils_ArrayExtender;
        var cells = AE.difference(this.cells, this.hero.getFOV())
            .filter(function(c) { return c !== this.hero.pos && !this.getChar(c); }, this);
        if (!cells.length) return;
        var pos = AE.random(cells);
        var potion = new HealthPotion(this, pos);
        potion.setPos(pos);
        this.queue.push(potion);
        if (window.devLog) window.devLog('[health-potion] spawned 1');
    });

    if (window.devLog) window.devLog('[mod:add-pickup] loaded — Health Potion pickup registered');
})();
