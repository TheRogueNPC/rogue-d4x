// ═══════════════════════════════════════════════════════════════════
// UI: dev-toolbar.js — Floating action toolbar
// Adds a draggable toolbar with quick-action buttons to the page.
// ═══════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var TOOLBAR_STYLE = [
        '#dc-dev-toolbar {',
        '  position:fixed; top:40px; left:10px; z-index:9998;',
        '  background:rgba(0,0,0,0.85); border:1px solid #0f0;',
        '  border-radius:4px; padding:4px; display:flex; flex-direction:column;',
        '  gap:3px; font-family:monospace; font-size:10px;',
        '  user-select:none; cursor:grab; min-width:36px;',
        '}',
        '#dc-dev-toolbar:hover { border-color:#0ff; }',
        '#dc-toolbar-toggle {',
        '  background:#0f0; color:#000; border:none; cursor:pointer;',
        '  font-family:monospace; font-weight:bold; font-size:14px;',
        '  padding:2px 8px; border-radius:2px; line-height:1;',
        '}',
        '#dc-toolbar-toggle:hover { background:#0ff; }',
        '.dc-btn {',
        '  background:#222; color:#0f0; border:1px solid #0f0; cursor:pointer;',
        '  font-family:monospace; font-size:10px; padding:3px 6px;',
        '  border-radius:2px; white-space:nowrap; text-align:left;',
        '}',
        '.dc-btn:hover { background:#0f0; color:#000; }',
        '.dc-btn.danger:hover { background:#f00; color:#fff; border-color:#f00; }',
        '.dc-btn.warn:hover { background:#f80; color:#000; border-color:#f80; }',
        '.dc-btn-group { border-top:1px solid #333; padding-top:3px; margin-top:3px; }',
        '.dc-btn-group-label { color:#888; font-size:9px; padding:1px 2px; }',
    ].join('\n');

    var HIDDEN = 'display:none';

    function init() {
        if (document.getElementById('dc-dev-toolbar')) return;

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

        // ── Spawning ──
        var sg = group('Spawn');
        gbtn(sg, 'Clue', function() { devLog(DBG.spawnClue()); });
        gbtn(sg, 'Boss', function() { devLog(DBG.spawnBoss()); });

        // ── Info ──
        var ig = group('Info');
        gbtn(ig, 'Mobs', function() { devLog(DBG.mobs()); });
        gbtn(ig, 'Grid', function() { devLog('\n' + DBG.grid()); });
        gbtn(ig, 'Clues', function() {
            if (!sevendrl || !sevendrl.clues) return devLog('No clues');
            sevendrl.clues.forEach(function(c, i) {
                devLog('Clue ' + i + ': ' + c.text + (c.discovered ? ' (discovered)' : ''));
            });
        });

        // ── Dev ──
        var dg = group('Dev');
        gbtn(dg, 'Clear Log', function() { devClear(); });
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

        devLog('[ui:toolbar] ready — drag to move, click [] to expand');
    }

    // Init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();