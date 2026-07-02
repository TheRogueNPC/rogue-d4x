(function() {
    'use strict';

    // Split per the canvas/DOM rule: gameplay settings (Zoom/BGM/SFX/View)
    // are in-game-world content, so the pause panel and its Options screen
    // are built canvas-native via Rogue.UI (rogue-api.js). Dev Console/
    // Dev Toolbar/Dev Bar toggles are genuine dev-tooling, so they stay in
    // their own small DOM panel, shown alongside the canvas Options screen.

    var ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.5, 2.0];
    var ZOOM_LABELS = ['0.50x', '0.75x', '1.00x', '1.50x', '2.00x'];
    var VOL_STEPS = [0, 0.25, 0.5, 0.75, 1.0];
    var VOL_LABELS = ['0%', '25%', '50%', '75%', '100%'];
    var VIEW_LABELS = ['Top', 'Iso', 'Side'];
    var zoomIdx = 2;
    window.__gameZoom = 1.0;
    window.__gamePaused = false;

    var bgmVol = 1.0, sfxVol = 1.0;
    var pauseOv = null; // current canvas overlay (main menu or options)

    function getGame() {
        var G = window.com_watabou_sevendrl_SevenDRL;
        return G && G.level ? G : null;
    }
    function getScene() {
        var Game = window.com_watabou_coogee_Game;
        return Game && Game.scene ? Game.scene : null;
    }

    // ── Zoom ──
    function applyZoom(zoom) {
        window.__gameZoom = zoom;
        var scene = getScene();
        if (!scene || !scene.view) return;
        var v = scene.view;
        var baseScale = Math.min(v.rWidth / (v.viewWidth + 2), v.rHeight / (v.viewHeight + 2));
        v.map.set_scaleX(v.map.set_scaleY(baseScale * zoom));
        v.map.set_x(-v.map.get_scaleX() * v.viewCenterX);
        v.map.set_y(-v.map.get_scaleY() * v.viewCenterY);
    }
    ModLoader.after('com.watabou.sevendrl.PlanView', 'setSize', function() {
        if (window.__gameZoom && window.__gameZoom !== 1) applyZoom(window.__gameZoom);
    });

    // ── Sound ──
    function applyBGM(vol) {
        bgmVol = vol;
        try {
            var ch = window.com_watabou_sevendrl_Sounds.enviroChannel;
            if (ch) { ch.set_volume(vol); }
        } catch(e) {}
    }
    function applySFX(vol) {
        sfxVol = vol;
        try {
            var st = new window.openfl_media_SoundTransform(vol);
            window.openfl_media_SoundMixer.set_soundTransform(st);
        } catch(e) {}
    }

    // ── Pause / Unpause ──
    function pause() {
        window.__gamePaused = true;
        showMainMenu();
    }
    function unpause() {
        window.__gamePaused = false;
        closePauseOv();
        hideDevOptionsPanel();
        var g = getGame();
        if (g && g.curCh) g.proceed();
    }

    function closePauseOv() {
        if (pauseOv) { Rogue.UI.dismiss(pauseOv); pauseOv = null; }
    }

    // ── Canvas menu screens ──
    function showMainMenu() {
        closePauseOv();
        hideDevOptionsPanel();
        var ov = Rogue.UI.overlay('Paused', 'Game paused');
        pauseOv = ov;
        Rogue.UI.button('Unpause', ov.__panel, unpause);
        Rogue.UI.button('Clues', ov.__panel, showClues);
        Rogue.UI.button('Options', ov.__panel, showOptions);
        Rogue.UI.button('Exit to Menu', ov.__panel, exitGame);
    }

    // onBack: what the "Back" button does. Defaults to the in-game pause
    // main menu — title-menu.js passes its own callback (rebuild the title
    // menu) when Options is opened from the title screen instead.
    function showOptions(onBack) {
        closePauseOv();
        var ov = Rogue.UI.overlay('Options', null);
        pauseOv = ov;
        var panel = ov.__panel;
        panel.__isOptions = true;

        Rogue.UI.cycle('Zoom', ZOOM_LABELS, zoomIdx, panel, function(v, idx) {
            zoomIdx = idx;
            applyZoom(ZOOM_LEVELS[zoomIdx]);
        });
        Rogue.UI.cycle('BGM', VOL_LABELS, VOL_STEPS.indexOf(bgmVol) >= 0 ? VOL_STEPS.indexOf(bgmVol) : 4, panel, function(v, idx) {
            applyBGM(VOL_STEPS[idx]);
        });
        Rogue.UI.cycle('SFX', VOL_LABELS, VOL_STEPS.indexOf(sfxVol) >= 0 ? VOL_STEPS.indexOf(sfxVol) : 4, panel, function(v, idx) {
            applySFX(VOL_STEPS[idx]);
        });
        Rogue.UI.cycle('View', VIEW_LABELS, window.__viewModeIdx || 0, panel, function(v, idx) {
            if (window.__setViewMode) window.__setViewMode(['top', 'iso', 'side'][idx]);
        });
        Rogue.UI.button('Back', panel, onBack || showMainMenu);

        showDevOptionsPanel();
    }

    function showClues() {
        var g = getGame();
        if (!g) return;
        var texts = [];
        var Clue = window.com_watabou_sevendrl_characters_Clue;
        for (var i = 0; i < g.queue.length; i++) {
            var ch = g.queue[i];
            if (ch instanceof Clue && ch.discovered) texts.push(ch.text);
        }
        var scene = getScene();
        if (scene && scene.showWindow) {
            scene.showWindow('Clues', texts.length ? texts.join('\n\n') : 'No clues discovered yet.');
        }
    }

    function exitGame() {
        window.__gamePaused = false;
        closePauseOv();
        hideDevOptionsPanel();
        location.reload();
    }

    // ── Escape key: open/close pause, or back out of Options ──
    document.addEventListener('keydown', function(e) {
        if (e.keyCode !== 27) return;
        var Game = window.com_watabou_coogee_Game;
        var GameScene = window.com_watabou_sevendrl_scenes_GameScene;
        if (!Game || !GameScene || !Game.scene || !(Game.scene instanceof GameScene)) return;

        if (pauseOv && pauseOv.__panel.__isOptions) {
            showMainMenu();
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (window.__gamePaused) {
            unpause();
        } else {
            pause();
        }
        e.preventDefault();
        e.stopPropagation();
    }, true);

    // ── Hook: pause game loop ──
    ModLoader.hook('com.watabou.sevendrl.SevenDRL', 'proceed', function() {
        if (window.__gamePaused) this.__suppressOrig = true;
    });

    // ═══════════════════════════════════════════════════════════════
    // Dev-only panel — Dev Console / Dev Toolbar / Dev Bar toggles.
    // Genuine dev-tooling, kept as DOM, separate from the canvas pause
    // panel above. "Dev Bar" hides the toolbar, the Game Inspector, and
    // the console log together; the console log can still be brought
    // back at any time with Shift+F12 regardless of that state.
    // ═══════════════════════════════════════════════════════════════
    var DEV_STYLE = [
        '#dc-dev-options-panel {',
        '  position:fixed; right:12px; bottom:12px; z-index:9994; display:none;',
        '  background:#111122; border:1px solid #555; padding:10px 12px;',
        '  font-family:"Share Tech Regular",monospace; color:#ccc; font-size:11px;',
        '}',
        '#dc-dev-options-panel .dc-title { color:#0ff; margin-bottom:4px; letter-spacing:1px; }',
        '#dc-dev-options-panel .dc-opt-row { display:flex; justify-content:space-between; align-items:center; margin:4px 0; gap:10px; }',
        '#dc-dev-options-panel button { background:#111122; color:#ddd; border:1px solid #555; cursor:pointer; font-family:"Share Tech Regular",monospace; font-size:11px; padding:3px 10px; }',
        '#dc-dev-options-panel button:hover { border-color:#ddd; }',
    ].join('\n');

    function toggleConsole() {
        var panel = document.getElementById('dev-console');
        if (!panel) return;
        var show = panel.style.display === 'none' || panel.style.display === '';
        panel.style.display = show ? 'flex' : 'none';
        var btn = document.getElementById('dc-console-toggle');
        if (btn) btn.textContent = show ? 'Hide' : 'Show';
    }

    // Shift+F12 always works, even while the Dev Bar is hidden.
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' && e.shiftKey) {
            e.preventDefault();
            toggleConsole();
        }
    });

    function applyDevTools(enabled) {
        window.__devToolsEnabled = enabled;
        var btn = document.getElementById('dc-dev-toggle');
        if (btn) btn.textContent = enabled ? 'On' : 'Off';
        if (enabled) {
            if (window.__rebuildDevToolbar) window.__rebuildDevToolbar();
            var con = document.getElementById('dev-console');
            if (con) con.style.display = 'flex';
            var tb = document.getElementById('dc-dev-toolbar');
            if (tb) tb.style.display = '';
            var ins = document.getElementById('dc-inspector');
            if (ins) ins.style.display = '';
        } else {
            var con2 = document.getElementById('dev-console');
            if (con2) con2.style.display = 'none';
            var tb2 = document.getElementById('dc-dev-toolbar');
            if (tb2) tb2.style.display = 'none';
            var ins2 = document.getElementById('dc-inspector');
            if (ins2) ins2.style.display = 'none';
            if (window.__setViewMode && window.__viewMode !== 'top') {
                window.__setViewMode('top');
            }
        }
    }

    function buildDevOptionsPanel() {
        if (document.getElementById('dc-dev-options-panel')) return;
        var style = document.createElement('style');
        style.textContent = DEV_STYLE;
        document.head.appendChild(style);

        var panel = document.createElement('div');
        panel.id = 'dc-dev-options-panel';

        var title = document.createElement('div');
        title.className = 'dc-title';
        title.textContent = '◈ DEV TOOLS';
        panel.appendChild(title);

        var dr = document.createElement('div');
        dr.className = 'dc-opt-row';
        dr.innerHTML = '<span>Console (Shift+F12)</span><button id="dc-console-toggle">Show</button>';
        panel.appendChild(dr);

        var dtr = document.createElement('div');
        dtr.className = 'dc-opt-row';
        dtr.innerHTML = '<span>Toolbar</span><button id="dc-toolbar-toggle-opt">Show</button>';
        panel.appendChild(dtr);

        var devr = document.createElement('div');
        devr.className = 'dc-opt-row';
        devr.innerHTML = '<span>Dev Bar</span><button id="dc-dev-toggle">On</button>';
        panel.appendChild(devr);

        document.body.appendChild(panel);

        document.getElementById('dc-console-toggle').onclick = toggleConsole;
        document.getElementById('dc-toolbar-toggle-opt').onclick = function() {
            var tb = document.getElementById('dc-dev-toolbar');
            if (!tb) return;
            var show = tb.style.display === 'none' || tb.style.display === '';
            tb.style.display = show ? '' : 'none';
            this.textContent = show ? 'Hide' : 'Show';
        };
        document.getElementById('dc-dev-toggle').onclick = function() {
            applyDevTools(!window.__devToolsEnabled);
        };
    }

    function showDevOptionsPanel() {
        buildDevOptionsPanel();
        document.getElementById('dc-dev-options-panel').style.display = 'block';
    }
    function hideDevOptionsPanel() {
        var p = document.getElementById('dc-dev-options-panel');
        if (p) p.style.display = 'none';
    }

    // Shared so title-menu.js can reuse the same canvas Options screen
    // (and pause/unpause) instead of building its own.
    window.__pauseMenu = {
        showOptions: showOptions,
        showMainMenu: showMainMenu,
        pause: pause,
        unpause: unpause,
        closePauseOv: closePauseOv
    };

    if (window.devLog) window.devLog('[mod:pause-menu] ready');
})();
