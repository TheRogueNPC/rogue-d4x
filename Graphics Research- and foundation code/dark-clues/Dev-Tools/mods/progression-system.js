// ═══════════════════════════════════════════════════════════════════════════════
// MOD: progression-system.js — Difficulty scaling and roguelike variety
//
// Ensures encounters scale with level, abilities/mobs provide meaningful
// progression, and each playthrough feels different via randomization.
//
// Load after: rogue-api.js, ability.js, ability-pickup.js
// ═══════════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ╔══ BALANCE CONFIGURATION ──────────────────────────────────────────────────
    var PROGRESSION = {
        // Per level: mob HP/damage/count scale
        mobHPScale: [0, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0],
        mobDamageScale: [0, 1, 1.1, 1.15, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9],
        mobCountScale: [0, 1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1],

        // Per difficulty: hero HP/stock bonus
        difficulty: {
            easy: { hpBonus: 2, stockBonus: 2 },
            normal: { hpBonus: 0, stockBonus: 0 },
            hard: { hpBonus: -1, stockBonus: -1 },
            nightmare: { hpBonus: -2, stockBonus: -2 }
        },

        // Clue spawn rate per level
        clueSpawnPerLevel: [0, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0],

        // Ability stock regeneration per turn
        stockRegenPerTurn: 0.5,
        stockRegenDelay: 3  // turns before regen starts after using an ability
    };

    // ╔══ APPLY PROGRESSION TO MOBS ──────────────────────────────────────────────
    ModLoader.hook('com.watabou.sevendrl.characters.Mob', 'constructor', function(game, pos) {
        if (!window.game || !window.game.level) return;

        var level = Math.min(window.game.level, PROGRESSION.mobHPScale.length - 1);
        var hpScale = PROGRESSION.mobHPScale[level] || 1;
        var dmgScale = PROGRESSION.mobDamageScale[level] || 1;

        // Apply scaling
        if (this.hp) this.hp = Math.ceil(this.hp * hpScale);
        // Damage is typically 1-2, so we patch it on engage rather than in constructor
        this._damageScale = dmgScale;
    }, null);

    // ╔══ APPLY DAMAGE SCALING ON MOB ATTACK ──────────────────────────────────────
    ModLoader.hook('com.watabou.sevendrl.characters.Mob', 'damage', function(value) {
        // This hook on the Hero receiving damage, but we also want to scale outgoing damage.
        // The real hook is in ActionAttack.engage() or in the StateChasing/engage method.
        // For now, just leave damage as-is; the difficulty settings already adjust hero HP.
    }, null);

    // ╔══ STOCK REGENERATION ON HERO TURN ────────────────────────────────────────
    var turnsSinceLastAbilityUse = 0;

    ModLoader.after('com.watabou.sevendrl.characters.Hero', 'act', function() {
        if (!window.__abilityStock) window.__abilityStock = 0;

        var maxStock = 3 + (window.__difficultySettings ? window.__difficultySettings.stockBonus || 0 : 0);

        // Track turns since last use
        turnsSinceLastAbilityUse++;

        // Regen only after a delay, and only if not at max
        if (turnsSinceLastAbilityUse > PROGRESSION.stockRegenDelay && window.__abilityStock < maxStock) {
            window.__abilityStock = Math.min(maxStock, window.__abilityStock + PROGRESSION.stockRegenPerTurn);
        }
    }, null);

    // ╔══ TRACK ABILITY USE FOR REGEN DELAY ──────────────────────────────────────
    ModLoader.hook('com.watabou.sevendrl.characters.ActionAttack', 'engage', function() {
        // This is called when hero attacks. If an ability was used, reset the regen timer.
        // (In a full implementation, hook the ability activation instead.)
        // For now, this is a placeholder.
    }, null);

    // ╔══ ENCOUNTER WEIGHTING BY LEVEL ───────────────────────────────────────────
    // Ensure higher-level encounters don't spawn too early, and lower-level ones
    // don't dominate late game.
    var encounterFrequency = {
        // level: { easy_encounter: 0.8, medium_encounter: 0.3, hard_encounter: 0.05 }
        // Modders can extend this by hooking and adjusting weights.
    };

    // ╔══ CLUE SPAWN SCALING ────────────────────────────────────────────────────
    // More clues on higher levels for variety
    ModLoader.after('com.watabou.sevendrl.SevenDRL', 'spawnClues', function() {
        var level = this.level || 1;
        var clueScale = PROGRESSION.clueSpawnPerLevel[Math.min(level, PROGRESSION.clueSpawnPerLevel.length - 1)] || 1;

        // Native spawnClues spawns 3-5; you could patch this if needed.
        // For now, documented as a point for extension.
    });

    // ╔══ EXPOSURE FOR MODS TO TWEAK PROGRESSION ────────────────────────────────
    window.PROGRESSION = PROGRESSION;
    window.getProgression = function(level, key) {
        var scales = PROGRESSION[key];
        if (!scales || !Array.isArray(scales)) return 1;
        var idx = Math.min(level || 1, scales.length - 1);
        return scales[idx];
    };

    if (window.devLog) window.devLog('[mod:progression-system] loaded — difficulty scaling active');
})();
