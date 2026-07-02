// ═══════════════════════════════════════════════════════════════════
// UI: inspector.js — Live game state inspector panel
// Shows hero stats, current card, clue count, mob list, turn info.
// Auto-updates via polling (no signal dependency).
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var PANEL_STYLE = [
        '#dc-inspector {',
        '  position:fixed; bottom:10px; left:10px; z-index:9997;',
        '  background:rgba(0,0,0,0.88); border:1px solid #0f0;',
        '  border-radius:4px; padding:6px 8px;',
        '  font-family:monospace; font-size:11px; color:#0f0;',
        '  min-width:260px; max-height:200px; overflow-y:auto;',
        '  display:none; line-height:1.5;',
        '}',
        '#dc-inspector .i-title { color:#0ff; font-weight:bold; border-bottom:1px solid #0ff; padding-bottom:2px; margin-bottom:4px; }',
        '#dc-inspector .i-row { display:flex; justify-content:space-between; }',
        '#dc-inspector .i-label { color:#888; }',
        '#dc-inspector .i-value { color:#0f0; text-align:right; }',
        '#dc-inspector .i-value.danger { color:#f44; }',
        '#dc-inspector .i-value.warn { color:#f80; }',
        '#dc-inspector .i-value.good { color:#4f4; }',
        '#dc-inspector .i-section { border-top:1px solid #333; margin-top:3px; padding-top:3px; }',
    ].join('\n');

    function init() {
        if (document.getElementById('dc-inspector')) return;

        var style = document.createElement('style');
        style.textContent = PANEL_STYLE;
        document.head.appendChild(style);

        var panel = document.createElement('div');
        panel.id = 'dc-inspector';

        // Structure
        panel.innerHTML = [
            '<div class="i-title">Game Inspector</div>',
            '<div id="i-hero"><div class="i-row"><span class="i-label">Hero</span><span class="i-value" id="i-hp">-</span></div></div>',
            '<div id="i-level"><div class="i-row"><span class="i-label">Level</span><span class="i-value" id="i-lvl">-</span></div></div>',
            '<div id="i-card"><div class="i-row"><span class="i-label">Card</span><span class="i-value" id="i-card-val">-</span></div></div>',
            '<div class="i-section"></div>',
            '<div id="i-clues"><div class="i-row"><span class="i-label">Clues</span><span class="i-value" id="i-clue-count">-</span></div></div>',
            '<div id="i-mobs"><div class="i-row"><span class="i-label">Mobs</span><span class="i-value" id="i-mob-count">-</span></div></div>',
            '<div id="i-queue"><div class="i-row"><span class="i-label">Queue</span><span class="i-value" id="i-queue-count">-</span></div></div>',
            '<div class="i-section"></div>',
            '<div id="i-boss"><div class="i-row"><span class="i-label">Boss</span><span class="i-value" id="i-boss-status">-</span></div></div>',
            '<div id="i-pos"><div class="i-row"><span class="i-label">Pos</span><span class="i-value" id="i-pos">-</span></div></div>',
        ].join('');

        document.body.appendChild(panel);

        // Map of card index to name
        var CARD_NAMES = ['WEAK', 'NORMAL', 'STRONG'];

        // Poll loop
        var tick = 0;
        setInterval(function() {
            var g = window.sevendrl;
            var h = window.hero;
            var p = panel;
            if (!g || !h || !p) return;

            // Level
            byId('i-lvl').textContent = g.level || '-';

            // HP
            var hpEl = byId('i-hp');
            hpEl.textContent = (h.hp != null ? h.hp : '?') + ' / ' + (h.maxHP != null ? h.maxHP : '?');
            hpEl.className = 'i-value' + (
                h.hp <= 1 ? ' danger' : h.hp <= 3 ? ' warn' : ' good'
            );

            // Card
            var cardEl = byId('i-card-val');
            if (h.card != null) {
                cardEl.textContent = CARD_NAMES[h.card] || 'CUSTOM(' + h.card + ')';
                cardEl.className = 'i-value' + (
                    h.card >= 2 ? ' good' : ''
                );
            } else {
                cardEl.textContent = '-';
                cardEl.className = 'i-value';
            }

            // Clues
            var clues = g.clues;
            var found = 0;
            if (clues) {
                for (var i = 0; i < clues.length; i++) {
                    if (clues[i].discovered) found++;
                }
            }
            byId('i-clue-count').textContent = (clues ? clues.length : 0) + ' (' + found + ' found)';

            // Mobs
            byId('i-mob-count').textContent = g.mobs ? g.mobs.length : 0;

            // Queue
            byId('i-queue-count').textContent = g.charQueue ? g.charQueue.length : 0;

            // Boss
            byId('i-boss-status').textContent = g.boss ? 'Alive' : 'Vanquished';
            byId('i-boss-status').className = 'i-value' + (g.boss ? ' danger' : ' good');

            // Pos
            if (h.pos != null) {
                var grid = g.plan && g.plan.grid;
                if (grid) {
                    var x = h.pos % grid.width;
                    var y = Math.floor(h.pos / grid.width);
                    byId('i-pos').textContent = x + ',' + y + ' (idx:' + h.pos + ')';
                } else {
                    byId('i-pos').textContent = 'idx:' + h.pos;
                }
            }

            tick++;

        }, 250); // 4x/sec

        function byId(id) { return document.getElementById(id); }

        devLog('[ui:inspector] ready — shows live game state');
    }

    // ── Toggle helper exposed globally ──
    window.toggleInspector = function() {
        var p = document.getElementById('dc-inspector');
        if (!p) { devLog('Inspector not loaded yet'); return; }
        var show = p.style.display === 'none' || p.style.display === '';
        p.style.display = show ? 'block' : 'none';
        devLog('Inspector ' + (show ? 'shown' : 'hidden'));
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();