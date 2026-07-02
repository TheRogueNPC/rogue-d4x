// ═══════════════════════════════════════════════════════════════════
// Dev-Tools/mods/add_mob_phantom.js — Custom Mob Example
// Load order: SevenDRL.js → loader.js → game.js → this
//
// This is a TEMPLATE — rename and adapt for your own mob types.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ── 1. Define the mob class extending Mob ──────────────────────
    var Mob = ModLoader.resolve('com.watabou.sevendrl.characters.Mob');

    // Example: "Phantom" — passes through walls, low HP, high damage
    var com_watabou_sevendrl_characters_Phantom = function(game, pos) {
        this.hp = 2;             // fragile
        Mob.call(this, game, pos);
        this.wander();           // starts wandering
    };
    com_watabou_sevendrl_characters_Phantom.__name__ = "com.watabou.sevendrl.characters.Phantom";
    com_watabou_sevendrl_characters_Phantom.__super__ = Mob;
    // Object.create(), NOT $extend() — $extend/$hxClasses are scoped inside
    // SevenDRL.js's own IIFE and throw ReferenceError if referenced bare
    // from a mod file loaded as a separate <script> tag. See modding.md.
    com_watabou_sevendrl_characters_Phantom.prototype = Object.create(Mob.prototype);
    com_watabou_sevendrl_characters_Phantom.prototype.createSprite = function() {
        this.sprite = new (ModLoader.resolve('com.watabou.sevendrl.visuals.CharacterSprite'))(this, "P", false);
        this.sprite.tf.set_textColor(0x8800FF); // purple
    };
    com_watabou_sevendrl_characters_Phantom.prototype.getName = function() {
        return "Phantom";
    };
    com_watabou_sevendrl_characters_Phantom.prototype.getInfo = function() {
        return "A translucent wraith that phases through walls.";
    };
    // ╔══ SWAP POINT: Custom AI ─────────────────────────────────
    com_watabou_sevendrl_characters_Phantom.prototype.act = function() {
            // Custom behavior: teleport toward hero every 3 turns
            if (!this.game || !this.game.hero) return;
            var dx = this.game.hero.pos % this.game.plan.grid.width - this.pos % this.game.plan.grid.width;
            var dy = Math.floor(this.game.hero.pos / this.game.plan.grid.width) - Math.floor(this.pos / this.game.plan.grid.width);
            var dist = Math.abs(dx) + Math.abs(dy);
            if (dist <= 1) {
                // Adjacent — attack
                var ActionAttack = ModLoader.resolve('com.watabou.sevendrl.characters.ActionAttack');
                this.action = new ActionAttack(this, this.game.hero.pos);
            } else if (dist <= 5 && Math.random() < 0.3) {
                // Teleport closer on 30% of turns when within range
                var nx = this.game.hero.pos;
                if (Math.random() < 0.5) nx = this.game.hero.pos + (dx > 0 ? -1 : 1);
                var ny = Math.floor(nx / this.game.plan.grid.width);
                nx = nx % this.game.plan.grid.width;
                // Only teleport to walkable cells
                if (this.game.plan.grid.get(nx, ny) === 0) {
                    this.pos = ny * this.game.plan.grid.width + nx;
                    if (window.devLog) window.devLog('Phantom teleported to', this.pos);
                }
            } else {
                // Chase hero
                this.chase(this.game.hero);
            }
            return this.act();
    };
    com_watabou_sevendrl_characters_Phantom.prototype.__class__ = com_watabou_sevendrl_characters_Phantom;

    // ── 2. Register in spawnMobs via hook ─────────────────────────
    ModLoader.hook('com.watabou.sevendrl.SevenDRL', 'spawnMobs', null, function() {
        // Add 1 Phantom per level
        var Phantom = com_watabou_sevendrl_characters_Phantom;
        for (var i = 0; i < this.level; i++) {
            // Find a random cell not in hero FOV
            var cell = this.plan.randomCell();
            var tries = 0;
            while (tries < 10 && (!this.plan.grid || this.plan.grid.get(cell % this.plan.grid.width, Math.floor(cell / this.plan.grid.width)) !== 0)) {
                cell = this.plan.randomCell();
                tries++;
            }
            var phantom = new Phantom(this, cell);
            this.addCharacter(phantom);
            if (!this.mobs) this.mobs = [];
            this.mobs.push(phantom);
        }
        if (window.devLog) window.devLog('[Phantom] spawned', this.level, 'phantoms');
    });

    if (window.devLog) window.devLog('[mod:phantom] loaded — custom mob "Phantom" registered');
})();