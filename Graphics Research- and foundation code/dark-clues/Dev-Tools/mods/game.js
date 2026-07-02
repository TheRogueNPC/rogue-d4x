// ═══════════════════════════════════════════════════════════════════
// Dev-Tools/mods/game.js — Core game logic extensions
// Hook points: spawnMobs, spawnClues, collectClue, proceed
// Game over signals subscribed in waitForGame() below
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var SevenDRL = 'com.watabou.sevendrl.SevenDRL';

    // ╔══ EXTENSION POINT: Mob Spawning ──────────────────────────────
    // Note: SevenDRL.level is a static property, use window lookup
    ModLoader.hook(SevenDRL, 'spawnMobs', null, function() {
        var svdrl = window.com_watabou_sevendrl_SevenDRL;
        var lvl = svdrl ? svdrl.level : this.level;
        if (window.devLog) window.devLog('spawnMobs | level:', lvl, 'mobs spawned');
        if (window.__eventLogAdd) window.__eventLogAdd('Mobs spawned (level ' + lvl + ')');
    });

    // ╔══ EXTENSION POINT: Clue Spawning ─────────────────────────────
    // Guard spawnClues if hero/room/map state is unstable.
    // pf.getMap(to, available) returns null (crashing spawnClues) when
    // `to` isn't in `available` OR when the BFS in getMap can't reach every
    // cell in `available` from `to` (disconnected region in the cell graph)
    // — checking hero.pos's membership in this.cells alone isn't enough,
    // so just call the real getMap here and suppress if IT says null.
ModLoader.before(SevenDRL, 'spawnClues', function() {
	if (!this || !this.hero || !this.hero.pos || !this.hero.room || !this.cells || !this.pf
		|| !this.pf.getMap(this.hero.pos, this.cells)) {
		if (window.devLog) window.devLog('spawnClues | skipped — pf.getMap(hero.pos, cells) returned null (unstable/disconnected map state)');
		this.__suppressOrig = true;
		return;
	}
});

ModLoader.hook(SevenDRL, 'spawnClues', null, function() {
        var clueCount = this.maxClues || 0;
        if (window.devLog) window.devLog('spawnClues | placing', clueCount, 'clues');
        if (window.__eventLogAdd) window.__eventLogAdd('Placed ' + clueCount + ' clues');
    });

    // ╔══ EXTENSION POINT: Clue Collection ───────────────────────────
    // Note: clues live in this.queue, not this.clues — filter via instanceof
    ModLoader.hook(SevenDRL, 'collectClue', null, function() {
        var Clue = window.com_watabou_sevendrl_characters_Clue;
        var remaining = 0;
        if (Clue && this.queue) {
            for (var i = 0; i < this.queue.length; i++) {
                if (this.queue[i] instanceof Clue) remaining++;
            }
        }
        if (window.devLog) window.devLog('clue collected | remaining:', remaining);
        if (remaining === 0 && window.devLog) window.devLog('ALL CLUES COLLECTED — Boss incoming!');
    });

    // ╔══ EXTENSION POINT: Game Turn (fires on every tick) ──────────
    ModLoader.hook(SevenDRL, 'proceed', null, function() {
        // Re-capture game instance globals every tick, not just the first.
        // The old `if (!window.sevendrl)` guard meant these were set ONCE,
        // ever, for the whole page session — after ANY reset (new SevenDRL
        // instance), window.sevendrl/window.hero kept pointing at the
        // ORIGINAL, now-orphaned instance forever. Every DBG.* command and
        // every mod feature that reads window.sevendrl/window.hero
        // (basically all of them) was silently operating on a disconnected
        // ghost game object after the first reset — explaining reports
        // like "rerollClues doesn't seem to do anything" when tested on a
        // second playthrough. Cheap to do every tick; only log once.
        if (window.sevendrl !== this) {
            if (!window.sevendrl && window.devLog) window.devLog('Game instance captured via proceed() hook');
            window.sevendrl = this;
        }
        window.hero = this.hero;
    });

    // ╔══ EXTENSION POINT: Subscribe to game signals ─────────────────
    // Note: game over is a signal (this.over), not a method.
    // Hooked via g.over.add() in waitForGame() below.
    // ║ These fire once the game instance exists (globals set by createPlan hook above)
    // ╚════════════════════════════════════════════════════════════════
    (function waitForGame() {
        var g = window.sevendrl;
        if (g) {
            if (g.clueFound) g.clueFound.add(function(clue) {
                if (window.devLog) window.devLog('[signal] clueFound:', clue ? clue.text : '?');
            });
            if (g.over) g.over.add(function(won) {
                if (window.devLog) window.devLog('[signal] game.over:', won);
            });
            if (window.devLog) window.devLog('[mod:game] signals subscribed');
        } else {
            setTimeout(waitForGame, 500);
        }
    })();

    if (window.devLog) window.devLog('[mod:game] loaded — spawn/clue/gameover hooks active');
})();