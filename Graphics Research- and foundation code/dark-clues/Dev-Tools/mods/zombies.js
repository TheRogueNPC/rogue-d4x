(function() {
    'use strict';

    // ╔══ Defer until game classes are on window ────────────────────
    (function init() {
        var Mob = window.com_watabou_sevendrl_characters_Mob;
        var StateChasing = window.com_watabou_sevendrl_characters_StateChasing;
        if (!Mob || !StateChasing) { setTimeout(init, 50); return; }

        // ╔══ STATE: ZombieChasing — engages hero for 4 damage ──────
        var ZombieChasing = window.com_watabou_sevendrl_characters_ZombieChasing = function(mob, target) {
            StateChasing.call(this, mob, target);
        };
        ZombieChasing.__name__ = 'com.watabou.sevendrl.characters.ZombieChasing';
        ZombieChasing.__super__ = StateChasing;
        ZombieChasing.prototype = Object.create(StateChasing.prototype);
        ZombieChasing.prototype.engage = function() {
            var _gthis = this;
            this.target.damage(4);
            this.mob.isReady = false;
            this.mob.sprite.engage(this.mob.pos, this.target.pos).onComplete(function() {
                _gthis.mob.game.finish(_gthis.mob, true);
            });
            window.com_watabou_sevendrl_Sounds.event('ghost_attack', 1, Math.floor(-2 + (window.com_watabou_utils_Random.seed = window.com_watabou_utils_Random.seed * 48271.0 % 2147483647 | 0) / 2147483647 * 5));
            return true;
        };
        ZombieChasing.prototype.__class__ = ZombieChasing;

        // ╔══ CLASS: Zombie — 2 HP, hits for 4 ──────────────────────
        var Zombie = window.com_watabou_sevendrl_characters_Zombie = function(game, pos) {
            Mob.call(this, game, pos);
            this.hp = 2;
            this.wander();
        };
        Zombie.__name__ = 'com.watabou.sevendrl.characters.Zombie';
        Zombie.__super__ = Mob;
        Zombie.prototype = Object.create(Mob.prototype);
        Zombie.prototype.createSprite = function() {
            this.sprite = new window.com_watabou_sevendrl_visuals_CharacterSprite(this, 'Z', false);
            this.sprite.tf.set_textColor(0x99FF66);
        };
        Zombie.prototype.getName = function() {
            return 'zombie';
        };
        Zombie.prototype.getInfo = function() {
            return 'A shambling corpse. It hits very hard.';
        };
        Zombie.prototype.act = function() {
            if (this.sees(this.game.hero.pos) && !((this.state) instanceof ZombieChasing)) {
                this.chase(this.game.hero);
                return false;
            }
            return this.state.act();
        };
        Zombie.prototype.chase = function(ch) {
            this.state = new ZombieChasing(this, ch);
        };
        Zombie.prototype.__class__ = Zombie;

        // ╔══ HOOK: spawnMobs — add 2 zombies per level ─────────────
        ModLoader.hook('com.watabou.sevendrl.SevenDRL', 'spawnMobs', null, function() {
            var g = this;
            try {
                var occupied = [];
                for (var i = 0; i < g.queue.length; i++) {
                    if (g.queue[i].pos != null) occupied.push(g.queue[i].pos);
                }
                var raw = window.com_watabou_utils_ArrayExtender.difference(g.cells, g.hero.getFOV());
                var available = [];
                for (var i = 0; i < raw.length; i++) {
                    if (occupied.indexOf(raw[i]) === -1) available.push(raw[i]);
                }
                var count = 0;
                for (var i = 0; i < 2; i++) {
                    var z = new Zombie(g);
                    z.setPos(window.com_watabou_utils_ArrayExtender.pick(available));
                    g.queue.push(z);
                    count++;
                }
                if (window.__eventLogAdd) window.__eventLogAdd('Spawned ' + count + ' zombies');
                if (window.devLog) window.devLog('[zombies] spawned', count, 'zombies');
            } catch (e) {
                if (window.devLog) window.devLog('[zombies] error:', e.message);
            }
        });

        if (window.devLog) window.devLog('[mod:zombies] loaded');
    })();
})();
