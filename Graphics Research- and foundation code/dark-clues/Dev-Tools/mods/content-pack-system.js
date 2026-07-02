// ═══════════════════════════════════════════════════════════════════════════════
// MOD: content-pack-system.js — Organize features into toggleable content packs
//
// Lets you enable/disable groups of mobs, abilities, encounters via
// window.__contentPacks. Each pack is a collection of features; mods
// can check if their pack is enabled before registering.
//
// Load after: rogue-api.js (early, so other mods can check pack status)
// ═══════════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ╔══ DEFINE CONTENT PACKS ───────────────────────────────────────────────────
    // Each pack is { enabled: bool, name: string, description: string, features: [] }
    window.__contentPacks = {
        // Core pack — always enabled, ships with game
        core: {
            enabled: true,
            name: 'Core Game',
            description: 'Base roguelike content: Wanderer, Hunter, basic abilities',
            features: ['base_mobs', 'base_encounters', 'base_abilities']
        },

        // Example expansion packs (uncomment to enable by default)
        // creatures: {
        //     enabled: false,
        //     name: 'Bestiary Expansion',
        //     description: 'Additional enemy types: Goblin, Phantom, Zombie',
        //     features: ['goblin_mob', 'phantom_mob', 'zombie_mob']
        // },

        // powers: {
        //     enabled: false,
        //     name: 'Arcane Powers',
        //     description: 'New abilities: Fireball, Teleport, Shield',
        //     features: ['fireball_ability', 'teleport_ability', 'shield_ability']
        // },

        // treasures: {
        //     enabled: false,
        //     name: 'Treasure Hoard',
        //     description: 'Collectibles: Health Potion, Mana Crystal, Cursed Amulet',
        //     features: ['health_potion_pickup', 'mana_crystal_pickup', 'cursed_amulet_pickup']
        // }
    };

    // ╔══ REGISTRY: Map feature IDs to their mod names ────────────────────────────
    window.__contentFeatures = {
        // Core features
        base_mobs: ['zombies.js'],  // zombies.js is an active mod
        base_encounters: [],  // default encounters are in game.js
        base_abilities: ['ability.js'],  // ability.js is active

        // Example expansion features (mods uncomment these when they load)
        // goblin_mob: ['goblin-mob.js'],
        // phantom_mob: ['phantom-mob.js'],
        // fireball_ability: ['fireball-ability.js'],
        // health_potion_pickup: ['health-potion-pickup.js']
    };

    // ╔══ HELPER: Check if a feature/pack is enabled ────────────────────────────
    window.isPackEnabled = function(packName) {
        var pack = window.__contentPacks[packName];
        return pack && pack.enabled;
    };

    window.isFeatureEnabled = function(featureId) {
        // Find which pack contains this feature
        for (var packName in window.__contentPacks) {
            var pack = window.__contentPacks[packName];
            if (!pack.enabled) continue;
            if (pack.features && pack.features.indexOf(featureId) !== -1) {
                return true;
            }
        }
        return false;
    };

    // ╔══ HELPER: Enable/disable a pack at runtime ───────────────────────────────
    window.enablePack = function(packName) {
        if (window.__contentPacks[packName]) {
            window.__contentPacks[packName].enabled = true;
            if (window.devLog) window.devLog('[content-pack] enabled: ' + packName);
        }
    };

    window.disablePack = function(packName) {
        if (window.__contentPacks[packName]) {
            window.__contentPacks[packName].enabled = false;
            if (window.devLog) window.devLog('[content-pack] disabled: ' + packName);
        }
    };

    // ╔══ HELPER: List all packs ────────────────────────────────────────────────
    window.listContentPacks = function() {
        console.log('=== CONTENT PACKS ===');
        for (var packName in window.__contentPacks) {
            var pack = window.__contentPacks[packName];
            console.log(
                (pack.enabled ? '✓' : '✗') + ' ' + packName + ' — ' + pack.description +
                ' (' + pack.features.length + ' features)'
            );
        }
    };

    // ╔══ HELPER: Register a feature under a pack (called by feature mods) ───────
    window.registerFeature = function(featureId, modNames) {
        if (!window.__contentFeatures) window.__contentFeatures = {};
        window.__contentFeatures[featureId] = modNames || [];
        if (window.devLog) window.devLog('[content-pack] registered feature: ' + featureId);
    };

    // ╔══ EXAMPLE: A mod can check if it should load ────────────────────────────
    // Place this at the top of any feature mod:
    //
    //   if (!window.isFeatureEnabled('my_feature_id')) {
    //       if (window.devLog) window.devLog('[my-feature] disabled via content pack');
    //       return;
    //   }

    if (window.devLog) window.devLog('[mod:content-pack-system] loaded — ' + Object.keys(window.__contentPacks).length + ' packs available');
})();
