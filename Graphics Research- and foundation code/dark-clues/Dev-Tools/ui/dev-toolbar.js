// ═══════════════════════════════════════════════════════════════════
// UI: dev-toolbar.js — Floating action toolbar
// Adds a draggable toolbar with quick-action buttons to the page.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var TOOLBAR_STYLE = [
        '#dc-dev-toolbar {',
        '  position:fixed; top:40px; left:10px; z-index:9998;',
        '  background:rgba(17,17,34,0.92); border:1px solid #555;',
        '  padding:4px; display:flex; flex-direction:column;',
        '  gap:3px; font-family:"Share Tech Regular",monospace; font-size:10px;',
        '  user-select:none; cursor:grab; min-width:36px;',
        '}',
        '#dc-dev-toolbar:hover { border-color:#0ff; }',
        '#dc-toolbar-toggle {',
        '  background:#111122; color:#0ff; border:1px solid #555; cursor:pointer;',
        '  font-family:"Share Tech Regular",monospace; font-weight:bold; font-size:14px;',
        '  padding:2px 8px; line-height:1;',
        '}',
        '#dc-toolbar-toggle:hover { border-color:#0ff; background:#1a1a33; }',
        '.dc-btn {',
        '  background:#111122; color:#ddd; border:1px solid #555; cursor:pointer;',
        '  font-family:"Share Tech Regular",monospace; font-size:10px; padding:3px 6px;',
        '  white-space:nowrap; text-align:left;',
        '}',
        '.dc-btn:hover { border-color:#ddd; }',
        '.dc-btn.danger:hover { border-color:#f44; color:#f44; }',
        '.dc-btn.warn:hover { border-color:#f80; color:#f80; }',
        '.dc-btn-group { border-top:1px solid #333; padding-top:3px; margin-top:3px; }',
        '.dc-btn-group-label { color:#888; font-size:9px; padding:1px 2px; }',
        '.dc-btn.spawn-active { background:#1a1a33; border-color:#f80; color:#f80; font-weight:bold; }',
        '#dc-spawn-indicator {',
        '  position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);',
        '  z-index:9999; pointer-events:none;',
        '  background:rgba(255,136,0,0.25); border:2px dashed #f80;',
        '  border-radius:8px; padding:12px 24px;',
        '  font-family:monospace; font-size:18px; color:#f80; font-weight:bold;',
        '  text-shadow:0 0 8px #000; display:none;',
        '}',
    ].join('\n');

    var HIDDEN = 'display:none';

    function init() {
        if (document.getElementById('dc-dev-toolbar')) return;
        if (window.__devToolsEnabled === false) return;

        // Inject styles
        var style = document.createElement('style');
        style.textContent = TOOLBAR_STYLE;
        document.head.appendChild(style);

        // Build toolbar
        var tb = document.createElement('div');
        tb.id = 'dc-dev-toolbar';

        var toggle = document.createElement('button');
        toggle.id = 'dc-toolbar-toggle';
        toggle.textContent = '[]';
        toggle.title = 'Toggle dev toolbar';
        tb.appendChild(toggle);

        var content = document.createElement('div');
        content.id = 'dc-toolbar-content';
        content.style.cssText = HIDDEN;

        // Helper: button factory
        function btn(label, fn, cls) {
            var b = document.createElement('button');
            b.className = 'dc-btn' + (cls ? ' ' + cls : '');
            b.textContent = label;
            b.onclick = fn;
            content.appendChild(b);
            return b;
        }
        function group(label) {
            var g = document.createElement('div');
            g.className = 'dc-btn-group';
            var l = document.createElement('div');
            l.className = 'dc-btn-group-label';
            l.textContent = label;
            g.appendChild(l);
            content.appendChild(g);
            return g;
        }
        function gbtn(groupEl, label, fn, cls) {
            var b = document.createElement('button');
            b.className = 'dc-btn' + (cls ? ' ' + cls : '');
            b.textContent = label;
            b.onclick = fn;
            groupEl.appendChild(b);
            return b;
        }

        // ── Status ──
        gbtn(group('Status'), 'Status', function() {
            devLog(JSON.stringify(DBG.status(), null, 2));
        });

        // ── Hero actions ──
        var hg = group('Hero');
        gbtn(hg, 'Heal', function() { devLog(DBG.heal()); });
        gbtn(hg, 'DMG 1', function() { devLog(DBG.damage(1)); }, 'danger');
        gbtn(hg, 'DMG 5', function() { devLog(DBG.damage(5)); }, 'danger');
        gbtn(hg, 'Kill', function() { devLog(DBG.kill()); }, 'danger');
        gbtn(hg, 'Skip Turn', function() { DBG.skipTurn(); });

        // ── Map ──
        var mg = group('Map');
        gbtn(mg, 'Reveal', function() { devLog(DBG.reveal()); });
        gbtn(mg, 'Next Level', function() { devLog(DBG.nextLevel()); });

        // ── Spawning (click-to-place) ──
        var sg = group('Spawn (click, then map)');
        gbtn(sg, '1 Clue', function() { setSpawn({ key:'1', label:'Clue', cls:'Clue' }); });
        gbtn(sg, '2 Zombie', function() { setSpawn({ key:'2', label:'Zombie', cls:'Zombie' }); });
        gbtn(sg, '3 Disturbed', function() { setSpawn({ key:'3', label:'Disturbed Spirit', cls:'Ambusher' }); });
        gbtn(sg, '4 Vengeful', function() { setSpawn({ key:'4', label:'Vengeful Spirit', cls:'Hunter' }); });
        gbtn(sg, '5 Lost', function() { setSpawn({ key:'5', label:'Lost Spirit', cls:'Wanderer' }); });
        gbtn(sg, '6 Curse', function() { setSpawn({ key:'6', label:'Curse', cls:'Boss' }); });
        gbtn(sg, '7 Wisp', function() { setSpawn({ key:'7', label:'Wisp', cls:'Spawn' }); });
        gbtn(sg, 'Cancel', function() { clearSpawn(); }, 'warn');

        // ── Info ──
        var ig = group('Info');
        gbtn(ig, 'Mobs', function() { devLog(DBG.mobs()); });
        gbtn(ig, 'Grid', function() { devLog('\n' + DBG.grid()); });
        gbtn(ig, 'Clues', function() {
            var list = DBG.clues();
            if (!list.length) return devLog('No clues');
            list.forEach(function(c) {
                devLog('Clue #' + c.num + ' [id ' + c.id + ']: ' + c.text + (c.discovered ? ' (collected)' : ''));
            });
        });

        // ── Ability —──────────────
        var ag = group('Ability');
        gbtn(ag, 'List', function() { devLog(DBG.abilityList()); });
        gbtn(ag, 'Give Random', function() { devLog(DBG.abilityGive()); }, 'warn');
        gbtn(ag, 'Give Pawn', function() { devLog(DBG.abilityGive('pawn')); });
        gbtn(ag, 'Give Knight', function() { devLog(DBG.abilityGive('knight')); });
        gbtn(ag, 'Give Bishop', function() { devLog(DBG.abilityGive('bishop')); });
        gbtn(ag, 'Give Rook', function() { devLog(DBG.abilityGive('rook')); });
        gbtn(ag, 'Give Queen', function() { devLog(DBG.abilityGive('queen')); });
        gbtn(ag, 'Give King', function() { devLog(DBG.abilityGive('king')); });
        gbtn(ag, 'Clear', function() { devLog(DBG.abilityClear()); }, 'danger');
        var _ag = group('Stock');
        gbtn(_ag, '+1', function() { var s = (window.__abilityStock || 0) + 1; DBG.abilityStock(s); devLog('Stock: ' + s); });
        gbtn(_ag, '+3', function() { var s = (window.__abilityStock || 0) + 3; DBG.abilityStock(s); devLog('Stock: ' + s); });
        gbtn(_ag, 'Fill', function() {
            var max = (window.__difficultySettings || { maxStock: 6 }).maxStock;
            DBG.abilityStock(max); devLog('Stock: ' + max);
        });
        gbtn(_ag, 'Reset', function() { DBG.abilityStock(0); devLog('Stock: 0'); });

        // ── Dev ──
        var dg = group('Dev');
        gbtn(dg, 'Clear Log', function() { devClear(); });
        gbtn(dg, 'Character', function() {
            if (window.__openCharCreator) window.__openCharCreator();
            else devLog('Character creator not loaded');
        });
        gbtn(dg, 'Toggle Inspector', function() {
            if (window.toggleInspector) toggleInspector();
            else devLog('Inspector not loaded');
        });
        gbtn(dg, 'Reroll Clues', function() { DBG.rerollClues(); });
        gbtn(dg, 'Show Window', function() {
            DBG.showText('Dev Tools', 'Hello from the dev toolbar!');
        });
        gbtn(dg, 'Toast', function() {
            DBG.toast('Dev toolbar active');
        });

        tb.appendChild(content);
        document.body.appendChild(tb);

        // Toggle
        var visible = false;
        toggle.onclick = function() {
            visible = !visible;
            content.style.display = visible ? '' : 'none';
            toggle.textContent = visible ? '><' : '[]';
        };

        // Drag
        var isDragging = false, dragOffX, dragOffY;
        tb.onmousedown = function(e) {
            if (e.target !== tb && e.target !== toggle) return;
            if (e.target === toggle) return;
            isDragging = true;
            dragOffX = e.clientX - tb.offsetLeft;
            dragOffY = e.clientY - tb.offsetTop;
            e.preventDefault();
        };
        document.onmousemove = function(e) {
            if (!isDragging) return;
            tb.style.left = (e.clientX - dragOffX) + 'px';
            tb.style.top = (e.clientY - dragOffY) + 'px';
        };
        document.onmouseup = function() { isDragging = false; };

        // ── Spawn indicator overlay ──
        var spawnInd = document.createElement('div');
        spawnInd.id = 'dc-spawn-indicator';
        document.body.appendChild(spawnInd);

        // ── Spawn state ──
        var _spawnPending = null;
        function setSpawn(ent) {
            var cls = window['com_watabou_sevendrl_characters_' + ent.cls];
            if (!cls) { devLog('[spawn] class not found: ' + ent.cls); return; }
            _spawnPending = { label: ent.label, cls: cls };
            spawnInd.textContent = 'Place ' + ent.label;
            spawnInd.style.display = 'block';
            updateSpawnBtns();
            devLog('[spawn] pending: ' + ent.label + ' — click the map');
        }
        function clearSpawn() {
            _spawnPending = null;
            spawnInd.style.display = 'none';
            updateSpawnBtns();
        }
        function updateSpawnBtns() {
            var btns = content.querySelectorAll('.dc-btn');
            btns.forEach(function(b) {
                b.classList.toggle('spawn-active', _spawnPending && b.textContent.slice(2) === _spawnPending.label);
            });
        }

        // ── Hook: place spawn on map click ──
        ModLoader.hook('com.watabou.sevendrl.scenes.GameScene', 'onClick', function(j, i) {
            if (!_spawnPending) return;
            var g = this.game;
            if (!g || !g.plan) return;
            var cell = g.plan.grid.cell(i, j);
            if (!cell || g.cells.indexOf(cell) === -1) { this.out('Invalid cell'); return; }
            var occupant = g.getChar(cell);
            if (occupant) {
                var Clue = window.com_watabou_sevendrl_characters_Clue;
                if (!(Clue && occupant instanceof Clue)) { this.out('Cell occupied'); return; }
            }
            var cls = _spawnPending.cls;
            if (!cls) return;
            try {
                var ch = new cls(g, cell);
                g.addChar(ch);
                if (window.__eventLogAdd) window.__eventLogAdd('Spawned ' + _spawnPending.label + ' at ' + j + ',' + i);
                this.out('Spawned ' + _spawnPending.label);
            } catch(e) {
                devLog('[spawn] error:', e.message);
                this.out('Error: ' + e.message);
            }
            clearSpawn();
            this.__suppressOrig = true;
        });

        // A number-key (1-7) quick-spawn hook used to live here, registered
        // unconditionally on GameScene.onKey regardless of whether the dev
        // toolbar was even open. That meant pressing 1-7 during ANY normal
        // gameplay entered "click to spawn entity" mode — and directly
        // collided with ability-pickup.js's own 1-5 number-row ability
        // selection. The toolbar buttons above (gbtn(sg, '1 Clue', ...) etc.)
        // already trigger the exact same setSpawn() calls via click, so
        // removing the keyboard shortcut loses no capability — just the
        // unintended global rebind. Use the buttons or DBG.spawnClue()/
        // DBG.spawnBoss() instead.

        devLog('[ui:toolbar] ready — drag to move, click [] to expand');
    }

    window.__rebuildDevToolbar = function() {
        if (window.__devToolsEnabled === false) return;
        if (!document.getElementById('dc-dev-toolbar')) init();
        var tb = document.getElementById('dc-dev-toolbar');
        if (tb) tb.style.display = '';
    };

    // Init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();