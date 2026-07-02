// ═══════════════════════════════════════════════════════════════════
// MOD: add-encounter.js — Room-entry encounter template
// Load after: rogue-api.js (needs Rogue.Encounter / Rogue.Mob)
//
// This is a TEMPLATE — uncomment and adapt. See
// Dev-Tools/skills/workflows/add-encounter.md for the full reference.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    Rogue.onReady(function() {
        // ── Example: a one-time "spirit nest" in a large room, levels 1-3 ──
        Rogue.Mob.define({
            name: 'VengefulSpirit',
            hp: 2,
            visual: 'v',
            color: 0x8888FF,
            info: 'A restless spirit, drawn to the living.',
            damage: 1,
            state: 'chasing'
        });

        Rogue.Encounter.define({
            name: 'spirit_nest',
            minLevel: 1,
            maxLevel: 3,
            roomSize: 'large',
            once: true,
            onEnter: function(game, room) {
                var Spirit = window['com.watabou.sevendrl.characters.VengefulSpirit'.replace(/\./g, '_')];
                if (!Spirit) return null;
                if (window.__eventLogAdd) window.__eventLogAdd('You feel watched...');
                return Rogue.Encounter.spawnInRoom(game, room, Spirit, 3);
            }
        });

        // ── Example: generic room-enter handler (no spawn, just a trigger) ──
        Rogue.Encounter.onRoomEnter(function(room, game) {
            if (room.id === game.plan.bossRoomId) {
                if (window.__eventLogAdd) window.__eventLogAdd('The air grows cold near the boss room...');
            }
        });

        if (window.devLog) window.devLog('[mod:add-encounter] template ready — spirit_nest encounter registered');
    });
})();
