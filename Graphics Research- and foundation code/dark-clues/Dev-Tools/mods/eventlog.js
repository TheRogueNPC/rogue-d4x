// ═══════════════════════════════════════════════════════════════════
// Dev-Tools/mods/eventlog.js — Centralized game event logging
// Stores timestamped events in window.__eventLog for DBG.log()
// Subscribes to game signals — no method hooking (avoids conflicts).
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.__eventLog = [];

    window.__eventLogAdd = function(msg) {
        var d = new Date();
        var ts = d.getHours().toString().padStart(2, '0') + ':' +
                 d.getMinutes().toString().padStart(2, '0') + ':' +
                 d.getSeconds().toString().padStart(2, '0');
        var entry = '[' + ts + '] ' + msg;
        window.__eventLog.push(entry);
        if (window.__eventLog.length > 500) window.__eventLog.shift();
        if (window.devLog) window.devLog('[event] ' + msg);
    };

    // ── Wait for game instance, then subscribe to signals ─────────
    (function waitForGame() {
        var g = window.sevendrl;
        if (!g || !g.hero) { setTimeout(waitForGame, 500); return; }

        if (g.clueFound) g.clueFound.add(function(clue) {
            __eventLogAdd('Clue found: "' + (clue.text || '?') + '"');
        });

        if (g.over) g.over.add(function(won) {
            __eventLogAdd(won ? 'VICTORY! All clues collected, boss defeated!' : 'Game Over — Hero died');
        });

        if (g.hero.hpChanged) g.hero.hpChanged.add(function(hp) {
            __eventLogAdd('HP changed to ' + hp);
        });

        if (g.hero.cardChanged) g.hero.cardChanged.add(function(card) {
            __eventLogAdd('Drew card: ' + (card._hx_name || '?'));
        });

        if (g.hero.roomChanged) g.hero.roomChanged.add(function(room) {
            var idx = (g.plan && g.plan.rooms) ? g.plan.rooms.indexOf(room) : -1;
            __eventLogAdd('Entered room ' + (idx >= 0 ? idx : '?'));
        });

        __eventLogAdd('Event log active');
        if (window.devLog) window.devLog('[mod:eventlog] subscribed to game signals');
    })();

    if (window.devLog) window.devLog('[mod:eventlog] loaded — waiting for game signals');
})();
