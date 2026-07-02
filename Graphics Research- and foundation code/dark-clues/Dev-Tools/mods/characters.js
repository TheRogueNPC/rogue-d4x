// ═══════════════════════════════════════════════════════════════════
// Dev-Tools/mods/characters.js — Character class extensions
// Hook points: Hero move/attack/die, Mob die, Clue textgen
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var Hero   = 'com.watabou.sevendrl.characters.Hero';
    var Mob    = 'com.watabou.sevendrl.characters.Mob';
    var Boss   = 'com.watabou.sevendrl.characters.Boss';
    var Clue   = 'com.watabou.sevendrl.characters.Clue';
    var Hunter = 'com.watabou.sevendrl.characters.Hunter';

    // ╔══ EXTENSION POINT: Hero Actions ──────────────────────────────
    ModLoader.hook(Hero, 'act', null, function() {
        // runs after hero's turn
    });

    // ╔══ FIX: Clue collection edge cases ─────────────────────────────
    // Problem 1: cell outside FOV → target() creates ActionMove (skips clue check)
    // Problem 2: hero on clue cell → target() creates ActionWait
    // Both cases miss the clue check. Only intercept when original fails.
    ModLoader.hook(Hero, 'target', function(cell) {
        if (cell != this.pos && this.sees(cell)) return; // visible case works
        var Clue = window.com_watabou_sevendrl_characters_Clue;
        var ActionCollect = window.com_watabou_sevendrl_characters_ActionCollect;
        if (!Clue || !ActionCollect) return;
        var clue = this.game.getChar(cell, Clue);
        if (!clue) return;
        this.action = new ActionCollect(this, clue);
        this.resume();
        this.__suppressOrig = true;
    });

    // ╔══ GOD MODE + Damage Logging ───────────────────────────────────
    // Merged hook: checks god mode (suppress), then logs before/after
    ModLoader.hook(Hero, 'damage', function(value) {
        if (window.DBG && window.DBG._godMode) {
            if (window.__eventLogAdd) window.__eventLogAdd('God mode blocked ' + (value || 1) + ' damage');
            return this.__suppressOrig = true;
        }
        if (window.devLog) window.devLog('hero takes', value, 'damage | HP before:', this.hp);
    }, function() {
        if (window.devLog) window.devLog('hero HP after:', this.hp);
    });

    ModLoader.hook(Hero, 'die', function() {
        if (window.devLog) window.devLog('HERO DIED at pos:', this.pos);
        if (window.__eventLogAdd) window.__eventLogAdd('Hero died at ' + (this.pos ? this.pos.j + ',' + this.pos.i : '?'));
    });

    // ╔══ EXTENSION POINT: Mob Deaths ────────────────────────────────
    ModLoader.hook(Mob, 'die', function() {
        var name = this.getName ? this.getName() : 'mob';
        if (window.devLog) window.devLog(name, 'died at pos:', this.pos);
        if (window.__eventLogAdd) window.__eventLogAdd(name + ' died at ' + (this.pos ? this.pos.j + ',' + this.pos.i : '?'));
    });

    // ╔══ EXTENSION POINT: Boss Behavior ─────────────────────────────
    ModLoader.hook(Boss, 'die', function() {
        if (window.devLog) window.devLog('BOSS DEFEATED — Victory!');
        if (window.__eventLogAdd) window.__eventLogAdd('BOSS DEFEATED — Victory!');
    });

    // ╔══ EXTENSION POINT: Clue Collection ────────────────────────────
    // Note: Clue.reset is a static method (not on prototype), so we use collect instead
    ModLoader.hook(Clue, 'collect', null, function() {
        if (window.devLog && this.text) window.devLog('clue text:', this.text);
        if (window.__eventLogAdd) window.__eventLogAdd('Collected clue: "' + (this.text || '?') + '"');
    });

    // ╔══ EXTENSION POINT: Hunter Aggro ──────────────────────────────
    ModLoader.hook(Hunter, 'act', null, function() {
        // Hunter moved/chased
    });

    // ╔══ DEV: Signal Subscriptions (once game exists) ───────────────
    (function waitForHero() {
        if (window.hero) {
            if (window.hero.cardChanged) window.hero.cardChanged.add(function(card) {
                if (window.devLog) window.devLog('[signal] card:', card);
            });
            if (window.hero.hpChanged) window.hero.hpChanged.add(function(hp) {
                if (window.devLog) window.devLog('[signal] HP:', hp);
            });
            if (window.devLog) window.devLog('[mod:characters] signals subscribed');
        } else {
            setTimeout(waitForHero, 500);
        }
    })();

    if (window.devLog) window.devLog('[mod:characters] loaded — hero/mob/clue hooks active');
})();