// ═══════════════════════════════════════════════════════════════════
// MOD: change-clues.js — Customize clue text/grammar
// Load after: loader.js, game.js
//
// Two approaches:
//   A) Edit assets/clues.json directly (persistent, survives reload)
//   B) Push new grammar rules at runtime (this file — no file changes)
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var Clue = 'com.watabou.sevendrl.characters.Clue';

    // ── Approach A: Override Clue.reset() to inject custom grammar ──
    ModLoader.hook(Clue, 'reset', function() {
        var grammar = com_watabou_sevendrl_characters_Clue.grammar;
        if (!grammar) return;
        if (this._modInjected) return;
        this._modInjected = true;

        // Add new clue rules
        grammar.pushRules("clue", [
            "a cryptic message scrawled in blood",
            "an {ancient|futuristic} device with blinking lights",
            "a torn photograph of a familiar {face|place}",
            "a {golden|silver|bronze} key {covered in|etched with} strange symbols",
            "a journal entry describing a {ritual|meeting|betrayal}",
            "footprints that lead {nowhere|into a wall|to the ceiling}"
        ]);
    });

    // ── Approach B: Override the root grammar symbol ────────────────
    ModLoader.hook(Clue, 'reset', null, function() {
        // The clue text is now in this.text — we can also post-process it
        if (this.text && window.devLog) {
            window.devLog('Clue generated:', this.text);
        }
    });

    // ── Runtime: Add clues from dev console ─────────────────────────
    window.addClueRule = function(rule) {
        var grammar = com_watabou_sevendrl_characters_Clue.grammar;
        if (!grammar) return 'No grammar found';
        grammar.pushRules("clue", [rule]);
        return 'Added: "' + rule + '"';
    };

    if (window.devLog) window.devLog('[mod:change-clues] loaded — custom clue rules ready');
    if (window.devLog) window.devLog('  Use addClueRule("your clue text") from console');
})();