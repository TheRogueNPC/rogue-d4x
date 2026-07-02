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
        '  background:rgba(17,17,34,0.92); border:1px solid #555;',
        '  padding:6px 8px;',
        '  font-family:"Share Tech Regular",monospace; font-size:11px; color:#ddd;',
        '  min-width:260px; max-height:200px; overflow-y:auto;',
        '  display:none; line-height:1.5;',
        '}',
        '#dc-inspector .i-title { color:#0ff; font-weight:bold; border-bottom:1px solid #0ff; padding-bottom:2px; margin-bottom:4px; }',
        '#dc-inspector .i-row { display:flex; justify-content:space-between; }',
        '#dc-inspector .i-label { color:#888; }',
        '#dc-inspector .i-value { color:#ddd; text-align:right; }',
        '#dc-inspector .i-value.danger { color:#f44; }',
        '#dc-inspector .i-value.warn { color:#f80; }',
        '#dc-inspector .i-value.good { color:#4f4; }',
        '#dc-inspector .i-section { border-top:1px solid #333; margin-top:3px; padding-top:3px; }',
    ].join('\n');

    function init() {
        if (document.getElementById('dc-inspector')) return;
        if (window.__devToolsEnabled === false) return;

        var style = document.createElement('style');
        style.textContent = PANEL_STYLE;
        document.head.appendChild(style);

        var panel = document.createElement('div');
        panel.id = 'dc-inspector';

        // Structure
    panel.innerHTML = [
        '<div class="i-title">Game Inspector</div>',
        '<div id="i-scene"><div class="i-row"><span class="i-label">Scene</span><span class="i-value" id="i-scene-name">-</span></div></div>',
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
        '<div id="i-rooms"><div class="i-row"><span class="i-label">Rooms</span><span class="i-value" id="i-rooms">-</span></div></div>',
        '<div id="i-action"><div class="i-row"><span class="i-label">Action</span><span class="i-value" id="i-action-val">-</span></div></div>',
        '<div id="i-state"><div class="i-row"><span class="i-label">State</span><span class="i-value" id="i-state-val">-</span></div></div>',
    ].join('');

        document.body.appendChild(panel);

        // Map of card index to name
        var CARD_NAMES = ['WEAK', 'NORMAL', 'STRONG'];

        // Poll loop — tracks state across all scenes (title, game, death, victory)
        var tick = 0;
        var intervalId = setInterval(function() {
            var p = panel;
            // `panel` is the DOM node captured at creation time — it stays
            // truthy even after being removed from the document (a detached
            // node is still a valid object reference), so a bare `!p` check
            // never catches that case. Whatever else removes #dc-inspector
            // from the DOM, this interval kept polling forever afterward,
            // throwing on every byId() call below, 4x/sec, indefinitely.
            if (!p || !document.body.contains(p)) { clearInterval(intervalId); return; }

            var Game = window.com_watabou_coogee_Game;
            var scene = Game && Game.scene;
            var sceneName = '-';
            if (scene && scene.__class__ && scene.__class__.__name__) {
                var parts = scene.__class__.__name__.split('.');
                sceneName = parts[parts.length - 1];
            } else if (scene && scene.__name__) {
                var parts = scene.__name__.split('.');
                sceneName = parts[parts.length - 1];
            }
            byId('i-scene-name').textContent = sceneName;

            var g = window.sevendrl;
            var h = window.hero;

            if (!g || !h) {
                // Non-game scenes — show placeholder
                byId('i-hp').textContent = '-';
                byId('i-lvl').textContent = '-';
                byId('i-card-val').textContent = '-';
                byId('i-card-val').className = 'i-value';
                byId('i-clue-count').textContent = '-';
                byId('i-mob-count').textContent = '-';
                byId('i-queue-count').textContent = '-';
                byId('i-boss-status').textContent = '-';
                byId('i-boss-status').className = 'i-value';
                byId('i-pos').textContent = '-';
                byId('i-rooms').textContent = '-';
                return;
            }

            // Level (static property on the class, not instance)
            var svdrl = window.com_watabou_sevendrl_SevenDRL;
            byId('i-lvl').textContent = svdrl ? svdrl.level : '-';

            // HP (Hero has no maxHP — hardcode 6)
            var hpEl = byId('i-hp');
            var maxHP = h.maxHP || 6;
            hpEl.textContent = (h.hp != null ? h.hp : '?') + ' / ' + maxHP;
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

            // Queue — count characters by type
            var q = g.queue || [];
            var nClues = 0, nMobs = 0, nBossAlive = 0, nFound = 0;
            var clueCls = window.com_watabou_sevendrl_characters_Clue;
            var mobCls = window.com_watabou_sevendrl_characters_Mob;
            var bossCls = window.com_watabou_sevendrl_characters_Boss;
            for (var i = 0; i < q.length; i++) {
                var ch = q[i];
                if (ch === h) continue;
                if (bossCls && ch instanceof bossCls) {
                    nBossAlive++;
                    nMobs++;
                } else if (mobCls && ch instanceof mobCls) {
                    nMobs++;
                } else if (clueCls && ch instanceof clueCls) {
                    if (ch.discovered) nFound++;
                    nClues++;
                }
            }
            byId('i-clue-count').textContent = nClues + ' (' + nFound + ' found)';
            byId('i-mob-count').textContent = nMobs;
            byId('i-queue-count').textContent = q.length;
            byId('i-boss-status').textContent = nBossAlive ? 'Alive' : 'Vanquished';
            byId('i-boss-status').className = 'i-value' + (nBossAlive ? ' danger' : ' good');

            // Pos — h.pos is a cell object {i, j}, not a number index
            if (h.pos != null) {
                byId('i-pos').textContent = (h.pos.j != null ? h.pos.j : '?') + ',' + (h.pos.i != null ? h.pos.i : '?');
            }

            // Rooms visited
            if (g.plan && g.plan.rooms) {
                byId('i-rooms').textContent = g.visited.length + ' / ' + g.plan.rooms.length;
            }

            // Current action
            var actionEl = byId('i-action-val');
            if (h.action) {
                var cls = h.action.__class__;
                var aname = cls ? cls.__name__ : 'Action';
                var parts = aname.split('.');
                actionEl.textContent = parts[parts.length - 1];
            } else {
                actionEl.textContent = 'none';
            }

            // State / pause
            var stateEl = byId('i-state-val');
            var states = [];
            if (window.DBG && window.DBG._paused) states.push('PAUSED');
            if (h.paused) states.push('PAUSED');
            states.push('isReady=' + h.isReady);
            stateEl.textContent = states.join(' ');

            tick++;

        }, 250); // 4x/sec

        function byId(id) { return document.getElementById(id); }

        if (typeof devLog !== 'undefined') devLog('[ui:inspector] ready — shows live game state');
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